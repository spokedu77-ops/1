/**
 * Think 150s - 어디언스 3종: 900ms / 700ms / 550ms
 * 기본: cue_ms === blank_ms
 * 2색 구간: cue 1.5배 / blank 2배
 * 메모리: cue 기본×3 → blank 3배
 */

export type Audience = '900ms' | '700ms' | '550ms';

export const AUDIENCE_CUE_BLANK_MS: Record<Audience, number> = {
  '900ms': 900,
  '700ms': 700,
  '550ms': 550,
} as const;

export function getCueBlankMs(audience: Audience): number {
  return AUDIENCE_CUE_BLANK_MS[audience];
}

/** 2색 구간 (1주차 Stage D, 3·4주차 Stage C): cue 1.5배 / blank 2배 */
export function getCueBlankMsTwoColors(audience: Audience): { cueMs: number; blankMs: number } {
  const base = AUDIENCE_CUE_BLANK_MS[audience];
  return { cueMs: Math.round(base * 1.5), blankMs: base * 2 };
}

/** 메모리 구간: cue 기본×3, blank 3배 */
export function getMemoryTiming(audience: Audience): { cueMs: number; blank3xMs: number } {
  const base = AUDIENCE_CUE_BLANK_MS[audience];
  return { cueMs: base, blank3xMs: base * 3 };
}
