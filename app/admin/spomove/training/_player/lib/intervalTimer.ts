/**
 * 인터벌 타이머 단계 전환 순수 함수.
 * useIntervalTimer의 완료 판정 로직에서 추출 — 동일 함수를 훅과 테스트가 공유한다.
 *
 * 핵심 불변식: 마지막 세트 work 완료 직후 rest를 생성하지 않고 complete로 전환한다.
 */

export type IntervalPhase = 'work' | 'rest';

export type IntervalTransition =
  | { completed: false; nextSet: number; nextPhase: IntervalPhase }
  | { completed: true; nextSet: number; nextPhase: 'complete' };

/**
 * 현재 세트·단계 완료 후 다음 상태를 반환한다.
 *
 * - phase='work', currentSet >= totalSets → complete (마지막 rest 미생성)
 * - phase='work', currentSet < totalSets  → rest (같은 세트 번호)
 * - phase='rest'                           → work (다음 세트)
 */
export function getNextIntervalState({
  currentSet,
  totalSets,
  phase,
}: {
  currentSet: number;
  totalSets: number;
  phase: IntervalPhase;
}): IntervalTransition {
  if (phase === 'work') {
    if (currentSet >= totalSets) {
      return { completed: true, nextSet: currentSet, nextPhase: 'complete' };
    }
    return { completed: false, nextSet: currentSet, nextPhase: 'rest' };
  }
  // rest → 다음 세트 work
  return { completed: false, nextSet: currentSet + 1, nextPhase: 'work' };
}
