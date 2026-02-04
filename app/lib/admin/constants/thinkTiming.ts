/**
 * Think 150s - Audience별 cue/blank 타이밍
 * cue_ms === blank_ms, 세션 내 속도 변화 금지
 */

export type Audience = 'preschool' | 'senior' | 'elementary' | 'teen' | 'adult';

export const AUDIENCE_CUE_BLANK_MS: Record<Audience, number> = {
  preschool: 900,
  senior: 900,
  elementary: 700,
  teen: 700,
  adult: 550,
} as const;

export function getCueBlankMs(audience: Audience): number {
  return AUDIENCE_CUE_BLANK_MS[audience];
}
