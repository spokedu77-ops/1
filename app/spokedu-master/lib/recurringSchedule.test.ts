import { describe, expect, it } from 'vitest';
import { buildScheduleOccurrencePreview, occurrenceOverlaps } from './recurringSchedule';

describe('MASTER recurring schedule planning', () => {
  it('creates weekly Seoul occurrences with preserved duration', () => {
    const rows = buildScheduleOccurrencePreview({ cadence: 'weekly', weekday: 3, startTime: '16:00', startsOn: '2026-09-01', count: 4, durationMinutes: 60 });
    expect(rows.map((row) => row.day)).toEqual(['2026-09-02', '2026-09-09', '2026-09-16', '2026-09-23']);
    expect(rows[0]?.startAt).toBe('2026-09-02T07:00:00.000Z');
    expect(new Date(rows[0]!.endAt).getTime() - new Date(rows[0]!.startAt).getTime()).toBe(3_600_000);
  });
  it('supports biweekly and multiple independent rule previews', () => {
    expect(buildScheduleOccurrencePreview({ cadence: 'biweekly', weekday: 1, startTime: '10:00', startsOn: '2026-09-01', count: 3, durationMinutes: 50 }).map((row) => row.day))
      .toEqual(['2026-09-07', '2026-09-21', '2026-10-05']);
  });
  it('treats overlap as a conflict but cancelled occurrences as reusable', () => {
    const startAt = '2026-09-02T07:00:00.000Z'; const endAt = '2026-09-02T08:00:00.000Z';
    expect(occurrenceOverlaps(startAt, endAt, [{ startAt, endAt, status: 'scheduled' }])).toBe(true);
    expect(occurrenceOverlaps(startAt, endAt, [{ startAt, endAt, status: 'cancelled' }])).toBe(false);
  });
});
