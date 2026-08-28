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

function teachingPresentation(input: MasterSessionDto) {
  const workState = deriveMasterSessionWorkState(input, classItem, now);
  return resolveSessionWorkspacePresentation({ workState, actions: getSessionActionPolicy(input.status), programs: input.programs, teachingStarted: true });
}

describe('Session workspace presentation orchestration', () => {
  it.each([
    ['needs-preparation', session(), 'PREP', 'add-activity'],
    ['ready', session({ programs: programs(0, 3) }), 'PREP', 'start-session'],
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

describe('Operating rhythm composition contract', () => {
  it('PREP-01: activities lead, memory is brief, and attendance stays below the start action', () => {
    const view = presentation(session());
    expect(view).toMatchObject({
      presentationKind: 'PREP',
      phaseLabel: '준비',
      captureMode: 'memory',
      attendanceMode: 'collapsed',
      attendanceDefaultOpen: false,
      memoMode: 'hidden',
      showInlinePremiumUpsell: false,
      primarySurfaceIntent: 'add-activity',
    });
    expect(view.sectionOrder.capture).toBeLessThan(view.sectionOrder.attendance);
    expect(view.sectionOrder.activities).toBeLessThan(view.sectionOrder.attendance);
    expect(view.sectionOrder.activities).toBeLessThan(view.sectionOrder.capture);
    expect(view.sectionOrder.primary).toBeLessThan(view.sectionOrder.attendance);
    expect(presentation(session({ programs: programs(0, 3) })).primarySurfaceIntent).toBe('start-session');
    expect(teachingPresentation(session({ programs: programs(0, 3) }))).toMatchObject({ presentationKind: 'RUN', primarySurfaceIntent: 'run-next-activity', nextPendingProgramId: 'p1' });
  });

  it('RUN-01: activities lead while capture and memo wait for wrap', () => {
    const view = presentation(session({ programs: programs(1, 3) }));
    expect(view).toMatchObject({
      presentationKind: 'RUN',
      captureMode: 'hidden',
      attendanceMode: 'summary',
      memoMode: 'hidden',
      showInlinePremiumUpsell: false,
      primarySurfaceIntent: 'run-next-activity',
    });
    expect(view.sectionOrder.activities).toBeLessThan(view.sectionOrder.capture);
    expect(view.sectionOrder.activities).toBeLessThan(view.sectionOrder.memo);
  });

  it('WRAP-01: attendance/capture/memo surfaced, complete primary, premium upsell allowed', () => {
    const view = presentation(session({ programs: programs(3, 3) }));
    expect(view).toMatchObject({
      presentationKind: 'WRAP',
      captureMode: 'emphasized',
      attendanceMode: 'attention',
      attendanceDefaultOpen: true,
      memoMode: 'emphasized',
      showInlinePremiumUpsell: true,
      primarySurfaceIntent: 'wrap-session',
    });
    expect(view.sectionOrder.attendance).toBeLessThan(view.sectionOrder.activities);
    expect(view.sectionOrder.primary).toBeLessThan(view.sectionOrder.activities);
  });

  it('REVIEW-01: readable history surfaces, next primary, no schedule edit', () => {
    const view = presentation(session({ status: 'completed', programs: programs(3, 3) }));
    expect(view).toMatchObject({
      presentationKind: 'REVIEW',
      captureMode: 'review',
      memoMode: 'review',
      showInlinePremiumUpsell: true,
      scheduleEditingAvailable: false,
      primarySurfaceIntent: 'post-session',
    });
    expect(view.sectionOrder.primary).toBeLessThan(view.sectionOrder.capture);
  });

  it('RECOVERY hides capture and memo dump', () => {
    expect(presentation(session({ status: 'cancelled' }))).toMatchObject({
      presentationKind: 'RECOVERY',
      captureMode: 'hidden',
      memoMode: 'hidden',
      showInlinePremiumUpsell: false,
      primarySurfaceIntent: 'recover-session',
    });
  });
});
