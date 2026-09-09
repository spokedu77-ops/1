'use client';

import { ExternalLink, MessageSquareQuote, Package, Play, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';

import { TrackedVideoIframe } from '../../../components/lesson/TrackedVideoIframe';
import type { LessonDisplayModel } from '../../../lib/lessonDisplayModel';
import { canOptimizeRemoteImage, preferLiteMedia } from '../../../lib/mediaPreferences';
import {
  getVideoThumbnailCandidates,
  isInterimDedicatedHero,
  isRemoteImage,
  isStockPlaceholderImage,
} from '../../../lib/program-media';
import type { RelatedLessonVideo } from '../../relatedLessonVideos';

type VideoProps = {
  embedUrl?: string;
  directUrl?: string;
  sourceUrl?: string;
  autoplay: boolean;
  onPlaybackStarted: () => void;
  externalUrl?: string;
};

const DETAIL_PANEL_CLASS = 'contents';
const DETAIL_PANEL_HEADING_CLASS =
  'm-0 flex h-[30px] items-center text-[21px] font-semibold leading-[30px] tracking-[-0.025em] text-[color:var(--spm-t)]';
const DETAIL_PANEL_BODY_CLASS = 'min-w-0';
const DETAIL_ROW_CLASS =
  'grid items-start gap-8 min-[900px]:gap-10';

function StepMarker({ index }: { index: number }) {
  return (
    <span className="relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--spm-acc)_14%,white)] text-[11px] font-bold tabular-nums text-[var(--spm-acc)] ring-1 ring-[color-mix(in_srgb,var(--spm-acc)_28%,transparent)]">
      {index + 1}
    </span>
  );
}

export function splitCoachScriptParagraphs(script: string): string[] {
  const normalized = script
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\r\n?|\u2028|\u2029/g, '\n')
    .trim();
  if (!normalized) return [];
  return normalized
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function normalizeComparableText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('ko');
}

function getMethodSupport(model: LessonDisplayModel): string[] {
  if (model.variationMethod.length > 0 || model.activityMethod.length > 4) return [];
  const methodText = normalizeComparableText(model.activityMethod.join(' '));
  const maxItems = model.activityMethod.length <= 2 ? 2 : 1;
  const candidates = [
    ...model.fieldTips,
    ...(model.developmentFocus ? [model.developmentFocus] : []),
    ...(model.description ? [model.description] : []),
    ...(model.objective ? [model.objective] : []),
    ...model.safetyNotes,
  ];
  const selected: string[] = [];
  for (const candidate of candidates) {
    const normalized = normalizeComparableText(candidate);
    if (!normalized || (methodText && (methodText.includes(normalized) || normalized.includes(methodText))) ||
        selected.some((item) => normalizeComparableText(item) === normalized)) continue;
    selected.push(candidate);
    if (selected.length >= maxItems) break;
  }
  return selected;
}

export function splitLessonTitle(title: string): {
  koreanTitle: string;
  englishTitle: string | null;
} {
  const value = title.trim();
  const match = value.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!match) return { koreanTitle: value, englishTitle: null };
  const koreanTitle = match[1]?.trim() || value;
  const englishTitle = match[2]?.trim() || null;
  return { koreanTitle, englishTitle };
}

function imageNeedsUnoptimized(src: string) {
  return isRemoteImage(src) && !canOptimizeRemoteImage(src);
}

