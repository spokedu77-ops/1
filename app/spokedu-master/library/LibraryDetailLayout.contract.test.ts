import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER library detail final IA', () => {
  const view = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
  const guide = read('app/spokedu-master/library/[id]/components/DetailLessonGuide.tsx');
  const related = read('app/spokedu-master/library/relatedLessonVideos.ts');
  const visual = read('app/spokedu-master/MASTER_VISUAL_SYSTEM.md');

  it('resolves API numeric program ids after direct navigation or refresh', () => {
    expect(view).toContain('String(item.id) === id');
  });

  it('documents Library Detail as an editorial preparation page', () => {
    expect(visual).toContain('LIBRARY DETAIL');
    expect(visual).toContain('Identity');
    expect(visual).toContain('Understand');
    expect(visual).toContain('Prepare');
    expect(visual).toContain('Recall');
    expect(visual).toContain('Discover Next');
    expect(visual).toContain('Action');
    expect(visual).not.toContain('uses one equal-height panel');
  });

  it('splits the display title safely and keeps public tags below it', () => {
    expect(guide).toContain('export function splitLessonTitle');
    expect(guide).toContain('if (!match) return { koreanTitle: value, englishTitle: null }');
    expect(guide).toContain('data-detail-hero-title');
    expect(guide).toContain('data-detail-english-title');
    expect(guide).toContain('data-detail-public-tags');
    expect(guide).toContain('model.tags.map');
    expect(guide).toContain('flex-wrap');
  });

  it('uses a compact primary plus secondary action group instead of a page-wide giant CTA', () => {
    expect(view.match(/data-detail-action=/g)).toHaveLength(1);
    expect(view).toContain('data-detail-actions');
    expect(view).toContain('data-detail-support-actions');
    expect(view).toContain('max-w-[1080px]');
    expect(view).not.toContain('max-w-[1220px]');
    expect(view).toContain('lg:w-[190px]');
    expect(view).toContain('max-lg:flex-1');
    expect(view).not.toContain('min-h-11 flex-1 rounded');
    expect(view).toContain('AssignProgramToSessionButton');
    expect(view).not.toContain('수업 일정 관리');
    expect(view).toContain('지도안 복사');
    expect(view).not.toContain('data-detail-action="quick"');
    expect(view).not.toContain('max-w-[740px]');
    expect(view).not.toContain('h-12 w-full');
    expect(view).toContain('max-lg:fixed');
    expect(guide).not.toContain('data-detail-actions');
  });

  it('keeps both content rows two-column from 900px with intrinsic height', () => {
    const execution = guide.indexOf('data-detail-row="execution"');
    const preparation = guide.indexOf('data-detail-row="preparation"');
    expect(execution).toBeGreaterThan(-1);
    expect(preparation).toBeGreaterThan(execution);
    expect(guide).toContain('min-[900px]:grid-cols-');
    expect(guide.indexOf('<VideoPanel model={model}')).toBeLessThan(guide.indexOf('<MethodPanel model={model}'));
    expect(guide).toContain("const DETAIL_ROW_CLASS =");
    expect(guide).toContain("'grid items-start");
    expect(guide).not.toContain('items-stretch');
    expect(guide).not.toContain("grid-rows-[30px_minmax(0,1fr)]");
    expect(guide).not.toContain('h-[450px]');
  });

  it('keeps shared heading baseline without stretching panels to equal height', () => {
    expect(guide).toContain('const DETAIL_PANEL_CLASS');
    expect(guide).toContain("const DETAIL_PANEL_CLASS = 'contents'");
    expect(guide).toContain('const DETAIL_PANEL_HEADING_CLASS');
    expect(guide).toContain("h-[30px] items-center");
    expect(guide).toContain('const DETAIL_PANEL_BODY_CLASS');
    expect(guide.match(/data-detail-panel-heading/g)).toHaveLength(4);
    expect(guide.match(/data-detail-panel-body/g)).toHaveLength(4);
    expect(guide).not.toContain('min-[900px]:self-center');
    expect(guide).toContain('flex flex-col self-start');
    expect(guide).not.toContain('overflow-y-auto');
  });

  it('keeps physical preparation separate from the teaching guide', () => {
    const setup = guide.slice(guide.indexOf('function SetupPanel'), guide.indexOf('function OverviewPanel'));
    const overview = guide.slice(guide.indexOf('function OverviewPanel'), guide.indexOf('function RelatedVideosSection'));
    expect(guide).not.toContain('data-detail-equipment-summary');
    expect(guide).toContain('data-detail-equipment');
    expect(guide).toContain('data-detail-setup-notes');
    expect(guide).toContain('준비물');
    expect(setup).toContain('model.equipment');
    expect(setup).toContain('model.setupNotes');
    expect(overview).not.toContain('model.equipment');
    expect(overview).toContain('model.coachScript');
    expect(overview).toContain('model.briefingNotes');
    expect(overview).toContain('지도 가이드');
    expect(overview).not.toContain('수업 한눈에 보기');
    expect(overview).toContain('설명 스크립트');
    expect(overview).toContain('사전교육');
    expect(overview).not.toContain('model.objective');
    expect(overview).not.toContain('model.developmentFocus');
    expect(overview.match(/model\.coachScript/g)?.length).toBeGreaterThanOrEqual(2);
    expect(guide).not.toContain('CoachScriptSection');
    expect(guide).toContain('export function splitCoachScriptParagraphs');
    expect(guide).toContain("script.replace(/\\\\r\\\\n|\\\\n|\\r\\n?/g, '\\n')");
    expect(guide).toContain("normalized.split(/\\n\\s*\\n+/) : normalized.split('\\n')");
    expect(guide).toContain('splitCoachScriptParagraphs(model.coachScript).map');
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
    expect(guide).toContain("className={`${DETAIL_PANEL_BODY_CLASS} self-start");
    expect(guide).not.toContain('blur-2xl');
    expect(guide).not.toContain('ArrowUpRight');
    expect(guide).not.toContain('mt-auto border-t');
    expect(guide).not.toContain('min-[900px]:min-h-[460px]');
    expect(view).not.toContain('linear-gradient(145deg,var(--spm-acc)');
  });

  it('renders related videos from three explainable axes with deterministic fallback', () => {
    expect(view).toContain('selectRelatedLessonVideos(program, programs)');
    expect(view).toContain('relatedVideos={relatedVideos}');
    expect(guide).toContain('function RelatedVideosSection');
    expect(guide).toContain('if (videos.length === 0) return null');
    expect(guide).toContain('data-detail-related-videos');
    expect(guide).toContain('data-related-video-reason');
    expect(guide).toContain('video.reason');
    expect(related).toContain('programHasPlayableVideo(candidate)');
    expect(related).toContain('candidate.id !== current.id');
    expect(related).toContain('Math.max(0, limit)');
    expect(related).toContain('limit = 3');
    expect(related).not.toContain('Math.random');
    expect(related).toContain("'신체 기능 유사'");
    expect(related).toContain("'같은 교구'");
    expect(related).toContain("'동작 패턴 유사'");
    expect(related).toContain("'관련 활동'");
    expect(related).toContain('LESSON_TAG_PREFIX.bodyFunction');
    expect(related).toContain('LESSON_TAG_PREFIX.movement');
    expect(related).toContain('Boolean(currentCategory) && Boolean(candidateCategory)');
    expect(related).toContain('getVideoThumbnail(videoUrl) ?? getDedicatedRelatedThumbnail(candidate)');
    expect(guide).not.toContain('<SetupImage title={model.title} src={model.setupImageUrl} /> : <div />');
    expect(guide).toContain("video.thumbnailUrl.includes('img.youtube.com') || imageNeedsUnoptimized");
    expect(view).not.toContain('RelatedSpomoveSection');
    expect(view).not.toContain('관련 콘텐츠');
    expect(view).not.toContain('recentEvidenceRecords');
    expect(view).not.toContain('galleryImages');
  });

  it('handles commercial empty states and interaction failures without changing the IA', () => {
    expect(guide).not.toContain('SPOKEDU MASTER</span>');
    expect(guide).toContain('model.setupNotes');
    expect(guide).toContain('const hasPhysicalPreparation');
    expect(guide).toContain('Boolean(model.setupImageUrl) || model.equipment.length > 0 || model.setupNotes.length > 0');
    expect(guide).toContain('hasPhysicalPreparation && hasOverview');
    expect(guide).toContain('model.tags.length > 0');
    expect(guide).toContain("videos.length === 1");
    expect(guide).toContain("videos.length === 2");
    expect(view).toContain("setPlanCopyStatus('error')");
    expect(view).toContain('copyFeedbackTimerRef');
    expect(view).toContain("prefersReducedMotion() ? 'auto' : 'smooth'");
  });

  it('uses preparation context and user-facing related-video wording without changing selection reasons', () => {
    expect(guide).toContain('data-detail-context');
    expect(guide).toContain('상세 수업 준비');
    expect(guide).toContain('관련 수업 영상');
    expect(guide).toContain("'신체 기능 유사': '비슷한 신체 기능'");
    expect(guide).toContain("'같은 교구': '같은 교구 활용'");
    expect(guide).toContain("'동작 패턴 유사': '비슷한 움직임'");
    expect(guide).toContain("'관련 활동': '함께 보기 좋은 활동'");
  });

  it('uses the modal step-marker grammar and content-based method support', () => {
    expect(guide).toContain('function StepMarker');
    expect(guide).toContain('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full');
    expect(guide.match(/<StepMarker index=\{index\}/g)).toHaveLength(3);
    expect(guide).not.toContain("padStart(2, '0')");
    expect(guide).toContain('function getMethodSupport');
    expect(guide).toContain('if (model.variationMethod.length > 0 || model.activityMethod.length > 4) return []');
    expect(guide).toContain('model.developmentFocus');
    expect(guide).toContain('model.objective');
    expect(guide).toContain('model.safetyNotes');
    expect(guide).toContain('model.activityMethod.length <= 2 ? 2 : 1');
    expect(guide).not.toContain('model.activityMethod.length >= 4');
    expect(guide).toContain('...(model.developmentFocus ? [model.developmentFocus] : [])');
  });

  it('keeps mobile actions sticky while moving desktop actions and favorite into the hero', () => {
    expect(guide).toContain('lg:grid-cols-[minmax(0,1fr)_auto]');
    expect(view).toContain('max-lg:fixed');
    expect(view).toContain('transition-none lg:hidden');
    expect(view).toContain('aria-hidden className="hidden h-11 w-11 lg:block"');
    expect(view).toContain('hidden h-11 w-11');
    expect(view).toContain('lg:inline-flex');
    expect(view.match(/aria-pressed=\{favorite\}/g)).toHaveLength(2);
    expect(view).toContain('bg-[var(--spm-bg)]');
  });

  it('shows explicit Capture memory after core preparation with an exact Session deep link', () => {
    expect(view).toContain('selectLatestProgramMemory');
    expect(view).toContain('fetchSessionCaptures');
    expect(view).toContain('PersonalizedNote');
    expect(view).toContain('지난 수업에서 이어갈 점');
    expect(view).toContain('session=${encodeURIComponent(latestProgramMemory.sessionId)}&capture=1');
    expect(view).not.toContain('applicationIdea: session.memo');
    expect(view).not.toContain('지난 수업에서 남긴 다음 적용점');
    const execution = guide.indexOf('data-detail-row="execution"');
    const preparation = guide.indexOf('data-detail-row="preparation"');
    const personalized = guide.indexOf('data-detail-personalized-context');
    const relatedSection = guide.indexOf('<RelatedVideosSection');
    expect(personalized).toBeGreaterThan(execution);
    expect(personalized).toBeGreaterThan(preparation);
    expect(personalized).toBeLessThan(relatedSection);
  });
});
