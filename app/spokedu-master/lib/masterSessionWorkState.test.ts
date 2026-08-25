import { describe, expect, it } from 'vitest';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { buildMasterWorkQueue, deriveMasterSessionWorkState } from './masterSessionWorkState';

const classItem: MasterClassDto = { id: 'c1', name: 'A반', studentIds: ['student'], createdAt: '', updatedAt: '' };
const makeSession = (input: Partial<MasterSessionDto> & { id: string }): MasterSessionDto => ({
  classId: 'c1', className: 'A반', startAt: '2026-08-26T07:00:00.000Z', endAt: '2026-08-26T08:00:00.000Z',
  status: 'scheduled', memo: null, completedAt: null, programs: [], attendance: [], createdAt: '', updatedAt: '', ...input,
});
const programs = (done: number, total: number) => Array.from({ length: total }, (_, index) => ({
  id: `p${index}`, sourceType: 'program' as const, programId: index, spomovePresetId: null, programTitle: `활동 ${index}`, sortOrder: index, isCompleted: index < done,
}));
const now = new Date('2026-08-26T07:30:00.000Z');

describe('MASTER Session WorkState SSOT', () => {
  it.each([
    [0, 0, 'needs-preparation', 'prepare-session'],
    [0, 3, 'ready', 'open-session'],
    [1, 3, 'in-progress', 'continue-session'],
    [3, 3, 'ready-to-wrap', 'wrap-session'],
  ] as const)('derives %s/%s as %s', (done, total, stage, intent) => {
    const state = deriveMasterSessionWorkState(makeSession({ id: stage, programs: programs(done, total) }), classItem, now);
    expect(state.stage).toBe(stage);
    expect(state.primaryIntent).toBe(intent);
  });

  it('keeps an overdue scheduled Session actionable without completing it', () => {
    const session = makeSession({ id: 'overdue', startAt: '2026-08-24T07:00:00.000Z', endAt: '2026-08-24T08:00:00.000Z', programs: programs(1, 3) });
    const state = deriveMasterSessionWorkState(session, classItem, now);
    expect(state.lifecycle).toBe('scheduled');
    expect(state.stage).toBe('in-progress');
    expect(state.timeRelation).toBe('overdue');
    expect(state.primaryLabel).toBe('수업 상태 확인');
    expect(buildMasterWorkQueue({ sessions: [session], classes: [classItem], now })).toHaveLength(1);
  });

  it('uses only the established completed attendance-empty semantics', () => {
    const missing = deriveMasterSessionWorkState(makeSession({ id: 'done', status: 'completed', programs: programs(3, 3) }), classItem, now);
    expect(missing.attention.attendanceMissing).toBe(true);
    expect(missing.primaryIntent).toBe('record-attendance');
    expect(deriveMasterSessionWorkState(makeSession({ id: 'empty-roster', status: 'completed' }), { ...classItem, studentIds: [] }, now).attention.attendanceMissing).toBe(false);
  });

  it('never treats cancelled as overdue', () => {
    const state = deriveMasterSessionWorkState(makeSession({ id: 'cancelled', status: 'cancelled', endAt: '2026-08-20T00:00:00.000Z' }), classItem, now);
    expect(state.stage).toBe('cancelled');
    expect(state.attention.overdue).toBe(false);
    expect(state.primaryIntent).toBeNull();
  });
});
