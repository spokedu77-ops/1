import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TOSS_BILLING_APPROVAL_TIMEOUT_MS,
  TOSS_FETCH_TIMEOUT_MS,
  isSpokeduMasterBillingProviderConfigured,
  issueSpokeduMasterBillingKey,
  paySpokeduMasterBillingKey,
  findSpokeduMasterPaymentByOrderId,
} from './spokeduMasterBillingProvider';

const originalSecret = process.env.TOSS_SECRET_KEY;
const originalNodeEnv = process.env.NODE_ENV;
const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.TOSS_SECRET_KEY;
  else process.env.TOSS_SECRET_KEY = originalSecret;
  vi.stubEnv('NODE_ENV', originalNodeEnv ?? 'test');
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else vi.stubEnv('VERCEL_ENV', originalVercelEnv);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('spokeduMasterBillingProvider', () => {
  it('allows test keys outside production and fails closed on them in production', () => {
    delete process.env.TOSS_SECRET_KEY;
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(false);

    process.env.TOSS_SECRET_KEY = 'sk_bad';
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(false);

    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(true);

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(false);

    process.env.TOSS_SECRET_KEY = 'live_sk_demo';
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(true);
  });

  it('allows test keys in Vercel preview even though Next runs with NODE_ENV production', () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(true);
  });

  it('returns null from issue/pay/lookup when provider is not configured', async () => {
    delete process.env.TOSS_SECRET_KEY;
    expect(await issueSpokeduMasterBillingKey({ authKey: 'a', customerKey: 'c' })).toBeNull();
    expect(await paySpokeduMasterBillingKey({
      billingKey: 'b',
      customerKey: 'c',
      plan: 'premium',
      amount: 28900,
      orderName: 'SPOKEDU MASTER',
      customerEmail: 'qa@example.com',
    })).toBeNull();
    expect(await findSpokeduMasterPaymentByOrderId({ orderId: 'order-1', amount: 28900 })).toBeNull();
  });

  it('returns null when Toss issue HTTP fails', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    expect(await issueSpokeduMasterBillingKey({ authKey: 'a', customerKey: 'c' })).toBeNull();
  });

  it('keeps short timeouts for billing-key issue and payment lookup', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    const fetchMock = vi.fn(async () => new Response('no', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    await issueSpokeduMasterBillingKey({ authKey: 'a', customerKey: 'c' });
    await findSpokeduMasterPaymentByOrderId({ orderId: 'order-1', amount: 9900 });

    expect(timeoutSpy).toHaveBeenNthCalledWith(1, TOSS_FETCH_TIMEOUT_MS);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, TOSS_FETCH_TIMEOUT_MS);
  });

  it('allows at least 60 seconds for automatic billing approval', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    await paySpokeduMasterBillingKey({
      billingKey: 'bill_1',
      customerKey: 'cust_1',
      plan: 'lite',
      amount: 9900,
      orderId: 'order-lite-1',
      orderName: 'SPOKEDU MASTER Lite',
      customerEmail: 'qa@example.com',
    });

    expect(TOSS_BILLING_APPROVAL_TIMEOUT_MS).toBe(70_000);
    expect(TOSS_BILLING_APPROVAL_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
    expect(timeoutSpy).toHaveBeenCalledWith(TOSS_BILLING_APPROVAL_TIMEOUT_MS);
    expect(timeoutSpy.mock.calls.filter(([timeout]) => timeout === TOSS_BILLING_APPROVAL_TIMEOUT_MS)).toHaveLength(1);
  });

  it('rejects pay responses with amount/order mismatch', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      paymentKey: 'pay_1',
      orderId: 'wrong-order',
      totalAmount: 100,
      approvedAt: '2099-01-01T00:00:00.000Z',
    }), { status: 200 })));

    expect(await paySpokeduMasterBillingKey({
      billingKey: 'bill_1',
      customerKey: 'cust_1',
      plan: 'lite',
      amount: 9900,
      orderId: 'order-lite-1',
      orderName: 'SPOKEDU MASTER Lite',
      customerEmail: 'qa@example.com',
    })).toBeNull();
  });

  it('looks up DONE payments by order id and rejects non-DONE', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      paymentKey: 'pay_1',
      orderId: 'order-1',
      totalAmount: 28900,
      approvedAt: '2099-01-01T00:00:00.000Z',
      status: 'CANCELED',
    }), { status: 200 })));

    expect(await findSpokeduMasterPaymentByOrderId({ orderId: 'order-1', amount: 28900 })).toBeNull();

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      paymentKey: 'pay_1',
      orderId: 'order-1',
      totalAmount: 28900,
      approvedAt: '2099-01-01T00:00:00.000Z',
      status: 'DONE',
    }), { status: 200 })));

    await expect(findSpokeduMasterPaymentByOrderId({ orderId: 'order-1', amount: 28900 })).resolves.toMatchObject({
      paymentKey: 'pay_1',
      orderId: 'order-1',
      totalAmount: 28900,
    });
  });
});
