export type VisualMode = 'legacy' | 'enhanced';

export interface SpaceEnvUpdateInput {
  dt:           number;
  speed:        number;
  cameraX:      number;
  isIntroPhase: boolean;
}

// enhanced 모드 파노라마 배경 보정값 — 밝기 완화, vignette 강화, grain 최소화
export const ENHANCED_VIGNETTE_SCALE = 1.4;
export const ENHANCED_GRAIN_SCALE    = 0.25;
