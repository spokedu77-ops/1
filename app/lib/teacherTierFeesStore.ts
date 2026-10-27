import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cloneTierFeeMap,
  HARD_CODED_TIER_FEES,
  TEACHER_TIER_IDS,
  type TeacherTierId,
  type TierFeeMap,
} from '@/app/lib/teacherTierSchedule';
import { devLogger } from '@/app/lib/logging/devLogger';

type TierFeeRow = {
  tier_id: TeacherTierId;
  fee_private: number | null;
  fee_group: number | null;
  fee_center_main: number | null;
  fee_center_assist: number | null;
};

export type TeacherTierFeeFetchResult = {
  map: TierFeeMap;
  /** DB에서 읽었으면 db, 테이블 없음/오류/빈 결과 시 하드코딩 폴백 */
  source: 'db' | 'fallback';
};

type TierFeeResponse = {
  fees?: TierFeeRow[];
  error?: string;
};

function buildMapFromRows(rows: TierFeeRow[]): TierFeeMap {
  const map = cloneTierFeeMap(HARD_CODED_TIER_FEES);
  const feeOrFallback = (value: number | null, fallback: number) =>
    value == null || !Number.isFinite(Number(value)) ? fallback : Number(value);
  for (const row of rows) {
    const tier = row.tier_id;
    if (!TEACHER_TIER_IDS.includes(tier)) continue;
    map[tier] = {
      fee_private: feeOrFallback(row.fee_private, HARD_CODED_TIER_FEES[tier].fee_private),
      fee_group: feeOrFallback(row.fee_group, HARD_CODED_TIER_FEES[tier].fee_group),
      fee_center_main: feeOrFallback(row.fee_center_main, HARD_CODED_TIER_FEES[tier].fee_center_main),
      fee_center_assist: feeOrFallback(row.fee_center_assist, HARD_CODED_TIER_FEES[tier].fee_center_assist),
    };
  }
  return map;
}

/**
 * 관리자 서버 API를 통해 `teacher_tier_fees`를 조회합니다.
 * 브라우저 세션의 테이블 RLS 결과에 의존하지 않으며, 실패·빈 결과 시 하드코딩 표로 폴백합니다.
 */
export async function fetchTeacherTierFeeMap(
  supabase: SupabaseClient | null
): Promise<TeacherTierFeeFetchResult> {
  if (!supabase) {
    devLogger.warn('[teacher_tier_fees] no supabase client, using HARD_CODED fallback');
    return { map: cloneTierFeeMap(HARD_CODED_TIER_FEES), source: 'fallback' };
  }
  try {
    const response = await fetch('/api/admin/teacher-tier-fees', {
      credentials: 'include',
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => ({}))) as TierFeeResponse;
    if (!response.ok) {
      throw new Error(payload.error || 'teacher_tier_fees_fetch_failed');
    }
    if (!payload.fees?.length) {
      devLogger.warn('[teacher_tier_fees] empty API result, using HARD_CODED fallback');
      return { map: cloneTierFeeMap(HARD_CODED_TIER_FEES), source: 'fallback' };
    }
    return { map: buildMapFromRows(payload.fees), source: 'db' };
  } catch (error) {
    devLogger.error('[teacher_tier_fees] API failed, using HARD_CODED fallback', error);
    return { map: cloneTierFeeMap(HARD_CODED_TIER_FEES), source: 'fallback' };
  }
}
