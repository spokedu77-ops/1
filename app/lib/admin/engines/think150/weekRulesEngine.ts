/**
 * WeekRulesEngine - StageC payload 생성
 * weekRules[1..4] 템플릿으로만 분기, 템플릿 밖 if 분기 금지
 */

import type { PADColor } from '@/app/lib/admin/constants/padGrid';
import { diagonal } from '@/app/lib/admin/constants/padGrid';
import type { SeededRNG } from './seededRng';

const COLORS: PADColor[] = ['red', 'green', 'yellow', 'blue'];

export interface WeekRulesEngineInput {
  week: 1 | 2 | 3 | 4;
  audience: string;
  t: number;
  mode: 'setA' | 'setB';
  rng: SeededRNG;
  lastColor?: PADColor | null;
  memoryState?: Week4MemoryState;
}

export interface Week4MemoryState {
  roundId: number;
  stepCount: 2 | 3;
  phase: 'present' | 'present_gap' | 'recall';
  presentStepIndex: 1 | 2 | 3;
  sequence?: PADColor[];
}

export interface StageCCueSpec {
  slotCount: 1 | 2 | 3;
  slotColors: PADColor[];
  memory?: {
    isPresentation: boolean;
    isRecall: boolean;
    stepCount: 2 | 3;
    sequence?: PADColor[];
  };
}

/** Week1: 3분할 고정, 색 1~3개 (빨-흰-흰) (빨-빨-흰) (빨-빨-빨) */
function week1(input: WeekRulesEngineInput): StageCCueSpec {
  const k = (input.rng.next() < 0.34 ? 1 : input.rng.next() < 0.67 ? 2 : 3) as 1 | 2 | 3;
  const color = input.rng.pickAvoidingConsecutive(COLORS, input.lastColor ?? null);
  return {
    slotCount: k,
    slotColors: Array(k).fill(color) as PADColor[],
  };
}

/** Week2: 항상 2슬롯, 서로 다른 색, 연속 방지 */
function week2(input: WeekRulesEngineInput): StageCCueSpec {
  const c1 = input.rng.pickAvoidingConsecutive(COLORS, input.lastColor ?? null);
  const c2 = input.rng.pickExcluding(COLORS, c1);
  return {
    slotCount: 2,
    slotColors: [c1, c2],
  };
}

/** Week3 ANTI: Set1 전체색1만 / Set2 서로다른색2만 (섞이지 않음) */
function week3(input: WeekRulesEngineInput): StageCCueSpec {
  if (input.mode === 'setA') {
    const color = input.rng.pickAvoidingConsecutive(COLORS, input.lastColor ?? null);
    return { slotCount: 1, slotColors: [diagonal(color)] };
  }
  const c1 = input.rng.pickAvoidingConsecutive(COLORS, input.lastColor ?? null);
  const c2 = input.rng.pickExcluding(COLORS, c1);
  return { slotCount: 2, slotColors: [diagonal(c1), diagonal(c2)] };
}

/** Week4: MEMORY 2-step / 3-step. 단순화: presentation/recall는 scheduler에서 처리 */
function week4(input: WeekRulesEngineInput): StageCCueSpec {
  const state = input.memoryState;
  if (!state) {
    const stepCount = input.t < 30000 ? 2 : 3;
    const sequence = [
      input.rng.pick(COLORS),
      input.rng.pick(COLORS),
      ...(stepCount === 3 ? [input.rng.pick(COLORS)] : []),
    ] as PADColor[];
    return {
      slotCount: 1,
      slotColors: [sequence[0]!],
      memory: {
        isPresentation: true,
        isRecall: false,
        stepCount: stepCount as 2 | 3,
        sequence,
      },
    };
  }
  const stepCount = state.stepCount;
  const sequence = state.sequence ?? [];
  const idx = state.presentStepIndex - 1;
  return {
    slotCount: 1,
    slotColors: [sequence[idx] ?? 'red'],
    memory: {
      isPresentation: state.phase === 'present' || state.phase === 'present_gap',
      isRecall: state.phase === 'recall',
      stepCount,
      sequence,
    },
  };
}

export function computeStageCCueSpec(input: WeekRulesEngineInput): StageCCueSpec {
  switch (input.week) {
    case 1:
      return week1(input);
    case 2:
      return week2(input);
    case 3:
      return week3(input);
    case 4:
      return week4(input);
    default:
      return week1(input);
  }
}
