import { NextResponse } from 'next/server';

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
import { storeSpokeduMasterBillingKey } from '@/app/lib/server/spokeduMasterBillingKeyVault';
import { applySpokeduMasterPayment } from '@/app/lib/server/spokeduMasterPaymentApply';
import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  createSpokeduMasterOrderId,
  isSpokeduMasterPaidPlan,
  type SpokeduMasterPaidPlan,
} from '@/app/lib/server/spokeduMasterPayment';
import { isSpokeduMasterPaidPlanActive, type SpokeduMasterSubscriptionRow } from '@/app/lib/server/spokeduMasterAccess';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

type BillingIssueBody = {
  plan?: string;
  planId?: string;
  authKey?: string;
  customerKey?: string;
  amount?: number;
};

type BillingIssueSubscriptionRow = SpokeduMasterSubscriptionRow & {
  current_period_end?: string | null;
  provider_billing_key_secret_id?: string | null;
};

type ExistingCycleOrder = {
  order_id: string;
  status: string | null;
  payment_key: string | null;
};

function fail(status: number, error = '결제를 처리하지 못했습니다.') {
  return NextResponse.json({ error }, { status });
}

function normalizePaidPlan(plan: string | null | undefined): SpokeduMasterPaidPlan | null {
  if (plan === 'lite' || plan === 'premium') return plan;
  if (plan === 'pro') return 'premium';
  return null;
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

  const requestedPlan = body.planId ?? body.plan;
  if (requestedPlan === 'pro' || requestedPlan === 'team' || requestedPlan === 'center') {
    return fail(400, '직접 결제 가능한 상품이 아닙니다.');
  }
  if (!isSpokeduMasterPaidPlan(requestedPlan)) {
    return fail(400, '직접 결제 가능한 상품이 아닙니다.');
  }
  if (!body.authKey || !body.customerKey) {
    return fail(400, '자동결제 인증 정보가 필요합니다.');
  }
  const expectedCustomerKey = `spm_${user.id.replaceAll('-', '')}`;
  if (body.customerKey !== expectedCustomerKey) {
    return fail(400, '결제 고객 정보가 일치하지 않습니다.');
  }
  if (!isSpokeduMasterBillingProviderConfigured()) {
    return fail(503, '자동결제 설정이 완료되지 않았습니다.');
  }

  const plan = requestedPlan;
  const amount = SPOKEDU_MASTER_PLAN_CONFIG[plan].amount;
  if (body.amount !== undefined && body.amount !== amount) {
    return fail(400, '결제 금액이 상품 계약과 일치하지 않습니다.');
  }

  const isAdmin = await isPlatformAdminUser(user, supabase);
  if (isAdmin) return fail(409, '관리자 권한에는 결제가 필요하지 않습니다.');

  const service = getServiceSupabase();
  const { data: subscription, error: subscriptionError } = await service
    .from('spokedu_master_subscriptions')
    .select('plan,status,period_end,current_period_end,provider_billing_key_secret_id')
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

  const billingMode = activeSubscription ? 'upgrade' : 'initial';
  // 사용자·모드·플랜 단위 결정론적 키. 만료 후 재구독은 아래서 suffix를 붙인다.
  let billingCycleKey = `${billingMode}:${user.id}:${plan}`;

  const { data: existingCycleOrderRaw, error: cycleLookupError } = await service
    .from('spokedu_master_payment_orders')
    .select('order_id,status,payment_key')
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

  if (existingCycleOrder?.status === 'active' && existingCycleOrder.payment_key) {
    if (activeSubscription && activePlan === plan) {
      return NextResponse.json({
        error: '이미 활성화된 이용권입니다.',
        plan,
        periodEnd: activePeriodEnd,
      }, { status: 409 });
    }
    // 이전 주기의 완료 주문 — 재구독은 새 cycle key로 분리한다.
    billingCycleKey = `${billingMode}:${user.id}:${plan}:${Date.now()}`;
    existingCycleOrder = null;
  }

  let orderId = typeof existingCycleOrder?.order_id === 'string' && existingCycleOrder.order_id
    ? existingCycleOrder.order_id
    : createSpokeduMasterOrderId(plan as SpokeduMasterPaidPlan, 'initial');
  const orderName = SPOKEDU_MASTER_PLAN_CONFIG[plan].name;

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
          .select('order_id,status,payment_key')
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
        orderId = raced.order_id;
      } else {
        await reportError(orderError, {
          context: 'spokedu_master.billing.issue',
          tags: { provider: 'tosspayments', stage: 'order_create', plan, status: 500 },
        });
        return fail(500);
      }
    }
  } else if (
    existingCycleOrder.status === 'pending'
    || existingCycleOrder.status === 'failed'
    || existingCycleOrder.status === 'recoverable_failed'
  ) {
    await service
      .from('spokedu_master_payment_orders')
      .update({ plan, amount, last_error_code: null })
      .eq('order_id', orderId);
  }

  const { claimed, error: claimError } = await claimSpokeduMasterBillingOrder({ service, orderId });
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

  const { data: claimedOrderRow } = await service
    .from('spokedu_master_payment_orders')
    .select('order_id,status,payment_key')
    .eq('order_id', orderId)
    .maybeSingle();
  const claimedOrder = claimedOrderRow as ExistingCycleOrder | null;

  // 이미 Toss 청구가 끝난 주문은 재청구하지 않고 apply만 재시도한다.
  if (shouldReapplySpokeduMasterBillingOrder(claimedOrder)) {
    let billingKeySecretId = activeRow?.provider_billing_key_secret_id ?? null;
    if (!billingKeySecretId) {
      let billing;
      try {
        billing = await issueSpokeduMasterBillingKey({
          authKey: body.authKey,
          customerKey: body.customerKey,
        });
      } catch (error) {
        await markSpokeduMasterBillingOrderFailed({
          service,
          orderId,
          lastErrorCode: 'billing_key_issue_failed',
          paymentKey: claimedOrder.payment_key,
          recoverable: true,
        });
        await reportError(error, {
          context: 'spokedu_master.billing.issue',
          tags: { provider: 'tosspayments', stage: 'billing_key_issue_reapply', plan, status: 502 },
        });
        return fail(502);
      }
      if (!billing) {
        await markSpokeduMasterBillingOrderFailed({
          service,
          orderId,
          lastErrorCode: 'billing_key_issue_failed',
          paymentKey: claimedOrder.payment_key,
          recoverable: true,
        });
        return fail(400, '자동결제 수단을 등록하지 못했습니다.');
      }
      billingKeySecretId = await storeSpokeduMasterBillingKey({
        userId: user.id,
        billingKey: billing.billingKey,
      });
      if (!billingKeySecretId) {
        await markSpokeduMasterBillingOrderFailed({
          service,
          orderId,
          lastErrorCode: 'billing_key_store_failed',
          paymentKey: claimedOrder.payment_key,
          recoverable: true,
        });
        return fail(503, '자동결제 설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }

    const applyResult = await applySpokeduMasterPayment({
      userId: user.id,
      orderId,
      paymentKey: claimedOrder.payment_key,
      plan,
      amount,
      eventKey: `${billingCycleKey}:${claimedOrder.payment_key}`,
      source: 'initial',
      providerCustomerKey: body.customerKey,
      providerBillingKeySecretId: billingKeySecretId,
      billingCycleKey,
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

  let billing;
  try {
    billing = await issueSpokeduMasterBillingKey({
      authKey: body.authKey,
      customerKey: body.customerKey,
    });
  } catch (error) {
    await markSpokeduMasterBillingOrderFailed({
      service,
      orderId,
      lastErrorCode: 'billing_key_issue_failed',
    });
    await reportError(error, {
      context: 'spokedu_master.billing.issue',
      tags: { provider: 'tosspayments', stage: 'billing_key_issue', plan, status: 502 },
    });
    return fail(502);
  }
  if (!billing) {
    await markSpokeduMasterBillingOrderFailed({
      service,
      orderId,
      lastErrorCode: 'billing_key_issue_failed',
    });
    return fail(400, '자동결제 수단을 등록하지 못했습니다.');
  }

  let payment;
  try {
    payment = await findSpokeduMasterPaymentByOrderId({ orderId, amount });
    if (!payment) {
      payment = await paySpokeduMasterBillingKey({
        billingKey: billing.billingKey,
        customerKey: billing.customerKey,
        plan,
        amount,
        orderId,
        orderName,
        customerEmail: user.email ?? '',
      });
    }
  } catch (error) {
    await markSpokeduMasterBillingOrderFailed({
      service,
      orderId,
      lastErrorCode: 'initial_payment_exception',
      recoverable: true,
    });
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
    await markSpokeduMasterBillingOrderFailed({
      service,
      orderId,
      lastErrorCode: 'initial_payment_failed',
    });
    return fail(400, '첫 결제가 승인되지 않았습니다.');
  }

  // 청구 성공 직후 payment_key를 남겨, apply 실패 시 재청구 없이 복구한다.
  await service
    .from('spokedu_master_payment_orders')
    .update({ payment_key: payment.paymentKey })
    .eq('order_id', orderId);

  // Vault 저장은 청구 성공 이후 — 업그레이드 시 기존 키를 청구 전에 지우지 않는다.
  const billingKeySecretId = await storeSpokeduMasterBillingKey({
    userId: user.id,
    billingKey: billing.billingKey,
  });
  if (!billingKeySecretId) {
    await markSpokeduMasterBillingOrderFailed({
      service,
      orderId,
      lastErrorCode: 'billing_key_store_failed',
      paymentKey: payment.paymentKey,
      recoverable: true,
    });
    return fail(503, '자동결제 설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }

  const applyResult = await applySpokeduMasterPayment({
    userId: user.id,
    orderId,
    paymentKey: payment.paymentKey,
    plan,
    amount,
    approvedAt: payment.approvedAt,
    eventKey: `${billingCycleKey}:${payment.paymentKey}`,
    source: 'initial',
    providerCustomerKey: billing.customerKey,
    providerBillingKeySecretId: billingKeySecretId,
    billingCycleKey,
  });

  if (!applyResult.ok) {
    // 이미 청구·키 저장이 끝났으면 키를 지우지 않는다. webhook/재시도로 확정한다.
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
      return fail(500, '결제는 승인됐지만 이용권 반영에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
    return fail(applyResult.status, '결제는 승인됐지만 이용권 반영에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }

  return NextResponse.json({
    ok: true,
    alreadyConfirmed: applyResult.alreadyApplied,
    plan,
    periodEnd: applyResult.periodEnd,
    nextBillingAt: applyResult.nextBillingAt,
  });
}
