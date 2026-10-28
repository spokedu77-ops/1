import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { buildMonthCalendar } from './monthCalendar';

const session = (id: string, startAt: string): MasterSessionDto => ({
  id,
  classId: 'c',
  className: 'A반',
  startAt,
  startedAt: null,
  endAt: startAt,
  status: 'scheduled',
  memo: null,
  completedAt: null,
  programs: [],
  attendance: [],
  createdAt: '',
  updatedAt: '',
});

describe('buildMonthCalendar performance baseline', () => {
  it('builds a 42-day grid for a month with many sessions', () => {
    const sessions = Array.from({ length: 120 }, (_, index) =>
      session(`s-${index}`, `2026-08-${String((index % 28) + 1).padStart(2, '0')}T01:00:00.000Z`),
    );
    const started = performance.now();
    const days = buildMonthCalendar('2026-08', sessions);
    const elapsed = performance.now() - started;
    expect(days).toHaveLength(42);
    expect(elapsed).toBeLessThan(50);
  });
});
