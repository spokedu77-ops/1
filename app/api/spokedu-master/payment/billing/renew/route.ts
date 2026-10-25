import { NextResponse } from 'next/server';

import { hashForMonitoring, reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  claimSpokeduMasterBillingOrder,
  markSpokeduMasterBillingOrderFailed,
  shouldReapplySpokeduMasterBillingOrder,
} from '@/app/lib/server/spokeduMasterBillingOrders';
import {
  findSpokeduMasterPaymentByOrderId,
  isSpokeduMasterBillingProviderConfigured,
  paySpokeduMasterBillingKey,
} from '@/app/lib/server/spokeduMasterBillingProvider';
import { readSpokeduMasterBillingKey } from '@/app/lib/server/spokeduMasterBillingKeyVault';
import { applySpokeduMasterPayment } from '@/app/lib/server/spokeduMasterPaymentApply';
import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  createSpokeduMasterRenewalOrderId,
  isSpokeduMasterPaidPlan,
} from '@/app/lib/server/spokeduMasterPayment';
import { SPOKEDU_MASTER_RENEWAL_MAX_ATTEMPTS } from '@/app/lib/server/spokeduMasterRenewalState';

type DueSubscription = {
  id: string;
  user_id: string;
  plan: string;
  plan_id: string | null;
  status: string;
  current_period_end: string;
  next_billing_at: string;
  provider_customer_key: string | null;
  provider_billing_key_secret_id: string | null;
  renewal_retry_count: number | null;
  billing_anchor_day: number | null;
};

