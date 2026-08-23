import type { MasterClassDto, MasterSessionAttendanceStatus, MasterSessionDto, MasterStudentDto } from '../types/operational';

export type ClassCardModel = {
  classItem: MasterClassDto;
  rosterCount: number;
  completedSessionCount: number;
  nextSession: MasterSessionDto | null;
};

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
  return classes.map<ClassCardModel>((classItem) => ({
    classItem,
    rosterCount: classItem.studentIds.length,
    completedSessionCount: sessions.filter((session) => session.classId === classItem.id && session.status === 'completed').length,
    nextSession: selectNextClassSession(sessions, classItem.id, now),
  })).sort((a, b) => {
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

export function buildClassAttendanceView(
  classItem: MasterClassDto,
  sessions: MasterSessionDto[],
  students: MasterStudentDto[],
) {
  const completedSessions = sessions
    .filter((session) => session.classId === classItem.id && session.status === 'completed')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  const activeStudents = new Map(students.map((student) => [student.id, student]));
  const historicalNames = new Map<string, string>();
  completedSessions.forEach((session) => session.attendance.forEach((entry) => {
    if (!historicalNames.has(entry.studentId)) historicalNames.set(entry.studentId, entry.studentName);
  }));
  const studentIds = new Set([...classItem.studentIds, ...historicalNames.keys()]);
  const rows = [...studentIds].map<ClassAttendanceRow>((studentId) => {
    const activeStudent = activeStudents.get(studentId);
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
