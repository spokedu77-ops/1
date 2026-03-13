/**
 * 플랜 유틸리티.
 * 사용자 플랜 조회 + 기능 한도 상수 + AI 리포트 사용량 추적.
 * tenant_content 저장소를 사용하므로 SPOKEDU_PRO_DB_READY 무관하게 동작.
 */

import { getServiceSupabase } from '@/app/lib/server/adminAuth';

export type Plan = 'free' | 'basic' | 'pro';

export const PLAN_LIMITS: Record<Plan, { students: number; aiReportsPerMonth: number }> = {
  free:  { students: 10,       aiReportsPerMonth: 0        },
  basic: { students: 50,       aiReportsPerMonth: 20       },
  pro:   { students: Infinity, aiReportsPerMonth: Infinity },
};

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

/** 사용자의 현재 활성 플랜 반환. DB_READY=false 또는 조회 실패 시 'free'. */
export async function getPlanForUser(userId: string): Promise<Plan> {
  if (!DB_READY) return 'free';
  try {
    const supabase = getServiceSupabase();

    // 오너 센터 먼저
    const { data: ownedCenters } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    let centerId: string | undefined = ownedCenters?.[0]?.id;

    // 없으면 멤버 센터
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

function currentMonthKey(): string {
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

export async function incrementAiReportUsage(userId: string): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    const monthKey = currentMonthKey();

    const { data } = await supabase
      .from('spokedu_pro_tenant_content')
      .select('draft_value, version')
      .eq('owner_id', userId)
      .eq('key', 'ai_report_usage')
      .maybeSingle();

    const existing = data?.draft_value as UsageValue | null;
    const months: Record<string, number> = {
      ...(existing?.months ?? {}),
      [monthKey]: (existing?.months?.[monthKey] ?? 0) + 1,
    };
    const newVersion = (data?.version ?? 0) + 1;
    const now = new Date().toISOString();

    await supabase
      .from('spokedu_pro_tenant_content')
      .upsert(
        {
          owner_id: userId,
          key: 'ai_report_usage',
          draft_value: { months },
          published_value: { months },
          version: newVersion,
          draft_updated_at: now,
          published_at: now,
        },
        { onConflict: 'owner_id,key' }
      );
  } catch {
    // 사용량 저장 실패는 무시 (리포트 생성 자체는 성공으로 처리)
  }
}
