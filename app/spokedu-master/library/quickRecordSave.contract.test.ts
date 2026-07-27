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
    expect(source).toContain('readOwnerSaveDraft<QuickRecordDraft>(QUICK_RECORD_DRAFT_KEY');
    expect(source).toContain('writeOwnerSaveDraft(QUICK_RECORD_DRAFT_KEY');
    expect(source).toContain('clearOwnerSaveDraft(QUICK_RECORD_DRAFT_KEY');
  });

  it('offers home loop CTA after quick-record save', () => {
    expect(source).toContain('data-loop-action="home"');
    expect(source).toContain('href="/spokedu-master/dashboard"');
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

  it('exposes lesson plan copy and print with fixed export template', () => {
    const exportSource = readFileSync(
      join(process.cwd(), 'app/spokedu-master/lib/lessonPlanExport.ts'),
      'utf8',
    );
    expect(source).toContain('formatLessonPlanText');
    expect(source).toContain('printLessonPlan');
    expect(source).toContain('지도안 복사');
    expect(source).toContain('지도안 인쇄');
    expect(exportSource).toContain("'title'");
    expect(exportSource).toContain("'context'");
    expect(exportSource).toContain("'equipment'");
    expect(exportSource).toContain("'prep'");
    expect(exportSource).toContain("'method'");
    expect(exportSource).toContain("'variation'");
    expect(exportSource).toContain("'coaching'");
    expect(exportSource).toContain("'safety'");
    expect(exportSource).toContain("'parentNote'");
  });
});
