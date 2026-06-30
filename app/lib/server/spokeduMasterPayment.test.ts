import { describe, expect, it, vi } from 'vitest';

import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  createSpokeduMasterOrderId,
  createSpokeduMasterRenewalOrderId,
  isSpokeduMasterDirectPurchasePlan,
  isSpokeduMasterPaidPlan,
  parseSpokeduMasterOrderId,
  validateSpokeduMasterPaymentOrder,
} from './spokeduMasterPayment';

const pendingOrder = {
  order_id: 'spm-premium-initial-550e8400-e29b-41d4-a716-446655440000',
  user_id: 'user-a',
  plan: 'premium',
  amount: 28900,
  status: 'pending',
  payment_key: null,
};

describe('SPOKEDU MASTER recurring payment contract', () => {
  it('uses only Lite and Premium server prices', () => {
    expect(SPOKEDU_MASTER_PLAN_CONFIG.lite.amount).toBe(9900);
    expect(SPOKEDU_MASTER_PLAN_CONFIG.premium.amount).toBe(28900);
    expect(isSpokeduMasterPaidPlan('lite')).toBe(true);
    expect(isSpokeduMasterPaidPlan('premium')).toBe(true);
    expect(isSpokeduMasterPaidPlan('pro')).toBe(false);
    expect(isSpokeduMasterPaidPlan('team')).toBe(false);
    expect(isSpokeduMasterDirectPurchasePlan('center')).toBe(false);
  });

  it('creates and parses only recurring order IDs', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('550e8400-e29b-41d4-a716-446655440000');
    expect(createSpokeduMasterOrderId('lite'))
      .toBe('spm-lite-initial-550e8400-e29b-41d4-a716-446655440000');
    expect(createSpokeduMasterRenewalOrderId('premium', 'sub-a', '20260730'))
      .toBe('spm-premium-renewal-sub-a-20260730');
    expect(parseSpokeduMasterOrderId(pendingOrder.order_id)).toBe('premium');
    expect(parseSpokeduMasterOrderId('spm-pro-550e8400-e29b-41d4-a716-446655440000')).toBeNull();
    expect(parseSpokeduMasterOrderId('spm-team-1719300000000')).toBeNull();
  });

  it('rejects user, plan, amount, and state mismatches', () => {
    const input = {
      userId: 'user-a',
      orderId: pendingOrder.order_id,
      paymentKey: 'payment-a',
      plan: 'premium' as const,
      amount: 28900,
    };
    expect(validateSpokeduMasterPaymentOrder({ ...pendingOrder, user_id: 'user-b' }, input))
      .toMatchObject({ ok: false, status: 404 });
    expect(validateSpokeduMasterPaymentOrder({ ...pendingOrder, plan: 'lite' }, input))
      .toMatchObject({ ok: false, status: 400 });
    expect(validateSpokeduMasterPaymentOrder({ ...pendingOrder, amount: 39900 }, input))
      .toMatchObject({ ok: false, status: 400 });
    expect(validateSpokeduMasterPaymentOrder({ ...pendingOrder, status: 'failed' }, input))
      .toMatchObject({ ok: false, status: 409 });
  });
});
