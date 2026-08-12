import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER library detail layout contract', () => {
  const view = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
  const guide = read('app/spokedu-master/library/[id]/components/DetailLessonGuide.tsx');
  const preview = read('app/spokedu-master/components/lesson/LessonPreviewContent.tsx');

  it('keeps orchestration separate from the dedicated detail presentation', () => {
    expect(view).toContain("from './components/DetailLessonGuide'");
    expect(view).toContain('<DetailLessonGuide');
    expect(view).not.toContain("from '../../components/lesson/LessonPanels'");
    expect(guide).toContain('export function DetailLessonGuide');
  });

  it('renders the canonical lesson-guide hierarchy and six taxonomy fields', () => {
    for (const label of ['테마', '대상', '기능', '움직임', '공간', '인원']) expect(guide).toContain(`['${label}',`);
    const composition = guide.slice(guide.indexOf('export function DetailLessonGuide'));
    expect(composition).toMatch(/lesson-preparation[\s\S]*lesson-opening-title[\s\S]*<LessonSteps[\s\S]*guidance-title[\s\S]*<ReferenceVideo[\s\S]*<VariationList/);
  });

  it('preserves setup images without cropping and limits their desktop height', () => {
    expect(guide).toContain('object-contain');
    expect(guide).toContain('md:max-h-[360px]');
    expect(guide).toContain('lg:max-h-[390px]');
    expect(guide).toContain('lg:items-start');
  });

  it('supports variable step counts and hides absent optional sections', () => {
    expect(guide).toContain('items.length <= 3');
    expect(guide).toContain("items.length === 2 ? 'md:max-w-4xl md:grid-cols-2'");
    expect(guide).toContain('if (items.length === 0) return null');
    expect(guide).toContain('model.fieldTips.length > 0 || model.safetyNotes.length > 0');
  });

  it('removes legacy structure and leaves the preview modal implementation untouched', () => {
    expect(view).not.toContain('수업 구성');
    expect(view).not.toContain('LessonFullSection');
    expect(preview).not.toContain('DetailLessonGuide');
  });

  it('keeps stable page padding without sticky secondary actions', () => {
    expect(view).toContain('pb-[calc(5.5rem+env(safe-area-inset-bottom))]');
    expect(view).toContain('lg:pb-12');
    expect(view).not.toContain('primarySpomovePreset');
  });

  it('keeps the hero title and sticky context mutually exclusive without shifting the header', () => {
    expect(view).toContain('new IntersectionObserver');
    expect(view).toContain("rootMargin: '-56px 0px 0px 0px'");
    expect(view).toContain('motion-reduce:transition-none');
    expect(view).toContain("isHeroTitleVisible ? 'invisible opacity-0' : 'visible opacity-100'");
    expect(view).toContain('heroTitleRef={heroTitleRef}');
    expect(guide).toContain('data-detail-hero-title');
  });

  it('uses the compact five-action mobile grid and a stable readable title width', () => {
    expect(view).toContain('grid-cols-[repeat(2,minmax(0,1fr))]');
    expect(view).toContain('md:flex md:flex-wrap md:items-center');
    expect(view).toContain('data-detail-action="primary"');
    expect(view).toContain('col-span-2');
    expect(view.match(/data-detail-action=/g)).toHaveLength(5);
    expect(guide).toContain('max-w-[800px]');
    expect(guide).not.toContain('max-w-[30ch]');
  });

  it('presents the today lesson recommendation as one compact row', () => {
    const todayPanel = view.slice(view.indexOf('function TodayLessonActionPanel'), view.indexOf('export default function LibraryDetailView'));
    expect(todayPanel).toContain('data-detail-today-status');
    expect(todayPanel).toContain('grid-cols-[minmax(0,1fr)_auto]');
    expect(todayPanel).not.toContain('sm:grid-cols-2');
  });
});
