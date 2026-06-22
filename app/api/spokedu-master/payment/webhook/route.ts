import { NextResponse } from 'next/server';
import { hashForMonitoring, reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  isSpokeduMasterPaidPlan,
  parseSpokeduMasterOrderId,
} from '@/app/lib/server/spokeduMasterPayment';

type TossWebhookPayload = {
  eventType?: unknown;
  type?: unknown;
  createdAt?: unknown;
  data?: unknown;
};

type TossPaymentLike = {
  paymentKey?: unknown;
  orderId?: unknown;
  status?: unknown;
  totalAmount?: unknown;
  balanceAmount?: unknown;
  currency?: unknown;
  approvedAt?: unknown;
  lastTransactionKey?: unknown;
  transactionKey?: unknown;
};

type VerifiedTossPayment = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  balanceAmount: number | null;
  currency: string | null;
  approvedAt: string | null;
  transactionKey: string | null;
};

type PaymentOrderRow = {
  user_id: string;
  plan: string;
  amount: number;
};

type SubscriptionRow = {
  period_end: string | null;
};

const SUPPORTED_EVENTS = new Set(['PAYMENT_STATUS_CHANGED', 'CANCEL_STATUS_CHANGED']);
const TRANSMISSION_ID_HEADER = 'tosspayments-webhook-transmission-id';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getWebhookData(payload: TossWebhookPayload): Record<string, unknown> | null {
  if (isRecord(payload.data)) return payload.data;
  return null;
}

