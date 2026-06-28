import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServiceSupabase, reportError } = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
}));

vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  hashForMonitoring: (value: string) => `hash:${value.slice(0, 4)}`,
  reportError,
}));

import {
  applySpokeduMasterPayment,
  calculateSpokeduMasterPaymentPeriod,
} from './spokeduMasterPaymentApply';

const input = {
  userId: '11111111-1111-4111-8111-111111111111',
  orderId: 'spm-pro-550e8400-e29b-41d4-a716-446655440000',
  paymentKey: 'payment-key-1',
  plan: 'pro' as const,
  amount: 39900,
  approvedAt: '2026-06-21T12:00:00+09:00',
  eventKey: 'confirm:order:payment',
  source: 'confirm' as const,
};

function mockRpc(data: unknown, error: unknown = null) {
  const rpc = vi.fn(async () => ({ data, error }));
  getServiceSupabase.mockReturnValue({ rpc });
  return rpc;
}

describe('applySpokeduMasterPayment', () => {
  beforeEach(() => {
    getServiceSupabase.mockReset();
    reportError.mockReset();
  });

  it('calculates a fixed 30-day period from approvedAt', () => {
    expect(calculateSpokeduMasterPaymentPeriod(input.approvedAt)).toEqual({
      periodStart: '2026-06-21T03:00:00.000Z',
      periodEnd: '2026-07-21T03:00:00.000Z',
    });
  });

  it('applies the first successful payment through the RPC', async () => {
    const rpc = mockRpc({
      status: 'processed',
      alreadyApplied: false,
      periodEnd: '2026-07-21T03:00:00.000Z',
    });

    await expect(applySpokeduMasterPayment(input)).resolves.toEqual({
      ok: true,
      alreadyApplied: false,
      plan: 'pro',
      periodEnd: '2026-07-21T03:00:00.000Z',
      cancelled: undefined,
    });
    expect(rpc).toHaveBeenCalledWith('spokedu_master_apply_payment', expect.objectContaining({
      p_user_id: input.userId,
      p_order_id: input.orderId,
      p_payment_key: input.paymentKey,
      p_plan: 'pro',
      p_amount: 39900,
      p_event_key: input.eventKey,
      p_source: 'confirm',
    }));
  });

  it('returns idempotent success without extending the period again', async () => {
    mockRpc({
      status: 'processed',
      alreadyApplied: true,
      periodEnd: '2026-07-21T03:00:00.000Z',
    });

    await expect(applySpokeduMasterPayment(input)).resolves.toMatchObject({
      ok: true,
      alreadyApplied: true,
      periodEnd: '2026-07-21T03:00:00.000Z',
    });
  });

  it('rejects different paymentKey conflicts', async () => {
    mockRpc({ status: 'rejected', reason: 'payment_key_conflict' });

    await expect(applySpokeduMasterPayment(input)).resolves.toMatchObject({
      ok: false,
      status: 409,
      code: 'payment_key_conflict',
    });
  });

  it('rejects different user orders as not found', async () => {
    mockRpc({ status: 'rejected', reason: 'order_owner_mismatch' });

    await expect(applySpokeduMasterPayment(input)).resolves.toMatchObject({
      ok: false,
      status: 404,
      code: 'order_owner_mismatch',
    });
  });

  it('fails safely when the RPC fails', async () => {
    mockRpc(null, { message: 'db failed' });

    await expect(applySpokeduMasterPayment(input)).resolves.toMatchObject({
      ok: false,
      status: 500,
      code: 'payment_apply_rpc_failed',
    });
    expect(reportError).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      context: 'spokedu_master.payment.apply',
    }));
  });

  it('keeps partial cancel as review-required without changing entitlement', async () => {
    const rpc = mockRpc({ status: 'ignored', reason: 'partial_cancel_review_required' });

    await expect(applySpokeduMasterPayment({
      ...input,
      source: 'partial_cancel_review_required',
    })).resolves.toMatchObject({
      ok: true,
      ignored: true,
      reason: 'partial_cancel_review_required',
    });
    expect(rpc).toHaveBeenCalledWith('spokedu_master_apply_payment', expect.objectContaining({
      p_period_start: null,
      p_period_end: null,
      p_source: 'partial_cancel_review_required',
    }));
  });
});
