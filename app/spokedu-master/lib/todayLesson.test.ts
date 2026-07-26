import { describe, expect, it } from 'vitest';

import {
  clearTodayLessonForOwner,
  getActiveTodayLesson,
  getSeoulDayKey,
  normalizeTodayLessonByOwner,
  setTodayLessonForOwner,
  TODAY_LESSON_TIME_ZONE,
} from './todayLesson';

describe('todayLesson', () => {
  it('locks dayKey contract to Asia/Seoul', () => {
    expect(TODAY_LESSON_TIME_ZONE).toBe('Asia/Seoul');
    // 2026-07-26 15:30 UTC = 2026-07-27 00:30 KST
    const seoulNextCalendarDay = getSeoulDayKey(new Date('2026-07-26T15:30:00.000Z'));
    expect(seoulNextCalendarDay).toBe('2026-07-27');
    // 같은 시각을 브라우저 로컬로 해석하면 TZ에 따라 달라질 수 있음 — Seoul 계약만 신뢰
    expect(getSeoulDayKey(new Date('2026-07-26T14:59:00.000Z'))).toBe('2026-07-26');
  });

  it('activates only for matching dayKey', () => {
    const byOwner = setTodayLessonForOwner(
      {},
      'id:1',
      { id: 'p1', title: '마커 멀리 뛰기' },
      '2026-07-27',
    );
    expect(getActiveTodayLesson(byOwner, 'id:1', '2026-07-27')?.programId).toBe('p1');
    expect(getActiveTodayLesson(byOwner, 'id:1', '2026-07-28')).toBeNull();
  });

  it('replaces previous assignment for the same owner', () => {
    const first = setTodayLessonForOwner({}, 'id:1', { id: 'p1', title: 'A' }, '2026-07-27');
    const second = setTodayLessonForOwner(first, 'id:1', { id: 'p2', title: 'B' }, '2026-07-27');
    expect(getActiveTodayLesson(second, 'id:1', '2026-07-27')?.programId).toBe('p2');
  });

  it('clears and normalizes owner maps', () => {
    const byOwner = setTodayLessonForOwner({}, 'id:1', { id: 'p1', title: 'A' }, getSeoulDayKey());
    expect(Object.keys(clearTodayLessonForOwner(byOwner, 'id:1'))).toHaveLength(0);
    expect(normalizeTodayLessonByOwner({ bad: { programId: 'x' }, 'id:1': byOwner['id:1'] })['id:1']?.programId).toBe(
      'p1',
    );
  });
});