function SetupImage({ title, src }: { title: string; src: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const unoptimized = imageNeedsUnoptimized(src);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full cursor-zoom-in overflow-hidden rounded-[16px] bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
        aria-label={`${title} 초기 교구 세팅 크게 보기`}
      >
        <div className="w-full overflow-hidden">
          <Image
            src={src}
            alt={`${title} 초기 교구 세팅`}
            width={1600}
            height={1200}
            sizes="(min-width: 1220px) 560px, (min-width: 900px) 46vw, 100vw"
            className="h-auto w-full object-contain object-center transition-transform duration-200 group-hover:scale-[1.015]"
            unoptimized={unoptimized}
          />
        </div>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-image-dialog-title"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/86 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl">
            <div className="flex min-h-14 items-center justify-between px-4 sm:px-5">
              <h2 id="setup-image-dialog-title" className="truncate text-[16px] font-semibold">
                {title} 초기 교구 세팅
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
                aria-label="확대 이미지 닫기"
              >
                <X />
              </button>
            </div>
            <div className="min-h-0 overflow-auto bg-slate-100 p-3 sm:p-5">
              <Image
                src={src}
                alt={`${title} 초기 교구 세팅 확대 이미지`}
                width={1600}
                height={1200}
                sizes="100vw"
                className="mx-auto h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain"
                unoptimized={unoptimized}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LessonVideo({ model, video }: { model: LessonDisplayModel; video: VideoProps }) {
  const [liteMedia, setLiteMedia] = useState(false);

  useEffect(() => {
    setLiteMedia(preferLiteMedia());
  }, []);

  const posterCandidates = getVideoThumbnailCandidates(video.sourceUrl, { lite: liteMedia });
  const dedicatedPoster =
    model.thumbnailUrl &&
    model.thumbnailUrl !== model.setupImageUrl &&
    !isStockPlaceholderImage(model.thumbnailUrl) &&
    !isInterimDedicatedHero(model.thumbnailUrl)
      ? model.thumbnailUrl
      : undefined;
  if (!video.embedUrl && !video.directUrl && !video.externalUrl) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-[16px] bg-slate-100 text-[15px] font-medium text-slate-500">
        등록된 수업 영상이 없습니다.
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[16px] bg-slate-950">
      <div aria-hidden className="absolute inset-0 bg-slate-950" />
      {video.embedUrl ? (
        <TrackedVideoIframe
          key={video.embedUrl}
          src={video.embedUrl}
          title={`${model.title} 수업 영상`}
          className="relative z-10 h-full w-full bg-slate-950"
          onPlaybackStarted={video.onPlaybackStarted}
          posterUrl={dedicatedPoster}
          posterCandidates={posterCandidates}
          deferUntilPlay={!video.autoplay}
        />
      ) : null}
      {video.directUrl ? (
        <video
          src={video.directUrl}
          className="relative z-10 h-full w-full bg-slate-950 object-contain"
          controls
          playsInline
          autoPlay={video.autoplay}
          muted={video.autoplay}
          preload="none"
          poster={dedicatedPoster}
          onPlay={video.onPlaybackStarted}
        />
      ) : null}
      {video.externalUrl ? (
        <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_35%,#334155,#020617_72%)] p-6 text-center text-white">
          <div>
            <Play className="mx-auto h-9 w-9" />
            <a
              href={video.externalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={video.onPlaybackStarted}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[14px] font-semibold text-slate-900"
            >
              영상 열기 <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VideoPanel({ model, video }: { model: LessonDisplayModel; video: VideoProps }) {
  return (
    <div id="lesson-video" data-detail-panel="video" className={`${DETAIL_PANEL_CLASS} scroll-mt-20`}>
      <h2
        data-detail-panel-heading
        className={`${DETAIL_PANEL_HEADING_CLASS} min-[900px]:col-start-1 min-[900px]:row-start-1`}
      >
        수업 영상
      </h2>
      <div
        data-detail-panel-body
        className={`${DETAIL_PANEL_BODY_CLASS} self-start min-[900px]:col-start-1 min-[900px]:row-start-2`}
      >
        <LessonVideo model={model} video={video} />
      </div>
    </div>
  );
}

function MethodPanel({ model }: { model: LessonDisplayModel }) {
  const variationListId = 'lesson-variation-list';
  const [variationsExpanded, setVariationsExpanded] = useState(false);
  const visibleVariations = variationsExpanded
    ? model.variationMethod
    : model.variationMethod.slice(0, 2);
  const hiddenVariationCount = Math.max(0, model.variationMethod.length - 2);
  const methodSupport = getMethodSupport(model);

  return (
    <div data-detail-panel="method" className={DETAIL_PANEL_CLASS}>
      <h2
        data-detail-panel-heading
        className={`${DETAIL_PANEL_HEADING_CLASS} min-[900px]:col-start-2 min-[900px]:row-start-1`}
      >
        진행 방법
      </h2>
      <div
        data-detail-panel-body
        className={`${DETAIL_PANEL_BODY_CLASS} flex flex-col self-start min-[900px]:col-start-2 min-[900px]:row-start-2`}
      >
        <ol className="relative m-0 space-y-0">
          {model.activityMethod.map((item, index) => (
            <li key={`${index}-${item}`} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-2.5 pb-4 last:pb-0">
              <StepMarker index={index} />
              <p className="m-0 break-keep pt-0.5 text-[15px] font-medium leading-[1.65] text-[color:var(--spm-t)] sm:text-[16px]">
                {item}
              </p>
            </li>
          ))}
        </ol>

        {methodSupport.length > 0 ? (
          <section className="mt-7 pt-5">
            <h3 className="m-0 text-[17px] font-semibold tracking-[-0.018em] text-[color:var(--spm-t)]">지도 포인트</h3>
            <div className="mt-3.5 space-y-2.5">
              {methodSupport.map((item, index) => (
                <p key={`${index}-${item}`} className="m-0 break-keep text-[15px] leading-[1.7] text-[color:var(--spm-t2)]">{item}</p>
              ))}
            </div>
          </section>
        ) : null}

        {model.variationMethod.length > 0 ? (
          <section className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="m-0 text-[15px] font-semibold tracking-[-0.012em] text-[color:var(--spm-t2)]">
              난이도 조절 · 변형 활동
            </h3>
            <ul id={variationListId} className="m-0 mt-4 space-y-3">
              {visibleVariations.map((item, index) => (
                <li data-detail-variation-item key={`${index}-${item}`} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2.5">
                  <StepMarker index={index} />
                  <p className="m-0 break-keep pt-0.5 text-[14px] font-medium leading-[1.65] text-[color:var(--spm-t2)] sm:text-[15px]">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
            {hiddenVariationCount > 0 ? (
              <button
                data-detail-variation-toggle
                type="button"
                className="mt-2 inline-flex min-h-11 items-center px-0 text-[14px] font-semibold text-[var(--spm-acc)] transition-colors hover:text-[color:var(--spm-t)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
                aria-expanded={variationsExpanded}
                aria-controls={variationListId}
                onClick={() => setVariationsExpanded((expanded) => !expanded)}
              >
                {variationsExpanded ? '접기' : `+ ${hiddenVariationCount}개 더보기`}
              </button>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function columnClass(column: 1 | 2, part: 'heading' | 'body') {
  const col = column === 2 ? 'min-[900px]:col-start-2' : 'min-[900px]:col-start-1';
  const row = part === 'heading' ? 'min-[900px]:row-start-1' : 'min-[900px]:row-start-2';
  return `${col} ${row}`;
}

function SetupPanel({ model, column }: { model: LessonDisplayModel; column: 1 | 2 }) {
  return (
    <div data-detail-panel="setup" className={DETAIL_PANEL_CLASS}>
      <h2
        data-detail-panel-heading
        className={`${DETAIL_PANEL_HEADING_CLASS} ${columnClass(column, 'heading')}`}
      >
        초기 교구 세팅
      </h2>
      <div
        data-detail-panel-body
        className={`${DETAIL_PANEL_BODY_CLASS} ${columnClass(column, 'body')}`}
      >
        {model.setupImageUrl ? <SetupImage title={model.title} src={model.setupImageUrl} /> : null}
        {model.equipment.length > 0 ? (
          <section className={`flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] px-3 py-2 ${model.setupImageUrl ? 'mt-5' : ''}`} data-detail-equipment>
            <h3 className="m-0 inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-[color:var(--spm-t)]"><Package className="h-4 w-4 text-[color:var(--spm-t3)]" />준비물</h3>
            <p className="m-0 min-w-0 break-keep text-[14px] leading-6 text-[color:var(--spm-t2)]">{model.equipment.join(' · ')}</p>
          </section>
        ) : null}
        {model.setupNotes.length > 0 ? (
          <section className={model.setupImageUrl || model.equipment.length > 0 ? 'mt-6' : undefined} data-detail-setup-notes>
            <h3 className="m-0 text-[16px] font-semibold text-[color:var(--spm-t)]">세팅 포인트</h3>
            <div className="mt-3 space-y-2.5">
              {model.setupNotes.map((item, index) => (
                <p key={`${index}-${item}`} className="m-0 break-keep text-[15px] leading-[1.7] text-[color:var(--spm-t2)]">{item}</p>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function OverviewPanel({ model, column }: { model: LessonDisplayModel; column: 1 | 2 }) {
  return (
    <div data-detail-panel="overview" className={DETAIL_PANEL_CLASS}>
      <h2
        data-detail-panel-heading
        className={`${DETAIL_PANEL_HEADING_CLASS} ${columnClass(column, 'heading')}`}
      >
        지도 가이드
      </h2>
      <div
        data-detail-panel-body
        className={`${DETAIL_PANEL_BODY_CLASS} ${columnClass(column, 'body')}`}
      >
        {model.coachScript ? (
          <section>
            <h3 className="m-0 inline-flex items-center gap-2 text-[16px] font-semibold text-[color:var(--spm-t)]">
              <MessageSquareQuote className="h-4 w-4 text-[var(--spm-acc)]" />
              설명 스크립트
            </h3>
            <blockquote className="mt-3 space-y-4">
              {splitCoachScriptParagraphs(model.coachScript).map((paragraph, index) => (
                <div
                  key={`${index}-${paragraph}`}
                  className="grid grid-cols-[3px_minmax(0,1fr)] gap-3 rounded-r-[10px] bg-[color-mix(in_srgb,var(--spm-acc)_3%,white)] py-2 pr-3"
                >
                  <span className="h-full min-h-8 rounded-full bg-[color-mix(in_srgb,var(--spm-acc)_58%,transparent)]" aria-hidden />
                  <p className="m-0 whitespace-pre-line break-keep text-[16px] font-medium leading-[1.7] text-slate-700 sm:text-[17px] sm:leading-[1.75]">
                    {paragraph}
                  </p>
                </div>
              ))}
            </blockquote>
          </section>
        ) : null}
        {model.briefingNotes.length > 0 ? (
          <section className={model.coachScript ? 'mt-8' : undefined}>
            <h3 className="m-0 text-[16px] font-semibold text-[color:var(--spm-t)]">사전교육</h3>
            <ol className="m-0 mt-4 space-y-3">
              {model.briefingNotes.map((item, index) => (
                <li key={`${index}-${item}`} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2.5">
                  <StepMarker index={index} />
                  <span className="break-keep pt-0.5 text-[15px] font-medium leading-[1.65] text-[color:var(--spm-t2)]">{item}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function RelatedVideosSection({ videos }: { videos: RelatedLessonVideo[] }) {
  if (videos.length === 0) return null;
  const gridClass = videos.length === 1
    ? 'max-w-[370px] grid-cols-1'
    : videos.length === 2
      ? 'max-w-[760px] sm:grid-cols-2'
      : 'sm:grid-cols-3';
  return (
    <section data-detail-related-videos className="mt-16 sm:mt-[72px]" aria-labelledby="related-video-heading">
      <h2 id="related-video-heading" className="m-0 text-[21px] font-semibold tracking-[-0.025em] text-[color:var(--spm-t)]">
        관련 수업 영상
      </h2>
      <div className={`mt-5 grid items-start gap-4 sm:gap-5 ${gridClass}`}>
        {videos.map((video) => (
          <Link
            key={video.id}
            data-related-video-card
            href={video.href}
            className="group grid min-w-0 transition duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <div data-related-video-thumbnail className="relative aspect-video overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_50%_30%,#475569,#0f172a_72%)]">
              {video.thumbnailUrl ? (
                <Image
                  src={video.thumbnailUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1220px) 370px, (min-width: 900px) 31vw, 100vw"
                  className="object-cover transition duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                  unoptimized={video.thumbnailUrl.includes('img.youtube.com') || imageNeedsUnoptimized(video.thumbnailUrl)}
                />
              ) : (
                <Play className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-white/80" />
              )}
              <span className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-white/92 text-[var(--spm-acc)]">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </div>
            <div className="px-0.5 pt-3">
              <p data-related-video-reason className="m-0 text-[12px] font-medium text-[color:var(--spm-t3)]">
                {{
                  '신체 기능 유사': '비슷한 신체 기능',
                  '같은 교구': '같은 교구 활용',
                  '동작 패턴 유사': '비슷한 움직임',
                  '관련 활동': '함께 보기 좋은 활동',
                }[video.reason]}
              </p>
              <h3 className="m-0 mt-1 line-clamp-2 break-keep text-[15px] font-semibold leading-[1.45] tracking-[-0.012em] text-[color:var(--spm-t)]">
                {video.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DetailLessonGuide({
  model,
  actions,
  personalizedContext,
  video,
  relatedVideos,
  heroTitleRef,
}: {
  model: LessonDisplayModel;
  actions: ReactNode;
  personalizedContext?: ReactNode;
  video: VideoProps;
  relatedVideos: RelatedLessonVideo[];
  heroTitleRef?: Ref<HTMLHeadingElement>;
}) {
  const title = splitLessonTitle(model.title);
  const hasOverview = Boolean(model.coachScript) || model.briefingNotes.length > 0;
  const hasPhysicalPreparation = Boolean(model.setupImageUrl) || model.equipment.length > 0 || model.setupNotes.length > 0;
  const showPrepare = hasPhysicalPreparation || hasOverview;
  const twoColPrepare = hasPhysicalPreparation && hasOverview;

  return (
    <div>
      <header className="grid items-start gap-5 pb-7 pt-3 sm:pt-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
        <div className="min-w-0">
          <p data-detail-context className="mb-2 text-[13px] font-medium text-[color:var(--spm-t3)]">상세 수업 준비</p>
          <h1
            ref={heroTitleRef}
            data-detail-hero-title
            className="flex max-w-[900px] flex-wrap items-baseline gap-x-3 gap-y-1 break-keep text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-[color:var(--spm-t)] sm:text-[30px]"
          >
            <span>{title.koreanTitle}</span>
            {title.englishTitle ? (
              <span data-detail-english-title className="break-words text-[13px] font-normal leading-5 tracking-normal text-[color:var(--spm-t3)] sm:text-[14px]">
                {title.englishTitle}
              </span>
            ) : null}
          </h1>
        {model.tags.length > 0 ? (
          <div data-detail-public-tags className="mt-4 flex max-w-3xl flex-wrap gap-2">
            {model.tags.map((tag) => (
              <span key={tag} className="inline-flex h-7 max-w-full items-center break-words rounded-[10px] bg-[color-mix(in_srgb,var(--spm-acc)_5%,white)] px-3 text-[13px] font-medium text-[color:var(--spm-t2)] ring-1 ring-[var(--spm-acc-a10)]">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        </div>
        <div className="lg:pt-7">{actions}</div>
      </header>

      <section
        data-detail-row="execution"
        className={`${DETAIL_ROW_CLASS} min-[900px]:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)] min-[900px]:grid-rows-[30px_auto]`}
      >
        <VideoPanel model={model} video={video} />
        <MethodPanel model={model} />
      </section>

      {showPrepare ? (
        <section
          id="lesson-preparation"
          data-detail-row="preparation"
          className="mt-12 scroll-mt-20 sm:mt-14"
        >
          {hasPhysicalPreparation || hasOverview ? (
            <div
              className={`${DETAIL_ROW_CLASS} ${twoColPrepare ? 'min-[900px]:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] min-[900px]:grid-rows-[30px_auto]' : 'min-[900px]:grid-cols-1'}`}
            >
              {hasPhysicalPreparation ? <SetupPanel model={model} column={1} /> : null}
              {hasOverview ? <OverviewPanel model={model} column={twoColPrepare ? 2 : 1} /> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {personalizedContext ? (
        <div data-detail-personalized-context className="mt-10 w-full sm:mt-12">
          {personalizedContext}
        </div>
      ) : null}

      <RelatedVideosSection videos={relatedVideos} />
    </div>
  );
}
