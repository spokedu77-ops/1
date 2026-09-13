import { describe, expect, it } from 'vitest';
import {
  buildCompletionRosterStudentIds,
  buildSessionCompletionRosterStudentIds,
  CLASS_TIME_COLLISION_MESSAGE,
  completionAttendanceMessage,
  findActiveClassTimeCollision,
  lockedRosterStudentIdsEqual,
  resolveSessionAttendanceRoster,
  validateCompletionAttendance,
} from './sessionIntegrity';

const roster = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
const present = (studentId: string) => ({ studentId, status: 'present' as const });

describe('session completion attendance integrity', () => {
  it('keeps historical participants alongside the current roster when editing a completed session', () => {
    expect(buildCompletionRosterStudentIds(['current', 'shared'], ['historical', 'shared']))
      .toEqual(['current', 'shared', 'historical']);
  });
  it('accepts a complete present/absent mix', () => {
    const value = roster.map((studentId, index) => ({ studentId, status: index < 5 ? 'present' as const : 'absent' as const }));
    expect(validateCompletionAttendance(roster, value)).toEqual({ ok: true, attendance: value });
  });

  it.each([
    ['empty', []],
    ['partial', roster.slice(0, 6).map(present)],
  ])('rejects %s attendance', (_label, value) => {
    const result = validateCompletionAttendance(roster, value);
    expect(result).toMatchObject({ ok: false, code: 'mismatch' });
    if (!result.ok) expect(completionAttendanceMessage(result.missingCount)).toContain(`${result.missingCount}명의 출석 상태가 선택되지 않았습니다.`);
  });

  it('rejects a duplicate student', () => {
    expect(validateCompletionAttendance(roster, [...roster.slice(0, 6), 's6'].map(present))).toMatchObject({ ok: false, code: 'duplicate' });
  });

  it('rejects a student outside the class roster', () => {
    expect(validateCompletionAttendance(roster, [...roster.slice(0, 6), 'outsider'].map(present))).toMatchObject({ ok: false, code: 'mismatch' });
  });

  it('rejects invalid status values', () => {
    expect(validateCompletionAttendance(['s1'], [{ studentId: 's1', status: 'late' }])).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('keeps the zero-roster policy unchanged', () => {
    expect(validateCompletionAttendance([], [])).toEqual({ ok: true, attendance: [] });
  });
});

describe('session roster lock', () => {
  const students = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
    { id: 'd', name: 'D' },
  ];
  const classAbc = { studentIds: ['a', 'b', 'c'] };
  const classAbd = { studentIds: ['a', 'b', 'd'] };
  const lockedAttendance = [
    { studentId: 'a', studentName: 'A' },
    { studentId: 'b', studentName: 'B' },
    { studentId: 'c', studentName: 'C' },
  ];

  it('shows the current class roster for a scheduled session', () => {
    expect(resolveSessionAttendanceRoster({ status: 'scheduled', rosterLockedAt: null, attendance: [] }, classAbc, students))
      .toEqual([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]);
    expect(buildSessionCompletionRosterStudentIds({ rosterLockedAt: null }, ['a', 'b', 'c'], [])).toEqual(['a', 'b', 'c']);
  });

  it('keeps locked completed attendance as the roster after class membership changes', () => {
    expect(resolveSessionAttendanceRoster({
      status: 'completed',
      rosterLockedAt: '2026-09-14T00:00:00.000Z',
      attendance: lockedAttendance,
    }, classAbd, students)).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ]);
    expect(buildSessionCompletionRosterStudentIds({ rosterLockedAt: '2026-09-14T00:00:00.000Z' }, ['a', 'b', 'd'], ['a', 'b', 'c']))
      .toEqual(['a', 'b', 'c']);
  });

  it('allows present/absent changes on the locked set and rejects add or remove', () => {
    const locked = ['a', 'b', 'c'];
    expect(lockedRosterStudentIdsEqual(locked, ['a', 'b', 'c'])).toBe(true);
    expect(validateCompletionAttendance(locked, [
      { studentId: 'a', status: 'absent' },
      { studentId: 'b', status: 'present' },
      { studentId: 'c', status: 'present' },
    ])).toMatchObject({ ok: true });
    expect(lockedRosterStudentIdsEqual(locked, ['a', 'b', 'c', 'd'])).toBe(false);
    expect(validateCompletionAttendance(locked, [
      { studentId: 'a', status: 'present' },
      { studentId: 'b', status: 'present' },
      { studentId: 'c', status: 'present' },
      { studentId: 'd', status: 'present' },
    ])).toMatchObject({ ok: false, code: 'mismatch' });
    expect(lockedRosterStudentIdsEqual(locked, ['a', 'b'])).toBe(false);
    expect(validateCompletionAttendance(locked, [
      { studentId: 'a', status: 'present' },
      { studentId: 'b', status: 'present' },
    ])).toMatchObject({ ok: false, code: 'mismatch' });
  });

  it('accepts an empty locked roster', () => {
    expect(validateCompletionAttendance([], [])).toEqual({ ok: true, attendance: [] });
    expect(resolveSessionAttendanceRoster({
      status: 'completed',
      rosterLockedAt: '2026-09-14T00:00:00.000Z',
      attendance: [],
    }, { studentIds: ['d'] }, students)).toEqual([]);
  });

  it('keeps the legacy current-plus-historical roster when unlocked', () => {
    expect(resolveSessionAttendanceRoster({
      rosterLockedAt: null,
      status: 'completed',
      attendance: [{ studentId: 'c', studentName: 'C-then' }],
    }, { studentIds: ['a', 'd'] }, students)).toEqual([
      { id: 'a', name: 'A' },
      { id: 'd', name: 'D' },
      { id: 'c', name: 'C-then' },
    ]);
  });
});

