import { describe, expect, it } from 'vitest';
import { hasSpokeduMasterBillingRenewalFailure } from './spokeduMasterRenewalState';

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
    expect(hasSpokeduMasterBillingRenewalFailure({ plan: 'premium', status: 'active', last_billing_error }, false)).toBe(true);
  });

  it('does not render billing failure state for promotion-only access', () => {
    expect(hasSpokeduMasterBillingRenewalFailure({ plan: 'premium', status: 'active', last_billing_error: 'billing_key_unavailable' }, true)).toBe(false);
  });
});
