/**
 * Think Phase Layout Engine
 * 가변 레이아웃 시퀀스 관리 및 검증
 */

export type LayoutType = '1x1' | '1x2' | '1x3' | '2x2' | '2x3' | '3x3' | '4x4';
export type PoolType = 'actions' | 'objects';
export type RuleType = 'random' | 'sequence' | 'memory';
export type EasingType = 'ease-in-out' | 'linear';
export type ObjectPlacementType = 'preserve' | 'reset' | 'random';

/** Intro/휴식/Outro 구간: 룰 없이 전체 화면에 글자만 표시 */
export type TextOnlyLabel = 'intro' | 'rest1' | 'rest2' | 'outro';

export interface LayoutSequence {
  startTime: number; // 초
  endTime: number; // 초
  layout_type: LayoutType;
  pool: PoolType;
  max_active: 1 | 2 | 3 | 4;
  tempo_ms?: number; // 랜덤 속도 (ms)
  rule: RuleType;
  transition: {
    duration: number; // ms
    easing: EasingType;
  };
  objectPlacement: ObjectPlacementType;
  // Intro/휴식/Outro: 해당 구간이면 전체 화면에 글자만 표시
  textLabel?: TextOnlyLabel;
  // Cue/Blank 엔진: segment에 직접 포함되는 규칙 (재구성 시 타입 정의)
  think_rule?: {
    mode?: string;
    colorsAllowed?: ('red' | 'blue' | 'yellow' | 'green')[];
    cueMs?: number;
    blankMs?: number;
    [k: string]: unknown;
  };
}

export interface LayoutValidationResult {
  isValid: boolean;
  errors: string[];
}

/** Think Studio 표준 길이 (초) */
export const THINK_STUDIO_DURATION_SEC = 150;

