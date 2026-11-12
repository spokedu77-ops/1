import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  isPlatformAdminUser: vi.fn(async () => false),
  createServerSupabaseClient: vi.fn(),
  claim: vi.fn(),
  markFailed: vi.fn(async () => undefined),
  findPayment: vi.fn(),
  issueBillingKey: vi.fn(),
  providerConfigured: vi.fn(() => true),
  pay: vi.fn(),
  storeKey: vi.fn(),
  readKey: vi.fn(),
  deleteKey: vi.fn(async () => true),
  applyPayment: vi.fn(),
  reportError: vi.fn(async () => undefined),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: mocks.getServiceSupabase,
  isPlatformAdminUser: mocks.isPlatformAdminUser,
}));
vi.mock('@/app/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock('@/app/lib/server/spokeduMasterBillingOrders', () => ({
  claimSpokeduMasterBillingOrder: mocks.claim,
  markSpokeduMasterBillingOrderFailed: mocks.markFailed,
  shouldReapplySpokeduMasterBillingOrder: (order: { payment_key?: string | null } | null) => Boolean(order?.payment_key),
}));
vi.mock('@/app/lib/server/spokeduMasterBillingProvider', () => ({
  findSpokeduMasterPaymentByOrderId: mocks.findPayment,
  issueSpokeduMasterBillingKey: mocks.issueBillingKey,
  isSpokeduMasterBillingProviderConfigured: mocks.providerConfigured,
  paySpokeduMasterBillingKey: mocks.pay,
}));
vi.mock('@/app/lib/server/spokeduMasterBillingKeyVault', () => ({
  storeSpokeduMasterBillingKey: mocks.storeKey,
  readSpokeduMasterBillingKey: mocks.readKey,
  deleteSpokeduMasterBillingKey: mocks.deleteKey,
}));
vi.mock('@/app/lib/server/spokeduMasterPaymentApply', () => ({
  applySpokeduMasterPayment: mocks.applyPayment,
}));
vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  hashForMonitoring: (value: string) => `hash:${value}`,
  reportError: mocks.reportError,
}));

import { BILLING_INTENT_COOKIE, createBillingIntent } from '@/app/lib/server/spokeduMasterBillingIntent';

beforeEach(() => vi.stubEnv('TOSS_SECRET_KEY', 'test_sk_fixture'));
afterEach(() => vi.unstubAllEnvs());

import { POST } from './route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SECRET_ID = '22222222-2222-4222-8222-222222222222';

type State = {
  subscription: Record<string, unknown> | null;
  order: Record<string, unknown> | null;
};

function installService(state: State) {
  if (state.order) state.order = { user_id: USER_ID, applied_at: null, ...state.order };
  const service = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const predicates: Array<(row: Record<string, unknown>) => boolean> = [];
      let updatePatch: Record<string, unknown> | null = null;
      const matches = (row: Record<string, unknown>) => Object.entries(filters).every(([key, value]) => row[key] === value) && predicates.every((test) => test(row));
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) { filters[column] = value; return query; },
        in(column: string, values: unknown[]) { predicates.push((row) => values.includes(row[column])); return query; },
        is(column: string, value: unknown) { predicates.push((row) => (row[column] ?? null) === value); return query; },
        like(column: string, value: string) { predicates.push((row) => String(row[column] ?? '').startsWith(value.replace(/%$/, ''))); return query; },
        not(column: string, _operator: string, value: string) { predicates.push((row) => !String(row[column] ?? '').startsWith(value.replace(/%$/, ''))); return query; },
        order() { return query; },
        limit() { return query; },
        lt() { return query; },
        async maybeSingle() {
          if (table === 'spokedu_master_subscriptions') return { data: state.subscription, error: null };
          if (table === 'spokedu_master_payment_orders') {
            if (!state.order) return { data: null, error: null };
            if (!matches(state.order)) return { data: null, error: null };
            if (updatePatch) state.order = { ...state.order, ...updatePatch };
            return { data: state.order, error: null };
          }
          return { data: null, error: null };
        },
        async insert(payload: Record<string, unknown>) {
          state.order = { charge_state: 'unattempted', applied_at: null, ...payload };
          return { error: null };
        },
        update(payload: Record<string, unknown>) { updatePatch = payload; return query; },
        then(resolve: (value: { data?: unknown; error: null }) => unknown) {
          if (updatePatch && table === 'spokedu_master_payment_orders' && state.order && matches(state.order)) {
            state.order = { ...state.order, ...updatePatch };
          }
          return Promise.resolve(resolve({ data: null, error: null }));
        },
      };
      return query;
    },
  };
  mocks.getServiceSupabase.mockReturnValue(service);
}

