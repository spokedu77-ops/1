import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServiceSupabase } = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
}));

import { POST } from './route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORDER_ID = 'spm-premium-initial-202606211200';
const PAYMENT_KEY = 'payment-key-1';
const TRANSMISSION_ID = 'transmission-1';

type TableName =
  | 'spokedu_master_payment_webhook_events'
  | 'spokedu_master_payment_orders'
  | 'spokedu_master_subscriptions';

type MockDb = {
  events: Map<string, Record<string, unknown>>;
  orders: Map<string, Record<string, unknown>>;
  subscriptions: Record<string, unknown>[];
  errors: Partial<Record<string, string>>;
  calls: {
    eventInsert: number;
    subscriptionUpsert: number;
    subscriptionUpdate: number;
    orderUpdate: number;
    rpc: number;
  };
};

function createMockDb(): MockDb {
  const db: MockDb = {
    events: new Map(),
    orders: new Map([
      [
        ORDER_ID,
        {
          order_id: ORDER_ID,
          user_id: USER_ID,
          plan: 'premium',
          amount: 28900,
          status: 'pending',
        },
      ],
    ]),
    subscriptions: [],
    errors: {},
    calls: {
      eventInsert: 0,
      subscriptionUpsert: 0,
      subscriptionUpdate: 0,
      orderUpdate: 0,
      rpc: 0,
    },
  };
  return db;
}

function installMockSupabase(db: MockDb) {
  getServiceSupabase.mockReturnValue({
    async rpc(name: string, args: Record<string, unknown>) {
      db.calls.rpc += 1;
      if (name !== 'spokedu_master_apply_payment') {
        return { data: null, error: { message: 'unknown rpc' } };
      }
      if (db.errors.rpc) return { data: null, error: { message: db.errors.rpc } };
      return { data: applyPaymentRpc(db, args), error: null };
    },
    from(table: TableName) {
      const filters: Record<string, unknown> = {};
      let orFilter = '';
      let updatePayload: Record<string, unknown> | null = null;

      const query = {
        select() {
          return query;
        },
        eq(column: string, value: unknown) {
          filters[column] = value;
          return query;
        },
        or(value: string) {
          orFilter = value;
          return query;
        },
        async maybeSingle() {
          const errorKey = `${table}:maybeSingle`;
          if (db.errors[errorKey]) return { data: null, error: { message: db.errors[errorKey] } };

          if (table === 'spokedu_master_payment_webhook_events') {
            return {
              data: db.events.get(String(filters.event_key)) ?? null,
              error: null,
            };
          }

          if (table === 'spokedu_master_payment_orders') {
            return {
              data: db.orders.get(String(filters.order_id)) ?? null,
              error: null,
            };
          }

          const match = filters.user_id
            ? db.subscriptions.find((row) => row.user_id === filters.user_id)
            : findSubscriptionByPaymentFilter(db, orFilter);
          return { data: match ?? null, error: null };
        },
        async insert(payload: Record<string, unknown>) {
          if (table !== 'spokedu_master_payment_webhook_events') {
            return { error: null };
          }
          db.calls.eventInsert += 1;
          const key = String(payload.event_key);
          if (db.events.has(key)) return { error: { code: '23505', message: 'duplicate' } };
          db.events.set(key, payload);
          return { error: db.errors.eventInsert ? { message: db.errors.eventInsert } : null };
        },
        async upsert(payload: Record<string, unknown>) {
          if (table === 'spokedu_master_subscriptions') {
            db.calls.subscriptionUpsert += 1;
            if (db.errors.subscriptionUpsert) return { error: { message: db.errors.subscriptionUpsert } };
            const index = db.subscriptions.findIndex((row) => row.user_id === payload.user_id);
            if (index >= 0) db.subscriptions[index] = { ...db.subscriptions[index], ...payload };
            else db.subscriptions.push(payload);
          }
          return { error: null };
        },
        update(payload: Record<string, unknown>) {
          updatePayload = payload;
          return query;
        },
        async then(resolve: (value: { error: { message: string } | null }) => unknown) {
          if (!updatePayload) return resolve({ error: null });

          if (table === 'spokedu_master_payment_orders') {
            db.calls.orderUpdate += 1;
            if (db.errors.orderUpdate) return resolve({ error: { message: db.errors.orderUpdate } });
            const orderId = String(filters.order_id);
            const current = db.orders.get(orderId);
            if (current) db.orders.set(orderId, { ...current, ...updatePayload });
          }

          if (table === 'spokedu_master_subscriptions') {
            db.calls.subscriptionUpdate += 1;
            if (db.errors.subscriptionUpdate) {
              return resolve({ error: { message: db.errors.subscriptionUpdate } });
            }
            for (const row of db.subscriptions) {
              if (subscriptionMatchesFilter(row, orFilter)) Object.assign(row, updatePayload);
            }
          }

          return resolve({ error: null });
        },
      };

      return query;
    },
  });
}

