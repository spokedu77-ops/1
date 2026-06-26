import { describe, expect, it, vi } from 'vitest';

import {
  createSpokeduMasterOrderId,
  parseSpokeduMasterOrderId,
  validateSpokeduMasterPaymentOrder,
} from './spokeduMasterPayment';

const pendingOrder = {
  order_id: 'spm-pro-550e8400-e29b-41d4-a716-446655440000',
  user_id: 'user-a',
  plan: 'pro',
  amount: 39900,
  status: 'pending',
  payment_key: null,
};

describe('SPOKEDU MASTER payment order', () => {
  it('creates an unpredictable UUID order ID and keeps legacy parsing', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('550e8400-e29b-41d4-a716-446655440000');
    expect(createSpokeduMasterOrderId('pro'))
      .toBe('spm-pro-550e8400-e29b-41d4-a716-446655440000');
    expect(parseSpokeduMasterOrderId('spm-team-1719300000000')).toBe('team');
    expect(parseSpokeduMasterOrderId(pendingOrder.order_id)).toBe('pro');
  });

  it('rejects another user, plan mismatch, amount mismatch, and non-pending orders', () => {
    const input = {
      userId: 'user-a',
      orderId: pendingOrder.order_id,
      paymentKey: 'payment-a',
      plan: 'pro' as const,
      amount: 39900,
    };
    expect(validateSpokeduMasterPaymentOrder(
      { ...pendingOrder, user_id: 'user-b' },
      input,
    )).toMatchObject({ ok: false, status: 404 });
    expect(validateSpokeduMasterPaymentOrder(
      { ...pendingOrder, plan: 'team' },
      input,
    )).toMatchObject({ ok: false, status: 400 });
    expect(validateSpokeduMasterPaymentOrder(
      { ...pendingOrder, amount: 1 },
      input,
    )).toMatchObject({ ok: false, status: 400 });
    expect(validateSpokeduMasterPaymentOrder(
      { ...pendingOrder, status: 'cancelled' },
      input,
    )).toMatchObject({ ok: false, status: 409 });
  });

  it('allows the same active payment key but rejects a different key', () => {
    const input = {
      userId: 'user-a',
      orderId: pendingOrder.order_id,
      paymentKey: 'payment-a',
      plan: 'pro' as const,
      amount: 39900,
    };
    expect(validateSpokeduMasterPaymentOrder(
      { ...pendingOrder, status: 'active', payment_key: 'payment-a' },
      input,
    )).toEqual({ ok: true });
    expect(validateSpokeduMasterPaymentOrder(
      { ...pendingOrder, status: 'active', payment_key: 'payment-b' },
      input,
    )).toMatchObject({ ok: false, status: 409 });
  });
});
