/**
 * 스포키듀 구독 v2 context API.
 * DB_READY 플래그:
 *   false — 최소 응답 (free plan) + usage는 tenant_content에서 조회
 *   true  — spokedu_pro_centers + spokedu_pro_subscriptions 실제 조회
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getAiReportUsageThisMonth, PLAN_LIMITS } from '@/app/lib/spokedu-pro/planUtils';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

type Plan = 'free' | 'basic' | 'pro';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
type CenterRole = 'owner' | 'admin' | 'coach';

/** tenant_content에서 학생 수 조회 */
async function getStudentCount(userId: string): Promise<number> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('spokedu_pro_tenant_content')
      .select('draft_value')
      .eq('owner_id', userId)
      .eq('key', 'students')
      .maybeSingle();
    const val = data?.draft_value as { students?: unknown[] } | null;
    return val?.students?.length ?? 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // usage는 DB_READY 무관하게 항상 조회
  const [studentCount, aiReportThisMonth] = await Promise.all([
    getStudentCount(user.id),
    getAiReportUsageThisMonth(user.id),
  ]);

  if (!DB_READY) {
    const limits = PLAN_LIMITS['free'];
    return NextResponse.json({
      activeCenterId: null as string | null,
      centers: [] as Array<{ id: string; name: string; role: CenterRole }>,
      role: null as CenterRole | null,
      entitlement: { plan: 'free' as Plan, status: 'active' as SubscriptionStatus, isPro: false },
      billing: {
        priceKrw: 79900,
        promoPriceKrw: null as number | null,
        promoEndAt: null as string | null,
        currentPeriodEndAt: null as string | null,
      },
      usage: {
        studentCount,
        studentLimit: limits.students,
        aiReportThisMonth,
        aiReportMonthlyLimit: limits.aiReportsPerMonth,
      },
      dbReady: false,
    });
  }

  // ── DB 실제 조회 ────────────────────────────────────────────────────
  try {
    const supabase = getServiceSupabase();

    const [{ data: memberRows }, { data: ownedCenters }] = await Promise.all([
      supabase
        .from('spokedu_pro_center_members')
        .select('center_id, role, spokedu_pro_centers(id, name)')
        .eq('user_id', user.id),
      supabase
        .from('spokedu_pro_centers')
        .select('id, name')
        .eq('owner_id', user.id),
    ]);

    const centersMap = new Map<string, { id: string; name: string; role: CenterRole }>();
    for (const owned of ownedCenters ?? []) {
      centersMap.set(owned.id, { id: owned.id, name: owned.name, role: 'owner' });
    }
    for (const member of memberRows ?? []) {
      const raw = member.spokedu_pro_centers;
      const center = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string } | null | undefined;
      if (center && !centersMap.has(center.id)) {
        centersMap.set(center.id, { id: center.id, name: center.name, role: member.role as CenterRole });
      }
    }

    const centers = Array.from(centersMap.values());
    const activeCenterId = centers.length > 0 ? centers[0].id : null;
    const activeCenter = activeCenterId ? centersMap.get(activeCenterId) : null;

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

    const limits = PLAN_LIMITS[entitlementPlan];

    return NextResponse.json({
      activeCenterId,
      centers,
      role: activeCenter?.role ?? null,
      entitlement: { plan: entitlementPlan, status: entitlementStatus, isPro },
      billing: { priceKrw: 79900, promoPriceKrw: null, promoEndAt: null, currentPeriodEndAt },
      usage: {
        studentCount,
        studentLimit: limits.students === Infinity ? null : limits.students,
        aiReportThisMonth,
        aiReportMonthlyLimit: limits.aiReportsPerMonth === Infinity ? null : limits.aiReportsPerMonth,
      },
      dbReady: true,
    });
  } catch {
    return NextResponse.json({
      activeCenterId: null,
      centers: [],
      role: null,
      entitlement: { plan: 'free' as Plan, status: 'active' as SubscriptionStatus, isPro: false },
      billing: { priceKrw: 79900, promoPriceKrw: null, promoEndAt: null, currentPeriodEndAt: null },
      usage: { studentCount, studentLimit: 10, aiReportThisMonth, aiReportMonthlyLimit: 0 },
      dbReady: false,
      error: 'db_error',
    });
  }
}
