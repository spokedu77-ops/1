/**
 * 스포키듀 구독 v2 context API.
 * D2: 인증 실패 시 401만 반환. /login 리다이렉트는 (pro) layout에서만 처리.
 *
 * DB_READY 플래그:
 *   false (현재) — 최소 응답 반환
 *   true  (DB 마이그레이션 후) — spokedu_pro_centers + spokedu_pro_subscriptions 실제 조회
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

/** DB 마이그레이션(20260308000000_spokedu_pro_commercial.sql) 완료 후 true로 전환 */
const DB_READY = false;

type Plan = 'free' | 'basic' | 'pro';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
type CenterRole = 'owner' | 'admin' | 'coach';

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!DB_READY) {
    // DB 마이그레이션 전: 최소 응답 (클라이언트가 401이 아님으로 로그인 상태 판단)
    return NextResponse.json({
      activeCenterId: null as string | null,
      centers: [] as Array<{ id: string; name: string; role: CenterRole }>,
      role: null as CenterRole | null,
      entitlement: {
        plan: 'free' as Plan,
        status: 'active' as SubscriptionStatus,
        isPro: false,
        reason: 'DB not ready. Apply migration to enable subscriptions.' as string | undefined,
      },
      billing: {
        priceKrw: 79900,
        promoPriceKrw: null as number | null,
        promoEndAt: null as string | null,
        currentPeriodEndAt: null as string | null,
      },
    });
  }

  // ── DB 실제 조회 (마이그레이션 후) ────────────────────────────────────
  const supabase = getServiceSupabase();

  // 1. 멤버 센터 조회
  const { data: memberRows } = await supabase
    .from('spokedu_pro_center_members')
    .select('center_id, role, spokedu_pro_centers(id, name)')
    .eq('user_id', user.id);

  // 2. owner 센터 조회 (member 테이블에 없는 경우 포함)
  const { data: ownedCenters } = await supabase
    .from('spokedu_pro_centers')
    .select('id, name')
    .eq('owner_id', user.id);

  const centersMap = new Map<string, { id: string; name: string; role: CenterRole }>();
  for (const owned of ownedCenters ?? []) {
    centersMap.set(owned.id, { id: owned.id, name: owned.name, role: 'owner' });
  }
  for (const member of memberRows ?? []) {
    const center = member.spokedu_pro_centers as { id: string; name: string } | null;
    if (center && !centersMap.has(center.id)) {
      centersMap.set(center.id, { id: center.id, name: center.name, role: member.role as CenterRole });
    }
  }

  const centers = Array.from(centersMap.values());
  const activeCenterId = centers.length > 0 ? centers[0].id : null;
  const activeCenter = activeCenterId ? centersMap.get(activeCenterId) : null;

  // 3. 구독 조회
  let entitlementPlan: Plan = 'free';
  let entitlementStatus: SubscriptionStatus = 'active';
  let isPro = false;
  let currentPeriodEndAt: string | null = null;

  if (activeCenterId) {
    const { data: sub } = await supabase
      .from('spokedu_pro_subscriptions')
      .select('plan, status, current_period_end, trial_end')
      .eq('center_id', activeCenterId)
      .maybeSingle();

    if (sub) {
      const isActive = sub.status === 'active' || sub.status === 'trialing';
      entitlementPlan = sub.plan as Plan;
      entitlementStatus = sub.status as SubscriptionStatus;
      isPro = isActive && (sub.plan === 'pro' || sub.plan === 'basic');
      currentPeriodEndAt = (sub.current_period_end as string | null) ?? (sub.trial_end as string | null) ?? null;
    }
  }

  return NextResponse.json({
    activeCenterId,
    centers,
    role: activeCenter?.role ?? null,
    entitlement: { plan: entitlementPlan, status: entitlementStatus, isPro },
    billing: { priceKrw: 79900, promoPriceKrw: null, promoEndAt: null, currentPeriodEndAt },
  });
}
