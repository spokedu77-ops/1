import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { buildNextSessionDateTimes, buildNextSessionDraft } from './nextSession';

const source: MasterSessionDto = {
  id: 'source', classId: 'class-a', className: '양화초',
  startAt: '2026-08-23T01:00:00.000Z', startedAt: null, endAt: '2026-08-23T02:30:00.000Z',
  status: 'completed', memo: '과거 메모', completedAt: '2026-08-23T02:30:00.000Z',
  programs: [], attendance: [], createdAt: '', updatedAt: '',
};

describe('next Session draft', () => {
  it('suggests Seoul day +7 while preserving start/end time', () => {
    expect(buildNextSessionDraft(source, new Date('2026-08-26T00:00:00Z'))).toEqual({
      day: '2026-08-30', startTime: '10:00', endTime: '11:30', endDayOffset: 0,
    });
  });

  it('allows changing the suggested day', () => {
    const draft = { ...buildNextSessionDraft(source, new Date('2026-08-26T00:00:00Z')), day: '2026-09-02' };
    expect(buildNextSessionDateTimes(draft)).toEqual({
      startAt: '2026-09-02T10:00', endAt: '2026-09-02T11:30',
    });
  });

  it('preserves an overnight duration boundary', () => {
    const overnight = { ...source, startAt: '2026-08-23T14:30:00.000Z', endAt: '2026-08-23T15:30:00.000Z' };
    const draft = buildNextSessionDraft(overnight, new Date('2026-08-26T00:00:00Z'));
    expect(draft).toMatchObject({ day: '2026-08-30', startTime: '23:30', endTime: '00:30', endDayOffset: 1 });
    expect(buildNextSessionDateTimes(draft).endAt).toBe('2026-08-31T00:30');
  });

  it('advances an old Session to the next future same-weekday occurrence', () => {
    expect(buildNextSessionDraft(source, new Date('2026-09-01T00:00:00Z')).day).toBe('2026-09-06');
  });
});
