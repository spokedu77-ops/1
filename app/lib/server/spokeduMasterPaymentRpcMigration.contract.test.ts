import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260628120000_spokedu_master_apply_payment_rpc.sql'),
  'utf8',
);

describe('spokedu_master_apply_payment migration contract', () => {
  it('defines a single transactional RPC for payment application', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.spokedu_master_apply_payment');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('spokedu_master_payment_orders');
    expect(sql).toContain('spokedu_master_subscriptions');
    expect(sql).toContain('spokedu_master_payment_webhook_events');
  });

  it('supports minimal recoverable states without a broad payment framework', () => {
    for (const status of ['pending', 'processing', 'active', 'recoverable_failed', 'cancelled']) {
      expect(sql).toContain(status);
    }
  });

  it('keeps idempotency and paymentKey conflict checks inside the transaction', () => {
    expect(sql).toContain('ON CONFLICT (event_key) DO NOTHING');
    expect(sql).toContain('payment_key_conflict');
    expect(sql).toContain('alreadyApplied');
    expect(sql).toContain('active_order_without_subscription');
  });

  it('allows full cancel only for the matching current payment and marks partial cancel for review', () => {
    expect(sql).toContain("p_source = 'cancel'");
    expect(sql).toContain("v_subscription.toss_order_id = p_order_id");
    expect(sql).toContain("v_subscription.toss_payment_key = p_payment_key");
    expect(sql).toContain('partial_cancel_review_required');
  });

  it('revokes public execution and grants service_role only', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.spokedu_master_apply_payment');
    expect(sql).toContain('FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.spokedu_master_apply_payment');
    expect(sql).toContain('TO service_role');
  });
});
