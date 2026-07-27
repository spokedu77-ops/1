import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LIBRARY_SELECTION_REASON_STANDARD,
  LIBRARY_SELECTION_REASON_IDS,
} from './library/librarySelectionReasons';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

/**
 * P3 — 만듦새 + 선택이유 강제.
 * 홈 구조 확대 금지. Primary CTA 토큰·선택이유 근거만 잠근다.
 */
describe('SPOKEDU MASTER craft + selection reasons (P3)', () => {
  it('clears all pendingP3Tighten flags and bans tag-only SPOMOVE', () => {
    for (const id of LIBRARY_SELECTION_REASON_IDS) {
      expect(LIBRARY_SELECTION_REASON_STANDARD[id].pendingP3Tighten).toBe(false);
    }
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
    const picker = read('app/spokedu-master/components/record/RecordProgramPicker.tsx');
    const errorBoundary = read('app/spokedu-master/components/ui/ErrorBoundary.tsx');
    const students = read('app/spokedu-master/students/page.tsx');

    expect(onboarding).toContain('spm-btn-primary');
    expect(onboarding).not.toMatch(/시작하기[\s\S]{0,120}background:\s*'var\(--spm-acc\)'/);
    expect(classTools).toContain('spm-btn-primary inline-flex h-11 items-center gap-2');
    expect(classRecord).toContain('spm-btn-primary inline-flex h-11 items-center gap-2');
    expect(picker).toContain('spm-btn-primary');
    expect(errorBoundary).toContain('spm-btn-primary');
    expect(students).toContain('spm-btn-primary h-10 shrink-0');
  });

  it('keeps CompactOpsBar height contract while craft work lands', () => {
    const opsBar = read('app/spokedu-master/dashboard/CompactOpsBar.tsx');
    expect(opsBar).toContain('max-h-[84px]');
    expect(opsBar).not.toContain('min-h-[140px]');
  });
});
