import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { billingKeyPairDigest, getBillingConfigurationError, SPOKEDU_BILLING_MID } from './spokeduMasterBillingConfiguration';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
  vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_ck_fixture');
  vi.stubEnv('TOSS_SECRET_KEY', 'test_sk_fixture');
  vi.stubEnv('TOSS_BILLING_MID', SPOKEDU_BILLING_MID);
  vi.stubEnv('TOSS_BILLING_KEY_PAIR_SHA256', billingKeyPairDigest('test_ck_fixture', 'test_sk_fixture'));
});
afterEach(() => vi.unstubAllEnvs());
describe('billing configuration preflight (no provider requests)', () => {
  it('accepts an attested individual integration key pair', () => { expect(getBillingConfigurationError()).toBeNull(); });
  it.each(['', 'test_gck_fixture', 'live_gck_fixture', 'test_ck_', 'test_ck_bad key'])('blocks malformed/widget client %s', (key) => {
    expect(getBillingConfigurationError(key)).toBe('billing_client_key_invalid');
  });
  it('blocks production test keys even with review login enabled', () => {
    vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_TOSS_REVIEW_LOGIN_ENABLED', 'true');
    expect(getBillingConfigurationError()).toBe('billing_client_key_invalid');
  });
  it.each(['live_sk_fixture', 'test_gsk_fixture'])('blocks mixed modes/widget secret %s', (key) => {
    vi.stubEnv('TOSS_SECRET_KEY', key);
    expect(getBillingConfigurationError()).toBe(key.includes('gsk') ? 'billing_secret_key_invalid' : 'billing_key_mode_mismatch');
  });
  it('blocks a different MID and a changed/unverified key pair', () => {
    vi.stubEnv('TOSS_BILLING_MID', 'other');
    expect(getBillingConfigurationError()).toBe('billing_mid_unverified');
    vi.stubEnv('TOSS_BILLING_MID', SPOKEDU_BILLING_MID);
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_ck_unregistered');
    expect(getBillingConfigurationError()).toBe('billing_key_pair_unverified');
  });
});
