import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('SPOKEDU MASTER craft + selection reasons', () => {
  it('bans tag-only SPOMOVE selection reasons', () => {
    const source = read('app/spokedu-master/library/librarySelectionReasons.ts');
    expect(source).toContain('hasExplicitSpomoveLink');
    expect(source).toContain('readyNowEvidenceBlob');
    expect(source).not.toContain("tags ?? []).some((tag) => /spomove/i.test(tag)");
  });

  it('keeps library and home cards on the same selection-reason vocabulary', () => {
    const library = read('app/spokedu-master/library/LibraryView.tsx');
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    expect(library).toContain('formatProgramSelectionReasons');
    expect(dashboard).toContain('formatProgramSelectionReasons');
    expect(dashboard).toContain('selectionMeta || buildLessonCardSupportMeta');
  });

  it('routes onboarding/class-tools/record empty CTAs through spm-btn-primary', () => {
    const onboarding = read('app/spokedu-master/onboarding/page.tsx');
    const classTools = read('app/spokedu-master/components/ui/ClassToolsView.tsx');
    const classRecord = read('app/spokedu-master/class-record/page.tsx');
    const errorBoundary = read('app/spokedu-master/components/ui/ErrorBoundary.tsx');
    const students = read('app/spokedu-master/students/page.tsx');

    expect(onboarding).toContain('spm-btn-primary');
    expect(onboarding).not.toMatch(/시작하기[\s\S]{0,120}background:\s*'var\(--spm-acc\)'/);
    expect(classTools).toContain('spm-btn-primary inline-flex h-11 items-center gap-2');
    expect(classRecord).toContain("redirect('/spokedu-master/activity')");
    expect(errorBoundary).toContain('spm-btn-primary');
    expect(students).toContain('SPM_PRIMARY_BTN');
    expect(students).not.toContain('bg-emerald-600');
  });

  it('keeps Today Sessions ahead of discovery content', () => {
    const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');
    expect(dashboard.indexOf('TodaySessionsPanel')).toBeLessThan(dashboard.indexOf('data-dashboard-section="featured-flow"'));
  });
});