function buildTossAuthorization(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

async function verifyTossPayment(
  paymentKey: string,
  expected: TossPaymentLike,
  options: { expectedStatus?: string | null } = {},
): Promise<VerifiedTossPayment | null> {
  const tossSecretKey = process.env.TOSS_SECRET_KEY?.trim();
  if (!tossSecretKey) {
    throw new Error('TOSS_SECRET_KEY_NOT_CONFIGURED');
  }

  const response = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
    {
      headers: {
        Authorization: buildTossAuthorization(tossSecretKey),
      },
    },
  );

  if (!response.ok) return null;

  const payment = await response.json() as TossPaymentLike;
  const verifiedPaymentKey = readString(payment.paymentKey);
  const orderId = readString(payment.orderId);
  const status = readString(payment.status);
  const totalAmount = readNumber(payment.totalAmount);
  const balanceAmount = readNumber(payment.balanceAmount);
  const currency = readString(payment.currency);
  const approvedAt = readString(payment.approvedAt);
  const transactionKey =
    readString(payment.lastTransactionKey) ?? readString(payment.transactionKey);

  if (!verifiedPaymentKey || !orderId || !status || totalAmount === null) return null;
  if (verifiedPaymentKey !== paymentKey) return null;
  const expectedOrderId = readString(expected.orderId);
  if (expectedOrderId && expectedOrderId !== orderId) return null;
  if (currency && currency !== 'KRW') return null;
  if (options.expectedStatus && options.expectedStatus !== status) return null;

  return {
    paymentKey: verifiedPaymentKey,
    orderId,
    status,
    totalAmount,
    balanceAmount,
    currency,
    approvedAt,
    transactionKey,
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getPeriodStart(payment: VerifiedTossPayment): Date {
  if (payment.approvedAt) {
    const parsed = Date.parse(payment.approvedAt);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return new Date();
}

function buildFallbackEventKey(eventType: string, payment: VerifiedTossPayment): string {
  // Toss documents the transmission id header for webhook delivery identity.
  // This fallback is only for local tests or legacy manual deliveries without
  // that header; it is deterministic and does not depend on undocumented body ids.
  return [
    eventType,
    payment.paymentKey,
    payment.transactionKey ?? payment.status,
  ].join(':');
}

function applyOrFilter(payment: VerifiedTossPayment) {
  return `toss_payment_key.eq.${payment.paymentKey},toss_order_id.eq.${payment.orderId}`;
}

async function findExistingSubscription(service: ReturnType<typeof getServiceSupabase>, payment: VerifiedTossPayment) {
  const { data, error } = await service
    .from('spokedu_master_subscriptions')
    .select('period_end')
    .or(applyOrFilter(payment))
    .maybeSingle();

  if (error) throw new Error('SUBSCRIPTION_LOOKUP_FAILED');
  return data as SubscriptionRow | null;
}

async function handleDonePayment(
  service: ReturnType<typeof getServiceSupabase>,
  payment: VerifiedTossPayment,
) {
  const existing = await findExistingSubscription(service, payment);
  if (existing) {
    return { status: 'processed' as const, alreadyApplied: true, periodEnd: existing.period_end };
  }

  const { data: order, error: orderError } = await service
    .from('spokedu_master_payment_orders')
    .select('user_id,plan,amount')
    .eq('order_id', payment.orderId)
    .maybeSingle();

  if (orderError) throw new Error('ORDER_LOOKUP_FAILED');
  const orderRow = order as PaymentOrderRow | null;
  if (!orderRow || !isSpokeduMasterPaidPlan(orderRow.plan)) {
    return { status: 'rejected' as const, reason: 'order_not_found' };
  }

  const planFromOrderId = parseSpokeduMasterOrderId(payment.orderId);
  if (planFromOrderId !== orderRow.plan) {
    return { status: 'rejected' as const, reason: 'order_plan_mismatch' };
  }

  const expectedAmount = SPOKEDU_MASTER_PLAN_CONFIG[orderRow.plan].amount;
  if (orderRow.amount !== expectedAmount || payment.totalAmount !== expectedAmount) {
    return { status: 'rejected' as const, reason: 'amount_mismatch' };
  }

  const periodStart = getPeriodStart(payment);
  const periodEnd = addDays(periodStart, 30);
  const { error: subscriptionError } = await service.from('spokedu_master_subscriptions').upsert(
    {
      user_id: orderRow.user_id,
      plan: orderRow.plan,
      status: 'active',
      pg_provider: 'tosspayments',
      toss_payment_key: payment.paymentKey,
      toss_order_id: payment.orderId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (subscriptionError) throw new Error('SUBSCRIPTION_UPSERT_FAILED');

  const { error: orderUpdateError } = await service
    .from('spokedu_master_payment_orders')
    .update({
      status: 'active',
      payment_key: payment.paymentKey,
    })
    .eq('order_id', payment.orderId);

  if (orderUpdateError) throw new Error('ORDER_UPDATE_FAILED');

  return { status: 'processed' as const, alreadyApplied: false, periodEnd: periodEnd.toISOString() };
}

async function handleCanceledPayment(
  service: ReturnType<typeof getServiceSupabase>,
  payment: VerifiedTossPayment,
) {
  if (payment.status === 'PARTIAL_CANCELED') {
    return { status: 'ignored' as const, reason: 'partial_cancel_requires_policy' };
  }

  if (payment.status !== 'CANCELED' || payment.balanceAmount !== 0) {
    return { status: 'ignored' as const, reason: 'not_full_cancel' };
  }

  const { error: subscriptionError } = await service
    .from('spokedu_master_subscriptions')
    .update({ status: 'cancelled' })
    .or(applyOrFilter(payment));

  if (subscriptionError) throw new Error('SUBSCRIPTION_CANCEL_FAILED');

  const { error: orderUpdateError } = await service
    .from('spokedu_master_payment_orders')
    .update({
      status: 'cancelled',
      payment_key: payment.paymentKey,
    })
    .eq('order_id', payment.orderId);

  if (orderUpdateError) throw new Error('ORDER_CANCEL_UPDATE_FAILED');

  return { status: 'processed' as const, cancelled: true };
}

async function recordWebhookEvent(
  service: ReturnType<typeof getServiceSupabase>,
  eventKey: string,
  eventType: string,
  payment: VerifiedTossPayment,
  status: 'processed' | 'ignored',
) {
  const { error } = await service.from('spokedu_master_payment_webhook_events').insert({
    event_key: eventKey,
    event_type: eventType,
    payment_key: payment.paymentKey,
    order_id: payment.orderId,
    status,
  });

  if (error && error.code !== '23505') throw new Error('WEBHOOK_EVENT_INSERT_FAILED');
}

async function lookupWebhookEvent(service: ReturnType<typeof getServiceSupabase>, eventKey: string) {
  const { data, error } = await service
    .from('spokedu_master_payment_webhook_events')
    .select('event_key')
    .eq('event_key', eventKey)
    .maybeSingle();

  if (error) throw new Error('WEBHOOK_EVENT_LOOKUP_FAILED');
  return Boolean(data?.event_key);
}

export async function POST(request: Request) {
  let payload: TossWebhookPayload;
  try {
    payload = await request.json() as TossWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = readString(payload.eventType) ?? readString(payload.type);
  if (!eventType) {
    return NextResponse.json({ error: 'Invalid webhook event' }, { status: 400 });
  }

  if (!SUPPORTED_EVENTS.has(eventType)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const service = getServiceSupabase();
  const transmissionId = readString(request.headers.get(TRANSMISSION_ID_HEADER));
  if (transmissionId) {
    try {
      if (await lookupWebhookEvent(service, transmissionId)) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    } catch (error) {
      await reportError(error, {
        context: 'spokedu_master.payment.webhook',
        tags: {
          provider: 'tosspayments',
          stage: 'event_lookup',
          eventType,
          status: 500,
        },
      });
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  }

  const webhookData = getWebhookData(payload);
  const paymentKey = webhookData ? readString(webhookData.paymentKey) : null;
  if (!webhookData || !paymentKey) {
    if (eventType === 'CANCEL_STATUS_CHANGED') {
      return NextResponse.json({
        received: true,
        status: 'ignored',
        reason: 'cancel_payload_without_payment_key',
      });
    }
    return NextResponse.json({ error: 'Invalid payment event' }, { status: 400 });
  }

  let payment: VerifiedTossPayment | null;
  try {
    payment = await verifyTossPayment(
      paymentKey,
      webhookData as TossPaymentLike,
      {
        expectedStatus:
          eventType === 'PAYMENT_STATUS_CHANGED'
            ? readString(webhookData.status)
            : null,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'TOSS_SECRET_KEY_NOT_CONFIGURED') {
      await reportError(error, {
        context: 'spokedu_master.payment.webhook',
        tags: {
          provider: 'tosspayments',
          stage: 'configuration',
          eventType,
          status: 503,
        },
      });
      return NextResponse.json({ error: 'Payment webhook is not configured' }, { status: 503 });
    }
    await reportError(error, {
      context: 'spokedu_master.payment.webhook',
      tags: {
        provider: 'tosspayments',
        stage: 'toss_payment_lookup',
        eventType,
        status: 502,
        paymentHash: hashForMonitoring(paymentKey),
      },
    });
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 502 });
  }

  if (!payment) {
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 401 });
  }

  const eventKey = transmissionId ?? buildFallbackEventKey(eventType, payment);

  try {
    if (!transmissionId && await lookupWebhookEvent(service, eventKey)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    let result:
      | Awaited<ReturnType<typeof handleDonePayment>>
      | Awaited<ReturnType<typeof handleCanceledPayment>>
      | { status: 'ignored' | 'rejected'; reason: string };
    if (eventType === 'PAYMENT_STATUS_CHANGED' && payment.status === 'DONE') {
      result = await handleDonePayment(service, payment);
    } else if (
      eventType === 'PAYMENT_STATUS_CHANGED' &&
      (payment.status === 'ABORTED' || payment.status === 'EXPIRED')
    ) {
      result = { status: 'ignored', reason: 'payment_not_completed' };
    } else if (
      eventType === 'CANCEL_STATUS_CHANGED' ||
      payment.status === 'CANCELED' ||
      payment.status === 'PARTIAL_CANCELED'
    ) {
      result = await handleCanceledPayment(service, payment);
    } else {
      result = { status: 'ignored', reason: 'unsupported_payment_status' };
    }

    if (result.status === 'rejected') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    await recordWebhookEvent(
      service,
      eventKey,
      eventType,
      payment,
      result.status === 'processed' ? 'processed' : 'ignored',
    );

    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    await reportError(error, {
      context: 'spokedu_master.payment.webhook',
      tags: {
        provider: 'tosspayments',
        stage: 'event_processing',
        eventType,
        status: 500,
        paymentHash: hashForMonitoring(payment?.paymentKey),
        orderHash: hashForMonitoring(payment?.orderId),
      },
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
