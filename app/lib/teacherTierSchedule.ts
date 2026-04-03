/**
 * 강사 등급(수업 개수) 및 등급별 기본 수업료 표.
 * 금액 변경은 배포로 반영 (운영에서 DB만으로 바꾸지 않음).
 */

export type TeacherTierId = 'rookie' | 'silver' | 'gold' | 'diamond' | 'partner';

export type TierDefaultFees = {
  fee_private: number;
  fee_group: number;
  fee_center_main: number;
  fee_center_assist: number;
};

/** 구간: 루키 1~50, 실버 51~105, 골드 106~165, 다이아 166~230, 파트너 231~ */
const TIER_ORDER: TeacherTierId[] = ['rookie', 'silver', 'gold', 'diamond', 'partner'];

const TIER_THRESHOLDS: { max: number | null; fees: TierDefaultFees }[] = [
  { max: 50, fees: { fee_private: 30_000, fee_group: 35_000, fee_center_main: 42_500, fee_center_assist: 25_000 } },
  { max: 105, fees: { fee_private: 31_000, fee_group: 37_500, fee_center_main: 42_500, fee_center_assist: 27_500 } },
  { max: 165, fees: { fee_private: 32_000, fee_group: 40_000, fee_center_main: 45_000, fee_center_assist: 30_000 } },
  { max: 230, fees: { fee_private: 33_000, fee_group: 42_500, fee_center_main: 47_500, fee_center_assist: 32_500 } },
  { max: null, fees: { fee_private: 35_000, fee_group: 45_000, fee_center_main: 50_000, fee_center_assist: 35_000 } },
];

export function totalLessonsFromCounts(sessionCount: number | null | undefined, logCount: number | null | undefined): number {
  return (Number(sessionCount) || 0) + (Number(logCount) || 0);
}

export function computeTier(totalLessons: number): TeacherTierId {
  const n = Math.max(0, Math.floor(totalLessons));
  if (n <= 0) return 'rookie';
  if (n <= 50) return 'rookie';
  if (n <= 105) return 'silver';
  if (n <= 165) return 'gold';
  if (n <= 230) return 'diamond';
  return 'partner';
}

export function getTierDefaultFees(tier: TeacherTierId): TierDefaultFees {
  const idx = TIER_ORDER.indexOf(tier);
  const row = TIER_THRESHOLDS[idx >= 0 ? idx : 0];
  return { ...row.fees };
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
  }
): TierDefaultFees {
  const d = getTierDefaultFees(tier);
  return {
    fee_private: stored.fee_private ?? d.fee_private,
    fee_group: stored.fee_group ?? d.fee_group,
    fee_center_main: stored.fee_center_main ?? d.fee_center_main,
    fee_center_assist: stored.fee_center_assist ?? d.fee_center_assist,
  };
}
