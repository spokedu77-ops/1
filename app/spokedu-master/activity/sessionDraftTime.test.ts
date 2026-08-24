import { describe, expect, it } from 'vitest';
import { changeSessionEnd, changeSessionStart, createSessionTimeDraft, sessionTimeDraftToInputs } from './sessionDraftTime';

describe('new Session time draft', () => {
  it('starts with a 60-minute duration', () => {
    expect(createSessionTimeDraft('2026-08-25', '16:00')).toEqual({ day: '2026-08-25', startTime: '16:00', endTime: '17:00', durationMinutes: 60 });
  });

  it('preserves the current duration when start moves', () => {
    const ninetyMinutes = changeSessionEnd(createSessionTimeDraft('2026-08-25', '16:00'), '17:30');
    expect(changeSessionStart(ninetyMinutes, '17:30')).toMatchObject({ startTime: '17:30', endTime: '19:00', durationMinutes: 90 });
  });

  it('keeps the existing overnight contract without extra UI state', () => {
    const overnight = changeSessionEnd(createSessionTimeDraft('2026-08-25', '23:30'), '00:30');
    expect(sessionTimeDraftToInputs(overnight)).toEqual({ startAt: '2026-08-25T23:30', endAt: '2026-08-26T00:30' });
  });
});
