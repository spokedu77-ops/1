import { describe, expect, it } from 'vitest';
import {
  SPOKEDU_MASTER_MAX_UPGRADE_AMOUNT,
  classifySpokeduMasterBillingMode,
  validateSpokeduMasterChargedAmount,
} from './spokeduMasterBillingMode';

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('SPOKEDU MASTER billing mode', () => {
  it('classifies upgrade only from the current upgrade cycle key', () => {
    expect(classifySpokeduMasterBillingMode({
      orderId: 'spm-premium-initial-abc',
      userId: USER_ID,
      plan: 'premium',
      billingCycleKey: `upgrade:${USER_ID}:premium:2026-10-01T00:00:00.000Z`,
    })).toBe('upgrade');
  });

  it('rejects an upgrade cycle key that does not belong to the order owner', () => {
    expect(classifySpokeduMasterBillingMode({
      orderId: 'spm-premium-initial-abc',
      userId: USER_ID,
      plan: 'premium',
      billingCycleKey: 'upgrade:22222222-2222-4222-8222-222222222222:premium:2026-10-01T00:00:00.000Z',
    })).toBe('invalid');
  });

  it('classifies renewal from the order id and initial otherwise', () => {
    expect(classifySpokeduMasterBillingMode({
      orderId: 'spm-lite-renewal-sub-20261001',
      userId: USER_ID,
      plan: 'lite',
      billingCycleKey: 'sub-id:20261001',
    })).toBe('renewal');
    expect(classifySpokeduMasterBillingMode({
      orderId: 'spm-lite-initial-abc',
      userId: USER_ID,
      plan: 'lite',
      billingCycleKey: `initial:${USER_ID}:lite`,
    })).toBe('initial');
  });

  it('keeps list-price checks for initial and renewal and a bounded difference for upgrade', () => {
    expect(SPOKEDU_MASTER_MAX_UPGRADE_AMOUNT).toBe(19000);
    expect(validateSpokeduMasterChargedAmount({
      mode: 'initial', plan: 'lite', orderAmount: 9900, tossTotalAmount: 9900,
    })).toBe('ok');
    expect(validateSpokeduMasterChargedAmount({
      mode: 'initial', plan: 'premium', orderAmount: 9500, tossTotalAmount: 9500,
    })).toBe('amount_mismatch');
    expect(validateSpokeduMasterChargedAmount({
      mode: 'upgrade', plan: 'premium', orderAmount: 9500, tossTotalAmount: 9500,
    })).toBe('ok');
    expect(validateSpokeduMasterChargedAmount({
      mode: 'upgrade', plan: 'premium', orderAmount: 9500, tossTotalAmount: 28900,
    })).toBe('amount_mismatch');
    expect(validateSpokeduMasterChargedAmount({
      mode: 'upgrade', plan: 'premium', orderAmount: 0, tossTotalAmount: 0,
    })).toBe('amount_mismatch');
    expect(validateSpokeduMasterChargedAmount({
      mode: 'upgrade', plan: 'premium', orderAmount: 19001, tossTotalAmount: 19001,
    })).toBe('amount_mismatch');
  });
});
