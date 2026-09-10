import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { buildMonthCalendar, moveMonth, clampDayToMonth } from './monthCalendar';

const session = (id: string, startAt: string): MasterSessionDto => ({ id, classId: 'c', className: 'A반', startAt, startedAt: null, endAt: startAt, status: 'scheduled', memo: null, completedAt: null, programs: [], attendance: [], createdAt: '', updatedAt: '' });

describe('month Session calendar', () => {
  it('builds a Monday-first six-week grid', () => {
    const days = buildMonthCalendar('2026-08', []);
    expect(days).toHaveLength(42);
    expect(days[0].day).toBe('2026-07-27');
    expect(days[41].day).toBe('2026-09-06');
  });

  it('keeps multiple Sessions on the exact day', () => {
    const day = buildMonthCalendar('2026-08', [session('a', '2026-08-25T01:00:00.000Z'), session('b', '2026-08-25T05:00:00.000Z')]).find((item) => item.day === '2026-08-25');
    expect(day?.sessions.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('moves across year boundaries', () => {
    expect(moveMonth('2026-12', 1)).toBe('2027-01');
  });

  it('clamps a selected day into a shorter month', () => {
    expect(clampDayToMonth('2026-01-31', '2026-02')).toBe('2026-02-28');
    expect(clampDayToMonth('2026-03-15', '2026-04')).toBe('2026-04-15');
  });
});
