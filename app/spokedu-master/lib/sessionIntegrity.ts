import type { MasterSessionAttendanceStatus } from '../types/operational';

export type CompletionAttendanceEntry = { studentId: string; status: MasterSessionAttendanceStatus };

export type CompletionAttendanceValidation =
  | { ok: true; attendance: CompletionAttendanceEntry[] }
  | { ok: false; code: 'duplicate' | 'invalid' | 'mismatch'; missingCount: number };

export const CLASS_TIME_COLLISION_MESSAGE = '같은 수업반의 기존 수업과 시간이 겹칩니다.';

export function validateCompletionAttendance(rosterStudentIds: readonly string[], value: unknown): CompletionAttendanceValidation {
  if (!Array.isArray(value)) return { ok: false, code: 'invalid', missingCount: rosterStudentIds.length };
  const attendance: CompletionAttendanceEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, code: 'invalid', missingCount: rosterStudentIds.length };
    const { studentId, status } = item as Record<string, unknown>;
    if (typeof studentId !== 'string' || !studentId || (status !== 'present' && status !== 'absent')) {
      return { ok: false, code: 'invalid', missingCount: rosterStudentIds.length };
    }
    attendance.push({ studentId, status });
  }
  const submittedIds = new Set(attendance.map((item) => item.studentId));
  if (submittedIds.size !== attendance.length) return { ok: false, code: 'duplicate', missingCount: 0 };
  const rosterIds = new Set(rosterStudentIds);
  const missingCount = [...rosterIds].filter((id) => !submittedIds.has(id)).length;
  if (submittedIds.size !== rosterIds.size || [...submittedIds].some((id) => !rosterIds.has(id))) {
    return { ok: false, code: 'mismatch', missingCount };
  }
  return { ok: true, attendance };
}

export function completionAttendanceMessage(missingCount: number) {
  return `출석을 완료해 주세요. ${missingCount}명의 출석 상태가 선택되지 않았습니다.`;
}

export function isActiveSessionForCollision(session: { status: string; deletedAt?: string | null }) {
  return session.deletedAt == null && session.status !== 'cancelled';
}

export function sessionTimesOverlap(startAt: string, endAt: string, otherStartAt: string, otherEndAt: string) {
  return startAt < otherEndAt && otherStartAt < endAt;
}

export function findActiveClassTimeCollision(
  candidate: { classId: string; startAt: string; endAt: string; sessionId?: string | null },
  sessions: ReadonlyArray<{ id: string; classId: string; startAt: string; endAt: string; status: string; deletedAt?: string | null }>,
) {
  return sessions.find((session) => (
    session.classId === candidate.classId
    && session.id !== candidate.sessionId
    && isActiveSessionForCollision(session)
    && sessionTimesOverlap(candidate.startAt, candidate.endAt, session.startAt, session.endAt)
  )) ?? null;
}
