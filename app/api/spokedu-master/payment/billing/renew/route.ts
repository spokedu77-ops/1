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
};

type RenewalSummary = {
  checked: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

type RenewalOrderRow = {
  status: string | null;
  payment_key: string | null;
};

const BILLING_RUN_ID_HEADER = 'x-spokedu-billing-run-id';

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
  await service
    .from('spokedu_master_subscriptions')
    .update({
      renewal_retry_count: retryCount,
      last_billing_error: errorCode,
      next_retry_at: calculateRenewalRetryAt(retryCount - 1),
    })
    .eq('id', subscription.id)
    .eq('next_billing_at', subscription.next_billing_at);
}

async function runRenewal(request: Request) {
  const runId = readBillingRunId(request);
  if (!isAuthorized(request)) {
    await finishBillingRun(runId, { status: 'failed', error_code: 'unauthorized' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSpokeduMasterBillingProviderConfigured()) {
    await finishBillingRun(runId, { status: 'failed', error_code: 'billing_provider_not_configured' });
    return NextResponse.json({ error: 'Billing provider is not configured' }, { status: 503 });
  }

  const service = getServiceSupabase();
  const now = new Date().toISOString();
  const { data, error } = await service
    .from('spokedu_master_subscriptions')
    .select('id,user_id,plan,plan_id,status,current_period_end,next_billing_at,provider_customer_key,provider_billing_key_secret_id,renewal_retry_count')
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .lte('next_billing_at', now)
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order('next_billing_at', { ascending: true })
    .limit(20);

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.billing.renew',
      tags: { provider: 'tosspayments', stage: 'due_lookup', status: 500 },
    });
    await finishBillingRun(runId, { status: 'failed', error_code: 'renewal_lookup_failed' });
    return NextResponse.json({ error: 'Renewal lookup failed' }, { status: 500 });
  }

  const due = (data ?? []) as DueSubscription[];
  const summary: RenewalSummary = {
    checked: due.length,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  for (const subscription of due) {
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
        .select('status,payment_key')
        .eq('order_id', orderId)
        .maybeSingle();
      const renewalOrder = orderRow as RenewalOrderRow | null;
      if (renewalOrder?.status === 'active' && renewalOrder.payment_key) {
        summary.succeeded += 1;
      } else {
        summary.skipped += 1;
        await scheduleRenewalRetry(service, subscription, 'renewal_order_busy');
      }
      continue;
    }

    const { data: claimedOrderRow } = await service
      .from('spokedu_master_payment_orders')
      .select('status,payment_key')
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

      summary.succeeded += 1;
      continue;
    }

    let payment;
    try {
      payment = await findSpokeduMasterPaymentByOrderId({ orderId, amount });
      if (!payment) {
        payment = await paySpokeduMasterBillingKey({
          billingKey,
          customerKey: subscription.provider_customer_key,
          plan,
          amount,
          orderId,
          orderName: SPOKEDU_MASTER_PLAN_CONFIG[plan].name,
          customerEmail: '',
        });
      }
    } catch (error) {
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

    summary.succeeded += 1;
  }

  const runRecorded = await finishBillingRun(runId, {
    status: summary.failed > 0 || summary.skipped > 0 ? 'completed_with_errors' : 'succeeded',
    attempted: summary.attempted,
    succeeded: summary.succeeded,
    failed: summary.failed,
    skipped: summary.skipped,
    error_code: summary.failed > 0 || summary.skipped > 0 ? 'renewal_items_failed' : null,
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
