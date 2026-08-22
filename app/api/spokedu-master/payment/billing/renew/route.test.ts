import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  claim: vi.fn(),
  markFailed: vi.fn(async () => undefined),
  findPayment: vi.fn(async () => null),
  providerConfigured: vi.fn(() => true),
  pay: vi.fn(),
  readKey: vi.fn(),
  applyPayment: vi.fn(),
  reportError: vi.fn(async () => undefined),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({ getServiceSupabase: mocks.getServiceSupabase }));
vi.mock('@/app/lib/server/spokeduMasterBillingOrders', () => ({
  claimSpokeduMasterBillingOrder: mocks.claim,
  markSpokeduMasterBillingOrderFailed: mocks.markFailed,
  shouldReapplySpokeduMasterBillingOrder: (order: { payment_key?: string | null } | null) => Boolean(order?.payment_key),
}));
vi.mock('@/app/lib/server/spokeduMasterBillingProvider', () => ({
  findSpokeduMasterPaymentByOrderId: mocks.findPayment,
  isSpokeduMasterBillingProviderConfigured: mocks.providerConfigured,
  paySpokeduMasterBillingKey: mocks.pay,
}));
vi.mock('@/app/lib/server/spokeduMasterBillingKeyVault', () => ({ readSpokeduMasterBillingKey: mocks.readKey }));
vi.mock('@/app/lib/server/spokeduMasterPaymentApply', () => ({ applySpokeduMasterPayment: mocks.applyPayment }));
vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  hashForMonitoring: (value: string) => `hash:${value}`,
  reportError: mocks.reportError,
}));

import { POST, calculateRenewalRetryAt } from './route';

type Row = Record<string, unknown>;

function installService(subscriptions: Row[], orders: Map<string, Row>) {
  const service = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let updatePatch: Row | null = null;
      let limitCount = Number.POSITIVE_INFINITY;
      let isDueLookup = false;
      const query = {
        select() { isDueLookup = table === 'spokedu_master_subscriptions'; return query; },
        eq(column: string, value: unknown) { filters[column] = value; return query; },
        lte() { return query; },
        or() { return query; },
        order() { return query; },
        limit(value: number) { limitCount = value; return query; },
        async maybeSingle() {
          if (table === 'spokedu_master_payment_orders') {
            return { data: orders.get(String(filters.order_id)) ?? null, error: null };
          }
          return { data: null, error: null };
        },
        async insert(payload: Row) {
          if (table === 'spokedu_master_payment_orders') {
            const orderId = String(payload.order_id);
            if (orders.has(orderId)) return { error: { code: '23505', message: 'duplicate' } };
            orders.set(orderId, { ...payload });
          }
          return { error: null };
        },
        update(payload: Row) { updatePatch = payload; return query; },
        then(resolve: (value: { data?: unknown; error: null }) => unknown) {
          if (isDueLookup && !updatePatch) {
            const now = Date.now();
            const due = subscriptions
              .filter((row) => row.status === 'active' && row.cancel_at_period_end === false)
              .filter((row) => Date.parse(String(row.next_billing_at)) <= now)
              .filter((row) => !row.next_retry_at || Date.parse(String(row.next_retry_at)) <= now)
              .sort((a, b) => Date.parse(String(a.next_billing_at)) - Date.parse(String(b.next_billing_at)))
              .slice(0, limitCount);
            return Promise.resolve(resolve({ data: due, error: null }));
          }
          if (updatePatch && table === 'spokedu_master_subscriptions') {
            const row = subscriptions.find((candidate) => candidate.id === filters.id);
            if (row) Object.assign(row, updatePatch);
          }
          if (updatePatch && table === 'spokedu_master_payment_orders') {
            const order = orders.get(String(filters.order_id));
            if (order) Object.assign(order, updatePatch);
          }
          return Promise.resolve(resolve({ data: null, error: null }));
        },
      };
      return query;
    },
  };
  mocks.getServiceSupabase.mockReturnValue(service);
}

function cronRequest() {
  return new Request('https://example.test/api/spokedu-master/payment/billing/renew', {
    method: 'POST',
    headers: { authorization: 'Bearer cron-test-secret' },
  });
}

describe('billing renewal queue behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'cron-test-secret';
    process.env.TOSS_SECRET_KEY = 'test_toss_secret';
    mocks.providerConfigured.mockReturnValue(true);
    mocks.findPayment.mockResolvedValue(null);
  });

  it('backs off 20 poison rows so the 21st valid due subscription is renewed without a duplicate charge', async () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const subscriptions: Row[] = Array.from({ length: 20 }, (_, index) => ({
      id: `poison-${String(index).padStart(2, '0')}`,
      user_id: `user-poison-${index}`,
      plan: 'premium',
      plan_id: 'premium',
      status: 'active',
      current_period_end: dueAt,
      next_billing_at: dueAt,
      cancel_at_period_end: false,
      provider_customer_key: null,
      provider_billing_key_secret_id: null,
      renewal_retry_count: 0,
    }));
    subscriptions.push({
      id: 'valid-21',
      user_id: 'user-valid-21',
      plan: 'premium',
      plan_id: 'premium',
      status: 'active',
      current_period_end: dueAt,
      next_billing_at: dueAt,
      cancel_at_period_end: false,
      provider_customer_key: 'customer-valid',
      provider_billing_key_secret_id: '22222222-2222-4222-8222-222222222222',
      renewal_retry_count: 0,
    });
    const orders = new Map<string, Row>();
    installService(subscriptions, orders);
    mocks.readKey.mockResolvedValue('billing-key-valid');
    mocks.claim.mockImplementation(async ({ orderId }: { orderId: string }) => {
      const order = orders.get(orderId);
      if (order) order.status = 'processing';
      return { claimed: true, error: null };
    });
    mocks.pay.mockResolvedValue({ paymentKey: 'renewal-payment-key', approvedAt: dueAt });
    mocks.applyPayment.mockImplementation(async ({ userId, orderId }: { userId: string; orderId: string }) => {
      const subscription = subscriptions.find((row) => row.user_id === userId);
      if (subscription) subscription.next_billing_at = new Date(Date.now() + 30 * 86400_000).toISOString();
      const order = orders.get(orderId);
      if (order) Object.assign(order, { status: 'active', payment_key: 'renewal-payment-key' });
      return { ok: true, alreadyApplied: false, plan: 'premium', periodEnd: subscription?.next_billing_at };
    });

    const first = await POST(cronRequest());
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({ checked: 20, attempted: 0, skipped: 20 });
    expect(subscriptions.slice(0, 20).every((row) => row.next_retry_at && row.last_billing_error)).toBe(true);

    const second = await POST(cronRequest());
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ checked: 1, attempted: 1, succeeded: 1 });
    expect(mocks.pay).toHaveBeenCalledTimes(1);

    const repeated = await POST(cronRequest());
    expect(repeated.status).toBe(200);
    await expect(repeated.json()).resolves.toMatchObject({ checked: 0, attempted: 0, succeeded: 0 });
    expect(mocks.pay).toHaveBeenCalledTimes(1);
  });

  it('uses bounded exponential retry windows', () => {
    const now = Date.parse('2026-08-22T00:00:00.000Z');
    expect(calculateRenewalRetryAt(0, now)).toBe('2026-08-22T02:00:00.000Z');
    expect(calculateRenewalRetryAt(10, now)).toBe('2026-08-23T00:00:00.000Z');
  });
});
