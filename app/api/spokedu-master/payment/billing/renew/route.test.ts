import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  claim: vi.fn(),
  markFailed: vi.fn(async () => undefined),
  findPayment: vi.fn<(input: { orderId: string; amount: number }) => Promise<unknown>>(async () => null),
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

import { POST } from './route';
import { calculateRenewalRetryAt } from './renewalRetry';

type Row = Record<string, unknown>;
const billingRunPatches: Row[] = [];

function installService(subscriptions: Row[], orders: Map<string, Row>) {
  for (const subscription of subscriptions) {
    if (!Object.prototype.hasOwnProperty.call(subscription, 'billing_anchor_day')) subscription.billing_anchor_day = 15;
    if (!Object.prototype.hasOwnProperty.call(subscription, 'pg_provider')) subscription.pg_provider = 'tosspayments';
  }
  const service = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const ors: string[] = [];
      let updatePatch: Row | null = null;
      let limitCount = Number.POSITIVE_INFINITY;
      let isDueLookup = false;
      const query = {
        select() { isDueLookup = table === 'spokedu_master_subscriptions'; return query; },
        eq(column: string, value: unknown) { filters[column] = value; return query; },
        in(column: string, values: unknown[]) { filters[`in:${column}`] = values; return query; },
        not(column: string, operator: string, value: unknown) { filters[`not:${column}:${operator}`] = value; return query; },
        lte() { return query; },
        lt(column: string, value: number) { filters[`lt:${column}`] = value; return query; },
        or(expression: string) {
          ors.push(expression);
          return query;
        },
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
        async upsert(payload: Row) {
          if (table === 'spokedu_master_billing_provider_state') return { data: payload, error: null };
          return { data: null, error: null };
        },
        update(payload: Row) { updatePatch = payload; return query; },
        then(resolve: (value: { data?: unknown; error: null }) => unknown) {
          if (table === 'spokedu_master_payment_orders' && !updatePatch) {
            const allowedStatuses = filters['in:status'] as string[] | undefined;
            const allowedChargeStates = filters['in:charge_state'] as string[] | undefined;
            const exactChargeState = filters.charge_state as string | undefined;
            const rows = [...orders.values()]
              .filter((row) => !allowedStatuses || allowedStatuses.includes(String(row.status)))
              .filter((row) => !allowedChargeStates || allowedChargeStates.includes(String(row.charge_state)))
              .filter((row) => !exactChargeState || row.charge_state === exactChargeState)
              .filter((row) => row.last_error_code !== 'partial_cancel_review_required')
              .slice(0, limitCount);
            return Promise.resolve(resolve({ data: rows, error: null }));
          }
          if (isDueLookup && !updatePatch) {
            const now = Date.now();
            const due = subscriptions
              .filter((row) => row.status === 'active' && row.cancel_at_period_end === false)
              .filter((row) => !Object.prototype.hasOwnProperty.call(filters, 'pg_provider') || row.pg_provider === filters.pg_provider)
              .filter((row) => !ors.includes('plan.in.(lite,premium),plan_id.in.(lite,premium)')
                || row.plan === 'lite' || row.plan === 'premium' || row.plan_id === 'lite' || row.plan_id === 'premium')
              .filter((row) => Date.parse(String(row.next_billing_at)) <= now)
              .filter((row) => !row.next_retry_at || Date.parse(String(row.next_retry_at)) <= now)
              .filter((row) => Number(row.renewal_retry_count ?? 0) < Number(filters['lt:renewal_retry_count'] ?? Infinity))
              .filter((row) => !Object.prototype.hasOwnProperty.call(filters, 'not:billing_anchor_day:is') || row.billing_anchor_day != null)
              .sort((a, b) => Date.parse(String(a.next_billing_at)) - Date.parse(String(b.next_billing_at)))
              .slice(0, limitCount);
            return Promise.resolve(resolve({ data: due, error: null }));
          }
          if (updatePatch && table === 'spokedu_master_subscriptions') {
            const row = subscriptions.find((candidate) => candidate.id === filters.id);
            if (row) Object.assign(row, updatePatch);
          }
          if (updatePatch && table === 'spokedu_master_billing_runs') billingRunPatches.push({ ...updatePatch });
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
    billingRunPatches.length = 0;
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
    expect(calculateRenewalRetryAt(1, now)).toBe('2026-08-22T04:00:00.000Z');
    expect(calculateRenewalRetryAt(2, now)).toBe('2026-08-22T08:00:00.000Z');
    expect(calculateRenewalRetryAt(3, now)).toBe('2026-08-22T16:00:00.000Z');
    expect(calculateRenewalRetryAt(4, now)).toBe('2026-08-23T00:00:00.000Z');
    expect(calculateRenewalRetryAt(10, now)).toBe('2026-08-23T00:00:00.000Z');
  });

  it('stops automatic retries after five failed attempts without changing access status', async () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const subscription: Row = {
      id: 'retry-terminal', user_id: 'user-terminal', plan: 'premium', plan_id: 'premium',
      status: 'active', current_period_end: dueAt, next_billing_at: dueAt,
      cancel_at_period_end: false, provider_customer_key: null,
      provider_billing_key_secret_id: null, renewal_retry_count: 4,
    };
    installService([subscription], new Map());

    const fifth = await POST(cronRequest());
    expect(fifth.status).toBe(200);
    expect(subscription).toMatchObject({
      status: 'active', renewal_retry_count: 5,
      last_billing_error: 'renewal_configuration_missing', next_retry_at: null,
    });

    const terminal = await POST(cronRequest());
    await expect(terminal.json()).resolves.toMatchObject({ checked: 0, attempted: 0 });
    expect(subscription.status).toBe('active');
  });

  it('excludes manual QA Lite and Premium entitlements from charging and retry mutation', async () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const subscriptions: Row[] = ['lite', 'premium'].map((plan) => ({
      id: `manual-qa-${plan}`,
      user_id: `manual-qa-${plan}-user`,
      plan,
      plan_id: plan,
      status: 'active',
      pg_provider: 'manual_qa',
      current_period_end: dueAt,
      next_billing_at: dueAt,
      cancel_at_period_end: false,
      provider_customer_key: 'must-not-be-used',
      provider_billing_key_secret_id: '11111111-1111-4111-8111-111111111111',
      renewal_retry_count: 0,
      billing_anchor_day: 31,
      entitlement_marker: 'preserved',
    }));
    const before = structuredClone(subscriptions);
    installService(subscriptions, new Map());

    const response = await POST(cronRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ checked: 0, attempted: 0, succeeded: 0, failed: 0, skipped: 0 });
    expect(mocks.readKey).not.toHaveBeenCalled();
    expect(mocks.pay).not.toHaveBeenCalled();
    expect(subscriptions).toEqual(before);
  });

  it.each([2, 5, 20])('allows only one provider charge across %i concurrent workers for one billing cycle', async (workers) => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const subscription: Row = {
      id: 'concurrent-subscription',
      user_id: 'concurrent-user',
      plan: 'premium',
      plan_id: 'premium',
      status: 'active',
      current_period_end: dueAt,
      next_billing_at: dueAt,
      cancel_at_period_end: false,
      provider_customer_key: 'concurrent-customer',
      provider_billing_key_secret_id: '22222222-2222-4222-8222-222222222222',
      renewal_retry_count: 0,
    };
    const orders = new Map<string, Row>();
    installService([subscription], orders);
    mocks.readKey.mockResolvedValue('concurrent-billing-key');
    let claimed = false;
    mocks.claim.mockImplementation(async () => {
      if (claimed) return { claimed: false, error: null };
      claimed = true;
      return { claimed: true, error: null };
    });
    mocks.pay.mockResolvedValue({ paymentKey: 'concurrent-payment-key', approvedAt: dueAt });
    mocks.applyPayment.mockImplementation(async () => {
      subscription.next_billing_at = new Date(Date.now() + 30 * 86400_000).toISOString();
      return { ok: true, alreadyApplied: false, plan: 'premium', periodEnd: subscription.next_billing_at };
    });

    const responses = await Promise.all(Array.from({ length: workers }, () => POST(cronRequest())));

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(mocks.pay).toHaveBeenCalledTimes(1);
    expect(mocks.applyPayment).toHaveBeenCalledTimes(1);
    expect(orders.size).toBe(1);
  });

  it.each([50, 100])('drains %i virtual due subscriptions in bounded batches without omissions', async (total) => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const subscriptions: Row[] = Array.from({ length: total }, (_, index) => ({
      id: `batch-${index}`,
      user_id: `batch-user-${index}`,
      plan: index % 2 === 0 ? 'lite' : 'premium',
      plan_id: index % 2 === 0 ? 'lite' : 'premium',
      status: 'active',
      current_period_end: dueAt,
      next_billing_at: dueAt,
      cancel_at_period_end: false,
      provider_customer_key: `customer-${index}`,
      provider_billing_key_secret_id: `secret-${index}`,
      renewal_retry_count: 0,
    }));
    const orders = new Map<string, Row>();
    installService(subscriptions, orders);
    mocks.readKey.mockResolvedValue('batch-billing-key');
    mocks.claim.mockResolvedValue({ claimed: true, error: null });
    mocks.pay.mockImplementation(async ({ orderId, amount }: { orderId: string; amount: number }) => ({
      paymentKey: `payment-${orderId}`,
      orderId,
      totalAmount: amount,
      approvedAt: dueAt,
    }));
    mocks.applyPayment.mockImplementation(async ({ userId }: { userId: string }) => {
      const subscription = subscriptions.find((row) => row.user_id === userId);
      if (subscription) subscription.next_billing_at = new Date(Date.now() + 30 * 86400_000).toISOString();
      return { ok: true, alreadyApplied: false, plan: subscription?.plan, periodEnd: subscription?.next_billing_at };
    });

    const batchCounts: number[] = [];
    for (let batch = 0; batch < Math.ceil(total / 20); batch += 1) {
      const response = await POST(cronRequest());
      const body = await response.json() as { checked: number; succeeded: number };
      expect(response.status).toBe(200);
      expect(body.succeeded).toBe(body.checked);
      batchCounts.push(body.checked);
    }

    expect(batchCounts).toEqual(Array.from(
      { length: Math.ceil(total / 20) },
      (_, index) => Math.min(20, total - index * 20),
    ));
    expect(mocks.pay).toHaveBeenCalledTimes(total);
    expect(mocks.applyPayment).toHaveBeenCalledTimes(total);
    expect(orders.size).toBe(total);
    expect(subscriptions.every((row) => Date.parse(String(row.next_billing_at)) > Date.now())).toBe(true);
  });

  it.each([
    ['inactive subscription', 'cancelled', 0, '2099-01-01T00:00:00.000Z'],
    ['retry exhausted', 'active', 5, '2020-01-01T00:00:00.000Z'],
    ['billing date changed', 'active', 0, '2099-01-01T00:00:00.000Z'],
    ['stale processing lease', 'active', 0, '2020-01-01T00:00:00.000Z'],
  ])('recovers a provider-confirmed renewal independently of due-subscription filters: %s', async (
    _label,
    subscriptionStatus,
    retryCount,
    nextBillingAt,
  ) => {
    const cycleKey = '11111111-1111-4111-8111-111111111111:20261001';
    const orderId = 'spm-premium-renewal-recovery';
    const orders = new Map<string, Row>([[orderId, {
      order_id: orderId,
      user_id: 'recovery-user',
      plan: 'premium',
      amount: 28900,
      status: 'processing',
      payment_key: 'provider-confirmed-key',
      billing_cycle_key: cycleKey,
      applied_at: null,
      charge_state: 'approved_unapplied',
      recovery_lookup_attempts: 0,
      billing_anchor_day: 1,
      updated_at: '2020-01-01T00:00:00.000Z',
    }]]);
    const subscriptions: Row[] = [{
      id: '11111111-1111-4111-8111-111111111111',
      user_id: 'recovery-user',
      plan: 'premium',
      plan_id: 'premium',
      status: subscriptionStatus,
      current_period_end: '2026-10-01T00:00:00.000Z',
      next_billing_at: nextBillingAt,
      cancel_at_period_end: false,
      provider_customer_key: 'customer-recovery',
      provider_billing_key_secret_id: 'secret-recovery',
      renewal_retry_count: retryCount,
    }];
    installService(subscriptions, orders);
    mocks.claim.mockResolvedValue({ claimed: true, error: null });
    mocks.findPayment.mockResolvedValue({
      paymentKey: 'provider-confirmed-key',
      orderId,
      totalAmount: 28900,
      approvedAt: '2026-10-01T00:00:00.000Z',
    });
    mocks.applyPayment.mockResolvedValue({
      ok: true,
      alreadyApplied: false,
      plan: 'premium',
      periodEnd: '2026-11-01T00:00:00.000Z',
    });

    const response = await POST(cronRequest());

    expect(response.status).toBe(200);
    expect(mocks.findPayment).toHaveBeenCalledWith({ orderId, amount: 28900 });
    expect(mocks.applyPayment).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'recovery-user',
      orderId,
      paymentKey: 'provider-confirmed-key',
      billingCycleKey: cycleKey,
      source: 'renewal',
    }));
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('does not auto-recover partial-cancel review or provider payment-key conflicts', async () => {
    const partialOrderId = 'spm-premium-partial-review';
    const conflictOrderId = 'spm-premium-key-conflict';
    const orders = new Map<string, Row>([
      [partialOrderId, {
        order_id: partialOrderId, user_id: 'partial-user', plan: 'premium', amount: 28900,
        status: 'recoverable_failed', payment_key: 'partial-key',
        billing_cycle_key: '11111111-1111-4111-8111-111111111111:20261001',
        last_error_code: 'partial_cancel_review_required',
        charge_state: 'review_required',
      }],
      [conflictOrderId, {
        order_id: conflictOrderId, user_id: 'conflict-user', plan: 'premium', amount: 28900,
        status: 'recoverable_failed', payment_key: 'ledger-key',
        billing_cycle_key: '22222222-2222-4222-8222-222222222222:20261001',
        charge_state: 'approved_unapplied', billing_anchor_day: 1,
      }],
    ]);
    installService([], orders);
    mocks.claim.mockResolvedValue({ claimed: true, error: null });
    mocks.findPayment.mockResolvedValue({
      paymentKey: 'different-provider-key',
      orderId: conflictOrderId,
      totalAmount: 28900,
      approvedAt: '2026-10-01T00:00:00.000Z',
    });

    const response = await POST(cronRequest());

    expect(response.status).toBe(200);
    expect(mocks.findPayment).toHaveBeenCalledTimes(1);
    expect(mocks.applyPayment).not.toHaveBeenCalled();
    expect(mocks.pay).not.toHaveBeenCalled();
    expect(orders.get(partialOrderId)?.last_error_code).toBe('partial_cancel_review_required');
    expect(mocks.markFailed).toHaveBeenCalledWith(expect.objectContaining({
      orderId: conflictOrderId,
      lastErrorCode: 'renewal_recovery_payment_key_conflict',
      paymentKey: 'ledger-key',
      recoverable: true,
    }));
  });

  it('never charges an existing ledger order when provider lookup has no match', async () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const subscription: Row = {
      id: '11111111-1111-4111-8111-111111111111',
      user_id: 'user-existing-order',
      plan: 'premium',
      plan_id: 'premium',
      status: 'active',
      current_period_end: dueAt,
      next_billing_at: dueAt,
      cancel_at_period_end: false,
      provider_customer_key: 'customer-existing-order',
      provider_billing_key_secret_id: '22222222-2222-4222-8222-222222222222',
      renewal_retry_count: 0,
    };
    const orders = new Map<string, Row>();
    installService([subscription], orders);
    mocks.readKey.mockResolvedValue('billing-key-existing-order');
    mocks.claim.mockResolvedValue({ claimed: true, error: null });
    mocks.pay.mockResolvedValue({ paymentKey: 'first-payment-key', approvedAt: dueAt });
    mocks.applyPayment.mockResolvedValue({ ok: true, status: 200, code: 'applied' });

    expect((await POST(cronRequest())).status).toBe(200);
    expect(mocks.pay).toHaveBeenCalledTimes(1);

    mocks.pay.mockClear();
    mocks.findPayment.mockResolvedValue(null);
    expect((await POST(cronRequest())).status).toBe(200);
    expect(mocks.findPayment).toHaveBeenCalled();
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('does not recharge an existing unattempted row because only a fresh insert proves no prior attempt', async () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const subscription: Row = {
      id: '33333333-3333-4333-8333-333333333333', user_id: 'user-unattempted',
      plan: 'premium', plan_id: 'premium', status: 'active', current_period_end: dueAt,
      next_billing_at: dueAt, cancel_at_period_end: false,
      provider_customer_key: 'customer-unattempted',
      provider_billing_key_secret_id: '44444444-4444-4444-8444-444444444444',
      renewal_retry_count: 0,
    };
    const orders = new Map<string, Row>();
    installService([subscription], orders);
    mocks.readKey.mockResolvedValue('billing-key-unattempted');
    mocks.claim.mockResolvedValue({ claimed: true, error: null });
    mocks.pay.mockResolvedValue({ paymentKey: 'first-key', approvedAt: dueAt });
    mocks.applyPayment.mockResolvedValue({ ok: true, status: 200, code: 'applied' });
    await POST(cronRequest());
    const order = [...orders.values()][0];
    order.charge_state = 'unattempted';
    order.payment_key = null;
    mocks.pay.mockClear();
    mocks.findPayment.mockResolvedValue(null);

    await POST(cronRequest());
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('does not charge when provider lookup outcome is indeterminate', async () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const subscription: Row = {
      id: '55555555-5555-4555-8555-555555555555', user_id: 'user-unknown',
      plan: 'premium', plan_id: 'premium', status: 'active', current_period_end: dueAt,
      next_billing_at: dueAt, cancel_at_period_end: false,
      provider_customer_key: 'customer-unknown',
      provider_billing_key_secret_id: '66666666-6666-4666-8666-666666666666',
      renewal_retry_count: 0,
    };
    const orders = new Map<string, Row>();
    installService([subscription], orders);
    mocks.readKey.mockResolvedValue('billing-key-unknown');
    mocks.claim.mockResolvedValue({ claimed: true, error: null });
    mocks.pay.mockResolvedValue({ paymentKey: 'initial-key', approvedAt: dueAt });
    mocks.applyPayment.mockResolvedValue({ ok: true, status: 200, code: 'applied' });
    await POST(cronRequest());
    const order = [...orders.values()][0];
    order.charge_state = 'outcome_unknown';
    order.payment_key = null;
    mocks.pay.mockClear();
    mocks.findPayment.mockRejectedValue(new Error('toss_order_lookup_indeterminate:500'));

    await POST(cronRequest());
    expect(mocks.pay).not.toHaveBeenCalled();
    expect(mocks.markFailed).toHaveBeenCalledWith(expect.objectContaining({
      lastErrorCode: 'renewal_payment_exception',
      recoverable: true,
    }));
  });

  it('moves an uncertain provider order to operator review after three bounded 404 lookups without recharging', async () => {
    const orderId = 'spm-premium-renewal-uncertain';
    const orders = new Map<string, Row>([[orderId, {
      order_id: orderId, user_id: 'uncertain-user', plan: 'premium', amount: 28900,
      status: 'recoverable_failed', payment_key: null,
      billing_cycle_key: '77777777-7777-4777-8777-777777777777:20261001',
      billing_anchor_day: 31, charge_state: 'request_started', recovery_lookup_attempts: 0,
      operator_review_required: false, updated_at: '2020-01-01T00:00:00.000Z',
    }]]);
    installService([], orders);
    mocks.findPayment.mockResolvedValue(null);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await POST(cronRequest());
      expect(orders.get(orderId)?.recovery_lookup_attempts).toBe(attempt);
    }
    expect(orders.get(orderId)).toMatchObject({
      charge_state: 'review_required', operator_review_required: true,
    });
    expect(mocks.findPayment).toHaveBeenCalledTimes(3);
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it.each([41, 100])('drains %i approved-unapplied recovery orders before any new charge', async (total) => {
    const orders = new Map<string, Row>(Array.from({ length: total }, (_, index) => {
      const orderId = `spm-premium-renewal-backlog-${index}`;
      return [orderId, {
        order_id: orderId, user_id: `backlog-user-${index}`, plan: 'premium', amount: 28900,
        status: 'recoverable_failed', payment_key: `backlog-key-${index}`,
        billing_cycle_key: `88888888-8888-4888-8888-${String(index).padStart(12, '0')}:20261001`,
        billing_anchor_day: 31, charge_state: 'approved_unapplied', recovery_lookup_attempts: 0,
        operator_review_required: false, updated_at: '2020-01-01T00:00:00.000Z',
      }];
    }));
    installService([], orders);
    mocks.findPayment.mockImplementation(async ({ orderId, amount }: { orderId: string; amount: number }) => ({
      paymentKey: orders.get(orderId)?.payment_key, orderId, totalAmount: amount,
      approvedAt: '2026-10-01T00:00:00.000Z',
    }));
    mocks.applyPayment.mockResolvedValue({ ok: true, alreadyApplied: false, plan: 'premium' });

    for (let batch = 0; batch < Math.ceil(total / 20); batch += 1) await POST(cronRequest());

    expect([...orders.values()].every((order) => order.charge_state === 'applied')).toBe(true);
    expect(mocks.applyPayment).toHaveBeenCalledTimes(total);
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('excludes team fixtures from the renewal charge queue and records a clean run', async () => {
    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const team = {
      id: 'team-qa',
      user_id: 'user-team',
      plan: 'team',
      plan_id: 'team',
      status: 'active',
      current_period_end: dueAt,
      next_billing_at: dueAt,
      cancel_at_period_end: false,
      provider_customer_key: null,
      provider_billing_key_secret_id: null,
      renewal_retry_count: 0,
    };
    installService([team], new Map());
    const response = await POST(new Request('https://example.test/api/spokedu-master/payment/billing/renew', {
      method: 'POST',
      headers: {
        authorization: 'Bearer cron-test-secret',
        'x-spokedu-billing-run-id': '11111111-1111-4111-8111-111111111111',
      },
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      checked: 0,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    });
    expect(mocks.pay).not.toHaveBeenCalled();
    expect(team.renewal_retry_count).toBe(0);
    expect(billingRunPatches.at(-1)).toMatchObject({ status: 'succeeded', error_code: null, skipped: 0 });
  });
});
