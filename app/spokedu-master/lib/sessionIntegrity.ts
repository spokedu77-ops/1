import type { MasterSessionAttendanceStatus } from '../types/operational';

export type CompletionAttendanceEntry = { studentId: string; status: MasterSessionAttendanceStatus };

export type CompletionAttendanceValidation =
  | { ok: true; attendance: CompletionAttendanceEntry[] }
  | { ok: false; code: 'duplicate' | 'invalid' | 'mismatch'; missingCount: number };

export const CLASS_TIME_COLLISION_MESSAGE = '같은 수업반의 기존 수업과 시간이 겹칩니다.';
export const LOCKED_ROSTER_MESSAGE = '완료된 수업의 학생 명단은 바꿀 수 없습니다.';

export function buildCompletionRosterStudentIds(
  currentRosterStudentIds: readonly string[],
  historicalAttendanceStudentIds: readonly string[],
) {
  return [...new Set([...currentRosterStudentIds, ...historicalAttendanceStudentIds])];
}

export function isSessionRosterLocked(session: { rosterLockedAt?: string | null } | null | undefined) {
  return Boolean(session?.rosterLockedAt);
}

export function lockedRosterStudentIdsEqual(lockedStudentIds: readonly string[], submittedStudentIds: readonly string[]) {
  const locked = new Set(lockedStudentIds);
  const submitted = new Set(submittedStudentIds);
  return locked.size === submitted.size && [...locked].every((id) => submitted.has(id));
}

export function resolveSessionAttendanceRoster(
  session: { rosterLockedAt?: string | null; roster?: ReadonlyArray<{ studentId: string; studentName: string }>; attendance?: ReadonlyArray<{ studentId: string; studentName: string }>; status?: string } | null,
  selectedClass: { studentIds: readonly string[] } | null,
  students: ReadonlyArray<{ id: string; name: string }>,
) {
  if (isSessionRosterLocked(session)) {
    return (session?.roster ?? session?.attendance ?? []).map((item) => ({ id: item.studentId, name: item.studentName }));
  }
  const currentRoster = students.filter((student) => selectedClass?.studentIds.includes(student.id));
  const historicalRoster = session?.status === 'completed'
    ? (session.attendance ?? [])
      .filter((entry) => !currentRoster.some((student) => student.id === entry.studentId))
      .map((entry) => ({ id: entry.studentId, name: entry.studentName }))
    : [];
  return [...currentRoster, ...historicalRoster];
}

export function buildSessionCompletionRosterStudentIds(
  session: { rosterLockedAt?: string | null },
  currentRosterStudentIds: readonly string[],
  historicalAttendanceStudentIds: readonly string[],
) {
  if (isSessionRosterLocked(session)) {
    return [...new Set(historicalAttendanceStudentIds)];
  }
  return buildCompletionRosterStudentIds(currentRosterStudentIds, historicalAttendanceStudentIds);
}

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
