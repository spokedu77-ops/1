import { describe, expect, it } from 'vitest';

import {
  addTodayLessonForOwner,
  getActiveTodayLesson,
  getActiveTodayLessons,
  getSeoulDayKey,
  normalizeTodayLessonByOwner,
  removeTodayLessonForOwner,
  TODAY_LESSON_TIME_ZONE,
} from './todayLesson';

describe('todayLesson', () => {
  it('locks dayKey contract to Asia/Seoul', () => {
    expect(TODAY_LESSON_TIME_ZONE).toBe('Asia/Seoul');
    expect(getSeoulDayKey(new Date('2026-07-26T15:30:00.000Z'))).toBe('2026-07-27');
    expect(getSeoulDayKey(new Date('2026-07-26T14:59:00.000Z'))).toBe('2026-07-26');
  });

  it('accumulates in assignment order without duplicates and keeps a primary anchor', () => {
    const first = addTodayLessonForOwner({}, 'id:1', { id: 'p1', title: 'A' }, '2026-07-27');
    const second = addTodayLessonForOwner(first, 'id:1', { id: 'p2', title: 'B' }, '2026-07-27');
    const third = addTodayLessonForOwner(second, 'id:1', { id: 'p1', title: 'A' }, '2026-07-27');
    expect(getActiveTodayLessons(third, 'id:1', '2026-07-27').map((item) => item.programId)).toEqual(['p1', 'p2']);
    expect(getActiveTodayLesson(third, 'id:1', '2026-07-27')?.programId).toBe('p1');
  });

  it('removes only the selected program and isolates owners', () => {
    let byOwner = addTodayLessonForOwner({}, 'id:1', { id: 'p1', title: 'A' }, '2026-07-27');
    byOwner = addTodayLessonForOwner(byOwner, 'id:1', { id: 'p2', title: 'B' }, '2026-07-27');
    byOwner = addTodayLessonForOwner(byOwner, 'id:2', { id: 'p3', title: 'C' }, '2026-07-27');
    const next = removeTodayLessonForOwner(byOwner, 'id:1', 'p2');
    expect(getActiveTodayLessons(next, 'id:1', '2026-07-27').map((item) => item.programId)).toEqual(['p1']);
    expect(getActiveTodayLessons(next, 'id:2', '2026-07-27').map((item) => item.programId)).toEqual(['p3']);
  });

  it('hides stale assignments and migrates legacy singles safely', () => {
    const legacy = { programId: 'p1', programTitle: 'A', assignedAt: '2026-07-27T00:00:00Z', dayKey: '2026-07-27' };
    const normalized = normalizeTodayLessonByOwner({ 'id:1': legacy, 'id:2': [legacy, legacy], bad: { programId: 'x' }, 'email:x': null });
    expect(normalized['id:1']).toEqual([legacy]);
    expect(normalized['id:2']).toEqual([legacy]);
    expect(getActiveTodayLessons(normalized, 'id:1', '2026-07-28')).toEqual([]);
    expect(normalized['email:x']).toBeUndefined();
  });
});
