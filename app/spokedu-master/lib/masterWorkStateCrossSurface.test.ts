import { describe, expect, it } from 'vitest';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { buildTodaySessionCards } from '../dashboard/todaySessionsModel';
import { buildClassCards } from '../classes/classManagementModel';
import { deriveMasterSessionWorkState } from './masterSessionWorkState';

const classItem: MasterClassDto = { id: 'c', name: 'A반', studentIds: ['s'], createdAt: '', updatedAt: '' };
const session: MasterSessionDto = {
  id: 'session', classId: 'c', className: 'A반', startAt: '2026-08-26T07:00:00Z', startedAt: null, endAt: '2026-08-26T08:00:00Z',
  status: 'scheduled', memo: null, completedAt: null, attendance: [], createdAt: '', updatedAt: '',
  programs: [
    { id: 'one', sourceType: 'spomove', programId: null, spomovePresetId: 'preset', programTitle: 'SPOMOVE', sortOrder: 0, isCompleted: true },
    { id: 'two', sourceType: 'program', programId: 2, spomovePresetId: null, programTitle: '활동', sortOrder: 1, isCompleted: false },
  ],
};
const now = new Date('2026-08-26T07:30:00Z');

describe('WorkState cross-surface consistency', () => {
  it('gives Dashboard, Class and Session the same intent for one Session', () => {
    const canonical = deriveMasterSessionWorkState(session, classItem, now);
    const dashboard = buildTodaySessionCards([session], [classItem], '2026-08-26', now)[0]!.workState;
    const classCard = buildClassCards([classItem], [session], now)[0]!.priorityWorkState!;
    expect([dashboard.stage, classCard.stage]).toEqual([canonical.stage, canonical.stage]);
    expect([dashboard.primaryIntent, classCard.primaryIntent]).toEqual([canonical.primaryIntent, canonical.primaryIntent]);
    expect(canonical.primaryIntent).toBe('continue-session');
  });

  it('moves naturally from in-progress to ready-to-wrap after SPOMOVE completion', () => {
    expect(deriveMasterSessionWorkState(session, classItem, now).stage).toBe('in-progress');
    const afterDone = { ...session, programs: session.programs.map((program) => ({ ...program, isCompleted: true })) };
    expect(deriveMasterSessionWorkState(afterDone, classItem, now).stage).toBe('ready-to-wrap');
    expect(deriveMasterSessionWorkState(session, classItem, now).stage).toBe('in-progress');
  });
});
