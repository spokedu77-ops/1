import { NextResponse } from 'next/server';

import { hashForMonitoring, reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import {
  issueSpokeduMasterBillingKey,
  isSpokeduMasterBillingProviderConfigured,
  paySpokeduMasterBillingKey,
} from '@/app/lib/server/spokeduMasterBillingProvider';
import {
  deleteSpokeduMasterBillingKey,
  storeSpokeduMasterBillingKey,
} from '@/app/lib/server/spokeduMasterBillingKeyVault';
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

function fail(status: number, error = '결제를 처리하지 못했습니다.') {
  return NextResponse.json({ error }, { status });
}

function normalizePaidPlan(plan: string | null | undefined): SpokeduMasterPaidPlan | null {
  if (plan === 'lite' || plan === 'premium') return plan;
  if (plan === 'pro') return 'premium';
  return null;
}

async function cleanupPendingBillingAttempt(input: {
  service: ReturnType<typeof getServiceSupabase>;
  userId: string;
  secretId: string;
}) {
  await input.service
    .from('spokedu_master_subscriptions')
    .delete()
    .eq('user_id', input.userId)
    .eq('status', 'pending')
    .eq('provider_billing_key_secret_id', input.secretId);
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
  if (activeSubscription) {
    const activeRow = subscription as BillingIssueSubscriptionRow | null;
    const activePlan = normalizePaidPlan(activeRow?.plan);
    const activePeriodEnd = activeRow?.current_period_end ?? activeRow?.period_end ?? null;

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

  let billing;
  try {
    billing = await issueSpokeduMasterBillingKey({
      authKey: body.authKey,
      customerKey: body.customerKey,
    });
  } catch (error) {
    await reportError(error, {
      context: 'spokedu_master.billing.issue',
      tags: { provider: 'tosspayments', stage: 'billing_key_issue', plan, status: 502 },
    });
    return fail(502);
  }
  if (!billing) return fail(400, '자동결제 수단을 등록하지 못했습니다.');

  const billingKeySecretId = await storeSpokeduMasterBillingKey({
    userId: user.id,
    billingKey: billing.billingKey,
  });
  if (!billingKeySecretId) return fail(503, '자동결제 설정이 완료되지 않았습니다.');

  const orderId = createSpokeduMasterOrderId(plan as SpokeduMasterPaidPlan, 'initial');
  const orderName = SPOKEDU_MASTER_PLAN_CONFIG[plan].name;
  const { error: orderError } = await service
    .from('spokedu_master_payment_orders')
    .upsert({
      order_id: orderId,
      user_id: user.id,
      plan,
      amount,
      status: 'pending',
      billing_cycle_key: `${billingMode}:${orderId}`,
    }, { onConflict: 'order_id' });

  if (orderError) {
    await deleteSpokeduMasterBillingKey({ userId: user.id, secretId: billingKeySecretId });
    await cleanupPendingBillingAttempt({ service, userId: user.id, secretId: billingKeySecretId });
    await reportError(orderError, {
      context: 'spokedu_master.billing.issue',
      tags: { provider: 'tosspayments', stage: 'order_create', plan, status: 500 },
    });
    return fail(500);
  }

  let payment;
  try {
    payment = await paySpokeduMasterBillingKey({
      billingKey: billing.billingKey,
      customerKey: billing.customerKey,
      plan,
      amount,
      orderId,
      orderName,
      customerEmail: user.email ?? '',
    });
  } catch (error) {
    await deleteSpokeduMasterBillingKey({ userId: user.id, secretId: billingKeySecretId });
    await cleanupPendingBillingAttempt({ service, userId: user.id, secretId: billingKeySecretId });
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
    await service
      .from('spokedu_master_payment_orders')
      .update({ status: 'failed', last_error_code: 'initial_payment_failed' })
      .eq('order_id', orderId);
    await deleteSpokeduMasterBillingKey({ userId: user.id, secretId: billingKeySecretId });
    await cleanupPendingBillingAttempt({ service, userId: user.id, secretId: billingKeySecretId });
    return fail(400, '첫 결제가 승인되지 않았습니다.');
  }

  const applyResult = await applySpokeduMasterPayment({
    userId: user.id,
    orderId,
    paymentKey: payment.paymentKey,
    plan,
    amount,
    approvedAt: payment.approvedAt,
    eventKey: `${billingMode}:${orderId}:${payment.paymentKey}`,
    source: 'initial',
    providerCustomerKey: billing.customerKey,
    providerBillingKeySecretId: billingKeySecretId,
    billingCycleKey: `${billingMode}:${orderId}`,
  });

  if (!applyResult.ok) {
    await deleteSpokeduMasterBillingKey({ userId: user.id, secretId: billingKeySecretId });
    await cleanupPendingBillingAttempt({ service, userId: user.id, secretId: billingKeySecretId });
    if (applyResult.status >= 500) return fail(500);
    return fail(applyResult.status, '결제 확정에 실패했습니다.');
  }

  return NextResponse.json({
    ok: true,
    alreadyConfirmed: applyResult.alreadyApplied,
    plan,
    periodEnd: applyResult.periodEnd,
    nextBillingAt: applyResult.nextBillingAt,
  });
}
