import type { ClassAttendanceRow } from '../classes/classManagementModel';
import { getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterClassDto, MasterSessionDto, MasterStudentDto } from '../types/operational';

export function buildManageAttendanceProjection(classItem: MasterClassDto, sessions: MasterSessionDto[], students: MasterStudentDto[], month: string) {
  const monthSessions = sessions
    .filter((session) => session.classId === classItem.id && session.status !== 'cancelled' && getSeoulSessionDay(session.startAt).startsWith(month))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const activeStudents = new Map(students.map((student) => [student.id, student]));
  const historicalNames = new Map<string, string>();
  monthSessions.forEach((session) => {
    if (session.status !== 'completed') return;
    session.attendance.forEach((entry) => {
      if (!historicalNames.has(entry.studentId)) historicalNames.set(entry.studentId, entry.studentName);
    });
  });
  const studentIds = new Set([...classItem.studentIds, ...historicalNames.keys()]);
  const rows = [...studentIds].map<ClassAttendanceRow>((studentId) => ({
    studentId,
    studentName: activeStudents.get(studentId)?.name ?? historicalNames.get(studentId) ?? '이름 미상',
    current: classItem.studentIds.includes(studentId),
    attendanceBySessionId: Object.fromEntries(monthSessions.flatMap((session) => {
      if (session.status !== 'completed') return [];
      const attendance = session.attendance.find((entry) => entry.studentId === studentId);
      return attendance ? [[session.id, attendance.status]] : [];
    })),
  })).sort((a, b) => Number(b.current) - Number(a.current) || a.studentName.localeCompare(b.studentName, 'ko'));
  return { sessions: monthSessions, rows };
}
