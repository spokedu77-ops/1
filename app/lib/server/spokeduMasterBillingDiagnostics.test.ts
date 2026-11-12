import { afterEach, describe, expect, it, vi } from 'vitest';
import { billingProviderDiagnostics } from './spokeduMasterBillingDiagnostics';

afterEach(() => vi.unstubAllEnvs());

describe('safe billing provider diagnostics', () => {
  it('keeps the actionable access-policy error and runtime region without raw provider data', () => {
    vi.stubEnv('VERCEL_REGION', 'iad1');
    const error = Object.assign(new Error('private authKey and paymentKey'), {
      code: 'API_KEY_ACCESS_DENIED', providerStatus: 403, body: 'private provider body',
    });
    expect(billingProviderDiagnostics(error)).toEqual({ providerCode: 'API_KEY_ACCESS_DENIED', providerStatus: 403, region: 'iad1' });
    expect(JSON.stringify(billingProviderDiagnostics(error))).not.toContain('private');
  });

  it('does not copy arbitrary errors, malformed codes or deployment strings into diagnostics', () => {
    vi.stubEnv('VERCEL_REGION', 'secret in an invalid region');
    expect(billingProviderDiagnostics({ code: 'live_sk_private', providerStatus: '403', message: 'private' }))
      .toEqual({ providerCode: 'BILLING_PROVIDER_REQUEST_FAILED', providerStatus: null, region: 'unknown' });
    expect(billingProviderDiagnostics(new DOMException('private', 'TimeoutError')).providerCode).toBe('BILLING_PROVIDER_TIMEOUT');
  });
});
