import type { LimbRule, SpomatColor } from './movementTypes';
import { limbMarkersForRule } from './movementPresentation';

export type LimbMarker = 'L' | 'R';

export type SpomatMovementDiagramModel = {
  /** 화면 방향 ↑ 기준: 빨강|노랑 / 초록|파랑 */
  colors: {
    red: LimbMarker | null;
    yellow: LimbMarker | null;
    green: LimbMarker | null;
    blue: LimbMarker | null;
  };
  /** 실물 매트에 중앙 대기 구역 없음 */
  hasCenterWaitZone: false;
  colorOrder: readonly [['red', 'yellow'], ['green', 'blue']];
};

export const SPOMAT_DIAGRAM_COLOR_ORDER = [
  ['red', 'yellow'],
  ['green', 'blue'],
] as const satisfies SpomatMovementDiagramModel['colorOrder'];

/**
 * free → L/R 없음
 * sameSide → 빨강·초록=L, 노랑·파랑=R
 * oppositeSide → 빨강·초록=R, 노랑·파랑=L
 */
export function buildSpomatMovementDiagramModel(
  limbRule: LimbRule = 'free',
): SpomatMovementDiagramModel {
  const markers = limbMarkersForRule(limbRule);
  const left = markers.left;
  const right = markers.right;
  return {
    colors: {
      red: left,
      yellow: right,
      green: left,
      blue: right,
    },
    hasCenterWaitZone: false,
    colorOrder: SPOMAT_DIAGRAM_COLOR_ORDER,
  };
}

export function diagramCellLabel(color: SpomatColor): string {
  switch (color) {
    case 'red':
      return '빨강';
    case 'yellow':
      return '노랑';
    case 'green':
      return '초록';
    case 'blue':
      return '파랑';
  }
}
