import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: { id: '11111111-1111-4111-8111-111111111111' } as { id: string } | null, report: vi.fn(), providerAccess: vi.fn() }));
vi.mock('@/app/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }) }));
vi.mock('@/app/lib/monitoring/errorReporter', () => ({ reportError: mocks.report }));
vi.mock('@/app/lib/server/spokeduMasterBillingProvider', () => ({ assertSpokeduMasterBillingProviderAccess: mocks.providerAccess }));
import { POST } from './route';
import { billingKeyPairDigest, SPOKEDU_BILLING_MID } from '@/app/lib/server/spokeduMasterBillingConfiguration';
import { BILLING_INTENT_COOKIE, verifyBillingIntent } from '@/app/lib/server/spokeduMasterBillingIntent';

function request(body: unknown, origin = 'https://example.test') {
  return new Request('https://example.test/api/spokedu-master/payment/billing/prepare', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
beforeEach(() => {
  mocks.user = { id: '11111111-1111-4111-8111-111111111111' }; vi.clearAllMocks();
  mocks.providerAccess.mockResolvedValue(undefined);
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('TOSS_SECRET_KEY', 'test_sk_fixture');
  vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_ck_fixture'); vi.stubEnv('TOSS_BILLING_MID', SPOKEDU_BILLING_MID);
  vi.stubEnv('TOSS_BILLING_KEY_PAIR_SHA256', billingKeyPairDigest('test_ck_fixture', 'test_sk_fixture'));
});
afterEach(() => vi.unstubAllEnvs());
describe('prepare billing auth', () => {
  it('blocks card auth before issuing an intent when the server IP is denied by Toss', async () => {
    mocks.providerAccess.mockRejectedValueOnce(Object.assign(new Error('private provider message'), { code: 'API_KEY_ACCESS_DENIED', providerStatus: 403 }));
    const response = await POST(request({ planId: 'lite', clientKey: 'test_ck_fixture' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'API_KEY_ACCESS_DENIED', stage: 'provider_access' });
    expect(response.cookies.get(BILLING_INTENT_COOKIE)).toBeUndefined();
    expect(mocks.report).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ tags: expect.objectContaining({ providerCode: 'API_KEY_ACCESS_DENIED', providerStatus: 403 }) }));
  });
  it('accepts the public Host when Next normalizes the internal request URL', async () => {
    const response = await POST(new Request('http://localhost:31600/api/spokedu-master/payment/billing/prepare', {
      method: 'POST', headers: { origin: 'http://127.0.0.1:31600', host: '127.0.0.1:31600', 'content-type': 'application/json' },
      body: JSON.stringify({ planId: 'lite', clientKey: 'test_ck_fixture' }),
    }));
    expect(response.status).toBe(200);
  });
  it('does not accept an untrusted forwarded host as origin authority', async () => {
    const response = await POST(new Request('https://example.test/api/spokedu-master/payment/billing/prepare', {
      method: 'POST', headers: { origin: 'https://attacker.test', host: 'example.test', 'x-forwarded-host': 'attacker.test' }, body: '{}',
    }));
    expect(response.status).toBe(403);
  });
  it('rejects a foreign origin before accessing auth', async () => { expect((await POST(request({}, 'https://other.test'))).status).toBe(403); });
  it('requires login', async () => { mocks.user = null; expect((await POST(request({}))).status).toBe(401); });
  it('rejects an unsupported plan', async () => { expect((await POST(request({ planId: 'center' }))).status).toBe(400); });
  it('blocks a stale browser key before opening the provider UI', async () => {
    const response = await POST(request({ planId: 'lite', clientKey: 'test_ck_old' }));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ code: 'billing_client_bundle_mismatch' });
    expect(mocks.providerAccess).not.toHaveBeenCalled();
    expect(mocks.report.mock.calls.flat().join(' ')).not.toContain('test_ck_old');
  });
  it.each(['lite', 'premium'])('creates an HttpOnly intent bound to authenticated user and %s', async (plan) => {
    const response = await POST(request({ planId: plan, clientKey: 'test_ck_fixture' }));
    expect(response.status).toBe(200);
    const { customerKey } = await response.json();
    const cookie = response.cookies.get(BILLING_INTENT_COOKIE)?.value;
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax');
    expect(verifyBillingIntent(cookie, { userId: mocks.user!.id, plan: plan as 'lite' | 'premium', customerKey })).toBe(true);
    expect(verifyBillingIntent(cookie, { userId: mocks.user!.id, plan: plan === 'lite' ? 'premium' : 'lite', customerKey })).toBe(false);
  });
});