type RenewalSummary = {
  checked: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

type RenewalOrderRow = {
  order_id?: string;
  user_id?: string;
  plan?: string;
  amount?: number;
  status: string | null;
  payment_key: string | null;
  billing_cycle_key?: string | null;
  applied_at?: string | null;
  charge_state?: string | null;
  recovery_lookup_attempts?: number | null;
  billing_anchor_day?: number | null;
};

const BILLING_RUN_ID_HEADER = 'x-spokedu-billing-run-id';
export const SPOKEDU_MASTER_RENEWAL_BATCH_LIMIT = 20;
const SPOKEDU_MASTER_RENEWAL_RUN_BUDGET_MS = 240_000;
const SPOKEDU_MASTER_RENEWAL_ITEM_RESERVE_MS = 80_000;
const SPOKEDU_MASTER_RECOVERY_SCAN_LIMIT = 40;
const SPOKEDU_MASTER_RECOVERY_LOOKUP_MAX_ATTEMPTS = 3;

export const maxDuration = 300;

function readBillingRunId(request: Request): string | null {
  const value = request.headers.get(BILLING_RUN_ID_HEADER)?.trim() ?? '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

async function finishBillingRun(
  runId: string | null,
  patch: Record<string, unknown>,
) {
  if (!runId) return true;
  const service = getServiceSupabase();
  const { error } = await service
    .from('spokedu_master_billing_runs')
    .update({ completed_at: new Date().toISOString(), ...patch })
    .eq('id', runId);
  if (error) {
    await reportError(error, {
      context: 'spokedu_master.billing.renew',
      tags: { provider: 'supabase', stage: 'run_log_update', status: 500 },
    });
    return false;
  }
  return true;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

function billingCycleKey(subscription: DueSubscription): string {
  const cycleDate = subscription.next_billing_at.slice(0, 10).replaceAll('-', '');
  return `${subscription.id}:${cycleDate}`;
}

function isRenewalCycleKey(value: string | null | undefined): value is string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[0-9]{8}$/i.test(value ?? '');
}

async function markChargeApplied(
  service: ReturnType<typeof getServiceSupabase>,
  orderId: string,
) {
  await service.from('spokedu_master_payment_orders').update({
    charge_state: 'applied',
    operator_review_required: false,
  }).eq('order_id', orderId);
}

async function recoverApprovedRenewalOrders(
  service: ReturnType<typeof getServiceSupabase>,
  summary: RenewalSummary,
) {
  const approvedLookup = await service
    .from('spokedu_master_payment_orders')
    .select('order_id,user_id,plan,amount,status,payment_key,billing_cycle_key,applied_at,charge_state,recovery_lookup_attempts,billing_anchor_day')
    .in('status', ['pending', 'processing', 'recoverable_failed', 'failed', 'active'])
    .eq('charge_state', 'approved_unapplied')
    .eq('operator_review_required', false)
    .or('last_error_code.is.null,last_error_code.neq.partial_cancel_review_required')
    .order('updated_at', { ascending: true })
    .limit(SPOKEDU_MASTER_RENEWAL_BATCH_LIMIT);

  const uncertainLookup = approvedLookup.error ? { data: null, error: null } : await service
    .from('spokedu_master_payment_orders')
    .select('order_id,user_id,plan,amount,status,payment_key,billing_cycle_key,applied_at,charge_state,recovery_lookup_attempts,billing_anchor_day')
    .in('status', ['processing', 'recoverable_failed', 'failed'])
    .in('charge_state', ['request_started', 'outcome_unknown'])
    .eq('operator_review_required', false)
    .or('last_error_code.is.null,last_error_code.neq.partial_cancel_review_required')
    .order('updated_at', { ascending: true })
    .limit(SPOKEDU_MASTER_RECOVERY_SCAN_LIMIT);

  const error = approvedLookup.error ?? uncertainLookup.error;
  const data = [...(approvedLookup.data ?? []), ...(uncertainLookup.data ?? [])];

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.billing.renew',
      tags: { provider: 'supabase', stage: 'recovery_lookup', status: 500 },
    });
    summary.failed += 1;
    return;
  }

  const candidates = ((data ?? []) as RenewalOrderRow[])
    .filter((order) => isRenewalCycleKey(order.billing_cycle_key))
    .filter((order) => order.status !== 'active' || (!order.applied_at && Boolean(order.payment_key)))
    .slice(0, SPOKEDU_MASTER_RECOVERY_SCAN_LIMIT + SPOKEDU_MASTER_RENEWAL_BATCH_LIMIT);
  summary.checked += candidates.length;

  for (const order of candidates) {
    if (!order.order_id || !order.user_id || !isSpokeduMasterPaidPlan(order.plan) || !Number.isInteger(order.amount)) {
      summary.skipped += 1;
      continue;
    }

    const { claimed, error: claimError } = await claimSpokeduMasterBillingOrder({
      service,
      orderId: order.order_id,
    });
    if (claimError) {
      summary.failed += 1;
      continue;
    }
    if (!claimed) {
      summary.skipped += 1;
      continue;
    }

    summary.attempted += 1;
    let payment;
    try {
      payment = await findSpokeduMasterPaymentByOrderId({
        orderId: order.order_id,
        amount: order.amount!,
      });
    } catch (recoveryError) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId: order.order_id,
        lastErrorCode: 'renewal_recovery_lookup_exception',
        paymentKey: order.payment_key,
        recoverable: true,
      });
      await reportError(recoveryError, {
        context: 'spokedu_master.billing.renew',
        tags: { provider: 'tosspayments', stage: 'recovery_provider_lookup', status: 502 },
      });
      summary.failed += 1;
      continue;
    }

    if (!payment) {
      const attempts = (order.recovery_lookup_attempts ?? 0) + 1;
      await service.from('spokedu_master_payment_orders').update({
        recovery_lookup_attempts: attempts,
        provider_checked_at: new Date().toISOString(),
        status: 'recoverable_failed',
        last_error_code: 'renewal_recovery_not_confirmed',
        ...(attempts >= SPOKEDU_MASTER_RECOVERY_LOOKUP_MAX_ATTEMPTS ? {
          charge_state: 'review_required',
          operator_review_required: true,
        } : {}),
      }).eq('order_id', order.order_id);
      summary.failed += 1;
      continue;
    }
    if (order.payment_key && order.payment_key !== payment.paymentKey) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId: order.order_id,
        lastErrorCode: 'renewal_recovery_payment_key_conflict',
        paymentKey: order.payment_key,
        recoverable: true,
        operatorReview: true,
      });
      summary.failed += 1;
      continue;
    }
    if (!Number.isInteger(order.billing_anchor_day) || order.billing_anchor_day! < 1 || order.billing_anchor_day! > 31) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId: order.order_id,
        lastErrorCode: 'renewal_recovery_anchor_missing',
        paymentKey: payment.paymentKey,
        recoverable: true,
        operatorReview: true,
      });
      summary.failed += 1;
      continue;
    }

    const applied = await applySpokeduMasterPayment({
      userId: order.user_id,
      orderId: order.order_id,
      paymentKey: payment.paymentKey,
      plan: order.plan,
      amount: order.amount!,
      approvedAt: payment.approvedAt,
      eventKey: `renewal-recovery:${order.order_id}:${payment.paymentKey}`,
      source: 'renewal',
      billingCycleKey: order.billing_cycle_key,
      billingAnchorDay: order.billing_anchor_day,
    });
    if (!applied.ok) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId: order.order_id,
        lastErrorCode: applied.code,
        paymentKey: payment.paymentKey,
        recoverable: true,
      });
      summary.failed += 1;
      continue;
    }
    await markChargeApplied(service, order.order_id);
    summary.succeeded += 1;
  }
}

