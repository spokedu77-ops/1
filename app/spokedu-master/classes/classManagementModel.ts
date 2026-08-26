import type { MasterClassDto, MasterSessionAttendanceStatus, MasterSessionDto, MasterStudentDto } from '../types/operational';
import { getSeoulSessionDay } from '../lib/sessionDateTime';
import { buildClassPriorityWork, buildOperationalDebtQueue } from '../lib/masterTemporalContract';
import { deriveMasterSessionWorkState, getMasterWorkQueuePriority, type MasterSessionWorkState } from '../lib/masterSessionWorkState';

export type ClassCardModel = {
  classItem: MasterClassDto;
  rosterCount: number;
  /** REFERENCE only — not an actionable CTA target. */
  completedSessionCount: number;
  /** ACTIONABLE — links to exact incomplete Sessions. */
  incompleteAttendanceCount: number;
  /** ACTIONABLE — overdue scheduled + attendance gaps (no horizon). */
  operationalDebtCount: number;
  nextSession: MasterSessionDto | null;
  prioritySession: MasterSessionDto | null;
  priorityWorkState: MasterSessionWorkState | null;
};

export function buildIncompleteAttendanceSessions(sessions: MasterSessionDto[], classItem: MasterClassDto, now: Date | string = new Date()) {
  const current = new Date(now);
  return sessions
    .filter((session) => session.classId === classItem.id && deriveMasterSessionWorkState(session, classItem, current).attention.attendanceMissing)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
}

export function selectRecentCompletedClassSessions(sessions: MasterSessionDto[], classId: string, limit = 3) {
  return sessions
    .filter((session) => session.classId === classId && session.status === 'completed')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .slice(0, limit);
}

export function selectNextClassSession(sessions: MasterSessionDto[], classId: string, now: Date | string) {
  const nowTime = new Date(now).getTime();
  return sessions
    .filter((session) => session.classId === classId && session.status === 'scheduled' && new Date(session.startAt).getTime() >= nowTime)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null;
}

export function selectLatestCompletedClassSession(sessions: MasterSessionDto[], classId: string) {
  return sessions
    .filter((session) => session.classId === classId && session.status === 'completed')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0] ?? null;
}

export function buildClassCards(classes: MasterClassDto[], sessions: MasterSessionDto[], now: Date | string) {
  const current = new Date(now);
  return classes.map<ClassCardModel>((classItem) => {
    const scoped = sessions.filter((session) => session.classId === classItem.id);
    const priority = buildClassPriorityWork({ sessions: scoped, classItem, now: current });
    return {
      classItem,
      rosterCount: classItem.studentIds.length,
      completedSessionCount: scoped.filter((session) => session.status === 'completed').length,
      incompleteAttendanceCount: buildIncompleteAttendanceSessions(sessions, classItem, current).length,
      operationalDebtCount: buildOperationalDebtQueue({ sessions: scoped, classes: [classItem], now: current }).length,
      nextSession: selectNextClassSession(sessions, classItem.id, current),
      prioritySession: priority?.session ?? null,
      priorityWorkState: priority?.workState ?? null,
    };
  }).sort((a, b) => {
    if (a.priorityWorkState && b.priorityWorkState) return getMasterWorkQueuePriority(a.priorityWorkState) - getMasterWorkQueuePriority(b.priorityWorkState)
      || new Date(a.prioritySession!.startAt).getTime() - new Date(b.prioritySession!.startAt).getTime();
    if (a.priorityWorkState) return -1;
    if (b.priorityWorkState) return 1;
    if (a.nextSession && b.nextSession) return new Date(a.nextSession.startAt).getTime() - new Date(b.nextSession.startAt).getTime();
    if (a.nextSession) return -1;
    if (b.nextSession) return 1;
    return a.classItem.name.localeCompare(b.classItem.name, 'ko');
  });
}

export type ClassAttendanceRow = {
  studentId: string;
  studentName: string;
  current: boolean;
  attendanceBySessionId: Record<string, MasterSessionAttendanceStatus | undefined>;
};

export function resolveInitialAttendanceMonth(sessions: MasterSessionDto[], classId: string, todayDay: string) {
  const currentMonth = todayDay.slice(0, 7);
  const completed = sessions
    .filter((session) => session.classId === classId && session.status === 'completed')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  if (completed.some((session) => getSeoulSessionDay(session.startAt).startsWith(currentMonth))) return currentMonth;
  return completed[0] ? getSeoulSessionDay(completed[0].startAt).slice(0, 7) : currentMonth;
}

export function shiftAttendanceMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year!, monthNumber! - 1 + amount, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function resolveClassRosterCandidates(students: MasterStudentDto[], currentStudentIds: string[], query: string) {
  const normalized = query.trim().toLocaleLowerCase('ko');
  if (!normalized) return [];
  const currentIds = new Set(currentStudentIds);
  return students.filter((student) => !currentIds.has(student.id) && student.name.toLocaleLowerCase('ko').includes(normalized));
}

export function parseRosterPaste(value: string) {
  const seen = new Set<string>();
  return value.split(/\r?\n/).flatMap((line) => {
    const name = line.split('\t').map((cell) => cell.trim()).find(Boolean) ?? '';
    const key = name.toLocaleLowerCase('ko');
    if (!name || seen.has(key)) return [];
    seen.add(key);
    return [name];
  });
}

export function buildClassAttendanceView(
  classItem: MasterClassDto,
  sessions: MasterSessionDto[],
  students: MasterStudentDto[],
  month?: string,
) {
  const completedSessions = sessions
    .filter((session) => session.classId === classItem.id
      && session.status === 'completed'
      && (!month || getSeoulSessionDay(session.startAt).startsWith(month)))
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  const activeStudents = new Map(students.map((student) => [student.id, student]));
  const historicalNames = new Map<string, string>();
  completedSessions.forEach((session) => session.attendance.forEach((entry) => {
    if (!historicalNames.has(entry.studentId)) historicalNames.set(entry.studentId, entry.studentName);
  }));
  const studentIds = new Set([...classItem.studentIds, ...historicalNames.keys()]);
  const rows = [...studentIds].map<ClassAttendanceRow>((studentId) => {
    const activeStudent = activeStudents.get(studentId);
    /**
     * Name display contract:
     * - CURRENT roster row label → live student name (identity continuity)
     * - HISTORICAL-only participant → attendance snapshot name
     * Session/Report/안내문 keep per-row snapshot fields separately.
     */
    return {
      studentId,
      studentName: activeStudent?.name ?? historicalNames.get(studentId) ?? '이름 미상',
      current: classItem.studentIds.includes(studentId),
      attendanceBySessionId: Object.fromEntries(completedSessions.flatMap((session) => {
        const attendance = session.attendance.find((entry) => entry.studentId === studentId);
        return attendance ? [[session.id, attendance.status]] : [];
      })),
    };
  }).sort((a, b) => Number(b.current) - Number(a.current) || a.studentName.localeCompare(b.studentName, 'ko'));
  return { completedSessions, rows };
}
