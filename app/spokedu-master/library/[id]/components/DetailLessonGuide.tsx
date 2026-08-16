'use client';

import { ExternalLink, Play, X, ZoomIn } from 'lucide-react';
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
  externalUrl?: string;
  sourceUrl?: string;
  autoplay: boolean;
  onPlaybackStarted: () => void;
};

const DETAIL_PANEL_CLASS =
  'grid h-full min-w-0 grid-rows-[30px_minmax(0,1fr)] gap-5';
const DETAIL_PANEL_HEADING_CLASS =
  'm-0 flex h-[30px] items-center text-[21px] font-black leading-[30px] tracking-[-0.025em] text-[color:var(--spm-t)]';
const DETAIL_PANEL_BODY_CLASS = 'min-h-0';
const DETAIL_ROW_CLASS =
  'grid items-stretch gap-8 rounded-[19px] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/55 sm:p-7 min-[900px]:gap-9';

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
      <div className="group relative h-full min-h-[300px] overflow-hidden rounded-[15px] bg-[color-mix(in_srgb,var(--spm-s3)_76%,white)] p-3 sm:min-h-[340px] sm:p-4 min-[900px]:min-h-0">
        <div className="relative z-10 h-full min-h-[276px] overflow-hidden rounded-[12px] sm:min-h-[308px] min-[900px]:min-h-0">
          <Image
            src={src}
            alt={`${title} 초기 교구 세팅`}
            fill
            priority
            sizes="(min-width: 900px) 48vw, 100vw"
            className="object-contain p-1 sm:p-2"
            unoptimized={unoptimized}
          />
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="absolute bottom-5 right-5 z-20 inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-white/92 px-3.5 text-[13px] font-black text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.12)] ring-1 ring-white/90 backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-px hover:bg-white hover:shadow-[0_10px_28px_rgba(15,23,42,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)] motion-reduce:transform-none motion-reduce:transition-none"
        >
          <ZoomIn className="h-4 w-4" /> 이미지 확대
        </button>
      </div>

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
          <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
            <div className="flex min-h-14 items-center justify-between border-b border-slate-200/80 px-4 sm:px-5">
              <h2 id="setup-image-dialog-title" className="truncate text-[16px] font-black">
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
      <div className="grid aspect-video w-full place-items-center rounded-[15px] bg-slate-100 text-[15px] font-bold text-slate-500">
        등록된 수업 영상이 없습니다.
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[14px] bg-slate-950 shadow-[0_10px_28px_rgba(2,6,23,0.18)]">
      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,#334155,#020617_72%)] text-center text-white/70">
        <div><span className="text-[11px] font-black tracking-[0.18em]">SPOKEDU MASTER</span><p className="m-0 mt-2 text-[13px] font-bold">수업 영상</p></div>
      </div>
      {video.embedUrl ? (
        <TrackedVideoIframe
          key={video.embedUrl}
          src={video.embedUrl}
          title={`${model.title} 수업 영상`}
          className="h-full w-full"
          onPlaybackStarted={video.onPlaybackStarted}
          posterUrl={dedicatedPoster}
          posterCandidates={posterCandidates}
          deferUntilPlay={!video.autoplay}
        />
      ) : null}
      {video.directUrl ? (
        <video
          src={video.directUrl}
          className="h-full w-full object-contain"
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
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-white px-5 text-[14px] font-black text-slate-900 transition duration-200 hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
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
      <h2 data-detail-panel-heading className={DETAIL_PANEL_HEADING_CLASS}>수업 영상</h2>
      <div
        data-detail-panel-body
        className={`${DETAIL_PANEL_BODY_CLASS} self-start`}
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

  return (
    <div data-detail-panel="method" className={DETAIL_PANEL_CLASS}>
      <h2 data-detail-panel-heading className={DETAIL_PANEL_HEADING_CLASS}>진행 방법</h2>
      <div data-detail-panel-body className={`${DETAIL_PANEL_BODY_CLASS} flex flex-col`}>
        <ol className="m-0 space-y-5">
          {model.activityMethod.map((item, index) => (
            <li key={`${index}-${item}`} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 sm:gap-4">
              <span className="pt-px text-[18px] font-black leading-7 tabular-nums tracking-[-0.04em] text-[var(--spm-acc)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="m-0 break-keep text-[15px] font-semibold leading-[1.66] text-[color:var(--spm-t)] sm:text-[16px]">
                {item}
              </p>
            </li>
          ))}
        </ol>

        {model.variationMethod.length > 0 ? (
          <section className="mt-7 border-t border-slate-200/60 pt-5">
            <h3 className="m-0 text-[17px] font-black tracking-[-0.018em] text-[color:var(--spm-t)]">
              난이도 조절 · 변형 활동
            </h3>
            <ul id={variationListId} className="m-0 mt-3.5 space-y-3">
              {visibleVariations.map((item, index) => (
                <li data-detail-variation-item key={`${index}-${item}`} className="grid grid-cols-[14px_minmax(0,1fr)] items-start gap-2.5">
                  <span aria-hidden className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[var(--spm-acc-a30)]" />
                  <p className="m-0 break-keep text-[14px] font-semibold leading-[1.65] text-[color:var(--spm-t2)] sm:text-[15px]">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
            {hiddenVariationCount > 0 ? (
              <button
                data-detail-variation-toggle
                type="button"
                className="mt-2 inline-flex min-h-11 items-center px-0 text-[14px] font-black text-[var(--spm-acc)] transition-colors hover:text-[color:var(--spm-t)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
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

function SetupPanel({ model }: { model: LessonDisplayModel }) {
  if (!model.setupImageUrl && model.equipment.length === 0) return null;
  return (
    <div data-detail-panel="setup" className={DETAIL_PANEL_CLASS}>
      <h2 data-detail-panel-heading className={DETAIL_PANEL_HEADING_CLASS}>초기 교구 세팅</h2>
      <div
        data-detail-panel-body
        className={`${DETAIL_PANEL_BODY_CLASS} grid grid-rows-[minmax(0,1fr)_auto] gap-3.5`}
      >
        {model.setupImageUrl ? <SetupImage title={model.title} src={model.setupImageUrl} /> : <div />}
        {model.setupNotes.length > 0 ? (
          <p className="m-0 break-keep px-1 text-[14px] font-semibold leading-6 text-[color:var(--spm-t2)]">
            {model.setupNotes.join(' · ')}
          </p>
        ) : null}
        {model.equipment.length > 0 ? (
          <section className="px-1">
            <h3 className="m-0 text-[15px] font-black text-[color:var(--spm-t)]">준비물</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {model.equipment.map((item) => (
                <span key={item} className="inline-flex min-h-8 max-w-full items-center break-words rounded-[10px] bg-[color-mix(in_srgb,var(--spm-acc)_5%,var(--spm-s3))] px-3 text-[14px] font-bold text-[color:var(--spm-t2)]">
                  {item}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function OverviewPanel({ model }: { model: LessonDisplayModel }) {
  return (
    <div data-detail-panel="overview" className={DETAIL_PANEL_CLASS}>
      <h2 data-detail-panel-heading className={DETAIL_PANEL_HEADING_CLASS}>수업 한눈에 보기</h2>
      <div
        data-detail-panel-body
        className={`${DETAIL_PANEL_BODY_CLASS} divide-y divide-slate-200/65`}
      >
        {model.coachScript ? (
          <section className="py-5">
            <h3 className="m-0 text-[15px] font-black text-[color:var(--spm-t)]">스크립트</h3>
            <div className="mt-3">
              <p className="m-0 whitespace-pre-line break-keep text-[15px] font-semibold leading-[1.74] text-[color:var(--spm-t2)] sm:text-[16px]">
                {model.coachScript}
              </p>
            </div>
          </section>
        ) : null}
        {model.briefingNotes.length > 0 ? (
          <section className="py-5">
            <h3 className="m-0 text-[15px] font-black text-[color:var(--spm-t)]">사전교육</h3>
            <ul className="m-0 mt-3 space-y-2">
              {model.briefingNotes.map((item, index) => (
                <li key={`${index}-${item}`} className="grid grid-cols-[6px_minmax(0,1fr)] gap-3 text-[15px] font-semibold leading-[1.65] text-[color:var(--spm-t2)]">
                  <span aria-hidden className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[var(--spm-acc-a30)]" />
                  <span className="break-keep">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function RelatedVideosSection({ videos }: { videos: RelatedLessonVideo[] }) {
  if (videos.length === 0) return null;
  return (
    <section data-detail-related-videos className="mt-16 sm:mt-[72px]" aria-labelledby="related-video-heading">
      <h2 id="related-video-heading" className="m-0 text-[21px] font-black tracking-[-0.025em] text-[color:var(--spm-t)]">
        관련영상
      </h2>
      <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-3 sm:gap-5">
        {videos.map((video) => (
          <Link
            key={video.id}
            data-related-video-card
            href={video.href}
            className="group grid min-w-0 grid-rows-[auto_1fr] transition duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <div data-related-video-thumbnail className="relative aspect-video overflow-hidden rounded-[14px] bg-[radial-gradient(circle_at_50%_30%,#475569,#0f172a_72%)]">
              {video.thumbnailUrl ? (
                <Image
                  src={video.thumbnailUrl}
                  alt=""
                  fill
                  sizes="(min-width: 900px) 33vw, 100vw"
                  className="object-cover transition duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                  unoptimized={imageNeedsUnoptimized(video.thumbnailUrl)}
                />
              ) : (
                <Play className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-white/80" />
              )}
              <span className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-white/92 text-[var(--spm-acc)] shadow-lg backdrop-blur">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </div>
            <div className="min-h-[58px] px-0.5 pt-3">
              <h3 className="m-0 line-clamp-2 break-keep text-[15px] font-extrabold leading-[1.45] tracking-[-0.012em] text-[color:var(--spm-t)]">
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
  video,
  relatedVideos,
  heroTitleRef,
}: {
  model: LessonDisplayModel;
  actions: ReactNode;
  video: VideoProps;
  relatedVideos: RelatedLessonVideo[];
  heroTitleRef?: Ref<HTMLHeadingElement>;
}) {
  const title = splitLessonTitle(model.title);
  const hasOverview = Boolean(model.coachScript) || model.briefingNotes.length > 0;

  return (
    <div>
      <header className="mx-auto max-w-[980px] px-1 pb-10 pt-3 text-center sm:pb-12 sm:pt-1 lg:pb-11">
        <h1
          ref={heroTitleRef}
          data-detail-hero-title
          className="mx-auto max-w-[900px] break-keep text-[28px] font-black leading-[1.17] tracking-[-0.042em] text-[color:var(--spm-t)] sm:text-[33px] lg:text-[37px]"
        >
          {title.koreanTitle}
        </h1>
        {title.englishTitle ? (
          <p data-detail-english-title className="mx-auto mt-2 max-w-[760px] break-words text-[15px] font-semibold leading-6 text-[color:var(--spm-t2)] sm:text-[16px]">
            {title.englishTitle}
          </p>
        ) : null}
        <div data-detail-public-tags className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
          {model.tags.map((tag) => (
            <span key={tag} className="inline-flex h-7 max-w-full items-center break-words rounded-[10px] bg-[color-mix(in_srgb,var(--spm-acc)_5%,white)] px-3 text-[13px] font-bold text-[color:var(--spm-t2)] ring-1 ring-[var(--spm-acc-a10)]">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-6">{actions}</div>
      </header>

      <section
        data-detail-row="execution"
        className={`${DETAIL_ROW_CLASS} bg-white min-[900px]:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]`}
      >
        <VideoPanel model={model} video={video} />
        <MethodPanel model={model} />
      </section>

      {model.setupImageUrl || model.equipment.length > 0 || hasOverview ? (
        <section
          id="lesson-preparation"
          data-detail-row="preparation"
          className={`${DETAIL_ROW_CLASS} mt-12 scroll-mt-20 bg-[color-mix(in_srgb,var(--spm-s2)_55%,white)] sm:mt-14 min-[900px]:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]`}
        >
          <SetupPanel model={model} />
          {hasOverview ? <OverviewPanel model={model} /> : null}
        </section>
      ) : null}

      <RelatedVideosSection videos={relatedVideos} />
    </div>
  );
}
