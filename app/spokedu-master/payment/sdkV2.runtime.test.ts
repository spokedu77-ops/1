// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), payment: vi.fn(), load: vi.fn(), fetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back() {}, replace() {} }), useSearchParams: () => new URLSearchParams('plan=lite') }));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('@/app/lib/supabase/browser', () => ({ getSupabaseBrowserClient: () => ({}) }));
vi.mock('@/app/lib/supabase/auth', () => ({ getSessionWithRefreshRecovery: async () => ({ user: { id: '11111111-1111-4111-8111-111111111111', email: 'qa@example.test' } }) }));
vi.mock('../lib/funnelEvents', () => ({ trackMasterFunnelEvent() {} }));
vi.mock('@tosspayments/tosspayments-sdk', () => ({ loadTossPayments: mocks.load }));
import PaymentPage from './page';

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_ck_fixture'); vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  mocks.payment.mockReturnValue({ requestBillingAuth: mocks.auth });
  mocks.load.mockResolvedValue({ payment: mocks.payment });
  mocks.auth.mockResolvedValue(undefined);
  mocks.fetch.mockImplementation(async (url) => Response.json(url.includes('/prepare') ? { customerKey: 'server-owned-customer' } : { plan: 'free', status: 'none' }));
  vi.stubGlobal('fetch', mocks.fetch);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function render() { await act(async () => { root.render(createElement(PaymentPage)); }); }
function button(plan = 'lite') { return host.querySelector<HTMLButtonElement>(`button[data-plan-id="${plan}"]`)!; }

describe('SDK v2 checkout runtime (mock SDK and server)', () => {
  it.each(['lite', 'premium'])('uses the same CARD auth flow and preserves %s through mobile redirects', async (plan) => {
    await render();
    await act(async () => button(plan).click());
    expect(mocks.load).toHaveBeenCalledWith('test_ck_fixture');
    expect(mocks.payment).toHaveBeenCalledWith({ customerKey: 'server-owned-customer' });
    expect(mocks.auth).toHaveBeenCalledWith(expect.objectContaining({ method: 'CARD', successUrl: expect.stringContaining(`/spokedu-lab/payment/success?plan=${plan}`), failUrl: expect.stringContaining(`/spokedu-lab/payment/cancel?plan=${plan}`) }));
  });
  it('keeps a synchronous lock through the pending SDK auth promise and releases it on cancel', async () => {
    let rejectAuth!: (error: unknown) => void;
    mocks.auth.mockImplementation(() => new Promise((_resolve, reject) => { rejectAuth = reject; }));
    await render();
    await act(async () => { button().click(); button().click(); });
    expect(mocks.auth).toHaveBeenCalledTimes(1); expect(button().disabled).toBe(true); expect(button('premium').disabled).toBe(true);
    await act(async () => rejectAuth({ code: 'USER_CANCEL' }));
    expect(button().disabled).toBe(false); expect(host.textContent).toContain('USER_CANCEL');
  });
  it('does not open auth when server configuration rejects the key', async () => {
    mocks.fetch.mockImplementation(async (url) => url.includes('/prepare') ? Response.json({ code: 'billing_key_pair_unverified' }, { status: 503 }) : Response.json({ plan: 'free' }));
    await render(); await act(async () => button().click());
    expect(mocks.auth).not.toHaveBeenCalled(); expect(host.textContent).toContain('billing_key_pair_unverified');
  });
  it('blocks widget keys before SDK loading', async () => {
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'live_gck_fixture'); await render();
    expect(mocks.load).not.toHaveBeenCalled(); expect(button().disabled).toBe(true);
  });
  it('recovers an SDK load failure through the existing reload action', async () => {
    mocks.load.mockRejectedValue(new Error('network')); await render();
    expect(button().disabled).toBe(true);
    expect([...host.querySelectorAll('button')].some((b) => b.textContent?.includes('결제 모듈 다시 불러오기'))).toBe(true);
  });
});
