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
