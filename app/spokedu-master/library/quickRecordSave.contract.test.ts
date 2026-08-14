import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/spokedu-master/library/[id]/LibraryDetailView.tsx'),
  'utf8',
);

describe('library quick record save contracts', () => {
  it('removes only the detail-page quick-record entry and imports', () => {
    expect(source).not.toContain('data-detail-action="quick"');
    expect(source).not.toContain("from '../../components/ui/BottomSheet'");
    expect(source).not.toContain("from '../../lib/saveDraftStorage'");
    expect(source).not.toContain("from '../../lib/saveActionFeedback'");
    expect(source).not.toContain('resolveQuickRecordClassId(');
  });

  it('keeps existing evidence and record continuation links', () => {
    expect(source).toContain('이 기록 보강');
    expect(source).toContain('기존 기록 보기');
    expect(source).toContain('recentEvidenceRecords');
  });

  it('exposes lesson plan copy without print controls and keeps fixed export template', () => {
    const exportSource = readFileSync(
      join(process.cwd(), 'app/spokedu-master/lib/lessonPlanExport.ts'),
      'utf8',
    );
    expect(source).toContain('formatLessonPlanText');
    expect(source).toContain('지도안 복사');
    expect(source).not.toContain('printLessonPlan');
    expect(source).not.toContain('지도안 인쇄');
    expect(exportSource).not.toContain('window.print');
    expect(exportSource).not.toContain('formatLessonPlanPrintHtml');
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