function applyPaymentRpc(db: MockDb, args: Record<string, unknown>) {
  const orderId = String(args.p_order_id);
  const paymentKey = String(args.p_payment_key);
  const source = String(args.p_source);
  const eventKey = String(args.p_event_key);
  const order = db.orders.get(orderId);
  if (!order) return { status: 'rejected', reason: 'order_not_found' };
  if (order.payment_key && order.payment_key !== paymentKey) {
    return { status: 'rejected', reason: 'payment_key_conflict' };
  }
  db.calls.eventInsert += 1;
  db.events.set(eventKey, {
    event_key: eventKey,
    event_type: source,
    payment_key: paymentKey,
    order_id: orderId,
    status: source === 'partial_cancel_review_required' ? 'ignored' : 'processed',
  });
  if (source === 'partial_cancel_review_required') {
    return { status: 'ignored', reason: 'partial_cancel_review_required' };
  }
  if (source === 'cancel') {
    db.calls.orderUpdate += 1;
    db.orders.set(orderId, { ...order, status: 'cancelled', payment_key: paymentKey });
    const subscription = db.subscriptions.find((row) => row.toss_order_id === orderId && row.toss_payment_key === paymentKey);
    if (subscription) {
      db.calls.subscriptionUpdate += 1;
      subscription.status = 'cancelled';
      subscription.period_end = 'now';
      subscription.current_period_end = 'now';
      subscription.next_billing_at = null;
      subscription.cancel_at_period_end = false;
      subscription.canceled_at = 'now';
    }
    return { status: 'processed', cancelled: Boolean(subscription), reason: subscription ? null : 'historical_payment_cancelled' };
  }
  const existing = db.subscriptions.find((row) => row.toss_order_id === orderId && row.toss_payment_key === paymentKey);
  if (existing && existing.status === 'active') {
    return { status: 'processed', alreadyApplied: true, periodEnd: existing.period_end };
  }
  db.calls.subscriptionUpsert += 1;
  const nextSubscription = {
    user_id: order.user_id,
    plan: order.plan,
    status: 'active',
    pg_provider: 'tosspayments',
    toss_payment_key: paymentKey,
    toss_order_id: orderId,
    period_start: args.p_period_start,
    period_end: args.p_period_end,
    current_period_start: args.p_period_start,
    current_period_end: args.p_period_end,
    next_billing_at: args.p_next_billing_at,
    current_amount: order.amount,
    cancel_at_period_end: false,
    provider_customer_key: args.p_provider_customer_key,
    provider_billing_key_secret_id: args.p_provider_billing_key_secret_id,
    pending_billing_key_secret_id: null,
  };
  const existingUserIndex = db.subscriptions.findIndex((row) => row.user_id === order.user_id);
  if (existingUserIndex >= 0) db.subscriptions[existingUserIndex] = { ...db.subscriptions[existingUserIndex], ...nextSubscription };
  else db.subscriptions.push(nextSubscription);
  db.calls.orderUpdate += 1;
  db.orders.set(orderId, { ...order, status: 'active', payment_key: paymentKey });
  return { status: 'processed', alreadyApplied: false, periodEnd: args.p_period_end };
}

function subscriptionMatchesFilter(row: Record<string, unknown>, filter: string) {
  return filter
    .split(',')
    .some((part) => {
      const [column, op, value] = part.split('.');
      return op === 'eq' && row[column] === value;
    });
}

function findSubscriptionByPaymentFilter(db: MockDb, filter: string) {
  return db.subscriptions.find((row) => subscriptionMatchesFilter(row, filter)) ?? null;
}

