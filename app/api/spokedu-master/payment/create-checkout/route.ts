import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import {
  isSpokeduMasterPaidPlanActive,
  type SpokeduMasterSubscriptionRow,
} from '@/app/lib/server/spokeduMasterAccess';
import {
  createSpokeduMasterOrderId,
  isSpokeduMasterDirectPurchasePlan,
  SPOKEDU_MASTER_PLAN_CONFIG,
  type SpokeduMasterPaidPlan,
} from '@/app/lib/server/spokeduMasterPayment';

const CHECKOUT_ERROR = '결제 정보를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const planKey = body.plan as SpokeduMasterPaidPlan;
  const plan = SPOKEDU_MASTER_PLAN_CONFIG[planKey];
  if (!plan || !isSpokeduMasterDirectPurchasePlan(planKey)) {
    return NextResponse.json({ error: '현재 직접 결제 가능한 상품은 Pro 30일 이용권입니다.' }, { status: 400 });
  }

  const isAdmin = await isPlatformAdminUser(user, supabase);
  if (isAdmin) {
    return NextResponse.json({ error: '이미 관리자 권한이 적용되어 결제가 필요하지 않습니다.' }, { status: 409 });
  }

  const service = getServiceSupabase();
  const { data: subscription, error: subscriptionError } = await service
    .from('spokedu_master_subscriptions')
    .select('plan,status,period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    await reportError(subscriptionError, {
      context: 'spokedu_master.payment.checkout',
      tags: {
        provider: 'tosspayments',
        stage: 'subscription_lookup',
        status: 500,
      },
    });
    return NextResponse.json({ error: '이용권 상태를 확인하지 못했습니다.' }, { status: 500 });
  }

  if (isSpokeduMasterPaidPlanActive(subscription as SpokeduMasterSubscriptionRow | null)) {
    return NextResponse.json({ error: '이미 활성 이용권이 있습니다. 이용권 확인 화면에서 상태를 확인해 주세요.' }, { status: 409 });
  }

  const orderId = createSpokeduMasterOrderId(planKey);
  const customerName = user.email?.split('@')[0] ?? 'SPOKEDU MASTER 사용자';

  const { error: orderError } = await service
    .from('spokedu_master_payment_orders')
    .upsert(
      {
        order_id: orderId,
        user_id: user.id,
        plan: planKey,
        amount: plan.amount,
        status: 'pending',
      },
      { onConflict: 'order_id' },
    );

  if (orderError) {
    await reportError(orderError, {
      context: 'spokedu_master.payment.checkout',
      tags: {
        provider: 'tosspayments',
        stage: 'order_create',
        plan: planKey,
        status: 500,
      },
    });
    return NextResponse.json({ error: CHECKOUT_ERROR }, { status: 500 });
  }

  return NextResponse.json({
    orderId,
    orderName: plan.name,
    amount: plan.amount,
    customerEmail: user.email ?? '',
    customerName,
  });
}
