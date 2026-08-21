import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER library detail final IA', () => {
  const view = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
  const guide = read('app/spokedu-master/library/[id]/components/DetailLessonGuide.tsx');
  const related = read('app/spokedu-master/library/relatedLessonVideos.ts');

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
    expect(view.match(/data-detail-action=/g)).toHaveLength(2);
    expect(view).toContain('data-detail-actions');
    expect(view).toContain('grid-cols-3');
    expect(view).toContain('AssignProgramToSessionButton');
    expect(view).toContain('수업 캘린더');
    expect(view).toContain('지도안 복사');
    expect(view).not.toContain('data-detail-action="quick"');
  });

  it('keeps both content rows two-column from 900px', () => {
    const execution = guide.indexOf('data-detail-row="execution"');
    const preparation = guide.indexOf('data-detail-row="preparation"');
    expect(execution).toBeGreaterThan(-1);
    expect(preparation).toBeGreaterThan(execution);
    expect(guide).toContain('min-[900px]:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]');
    expect(guide).toContain('min-[900px]:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]');
    expect(guide.indexOf('<VideoPanel model={model}')).toBeLessThan(guide.indexOf('<MethodPanel model={model}'));
  });

  it('uses one equal-height panel and heading system per desktop row', () => {
    expect(guide).toContain('const DETAIL_PANEL_CLASS');
    expect(guide).toContain("grid-rows-[30px_minmax(0,1fr)] gap-5");
    expect(guide).toContain('const DETAIL_PANEL_HEADING_CLASS');
    expect(guide).toContain("h-[30px] items-center");
    expect(guide).toContain('const DETAIL_PANEL_BODY_CLASS');
    expect(guide).toContain("const DETAIL_ROW_CLASS =");
    expect(guide).toContain("'grid items-stretch");
    expect(guide.match(/data-detail-panel-heading/g)).toHaveLength(4);
    expect(guide.match(/data-detail-panel-body/g)).toHaveLength(4);
    expect(guide).not.toContain('h-[450px]');
  });

  it('groups equipment with setup and only script and briefing in the overview', () => {
    const setup = guide.slice(guide.indexOf('function SetupPanel'), guide.indexOf('function OverviewPanel'));
    const overview = guide.slice(guide.indexOf('function OverviewPanel'), guide.indexOf('function RelatedVideosSection'));
    expect(setup).toContain('model.equipment');
    expect(overview).not.toContain('model.equipment');
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
    expect(guide).toContain('getVideoThumbnailCandidates(video.sourceUrl');
    expect(guide).toContain('posterCandidates={posterCandidates}');
    expect(guide).toContain('model.thumbnailUrl !== model.setupImageUrl');
    expect(guide).not.toContain('model.setupImageUrl ?? getVideoThumbnail');
    expect(view).toContain("action: 'video_started'");
    expect(view).toContain('new IntersectionObserver');
    const setupImage = guide.slice(guide.indexOf('function SetupImage'), guide.indexOf('function LessonVideo'));
    expect(setupImage).not.toContain('priority');
    expect(setupImage).toContain('(min-width: 1220px) 560px');
  });

  it('shows two variations before accessible progressive disclosure', () => {
    expect(guide).toContain('model.variationMethod.slice(0, 2)');
    expect(guide).toContain('aria-expanded={variationsExpanded}');
    expect(guide).toContain('aria-controls={variationListId}');
    expect(guide).toContain("variationsExpanded ? '접기'");
    expect(guide).toContain('`+ ${hiddenVariationCount}개 더보기`');
  });

  it('keeps the precision pass free of nested decorative media cards', () => {
    expect(guide).toContain("className={`${DETAIL_PANEL_BODY_CLASS} self-start`}");
    expect(guide).not.toContain('blur-2xl');
    expect(guide).not.toContain('ArrowUpRight');
    expect(guide).not.toContain('mt-auto border-t');
    expect(guide).not.toContain('min-[900px]:min-h-[460px]');
    expect(view).not.toContain('linear-gradient(145deg,var(--spm-acc)');
  });

  it('renders related videos only from deterministic playable program data', () => {
    expect(view).toContain('selectRelatedLessonVideos(program, programs)');
    expect(view).toContain('relatedVideos={relatedVideos}');
    expect(guide).toContain('function RelatedVideosSection');
    expect(guide).toContain('if (videos.length === 0) return null');
    expect(guide).toContain('data-detail-related-videos');
    expect(related).toContain('programHasPlayableVideo(candidate)');
    expect(related).toContain('candidate.id !== current.id');
    expect(related).toContain('.slice(0, Math.max(0, limit))');
    expect(related).not.toContain('Math.random');
    expect(related).toContain('.filter(({ score }) => score > 0)');
    expect(related).toContain('Boolean(currentCategory) && Boolean(candidateCategory)');
    expect(related).toContain('getVideoThumbnail(videoUrl) ?? getDedicatedRelatedThumbnail(candidate)');
    expect(related).not.toContain('resolveProgramHero');
    expect(guide).not.toContain('<SetupImage title={model.title} src={model.setupImageUrl} /> : <div />');
    expect(guide).toContain("video.thumbnailUrl.includes('img.youtube.com') || imageNeedsUnoptimized");
    expect(view).not.toContain('RelatedSpomoveSection');
    expect(view).not.toContain('관련 콘텐츠');
    expect(view).not.toContain('recentEvidenceRecords');
    expect(view).not.toContain('galleryImages');
  });

  it('handles commercial empty states and interaction failures without changing the IA', () => {
    expect(guide).not.toContain('SPOKEDU MASTER</span>');
    expect(guide).toContain('model.setupNotes.length === 0');
    expect(guide).toContain('const hasPhysicalPreparation');
    expect(guide).toContain('hasPhysicalPreparation && hasOverview');
    expect(guide).toContain('model.tags.length > 0');
    expect(guide).toContain("videos.length === 1");
    expect(guide).toContain("videos.length === 2");
    expect(view).toContain("setPlanCopyStatus('error')");
    expect(view).toContain('copyFeedbackTimerRef');
    expect(view).toContain("prefersReducedMotion() ? 'auto' : 'smooth'");
  });

  it('shows the latest record-to-next-prep context as optional review-only continuity', () => {
    expect(view).toContain('selectLatestApplicationIdea');
    expect(view).toContain('data-next-prep-continuity');
    expect(view).toContain('지난 수업에서 남긴 다음 적용점');
    expect(view).toContain('기록 보기');
    expect(view).not.toContain('이번 수업에 적용됨');
    expect(view).not.toContain('추천');
  });
});
