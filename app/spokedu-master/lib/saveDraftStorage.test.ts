import { afterEach, describe, expect, it } from 'vitest';

import {
  CLASS_RECORD_DRAFT_KEY,
  clearSaveDraft,
  hasMeaningfulClassRecordDraft,
  readSaveDraft,
  writeSaveDraft,
} from './saveDraftStorage';

afterEach(() => {
  clearSaveDraft(CLASS_RECORD_DRAFT_KEY);
});

describe('saveDraftStorage', () => {
  it('round-trips draft values in sessionStorage', () => {
    writeSaveDraft(CLASS_RECORD_DRAFT_KEY, { classMemo: '현장 메모', classId: 'A반' });
    expect(readSaveDraft<{ classMemo: string; classId: string }>(CLASS_RECORD_DRAFT_KEY)).toEqual({
      classMemo: '현장 메모',
      classId: 'A반',
    });
  });

  it('clears drafts after successful save', () => {
    writeSaveDraft(CLASS_RECORD_DRAFT_KEY, { classMemo: 'x' });
    clearSaveDraft(CLASS_RECORD_DRAFT_KEY);
    expect(readSaveDraft(CLASS_RECORD_DRAFT_KEY)).toBeNull();
  });

  it('detects meaningful class-record drafts', () => {
    expect(hasMeaningfulClassRecordDraft(null)).toBe(false);
    expect(hasMeaningfulClassRecordDraft({ classId: '수업', attendance: { a: 'pending' } })).toBe(false);
    expect(hasMeaningfulClassRecordDraft({ classMemo: '관찰' })).toBe(true);
    expect(hasMeaningfulClassRecordDraft({ attendance: { a: 'present' } })).toBe(true);
  });
});
