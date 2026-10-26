import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import {
  createRefundRequestRecord,
  isRefundSchemaMissing,
  listRefundRequests,
  transitionRefundRequestRecord,
} from './spokeduMasterRefundWorkflow';
import { createMockRefundPgProvider, PG_EXECUTION_DISABLED } from './spokeduMasterRefundPgProvider';

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const integrationEnabled = Boolean(
  url
  && serviceKey
  && process.env.SPM_REFUND_INTEGRATION_WRITE_GUARD === 'ALLOW_DISPOSABLE_NON_PRODUCTION_WRITES',
);

describe.skipIf(!integrationEnabled)('refund workflow integration (service role)', () => {
  const service = () => createClient(url!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });

  it('lists refund requests when schema is applied', async () => {
    try {
      const result = await listRefundRequests(service(), { page: 1, pageSize: 5, q: '', status: 'all' });
      expect(Array.isArray(result.rows)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    } catch (error) {
      expect(isRefundSchemaMissing(error as { code?: string; message?: string })).toBe(false);
      throw error;
    }
  });

  it('enforces idempotency, duplicate open requests, and concurrent approval conflicts', async () => {
    const client = service();
    const { data: order, error: orderError } = await client
      .from('spokedu_master_payment_orders')
      .select('order_id,user_id,amount,payment_key,status')
      .not('payment_key', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(orderError).toBeNull();
    if (!order?.order_id) return;

    const { data: admins, error: adminError } = await client
      .from('users')
      .select('id')
      .or('is_admin.eq.true,role.eq.admin,role.eq.master')
      .limit(2);
    expect(adminError).toBeNull();
    if (!admins || admins.length < 2) return;

    const requesterId = admins[0]!.id as string;
    const approverId = admins[1]!.id as string;
    if (requesterId === approverId) return;

    const partialAmount = Math.min(1000, Math.max(1, Math.floor((order.amount as number) / 10)));
    const idempotencyKey = `integration-refund-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const pg = createMockRefundPgProvider();

    const created = await createRefundRequestRecord(client, {
      actorId: requesterId,
      orderId: order.order_id,
      userId: order.user_id,
      requestedAmount: partialAmount,
      refundType: 'partial',
      reason: 'integration idempotency and concurrency test',
      idempotencyKey,
      pgProvider: pg,
    });
    expect(created.ok, created.ok ? '' : (created as { error: string }).error).toBe(true);
    if (!created.ok) return;

    const duplicateKey = await createRefundRequestRecord(client, {
      actorId: requesterId,
      orderId: order.order_id,
      userId: order.user_id,
      requestedAmount: partialAmount,
      refundType: 'partial',
      reason: 'duplicate idempotency key',
      idempotencyKey,
      pgProvider: pg,
    });
    expect(duplicateKey.ok).toBe(false);
    expect(duplicateKey.status).toBe(409);

    const duplicateOpen = await createRefundRequestRecord(client, {
      actorId: requesterId,
      orderId: order.order_id,
      userId: order.user_id,
      requestedAmount: partialAmount,
      refundType: 'partial',
      reason: 'duplicate open amount',
      idempotencyKey: `${idempotencyKey}-different-key-0123456789`,
      pgProvider: pg,
    });
    expect(duplicateOpen.ok).toBe(false);
    expect(duplicateOpen.status).toBe(409);

    const review = await transitionRefundRequestRecord(client, {
      actorId: approverId,
      requestId: created.id,
      action: 'start_review',
      expectedStatus: 'received',
      reviewNote: 'integration review',
    });
    expect(review.ok).toBe(true);

    const [firstApprove, secondApprove] = await Promise.all([
      transitionRefundRequestRecord(client, {
        actorId: approverId,
        requestId: created.id,
        action: 'approve',
        expectedStatus: 'under_review',
        reviewNote: 'concurrent approve attempt 1',
        pgProvider: pg,
      }),
      transitionRefundRequestRecord(client, {
        actorId: approverId,
        requestId: created.id,
        action: 'approve',
        expectedStatus: 'under_review',
        reviewNote: 'concurrent approve attempt 2',
        pgProvider: pg,
      }),
    ]);

    expect(firstApprove.ok || secondApprove.ok).toBe(true);
    expect(firstApprove.ok && secondApprove.ok).toBe(false);
    if (!firstApprove.ok) expect(firstApprove.status).toBe(409);
    if (!secondApprove.ok) expect(secondApprove.status).toBe(409);

    const attempt = await pg.attemptCancellation({ orderId: order.order_id, amount: partialAmount });
    expect(attempt.ok).toBe(false);
    expect(attempt.errorCode).toBe(PG_EXECUTION_DISABLED);
  }, 120_000);
});
