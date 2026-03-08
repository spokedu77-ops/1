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

/**
 * DB 마이그레이션 준비 여부.
 * 환경변수 SPOKEDU_PRO_DB_READY=true 설정 시 실제 DB 조회.
 * 미설정 시 free plan 최소 응답 반환 (기존 서비스 무중단 유지).
 */
const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

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
    // DB 마이그레이션 전: 최소 응답 (free plan, 인증 상태 확인용)
    return NextResponse.json({
      activeCenterId: null as string | null,
      centers: [] as Array<{ id: string; name: string; role: CenterRole }>,
      role: null as CenterRole | null,
      entitlement: {
        plan: 'free' as Plan,
        status: 'active' as SubscriptionStatus,
        isPro: false,
      },
      billing: {
        priceKrw: 79900,
        promoPriceKrw: null as number | null,
        promoEndAt: null as string | null,
        currentPeriodEndAt: null as string | null,
      },
      dbReady: false,
    });
  }

  // ── DB 실제 조회 (SPOKEDU_PRO_DB_READY=true 시) ─────────────────────
  try {
    const supabase = getServiceSupabase();

    // 1. 멤버 센터 조회
    const { data: memberRows } = await supabase
      .from('spokedu_pro_center_members')
      .select('center_id, role, spokedu_pro_centers(id, name)')
      .eq('user_id', user.id);

    // 2. owner 센터 조회
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
      dbReady: true,
    });
  } catch {
    // DB 조회 실패 시 free plan 반환 (테이블 미생성 등 방어)
    return NextResponse.json({
      activeCenterId: null,
      centers: [],
      role: null,
      entitlement: { plan: 'free' as Plan, status: 'active' as SubscriptionStatus, isPro: false },
      billing: { priceKrw: 79900, promoPriceKrw: null, promoEndAt: null, currentPeriodEndAt: null },
      dbReady: false,
      error: 'db_error',
    });
  }
}
