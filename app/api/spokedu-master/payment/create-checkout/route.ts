import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import {
  isSpokeduMasterPaidPlanActive,
  type SpokeduMasterSubscriptionRow,
} from '@/app/lib/server/spokeduMasterAccess';

const PLAN_CONFIG = {
  pro: {
    name: 'SPOKEDU MASTER Pro 플랜',
    amount: 39900,
  },
  team: {
    name: 'SPOKEDU MASTER Center 플랜',
    amount: 79000,
  },
} as const;

type PlanKey = keyof typeof PLAN_CONFIG;

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

  const planKey = body.plan as PlanKey;
  const plan = PLAN_CONFIG[planKey];
  if (!plan) {
    return NextResponse.json({ error: '선택할 수 없는 플랜입니다.' }, { status: 400 });
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
    return NextResponse.json({ error: '구독 상태를 확인하지 못했습니다.' }, { status: 500 });
  }

  if (isSpokeduMasterPaidPlanActive(subscription as SpokeduMasterSubscriptionRow | null)) {
    return NextResponse.json({ error: '이미 활성 이용권이 있습니다. 구독 관리 화면에서 상태를 확인해 주세요.' }, { status: 409 });
  }

  const orderId = `spm-${planKey}-${Date.now()}`;
  const customerName = user.email?.split('@')[0] ?? '선생님';

  return NextResponse.json({
    orderId,
    orderName: plan.name,
    amount: plan.amount,
    customerEmail: user.email ?? '',
    customerName,
  });
}
