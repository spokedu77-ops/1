import { afterEach, describe, expect, it } from 'vitest';

import {
  CLASS_RECORD_DRAFT_KEY,
  clearOwnerSaveDraft,
  clearSaveDraft,
  hasMeaningfulClassRecordDraft,
  readOwnerSaveDraft,
  readSaveDraft,
  scopedSaveDraftKey,
  writeOwnerSaveDraft,
  writeSaveDraft,
} from './saveDraftStorage';

const OWNER_A = 'id:user-a';
const OWNER_B = 'id:user-b';

afterEach(() => {
  clearSaveDraft(CLASS_RECORD_DRAFT_KEY);
  clearSaveDraft(scopedSaveDraftKey(CLASS_RECORD_DRAFT_KEY, OWNER_A));
  clearSaveDraft(scopedSaveDraftKey(CLASS_RECORD_DRAFT_KEY, OWNER_B));
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

  it('scopes drafts by owner and does not leak across accounts', () => {
    writeOwnerSaveDraft(CLASS_RECORD_DRAFT_KEY, OWNER_A, { classMemo: 'A 메모' });
    writeOwnerSaveDraft(CLASS_RECORD_DRAFT_KEY, OWNER_B, { classMemo: 'B 메모' });
    expect(readOwnerSaveDraft<{ classMemo: string }>(CLASS_RECORD_DRAFT_KEY, OWNER_A)?.classMemo).toBe('A 메모');
    expect(readOwnerSaveDraft<{ classMemo: string }>(CLASS_RECORD_DRAFT_KEY, OWNER_B)?.classMemo).toBe('B 메모');
    clearOwnerSaveDraft(CLASS_RECORD_DRAFT_KEY, OWNER_A);
    expect(readOwnerSaveDraft(CLASS_RECORD_DRAFT_KEY, OWNER_A)).toBeNull();
    expect(readOwnerSaveDraft<{ classMemo: string }>(CLASS_RECORD_DRAFT_KEY, OWNER_B)?.classMemo).toBe('B 메모');
  });

  it('migrates legacy unscoped drafts into the owner key once', () => {
    writeSaveDraft(CLASS_RECORD_DRAFT_KEY, { classMemo: '레거시' });
    expect(readOwnerSaveDraft<{ classMemo: string }>(CLASS_RECORD_DRAFT_KEY, OWNER_A)?.classMemo).toBe('레거시');
    expect(readSaveDraft(CLASS_RECORD_DRAFT_KEY)).toBeNull();
    expect(
      readSaveDraft<{ classMemo: string }>(scopedSaveDraftKey(CLASS_RECORD_DRAFT_KEY, OWNER_A))?.classMemo,
    ).toBe('레거시');
  });
});
