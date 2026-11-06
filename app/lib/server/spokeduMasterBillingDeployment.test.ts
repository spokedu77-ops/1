import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import configureNext from '../../../next.config';
import { billingKeyPairDigest, SPOKEDU_BILLING_MID } from './spokeduMasterBillingConfiguration';

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'live_ck_fixture');
  vi.stubEnv('TOSS_SECRET_KEY', 'live_sk_fixture');
  vi.stubEnv('TOSS_BILLING_MID', SPOKEDU_BILLING_MID);
  vi.stubEnv('TOSS_BILLING_KEY_PAIR_SHA256', billingKeyPairDigest('live_ck_fixture', 'live_sk_fixture'));
});
afterEach(() => vi.unstubAllEnvs());

describe('production billing deployment preflight', () => {
  it('allows a pinned live configuration', () => {
    expect(configureNext(PHASE_PRODUCTION_BUILD)).toBeDefined();
  });
  it.each(['TOSS_BILLING_MID', 'TOSS_BILLING_KEY_PAIR_SHA256'])('rejects missing %s before replacing the serving deployment', (name) => {
    vi.stubEnv(name, '');
    expect(() => configureNext(PHASE_PRODUCTION_BUILD)).toThrow(/billing_(mid|key_pair)_unverified/);
  });
  it('rejects production test keys even with a matching digest', () => {
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_ck_fixture');
    vi.stubEnv('TOSS_SECRET_KEY', 'test_sk_fixture');
    vi.stubEnv('TOSS_BILLING_KEY_PAIR_SHA256', billingKeyPairDigest('test_ck_fixture', 'test_sk_fixture'));
    expect(() => configureNext(PHASE_PRODUCTION_BUILD)).toThrow('billing_client_key_invalid');
  });
  it('does not require production credentials in offline CI or development', () => {
    vi.stubEnv('TOSS_BILLING_MID', '');
    expect(configureNext(PHASE_DEVELOPMENT_SERVER)).toBeDefined();
    vi.stubEnv('VERCEL_ENV', '');
    expect(configureNext(PHASE_PRODUCTION_BUILD)).toBeDefined();
  });
});
