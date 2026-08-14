import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER library detail layout contract', () => {
  const view = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
  const guide = read('app/spokedu-master/library/[id]/components/DetailLessonGuide.tsx');

  it('keeps orchestration and presentation separated', () => {
    expect(view).toContain("from './components/DetailLessonGuide'");
    expect(view).toContain('<DetailLessonGuide');
    expect(guide).toContain('export function DetailLessonGuide');
  });

  it('centers the hero and renders public model tags', () => {
    expect(guide).toContain('text-center');
    expect(guide).toContain('data-detail-public-tags');
    expect(guide).toContain('model.tags.map');
    expect(guide).toContain('flex-wrap justify-center');
    for (const taxonomy of ['model.theme', 'model.target', 'model.functions', 'model.movements', 'model.space', 'model.participantFormat']) expect(guide).not.toContain(taxonomy);
  });

  it('has exactly three top actions without the legacy status panel', () => {
    expect(view.match(/data-detail-action=/g)).toHaveLength(3);
    expect(view).toContain('data-detail-action="primary"');
    expect(view).toContain('data-detail-action="today"');
    expect(view).toContain('data-detail-action="copy"');
    expect(view).not.toContain('data-detail-action="quick"');
    expect(view).not.toContain('data-detail-action="report"');
    expect(view).not.toContain('TodayLessonActionPanel');
    expect(view).toContain('✓ 오늘 수업 지정됨');
  });

  it('orders execution before preparation in responsive two-column sections', () => {
    const composition = guide.slice(guide.indexOf('export function DetailLessonGuide'));
    expect(composition).toMatch(/<LessonExecutionSection[\s\S]*<LessonPreparationSection/);
    expect(guide).toContain('data-detail-section="execution"');
    expect(guide).toContain('data-detail-section="preparation"');
    expect(guide.match(/min-\[1100px\]:grid-cols-2/g)?.length).toBeGreaterThanOrEqual(2);
    expect(guide.indexOf('model.activityMethod')).toBeLessThan(guide.indexOf('model.variationMethod'));
  });

  it('keeps setup-image enlargement, containment, and overview ordering', () => {
    expect(guide).toContain('object-contain');
    expect(guide).toContain('max-h-[390px]');
    expect(guide).toContain('이미지 확대');
    expect(guide).toContain("event.key === 'Escape'");
    const overview = guide.slice(guide.indexOf('function LessonPreparationSection'));
    expect(overview).toMatch(/model\.equipment[\s\S]*model\.coachScript[\s\S]*model\.briefingNotes[\s\S]*model\.objective[\s\S]*model\.developmentFocus/);
  });

  it('uses setup image as the video poster while preserving tracking and sticky title', () => {
    expect(guide).toContain('model.setupImageUrl ?? getVideoThumbnail');
    expect(view).toContain("action: 'video_started'");
    expect(view).toContain('new IntersectionObserver');
    expect(view).toContain('motion-reduce:transition-none');
  });
});
