import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isSpokeduMasterBillingProviderConfigured,
  issueSpokeduMasterBillingKey,
  paySpokeduMasterBillingKey,
  findSpokeduMasterPaymentByOrderId,
} from './spokeduMasterBillingProvider';

const originalSecret = process.env.TOSS_SECRET_KEY;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.TOSS_SECRET_KEY;
  else process.env.TOSS_SECRET_KEY = originalSecret;
  vi.unstubAllGlobals();
});

describe('spokeduMasterBillingProvider', () => {
  it('fails closed unless Toss secret starts with test_ or live_', () => {
    delete process.env.TOSS_SECRET_KEY;
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(false);

    process.env.TOSS_SECRET_KEY = 'sk_bad';
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(false);

    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(true);

    process.env.TOSS_SECRET_KEY = 'live_sk_demo';
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
