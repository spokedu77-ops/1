import { NextRequest, NextResponse } from 'next/server';
import { BILLING_INTENT_COOKIE, verifyBillingIntent } from '@/app/lib/server/spokeduMasterBillingIntent';
import { getBillingConfigurationError } from '@/app/lib/server/spokeduMasterBillingConfiguration';

import { isMasterPremiumAssignedEmail } from '@/app/lib/auth/platformAdminIdentity';
import { hashForMonitoring, reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import {
  claimSpokeduMasterBillingOrder,
  markSpokeduMasterBillingOrderFailed,
  shouldReapplySpokeduMasterBillingOrder,
} from '@/app/lib/server/spokeduMasterBillingOrders';
import {
  findSpokeduMasterPaymentByOrderId,
  issueSpokeduMasterBillingKey,
  isSpokeduMasterBillingProviderConfigured,
  paySpokeduMasterBillingKey,
} from '@/app/lib/server/spokeduMasterBillingProvider';
import { deleteSpokeduMasterBillingKey, readSpokeduMasterBillingKey, storeSpokeduMasterBillingKey } from '@/app/lib/server/spokeduMasterBillingKeyVault';
import { calculateSpokeduMasterLiteUpgradeQuote } from '@/app/lib/server/spokeduMasterProration';
import { applySpokeduMasterPayment } from '@/app/lib/server/spokeduMasterPaymentApply';
import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  createSpokeduMasterOrderId,
  isSpokeduMasterPaidPlan,
  type SpokeduMasterPaidPlan,
} from '@/app/lib/server/spokeduMasterPayment';
import { isSpokeduMasterPaidPlanActive, type SpokeduMasterSubscriptionRow } from '@/app/lib/server/spokeduMasterAccess';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

// Provider approval alone can take 70 seconds. Keep the platform request alive
// long enough to persist the result and activate the subscription afterwards.
export const maxDuration = 120;

type BillingIssueBody = {
  plan?: string;
  planId?: string;
  authKey?: string;
  customerKey?: string;
  amount?: number;
};

type BillingIssueSubscriptionRow = SpokeduMasterSubscriptionRow & {
  current_period_start?: string | null;
  current_period_end?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  provider_customer_key?: string | null;
  provider_billing_key_secret_id?: string | null;
  pending_billing_key_secret_id?: string | null;
};

type ExistingCycleOrder = {
  order_id: string;
  status: string | null;
  payment_key: string | null;
  charge_state?: string | null;
  plan?: string;
  amount?: number;
  billing_cycle_key?: string | null;
  applied_at?: string | null;
};

function fail(status: number, error = '결제를 처리하지 못했습니다.', code = 'billing_issue_failed', stage = 'issue') {
  return NextResponse.json({ error, code, stage }, { status });
}

function normalizePaidPlan(plan: string | null | undefined): SpokeduMasterPaidPlan | null {
  if (plan === 'lite' || plan === 'premium') return plan;
  if (plan === 'pro') return 'premium';
  return null;
}

