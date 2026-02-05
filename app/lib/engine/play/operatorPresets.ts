/**
 * Operator 프리셋 — 블록/세트별 자동 다양성 (선택 피로도 0)
 * timeline에서 (blockIndex, setIndex)로 선택해 BINARY 패턴 등에 적용
 */

import { PLAY_RULES } from '@/app/lib/constants/rules';
import { BINARY_PATTERNS, normalizePattern } from './binaryPatterns';

const SET = PLAY_RULES.TICKS.SET;

export type ImpactBias = 'low' | 'mid' | 'high';

export interface OperatorPreset {
  id: string;
  /** BINARY_PATTERNS 인덱스 (0=steady, 1=accent, 2=breath) */
  binaryPatternIndex: number;
  /** 향후 Renderer에서 block별 임팩트 강도 조절용 (P5에서는 미적용) */
  impactBias?: ImpactBias;
}

export const OPERATOR_PRESETS: OperatorPreset[] = [
  { id: 'calm_steady', binaryPatternIndex: 0, impactBias: 'low' },
  { id: 'calm_breath', binaryPatternIndex: 2, impactBias: 'low' },
  { id: 'standard_accent', binaryPatternIndex: 1, impactBias: 'mid' },
  { id: 'punchy_steady', binaryPatternIndex: 0, impactBias: 'high' },
  { id: 'punchy_accent', binaryPatternIndex: 1, impactBias: 'high' },
];

/**
 * Deterministic: blockIndex + setIndex로 프리셋 선택 (순환 다양화)
 */
export function getOperatorPreset(blockIndex: number, setIndex: 1 | 2): OperatorPreset {
  const idx = (blockIndex * 3 + (setIndex - 1) * 2) % OPERATOR_PRESETS.length;
  return OPERATOR_PRESETS[idx]!;
}

/**
 * 프리셋이 지정하는 BINARY 패턴 (boolean[]) 반환. 길이 SET로 정규화(짧으면 반복, 길면 자르기).
 */
export function getBinaryPatternFromPreset(blockIndex: number, setIndex: 1 | 2): boolean[] {
  const preset = getOperatorPreset(blockIndex, setIndex);
  const raw = BINARY_PATTERNS[preset.binaryPatternIndex] ?? BINARY_PATTERNS[0]!;
  return normalizePattern(raw, SET);
}
