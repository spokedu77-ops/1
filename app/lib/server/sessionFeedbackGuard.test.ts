import { describe, expect, it } from 'vitest';
import { assertSessionSchedulePreservesFeedback, isFutureSessionDay } from './sessionFeedbackGuard';

const now = new Date('2026-11-06T15:10:00Z'); // November 7 in Korea.
const session = { start_at: '2026-09-07T05:00:00Z', status: 'verified', feedback_fields: { activity: 'recorded' } };

describe('retrospective teaching-date corrections', () => {
  it.each(['2026-11-06T05:00:00Z', '2026-11-06T15:00:00Z', '2026-11-07T14:59:59Z'])(
    'allows past and today corrections in Korean time: %s', (startAt) => {
      const before = structuredClone(session);
      expect(() => assertSessionSchedulePreservesFeedback(session, startAt, now)).not.toThrow();
      expect(session).toEqual(before);
    },
  );
  it.each([
    { status: 'finished' }, { status: 'verified' }, { feedback_fields: { activity: 'recorded' } },
    { photo_url: ['photo'] }, { file_url: ['file'] }, { students_text: '✅ 오늘 수업: 기록' },
  ])('rejects future reuse of completion or feedback: %j', (record) => {
    expect(() => assertSessionSchedulePreservesFeedback({ start_at: session.start_at, ...record }, '2026-11-07T15:00:00Z', now))
      .toThrow('SESSION_RECORDED_SCHEDULE_MOVE_FORBIDDEN');
  });
  it('allows future scheduling without teaching evidence', () => {
    expect(() => assertSessionSchedulePreservesFeedback({ start_at: session.start_at, status: 'opened', students_text: 'EXTRA_TEACHERS:[]' }, '2026-11-07T15:00:00Z', now)).not.toThrow();
  });
  it('keeps future feedback restricted at the Korean midnight boundary', () => {
    expect(isFutureSessionDay('2026-11-07T14:59:59Z', now)).toBe(false);
    expect(isFutureSessionDay('2026-11-07T15:00:00Z', now)).toBe(true);
  });
});
