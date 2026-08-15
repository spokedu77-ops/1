import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER library detail final IA', () => {
  const view = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
  const guide = read('app/spokedu-master/library/[id]/components/DetailLessonGuide.tsx');

  it('splits the display title safely and keeps public tags below it', () => {
    expect(guide).toContain('export function splitLessonTitle');
    expect(guide).toContain('if (!match) return { koreanTitle: value, englishTitle: null }');
    expect(guide).toContain('data-detail-hero-title');
    expect(guide).toContain('data-detail-english-title');
    expect(guide).toContain('data-detail-public-tags');
    expect(guide).toContain('model.tags.map');
    expect(guide).toContain('flex-wrap justify-center');
  });

  it('renders exactly one three-column action group', () => {
    expect(view.match(/data-detail-action=/g)).toHaveLength(3);
    expect(view).toContain('data-detail-actions');
    expect(view).toContain('grid-cols-3');
    expect(view).toContain('수업 기록 시작');
    expect(view).toContain('오늘 수업으로 지정');
    expect(view).toContain('지도안 복사');
    expect(view).not.toContain('data-detail-action="quick"');
  });

  it('keeps both content rows two-column from 900px', () => {
    const execution = guide.indexOf('data-detail-row="execution"');
    const preparation = guide.indexOf('data-detail-row="preparation"');
    expect(execution).toBeGreaterThan(-1);
    expect(preparation).toBeGreaterThan(execution);
    expect(guide).toContain('min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]');
    expect(guide).toContain('min-[900px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]');
    expect(guide.indexOf('model.activityMethod')).toBeLessThan(guide.indexOf('model.variationMethod'));
  });

  it('uses one equal-height panel and heading system per desktop row', () => {
    expect(guide).toContain("const PANEL_CLASS = 'flex h-full min-w-0 flex-col'");
    expect(guide).toContain("const PANEL_HEADING_CLASS = 'm-0 flex min-h-7 items-center");
    expect(guide).toContain("const PANEL_BODY_CLASS = 'mt-4 min-h-0 flex-1'");
    expect(guide.match(/items-stretch/g)).toHaveLength(2);
    expect(guide).toContain('min-[900px]:min-h-[440px]');
    expect(guide).toContain('min-[900px]:min-h-[420px]');
    expect(guide).not.toContain('h-[450px]');
  });

  it('renders only equipment, script, and briefing in the overview', () => {
    const overview = guide.slice(guide.indexOf('function OverviewColumn'), guide.indexOf('export function DetailLessonGuide'));
    expect(overview).toContain('model.equipment');
    expect(overview).toContain('model.coachScript');
    expect(overview).toContain('model.briefingNotes');
    expect(overview).not.toContain('model.objective');
    expect(overview).not.toContain('model.developmentFocus');
    expect(overview.match(/model\.coachScript/g)).toHaveLength(2);
    expect(guide).not.toContain('CoachScriptSection');
  });

  it('preserves setup-image enlargement, video tracking, and poster priority', () => {
    expect(guide).toContain('object-contain');
    expect(guide).toContain('max-h-full');
    expect(guide).toContain('이미지 확대');
    expect(guide).toContain("event.key === 'Escape'");
    expect(guide).toContain('model.setupImageUrl ?? getVideoThumbnail');
    expect(view).toContain("action: 'video_started'");
    expect(view).toContain('new IntersectionObserver');
  });

  it('does not substitute unrelated sections for actual related videos', () => {
    expect(view).not.toContain('RelatedSpomoveSection');
    expect(view).not.toContain('관련 콘텐츠');
    expect(view).not.toContain('recentEvidenceRecords');
    expect(view).not.toContain('galleryImages');
  });
});
