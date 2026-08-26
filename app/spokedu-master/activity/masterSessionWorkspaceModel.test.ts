import { describe, expect, it } from 'vitest';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { getSessionActionPolicy } from './sessionActionPolicy';
import { resolveSessionWorkspacePresentation } from './masterSessionWorkspaceModel';

const classItem: MasterClassDto = { id: 'c1', name: 'A반', studentIds: ['s1'], createdAt: '', updatedAt: '' };
const now = new Date('2026-08-26T07:30:00.000Z');
const programs = (done: number, total: number): MasterSessionDto['programs'] => Array.from({ length: total }, (_, index) => ({
  id: `p${index + 1}`, sourceType: 'program', programId: index + 1, spomovePresetId: null,
  programTitle: `활동 ${index + 1}`, sortOrder: index, isCompleted: index < done,
}));
const session = (overrides: Partial<MasterSessionDto> = {}): MasterSessionDto => ({
  id: 's1', classId: 'c1', className: 'A반', startAt: '2026-08-26T07:00:00.000Z', endAt: '2026-08-26T08:00:00.000Z',
  status: 'scheduled', memo: null, completedAt: null, programs: [], attendance: [], createdAt: '', updatedAt: '', ...overrides,
});

function presentation(input: MasterSessionDto) {
  const workState = deriveMasterSessionWorkState(input, classItem, now);
  return resolveSessionWorkspacePresentation({ workState, actions: getSessionActionPolicy(input.status), programs: input.programs });
}

describe('Session workspace presentation orchestration', () => {
  it.each([
    ['needs-preparation', session(), 'PREP', 'add-activity'],
    ['ready', session({ programs: programs(0, 3) }), 'RUN', 'run-next-activity'],
    ['in-progress', session({ programs: programs(1, 3) }), 'RUN', 'run-next-activity'],
    ['ready-to-wrap', session({ programs: programs(3, 3) }), 'WRAP', 'wrap-session'],
    ['completed', session({ status: 'completed', programs: programs(3, 3) }), 'REVIEW', 'post-session'],
    ['cancelled', session({ status: 'cancelled' }), 'RECOVERY', 'recover-session'],
    ['overdue', session({ startAt: '2026-08-20T07:00:00.000Z', endAt: '2026-08-20T08:00:00.000Z', programs: programs(1, 3) }), 'ATTENTION', 'review-status'],
  ] as const)('%s maps to %s', (_label, input, kind, intent) => {
    expect(presentation(input)).toMatchObject({ presentationKind: kind, primarySurfaceIntent: intent, showScheduleEditor: false });
  });

  it('selects the first incomplete ordered activity deterministically', () => {
    expect(presentation(session({ programs: programs(1, 4) })).nextPendingProgramId).toBe('p2');
    expect(presentation(session({ programs: programs(4, 4) })).nextPendingProgramId).toBeNull();
  });

  it('never presents an incomplete historical item as the next activity', () => {
    expect(presentation(session({ status: 'completed', programs: programs(1, 3) })).nextPendingProgramId).toBeNull();
  });
});
