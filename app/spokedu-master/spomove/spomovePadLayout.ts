import type { OfficialSpomovePreset } from './officialSpomovePresets';

export type SpomovePadLayoutVariant = 'grid2x2' | 'compass';

/** 반응인지 1번, 다이브·보너스, 사이먼 2번은 compass(다이아) 배치 */
export function getSpomovePadLayoutVariant(preset: OfficialSpomovePreset): SpomovePadLayoutVariant {
  if (preset.id === 'reaction-cognition-space-direction-01') return 'compass';
  if (preset.programGroup === 'dive' || preset.programGroup === 'bonus') return 'compass';
  if (preset.engine.mode === 'simon' && preset.engine.level === 2) return 'compass';
  return 'grid2x2';
}

export function getSpomovePadLayoutTitle(variant: SpomovePadLayoutVariant): string {
  return variant === 'compass' ? '다이아 패드 배치' : '기본 2×2 패드 배치';
}
