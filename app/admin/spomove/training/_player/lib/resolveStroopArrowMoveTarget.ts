import { COLORS, SPATIAL_ARROW_COLOR_BY_DIRECTION } from '../constants';

export const STROOP_ARROW_MOVE_TASK_CUE = {
  direction: '방향을 보세요',
  color: '색을 보세요',
} as const;

export type StroopArrowMoveDimension = 'direction' | 'color';

function colorIdFromFillHex(hex: string | undefined): string | null {
  if (!hex) return null;
  const normalized = hex.trim().toLowerCase();
  return COLORS.find((c) => c.bg.toLowerCase() === normalized)?.id ?? null;
}

function normalizeDimension(task: string | undefined): StroopArrowMoveDimension | null {
  if (task === 'direction') return 'direction';
  if (task === 'color' || task === 'fill') return 'color';
  return null;
}

/**
 * Stroop Arrow 움직임 정답 패드 색.
 * reverse는 음성 Task Switching용이며 이번 후보의 MOVE 규칙에는 적용하지 않는다.
 */
export function resolveStroopArrowMoveTarget(input: {
  arrowId: string;
  fillHex?: string;
  fillColorId?: string;
  stroopTask?: string;
  reverse?: boolean;
}): string | null {
  void input.reverse;
  const dimension = normalizeDimension(input.stroopTask);
  if (!dimension) return null;
  if (dimension === 'color') {
    return input.fillColorId ?? colorIdFromFillHex(input.fillHex);
  }
  return (
    SPATIAL_ARROW_COLOR_BY_DIRECTION[input.arrowId as keyof typeof SPATIAL_ARROW_COLOR_BY_DIRECTION] ??
    null
  );
}

export function resolveStroopArrowMovementCue(content: {
  stroopArrowResponse?: unknown;
  stroopArrowTask?: unknown;
} | null | undefined): string | null {
  if (content?.stroopArrowResponse !== 'movement') return null;
  if (content.stroopArrowTask === 'direction') return STROOP_ARROW_MOVE_TASK_CUE.direction;
  if (content.stroopArrowTask === 'fill' || content.stroopArrowTask === 'color') {
    return STROOP_ARROW_MOVE_TASK_CUE.color;
  }
  return null;
}

export function isStroopArrowCongruent(input: {
  arrowId: string;
  fillHex?: string;
  fillColorId?: string;
}): boolean {
  const fillId = input.fillColorId ?? colorIdFromFillHex(input.fillHex);
  const directionId =
    SPATIAL_ARROW_COLOR_BY_DIRECTION[input.arrowId as keyof typeof SPATIAL_ARROW_COLOR_BY_DIRECTION];
  return Boolean(fillId && directionId && fillId === directionId);
}
