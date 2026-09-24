/** Single Player Action Move duration. RUN is intentionally excluded. */
export const DIVE_ACTION_MOVE_BONUS_SEC = 60;

export type DiveActionMoveSelection = {
  side: boolean;
  jump: boolean;
  duck: boolean;
  bonus: boolean;
};

const ACTION_LABELS = [
  ['side', 'SIDE'],
  ['jump', 'JUMP'],
  ['duck', 'DUCK'],
] as const;

export function diveActionMoveStageCount(selection: DiveActionMoveSelection): number {
  return Number(selection.side) + Number(selection.jump) + Number(selection.duck) + Number(selection.bonus);
}

export function diveActionMoveDurationSec(selection: DiveActionMoveSelection, stageDurationSec: number): number {
  const actionCount = Number(selection.side) + Number(selection.jump) + Number(selection.duck);
  return actionCount * stageDurationSec + (selection.bonus ? DIVE_ACTION_MOVE_BONUS_SEC : 0);
}

export function formatDiveActionMoveDuration(totalSec: number): string {
  if (totalSec <= 0) return '0초';
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes === 0) return `${seconds}초`;
  if (seconds === 0) return `${minutes}분`;
  return `${minutes}분 ${seconds}초`;
}

/** Example: SIDE · JUMP · DUCK 60초 + BONUS 60초. */
export function formatDiveActionMoveDurationDetail(
  selection: DiveActionMoveSelection,
  stageDurationSec: number,
): string {
  const names = ACTION_LABELS.filter(([key]) => selection[key]).map(([, label]) => label);
  const actionSec = names.length * stageDurationSec;
  const parts: string[] = [];
  if (names.length > 0) parts.push(`${names.join(' · ')} ${actionSec}초`);
  if (selection.bonus) parts.push(`BONUS ${DIVE_ACTION_MOVE_BONUS_SEC}초`);
  return parts.join(' + ');
}
