import { NextResponse } from 'next/server';
import { hashForMonitoring, reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  isSpokeduMasterPaidPlan,
  parseSpokeduMasterOrderId,
} from '@/app/lib/server/spokeduMasterPayment';
import { applySpokeduMasterPayment } from '@/app/lib/server/spokeduMasterPaymentApply';

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
  billing_cycle_key?: string | null;
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
  if (!tossSecretKey || (!tossSecretKey.startsWith('test_') && !tossSecretKey.startsWith('live_'))) {
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

async function lookupPaymentOrder(
  service: ReturnType<typeof getServiceSupabase>,
  payment: VerifiedTossPayment,
): Promise<(PaymentOrderRow & { user_id: string; plan: 'lite' | 'premium' }) | null> {
  const { data, error } = await service
    .from('spokedu_master_payment_orders')
    .select('user_id,plan,amount,billing_cycle_key')
    .eq('order_id', payment.orderId)
    .maybeSingle();
  if (error) throw new Error('ORDER_LOOKUP_FAILED');
  const order = data as PaymentOrderRow | null;
  if (!order || !isSpokeduMasterPaidPlan(order.plan)) return null;
  return order as PaymentOrderRow & { user_id: string; plan: 'lite' | 'premium' };
}
async function handleDonePayment(
  service: ReturnType<typeof getServiceSupabase>,
  payment: VerifiedTossPayment,
  eventKey: string,
) {
  const { data: order, error: orderError } = await service
    .from('spokedu_master_payment_orders')
    .select('user_id,plan,amount,billing_cycle_key')
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

  let approvedAt = payment.approvedAt;
  if (payment.orderId.includes('-renewal-')) {
    const { data: subscription } = await service
      .from('spokedu_master_subscriptions')
      .select('current_period_end')
      .eq('user_id', orderRow.user_id)
      .maybeSingle();
    const currentPeriodEnd = (subscription as { current_period_end?: string | null } | null)?.current_period_end;
    approvedAt = currentPeriodEnd ?? payment.approvedAt;
  }

  const applied = await applySpokeduMasterPayment({
    userId: orderRow.user_id,
    orderId: payment.orderId,
    paymentKey: payment.paymentKey,
    plan: orderRow.plan,
    amount: expectedAmount,
    approvedAt,
    eventKey,
    source: 'webhook',
    billingCycleKey: orderRow.billing_cycle_key ?? null,
  });

  if (!applied.ok) {
    if (applied.status >= 500) throw new Error(applied.code);
    return { status: 'rejected' as const, reason: applied.code };
  }

  return {
    status: 'processed' as const,
    alreadyApplied: applied.alreadyApplied,
    periodEnd: applied.periodEnd,
  };
}

async function handleCanceledPayment(
  service: ReturnType<typeof getServiceSupabase>,
  payment: VerifiedTossPayment,
  eventKey: string,
) {
  if (payment.status === 'PARTIAL_CANCELED') {
    const order = await lookupPaymentOrder(service, payment);
    if (!order) return { status: 'ignored' as const, reason: 'order_not_found' };
    const applied = await applySpokeduMasterPayment({
      userId: order.user_id,
      orderId: payment.orderId,
      paymentKey: payment.paymentKey,
      plan: order.plan,
      amount: order.amount,
      approvedAt: payment.approvedAt,
      eventKey,
      source: 'partial_cancel_review_required',
    });
    if (!applied.ok && applied.status >= 500) throw new Error(applied.code);
    return { status: 'ignored' as const, reason: 'partial_cancel_review_required' };
  }

  if (payment.status !== 'CANCELED' || payment.balanceAmount !== 0) {
    return { status: 'ignored' as const, reason: 'not_full_cancel' };
  }

  const order = await lookupPaymentOrder(service, payment);
  if (!order) return { status: 'ignored' as const, reason: 'order_not_found' };
  const applied = await applySpokeduMasterPayment({
    userId: order.user_id,
    orderId: payment.orderId,
    paymentKey: payment.paymentKey,
    plan: order.plan,
    amount: order.amount,
    approvedAt: payment.approvedAt,
    eventKey,
    source: 'cancel',
  });
  if (!applied.ok) {
    if (applied.status >= 500) throw new Error(applied.code);
    return { status: 'ignored' as const, reason: applied.code };
  }
  return { status: 'processed' as const, cancelled: true };
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
      result = await handleDonePayment(service, payment, eventKey);
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
      result = await handleCanceledPayment(service, payment, eventKey);
    } else {
      result = { status: 'ignored', reason: 'unsupported_payment_status' };
    }

    if (result.status === 'rejected') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

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