export function calculateRenewalRetryAt(retryCount: number, now = Date.now()): string {
  // The scheduler is hourly, so the first backoff must exceed one interval;
  // otherwise the same poison row would be eligible at the very next run.
  const delayHours = Math.min(24, 2 ** Math.min(Math.max(retryCount, 0) + 1, 5));
  return new Date(now + delayHours * 60 * 60 * 1000).toISOString();
}

async function scheduleRenewalRetry(
  service: ReturnType<typeof getServiceSupabase>,
  subscription: DueSubscription,
  errorCode: string,
) {
  const retryCount = (subscription.renewal_retry_count ?? 0) + 1;
  const retryExhausted = retryCount >= SPOKEDU_MASTER_RENEWAL_MAX_ATTEMPTS;
  await service
    .from('spokedu_master_subscriptions')
    .update({
      renewal_retry_count: retryCount,
      last_billing_error: errorCode,
      next_retry_at: retryExhausted ? null : calculateRenewalRetryAt(retryCount - 1),
    })
    .eq('id', subscription.id)
    .eq('next_billing_at', subscription.next_billing_at);
}

async function runRenewal(request: Request) {
  const runStartedAt = Date.now();
  const runId = readBillingRunId(request);
  if (!isAuthorized(request)) {
    await finishBillingRun(runId, { status: 'failed', error_code: 'unauthorized' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const service = getServiceSupabase();
  if (!isSpokeduMasterBillingProviderConfigured()) {
    await service.from('spokedu_master_billing_provider_state').upsert({
      singleton_key: true,
      status: 'misconfigured',
      checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await reportError(new Error('billing_provider_not_configured'), {
      context: 'spokedu_master.billing.renew',
      tags: { provider: 'tosspayments', stage: 'provider_configuration', status: 503 },
    });
    await finishBillingRun(runId, { status: 'failed', error_code: 'billing_provider_not_configured' });
    return NextResponse.json({ error: 'Billing provider is not configured' }, { status: 503 });
  }

  const summary: RenewalSummary = {
    checked: 0,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };
  await recoverApprovedRenewalOrders(service, summary);
  const now = new Date().toISOString();
  const { data, error } = await service
    .from('spokedu_master_subscriptions')
    .select('id,user_id,plan,plan_id,status,current_period_end,next_billing_at,provider_customer_key,provider_billing_key_secret_id,renewal_retry_count,billing_anchor_day')
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .eq('pg_provider', 'tosspayments')
    .or('plan.in.(lite,premium),plan_id.in.(lite,premium)')
    .lte('next_billing_at', now)
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .lt('renewal_retry_count', SPOKEDU_MASTER_RENEWAL_MAX_ATTEMPTS)
    .not('billing_anchor_day', 'is', null)
    .order('next_billing_at', { ascending: true })
    .limit(SPOKEDU_MASTER_RENEWAL_BATCH_LIMIT);

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.billing.renew',
      tags: { provider: 'tosspayments', stage: 'due_lookup', status: 500 },
    });
    await finishBillingRun(runId, { status: 'failed', error_code: 'renewal_lookup_failed' });
    return NextResponse.json({ error: 'Renewal lookup failed' }, { status: 500 });
  }

  const due = (data ?? []) as DueSubscription[];
  summary.checked += due.length;

  let budgetExhausted = false;
  for (const [index, subscription] of due.entries()) {
    if (Date.now() - runStartedAt > SPOKEDU_MASTER_RENEWAL_RUN_BUDGET_MS - SPOKEDU_MASTER_RENEWAL_ITEM_RESERVE_MS) {
      summary.skipped += due.length - index;
      budgetExhausted = true;
      break;
    }
    const plan = subscription.plan_id ?? subscription.plan;
    if (!isSpokeduMasterPaidPlan(plan) || !subscription.provider_customer_key || !subscription.provider_billing_key_secret_id) {
      summary.skipped += 1;
      await scheduleRenewalRetry(service, subscription, 'renewal_configuration_missing');
      continue;
    }

    const billingKey = await readSpokeduMasterBillingKey({
      userId: subscription.user_id,
      secretId: subscription.provider_billing_key_secret_id,
    });
    if (!billingKey) {
      summary.skipped += 1;
      await scheduleRenewalRetry(service, subscription, 'billing_key_unavailable');
      continue;
    }

    summary.attempted += 1;
    const cycleKey = billingCycleKey(subscription);
    const orderId = createSpokeduMasterRenewalOrderId(plan, subscription.id, cycleKey.split(':')[1] ?? 'cycle');
    const amount = SPOKEDU_MASTER_PLAN_CONFIG[plan].amount;

    // active 주문을 pending으로 덮어쓰지 않는다. 없으면 insert, 있으면 그대로 claim.
    const { error: orderInsertError } = await service
      .from('spokedu_master_payment_orders')
      .insert({
        order_id: orderId,
        user_id: subscription.user_id,
        plan,
        amount,
        status: 'pending',
        billing_cycle_key: cycleKey,
        billing_anchor_day: subscription.billing_anchor_day,
        charge_state: 'unattempted',
      });

    if (orderInsertError && orderInsertError.code !== '23505') {
      await reportError(orderInsertError, {
        context: 'spokedu_master.billing.renew',
        tags: { provider: 'tosspayments', stage: 'order_create', plan, status: 500 },
      });
      summary.failed += 1;
      await scheduleRenewalRetry(service, subscription, 'renewal_order_create_failed');
      continue;
    }
    const orderCreatedByThisInvocation = !orderInsertError;

    const { claimed, error: claimError } = await claimSpokeduMasterBillingOrder({ service, orderId });

    if (claimError) {
      await reportError(claimError, {
        context: 'spokedu_master.billing.renew',
        tags: { provider: 'tosspayments', stage: 'order_claim', plan, status: 500 },
      });
      summary.failed += 1;
      await scheduleRenewalRetry(service, subscription, 'renewal_order_claim_failed');
      continue;
    }

    if (!claimed) {
      const { data: orderRow } = await service
        .from('spokedu_master_payment_orders')
        .select('status,payment_key,charge_state')
        .eq('order_id', orderId)
        .maybeSingle();
      const renewalOrder = orderRow as RenewalOrderRow | null;
      if (renewalOrder?.status === 'active' && renewalOrder.payment_key) {
        await markChargeApplied(service, orderId);
        summary.succeeded += 1;
      } else {
        summary.skipped += 1;
        await scheduleRenewalRetry(service, subscription, 'renewal_order_busy');
      }
      continue;
    }

    const { data: claimedOrderRow } = await service
      .from('spokedu_master_payment_orders')
      .select('status,payment_key,charge_state')
      .eq('order_id', orderId)
      .maybeSingle();
    const claimedOrder = claimedOrderRow as RenewalOrderRow | null;

    // 이미 청구된 주문이면 재청구 없이 apply만 재시도한다.
    if (shouldReapplySpokeduMasterBillingOrder(claimedOrder)) {
      const applied = await applySpokeduMasterPayment({
        userId: subscription.user_id,
        orderId,
        paymentKey: claimedOrder.payment_key,
        plan,
        amount,
        approvedAt: subscription.current_period_end,
        eventKey: `renewal:${cycleKey}:${claimedOrder.payment_key}`,
        source: 'renewal',
          billingCycleKey: cycleKey,
          billingAnchorDay: subscription.billing_anchor_day,
      });

      if (!applied.ok) {
        await markSpokeduMasterBillingOrderFailed({
          service,
          orderId,
          lastErrorCode: applied.code,
          paymentKey: claimedOrder.payment_key,
          recoverable: true,
        });
        await reportError(new Error(applied.code), {
          context: 'spokedu_master.billing.renew',
          tags: {
            provider: 'tosspayments',
            stage: 'reapply',
            plan,
            status: applied.status,
            orderHash: hashForMonitoring(orderId),
          },
        });
        summary.failed += 1;
        await scheduleRenewalRetry(service, subscription, applied.code);
        continue;
      }

      await markChargeApplied(service, orderId);
      summary.succeeded += 1;
      continue;
    }

    let payment;
    try {
      payment = await findSpokeduMasterPaymentByOrderId({ orderId, amount });
      // Only this invocation's successful insert proves that no earlier worker
      // could have sent a provider request for the order id.
      const mayStartCharge = orderCreatedByThisInvocation;
      // A null lookup means Toss returned an authoritative 404/non-approved
      // terminal result. Indeterminate responses throw above and never charge.
      if (!payment && mayStartCharge) {
        await service.from('spokedu_master_payment_orders').update({
          charge_state: 'request_started',
          charge_requested_at: new Date().toISOString(),
        }).eq('order_id', orderId);
        payment = await paySpokeduMasterBillingKey({
          billingKey,
          customerKey: subscription.provider_customer_key,
          plan,
          amount,
          orderId,
          orderName: SPOKEDU_MASTER_PLAN_CONFIG[plan].name,
          customerEmail: '',
        });
        if (!payment) {
          await service.from('spokedu_master_payment_orders').update({
            charge_state: 'declined',
            recovery_lookup_attempts: 0,
            operator_review_required: false,
          }).eq('order_id', orderId);
        }
      }
    } catch (error) {
      await service.from('spokedu_master_payment_orders').update({
        charge_state: 'outcome_unknown',
        recovery_lookup_attempts: 0,
        operator_review_required: false,
      }).eq('order_id', orderId);
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId,
        lastErrorCode: 'renewal_payment_exception',
        recoverable: true,
      });
      await reportError(error, {
        context: 'spokedu_master.billing.renew',
        tags: {
          provider: 'tosspayments',
          stage: 'charge',
          plan,
          status: 502,
          orderHash: hashForMonitoring(orderId),
        },
      });
      summary.failed += 1;
      await scheduleRenewalRetry(service, subscription, 'renewal_payment_exception');
      continue;
    }

    if (!payment) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId,
        lastErrorCode: 'renewal_payment_failed',
      });
      summary.failed += 1;
      await scheduleRenewalRetry(service, subscription, 'renewal_payment_failed');
      continue;
    }

    await service.from('spokedu_master_payment_orders').update({
      charge_state: 'approved_unapplied',
      payment_key: payment.paymentKey,
      provider_checked_at: new Date().toISOString(),
      operator_review_required: false,
    }).eq('order_id', orderId);

    await service
      .from('spokedu_master_payment_orders')
      .update({ payment_key: payment.paymentKey })
      .eq('order_id', orderId);

    const applied = await applySpokeduMasterPayment({
      userId: subscription.user_id,
      orderId,
      paymentKey: payment.paymentKey,
      plan,
      amount,
      approvedAt: subscription.current_period_end,
      eventKey: `renewal:${cycleKey}:${payment.paymentKey}`,
      source: 'renewal',
      billingCycleKey: cycleKey,
      billingAnchorDay: subscription.billing_anchor_day,
    });

    if (!applied.ok) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId,
        lastErrorCode: applied.code,
        paymentKey: payment.paymentKey,
        recoverable: true,
      });
      await reportError(new Error(applied.code), {
        context: 'spokedu_master.billing.renew',
        tags: {
          provider: 'tosspayments',
          stage: 'apply',
          plan,
          status: applied.status,
          orderHash: hashForMonitoring(orderId),
        },
      });
      summary.failed += 1;
      await scheduleRenewalRetry(service, subscription, applied.code);
      continue;
    }

    await markChargeApplied(service, orderId);
    summary.succeeded += 1;
  }

  const runRecorded = await finishBillingRun(runId, {
    status: summary.failed > 0 || summary.skipped > 0 ? 'completed_with_errors' : 'succeeded',
    attempted: summary.attempted,
    succeeded: summary.succeeded,
    failed: summary.failed,
    skipped: summary.skipped,
    error_code: budgetExhausted
      ? 'billing_run_budget_exhausted'
      : summary.failed > 0 || summary.skipped > 0 ? 'renewal_items_failed' : null,
  });
  if (!runRecorded) {
    return NextResponse.json({ error: 'Renewal monitoring update failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ...summary,
  });
}

export async function POST(request: Request) {
  try {
    return await runRenewal(request);
  } catch (error) {
    await finishBillingRun(readBillingRunId(request), {
      status: 'failed',
      error_code: 'renewal_internal_exception',
      error_detail: error instanceof Error ? error.message.slice(0, 500) : 'unknown_error',
    });
    await reportError(error, {
      context: 'spokedu_master.billing.renew',
      tags: { provider: 'tosspayments', stage: 'internal_exception', status: 500 },
    });
    return NextResponse.json({ error: 'Renewal processing failed' }, { status: 500 });
  }
}