function paymentResponse(overrides: Record<string, unknown> = {}) {
  return {
    paymentKey: PAYMENT_KEY,
    orderId: ORDER_ID,
    status: 'DONE',
    totalAmount: 28900,
    balanceAmount: 28900,
    currency: 'KRW',
    approvedAt: '2026-06-21T12:00:00+09:00',
    lastTransactionKey: 'transaction-1',
    ...overrides,
  };
}

function webhookRequest(body: Record<string, unknown>, transmissionId = TRANSMISSION_ID) {
  return new Request('https://example.test/api/spokedu-master/payment/webhook', {
    method: 'POST',
    headers: transmissionId
      ? { 'tosspayments-webhook-transmission-id': transmissionId }
      : undefined,
    body: JSON.stringify(body),
  });
}

describe('SPOKEDU MASTER payment webhook', () => {
  let db: MockDb;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.TOSS_SECRET_KEY = 'test_secret';
    db = createMockDb();
    installMockSupabase(db);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse()), { status: 200 })));
  });

  it('blocks an unverified webhook before changing subscription state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'not found' }), { status: 404 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Payment verification failed' });
    expect(db.calls.subscriptionUpsert).toBe(0);
    expect(db.calls.eventInsert).toBe(0);
  });

  it('uses the official transmission id header as the event key', async () => {
    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      createdAt: '2026-06-21T12:00:01+09:00',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      status: 'processed',
      alreadyApplied: false,
    });
    expect(db.calls.subscriptionUpsert).toBe(1);
    expect(db.subscriptions[0]).toMatchObject({
      user_id: USER_ID,
      plan: 'premium',
      status: 'active',
      pg_provider: 'tosspayments',
      toss_payment_key: PAYMENT_KEY,
      toss_order_id: ORDER_ID,
    });
    expect(db.subscriptions[0].period_end).toBe('2026-07-21T03:00:00.000Z');
    expect(db.events.get(TRANSMISSION_ID)).toMatchObject({
      event_key: TRANSMISSION_ID,
      event_type: 'webhook',
      payment_key: PAYMENT_KEY,
      order_id: ORDER_ID,
      status: 'processed',
    });
  });

  it('activates a new Lite payment with the same requested, order, and applied amount', async () => {
    const liteOrderId = 'spm-lite-initial-new-payment';
    const litePaymentKey = 'payment-key-lite-new';
    db.orders.clear();
    db.orders.set(liteOrderId, {
      order_id: liteOrderId,
      user_id: USER_ID,
      plan: 'lite',
      amount: 9900,
      status: 'pending',
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: litePaymentKey,
      orderId: liteOrderId,
      totalAmount: 9900,
      balanceAmount: 9900,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: litePaymentKey, orderId: liteOrderId, status: 'DONE' },
    }, 'lite-new-transmission'));

    expect(response.status).toBe(200);
    expect(db.orders.get(liteOrderId)).toMatchObject({ amount: 9900, status: 'active' });
    expect(db.subscriptions[0]).toMatchObject({
      plan: 'lite',
      status: 'active',
      current_amount: 9900,
      toss_order_id: liteOrderId,
      toss_payment_key: litePaymentKey,
    });
  });

  it('promotes a pending Billing Key when webhook recovery applies the charged order first', async () => {
    const pendingSecretId = '22222222-2222-4222-8222-222222222222';
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'lite',
      status: 'pending',
      period_end: null,
      pending_billing_key_secret_id: pendingSecretId,
      provider_billing_key_secret_id: null,
    });

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }, 'webhook-apply-recovery'));

    expect(response.status).toBe(200);
    expect(db.subscriptions).toHaveLength(1);
    expect(db.subscriptions[0]).toMatchObject({
      status: 'active',
      plan: 'premium',
      provider_customer_key: `spm_${USER_ID.replaceAll('-', '')}`,
      provider_billing_key_secret_id: pendingSecretId,
      pending_billing_key_secret_id: null,
    });
  });

  it('starts a fresh Premium month only for a full-price Premium order, not Lite proration upgrades', async () => {
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'lite',
      status: 'active',
      period_start: '2026-06-01T00:00:00.000Z',
      period_end: '2026-07-01T00:00:00.000Z',
      current_period_end: '2026-07-01T00:00:00.000Z',
      current_amount: 9900,
      toss_order_id: 'spm-lite-initial-old',
      toss_payment_key: 'payment-lite-old',
      cancel_at_period_end: false,
    });

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }, 'premium-upgrade-transmission'));

    expect(response.status).toBe(200);
    expect(db.orders.get(ORDER_ID)).toMatchObject({ amount: 28900, status: 'active' });
    expect(db.subscriptions).toHaveLength(1);
    expect(db.subscriptions[0]).toMatchObject({
      plan: 'premium',
      status: 'active',
      current_amount: 28900,
      period_start: '2026-06-21T03:00:00.000Z',
      period_end: '2026-07-21T03:00:00.000Z',
      toss_order_id: ORDER_ID,
      toss_payment_key: PAYMENT_KEY,
    });
  });

  it('does not re-apply a duplicate transmission id', async () => {
    db.events.set(TRANSMISSION_ID, { event_key: TRANSMISSION_ID });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.calls.subscriptionUpsert).toBe(0);
    expect(db.calls.eventInsert).toBe(0);
  });

  it('falls back to a deterministic key only when the transmission header is absent', async () => {
    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }, ''));

    expect(response.status).toBe(200);
    expect(db.events.get('PAYMENT_STATUS_CHANGED:payment-key-1:transaction-1')).toMatchObject({
      event_type: 'webhook',
      payment_key: PAYMENT_KEY,
    });
  });

  it('keeps access fields stable when the payment was already confirmed', async () => {
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'premium',
      status: 'active',
      period_end: '2026-07-21T03:00:00.000Z',
      toss_payment_key: PAYMENT_KEY,
      toss_order_id: ORDER_ID,
    });

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      createdAt: '2026-06-21T12:00:01+09:00',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      alreadyApplied: true,
      periodEnd: '2026-07-21T03:00:00.000Z',
    });
    expect(db.calls.subscriptionUpsert).toBe(0);
    expect(db.subscriptions[0]).toMatchObject({
      plan: 'premium',
      status: 'active',
      period_end: '2026-07-21T03:00:00.000Z',
    });
  });

  it('blocks a verified payment when the stored order amount differs from Toss totalAmount', async () => {
    db.orders.set(ORDER_ID, {
      order_id: ORDER_ID,
      user_id: USER_ID,
      plan: 'premium',
      amount: 9900,
      status: 'pending',
    });

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Payment verification failed' });
    expect(db.calls.subscriptionUpsert).toBe(0);
    expect(db.calls.eventInsert).toBe(0);
  });

  it('blocks mismatched orderId or paymentKey before subscription changes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      orderId: 'spm-premium-initial-999999999999',
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }));

    expect(response.status).toBe(401);
    expect(db.calls.subscriptionUpsert).toBe(0);
    expect(db.calls.eventInsert).toBe(0);
  });

  it('cancels access only for a verified full cancel event', async () => {
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'premium',
      status: 'active',
      period_end: '2026-07-21T03:00:00.000Z',
      toss_payment_key: PAYMENT_KEY,
      toss_order_id: ORDER_ID,
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      status: 'CANCELED',
      balanceAmount: 0,
      lastTransactionKey: 'cancel-1',
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'CANCEL_STATUS_CHANGED',
      createdAt: '2026-06-21T12:00:01+09:00',
      data: {
        transactionKey: 'cancel-1',
        cancelStatus: 'DONE',
        paymentKey: PAYMENT_KEY,
        orderId: ORDER_ID,
      },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      status: 'processed',
      cancelled: true,
    });
    expect(db.calls.subscriptionUpdate).toBe(1);
    expect(db.subscriptions[0].status).toBe('cancelled');
    expect(db.subscriptions[0].cancel_at_period_end).toBe(false);
  });

  it('keeps the current Premium period unchanged when an older Lite payment is fully cancelled', async () => {
    const liteOrderId = 'spm-lite-initial-older-payment';
    const litePaymentKey = 'payment-key-lite-old';
    db.orders.set(liteOrderId, {
      order_id: liteOrderId,
      user_id: USER_ID,
      plan: 'lite',
      amount: 9900,
      status: 'active',
      payment_key: litePaymentKey,
    });
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'premium',
      status: 'active',
      period_end: '2026-08-21T03:00:00.000Z',
      current_period_end: '2026-08-21T03:00:00.000Z',
      cancel_at_period_end: false,
      toss_payment_key: PAYMENT_KEY,
      toss_order_id: ORDER_ID,
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: litePaymentKey,
      orderId: liteOrderId,
      status: 'CANCELED',
      totalAmount: 9900,
      balanceAmount: 0,
      lastTransactionKey: 'cancel-old-lite',
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'CANCEL_STATUS_CHANGED',
      data: { paymentKey: litePaymentKey, orderId: liteOrderId },
    }, 'cancel-old-lite-transmission'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      status: 'processed',
      cancelled: false,
      reason: 'historical_payment_cancelled',
    });
    expect(db.orders.get(liteOrderId)?.status).toBe('cancelled');
    expect(db.subscriptions[0]).toMatchObject({
      plan: 'premium',
      status: 'active',
      period_end: '2026-08-21T03:00:00.000Z',
      current_period_end: '2026-08-21T03:00:00.000Z',
      cancel_at_period_end: false,
      toss_payment_key: PAYMENT_KEY,
      toss_order_id: ORDER_ID,
    });
  });

  it('keeps access for a partial cancel until policy is decided', async () => {
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'premium',
      status: 'active',
      period_end: '2026-07-21T03:00:00.000Z',
      toss_payment_key: PAYMENT_KEY,
      toss_order_id: ORDER_ID,
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      status: 'PARTIAL_CANCELED',
      balanceAmount: 10000,
      lastTransactionKey: 'partial-cancel-1',
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'CANCEL_STATUS_CHANGED',
      data: {
        transactionKey: 'partial-cancel-1',
        cancelStatus: 'DONE',
        paymentKey: PAYMENT_KEY,
        orderId: ORDER_ID,
      },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      status: 'ignored',
      reason: 'partial_cancel_review_required',
    });
    expect(db.calls.subscriptionUpdate).toBe(0);
    expect(db.subscriptions[0].status).toBe('active');
  });

  it('does not treat a CANCEL_STATUS_CHANGED Cancel object as a Payment object', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(webhookRequest({
      eventType: 'CANCEL_STATUS_CHANGED',
      data: {
        transactionKey: 'cancel-only-1',
        cancelAmount: 28900,
        cancelStatus: 'DONE',
      },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true,
      status: 'ignored',
      reason: 'cancel_payload_without_payment_key',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.calls.subscriptionUpdate).toBe(0);
  });

  it('ignores unknown events without touching Toss or the database', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    getServiceSupabase.mockClear();

    const response = await POST(webhookRequest({
      eventType: 'METHOD_UPDATED',
      data: { paymentKey: PAYMENT_KEY },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, ignored: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it('activates a new Premium payment at list price', async () => {
    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }, 'premium-initial-transmission'));

    expect(response.status).toBe(200);
    expect(db.orders.get(ORDER_ID)).toMatchObject({ amount: 28900, status: 'active' });
    expect(db.subscriptions[0]).toMatchObject({ plan: 'premium', status: 'active', current_amount: 28900 });
  });

  it('renews Lite at list price from a renewal order', async () => {
    const renewalOrderId = 'spm-lite-renewal-sub-20261001';
    db.orders.clear();
    db.orders.set(renewalOrderId, {
      order_id: renewalOrderId,
      user_id: USER_ID,
      plan: 'lite',
      amount: 9900,
      status: 'pending',
      billing_cycle_key: 'sub-id:20261001',
    });
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'lite',
      status: 'active',
      current_period_end: '2026-10-01T00:00:00.000Z',
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: 'lite-renew-key',
      orderId: renewalOrderId,
      totalAmount: 9900,
      balanceAmount: 9900,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: 'lite-renew-key', orderId: renewalOrderId, status: 'DONE' },
    }, 'lite-renew-transmission'));

    expect(response.status).toBe(200);
    expect(db.subscriptions).toHaveLength(1);
    expect(db.subscriptions[0]).toMatchObject({ plan: 'lite', status: 'active', toss_order_id: renewalOrderId });
  });

  it('renews Premium at list price from a renewal order', async () => {
    const renewalOrderId = 'spm-premium-renewal-sub-20261001';
    db.orders.clear();
    db.orders.set(renewalOrderId, {
      order_id: renewalOrderId,
      user_id: USER_ID,
      plan: 'premium',
      amount: 28900,
      status: 'pending',
      billing_cycle_key: 'sub-id:20261001',
    });
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'premium',
      status: 'active',
      current_period_end: '2026-10-01T00:00:00.000Z',
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: 'premium-renew-key',
      orderId: renewalOrderId,
      totalAmount: 28900,
      balanceAmount: 28900,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: 'premium-renew-key', orderId: renewalOrderId, status: 'DONE' },
    }, 'premium-renew-transmission'));

    expect(response.status).toBe(200);
    expect(db.subscriptions).toHaveLength(1);
    expect(db.subscriptions[0]).toMatchObject({ plan: 'premium', toss_order_id: renewalOrderId, current_amount: 28900 });
  });

  it('recovers a Lite to Premium prorated upgrade independently of billing/issue', async () => {
    const upgradeOrderId = 'spm-premium-initial-upgrade-1';
    const upgradeKey = `upgrade:${USER_ID}:premium:2026-07-01T00:00:00.000Z`;
    db.orders.clear();
    db.orders.set(upgradeOrderId, {
      order_id: upgradeOrderId,
      user_id: USER_ID,
      plan: 'premium',
      amount: 9500,
      status: 'pending',
      billing_cycle_key: upgradeKey,
    });
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'lite',
      status: 'active',
      period_start: '2026-06-01T00:00:00.000Z',
      period_end: '2026-07-01T00:00:00.000Z',
      current_period_start: '2026-06-01T00:00:00.000Z',
      current_period_end: '2026-07-01T00:00:00.000Z',
      current_amount: 9900,
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: 'upgrade-payment-key',
      orderId: upgradeOrderId,
      totalAmount: 9500,
      balanceAmount: 9500,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: 'upgrade-payment-key', orderId: upgradeOrderId, status: 'DONE' },
    }, 'upgrade-proration-transmission'));

    expect(response.status).toBe(200);
    expect(db.orders.get(upgradeOrderId)).toMatchObject({ amount: 9500, status: 'active' });
    expect(db.subscriptions).toHaveLength(1);
    expect(db.subscriptions[0]).toMatchObject({
      plan: 'premium',
      status: 'active',
      current_amount: 9500,
      period_start: '2026-06-01T00:00:00.000Z',
      period_end: '2026-07-01T00:00:00.000Z',
      toss_order_id: upgradeOrderId,
      toss_payment_key: 'upgrade-payment-key',
    });
  });

  it('rejects an upgrade webhook when Toss totalAmount does not match the stored order amount', async () => {
    const upgradeOrderId = 'spm-premium-initial-upgrade-mismatch';
    db.orders.clear();
    db.orders.set(upgradeOrderId, {
      order_id: upgradeOrderId,
      user_id: USER_ID,
      plan: 'premium',
      amount: 9500,
      status: 'pending',
      billing_cycle_key: `upgrade:${USER_ID}:premium:2026-07-01T00:00:00.000Z`,
    });
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'lite',
      status: 'active',
      current_period_start: '2026-06-01T00:00:00.000Z',
      current_period_end: '2026-07-01T00:00:00.000Z',
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: 'upgrade-mismatch-key',
      orderId: upgradeOrderId,
      totalAmount: 28900,
      balanceAmount: 28900,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: 'upgrade-mismatch-key', orderId: upgradeOrderId, status: 'DONE' },
    }, 'upgrade-amount-mismatch'));

    expect(response.status).toBe(400);
    expect(db.calls.subscriptionUpsert).toBe(0);
  });

  it('rejects an upgrade cycle key when the stored plan is not premium', async () => {
    const orderId = 'spm-lite-initial-not-premium-upgrade';
    db.orders.clear();
    db.orders.set(orderId, {
      order_id: orderId,
      user_id: USER_ID,
      plan: 'lite',
      amount: 9500,
      status: 'pending',
      billing_cycle_key: `upgrade:${USER_ID}:premium:2026-07-01T00:00:00.000Z`,
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: 'lite-upgrade-key',
      orderId,
      totalAmount: 9500,
      balanceAmount: 9500,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: 'lite-upgrade-key', orderId, status: 'DONE' },
    }, 'upgrade-wrong-plan'));

    expect(response.status).toBe(400);
    expect(db.calls.subscriptionUpsert).toBe(0);
  });

  it('rejects an upgrade amount of zero', async () => {
    const orderId = 'spm-premium-initial-upgrade-zero';
    db.orders.clear();
    db.orders.set(orderId, {
      order_id: orderId,
      user_id: USER_ID,
      plan: 'premium',
      amount: 0,
      status: 'pending',
      billing_cycle_key: `upgrade:${USER_ID}:premium:2026-07-01T00:00:00.000Z`,
    });
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'lite',
      status: 'active',
      current_period_start: '2026-06-01T00:00:00.000Z',
      current_period_end: '2026-07-01T00:00:00.000Z',
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: 'upgrade-zero-key',
      orderId,
      totalAmount: 0,
      balanceAmount: 0,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: 'upgrade-zero-key', orderId, status: 'DONE' },
    }, 'upgrade-zero'));

    expect(response.status).toBe(400);
  });

  it('rejects an upgrade amount above the Lite-Premium difference', async () => {
    const orderId = 'spm-premium-initial-upgrade-over';
    db.orders.clear();
    db.orders.set(orderId, {
      order_id: orderId,
      user_id: USER_ID,
      plan: 'premium',
      amount: 19001,
      status: 'pending',
      billing_cycle_key: `upgrade:${USER_ID}:premium:2026-07-01T00:00:00.000Z`,
    });
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'lite',
      status: 'active',
      current_period_start: '2026-06-01T00:00:00.000Z',
      current_period_end: '2026-07-01T00:00:00.000Z',
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: 'upgrade-over-key',
      orderId,
      totalAmount: 19001,
      balanceAmount: 19001,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: 'upgrade-over-key', orderId, status: 'DONE' },
    }, 'upgrade-over'));

    expect(response.status).toBe(400);
  });

  it('rejects an initial Premium order that is not the catalog list price', async () => {
    db.orders.set(ORDER_ID, {
      order_id: ORDER_ID,
      user_id: USER_ID,
      plan: 'premium',
      amount: 15000,
      status: 'pending',
      billing_cycle_key: `initial:${USER_ID}:premium`,
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      totalAmount: 15000,
      balanceAmount: 15000,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }, 'initial-not-list-price'));

    expect(response.status).toBe(400);
    expect(db.calls.subscriptionUpsert).toBe(0);
  });

  it('does not extend the period again when the same upgrade payment is already applied', async () => {
    const upgradeOrderId = 'spm-premium-initial-upgrade-applied';
    const upgradeKey = `upgrade:${USER_ID}:premium:2026-07-01T00:00:00.000Z`;
    db.orders.clear();
    db.orders.set(upgradeOrderId, {
      order_id: upgradeOrderId,
      user_id: USER_ID,
      plan: 'premium',
      amount: 9500,
      status: 'active',
      payment_key: 'upgrade-payment-key',
      billing_cycle_key: upgradeKey,
    });
    db.subscriptions.push({
      user_id: USER_ID,
      plan: 'premium',
      status: 'active',
      period_end: '2026-07-01T00:00:00.000Z',
      current_period_start: '2026-06-01T00:00:00.000Z',
      current_period_end: '2026-07-01T00:00:00.000Z',
      toss_order_id: upgradeOrderId,
      toss_payment_key: 'upgrade-payment-key',
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(paymentResponse({
      paymentKey: 'upgrade-payment-key',
      orderId: upgradeOrderId,
      totalAmount: 9500,
      balanceAmount: 9500,
    })), { status: 200 })));

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: 'upgrade-payment-key', orderId: upgradeOrderId, status: 'DONE' },
    }, 'upgrade-already-applied'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ alreadyApplied: true, periodEnd: '2026-07-01T00:00:00.000Z' });
    expect(db.calls.subscriptionUpsert).toBe(0);
    expect(db.subscriptions).toHaveLength(1);
    expect(db.subscriptions[0].period_end).toBe('2026-07-01T00:00:00.000Z');
  });

  it('returns 500 without leaking internal DB errors', async () => {
    db.errors['spokedu_master_payment_webhook_events:maybeSingle'] = 'raw db failure with details';

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }));

    expect(response.status).toBe(500);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toEqual({ error: 'Webhook processing failed' });
    expect(JSON.stringify(body)).not.toContain('raw db failure');
    expect(JSON.stringify(body)).not.toContain('test_secret');
  });

  it('does not expose secrets when the Toss secret is missing', async () => {
    delete process.env.TOSS_SECRET_KEY;

    const response = await POST(webhookRequest({
      eventType: 'PAYMENT_STATUS_CHANGED',
      data: { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, status: 'DONE' },
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Payment webhook is not configured',
    });
  });
});
