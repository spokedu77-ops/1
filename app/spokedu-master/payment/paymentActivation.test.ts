import { describe, expect, it } from 'vitest';
import { isPaidPaymentActivated } from './paymentActivation';
const now = Date.parse('2026-11-06T00:00:00Z');
const access = { authenticated: true as const, allowed: true, isAdmin: false, plan: 'lite' as const, canUseLibrary: true };
const billing = { hasPaidBillingSubscription: true, billingPlan: 'lite', billingStatus: 'active', billingPeriodEnd: '2026-12-06T00:00:00Z' };
describe('payment success requires durable paid billing and effective access', () => {
  it('accepts a paid Lite subscription with effective Lite access', () => expect(isPaidPaymentActivated(access, billing, 'lite', now)).toBe(true));
  it('accepts paid Lite while a separate Premium gift is active', () => expect(isPaidPaymentActivated({ ...access, plan: 'premium' }, billing, 'lite', now)).toBe(true));
  it('does not describe a promotion-only grant as a successful payment on refresh', () => expect(isPaidPaymentActivated({ ...access, plan: 'premium' }, { ...billing, hasPaidBillingSubscription: false }, 'premium', now)).toBe(false));
  it.each([{ billingStatus: 'pending' }, { billingPeriodEnd: '2026-11-05T00:00:00Z' }, { billingPeriodEnd: 'invalid' }, { billingPlan: 'premium' }])('rejects incomplete/mismatched billing %j', (patch) => expect(isPaidPaymentActivated(access, { ...billing, ...patch }, 'lite', now)).toBe(false));
  it('does not treat admin access as paid billing', () => expect(isPaidPaymentActivated({ ...access, isAdmin: true }, billing, 'lite', now)).toBe(false));
});
