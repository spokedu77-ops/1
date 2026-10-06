import type { OfficialSpomovePreset } from './officialSpomovePresets';

export type SpomovePadLayoutVariant = 'grid2x2' | 'compass';

/** 화살표 자극 프로그램과 DIVE만 compass(다이아) 배치를 사용합니다. */
export function getSpomovePadLayoutVariant(preset: OfficialSpomovePreset): SpomovePadLayoutVariant {
  if (preset.id === 'dive-standard') return 'compass';
  // legacy id에만 arrow가 남아 있고 실제 자극은 음식 크기 비교입니다.
  if (preset.id === 'flanker-arrow-05') return 'grid2x2';
  if (preset.id.includes('arrow') || preset.title.includes('화살표')) return 'compass';
  return 'grid2x2';
}

export function getSpomovePadLayoutTitle(variant: SpomovePadLayoutVariant): string {
  return variant === 'compass' ? '다이아 패드 배치' : '기본 2×2 패드 배치';
}