function request(body: Record<string, unknown>) {
  return new Request('https://example.test/api/spokedu-master/payment/billing/issue', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `${BILLING_INTENT_COOKIE}=${createBillingIntent({ userId: USER_ID, plan: body.planId === 'premium' ? 'premium' : 'lite', customerKey: String(body.customerKey ?? '') })}` },
    body: JSON.stringify(body),
  });
}

describe('billing issue recoverable charge flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.providerConfigured.mockReturnValue(true);
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: USER_ID, email: 'qa@example.test' } } }) },
    });
  });

  it('retains the actual lookup failure and stops before issuing or charging a billing key', async () => {
    const state: State = { subscription: null, order: null };
    installService(state);
    mocks.claim.mockImplementation(async () => {
      if (state.order) state.order.status = 'processing';
      return { claimed: true, error: null };
    });
    mocks.findPayment.mockRejectedValueOnce(Object.assign(new Error('private provider message'), { code: 'API_KEY_ACCESS_DENIED', providerStatus: 403 }));
    const response = await POST(request({ planId: 'lite', amount: 9900, authKey: 'one-time-auth-key', customerKey: `spm_${USER_ID.replaceAll('-', '')}` }));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: 'API_KEY_ACCESS_DENIED', stage: 'payment_lookup' });
    expect(mocks.issueBillingKey).not.toHaveBeenCalled();
    expect(mocks.pay).not.toHaveBeenCalled();
    expect(mocks.markFailed).toHaveBeenCalledWith(expect.objectContaining({ lastErrorCode: 'payment_recovery_lookup_failed', recoverable: true }));
    expect(mocks.reportError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ tags: expect.objectContaining({ providerCode: 'API_KEY_ACCESS_DENIED', providerStatus: 403 }) }));
  });

  it('preserves paymentKey and Billing Key after apply failure, then retries apply without a duplicate charge or authKey reuse', async () => {
    const state: State = { subscription: null, order: null };
    installService(state);
    mocks.claim.mockImplementation(async () => {
      if (state.order) state.order.status = 'processing';
      return { claimed: true, error: null };
    });
    mocks.issueBillingKey.mockResolvedValue({ billingKey: 'billing-key-new', customerKey: `spm_${USER_ID.replaceAll('-', '')}` });
    mocks.storeKey.mockImplementation(async () => {
      state.subscription = {
        plan: 'lite',
        status: 'pending',
        period_end: null,
        provider_billing_key_secret_id: null,
        pending_billing_key_secret_id: SECRET_ID,
      };
      return SECRET_ID;
    });
    mocks.findPayment.mockResolvedValue(null);
    mocks.pay.mockResolvedValue({ paymentKey: 'payment-key-charged', approvedAt: '2026-08-22T00:00:00.000Z' });
    mocks.applyPayment
      .mockResolvedValueOnce({ ok: false, status: 500, code: 'payment_apply_rpc_failed', message: 'failed' })
      .mockResolvedValueOnce({
        ok: true,
        alreadyApplied: false,
        plan: 'premium',
        periodEnd: '2026-09-22T00:00:00.000Z',
        nextBillingAt: '2026-09-22T00:00:00.000Z',
      });

    const first = await POST(request({
      planId: 'premium',
      amount: 28900,
      authKey: 'one-time-auth-key',
      customerKey: `spm_${USER_ID.replaceAll('-', '')}`,
    }));
    expect(first.status).toBe(500);
    await expect(first.json()).resolves.toMatchObject({ charged: true, recoverable: true });
    expect(state.order).toMatchObject({ payment_key: 'payment-key-charged' });
    expect(state.subscription).toMatchObject({ pending_billing_key_secret_id: SECRET_ID });
    expect(mocks.deleteKey).not.toHaveBeenCalled();
    expect(mocks.pay).toHaveBeenCalledTimes(1);

    mocks.findPayment.mockResolvedValue({ paymentKey: 'payment-key-charged', approvedAt: '2026-08-22T00:00:00.000Z' });
    const second = await POST(request({
      planId: 'premium',
      amount: 28900,
      customerKey: `spm_${USER_ID.replaceAll('-', '')}`,
    }));
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ ok: true, plan: 'premium' });
    expect(mocks.issueBillingKey).toHaveBeenCalledTimes(1);
    expect(mocks.pay).toHaveBeenCalledTimes(1);
    expect(mocks.applyPayment).toHaveBeenCalledTimes(2);
    expect(mocks.applyPayment).toHaveBeenLastCalledWith(expect.objectContaining({
      paymentKey: 'payment-key-charged',
      providerBillingKeySecretId: SECRET_ID,
    }));
  });

  it('preserves the pending Billing Key when a charge response is ambiguous', async () => {
    const state: State = { subscription: null, order: null };
    installService(state);
    mocks.claim.mockImplementation(async () => {
      if (state.order) state.order.status = 'processing';
      return { claimed: true, error: null };
    });
    mocks.issueBillingKey.mockResolvedValue({ billingKey: 'billing-key-new', customerKey: `spm_${USER_ID.replaceAll('-', '')}` });
    mocks.storeKey.mockResolvedValue(SECRET_ID);
    mocks.findPayment.mockResolvedValue(null);
    mocks.pay.mockRejectedValue(new Error('provider response timeout'));

    const response = await POST(request({
      planId: 'lite',
      amount: 9900,
      authKey: 'one-time-auth-key',
      customerKey: `spm_${USER_ID.replaceAll('-', '')}`,
    }));

    expect(response.status).toBe(502);
    expect(mocks.storeKey).toHaveBeenCalledTimes(1);
    expect(mocks.deleteKey).not.toHaveBeenCalled();
    expect(mocks.markFailed).toHaveBeenCalledWith(expect.objectContaining({
      lastErrorCode: 'initial_payment_exception',
      recoverable: true,
    }));
  });
});

