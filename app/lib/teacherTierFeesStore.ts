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

function buildMapFromRows(rows: TierFeeRow[]): TierFeeMap {
  const map = cloneTierFeeMap(HARD_CODED_TIER_FEES);
  for (const row of rows) {
    const tier = row.tier_id;
    if (!TEACHER_TIER_IDS.includes(tier)) continue;
    map[tier] = {
      fee_private: Number(row.fee_private) || HARD_CODED_TIER_FEES[tier].fee_private,
      fee_group: Number(row.fee_group) || HARD_CODED_TIER_FEES[tier].fee_group,
      fee_center_main: Number(row.fee_center_main) || HARD_CODED_TIER_FEES[tier].fee_center_main,
      fee_center_assist: Number(row.fee_center_assist) || HARD_CODED_TIER_FEES[tier].fee_center_assist,
    };
  }
  return map;
}

/**
 * `teacher_tier_fees` 조회. 실패·빈 테이블 시 하드코딩 표로 폴백하며 devLogger에 남김.
 */
export async function fetchTeacherTierFeeMap(
  supabase: SupabaseClient | null
): Promise<TeacherTierFeeFetchResult> {
  if (!supabase) {
    devLogger.warn('[teacher_tier_fees] no supabase client, using HARD_CODED fallback');
    return { map: cloneTierFeeMap(HARD_CODED_TIER_FEES), source: 'fallback' };
  }
  const { data, error } = await supabase
    .from('teacher_tier_fees')
    .select('tier_id, fee_private, fee_group, fee_center_main, fee_center_assist');
  if (error) {
    devLogger.error('[teacher_tier_fees] query failed, using HARD_CODED fallback', error);
    return { map: cloneTierFeeMap(HARD_CODED_TIER_FEES), source: 'fallback' };
  }
  if (!data?.length) {
    devLogger.warn('[teacher_tier_fees] empty or missing rows, using HARD_CODED fallback (apply sql/65 if needed)');
    return { map: cloneTierFeeMap(HARD_CODED_TIER_FEES), source: 'fallback' };
  }
  return { map: buildMapFromRows(data as TierFeeRow[]), source: 'db' };
}
