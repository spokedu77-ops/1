/**
 * PAD_GRID - 단일 Source of Truth
 * 색 매핑은 이 파일에서만 정의, 중복 하드코딩 금지
 */

export type PADColor = 'red' | 'green' | 'yellow' | 'blue';

/** 2x2 그리드 위치 (StageA 4분할) */
export type PadPosition = 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';

/** PAD_GRID: 위치 → 색 (absolute constants) */
/** 4분할: 빨강/초록(위), 파랑/노랑(아래) */
export const PAD_GRID: Record<PadPosition, PADColor> = {
  TOP_LEFT: 'red',
  TOP_RIGHT: 'green',
  BOTTOM_LEFT: 'blue',
  BOTTOM_RIGHT: 'yellow',
} as const;

/** 색 → Hex (렌더용) */
export const PAD_COLORS: Record<PADColor, string> = {
  red: '#FF0000',
  green: '#00FF00',
  yellow: '#FFFF00',
  blue: '#0000FF',
} as const;

/** PAD_GRID 역매핑: 색 → 위치 */
export const COLOR_TO_POSITION: Record<PADColor, PadPosition> = {
  red: 'TOP_LEFT',
  green: 'TOP_RIGHT',
  blue: 'BOTTOM_LEFT',
  yellow: 'BOTTOM_RIGHT',
} as const;

/** 2x2 그리드 인덱스 (row, col) → 색. StageA 셀 배치 검증용 */
export const PAD_POSITIONS: PADColor[][] = [
  [PAD_GRID.TOP_LEFT, PAD_GRID.TOP_RIGHT],
  [PAD_GRID.BOTTOM_LEFT, PAD_GRID.BOTTOM_RIGHT],
];

/** Week3 ANTI: 대각선 매핑 RED↔YELLOW, GREEN↔BLUE (4분할: 빨강/초록 | 파랑/노랑) */
export function diagonal(color: PADColor): PADColor {
  const map: Record<PADColor, PADColor> = {
    red: 'yellow',
    yellow: 'red',
    green: 'blue',
    blue: 'green',
  };
  return map[color];
}

/** StageA 4분할 화면 셀 배치가 PAD_GRID와 1:1 동일한지 검증 */
export function assertPadGridMatch(grid: PADColor[][]): void {
  if (grid.length !== 2 || grid[0]?.length !== 2 || grid[1]?.length !== 2) {
    throw new Error('assertPadGridMatch: grid must be 2x2');
  }
  if (grid[0][0] !== PAD_GRID.TOP_LEFT || grid[0][1] !== PAD_GRID.TOP_RIGHT) {
    throw new Error(`assertPadGridMatch: top row mismatch. expected [red, green], got [${grid[0][0]}, ${grid[0][1]}]`);
  }
  if (grid[1][0] !== PAD_GRID.BOTTOM_LEFT || grid[1][1] !== PAD_GRID.BOTTOM_RIGHT) {
    throw new Error(`assertPadGridMatch: bottom row mismatch. expected [blue, yellow], got [${grid[1][0]}, ${grid[1][1]}]`);
  }
}
