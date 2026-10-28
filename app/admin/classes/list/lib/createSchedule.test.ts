import { describe, expect, it } from 'vitest';
import { buildCreateSchedule, scheduleValidation, type CreateScheduleForm, type DaySchedule } from './createSchedule';
const form: CreateScheduleForm = { title: '주 2회', type: 'regular_center', startDate: '2026-10-28', startTime: '10:00', durationMinutes: '60', teacherId: 'main', price: 0, weeklyFrequency: 2, daysOfWeek: [3, 6], sessionCount: 4, roundWeight: 1 };
const saturday: DaySchedule = { startTime: '19:00', durationMinutes: '90', teacherId: 'other', price: 39000, assistants: [{ id: 'assistant', price: 0 }] };
describe('creation schedule adapter', () => {
  it('generates chronological weekday-specific times, assignments and explicit zero fees', () => {
    const rows = buildCreateSchedule(form, { 6: saturday });
    expect(rows.map((row) => row.startAt.getDay())).toEqual([3, 6, 3, 6]);
    expect(rows[1]!.teacherId).toBe('other');
    expect(rows[1]!.startAt.getHours()).toBe(19);
    expect(rows[1]!.endAt.getTime() - rows[1]!.startAt.getTime()).toBe(90 * 60_000);
    expect(rows[0]!.price).toBe(0);
    expect(rows[1]!.assistants).toEqual([{ id: 'assistant', price: 0 }]);
    expect(scheduleValidation(rows)).toBeNull();
  });
  it('creates a single date for a one-day class and handles year boundaries', () => {
    expect(buildCreateSchedule({ ...form, type: 'one_day_center' }, {}).length).toBe(1);
    const rows = buildCreateSchedule({ ...form, startDate: '2026-12-30' }, {});
    expect(rows[1]!.startAt.getFullYear()).toBe(2027);
  });
  it('supports a single occurrence without changing the selected class type', () => {
    const group = { ...form, type: 'regular_group', repeatOnce: true, sessionCount: 16 };
    expect(buildCreateSchedule(group, {})).toHaveLength(1);
    expect(group.type).toBe('regular_group');
  });
  it('rejects invalid input without hanging and duplicate assignments before save', () => {
    expect(buildCreateSchedule({ ...form, sessionCount: -1 }, {})).toEqual([]);
    expect(buildCreateSchedule({ ...form, daysOfWeek: [] }, {})).toEqual([]);
    const rows = buildCreateSchedule(form, { 6: { ...saturday, assistants: [{ id: 'other', price: 0 }] } });
    expect(scheduleValidation(rows)).toContain('중복');
  });
  it('rejects overlapping sessions for either main or assistant assignments', () => {
    const rows = buildCreateSchedule(form, {});
    rows[1] = { ...rows[0]!, roundIndex: 2, teacherId: 'second', assistants: [{ id: 'main', price: 0 }] };
    expect(scheduleValidation(rows)).toContain('겹칩니다');
  });
});
