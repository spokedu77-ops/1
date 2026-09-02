/**
 * SPOKEDU MASTER Level 0 product contract.
 *
 * Implementation shape protects this truth; implementation shape is not the
 * product truth itself. Lower contracts are read in the authority order below.
 */
export const MASTER_CONTRACT_AUTHORITY = [
  'product',
  'domain-safety',
  'flow-ux',
  'implementation',
  'legacy-regression',
] as const;

export const MASTER_PRODUCT_FLOW = ['DISCOVER', 'BUILD', 'TEACH', 'CAPTURE', 'REUSE'] as const;

export const MASTER_PRODUCT_VALUES = {
  CONTENT: '수업을 더 풍성하게 만든다.',
  CONTINUITY: '한 번 한 일을 다시 하지 않는다.',
} as const;

export const MASTER_DOMAIN_ROLES = {
  content: {
    library: '현장 놀이체육 콘텐츠를 발견하고 판단하는 Library',
    spomove: '디지털 기반 움직임 콘텐츠를 발견하고 판단하는 Library',
    flow: ['DISCOVER', 'REVIEW', 'SELECT', 'BUILD'],
    independentDiscovery: true,
    favorites: 'SAVE를 통해 보관한 program·spomove 콘텐츠를 later REUSE 또는 BUILD로 다시 찾는 독립 retrieval surface',
  },
  prepare: 'BUILD 내부에서 수업을 구성하는 준비 상태이며 Level 0 Product Flow가 아님',
  session: '실제로 구성되고 진행되는 한 번의 수업의 canonical object',
  class: '같은 대상과 반복 수업을 이어가는 context',
  captureMemory: '끝난 수업을 다음 수업에서 재사용하기 위한 입력',
  home: '현재 사용자에게 가장 유용한 다음 행동을 보여주는 재진입 surface',
} as const;

export const MASTER_PRODUCT_CONTRACT = {
  purpose: '좋은 체육 수업 콘텐츠를 발견하고 실제 수업으로 구성해 사용하고, 간단히 정리한 뒤 다음 수업에서 다시 활용하게 한다.',
  flow: MASTER_PRODUCT_FLOW,
  values: MASTER_PRODUCT_VALUES,
  domains: MASTER_DOMAIN_ROLES,
  authority: MASTER_CONTRACT_AUTHORITY,
} as const;

export type MasterContentMode = 'discovery' | 'session-build';

/** Session context changes the action, never the content item's discovery value. */
export function resolveMasterContentMode(input: {
  requestedSessionId?: string | null;
  hasExactScheduledSession: boolean;
}): MasterContentMode {
  return input.requestedSessionId && input.hasExactScheduledSession ? 'session-build' : 'discovery';
}

export function getMasterContentPrimaryAction(mode: MasterContentMode) {
  return mode === 'session-build' ? '이 수업에 추가' : '활동 살펴보기';
}

export type MasterActivityCompletionSource = 'teacher_explicit';

/** Level 1 lifecycle truths retained under the Level 0 product contract. */
export const MASTER_TRUTH_ACTIVITY_COMPLETED =
  '교사가 수업에서 실제로 진행했다고 명시한 활동 상태';
export const MASTER_TRUTH_SPOMOVE_ENGINE_DONE =
  'SPOMOVE 실행 엔진 종료 상태이며 교사의 수업 활동 완료 기록과 분리';

/** Engine finish and a teacher's lesson-record completion remain separate. */
export function isEngineDoneLessonRecord(autoCompleteOnEngineDone: boolean): boolean {
  return autoCompleteOnEngineDone === false;
}
