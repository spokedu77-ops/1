import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';
import { resolvePreviousSessionMemory } from '../lib/sessionMemory';
import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { resolveSessionWorkspacePresentation } from './masterSessionWorkspaceModel';
import { getSessionActionPolicy } from './sessionActionPolicy';
import { shouldApplyServerSessionCapture } from './sessionCaptureDraft';

const sheet = readFileSync(join(process.cwd(), 'app/spokedu-master/manage/session-detail/SessionDetailSheet.tsx'), 'utf8');
const capture = readFileSync(join(process.cwd(), 'app/spokedu-master/activity/SessionCapturePanel.tsx'), 'utf8');

const classItem: MasterClassDto = { id: 'c1', name: 'A반', studentIds: ['a', 'b'], createdAt: '', updatedAt: '' };

function session(overrides: Partial<MasterSessionDto>): MasterSessionDto {
  return {
    id: 's1', classId: 'c1', className: 'A반', startAt: '2026-09-01T01:00:00.000Z', endAt: '2026-09-01T02:00:00.000Z',
    startedAt: null, status: 'scheduled', memo: null, completedAt: null, programs: [], attendance: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('premium memory on the normal next session', () => {
  it('shows previous note and roster observations in PREP memory without capture=1', () => {
    const completed = session({
      id: 'round-1',
      status: 'completed',
      completedAt: '2026-09-01T02:00:00.000Z',
      startAt: '2026-09-01T01:00:00.000Z',
    });
    const next = session({
      id: 'round-2',
      status: 'scheduled',
      startAt: '2026-09-08T01:00:00.000Z',
      endAt: '2026-09-08T02:00:00.000Z',
    });
    const workState = deriveMasterSessionWorkState(next, classItem);
    const presentation = resolveSessionWorkspacePresentation({
      workState,
      actions: getSessionActionPolicy(next.status),
      programs: next.programs,
      startedAt: next.startedAt,
    });
    expect(presentation.captureMode).toBe('memory');
    const captures = [{
      id: 'cap-1',
      sessionId: 'round-1',
      applicationIdea: 'NEXT-ROUND-2',
      students: [
        { id: 'o1', studentId: 'a', studentName: 'A', memo: 'A-ROUND-1' },
        { id: 'o2', studentId: 'b', studentName: 'B', memo: 'B-ROUND-1' },
        { id: 'o3', studentId: 'other-class', studentName: 'C', memo: 'OTHER' },
      ],
    }] as MasterClassRecordDto[];
    const previous = resolvePreviousSessionMemory({ currentSession: next, classSessions: [completed, next], captures });
    expect(previous?.capture?.applicationIdea).toBe('NEXT-ROUND-2');
    const roster = new Set(['a', 'b']);
    const observations = previous?.capture?.students.filter((item) => item.studentId && roster.has(item.studentId)) ?? [];
    expect(observations.map((item) => `${item.studentName}:${item.memo}`)).toEqual(['A:A-ROUND-1', 'B:B-ROUND-1']);
    expect(sheet).toContain('resolveSessionWorkspacePresentation');
    expect(sheet).toContain("legacyCapture ? 'emphasized'");
    expect(sheet).toContain('presentation?.captureMode');
    expect(sheet).not.toContain('legacyCapture && draft.activeSession');
    expect(sheet).toContain("nextStatus === 'completed' && captureRef.current");
  });
});

describe('session capture draft recovery', () => {
  it('keeps a dirty draft when a late GET resolves', () => {
    expect(shouldApplyServerSessionCapture({
      dirty: true,
      requestedSessionId: 'session-1',
      activeSessionId: 'session-1',
    })).toBe(false);
  });

  it('hydrates only a clean draft for the session that was requested', () => {
    expect(shouldApplyServerSessionCapture({
      dirty: false,
      requestedSessionId: 'session-1',
      activeSessionId: 'session-1',
    })).toBe(true);
    expect(shouldApplyServerSessionCapture({
      dirty: false,
      requestedSessionId: 'session-1',
      activeSessionId: 'session-2',
    })).toBe(false);
  });

  it('does not clear the editor when save fails', () => {
    const save = capture.slice(capture.indexOf('async function save()'), capture.indexOf('useImperativeHandle(ref'));
    expect(save).toContain('dirtyRef.current = false');
    expect(save).toContain('setSaveError(true)');
    expect(save).not.toContain("setNextNote('')");
    expect(save).not.toContain('setObservations({})');
    expect(save).not.toContain('setOpen(false)');
    expect(capture).toContain('shouldApplyServerSessionCapture');
    expect(capture).toContain('dirtyRef.current = true');
  });
});
