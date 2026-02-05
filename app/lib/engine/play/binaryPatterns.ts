/**
 * BINARY operator tick 패턴 (20 tick = 10초)
 * blockIndex/setIndex 기반 deterministic 선택 → 블록/세트마다 리듬 차이
 */

import { PLAY_RULES } from '@/app/lib/constants/rules';

const SET = PLAY_RULES.TICKS.SET;

function fromString(s: string): boolean[] {
  return s.padEnd(SET, '0').slice(0, SET).split('').map((c) => c === '1');
}

/** steady: 101010... (기존 동일, backward compatible) */
export const PATTERN_STEADY = fromString('10101010101010101010');
/** accent: 110110... (강조) */
export const PATTERN_ACCENT = fromString('11011011011011011011');
/** breath: 100010... (간격/기대감) */
export const PATTERN_BREATH = fromString('10001000100010001000');

export const BINARY_PATTERNS: boolean[][] = [PATTERN_STEADY, PATTERN_ACCENT, PATTERN_BREATH];

/**
 * 패턴 길이를 targetLength로 맞춤 (짧으면 반복, 길면 자르기). deterministic 유지.
 */
export function normalizePattern(pattern: boolean[], targetLength: number): boolean[] {
  if (pattern.length === targetLength) return pattern;
  if (pattern.length === 0) return Array(targetLength).fill(false);
  const out: boolean[] = [];
  for (let i = 0; i < targetLength; i++) out.push(pattern[i % pattern.length]!);
  return out;
}

/**
 * Deterministic: blockIndex + setIndex로 패턴 선택 (Draft/스키마 변경 없음)
 */
export function getBinaryPatternForSet(blockIndex: number, setIndex: 1 | 2): boolean[] {
  const idx = (blockIndex * 2 + (setIndex - 1)) % BINARY_PATTERNS.length;
  return BINARY_PATTERNS[idx]!;
}
