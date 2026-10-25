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
  addOneBillingMonth,
  addOneBillingMonthFromAnchor,
  applySpokeduMasterPayment,
  calculateSpokeduMasterPaymentPeriod,
  deriveSeoulBillingAnchor,
} from './spokeduMasterPaymentApply';

const input = {
  userId: '11111111-1111-4111-8111-111111111111',
  orderId: 'spm-premium-initial-550e8400-e29b-41d4-a716-446655440000',
  paymentKey: 'payment-key-1',
  plan: 'premium' as const,
  amount: 28900,
  approvedAt: '2026-06-21T12:00:00+09:00',
  eventKey: 'initial:order:payment',
  source: 'initial' as const,
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

  it('calculates one calendar month with UTC month-end correction', () => {
    expect(calculateSpokeduMasterPaymentPeriod(input.approvedAt)).toEqual({
      periodStart: '2026-06-21T03:00:00.000Z',
      periodEnd: '2026-07-21T03:00:00.000Z',
      nextBillingAt: '2026-07-21T03:00:00.000Z',
    });
    expect(addOneBillingMonth(new Date('2026-01-31T00:00:00.000Z')).toISOString())
      .toBe('2026-02-28T00:00:00.000Z');
  });

  it.each([29, 30, 31])('preserves a KST day-%i anchor for 12 months and only clamps missing dates', (day) => {
    for (const year of [2027, 2028]) {
      let cursor = new Date(`${year}-01-${String(day).padStart(2, '0')}T03:30:00.000Z`);
      for (let month = 1; month <= 12; month += 1) {
        const next = addOneBillingMonthFromAnchor(cursor, day);
        const kst = new Date(next.getTime() + 9 * 60 * 60 * 1000);
        const expectedMonth = month === 12 ? 0 : month;
        const expectedYear = month === 12 ? year + 1 : year;
        const lastDay = new Date(Date.UTC(expectedYear, expectedMonth + 1, 0)).getUTCDate();
        expect(kst.getUTCFullYear()).toBe(expectedYear);
        expect(kst.getUTCMonth()).toBe(expectedMonth);
        expect(kst.getUTCDate()).toBe(Math.min(day, lastDay));
        cursor = next;
      }
    }
  });

  it('returns to the original day after a short month instead of drifting', () => {
    const february = addOneBillingMonthFromAnchor(new Date('2027-01-31T03:30:00.000Z'), 31);
    const march = addOneBillingMonthFromAnchor(february, 31);
    expect(february.toISOString()).toBe('2027-02-28T03:30:00.000Z');
    expect(march.toISOString()).toBe('2027-03-31T03:30:00.000Z');
  });

  it('derives the anchor from the KST calendar day at UTC boundaries', () => {
    expect(deriveSeoulBillingAnchor(new Date('2026-01-30T15:00:00.000Z'))).toEqual({ day: 31, isEom: true });
    expect(deriveSeoulBillingAnchor(new Date('2026-01-31T14:59:59.999Z'))).toEqual({ day: 31, isEom: true });
    expect(deriveSeoulBillingAnchor(new Date('2026-01-31T15:00:00.000Z'))).toEqual({ day: 1, isEom: false });
  });

  it('applies the first successful billing payment through the RPC', async () => {
    const rpc = mockRpc({
      status: 'processed',
      alreadyApplied: false,
      periodEnd: '2026-07-21T03:00:00.000Z',
      nextBillingAt: '2026-07-21T03:00:00.000Z',
    });

    await expect(applySpokeduMasterPayment(input)).resolves.toEqual({
      ok: true,
      alreadyApplied: false,
      plan: 'premium',
      periodEnd: '2026-07-21T03:00:00.000Z',
      nextBillingAt: '2026-07-21T03:00:00.000Z',
      cancelled: undefined,
    });
    expect(rpc).toHaveBeenCalledWith('spokedu_master_apply_payment', expect.objectContaining({
      p_user_id: input.userId,
      p_order_id: input.orderId,
      p_payment_key: input.paymentKey,
      p_plan: 'premium',
      p_amount: 28900,
      p_event_key: input.eventKey,
      p_source: 'initial',
      p_provider_billing_key_secret_id: null,
    }));
  });

  it('rejects client amount mutation before calling the RPC', async () => {
    await expect(applySpokeduMasterPayment({ ...input, amount: 39900 })).resolves.toMatchObject({
      ok: false,
      status: 400,
      code: 'amount_mismatch',
    });
    expect(getServiceSupabase).not.toHaveBeenCalled();
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

  it('accepts a bounded upgrade difference and still rejects list-price mismatch for webhook charges', async () => {
    mockRpc({
      status: 'processed',
      alreadyApplied: false,
      periodEnd: '2026-07-01T00:00:00.000Z',
    });

    await expect(applySpokeduMasterPayment({
      ...input,
      source: 'upgrade',
      amount: 9500,
      eventKey: 'upgrade:order:payment',
      billingCycleKey: `upgrade:${input.userId}:premium:2026-07-01T00:00:00.000Z`,
      periodOverride: {
        periodStart: '2026-06-01T00:00:00.000Z',
        periodEnd: '2026-07-01T00:00:00.000Z',
        nextBillingAt: '2026-07-01T00:00:00.000Z',
      },
    })).resolves.toMatchObject({ ok: true, plan: 'premium' });

    await expect(applySpokeduMasterPayment({
      ...input,
      source: 'webhook',
      amount: 9500,
      eventKey: 'webhook:order:payment',
    })).resolves.toMatchObject({ ok: false, code: 'amount_mismatch' });
  });

  it('maps duplicate billing cycles to conflicts', async () => {
    mockRpc({ status: 'rejected', reason: 'billing_cycle_already_processed' });

    await expect(applySpokeduMasterPayment({
      ...input,
      source: 'renewal',
      orderId: 'spm-premium-renewal-sub-a-20260721',
      eventKey: 'renewal:sub-a:payment',
      billingCycleKey: 'sub-a:20260721',
    })).resolves.toMatchObject({
      ok: false,
      status: 409,
      code: 'billing_cycle_already_processed',
    });
  });

  it('fails safely when the RPC fails without leaking payment keys', async () => {
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
});
