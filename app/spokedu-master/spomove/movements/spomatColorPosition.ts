import type { SpomatColor } from './movementTypes';

/** 화면을 바라보는 참가자 기준 스포매트 색 배치 (단일 출처) */
export const SPOMAT_COLOR_POSITION = {
  red: { row: 'front', column: 'left', clockPosition: 11 },
  yellow: { row: 'front', column: 'right', clockPosition: 1 },
  green: { row: 'back', column: 'left', clockPosition: 7 },
  blue: { row: 'back', column: 'right', clockPosition: 5 },
} as const satisfies Record<
  SpomatColor,
  { row: 'front' | 'back'; column: 'left' | 'right'; clockPosition: number }
>;

/** 참가자·화면 기준 왼쪽 색 */
export const SPOMAT_LEFT_COLORS: readonly SpomatColor[] = ['red', 'green'];

/** 참가자·화면 기준 오른쪽 색 */
export const SPOMAT_RIGHT_COLORS: readonly SpomatColor[] = ['yellow', 'blue'];

export function isLeftSpomatColor(color: SpomatColor) {
  return SPOMAT_LEFT_COLORS.includes(color);
}

export function isRightSpomatColor(color: SpomatColor) {
  return SPOMAT_RIGHT_COLORS.includes(color);
}
