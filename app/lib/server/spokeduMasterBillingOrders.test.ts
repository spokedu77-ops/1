import { describe, expect, it } from 'vitest';

import {
  SPOKEDU_MASTER_BILLING_PROCESSING_STALE_MS,
  shouldReapplySpokeduMasterBillingOrder,
} from './spokeduMasterBillingOrders';

describe('spokeduMasterBillingOrders', () => {
  it('keeps processing lease window at 15 minutes', () => {
    expect(SPOKEDU_MASTER_BILLING_PROCESSING_STALE_MS).toBe(15 * 60 * 1000);
  });

  it('reapplies only when a payment_key already exists (no second charge)', () => {
    expect(shouldReapplySpokeduMasterBillingOrder(null)).toBe(false);
    expect(shouldReapplySpokeduMasterBillingOrder({ payment_key: null })).toBe(false);
    expect(shouldReapplySpokeduMasterBillingOrder({ payment_key: '   ' })).toBe(false);
    expect(shouldReapplySpokeduMasterBillingOrder({ payment_key: 'pay_abc' })).toBe(true);
  });
});
