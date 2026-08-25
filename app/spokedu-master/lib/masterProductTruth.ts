/**
 * MASTER Product Truth — lifecycle semantics SSOT.
 *
 * Surfaces must not redefine these meanings locally.
 */

/** Class = 반복해서 운영되는 수업 그룹 */
export const MASTER_TRUTH_CLASS =
  '반복해서 운영되는 수업 그룹';

/** Session = 날짜·시간이 정해진 실제 한 번의 수업 */
export const MASTER_TRUTH_SESSION =
  '날짜·시간이 정해진 실제 한 번의 수업';

/** Activity = Session에서 사용할 Program 또는 SPOMOVE */
export const MASTER_TRUTH_ACTIVITY =
  'Session에서 사용할 Program 또는 SPOMOVE';

/**
 * Activity completed = 교사가 수업에서 실제로 진행했다고 기록한 상태.
 * Program / SPOMOVE 동일 grammar. 엔진 종료와 무관.
 */
export const MASTER_TRUTH_ACTIVITY_COMPLETED =
  '교사가 수업에서 실제로 진행했다고 기록한 상태';

/**
 * SPOMOVE engine done = 실행 엔진이 정상 종료된 상태.
 * SessionProgram.isCompleted 를 자동으로 true 로 바꾸지 않는다.
 */
export const MASTER_TRUTH_SPOMOVE_ENGINE_DONE =
  'SPOMOVE 실행 엔진이 정상 종료된 상태 (수업 활동 완료 기록과 분리)';

/** Session completed = 그날 전체 수업을 종료한 상태 */
export const MASTER_TRUTH_SESSION_COMPLETED =
  '그날 전체 수업을 종료한 상태';

/** Cancelled = 예정 수업을 취소했지만 기록은 남아 있는 상태 */
export const MASTER_TRUTH_CANCELLED =
  '예정 수업을 취소했지만 기록은 남아 있는 상태';

/** Deleted = 일반 운영 화면에서 제거된 soft-delete 상태 */
export const MASTER_TRUTH_DELETED =
  '일반 운영 화면에서 제거된 soft-delete 상태';

/** History = 별도 객체가 아니라 완료 Session의 축적 */
export const MASTER_TRUTH_HISTORY =
  '완료 Session의 축적 (별도 domain 객체 아님)';

export type MasterActivityCompletionSource = 'teacher_explicit';

/** Engine finish must never be treated as lesson-record completion. */
export function isEngineDoneLessonRecord(autoCompleteOnEngineDone: boolean): boolean {
  return autoCompleteOnEngineDone === false;
}
