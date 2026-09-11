import { describe, expect, it } from 'vitest';
import {
  CLASS_TIME_COLLISION_MESSAGE,
  completionAttendanceMessage,
  findActiveClassTimeCollision,
  validateCompletionAttendance,
} from './sessionIntegrity';

const roster = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
const present = (studentId: string) => ({ studentId, status: 'present' as const });

describe('session completion attendance integrity', () => {
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
