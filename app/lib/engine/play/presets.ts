/**
 * PLAY v1 모션 프리셋
 * 15개 motionId 고정, motion별 허용 operator 패턴
 */

import type { PlayDraft, PlayBlock, SetOperator } from '@/app/lib/constants/schemas';

/** 15개 motionId 고정 */
export const MOTION_IDS = [
  'point',
  'walk',
  'pull_down',
  'pull_up',
  'throw',
  'punch',
  'jump',
  'turn_hand',
  'swing',
  'swipe',
  'clap',
  'say_hi',
  'cut',
  'knock',
  'tap',
] as const;

export type MotionId = (typeof MOTION_IDS)[number];

/** motionId → 표시 라벨 (EXPLAIN용) */
export const MOTION_LABELS: Record<MotionId, string> = {
  point: '콕 찌르기',
  walk: '제자리 걷기',
  pull_down: '줄 당기기(아래)',
  pull_up: '줄 당기기(위)',
  throw: '던지기',
  punch: '펀치',
  jump: '점프',
  turn_hand: '손 돌리기',
  swing: '휘두르기',
  swipe: '스와이프',
  clap: '박수',
  say_hi: '안녕 흔들기',
  cut: '자르기',
  knock: '노크',
  tap: '탭',
};

/** 허용 패턴: 'BINARY'|'DROP'|'PROGRESSIVE' 또는 PROGRESSIVE+style */
type AllowedPattern = 'BINARY' | 'DROP' | 'PROGRESSIVE' | { type: 'PROGRESSIVE'; style: 'wipe' | 'frames' };

/** Set별 허용 operator 패턴 */
export type AllowedOperatorPattern = {
  set1: AllowedPattern[];
  set2: AllowedPattern[];
};

export function isOperatorAllowed(op: SetOperator, patterns: AllowedPattern[]): boolean {
  return patterns.some((p) => {
    if (p === 'BINARY' || p === 'DROP') return op.type === p;
    if (p === 'PROGRESSIVE') return op.type === 'PROGRESSIVE';
    if (typeof p === 'object' && p.type === 'PROGRESSIVE' && op.type === 'PROGRESSIVE') return p.style === op.style;
    return false;
  });
}

/** motion별 허용 operator 패턴 (운영 표준) */
export const MOTION_OPERATOR_MAP: Record<MotionId, AllowedOperatorPattern> = {
  point: { set1: ['BINARY'], set2: ['BINARY'] },
  walk: { set1: ['BINARY'], set2: ['BINARY'] },
  pull_down: { set1: ['BINARY', 'PROGRESSIVE'], set2: ['BINARY', 'PROGRESSIVE'] },
  pull_up: { set1: ['BINARY', 'PROGRESSIVE'], set2: ['BINARY', 'PROGRESSIVE'] },
  throw: { set1: ['BINARY', 'DROP'], set2: ['BINARY', 'DROP'] },
  punch: { set1: ['BINARY'], set2: ['BINARY'] },
  jump: { set1: ['BINARY'], set2: ['BINARY'] },
  turn_hand: { set1: ['BINARY'], set2: ['BINARY'] },
  swing: { set1: ['BINARY'], set2: ['BINARY'] },
  swipe: { set1: ['BINARY', 'PROGRESSIVE'], set2: ['BINARY', 'PROGRESSIVE'] },
  clap: { set1: ['BINARY'], set2: ['BINARY'] },
  say_hi: {
    set1: ['BINARY'],
    set2: ['BINARY', { type: 'PROGRESSIVE', style: 'wipe' }],
  },
  cut: { set1: ['BINARY', 'PROGRESSIVE'], set2: ['BINARY', 'PROGRESSIVE'] },
  knock: { set1: ['BINARY'], set2: ['BINARY'] },
  tap: { set1: ['BINARY'], set2: ['BINARY'] },
};

/** 기본 operator (preset 채우기용) */
const DEFAULT_OPERATOR: SetOperator = { type: 'BINARY' };

/** operator가 비어있으면 preset으로 채우기 (선택적) */
export function fillOperatorFromPreset(
  draft: { blocks: Array<{ motionId: string; set1?: { operator?: SetOperator }; set2?: { operator?: SetOperator } }> },
  _policy?: 'strict' | 'loose'
): PlayDraft {
  const blocks: PlayBlock[] = draft.blocks.map((b, i) => {
    const motionId = b.motionId as MotionId;
    const pattern = MOTION_OPERATOR_MAP[motionId] ?? { set1: ['BINARY'], set2: ['BINARY'] };
    const set1Op = b.set1?.operator ?? DEFAULT_OPERATOR;
    const set2Op = b.set2?.operator ?? DEFAULT_OPERATOR;
    return {
      motionId,
      set1: { operator: set1Op },
      set2: { operator: set2Op },
    };
  });
  return { blocks };
}
