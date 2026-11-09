/**
 * reps(횟수 기반) 세션 카운팅 순수 함수.
 * useTrainingTimer의 emitSignal 로직에서 추출 — 동일 함수를 훅과 테스트가 공유한다.
 */

export type RepsState = { presented: number };

export type RegisterPresentedSignalResult = {
  next: RepsState;
  /** 목표 개수 도달 여부. 마지막 신호의 제시 시간이 지난 뒤 종료해야 한다. */
  finished: boolean;
};

/**
 * 신호 1회를 처리해 새 상태와 완료 여부를 반환한다.
 * - hasValidSignal=false(null signal)이면 카운트를 올리지 않는다.
 * - finished=true이면 추가 신호 생성을 멈추고 마지막 신호의 제시 시간을 보장한다.
 */
export function registerPresentedSignal({
  state,
  hasValidSignal,
  targetReps,
}: {
  state: RepsState;
  hasValidSignal: boolean;
  targetReps: number;
}): RegisterPresentedSignalResult {
  if (!hasValidSignal) return { next: state, finished: false };
  const next: RepsState = { presented: state.presented + 1 };
  return { next, finished: next.presented >= targetReps };
}
