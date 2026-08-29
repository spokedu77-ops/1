import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { buildWeeklyAgenda, getScheduleAction, getScheduleWeekDays } from './weeklyAgenda';

const session = (id: string, startAt: string, overrides: Partial<MasterSessionDto> = {}): MasterSessionDto => ({
  id, classId: 'class-1', className: '하나울 A반', startAt, endAt: startAt,
  status: 'scheduled', startedAt: null, completedAt: null, memo: null, programs: [], attendance: [],
  createdAt: startAt, updatedAt: startAt, ...overrides,
});

describe('weekly Schedule agenda', () => {
  it('uses a Monday-to-Sunday week and deduplicates each Session', () => {
    expect(getScheduleWeekDays('2026-08-30')).toEqual(['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30']);
    const item = session('one', '2026-08-30T07:00:00.000Z');
    expect(buildWeeklyAgenda('2026-08-30', [item, item]).flatMap((day) => day.sessions).map((entry) => entry.id)).toEqual(['one']);
  });

  it('maps persisted Session truth to direct next actions', () => {
    expect(getScheduleAction(session('prep', '2026-08-30T07:00:00.000Z')).label).toBe('수업 준비하기');
    expect(getScheduleAction(session('run', '2026-08-30T07:00:00.000Z', { startedAt: '2026-08-30T07:01:00.000Z' })).label).toBe('수업 계속하기');
    expect(getScheduleAction(session('wrap', '2026-08-30T07:00:00.000Z', { programs: [{ id: 'p', programId: 1, programTitle: '활동', sourceType: 'program', spomovePresetId: null, sortOrder: 0, isCompleted: true }] })).label).toBe('수업 마무리하기');
    expect(getScheduleAction(session('done', '2026-08-30T07:00:00.000Z', { status: 'completed' })).label).toBe('완료');
    expect(getScheduleAction(session('cancelled', '2026-08-30T07:00:00.000Z', { status: 'cancelled' })).label).toBe('취소');
  });
});
