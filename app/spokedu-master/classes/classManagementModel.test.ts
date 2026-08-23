import { describe, expect, it } from 'vitest';
import type { MasterClassDto, MasterSessionDto, MasterStudentDto } from '../types/operational';
import { buildClassAttendanceView, buildClassCards, selectLatestCompletedClassSession, selectNextClassSession } from './classManagementModel';

const classes: MasterClassDto[] = [
  { id: 'class-a', name: '같은 이름', studentIds: ['student-current'], createdAt: '', updatedAt: '' },
  { id: 'class-b', name: '같은 이름', studentIds: [], createdAt: '', updatedAt: '' },
];
const students: MasterStudentDto[] = [
  { id: 'student-current', legacyId: null, name: '현재 학생', meta: '초2', createdAt: '', updatedAt: '' },
];
function session(id: string, classId: string, status: MasterSessionDto['status'], startAt: string, attendance: MasterSessionDto['attendance'] = []): MasterSessionDto {
  return { id, classId, className: 'snapshot', startAt, endAt: new Date(new Date(startAt).getTime() + 3600000).toISOString(), status, memo: null, completedAt: status === 'completed' ? startAt : null, programs: [], attendance, createdAt: '', updatedAt: '' };
}
const sessions = [
  session('a-old', 'class-a', 'completed', '2026-08-01T01:00:00Z', [
    { id: 'att-1', studentId: 'student-current', studentName: '현재 학생 이전 이름', status: 'present' },
    { id: 'att-2', studentId: 'student-removed', studentName: '과거 학생', status: 'absent' },
  ]),
  session('a-recent', 'class-a', 'completed', '2026-08-02T01:00:00Z'),
  session('a-next-later', 'class-a', 'scheduled', '2026-09-02T01:00:00Z'),
  session('a-next', 'class-a', 'scheduled', '2026-09-01T01:00:00Z'),
  session('a-cancelled', 'class-a', 'cancelled', '2026-08-03T01:00:00Z'),
  session('b-next', 'class-b', 'scheduled', '2026-08-30T01:00:00Z'),
];

describe('MASTER Class management model', () => {
  it('builds one classId-scoped card per Class and sorts the nearest scheduled Session first', () => {
    const cards = buildClassCards(classes, sessions, '2026-08-24T00:00:00Z');
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.classItem.id)).toEqual(['class-b', 'class-a']);
    expect(cards.find((card) => card.classItem.id === 'class-a')).toMatchObject({ rosterCount: 1, completedSessionCount: 2 });
    expect(cards.find((card) => card.classItem.id === 'class-a')?.nextSession?.id).toBe('a-next');
  });

  it('selects next and latest Sessions by exact classId and status', () => {
    expect(selectNextClassSession(sessions, 'class-a', '2026-08-24T00:00:00Z')?.id).toBe('a-next');
    expect(selectLatestCompletedClassSession(sessions, 'class-a')?.id).toBe('a-recent');
    expect(selectLatestCompletedClassSession(sessions, 'class-b')).toBeNull();
  });

  it('projects completed attendance without inferring a missing row as absent', () => {
    const view = buildClassAttendanceView(classes[0]!, sessions, students);
    expect(view.completedSessions.map((item) => item.id)).toEqual(['a-recent', 'a-old']);
    expect(view.rows.map((row) => row.studentId)).toEqual(['student-current', 'student-removed']);
    expect(view.rows[0]?.studentName).toBe('현재 학생');
    expect(view.rows[0]?.attendanceBySessionId['a-recent']).toBeUndefined();
    expect(view.rows[0]?.attendanceBySessionId['a-old']).toBe('present');
    expect(view.rows[1]).toMatchObject({ studentName: '과거 학생', current: false });
    expect(view.rows[1]?.attendanceBySessionId['a-old']).toBe('absent');
  });
});
