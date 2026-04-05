/**
 * 강사 등급(수업 개수) 및 등급별 기본 수업료 표.
 * 기본 표(HARD_CODED)는 fallback 이고, 운영값은 DB teacher_tier_fees로 덮어쓸 수 있습니다.
 */

export type TeacherTierId = 'rookie' | 'silver' | 'gold' | 'diamond' | 'partner';

export type TierDefaultFees = {
  fee_private: number;
  fee_group: number;
  fee_center_main: number;
  fee_center_assist: number;
};

export type TierFeeMap = Record<TeacherTierId, TierDefaultFees>;

/** 구간: 루키 1~50, 실버 51~105, 골드 106~165, 다이아 166~230, 파트너 231~ */
export const TEACHER_TIER_IDS: TeacherTierId[] = ['rookie', 'silver', 'gold', 'diamond', 'partner'];

const TIER_THRESHOLDS: { max: number | null; tier: TeacherTierId }[] = [
  { max: 50, tier: 'rookie' },
  { max: 105, tier: 'silver' },
  { max: 165, tier: 'gold' },
  { max: 230, tier: 'diamond' },
  { max: null, tier: 'partner' },
];

export const HARD_CODED_TIER_FEES: TierFeeMap = {
  rookie: { fee_private: 30_000, fee_group: 35_000, fee_center_main: 42_500, fee_center_assist: 25_000 },
  silver: { fee_private: 31_000, fee_group: 37_500, fee_center_main: 42_500, fee_center_assist: 27_500 },
  gold: { fee_private: 32_000, fee_group: 40_000, fee_center_main: 45_000, fee_center_assist: 30_000 },
  diamond: { fee_private: 33_000, fee_group: 42_500, fee_center_main: 47_500, fee_center_assist: 32_500 },
  partner: { fee_private: 35_000, fee_group: 45_000, fee_center_main: 50_000, fee_center_assist: 35_000 },
};

export function cloneTierFeeMap(source: TierFeeMap = HARD_CODED_TIER_FEES): TierFeeMap {
  return {
    rookie: { ...source.rookie },
    silver: { ...source.silver },
    gold: { ...source.gold },
    diamond: { ...source.diamond },
    partner: { ...source.partner },
  };
}

export function totalLessonsFromCounts(sessionCount: number | null | undefined, logCount: number | null | undefined): number {
  return (Number(sessionCount) || 0) + (Number(logCount) || 0);
}

export function computeTier(totalLessons: number): TeacherTierId {
  const n = Math.max(0, Math.floor(totalLessons));
  if (n <= 0) return 'rookie';
  for (const row of TIER_THRESHOLDS) {
    if (row.max == null || n <= row.max) return row.tier;
  }
  return 'rookie';
}

export function getTierDefaultFees(tier: TeacherTierId, feeMap?: Partial<TierFeeMap>): TierDefaultFees {
  const src = feeMap?.[tier] ?? HARD_CODED_TIER_FEES[tier];
  return {
    fee_private: Number(src?.fee_private) || HARD_CODED_TIER_FEES[tier].fee_private,
    fee_group: Number(src?.fee_group) || HARD_CODED_TIER_FEES[tier].fee_group,
    fee_center_main: Number(src?.fee_center_main) || HARD_CODED_TIER_FEES[tier].fee_center_main,
    fee_center_assist: Number(src?.fee_center_assist) || HARD_CODED_TIER_FEES[tier].fee_center_assist,
  };
}

export function tierLabelKo(tier: TeacherTierId): string {
  switch (tier) {
    case 'rookie':
      return '루키';
    case 'silver':
      return '실버';
    case 'gold':
      return '골드';
    case 'diamond':
      return '다이아몬드';
    case 'partner':
      return '스포키듀 파트너';
    default:
      return '루키';
  }
}

export function tierBadgeClass(tier: TeacherTierId): string {
  switch (tier) {
    case 'rookie':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'silver':
      return 'bg-slate-200 text-slate-800 border-slate-300';
    case 'gold':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'diamond':
      return 'bg-cyan-100 text-cyan-900 border-cyan-300';
    case 'partner':
      return 'bg-violet-100 text-violet-900 border-violet-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/** DB 값이 없을 때 등급표 기준 금액 */
export function effectiveFees(
  tier: TeacherTierId,
  stored: {
    fee_private: number | null;
    fee_group: number | null;
    fee_center_main: number | null;
    fee_center_assist: number | null;
  },
  feeMap?: Partial<TierFeeMap>
): TierDefaultFees {
  const d = getTierDefaultFees(tier, feeMap);
  return {
    fee_private: stored.fee_private ?? d.fee_private,
    fee_group: stored.fee_group ?? d.fee_group,
    fee_center_main: stored.fee_center_main ?? d.fee_center_main,
    fee_center_assist: stored.fee_center_assist ?? d.fee_center_assist,
  };
}
