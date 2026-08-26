import { describe, expect, it } from 'vitest';
import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterSessionDto } from '../types/operational';
import { selectLatestProgramMemory } from './programMemory';

const session = (id: string, startAt: string, programId: number, memo = '일반 수업 메모'): MasterSessionDto => ({
  id,
  classId: 'class-1',
  className: '초등반',
  startAt,
  endAt: startAt,
  status: 'completed',
  memo,
  completedAt: startAt,
  scheduleRuleId: null,
  programs: [{ id: `program-${id}`, sourceType: 'program', programId, spomovePresetId: null, programTitle: '수업', sortOrder: 0, isCompleted: true }],
  attendance: [],
  createdAt: startAt,
  updatedAt: startAt,
});

const capture = (id: string, sessionId: string, applicationIdea: string | null): MasterClassRecordDto => ({
  id,
  sessionId,
  legacyId: null,
  date: '2026-08-01',
  lessonTitle: null,
  classId: 'class-1',
  programId: null,
  programTitle: null,
  recordType: 'detailed',
  memo: null,
  applicationIdea,
  parentNoteSnapshot: null,
  present: 0,
  absent: 0,
  focusCount: 0,
  skillCount: 0,
  students: [],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
});

describe('program memory selection', () => {
  it('uses only explicit Capture next-session notes and keeps the exact Session identity', () => {
    const result = selectLatestProgramMemory({
      programId: '7',
      sessions: [
        session('older', '2026-08-01T07:00:00.000Z', 7),
        session('newer', '2026-08-08T07:00:00.000Z', 7, '민감할 수 있는 일반 메모'),
      ],
      captures: [capture('capture-1', 'older', '설명을 짧게 하기'), capture('capture-2', 'newer', '시범 먼저 보여주기')],
    });

    expect(result).toEqual({
      sessionId: 'newer',
      date: '2026-08-08T07:00:00.000Z',
      className: '초등반',
      nextSessionNote: '시범 먼저 보여주기',
    });
  });

  it('never falls back to session.memo or another program', () => {
    expect(selectLatestProgramMemory({
      programId: '7',
      sessions: [session('memo-only', '2026-08-08T07:00:00.000Z', 7), session('other', '2026-08-09T07:00:00.000Z', 8)],
      captures: [capture('empty', 'memo-only', '   '), capture('other-note', 'other', '다른 수업의 적용점')],
    })).toBeNull();
  });
});
