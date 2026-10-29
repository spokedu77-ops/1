import type { MasterClassDto, MasterSessionDto, MasterStudentDto } from '../types/operational';

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

export function studentOperationalFingerprint(student: MasterStudentDto) {
  return [
    student.id,
    student.updatedAt,
    student.name,
    student.legacyId ?? '',
    student.guidanceNote ?? '',
    stableJson(student.meta),
  ].join('\u001f');
}

export function classOperationalFingerprint(classItem: MasterClassDto) {
  const studentIds = [...classItem.studentIds].sort().join(',');
  return [classItem.id, classItem.updatedAt, classItem.name, studentIds].join('\u001f');
}

export function sessionOperationalFingerprint(session: MasterSessionDto) {
  return stableJson({
    id: session.id,
    updatedAt: session.updatedAt,
    status: session.status,
    classId: session.classId,
    startAt: session.startAt,
    endAt: session.endAt,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    memo: session.memo,
    memoVersion: session.memoVersion ?? null,
    attendanceVersion: session.attendanceVersion ?? null,
    parentNotice: session.parentNotice ?? null,
    rosterLockedAt: session.rosterLockedAt ?? null,
    programs: session.programs.map((program) => ({
      id: program.id,
      sortOrder: program.sortOrder,
      isCompleted: program.isCompleted,
      programId: program.programId,
      spomovePresetId: program.spomovePresetId,
      programTitle: program.programTitle,
      sourceType: program.sourceType,
    })),
    attendance: session.attendance.map((row) => ({
      studentId: row.studentId,
      status: row.status,
      studentName: row.studentName,
    })),
  });
}

/** Per-item structural sharing: reuse prior object references only when payloads match. */
export function mergeOperationalListPreservingEqualItems<T extends { id: string }>(
  current: T[],
  next: T[],
  fingerprint: (item: T) => string,
): T[] {
  const currentById = new Map(current.map((item) => [item.id, item]));
  return next.map((nextItem) => {
    const previous = currentById.get(nextItem.id);
    if (!previous) return nextItem;
    if (fingerprint(previous) === fingerprint(nextItem)) return previous;
    return nextItem;
  });
}

export function mergeStudentsPreservingEqualItems(current: MasterStudentDto[], next: MasterStudentDto[]) {
  return mergeOperationalListPreservingEqualItems(current, next, studentOperationalFingerprint);
}

export function mergeClassesPreservingEqualItems(current: MasterClassDto[], next: MasterClassDto[]) {
  return mergeOperationalListPreservingEqualItems(current, next, classOperationalFingerprint);
}

export function mergeSessionsPreservingEqualItems(current: MasterSessionDto[], next: MasterSessionDto[]) {
  return mergeOperationalListPreservingEqualItems(current, next, sessionOperationalFingerprint);
}
