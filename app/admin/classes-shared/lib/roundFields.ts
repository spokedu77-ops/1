import { resolvePlannedTotal } from './plannedRoundTotal';

export type RoundFieldRow = {
  status?: string | null;
  round_total?: number | null;
  round_index?: number | null;
};

/** 표시·저장용 회차 번호: 1..total, 비정상 DB는 total로 캡 */
export function clampRoundIndex(roundIndex: number | null | undefined, total: number): number {
  const t = Math.max(1, Math.floor(total));
  if (typeof roundIndex !== 'number' || !Number.isFinite(roundIndex)) return 1;
  return Math.min(t, Math.max(1, Math.floor(roundIndex)));
}

export function formatRoundDisplay(roundIndex: number, total: number): string {
  const t = Math.max(1, Math.floor(total));
  const i = clampRoundIndex(roundIndex, t);
  return `${i}/${t}`;
}

export function isInvalidRoundPair(
  roundIndex: number | null | undefined,
  roundTotal: number | null | undefined
): boolean {
  if (typeof roundIndex !== 'number' || typeof roundTotal !== 'number') return false;
  if (!Number.isFinite(roundIndex) || !Number.isFinite(roundTotal)) return false;
  return roundTotal < 1 || roundIndex < 1 || roundIndex > roundTotal;
}

/** 활성 행 기준 계약 총회차 + 현재 회차로 round_* 스냅샷 생성 */
export function buildRoundSnapshot(
  rows: RoundFieldRow[],
  roundIndex: number | null | undefined
): { round_index: number; round_total: number; round_display: string } {
  const total = resolvePlannedTotal(rows);
  const index = clampRoundIndex(roundIndex, total);
  return {
    round_index: index,
    round_total: total,
    round_display: formatRoundDisplay(index, total),
  };
}
