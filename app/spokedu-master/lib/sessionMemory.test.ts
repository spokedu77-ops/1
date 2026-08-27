import { describe, expect, it } from 'vitest';
import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterSessionDto } from '../types/operational';
import { buildSessionMemoryView, resolvePreviousSessionMemory } from './sessionMemory';

const session = (id: string, startAt: string, status: MasterSessionDto['status'] = 'completed'): MasterSessionDto => ({
  id, classId: 'c1', className: 'A', startAt, endAt: startAt, status, memo: 'session memo', completedAt: startAt,
  programs: [], attendance: [], createdAt: '', updatedAt: '',
});
const capture = (sessionId: string, note = 'repeat'): MasterClassRecordDto => ({
  id: `r-${sessionId}`, sessionId, legacyId: null, date: '2026-08-26', lessonTitle: null, classId: 'c1', programId: null,
  programTitle: null, recordType: 'detailed', memo: 'legacy duplicate must be ignored', applicationIdea: note,
  parentNoteSnapshot: null, present: 0, absent: 0, focusCount: 0, skillCount: 0, students: [], createdAt: '', updatedAt: '',
});

describe('Session memory projection', () => {
  it('uses exact session identity and latest same-day prior completed Session', () => {
    const current = session('s3', '2026-08-26T09:00:00Z', 'scheduled');
    const result = resolvePreviousSessionMemory({ currentSession: current, classSessions: [session('s1', '2026-08-26T06:00:00Z'), session('s2', '2026-08-26T08:00:00Z')], captures: [capture('s1'), capture('s2', 'latest')] });
    expect(result?.session.id).toBe('s2');
    expect(result?.capture?.applicationIdea).toBe('latest');
  });
  it('ignores future, cancelled, other-class and legacy captures', () => {
    const current = session('s2', '2026-08-26T08:00:00Z', 'scheduled');
    const legacy = { ...capture(''), sessionId: null };
    expect(resolvePreviousSessionMemory({ currentSession: current, classSessions: [session('future', '2026-08-27T08:00:00Z'), session('cancel', '2026-08-25T08:00:00Z', 'cancelled')], captures: [legacy] })).toBeNull();
  });
  it('never skips the nearest completed Session to find an older note', () => {
    const current = session('s3', '2026-08-26T09:00:00Z', 'scheduled');
    const result = resolvePreviousSessionMemory({
      currentSession: current,
      classSessions: [session('s1', '2026-08-26T06:00:00Z'), session('s2', '2026-08-26T08:00:00Z')],
      captures: [capture('s1', 'older note')],
    });
    expect(result?.session.id).toBe('s2');
    expect(result?.capture).toBeNull();
  });
  it('projects attendance, programs and overall memo only from Session', () => {
    const view = buildSessionMemoryView(session('s1', '2026-08-26T08:00:00Z'), capture('s1'));
    expect(view.sessionMemo).toBe('session memo');
    expect(view.nextSessionNote).toBe('repeat');
  });
});
