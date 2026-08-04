import { describe, expect, it } from 'vitest';
import { resolveTodayLessonNextAction } from './todayLessonNextAction';

const todayLesson = { programId: 'p1', title: '균형 잡기' };

describe('resolveTodayLessonNextAction', () => {
  it('asks for a lesson selection when no today lesson exists', () => {
    expect(resolveTodayLessonNextAction({
      todayLesson: null,
      recordDraft: null,
      savedRecord: null,
      recentSpomove: null,
    }).primary).toEqual({
      kind: 'select_lesson',
      reason: 'no_today_lesson',
    });
  });

  it('keeps a selected lesson conservative and starts with preparation', () => {
    expect(resolveTodayLessonNextAction({
      todayLesson,
      recordDraft: null,
      savedRecord: null,
      recentSpomove: null,
    }).primary).toEqual({
      kind: 'review_preparation',
      reason: 'today_lesson_selected',
    });
  });

  it('prefers an explicit same-program record draft over saved records or SPOMOVE', () => {
    expect(resolveTodayLessonNextAction({
      todayLesson,
      recordDraft: { id: 'draft-1', programId: 'p1' },
      savedRecord: { id: 'record-1', programId: 'p1' },
      recentSpomove: { presetId: 'preset-1', programId: 'p1' },
    }).primary).toEqual({
      kind: 'continue_record',
      reason: 'same_program_record_draft',
      targetId: 'draft-1',
    });
  });

  it('ignores drafts and SPOMOVE evidence without an explicit same-program link', () => {
    expect(resolveTodayLessonNextAction({
      todayLesson,
      recordDraft: { id: 'draft-1', programId: 'p2' },
      savedRecord: null,
      recentSpomove: { presetId: 'preset-1' },
    }).primary.kind).toBe('review_preparation');
  });

  it('recommends recording after same-program SPOMOVE execution when no record exists', () => {
    const result = resolveTodayLessonNextAction({
      todayLesson,
      recordDraft: null,
      savedRecord: null,
      recentSpomove: { presetId: 'preset-1', programId: 'p1' },
    });

    expect(result.primary).toEqual({
      kind: 'create_record',
      reason: 'same_program_execution_without_record',
    });
    expect(result.secondary).toEqual([{ kind: 'view_spomove', presetId: 'preset-1' }]);
  });

  it('shows the saved record and makes report creation secondary', () => {
    const result = resolveTodayLessonNextAction({
      todayLesson,
      recordDraft: null,
      savedRecord: { id: 'record-1', programId: 'p1' },
      recentSpomove: null,
    });

    expect(result.primary).toEqual({
      kind: 'view_record',
      reason: 'same_program_record_saved',
      targetId: 'record-1',
    });
    expect(result.secondary).toEqual([{ kind: 'create_report', recordId: 'record-1' }]);
  });
});
