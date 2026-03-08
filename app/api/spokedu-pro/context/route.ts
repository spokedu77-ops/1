/**
 * 스포키듀 구독 v2 context API.
 * D2: 인증 실패 시 401만 반환. /login 리다이렉트는 (pro) layout에서만 처리.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // v2: centers/members/subscriptions(50) 적용 후 activeCenter, centers, entitlement 채움.
  // 현재는 최소 응답만 반환(클라이언트가 401이 아님으로 로그인 상태 판단).
  return NextResponse.json({
    activeCenterId: null as string | null,
    centers: [] as Array<{ id: string; name: string; role: 'owner' | 'admin' | 'coach' }>,
    role: null as 'owner' | 'admin' | 'coach' | null,
    entitlement: {
      plan: 'free' as const,
      status: 'active' as const,
      isPro: false,
      reason: undefined as string | undefined,
    },
    billing: {
      priceKrw: 79900,
      promoPriceKrw: null as number | null,
      promoEndAt: null as string | null,
      currentPeriodEndAt: null as string | null,
    },
  });
}
