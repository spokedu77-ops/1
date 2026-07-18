import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/spokedu-master/library/[id]/LibraryDetailView.tsx'),
  'utf8',
);

describe('library quick record save contracts', () => {
  it('uses shared offline and entitlement save feedback', () => {
    expect(source).toContain('canAttemptOnlineSave(isOnline)');
    expect(source).toContain('getOfflineSaveFeedback()');
    expect(source).toContain('resolveSaveActionFeedback(caught, accessSnapshot)');
    expect(source).toContain('SaveErrorBanner');
  });

  it('restores and clears quick-record drafts in the same tab', () => {
    expect(source).toContain('QUICK_RECORD_DRAFT_KEY');
    expect(source).toContain('readSaveDraft<QuickRecordDraft>(QUICK_RECORD_DRAFT_KEY)');
    expect(source).toContain('writeSaveDraft(QUICK_RECORD_DRAFT_KEY');
    expect(source).toContain('clearSaveDraft(QUICK_RECORD_DRAFT_KEY)');
  });

  it('prefills class from recent records and frames memo as observation', () => {
    expect(source).toContain('resolveQuickRecordClassId');
    expect(source).toContain('오늘 관찰·지도 포인트');
    expect(source).toContain('오늘 집중 관찰');
    expect(source).toContain('오늘 수업 기록이 쌓였습니다.');
    expect(source).toContain('이 기록 보강');
    expect(source).toContain('기록 남기기');
    expect(source).toContain('focusStudentId');
    expect(source).not.toContain('상세 기록 작성');
  });
});
