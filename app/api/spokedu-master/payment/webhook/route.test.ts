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

          const match = findSubscriptionByPaymentFilter(db, orFilter);
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
      subscription.cancel_at_period_end = true;
      subscription.canceled_at = 'now';
    }
    return { status: 'processed', cancelled: true };
  }
  const existing = db.subscriptions.find((row) => row.toss_order_id === orderId && row.toss_payment_key === paymentKey);
  if (existing && existing.status === 'active') {
    return { status: 'processed', alreadyApplied: true, periodEnd: existing.period_end };
  }
  db.calls.subscriptionUpsert += 1;
  db.subscriptions.push({
    user_id: order.user_id,
    plan: order.plan,
    status: 'active',
    pg_provider: 'tosspayments',
    toss_payment_key: paymentKey,
    toss_order_id: orderId,
    period_start: args.p_period_start,
    period_end: args.p_period_end,
  });
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
    expect(db.subscriptions[0].status).toBe('active');
    expect(db.subscriptions[0].cancel_at_period_end).toBe(true);
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