/** Intro 5 → S1 20 → S2 20 → T 7.5 → S3 50 (25+25) → T 7.5 → S4 30 → Outro 10 */
export function getDefaultThinkSequence150(): LayoutSequence[] {
  const colors = ['red', 'blue', 'yellow', 'green'] as const;
  const defaultCueMs = 700; // youth 기본값
  const defaultBlankMs = 700; // youth 기본값
  return [
    { startTime: 0, endTime: 5, layout_type: '1x1', pool: 'actions', max_active: 1, rule: 'random', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', textLabel: 'intro', think_rule: { mode: 'full_text_only', colorsAllowed: [...colors] } },
    { startTime: 5, endTime: 25, layout_type: '2x2', pool: 'actions', max_active: 2, rule: 'random', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', think_rule: { mode: 'grid_one_hot_color', colorsAllowed: [...colors], cueMs: defaultCueMs, blankMs: defaultBlankMs } },
    { startTime: 25, endTime: 45, layout_type: '1x1', pool: 'actions', max_active: 1, rule: 'random', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', think_rule: { mode: 'full_single_color', colorsAllowed: [...colors], cueMs: defaultCueMs, blankMs: defaultBlankMs } },
    { startTime: 45, endTime: 52.5, layout_type: '1x1', pool: 'actions', max_active: 1, rule: 'random', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', textLabel: 'rest1', think_rule: { mode: 'full_text_only', colorsAllowed: [...colors] } },
    { startTime: 52.5, endTime: 77.5, layout_type: '1x3', pool: 'objects', max_active: 3, rule: 'random', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', think_rule: { mode: 'split_1to3_colors', colorsAllowed: [...colors], cueMs: defaultCueMs, blankMs: defaultBlankMs } },
    { startTime: 77.5, endTime: 102.5, layout_type: '1x3', pool: 'objects', max_active: 3, rule: 'random', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', think_rule: { mode: 'split_exactly_two', colorsAllowed: [...colors], distinct: true, simultaneousCount: 2, cueMs: defaultCueMs, blankMs: defaultBlankMs } },
    { startTime: 102.5, endTime: 110, layout_type: '1x1', pool: 'actions', max_active: 1, rule: 'random', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', textLabel: 'rest2', think_rule: { mode: 'full_text_only', colorsAllowed: [...colors] } },
    { startTime: 110, endTime: 140, layout_type: '1x3', pool: 'objects', max_active: 3, rule: 'memory', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', think_rule: { mode: 'split_memory_pattern', colorsAllowed: [...colors], blankMultiplier: 2, memory: { pattern: ['red', 'blue', 'yellow'] }, cueMs: 1890, blankMs: 630 } },
    { startTime: 140, endTime: 150, layout_type: '1x1', pool: 'actions', max_active: 1, rule: 'random', transition: { duration: 300, easing: 'ease-in-out' }, objectPlacement: 'preserve', textLabel: 'outro', think_rule: { mode: 'full_text_only', colorsAllowed: [...colors] } }
  ];
}

/**
 * 레이아웃 시퀀스 정규화
 * Apply/Save 직전에 무조건 호출하여 유효한 시퀀스로 변환
 */
export function normalizeLayoutSequence(
  seq: LayoutSequence[],
  maxSec: number = 120
): LayoutSequence[] {
  if (seq.length === 0) {
    // 결과가 비어있으면 기본 시퀀스 반환 (Think Studio 150초 기준)
    if (maxSec === THINK_STUDIO_DURATION_SEC) {
      return getDefaultThinkSequence150();
    }
    // 다른 경우 기본 1개 구간 생성
    return [{
      startTime: 0,
      endTime: maxSec,
      layout_type: '2x2',
      pool: 'actions',
      max_active: 2,
      rule: 'random',
      transition: { duration: 300, easing: 'ease-in-out' },
      objectPlacement: 'preserve'
    }];
  }

  // 1. start/end를 0~maxSec로 clamp하고 start < end 강제
  let normalized: LayoutSequence[] = seq.map(item => {
    let start = Math.max(0, Math.min(item.startTime, maxSec));
    let end = Math.max(0, Math.min(item.endTime, maxSec));

    // start < end 강제
    if (start >= end) {
      end = Math.min(start + 1, maxSec);
    }

    return {
      ...item,
      startTime: start,
      endTime: end
    };
  });

  // 2. 보정 후에도 start >= end면 해당 구간 drop
  normalized = normalized.filter(item => item.startTime < item.endTime);

  if (normalized.length === 0) {
    // 모든 구간이 drop되면 기본 구간 생성
    return [{
      startTime: 0,
      endTime: maxSec,
      layout_type: '2x2',
      pool: 'actions',
      max_active: 2,
      rule: 'random',
      transition: { duration: 300, easing: 'ease-in-out' },
      objectPlacement: 'preserve'
    }];
  }

  // 3. start 오름차순 정렬
  normalized.sort((a, b) => a.startTime - b.startTime);

  // 4. 첫 구간의 startTime을 0으로 강제
  if (normalized[0].startTime > 0) {
    normalized[0] = {
      ...normalized[0],
      startTime: 0
    };
  }

  // 5. 인접 구간의 next.start를 prev.end로 강제 (겹침/틈 제거)
  for (let i = 0; i < normalized.length - 1; i++) {
    const current = normalized[i];
    const next = normalized[i + 1];

    // next.start를 current.end로 강제
    normalized[i + 1] = {
      ...next,
      startTime: current.endTime
    };

    // start >= end가 되면 end 조정
    if (normalized[i + 1].startTime >= normalized[i + 1].endTime) {
      normalized[i + 1] = {
        ...normalized[i + 1],
        endTime: Math.min(normalized[i + 1].startTime + 1, maxSec)
      };
    }
  }

  // 6. 마지막 end는 maxSec로 clamp
  const last = normalized[normalized.length - 1];
  if (last.endTime < maxSec) {
    normalized[normalized.length - 1] = {
      ...last,
      endTime: maxSec
    };
  } else if (last.endTime > maxSec) {
    normalized[normalized.length - 1] = {
      ...last,
      endTime: maxSec
    };
  }

  return normalized;
}

/**
 * 레이아웃 시퀀스 검증 (에러 메시지 배열 반환)
 */
export function validateLayoutSequence(
  sequences: LayoutSequence[],
  totalDuration: number = 120
): string[] {
  const errors: string[] = [];

  if (sequences.length === 0) {
    errors.push('레이아웃 시퀀스가 비어있습니다.');
    return errors;
  }

  // 시간 순서 정렬
  const sorted = [...sequences].sort((a, b) => a.startTime - b.startTime);

  // 첫 시작이 0초인지 확인
  if (sorted[0].startTime !== 0) {
    errors.push('첫 레이아웃 시퀀스는 0초에서 시작해야 합니다.');
  }

  // 연속성 검증
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // 시간 범위 검증
    if (current.startTime >= current.endTime) {
      errors.push(`시퀀스 ${i + 1}: startTime(${current.startTime})이 endTime(${current.endTime})보다 크거나 같습니다.`);
    }

    // 겹침 검증
    if (next && current.endTime > next.startTime) {
      errors.push(`시퀀스 ${i + 1}과 ${i + 2}가 겹칩니다. (${current.endTime} > ${next.startTime})`);
    }

    // 누락 검증 (다음 시퀀스와의 간격)
    if (next && current.endTime < next.startTime) {
      errors.push(`시퀀스 ${i + 1}과 ${i + 2} 사이에 빈 구간이 있습니다. (${current.endTime} < ${next.startTime})`);
    }
  }

  // 마지막 시퀀스가 totalDuration까지 커버하는지 확인
  const last = sorted[sorted.length - 1];
  if (last.endTime < totalDuration) {
    errors.push(`마지막 시퀀스가 전체 시간(${totalDuration}초)을 커버하지 않습니다. (${last.endTime} < ${totalDuration})`);
  }

  return errors;
}

/**
 * 레이아웃 시퀀스 검증 (기존 호환성 유지)
 */
export function validateLayoutSequenceLegacy(
  sequences: LayoutSequence[],
  totalDuration: number = 120
): LayoutValidationResult {
  const errors = validateLayoutSequence(sequences, totalDuration);
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 레이아웃 타입에서 그리드 크기 계산
 */
export function getGridSize(layoutType: LayoutType): { cols: number; rows: number } {
  const [rows, cols] = layoutType.split('x').map(Number);
  return { rows, cols };
}

/**
 * 재현 가능한 랜덤 생성기 (seed 기반)
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // Linear Congruential Generator
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * 전역 seed + 구간별 offset으로 SeededRandom 생성
 */
export function createSeededRandom(globalSeed: number, sequenceOffset: number): SeededRandom {
  return new SeededRandom(globalSeed + sequenceOffset);
}

/**
 * 레이아웃 전환 애니메이션 계산
 */
export function calculateTransitionProgress(
  currentTime: number,
  transitionStart: number,
  transitionDuration: number,
  easing: EasingType
): number {
  const elapsed = currentTime - transitionStart;
  const progress = Math.min(1, Math.max(0, elapsed / transitionDuration));

  switch (easing) {
    case 'ease-in-out':
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    case 'linear':
    default:
      return progress;
  }
}

/**
 * 객체 위치 재계산 (레이아웃 변경 시)
 */
export function recalculateObjectPositions(
  objects: Array<{ x: number; y: number; width: number; height: number }>,
  oldLayout: LayoutType,
  newLayout: LayoutType,
  placement: ObjectPlacementType,
  random: SeededRandom
): Array<{ x: number; y: number; width: number; height: number }> {
  if (placement === 'reset') {
    // 모든 객체 초기화
    return [];
  }

  if (placement === 'random') {
    // 랜덤 재배치
    const newGrid = getGridSize(newLayout);
    return objects.map(() => ({
      x: random.next() * (100 / newGrid.cols),
      y: random.next() * (100 / newGrid.rows),
      width: 100 / newGrid.cols,
      height: 100 / newGrid.rows
    }));
  }

  // preserve: 기존 위치 유지 (비율 조정)
  const oldGrid = getGridSize(oldLayout);
  const newGrid = getGridSize(newLayout);
  const scaleX = newGrid.cols / oldGrid.cols;
  const scaleY = newGrid.rows / oldGrid.rows;

  return objects.map(obj => ({
    x: obj.x * scaleX,
    y: obj.y * scaleY,
    width: obj.width * scaleX,
    height: obj.height * scaleY
  }));
}

/**
 * ThinkSceneRule과 LayoutSequence 시간 범위 검증
 * rules와 layout_sequence가 시간적으로 일치하는지 확인
 */
export function validateThinkConfig(
  layout_sequence: LayoutSequence[],
  rules?: Array<{ startTime: number; endTime: number }>,
  totalDuration: number = 120
): string[] {
  const errors: string[] = [];
  
  if (!rules || rules.length === 0) {
    // rules가 없으면 검증 불필요
    return errors;
  }
  
  // 1. rules도 120초 커버하는지
  const sortedRules = [...rules].sort((a, b) => a.startTime - b.startTime);
  const ruleStart = sortedRules[0].startTime;
  const ruleEnd = sortedRules[sortedRules.length - 1].endTime;
  
  if (ruleStart !== 0) {
    errors.push(`Rules는 0초에서 시작해야 합니다. (현재: ${ruleStart}초)`);
  }
  
  if (ruleEnd !== totalDuration) {
    errors.push(`Rules는 ${totalDuration}초까지 커버해야 합니다. (현재: ${ruleEnd}초)`);
  }
  
  // 2. rules 구간이 연속적인지
  for (let i = 0; i < sortedRules.length - 1; i++) {
    if (sortedRules[i].endTime !== sortedRules[i + 1].startTime) {
      errors.push(`Rules 구간 ${i + 1}과 ${i + 2} 사이에 빈 구간이 있습니다. (${sortedRules[i].endTime}초 ~ ${sortedRules[i + 1].startTime}초)`);
    }
  }
  
  // 3. rules 구간이 겹치지 않는지
  for (let i = 0; i < sortedRules.length; i++) {
    const current = sortedRules[i];
    if (current.startTime >= current.endTime) {
      errors.push(`Rule ${i + 1}: startTime(${current.startTime})이 endTime(${current.endTime})보다 크거나 같습니다.`);
    }
    
    if (i < sortedRules.length - 1) {
      const next = sortedRules[i + 1];
      if (current.endTime > next.startTime) {
        errors.push(`Rule ${i + 1}과 ${i + 2}가 겹칩니다. (${current.endTime}초 > ${next.startTime}초)`);
      }
    }
  }
  
  return errors;
}
