import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { buildNextSessionCarryoverInput } from '../activity/sessionCarryover';
import { resolveSessionWorkspacePresentation } from '../activity/masterSessionWorkspaceModel';
import { resolvePreviousSessionCandidates } from './previousSessionCandidates';
import { resolveScheduledSessionPrimaryAction } from './session-detail/SessionActions';
import { resolveSessionDisplayStatus } from './session-detail/sessionDisplayStatus';

const classItem: MasterClassDto = { id: 'c1', name: 'A반', studentIds: [], createdAt: '', updatedAt: '' };
const session = (id: string, startAt: string, overrides: Partial<MasterSessionDto> = {}): MasterSessionDto => ({
  id, classId: 'c1', className: 'A반', startAt, endAt: new Date(new Date(startAt).getTime() + 3_600_000).toISOString(),
  startedAt: null, status: 'scheduled', memo: null, completedAt: null, programs: [], attendance: [], createdAt: '', updatedAt: '', ...overrides,
});

describe('Class Management protected invariants', () => {
  it('resolves status from status plus startedAt', () => {
    expect(resolveSessionDisplayStatus({ status: 'scheduled', startedAt: null }).label).toBe('예정');
    expect(resolveSessionDisplayStatus({ status: 'scheduled', startedAt: '2026-09-01T01:00:00Z' }).label).toBe('진행 중');
    expect(resolveSessionDisplayStatus({ status: 'completed', startedAt: null }).label).toBe('완료');
    expect(resolveSessionDisplayStatus({ status: 'cancelled', startedAt: null }).label).toBe('취소');
  });

  it('uses startedAt rather than activity completion to distinguish PREP and RUN', () => {
    const program = { id: 'p1', sourceType: 'program' as const, programId: 1, spomovePresetId: null, programTitle: '활동', sortOrder: 0, isCompleted: false };
    const prep = session('prep', '2026-09-01T01:00:00Z', { programs: [program] });
    const run = session('run', '2026-09-01T01:00:00Z', { startedAt: '2026-09-01T01:05:00Z', programs: [program] });
    expect(deriveMasterSessionWorkState(prep, classItem).stage).toBe('ready');
    expect(deriveMasterSessionWorkState(run, classItem).stage).toBe('in-progress');
  });

  it('keeps start in PREP and complete in both RUN and WRAP', () => {
    expect(resolveScheduledSessionPrimaryAction(false, 'start-session')).toBe('start');
    expect(resolveScheduledSessionPrimaryAction(false, 'run-next-activity')).toBe('complete');
    expect(resolveScheduledSessionPrimaryAction(false, 'wrap-session')).toBe('complete');
    expect(resolveScheduledSessionPrimaryAction(false, 'run-next-activity')).not.toBeNull();
  });

  it('keeps every earlier completed Session, including three from one Class', () => {
    const rows = ['2026-09-03T01:00:00Z', '2026-09-02T01:00:00Z', '2026-09-01T01:00:00Z']
      .map((startAt, index) => session(`s${index}`, startAt, { status: 'completed', completedAt: startAt }));
    expect(resolvePreviousSessionCandidates(rows, '2026-09-04').map((item) => item.id)).toEqual(['s0', 's1', 's2']);
  });

  it('keeps the three explicit carryover modes', () => {
    expect(buildNextSessionCarryoverInput('none', ['a', 'b'], ['a'])).toEqual({ copyPrograms: false });
    expect(buildNextSessionCarryoverInput('all', ['a', 'b'], [])).toEqual({ sourceSessionProgramIds: ['a', 'b'] });
    expect(buildNextSessionCarryoverInput('selective', ['a', 'b'], ['b', 'x'])).toEqual({ sourceSessionProgramIds: ['b'] });
  });

  it('keeps recurrence out of the current UI and fresh roster fallback out of runtime', () => {
    const detail = readFileSync('app/spokedu-master/manage/session-detail/SessionDetailSheet.tsx', 'utf8');
    const classDetail = readFileSync('app/spokedu-master/classes/[classId]/page.tsx', 'utf8');
    const route = readFileSync('app/api/spokedu-master/sessions/[sessionId]/next/route.ts', 'utf8');
    expect(`${detail}\n${classDetail}`).not.toMatch(/RegularSchedulePanel|createRecurringSession|schedule\.repeatMode/);
    expect(route).not.toContain('spokedu_master_create_next_session_fresh');
    expect(route).toContain('활동 가져오기 방식을 확인해 주세요.');
  });

  it('keeps presentation lifecycle fields while dead presentation fields stay removed', () => {
    const input = session('run', '2026-09-01T01:00:00Z', { startedAt: '2026-09-01T01:05:00Z' });
    const workState = deriveMasterSessionWorkState(input, classItem);
    const view = resolveSessionWorkspacePresentation({ workState, programs: input.programs, startedAt: input.startedAt });
    expect(view).toMatchObject({ presentationKind: 'RUN', primarySurfaceIntent: 'run-next-activity', captureMode: 'hidden' });
  });
});