async function cleanupPendingBillingAttempt(input: {
  userId: string;
  secretId: string | null;
}) {
  if (!input.secretId) return;
  await deleteSpokeduMasterBillingKey({ userId: input.userId, secretId: input.secretId });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, '로그인이 필요합니다.');

  let body: BillingIssueBody;
  try {
    body = await request.json() as BillingIssueBody;
  } catch {
    return fail(400, '요청 형식이 올바르지 않습니다.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, '요청 형식이 올바르지 않습니다.');

  const requestedPlan = body.planId ?? body.plan;
  if (requestedPlan === 'pro' || requestedPlan === 'team' || requestedPlan === 'center') {
    return fail(400, '직접 결제 가능한 상품이 아닙니다.');
  }
  if (!isSpokeduMasterPaidPlan(requestedPlan)) {
    return fail(400, '직접 결제 가능한 상품이 아닙니다.');
  }
  if (typeof body.customerKey !== 'string' || !body.customerKey) {
    return fail(400, '자동결제 인증 정보가 필요합니다.');
  }
  const expectedCustomerKey = `spm_${user.id.replaceAll('-', '')}`;
  if (body.customerKey !== expectedCustomerKey) {
    return fail(400, '결제 고객 정보가 일치하지 않습니다.');
  }
  if (!isSpokeduMasterBillingProviderConfigured()) {
    const code = getBillingConfigurationError() ?? 'billing_provider_unconfigured';
    await reportError(new Error(code), { context: 'spokedu_master.billing.issue', tags: { stage: 'configuration', code } });
    return fail(503, '자동결제 설정이 완료되지 않았습니다.', code, 'configuration');
  }

  const plan = requestedPlan;

  const isAdmin = !isMasterPremiumAssignedEmail(user.email) && await isPlatformAdminUser(user, supabase);
  if (isAdmin) return fail(409, '관리자 권한에는 결제가 필요하지 않습니다.');

  const service = getServiceSupabase();
  const { data: subscription, error: subscriptionError } = await service
    .from('spokedu_master_subscriptions')
    .select('plan,status,period_start,period_end,current_period_start,current_period_end,provider_customer_key,provider_billing_key_secret_id,pending_billing_key_secret_id,cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    await reportError(subscriptionError, {
      context: 'spokedu_master.billing.issue',
      tags: { provider: 'tosspayments', stage: 'subscription_lookup', status: 500 },
    });
    return fail(500);
  }

  const activeSubscription = isSpokeduMasterPaidPlanActive(subscription as SpokeduMasterSubscriptionRow | null);
  const activeRow = subscription as BillingIssueSubscriptionRow | null;
  const activePlan = normalizePaidPlan(activeRow?.plan);
  const activePeriodEnd = activeRow?.current_period_end ?? activeRow?.period_end ?? null;
  const isUpgrade = activeSubscription && activePlan === 'lite' && plan === 'premium';
  if (!isUpgrade && !verifyBillingIntent(new NextRequest(request.url, { headers: request.headers }).cookies.get(BILLING_INTENT_COOKIE)?.value, {
    userId: user.id, plan, customerKey: body.customerKey,
  })) return fail(400, '결제 시작 정보가 만료되었거나 일치하지 않습니다. 구독 페이지에서 다시 시작해 주세요.', 'billing_intent_invalid', 'callback');
  if (isUpgrade && activeRow?.cancel_at_period_end === true) {
    return fail(409, '해지 예약 중에는 이용권을 바로 변경할 수 없습니다. 고객센터로 문의해 주세요.');
  }
  const upgradeQuote = isUpgrade && activeRow
    ? calculateSpokeduMasterLiteUpgradeQuote({
        periodStart: activeRow.current_period_start ?? activeRow.period_start ?? '',
        periodEnd: activePeriodEnd ?? '',
      })
    : null;
  if (isUpgrade && (!upgradeQuote || !activeRow?.provider_billing_key_secret_id || !activeRow.provider_customer_key)) {
    return fail(409, '기존 자동결제 수단으로 업그레이드할 수 없습니다. 고객센터로 문의해 주세요.');
  }
  let amount = upgradeQuote?.amountDueNow ?? SPOKEDU_MASTER_PLAN_CONFIG[plan].amount;
  if (!isUpgrade && body.amount !== undefined && body.amount !== amount) {
    return fail(400, '결제 금액이 서버 견적과 일치하지 않습니다.');
  }

  if (activeSubscription) {
    if (activePlan === plan) {
      return NextResponse.json({
        error: '이미 활성화된 이용권입니다.',
        plan: activePlan,
        periodEnd: activePeriodEnd,
      }, { status: 409 });
    }

    if (activePlan === 'premium') {
      return NextResponse.json({
        error: '프리미엄 이용권은 결제 페이지에서 라이트로 변경할 수 없습니다. 구독 관리에서 해지 후 다시 선택해 주세요.',
        plan: activePlan,
        periodEnd: activePeriodEnd,
      }, { status: 409 });
    }

    if (activePlan !== 'lite' || plan !== 'premium') {
      return NextResponse.json({
        error: '현재 이용권에서 요청한 상품으로 바로 변경할 수 없습니다. 고객센터로 문의해 주세요.',
        plan: activePlan,
        periodEnd: activePeriodEnd,
      }, { status: 409 });
    }
  }

  const billingMode = isUpgrade ? 'upgrade' : 'initial';
  // One initial checkout slot per user/paid period, shared across both plans.
  // The existing unique (user_id, billing_cycle_key) index arbitrates races.
  let billingCycleKey = isUpgrade ? `${billingMode}:${user.id}:${plan}:${activePeriodEnd}`
    : `${billingMode}:${user.id}:checkout:${activePeriodEnd ? Date.parse(activePeriodEnd) : 0}`;

  const { data: existingCycleOrderRaw, error: cycleLookupError } = await service
    .from('spokedu_master_payment_orders')
    .select('order_id,status,payment_key,charge_state,plan,amount,billing_cycle_key,applied_at')
    .eq('user_id', user.id)
    .eq('billing_cycle_key', billingCycleKey)
    .maybeSingle();

  if (cycleLookupError) {
    await reportError(cycleLookupError, {
      context: 'spokedu_master.billing.issue',
      tags: { provider: 'tosspayments', stage: 'cycle_lookup', plan, status: 500 },
    });
    return fail(500);
  }

  let existingCycleOrder = existingCycleOrderRaw as ExistingCycleOrder | null;
  let legacyOrder = false;
  if (!isUpgrade && !existingCycleOrder) {
    // Preserve unfinished v1 orders across the rollout. Never create a new
    // charge merely because the new shared checkout cycle has a different key.
    const legacy = await service.from('spokedu_master_payment_orders')
      .select('order_id,status,payment_key,charge_state,plan,amount,billing_cycle_key,applied_at')
      .eq('user_id', user.id).like('billing_cycle_key', `initial:${user.id}:%`)
      .not('billing_cycle_key', 'like', `initial:${user.id}:checkout:%`)
      .is('applied_at', null).in('status', ['pending', 'processing', 'failed', 'recoverable_failed', 'active'])
      .order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (legacy.error) return fail(503, '이전 결제 주문을 확인하지 못했습니다.', 'legacy_order_lookup_failed');
    if (legacy.data) {
      const row = legacy.data as ExistingCycleOrder;
      if (row.plan !== plan || !row.billing_cycle_key) {
        return NextResponse.json({ error: '이전 상품의 결제 상태를 먼저 확인해야 합니다. 재결제하지 마세요.', code: 'billing_legacy_order_pending', stage: 'recovery', recoverable: true }, { status: 409 });
      }
      existingCycleOrder = row;
      billingCycleKey = row.billing_cycle_key;
      legacyOrder = true;
    }
  }

  if (existingCycleOrder?.amount !== undefined && (!existingCycleOrder.plan || existingCycleOrder.plan === plan)) {
    const stored = existingCycleOrder.amount;
    const valid = Number.isInteger(stored) && (isUpgrade
      ? stored > 0 && stored <= SPOKEDU_MASTER_PLAN_CONFIG.premium.amount - SPOKEDU_MASTER_PLAN_CONFIG.lite.amount
      : stored === SPOKEDU_MASTER_PLAN_CONFIG[plan].amount);
    if (!valid) return fail(409, '저장된 주문 금액을 확인해야 합니다.', 'stored_order_amount_invalid');
    // A recovery must reconcile the original approved quote, even after time
    // has elapsed and a fresh proration quote would produce another amount.
    amount = stored;
  }

  if (existingCycleOrder?.status === 'active' && existingCycleOrder.payment_key && existingCycleOrder.applied_at) {
    return fail(409, '이미 완료된 결제입니다. 구독 상태를 확인해 주세요.', 'billing_already_completed');
  }
  if (existingCycleOrder && !legacyOrder && ((existingCycleOrder.plan && existingCycleOrder.plan !== plan) || existingCycleOrder.charge_state === 'declined')) {
    // Release a different plan ONLY if it provably never reached the provider
    // or was declined. The status predicate arbitrates against a concurrent claim.
    const { data: retired, error: retireError } = await service.from('spokedu_master_payment_orders')
      .update({ billing_cycle_key: `${billingCycleKey}:retired:${existingCycleOrder.order_id}` })
      .eq('order_id', existingCycleOrder.order_id).in('status', ['pending', 'failed', 'recoverable_failed'])
      .in('charge_state', ['unattempted', 'declined']).is('payment_key', null).select('order_id').maybeSingle();
    if (retireError || !retired) return fail(409, '다른 상품의 결제 처리 상태를 확인해야 합니다. 재결제하지 마세요.', 'billing_other_plan_in_progress');
    existingCycleOrder = null;
    amount = upgradeQuote?.amountDueNow ?? SPOKEDU_MASTER_PLAN_CONFIG[plan].amount;
  }
  if (body.amount !== undefined && body.amount !== amount) return fail(400, '결제 금액이 서버 견적과 일치하지 않습니다.');

  let orderId = typeof existingCycleOrder?.order_id === 'string' && existingCycleOrder.order_id
    ? existingCycleOrder.order_id
    : createSpokeduMasterOrderId(plan as SpokeduMasterPaidPlan, 'initial');
  const orderName = SPOKEDU_MASTER_PLAN_CONFIG[plan].name;
  let orderCreatedByThisInvocation = false;

  // claim 전에 주문 행을 확보한다. processing/active를 pending으로 덮어쓰지 않는다.
  if (!existingCycleOrder) {
    const { error: orderError } = await service
      .from('spokedu_master_payment_orders')
      .insert({
        order_id: orderId,
        user_id: user.id,
        plan,
        amount,
        status: 'pending',
        billing_cycle_key: billingCycleKey,
        last_error_code: null,
      });

    if (orderError) {
      if (orderError.code === '23505') {
        const { data: racedOrder } = await service
          .from('spokedu_master_payment_orders')
          .select('order_id,status,payment_key,charge_state,plan,amount')
          .eq('user_id', user.id)
          .eq('billing_cycle_key', billingCycleKey)
          .maybeSingle();
        const raced = racedOrder as ExistingCycleOrder | null;
        if (!raced?.order_id) {
          await reportError(orderError, {
            context: 'spokedu_master.billing.issue',
            tags: { provider: 'tosspayments', stage: 'order_create_race', plan, status: 500 },
          });
          return fail(500);
        }
        existingCycleOrder = raced;
        if (raced.plan && raced.plan !== plan) return fail(409, '다른 상품의 결제가 진행 중입니다.', 'billing_other_plan_in_progress');
        if (raced.amount !== undefined && raced.amount !== amount) return fail(409, '주문 금액이 변경되었습니다. 결제 상태를 확인해 주세요.', 'billing_raced_amount_mismatch');
        orderId = raced.order_id;
      } else {
        await reportError(orderError, {
          context: 'spokedu_master.billing.issue',
          tags: { provider: 'tosspayments', stage: 'order_create', plan, status: 500 },
        });
        return fail(500);
      }
    } else {
      orderCreatedByThisInvocation = true;
    }
  } else if (
    existingCycleOrder.status === 'pending'
    || existingCycleOrder.status === 'failed'
    || existingCycleOrder.status === 'recoverable_failed'
  ) {
    await service
      .from('spokedu_master_payment_orders')
      .update({ last_error_code: null })
      .eq('order_id', orderId);
  }

  const { claimed, error: claimError } = await claimSpokeduMasterBillingOrder({ service, orderId, billingCycleKey });
  if (claimError) {
    await reportError(claimError, {
      context: 'spokedu_master.billing.issue',
      tags: { provider: 'tosspayments', stage: 'order_claim', plan, status: 500 },
    });
    return fail(500);
  }
  if (!claimed) {
    return NextResponse.json({
      error: '결제가 진행 중이거나 이미 완료되었습니다.',
    }, { status: 409 });
  }

  const { data: claimedOrderRow, error: claimedOrderError } = await service
    .from('spokedu_master_payment_orders')
    .select('order_id,status,payment_key,charge_state')
    .eq('order_id', orderId)
    .maybeSingle();
  const claimedOrder = claimedOrderRow as ExistingCycleOrder | null;
  if (claimedOrderError || !claimedOrder) {
    await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'claimed_order_lookup_failed', recoverable: true });
    return fail(503, '결제 주문 상태를 확인하지 못했습니다.', 'claimed_order_lookup_failed');
  }

  // A process can die after Toss approval but before payment_key persistence.
  // Recover by the immutable order id before asking for (or reusing) authKey.
  let previouslyApprovedPayment: Awaited<ReturnType<typeof findSpokeduMasterPaymentByOrderId>> = null;
  if (claimedOrder) {
    try {
      previouslyApprovedPayment = await findSpokeduMasterPaymentByOrderId({ orderId, amount });
    } catch (error) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId,
        lastErrorCode: 'payment_recovery_lookup_failed',
        recoverable: true,
      });
      await reportError(error, {
        context: 'spokedu_master.billing.issue',
        tags: { provider: 'tosspayments', stage: 'payment_recovery_lookup', plan, status: 502 },
      });
      return fail(502);
    }
    if (previouslyApprovedPayment) {
      if (claimedOrder.payment_key && claimedOrder.payment_key !== previouslyApprovedPayment.paymentKey) {
        await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'initial_payment_key_conflict', recoverable: true, operatorReview: true });
        return fail(502);
      }
      claimedOrder.payment_key = previouslyApprovedPayment.paymentKey;
      await service
        .from('spokedu_master_payment_orders')
        .update({ payment_key: previouslyApprovedPayment.paymentKey })
        .eq('order_id', orderId);
    }
  }

  // 이미 Toss 청구가 끝난 주문은 재청구하지 않고 apply만 재시도한다.
  if (shouldReapplySpokeduMasterBillingOrder(claimedOrder)) {
    if (!previouslyApprovedPayment) return fail(503, '기존 결제 승인 상태를 확인하지 못했습니다. 재결제하지 마세요.', 'billing_approval_unconfirmed');
    const billingKeySecretId = activeRow?.pending_billing_key_secret_id
      ?? activeRow?.provider_billing_key_secret_id
      ?? null;
    if (!billingKeySecretId) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId,
        lastErrorCode: 'billing_key_missing_after_charge',
        paymentKey: claimedOrder.payment_key,
        recoverable: true,
      });
      return NextResponse.json({
        error: '결제는 승인되었지만 자동결제 정보 복구가 필요합니다. 고객센터로 문의해 주세요.',
        charged: true,
        recoverable: true,
      }, { status: 500 });
    }

    const applyResult = await applySpokeduMasterPayment({
      userId: user.id,
      orderId,
      paymentKey: claimedOrder.payment_key,
      plan,
      amount,
      approvedAt: previouslyApprovedPayment.approvedAt,
      eventKey: `${billingCycleKey}:${claimedOrder.payment_key}`,
      source: isUpgrade ? 'upgrade' : 'initial',
      providerCustomerKey: body.customerKey,
      providerBillingKeySecretId: isUpgrade ? null : billingKeySecretId,
      billingCycleKey,
      periodOverride: upgradeQuote ? { periodStart: upgradeQuote.periodStart, periodEnd: upgradeQuote.periodEnd, nextBillingAt: upgradeQuote.nextBillingAt } : undefined,
    });

    if (!applyResult.ok) {
      await markSpokeduMasterBillingOrderFailed({
        service,
        orderId,
        lastErrorCode: applyResult.code,
        paymentKey: claimedOrder.payment_key,
        recoverable: true,
      });
      if (applyResult.status >= 500) return fail(500, '결제 확정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return fail(applyResult.status, '결제 확정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }

    return NextResponse.json({
      ok: true,
      alreadyConfirmed: applyResult.alreadyApplied,
      plan,
      periodEnd: applyResult.periodEnd,
      nextBillingAt: applyResult.nextBillingAt,
    });
  }

  let billingKeySecretId: string | null = null;
  let billingKey: string | null = null;
  let billingCustomerKey = body.customerKey;

  // An uncertain previous charge must only be reconciled, never submitted
  // again after the provider idempotency retention window has elapsed.
  if (!orderCreatedByThisInvocation && (legacyOrder || !['unattempted', 'declined'].includes(claimedOrder?.charge_state ?? ''))) {
    await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'initial_charge_outcome_unknown', recoverable: true });
    return NextResponse.json({ error: '이전 결제 승인 여부를 확인하고 있습니다. 재결제하지 마세요.', code: 'initial_charge_outcome_unknown', stage: 'approval', recoverable: true }, { status: 409 });
  }

  if (isUpgrade && activeRow?.provider_billing_key_secret_id && activeRow.provider_customer_key) {
    billingKeySecretId = activeRow.provider_billing_key_secret_id;
    billingCustomerKey = activeRow.provider_customer_key;
    billingKey = await readSpokeduMasterBillingKey({ userId: user.id, secretId: billingKeySecretId });
    if (!billingKey) {
      await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'billing_key_read_failed', recoverable: true });
      return fail(503, '기존 자동결제 수단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  } else {
    if (typeof body.authKey !== 'string' || !body.authKey.trim() || body.authKey.length > 2048) {
      await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'billing_auth_key_missing', recoverable: true });
      return fail(400, '자동결제 인증 정보가 필요합니다.');
    }

    let billing;
    try {
      billing = await issueSpokeduMasterBillingKey({ authKey: body.authKey, customerKey: body.customerKey });
    } catch (error) {
      await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'billing_key_issue_failed' });
      await reportError(error, { context: 'spokedu_master.billing.issue', tags: { provider: 'tosspayments', stage: 'billing_key_issue', plan, status: 502 } });
      const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        && /^[A-Z0-9_]{1,80}$/.test(error.code) ? error.code : 'BILLING_KEY_ISSUE_FAILED';
      return fail(502, '자동결제 수단을 등록하지 못했습니다.', code, 'billing_key');
    }
    if (!billing) {
      await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'billing_key_issue_failed' });
      return fail(400, '자동결제 수단을 등록하지 못했습니다.', 'billing_key_issue_failed', 'billing_key');
    }
    billingCustomerKey = billing.customerKey;
    if (billingCustomerKey !== body.customerKey) {
      await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'billing_customer_mismatch' });
      return fail(400, '결제 고객 정보가 일치하지 않습니다.', 'billing_customer_mismatch');
    }
    billingKey = billing.billingKey;
    billingKeySecretId = await storeSpokeduMasterBillingKey({ userId: user.id, billingKey });
    if (!billingKeySecretId) {
      await markSpokeduMasterBillingOrderFailed({ service, orderId, lastErrorCode: 'billing_key_store_failed', recoverable: true });
      return fail(503, '자동결제 설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }
  let payment;
  try {
    payment = previouslyApprovedPayment;
    if (!payment) {
      const { error: chargeStateError } = await service.from('spokedu_master_payment_orders').update({
        charge_state: 'request_started', charge_requested_at: new Date().toISOString(),
      }).eq('order_id', orderId);
      if (chargeStateError) return fail(503, '결제 요청 상태를 저장하지 못했습니다.', 'billing_charge_state_store_failed');
      payment = await paySpokeduMasterBillingKey({
        billingKey,
        customerKey: billingCustomerKey,
        plan,
        amount,
        orderId,
        orderName,
        customerEmail: user.email ?? '',
      });
    }
  } catch (error) {
    await service.from('spokedu_master_payment_orders').update({ charge_state: 'outcome_unknown' }).eq('order_id', orderId);
    await markSpokeduMasterBillingOrderFailed({
      service,
      orderId,
      lastErrorCode: 'initial_payment_exception',
      recoverable: true,
    });
    // A timeout/transport exception can happen after Toss accepted the charge.
    // Preserve the pending key so the next request can reconcile by orderId.
    await reportError(error, {
      context: 'spokedu_master.billing.issue',
      tags: {
        provider: 'tosspayments',
        stage: 'initial_payment',
        plan,
        status: 502,
        orderHash: hashForMonitoring(orderId),
      },
    });
    return fail(502);
  }

  if (!payment) {
    await service.from('spokedu_master_payment_orders').update({ charge_state: 'declined' }).eq('order_id', orderId);
    await markSpokeduMasterBillingOrderFailed({
      service,
      orderId,
      lastErrorCode: 'initial_payment_failed',
    });
    if (!isUpgrade) await cleanupPendingBillingAttempt({ userId: user.id, secretId: billingKeySecretId });
    return fail(400, '첫 결제가 승인되지 않았습니다.', 'initial_payment_failed', 'approval');
  }

  // 청구 성공 직후 payment_key를 남겨, apply 실패 시 재청구 없이 복구한다.
  await service
    .from('spokedu_master_payment_orders')
    .update({ payment_key: payment.paymentKey, charge_state: 'approved_unapplied' })
    .eq('order_id', orderId);

  const applyResult = await applySpokeduMasterPayment({
    userId: user.id,
    orderId,
    paymentKey: payment.paymentKey,
    plan,
    amount,
    approvedAt: payment.approvedAt,
    eventKey: `${billingCycleKey}:${payment.paymentKey}`,
    source: isUpgrade ? 'upgrade' : 'initial',
    providerCustomerKey: billingCustomerKey,
    providerBillingKeySecretId: isUpgrade ? null : billingKeySecretId,
    billingCycleKey,
    periodOverride: upgradeQuote ? { periodStart: upgradeQuote.periodStart, periodEnd: upgradeQuote.periodEnd, nextBillingAt: upgradeQuote.nextBillingAt } : undefined,
  });

  if (!applyResult.ok) {
    // 이미 청구·키 저장이 끝났으면 키를 지우지 않는다. payment_key로 apply만 재시도한다.
    await markSpokeduMasterBillingOrderFailed({
      service,
      orderId,
      lastErrorCode: applyResult.code,
      paymentKey: payment.paymentKey,
      recoverable: true,
    });
    await reportError(new Error(applyResult.code), {
      context: 'spokedu_master.billing.issue',
      tags: {
        provider: 'tosspayments',
        stage: 'apply_after_charge',
        plan,
        status: applyResult.status,
        orderHash: hashForMonitoring(orderId),
      },
    });
    if (applyResult.status >= 500) {
      return NextResponse.json(
        {
          error: '결제는 승인됐지만 이용권 반영에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          charged: true,
          recoverable: true,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        error: '결제는 승인됐지만 이용권 반영에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        charged: true,
        recoverable: true,
      },
      { status: applyResult.status },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyConfirmed: applyResult.alreadyApplied,
    plan,
    periodEnd: applyResult.periodEnd,
    nextBillingAt: applyResult.nextBillingAt,
  });
}
