import { PAD_COLORS, PAD_POSITIONS } from '@/app/lib/admin/constants/padGrid';

/** 2×2 패드 라벨 — PAD_POSITIONS 행·열 순서와 동일 */
export const SPOMOVE_PAD_LAYOUT_LABELS = ['빨강', '노랑', '초록', '파랑'] as const;

/** UI 렌더용 2×2 hex 색 (TL→TR→BL→BR) */
export const SPOMOVE_PAD_GRID_HEX = PAD_POSITIONS.flat().map((colorId) => PAD_COLORS[colorId]);

export function getSpomovePadGridHexColors(): readonly string[] {
  return SPOMOVE_PAD_GRID_HEX;
}