describe('billing issue plan policy', () => {
  const customerKey = `spm_${USER_ID.replaceAll('-', '')}`;
  const litePeriod = {
    plan: 'lite',
    status: 'active',
    period_start: '2026-09-01T00:00:00.000Z',
    period_end: '2026-10-01T00:00:00.000Z',
    current_period_start: '2026-09-01T00:00:00.000Z',
    current_period_end: '2026-10-01T00:00:00.000Z',
    provider_customer_key: customerKey,
    provider_billing_key_secret_id: SECRET_ID,
    cancel_at_period_end: false,
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-20T00:00:00.000Z'));
    vi.clearAllMocks();
    mocks.providerConfigured.mockReturnValue(true);
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: USER_ID, email: 'qa@example.test' } } }) },
    });
    mocks.claim.mockImplementation(async () => ({ claimed: true, error: null }));
    mocks.findPayment.mockResolvedValue(null);
    mocks.readKey.mockResolvedValue('existing-billing-key');
    mocks.pay.mockResolvedValue({ paymentKey: 'upgrade-payment-key', approvedAt: '2026-09-20T00:00:00.000Z' });
    mocks.applyPayment.mockResolvedValue({
      ok: true,
      alreadyApplied: false,
      plan: 'premium',
      periodEnd: '2026-10-01T00:00:00.000Z',
      nextBillingAt: '2026-10-01T00:00:00.000Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a plan changed after the server signed the checkout', async () => {
    installService({ subscription: null, order: null });
    const signed = request({ planId: 'lite', customerKey });
    const tampered = new Request(signed.url, { method: 'POST', headers: signed.headers,
      body: JSON.stringify({ planId: 'premium', customerKey, authKey: 'fixture-auth' }) });
    const response = await POST(tampered);
    expect(response.status).toBe(400); expect(await response.json()).toMatchObject({ code: 'billing_intent_invalid' });
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('does not resubmit an uncertain charge even when provider lookup returns no payment', async () => {
    const state: State = { subscription: null, order: { order_id: 'spm-lite-initial-uncertain', plan: 'lite',
      billing_cycle_key: `initial:${USER_ID}:checkout:0`, status: 'recoverable_failed', payment_key: null, charge_state: 'outcome_unknown' } };
    installService(state);
    const response = await POST(request({ planId: 'lite', customerKey, authKey: 'fresh-auth' }));
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ recoverable: true });
    expect(mocks.issueBillingKey).not.toHaveBeenCalled(); expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('uses the same stable shared checkout cycle after expiry', async () => {
    const state: State = { subscription: { ...litePeriod, status: 'expired', current_period_end: '2026-08-01T00:00:00.000Z' }, order: null };
    installService(state);
    mocks.issueBillingKey.mockResolvedValue({ billingKey: 'new-key', customerKey }); mocks.storeKey.mockResolvedValue(SECRET_ID);
    await POST(request({ planId: 'premium', customerKey, authKey: 'auth-key' }));
    expect(state.order?.billing_cycle_key).toBe(`initial:${USER_ID}:checkout:${Date.parse('2026-08-01T00:00:00.000Z')}`);
  });

  it('recovers a legacy v1 approval using its original cycle and never creates a second charge', async () => {
    const originalCycle = `initial:${USER_ID}:lite`;
    const state: State = { subscription: { plan: 'lite', status: 'pending', pending_billing_key_secret_id: SECRET_ID },
      order: { order_id: 'spm-lite-initial-legacy', plan: 'lite', amount: 9900, status: 'recoverable_failed',
        payment_key: 'legacy-payment', charge_state: 'approved_unapplied', billing_cycle_key: originalCycle } };
    installService(state);
    mocks.findPayment.mockResolvedValue({ paymentKey: 'legacy-payment', approvedAt: '2026-09-19T00:00:00.000Z' });
    const response = await POST(request({ planId: 'lite', customerKey, authKey: 'new-unused-auth' }));
    expect(response.status).toBe(200);
    expect(mocks.pay).not.toHaveBeenCalled(); expect(mocks.issueBillingKey).not.toHaveBeenCalled();
    expect(mocks.applyPayment).toHaveBeenCalledWith(expect.objectContaining({ billingCycleKey: originalCycle, approvedAt: '2026-09-19T00:00:00.000Z' }));
    expect(state.order?.order_id).toBe('spm-lite-initial-legacy');
  });

  it('holds an uncertain legacy v1 order even when its old charge state says unattempted', async () => {
    const state: State = { subscription: null, order: { order_id: 'spm-lite-initial-legacy', plan: 'lite', amount: 9900,
      status: 'recoverable_failed', payment_key: null, charge_state: 'unattempted', billing_cycle_key: `initial:${USER_ID}:lite` } };
    installService(state);
    const response = await POST(request({ planId: 'lite', customerKey, authKey: 'new-unused-auth' }));
    expect(response.status).toBe(409); expect(mocks.pay).not.toHaveBeenCalled();
    expect(state.order?.order_id).toBe('spm-lite-initial-legacy');
  });

  it('keeps the original upgrade amount when recovering after the current proration quote has changed', async () => {
    const cycle = `upgrade:${USER_ID}:premium:${litePeriod.current_period_end}`;
    const state: State = { subscription: { ...litePeriod }, order: { order_id: 'spm-premium-initial-recovery', plan: 'premium',
      amount: 10000, status: 'recoverable_failed', payment_key: 'old-upgrade-payment', charge_state: 'approved_unapplied', billing_cycle_key: cycle } };
    installService(state);
    mocks.findPayment.mockResolvedValue({ paymentKey: 'old-upgrade-payment', approvedAt: '2026-09-15T00:00:00.000Z' });
    expect((await POST(request({ planId: 'premium', customerKey }))).status).toBe(200);
    expect(mocks.findPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 10000 }));
    expect(mocks.applyPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 10000, source: 'upgrade' }));
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('rotates a definitively declined order before the user authorizes another attempt', async () => {
    const state: State = { subscription: null, order: { order_id: 'spm-lite-initial-declined', plan: 'lite', amount: 9900,
      status: 'failed', payment_key: null, charge_state: 'declined', billing_cycle_key: `initial:${USER_ID}:checkout:0` } };
    installService(state);
    mocks.issueBillingKey.mockResolvedValue({ billingKey: 'retry-key', customerKey }); mocks.storeKey.mockResolvedValue(SECRET_ID);
    expect((await POST(request({ planId: 'lite', customerKey, authKey: 'fresh-auth' }))).status).toBe(200);
    expect(state.order?.order_id).not.toBe('spm-lite-initial-declined');
    expect(mocks.pay).toHaveBeenCalledTimes(1);
  });

  it('charges the server upgrade quote for active Lite → Premium and ignores a matching client amount', async () => {
    const { calculateSpokeduMasterLiteUpgradeQuote } = await import('@/app/lib/server/spokeduMasterProration');
    const quote = calculateSpokeduMasterLiteUpgradeQuote({
      periodStart: litePeriod.period_start,
      periodEnd: litePeriod.period_end,
    });
    expect(quote).not.toBeNull();
    const state: State = { subscription: { ...litePeriod }, order: null };
    installService(state);

    const response = await POST(request({
      planId: 'premium',
      amount: quote!.amountDueNow,
      customerKey,
    }));

    expect(response.status).toBe(200);
    expect(mocks.issueBillingKey).not.toHaveBeenCalled();
    expect(mocks.pay).toHaveBeenCalledWith(expect.objectContaining({
      amount: quote!.amountDueNow,
      plan: 'premium',
    }));
    expect(mocks.applyPayment).toHaveBeenCalledWith(expect.objectContaining({
      source: 'upgrade',
      amount: quote!.amountDueNow,
      periodOverride: expect.objectContaining({
        periodEnd: quote!.periodEnd,
        nextBillingAt: quote!.nextBillingAt,
      }),
    }));
  });

  it('rejects client amount tampering on Lite → Premium upgrade', async () => {
    const state: State = { subscription: { ...litePeriod }, order: null };
    installService(state);

    const response = await POST(request({
      planId: 'premium',
      amount: 28900,
      customerKey,
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: '결제 금액이 서버 견적과 일치하지 않습니다.' });
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('blocks Lite → Lite repurchase while Lite is active', async () => {
    const state: State = { subscription: { ...litePeriod }, order: null };
    installService(state);

    const response = await POST(request({
      planId: 'lite',
      amount: 9900,
      customerKey,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: '이미 활성화된 이용권입니다.', plan: 'lite' });
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('blocks Premium → Premium repurchase', async () => {
    const state: State = {
      subscription: {
        ...litePeriod,
        plan: 'premium',
        current_amount: 28900,
      },
      order: null,
    };
    installService(state);

    const response = await POST(request({
      planId: 'premium',
      amount: 28900,
      customerKey,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: '이미 활성화된 이용권입니다.', plan: 'premium' });
  });

  it('blocks Lite upgrade while cancel_at_period_end is scheduled', async () => {
    const state: State = {
      subscription: { ...litePeriod, cancel_at_period_end: true },
      order: null,
    };
    installService(state);

    const response = await POST(request({
      planId: 'premium',
      customerKey,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: '해지 예약 중에는 이용권을 바로 변경할 수 없습니다. 고객센터로 문의해 주세요.',
    });
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('starts Free → Lite at the catalog list price', async () => {
    const state: State = { subscription: null, order: null };
    installService(state);
    mocks.issueBillingKey.mockResolvedValue({ billingKey: 'new-key', customerKey });
    mocks.storeKey.mockResolvedValue(SECRET_ID);
    mocks.applyPayment.mockResolvedValue({
      ok: true,
      alreadyApplied: false,
      plan: 'lite',
      periodEnd: '2026-10-20T00:00:00.000Z',
      nextBillingAt: '2026-10-20T00:00:00.000Z',
    });

    const response = await POST(request({
      planId: 'lite',
      amount: 9900,
      authKey: 'auth-key',
      customerKey,
    }));

    expect(response.status).toBe(200);
    expect(mocks.pay).toHaveBeenCalledWith(expect.objectContaining({ amount: 9900, plan: 'lite' }));
    expect(mocks.applyPayment).toHaveBeenCalledWith(expect.objectContaining({ source: 'initial', amount: 9900, plan: 'lite' }));
  });

  it('starts Free → Premium at the catalog list price', async () => {
    const state: State = { subscription: null, order: null };
    installService(state);
    mocks.issueBillingKey.mockResolvedValue({ billingKey: 'new-key', customerKey });
    mocks.storeKey.mockResolvedValue(SECRET_ID);

    const response = await POST(request({
      planId: 'premium',
      amount: 28900,
      authKey: 'auth-key',
      customerKey,
    }));

    expect(response.status).toBe(200);
    expect(mocks.pay).toHaveBeenCalledWith(expect.objectContaining({ amount: 28900, plan: 'premium' }));
    expect(mocks.applyPayment).toHaveBeenCalledWith(expect.objectContaining({ source: 'initial', amount: 28900, plan: 'premium' }));
  });

  it('treats expired Lite as a new Premium checkout, not a proration upgrade', async () => {
    const state: State = {
      subscription: {
        ...litePeriod,
        status: 'expired',
        period_end: '2026-08-01T00:00:00.000Z',
        current_period_end: '2026-08-01T00:00:00.000Z',
      },
      order: null,
    };
    installService(state);
    mocks.issueBillingKey.mockResolvedValue({ billingKey: 'new-key', customerKey });
    mocks.storeKey.mockResolvedValue(SECRET_ID);

    const response = await POST(request({
      planId: 'premium',
      amount: 28900,
      authKey: 'auth-key',
      customerKey,
    }));

    expect(response.status).toBe(200);
    expect(mocks.pay).toHaveBeenCalledWith(expect.objectContaining({ amount: 28900, plan: 'premium' }));
    expect(mocks.applyPayment).toHaveBeenCalledWith(expect.objectContaining({
      source: 'initial',
      amount: 28900,
    }));
  });
});
