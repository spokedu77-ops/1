import { describe, expect, it } from 'vitest';
import {
  hasSpokeduMasterBillingRenewalFailure,
  isSpokeduMasterAutomaticRenewalStopped,
} from './spokeduMasterRenewalState';

describe('hasSpokeduMasterBillingRenewalFailure', () => {
  it.each([
    'renewal_configuration_missing',
    'billing_key_unavailable',
    'renewal_order_create_failed',
    'renewal_order_claim_failed',
    'renewal_order_busy',
    'renewal_payment_exception',
    'recoverable_failed',
    'apply_failed',
  ])('shows every stored renewal failure code: %s', (last_billing_error) => {
    expect(hasSpokeduMasterBillingRenewalFailure({ plan: 'premium', status: 'active', last_billing_error })).toBe(true);
  });

  it('does not hide a paid billing failure merely because promotion access is effective', () => {
    expect(hasSpokeduMasterBillingRenewalFailure({ plan: 'premium', status: 'active', last_billing_error: 'billing_key_unavailable' })).toBe(true);
  });

  it('separates exhausted automatic billing from the active paid-access status', () => {
    const row = {
      plan: 'premium',
      status: 'active',
      last_billing_error: 'recoverable_failed',
      renewal_retry_count: 5,
    };
    expect(hasSpokeduMasterBillingRenewalFailure(row)).toBe(true);
    expect(isSpokeduMasterAutomaticRenewalStopped(row)).toBe(true);
    expect(row.status).toBe('active');
  });

  it('does not mark automatic billing stopped before the fifth failure', () => {
    expect(isSpokeduMasterAutomaticRenewalStopped({
      plan: 'lite',
      status: 'active',
      last_billing_error: 'recoverable_failed',
      renewal_retry_count: 4,
    })).toBe(false);
  });
});
