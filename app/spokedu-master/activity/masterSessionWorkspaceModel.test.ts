import { describe, expect, it } from 'vitest';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { resolveSessionWorkspacePresentation } from './masterSessionWorkspaceModel';

const classItem: MasterClassDto = { id: 'c1', name: 'A반', studentIds: ['s1'], createdAt: '', updatedAt: '' };
const now = new Date('2026-08-26T07:30:00.000Z');
const programs = (done: number, total: number): MasterSessionDto['programs'] => Array.from({ length: total }, (_, index) => ({
  id: `p${index + 1}`, sourceType: 'program', programId: index + 1, spomovePresetId: null,
  programTitle: `활동 ${index + 1}`, sortOrder: index, isCompleted: index < done,
}));
const session = (overrides: Partial<MasterSessionDto> = {}): MasterSessionDto => ({
  id: 's1', classId: 'c1', className: 'A반', startAt: '2026-08-26T07:00:00.000Z', endAt: '2026-08-26T08:00:00.000Z',
  startedAt: null, status: 'scheduled', memo: null, completedAt: null, programs: [], attendance: [], createdAt: '', updatedAt: '', ...overrides,
});

function presentation(input: MasterSessionDto) {
  const workState = deriveMasterSessionWorkState(input, classItem, now);
  return resolveSessionWorkspacePresentation({ workState, programs: input.programs, startedAt: input.startedAt });
}

function teachingPresentation(input: MasterSessionDto) {
  const workState = deriveMasterSessionWorkState(input, classItem, now);
  return resolveSessionWorkspacePresentation({ workState, programs: input.programs, startedAt: '2026-08-26T07:05:00.000Z' });
}

describe('Session workspace presentation orchestration', () => {
  it.each([
    ['needs-preparation', session(), 'PREP', 'add-activity'],
    ['ready', session({ programs: programs(0, 3) }), 'PREP', 'start-session'],
    ['in-progress', session({ startedAt: '2026-08-26T07:05:00.000Z', programs: programs(1, 3) }), 'RUN', 'run-next-activity'],
    ['ready-to-wrap', session({ startedAt: '2026-08-26T07:05:00.000Z', programs: programs(3, 3) }), 'WRAP', 'wrap-session'],
    ['completed', session({ status: 'completed', programs: programs(3, 3) }), 'REVIEW', 'post-session'],
    ['cancelled', session({ status: 'cancelled' }), 'RECOVERY', 'recover-session'],
    ['overdue started Session', session({ startAt: '2026-08-20T07:00:00.000Z', startedAt: '2026-08-20T07:05:00.000Z', endAt: '2026-08-20T08:00:00.000Z', programs: programs(1, 3) }), 'RUN', 'run-next-activity'],
  ] as const)('%s maps to %s', (_label, input, kind, intent) => {
    expect(presentation(input)).toMatchObject({ presentationKind: kind, primarySurfaceIntent: intent });
  });

  it('does not infer TEACH from schedule time alone', () => {
    expect(presentation(session({ startAt: '2026-08-20T07:00:00.000Z', endAt: '2026-08-20T08:00:00.000Z', programs: programs(0, 2) }))).toMatchObject({ presentationKind: 'PREP' });
  });

});

describe('Operating rhythm composition contract', () => {
  it('PREP-01: activities lead, prior-session memory stays hidden, and attendance stays below the start action', () => {
    const view = presentation(session());
    expect(view).toMatchObject({
      presentationKind: 'PREP',
      phaseLabel: '준비',
      captureMode: 'hidden',
      showInlinePremiumUpsell: false,
      primarySurfaceIntent: 'add-activity',
    });
    expect(view.sectionOrder.capture).toBeLessThan(view.sectionOrder.attendance);
    expect(view.sectionOrder.activities).toBeLessThan(view.sectionOrder.attendance);
    expect(view.sectionOrder.activities).toBeLessThan(view.sectionOrder.capture);
    expect(view.sectionOrder.primary).toBeLessThan(view.sectionOrder.attendance);
    expect(presentation(session({ programs: programs(0, 3) })).primarySurfaceIntent).toBe('start-session');
    expect(teachingPresentation(session({ programs: programs(0, 3) }))).toMatchObject({ presentationKind: 'RUN', primarySurfaceIntent: 'run-next-activity' });
  });

  it('RUN-01: activities lead while capture and memo wait for wrap', () => {
    const view = presentation(session({ startedAt: '2026-08-26T07:05:00.000Z', programs: programs(1, 3) }));
    expect(view).toMatchObject({
      presentationKind: 'RUN',
      captureMode: 'hidden',
      showInlinePremiumUpsell: false,
      primarySurfaceIntent: 'run-next-activity',
    });
    expect(view.sectionOrder.activities).toBeLessThan(view.sectionOrder.capture);
    expect(view.sectionOrder.activities).toBeLessThan(view.sectionOrder.memo);
  });

  it('WRAP-01: attendance/capture/memo surfaced, complete primary, premium upsell allowed', () => {
    const view = presentation(session({ startedAt: '2026-08-26T07:05:00.000Z', programs: programs(3, 3) }));
    expect(view).toMatchObject({
      presentationKind: 'WRAP',
      captureMode: 'emphasized',
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
      showInlinePremiumUpsell: true,
      primarySurfaceIntent: 'post-session',
    });
    expect(view.sectionOrder.primary).toBeLessThan(view.sectionOrder.capture);
  });

  it('RECOVERY hides capture and memo dump', () => {
    expect(presentation(session({ status: 'cancelled' }))).toMatchObject({
      presentationKind: 'RECOVERY',
      captureMode: 'hidden',
      showInlinePremiumUpsell: false,
      primarySurfaceIntent: 'recover-session',
    });
  });
});
