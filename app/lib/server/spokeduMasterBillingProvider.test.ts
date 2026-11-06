import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TOSS_BILLING_APPROVAL_TIMEOUT_MS,
  TOSS_FETCH_TIMEOUT_MS,
  isSpokeduMasterBillingProviderConfigured,
  issueSpokeduMasterBillingKey,
  paySpokeduMasterBillingKey,
  findSpokeduMasterPaymentByOrderId,
} from './spokeduMasterBillingProvider';

import { billingKeyPairDigest, SPOKEDU_BILLING_MID } from './spokeduMasterBillingConfiguration';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'test_ck_demo');
  vi.stubEnv('TOSS_BILLING_MID', SPOKEDU_BILLING_MID);
  vi.stubEnv('TOSS_BILLING_KEY_PAIR_SHA256', billingKeyPairDigest('test_ck_demo', 'test_sk_demo'));
});

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
  it('does not recover a DONE response without a valid original approval time', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ mId: SPOKEDU_BILLING_MID, status: 'DONE', paymentKey: 'fixture-payment', orderId: 'spm-lite-initial-fixture', totalAmount: 9900 })));
    await expect(findSpokeduMasterPaymentByOrderId({ orderId: 'spm-lite-initial-fixture', amount: 9900 })).rejects.toThrow('toss_order_lookup_approval_time_missing');
  });
  it('keeps existing renewal keys usable without new checkout attestation variables', () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubEnv('TOSS_BILLING_MID', ''); vi.stubEnv('TOSS_BILLING_KEY_PAIR_SHA256', '');
    expect(isSpokeduMasterBillingProviderConfigured()).toBe(true);
  });
  it('issues only for the expected merchant and customer, using the documented mId field', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    for (const [mId, customerKey, expected] of [
      [SPOKEDU_BILLING_MID, 'customer', true], ['other-mid', 'customer', false], [SPOKEDU_BILLING_MID, 'other-customer', false],
    ] as const) {
      vi.stubGlobal('fetch', vi.fn(async () => Response.json({ mId, customerKey, billingKey: 'fixture-billing-key' })));
      const result = await issueSpokeduMasterBillingKey({ authKey: 'fixture-auth', customerKey: 'customer' });
      expect(Boolean(result)).toBe(expected);
    }
  });

  it('accepts a DONE approval and rejects non-DONE or wrong merchant responses', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    const input = { billingKey: 'fixture-billing', customerKey: 'customer', plan: 'lite' as const, amount: 9900,
      orderId: 'spm-lite-initial-fixture', orderName: 'Lite', customerEmail: '' };
    const response = { mId: SPOKEDU_BILLING_MID, status: 'DONE', paymentKey: 'fixture-payment', orderId: input.orderId,
      totalAmount: 9900, approvedAt: '2026-11-06T12:00:00+09:00' };
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(response)));
    expect(await paySpokeduMasterBillingKey(input)).toMatchObject({ totalAmount: 9900, orderId: input.orderId });
    for (const patch of [{ status: 'CANCELED' }, { mId: 'other' }, { totalAmount: 28900 }, { approvedAt: 'invalid' }]) {
      vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ...response, ...patch })));
      await expect(paySpokeduMasterBillingKey(input)).rejects.toThrow('toss_billing_approval_mismatch');
    }
  });
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
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', 'live_ck_demo');
    vi.stubEnv('TOSS_BILLING_KEY_PAIR_SHA256', billingKeyPairDigest('live_ck_demo', 'live_sk_demo'));
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
    await expect(issueSpokeduMasterBillingKey({ authKey: 'a', customerKey: 'c' })).rejects.toThrow('toss_billing_key_issue_failed:500');
  });

  it('keeps short timeouts for billing-key issue and payment lookup', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    const fetchMock = vi.fn(async () => new Response('no', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    await expect(issueSpokeduMasterBillingKey({ authKey: 'a', customerKey: 'c' })).rejects.toThrow('toss_billing_key_issue_failed:500');
    await expect(findSpokeduMasterPaymentByOrderId({ orderId: 'order-1', amount: 9900 }))
      .rejects.toThrow('toss_order_lookup_indeterminate:500');

    expect(timeoutSpy).toHaveBeenNthCalledWith(1, TOSS_FETCH_TIMEOUT_MS);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, TOSS_FETCH_TIMEOUT_MS);
  });

  it('allows at least 60 seconds for automatic billing approval', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    const fetchMock = vi.fn(async () => new Response('no', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    await expect(paySpokeduMasterBillingKey({
      billingKey: 'bill_1',
      customerKey: 'cust_1',
      plan: 'lite',
      amount: 9900,
      orderId: 'order-lite-1',
      orderName: 'SPOKEDU MASTER Lite',
      customerEmail: 'qa@example.com',
    })).rejects.toThrow('toss_billing_approval_indeterminate:500');

    expect(TOSS_BILLING_APPROVAL_TIMEOUT_MS).toBe(70_000);
    expect(TOSS_BILLING_APPROVAL_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
    expect(timeoutSpy).toHaveBeenCalledWith(TOSS_BILLING_APPROVAL_TIMEOUT_MS);
    expect(timeoutSpy.mock.calls.filter(([timeout]) => timeout === TOSS_BILLING_APPROVAL_TIMEOUT_MS)).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'order-lite-1' }),
      }),
    );
  });

  it('treats pay response mismatches as indeterminate rather than a safe decline', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      mId: SPOKEDU_BILLING_MID,
      paymentKey: 'pay_1',
      orderId: 'wrong-order',
      totalAmount: 100,
      approvedAt: '2099-01-01T00:00:00.000Z',
    }), { status: 200 })));

    await expect(paySpokeduMasterBillingKey({
      billingKey: 'bill_1',
      customerKey: 'cust_1',
      plan: 'lite',
      amount: 9900,
      orderId: 'order-lite-1',
      orderName: 'SPOKEDU MASTER Lite',
      customerEmail: 'qa@example.com',
    })).rejects.toThrow('toss_billing_approval_mismatch');
  });

  it('distinguishes confirmed approval rejection from indeterminate provider failures', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    for (const status of [400, 422]) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('rejected', { status })));
      await expect(paySpokeduMasterBillingKey({
        billingKey: 'bill_1', customerKey: 'cust_1', plan: 'lite', amount: 9900,
        orderId: `order-${status}`, orderName: 'SPOKEDU MASTER Lite', customerEmail: '',
      })).resolves.toBeNull();
    }
    for (const status of [401, 403, 429, 500]) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('unknown', { status })));
      await expect(paySpokeduMasterBillingKey({
        billingKey: 'bill_1', customerKey: 'cust_1', plan: 'lite', amount: 9900,
        orderId: `order-${status}`, orderName: 'SPOKEDU MASTER Lite', customerEmail: '',
      })).rejects.toThrow(`toss_billing_approval_indeterminate:${status}`);
    }
  });

  it('looks up DONE payments by order id and rejects non-DONE', async () => {
    process.env.TOSS_SECRET_KEY = 'test_sk_demo';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      mId: SPOKEDU_BILLING_MID,
      paymentKey: 'pay_1',
      orderId: 'order-1',
      totalAmount: 28900,
      approvedAt: '2099-01-01T00:00:00.000Z',
      status: 'CANCELED',
    }), { status: 200 })));

    expect(await findSpokeduMasterPaymentByOrderId({ orderId: 'order-1', amount: 28900 })).toBeNull();

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      mId: SPOKEDU_BILLING_MID,
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
