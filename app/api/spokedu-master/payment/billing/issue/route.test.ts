import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { POST } from './route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SECRET_ID = '22222222-2222-4222-8222-222222222222';

type State = {
  subscription: Record<string, unknown> | null;
  order: Record<string, unknown> | null;
};

function installService(state: State) {
  const service = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let updatePatch: Record<string, unknown> | null = null;
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) { filters[column] = value; return query; },
        in() { return query; },
        lt() { return query; },
        async maybeSingle() {
          if (table === 'spokedu_master_subscriptions') return { data: state.subscription, error: null };
          if (table === 'spokedu_master_payment_orders') {
            if (!state.order) return { data: null, error: null };
            if (filters.order_id && state.order.order_id !== filters.order_id) return { data: null, error: null };
            if (filters.billing_cycle_key && state.order.billing_cycle_key !== filters.billing_cycle_key) return { data: null, error: null };
            return { data: state.order, error: null };
          }
          return { data: null, error: null };
        },
        async insert(payload: Record<string, unknown>) {
          state.order = { ...payload };
          return { error: null };
        },
        update(payload: Record<string, unknown>) { updatePatch = payload; return query; },
        then(resolve: (value: { data?: unknown; error: null }) => unknown) {
          if (updatePatch && table === 'spokedu_master_payment_orders' && state.order) {
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
    headers: { 'content-type': 'application/json' },
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
