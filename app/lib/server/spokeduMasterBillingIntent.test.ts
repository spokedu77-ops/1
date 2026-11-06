import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BILLING_INTENT_MAX_AGE, createBillingIntent, verifyBillingIntent } from './spokeduMasterBillingIntent';
const input = { userId: 'random-user-id', plan: 'lite' as const, customerKey: 'random-customer-key' };
beforeEach(() => { vi.stubEnv('TOSS_SECRET_KEY', 'test_sk_fixture'); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('signed billing intent', () => {
  it('binds user, selected plan and customer across a redirect', () => {
    const token = createBillingIntent(input);
    expect(verifyBillingIntent(token, input)).toBe(true);
    expect(verifyBillingIntent(token, { ...input, userId: 'another-user' })).toBe(false);
    expect(verifyBillingIntent(token, { ...input, plan: 'premium' })).toBe(false);
    expect(verifyBillingIntent(token, { ...input, customerKey: 'another-customer' })).toBe(false);
  });
  it('rejects missing, tampered, oversized and expired tokens', () => {
    vi.useFakeTimers(); const token = createBillingIntent(input);
    for (const bad of [undefined, '', `${token}x`, `${token}.extra`, 'x'.repeat(2049)]) expect(verifyBillingIntent(bad, input)).toBe(false);
    vi.advanceTimersByTime(BILLING_INTENT_MAX_AGE * 1000 + 1);
    expect(verifyBillingIntent(token, input)).toBe(false);
  });
  it('rejects tokens after the signing key changes', () => {
    const token = createBillingIntent(input); vi.stubEnv('TOSS_SECRET_KEY', 'test_sk_other');
    expect(verifyBillingIntent(token, input)).toBe(false);
  });
});
