import type { OfficialSpomovePreset } from './officialSpomovePresets';

export type SpomovePadLayoutVariant = 'grid2x2' | 'compass';

/** 화살표 자극 프로그램과 DIVE만 compass(다이아) 배치를 사용합니다. */
export function getSpomovePadLayoutVariant(preset: OfficialSpomovePreset): SpomovePadLayoutVariant {
  if (preset.id === 'dive-standard') return 'compass';
  if (preset.id.includes('arrow') || preset.title.includes('화살표')) return 'compass';
  return 'grid2x2';
}

export function getSpomovePadLayoutTitle(variant: SpomovePadLayoutVariant): string {
  return variant === 'compass' ? '다이아 패드 배치' : '기본 2×2 패드 배치';
}
