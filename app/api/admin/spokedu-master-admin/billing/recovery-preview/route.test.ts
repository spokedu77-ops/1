import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ authorized: true, failLookup: false }));
const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORDER_ID = `spm-premium-initial-${USER_ID}`;
const PAYMENT_KEY = 'pay_SECRET_RECOVERY_KEY';

function query(table: string) {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((key: string, value: unknown) => { filters[key] = value; return builder; }),
    order: vi.fn(() => builder),
    range: vi.fn(async () => state.failLookup
      ? { data: null, error: new Error('lookup failed') }
      : { data: table === 'spokedu_master_payment_webhook_events' ? [{ event_key: 'evt-1', event_type: 'initial', order_id: ORDER_ID, status: 'processed', created_at: '2026-10-10T00:02:00.000Z' }] : [], error: null }),
    maybeSingle: vi.fn(async () => {
      if (state.failLookup) return { data: null, error: new Error('lookup failed') };
      if (table === 'spokedu_master_payment_orders') return { data: { order_id: ORDER_ID, user_id: USER_ID, plan: 'premium', amount: 28900, status: 'recoverable_failed', billing_cycle_key: `initial:${USER_ID}:premium`, created_at: '2026-10-10T00:00:00.000Z', updated_at: '2026-10-10T00:02:00.000Z', applied_at: null, last_processed_at: '2026-10-10T00:02:00.000Z', last_error_code: 'entitlement_apply_failed', payment_key: PAYMENT_KEY }, error: null };
      if (table === 'spokedu_master_subscriptions' && filters.toss_order_id) return { data: null, error: null };
      if (table === 'spokedu_master_subscriptions') return { data: null, error: null };
      return { data: null, error: null };
    }),
  };
  return builder;
}

vi.mock('@/app/lib/server/adminAuth', () => ({
  requireAdmin: vi.fn(async () => state.authorized ? { ok: true } : { ok: false, response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) }),
  getServiceSupabase: vi.fn(() => ({ from: vi.fn((table: string) => query(table)) })),
}));
vi.mock('@/app/lib/server/privateNoStore', () => ({ withPrivateNoStore: (response: Response) => response }));

import { GET } from './route';

describe('billing recovery preview API', () => {
  beforeEach(() => { state.authorized = true; state.failLookup = false; });

  it('returns a secret-free recovery candidate for an admin', async () => {
    const response = await GET(new Request(`http://localhost/api/admin/spokedu-master-admin/billing/recovery-preview?orderId=${ORDER_ID}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.order).toMatchObject({ order_id: ORDER_ID, status: 'recoverable_failed', applied_at: null, paymentApproved: true });
    expect(body.diagnosis.status).toBe('recovery_candidate');
    expect(body.order).not.toHaveProperty('payment_key');
    expect(JSON.stringify(body)).not.toContain(PAYMENT_KEY);
    expect(JSON.stringify(body)).not.toMatch(/billing_key|service_role|authorization/i);
  });

  it('keeps non-admin access blocked', async () => {
    state.authorized = false;
    const response = await GET(new Request(`http://localhost/api/admin/spokedu-master-admin/billing/recovery-preview?orderId=${ORDER_ID}`));
    expect(response.status).toBe(403);
  });

  it('never reports success when a required lookup fails', async () => {
    state.failLookup = true;
    const response = await GET(new Request(`http://localhost/api/admin/spokedu-master-admin/billing/recovery-preview?orderId=${ORDER_ID}`));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.diagnosis.status).toBe('data_lookup_error');
  });
});