describe('session class time collision integrity', () => {
  const scheduled = {
    id: 'a',
    classId: 'class-1',
    startAt: '2026-09-11T10:00:00.000Z',
    endAt: '2026-09-11T11:00:00.000Z',
    status: 'scheduled',
    deletedAt: null,
  };

  it('rejects an exact duplicate in the same class', () => {
    expect(findActiveClassTimeCollision({ classId: 'class-1', startAt: scheduled.startAt, endAt: scheduled.endAt }, [scheduled])).toMatchObject({ id: 'a' });
  });

  it('rejects a same-class overlap', () => {
    expect(findActiveClassTimeCollision({
      classId: 'class-1',
      startAt: '2026-09-11T10:30:00.000Z',
      endAt: '2026-09-11T11:30:00.000Z',
    }, [scheduled])).toMatchObject({ id: 'a' });
  });

  it('allows the same time on a different class', () => {
    expect(findActiveClassTimeCollision({ classId: 'class-2', startAt: scheduled.startAt, endAt: scheduled.endAt }, [scheduled])).toBeNull();
  });

  it('allows recreating a cancelled or deleted session slot', () => {
    expect(findActiveClassTimeCollision({ classId: 'class-1', startAt: scheduled.startAt, endAt: scheduled.endAt }, [
      { ...scheduled, id: 'cancelled', status: 'cancelled' },
      { ...scheduled, id: 'deleted', status: 'scheduled', deletedAt: '2026-09-11T09:00:00.000Z' },
    ])).toBeNull();
  });

  it('does not treat a session as colliding with itself', () => {
    expect(findActiveClassTimeCollision({ classId: 'class-1', startAt: scheduled.startAt, endAt: scheduled.endAt, sessionId: 'a' }, [scheduled])).toBeNull();
  });

  it('keeps a stable operator-facing collision message', () => {
    expect(CLASS_TIME_COLLISION_MESSAGE).toBe('같은 수업반의 기존 수업과 시간이 겹칩니다.');
  });
});
