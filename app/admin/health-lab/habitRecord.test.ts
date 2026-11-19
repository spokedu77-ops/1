import { describe, expect, it } from 'vitest';
import { applyHabitDraft, habitHeading } from './habitRecord';
import type { HabitLog } from './missionEngine';

const blank: HabitLog = { childId: 'virtual-child-a', date: '2026-11-20', vegetables: null, movementPlay: null, bedtime: null, wakeTime: null, mediaMinutes: null };

describe('habit records', () => {
  it('names today and a past date differently', () => {
    expect(habitHeading('2026-11-20', '2026-11-20')).toBe('오늘의 건강습관');
    expect(habitHeading('2026-11-19', '2026-11-20')).toBe('11월 19일 건강습관');
  });

  it('does not create an empty log and can clear an existing one', () => {
    const saved: HabitLog = { ...blank, mediaMinutes: 0 };
    expect(applyHabitDraft([], blank, '11월 20일').ok).toBe(false);
    expect(applyHabitDraft([], blank, '11월 20일').habitLogs).toEqual([]);
    const cleared = applyHabitDraft([saved], blank, '11월 20일');
    expect(cleared.ok).toBe(true);
    expect(cleared.habitLogs).toEqual([]);
  });

  it('keeps zero minutes distinct for one child and date', () => {
    const saved = applyHabitDraft([], { ...blank, mediaMinutes: 0 }, '11월 20일');
    expect(saved.habitLogs).toEqual([{ ...blank, mediaMinutes: 0 }]);
    const otherDay = applyHabitDraft(saved.habitLogs, { ...blank, date: '2026-11-19', vegetables: 'no' }, '11월 19일');
    expect(otherDay.habitLogs).toHaveLength(2);
  });
});
