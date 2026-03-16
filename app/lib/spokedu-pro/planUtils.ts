/**
 * 플랜 유틸리티.
 * 사용자 플랜 조회 + 기능 한도 상수 + AI 리포트 사용량 추적.
 */

import { getServiceSupabase } from '@/app/lib/server/adminAuth';

export type Plan = 'free' | 'basic' | 'pro';

export const PLAN_PRICES: Record<Plan, number> = {
  free:  0,
  basic: 49900,
  pro:   79900,
};

export const PLAN_LIMITS: Record<Plan, { aiReportsPerMonth: number; maxClasses: number | null }> = {
  free:  { aiReportsPerMonth: 0,        maxClasses: 1    },
  basic: { aiReportsPerMonth: 20,       maxClasses: 3    },
  pro:   { aiReportsPerMonth: Infinity, maxClasses: null },
};

/** 사용자의 현재 활성 플랜 반환. 조회 실패 시 'free'. */
export async function getPlanForUser(userId: string): Promise<Plan> {
  try {
    const supabase = getServiceSupabase();

    const { data: ownedCenters } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    let centerId: string | undefined = ownedCenters?.[0]?.id;

    if (!centerId) {
      const { data: memberRows } = await supabase
        .from('spokedu_pro_center_members')
        .select('center_id')
        .eq('user_id', userId)
        .limit(1);
      centerId = memberRows?.[0]?.center_id;
    }

    if (!centerId) return 'free';

    const { data: sub } = await supabase
      .from('spokedu_pro_subscriptions')
      .select('plan, status')
      .eq('center_id', centerId)
      .maybeSingle();

    if (!sub) return 'free';

    const isActive = sub.status === 'active' || sub.status === 'trialing';
    return isActive ? (sub.plan as Plan) : 'free';
  } catch {
    return 'free';
  }
}

// ── AI 리포트 사용량 (tenant_content key='ai_report_usage') ──────────────

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

type UsageValue = { months?: Record<string, number> };

export async function getAiReportUsageThisMonth(userId: string): Promise<number> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('spokedu_pro_tenant_content')
      .select('draft_value')
      .eq('owner_id', userId)
      .eq('key', 'ai_report_usage')
      .maybeSingle();

    const val = data?.draft_value as UsageValue | null;
    return val?.months?.[currentMonthKey()] ?? 0;
  } catch {
    return 0;
  }
}

/**
 * AI 리포트 사용량을 원자적으로 +1.
 * Supabase RPC increment_ai_report_usage 를 호출해 race condition 없이 카운트.
 */
export async function incrementAiReportUsage(userId: string): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    await supabase.rpc('increment_ai_report_usage', {
      p_owner_id: userId,
      p_month_key: currentMonthKey(),
    });
  } catch {
    // 사용량 저장 실패는 무시 (리포트 생성 자체는 성공으로 처리)
  }
}
