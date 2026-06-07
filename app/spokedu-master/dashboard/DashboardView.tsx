'use client';

import { BookOpen, Clipboard, MonitorPlay, Play, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CategoryIcon } from '../components/ui/ProgramThumb';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import {
  getExternalVideoUrl,
  getImageFallbackSrc,
  getTrustedProgramVideoUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
  isRemoteImage,
  normalizeImageSrc,
  programHasPlayableVideo,
  resolveProgramHero,
} from '../lib/program-media';
import { isPaidMasterPlan } from '../lib/subscription';
import { isFunstickFencingProgram } from '../lib/verified-program-video';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import {
  displayMasterDuration,
  hasMasterSpace,
  parseMasterSpaces,
  parseMasterTargets,
} from '../lib/programDisplayTags';
import { useMasterStore, useProfile } from '../store';
import type { Program } from '../types';

type VideoItem = {
  id: string;
  title: string;
  href: string;
  thumbnail?: string;
  meta: string;
  hasVideo: boolean;
  tags: string[];
  reason: string;
  program?: Program;
};

type DrillItem = {
  id: string;
  title: string;
  href: string;
  meta: string;
  description: string;
};

type DashboardKpi = {
  label: string;
  value: number | string;
};

function isPlaceholderText(value?: string | null) {
  const text = (value ?? '').trim();
  return !text || hasBrokenText(text) || /확인 필요|활동 공간 확인|조정|미정|undefined|null/i.test(text);
}

function displayText(value: string | undefined, fallback: string) {
  const text = cleanText(value, fallback);
  return isPlaceholderText(text) ? fallback : text;
}

function getProgramTitle(program: Program) {
  return displayText(program.title, 'SPOKEDU 수업');
}

function getProgramCategory(program: Program) {
  return displayText(program.category, '체육 수업');
}

function getProgramGrade(program: Program) {
  return displayText(program.grade, '');
}

function getProgramSpace(program: Program) {
  return displayText(program.space, '');
}

function hasVerifiedGrade(program: Program) {
  return Boolean(getProgramGrade(program));
}

function hasVerifiedSpace(program: Program) {
  return Boolean(getProgramSpace(program));
}

function getValidEquipment(program: Program) {
  return program.equipment.filter((item) => !isPlaceholderText(item));
}

function formatSpaceBadge(space: string) {
  return parseMasterSpaces(space).join(', ') || space;
}

function formatGradeBadge(grade: string) {
  return parseMasterTargets(grade).join(', ') || grade;
}


function formatCompactBadge(value: string) {
  const target = parseMasterTargets(value);
  const space = parseMasterSpaces(value);
  const normalized = target.length ? target.join(', ') : space.length ? space.join(', ') : value;
  return normalized
    .replace(/현장 규모에 맞게 조정/g, '인원 조정')
    .replace(/운영에 맞춰 확인/g, '운영')
    .trim();
}

function getHeroImage(program: Program | undefined) {
  return program ? resolveProgramHero(program) : undefined;
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
}

function uniquePrograms(programs: Program[]) {
  const seen = new Set<string>();
  return programs.filter((program) => {
    const key = normalizeTitle(getProgramTitle(program));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildProgramPool(programs: Program[]) {
  return uniquePrograms(programs);
}

function CoverImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
  quality = 90,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  priority?: boolean;
  quality?: number;
}) {
  const imageSrc = normalizeImageSrc(src);

  if (isRemoteImage(imageSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        onError={(event) => {
          const fallback = getImageFallbackSrc(imageSrc);
          if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
        }}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      quality={quality}
    />
  );
}

function getProgramTags(program: Program) {
  const tags = [
    getProgramCategory(program),
    ...parseMasterTargets(getProgramGrade(program)),
    ...parseMasterSpaces(getProgramSpace(program)),
    ...program.tags,
  ]
    .filter(Boolean)
    .filter((item) => !isPlaceholderText(item));
  return Array.from(new Set(tags.map(formatCompactBadge))).slice(0, 4);
}

function getCardTags(program: Program) {
  const focusTags = (program.lessonDetail?.developmentFocus ?? '')
    .split(/[\/,·]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const tags = [
    ...parseMasterTargets(getProgramGrade(program)),
    ...parseMasterSpaces(getProgramSpace(program)),
    ...focusTags,
    ...program.tags,
  ]
    .filter(Boolean)
    .filter((item) => !isPlaceholderText(item) && item !== '영상 확인');
  return Array.from(new Set(tags.map(formatCompactBadge)))
    .filter((t) => t.length <= 20)
    .slice(0, 5);
}

function uniqueLabels(labels: string[]) {
  return Array.from(new Set(labels.map(formatCompactBadge).filter(Boolean)));
}

/** 썸네일 우측 상단 — 영상 있을 때는 비우고 좌측 「참고 영상」만 쓴다 */
function getProgramThumbOverlayCue(program: Program) {
  if (programHasPlayableVideo(program)) return null;
  if (hasMasterSpace(program.space, '교실')) return '교실 운영';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물 간단';
  return '자료 보기';
}

function getProgramCue(program: Program) {
  if (programHasPlayableVideo(program)) return '미리보기에서 참고 영상 확인';
  if (hasMasterSpace(program.space, '교실')) return '교실 운영';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물 간단';
  return '자료 보기';
}

function getCurationReason(program: Program, intent: 'weekly' | 'indoor' = 'weekly') {
  const detail = program.lessonDetail;
  if (intent === 'indoor') {
  if (isPlaceholderText(program.space)) return '교실 운영 여부 확인';
    return `${formatSpaceBadge(getProgramSpace(program))} 운영`;
  }
  if (detail?.videoUrl && (detail.rules?.length || program.steps.length)) return '영상과 순서를 함께 확인';
  if (program.description && detail?.developmentFocus) return '설명과 진행 흐름 정리';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물 적은 수업';
  if (program.isHot) return '현장 활용도 높은 수업';
  return '오늘 바로 준비';
}

function getHomeReadiness(program: Program) {
  const detail = program.lessonDetail;
  const checks = [
    programHasPlayableVideo(program),
    hasHomeVisual(program),
    hasVerifiedGrade(program),
    hasVerifiedSpace(program),
    Boolean(detail?.rules?.length || program.steps.length),
    Boolean(program.description),
    getValidEquipment(program).length > 0,
  ];
  const penalty = [program.title, program.category, program.grade, program.space, program.description].filter(isPlaceholderText).length;
  return checks.filter(Boolean).length - penalty;
}

function hasHomeVisual(program: Program) {
  return Boolean(getHeroImage(program));
}

function hasHomeFlow(program: Program) {
  return Boolean(program.lessonDetail?.rules?.length || program.steps.length);
}

function hasHomeContext(program: Program) {
  return Boolean(program.description && !isPlaceholderText(program.description));
}

function isHomeDisplayableProgram(program: Program) {
  return getHomeReadiness(program) >= 3 && (hasHomeVisual(program) || hasHomeVideo(program));
}

function isHomeShowcaseProgram(program: Program) {
  return isHomeDisplayableProgram(program) && hasHomeFlow(program) && hasHomeContext(program) && hasVerifiedGrade(program) && hasVerifiedSpace(program);
}

function hasHomeVideo(program: Program) {
  return programHasPlayableVideo(program);
}

function isVideoReadyProgram(program: Program) {
  return hasHomeVideo(program) && isHomeShowcaseProgram(program);
}

function isHomeHotCandidate(program: Program) {
  return Boolean(program.isHot) && isHomeDisplayableProgram(program);
}

function getHomeSortOrder(program: Program) {
  return program.homeSortOrder ?? 9999;
}

function compareHomePrograms(a: Program, b: Program) {
  const orderDiff = getHomeSortOrder(a) - getHomeSortOrder(b);
  if (orderDiff !== 0) return orderDiff;

  return (
    Number(b.isHot) - Number(a.isHot) ||
    Number(isHomeShowcaseProgram(b)) - Number(isHomeShowcaseProgram(a)) ||
    Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
    Number(hasHomeVideo(b)) - Number(hasHomeVideo(a)) ||
    getHomeReadiness(b) - getHomeReadiness(a) ||
    Number(b.isNew) - Number(a.isNew)
  );
}

function toVideoItem(program: Program, intent: 'weekly' | 'indoor' = 'weekly'): VideoItem {
  const tags = getProgramTags(program);
  return {
    id: program.id,
    title: getProgramTitle(program),
    href: `/spokedu-master/library/${program.id}`,
    thumbnail: getHeroImage(program),
    meta: tags[0] || '체육 수업',
    hasVideo: programHasPlayableVideo(program),
    tags: getCardTags(program),
    reason: getCurationReason(program, intent),
    program,
  };
}

function pickHeroProgram(programs: Program[]) {
  const pool = uniquePrograms(programs);
  const funstickHero =
    pool.find((program) => program.id === 'funstick-fencing' && isHomeShowcaseProgram(program)) ||
    pool.find((program) => isFunstickFencingProgram(program) && isHomeShowcaseProgram(program));
  const sorted = [...pool].sort(compareHomePrograms);
  return (
    funstickHero ||
    sorted.find(isVideoReadyProgram) ||
    sorted.find((program) => programHasPlayableVideo(program) && isHomeHotCandidate(program)) ||
    sorted.find((program) => programHasPlayableVideo(program) && isHomeShowcaseProgram(program)) ||
    sorted.find(isHomeHotCandidate) ||
    sorted.find(isHomeShowcaseProgram) ||
    sorted.find(isHomeDisplayableProgram) ||
    sorted[0]
  );
}

/** 홈 row는 검증된 콘텐츠만 노출한다. 부족한 개수는 억지로 채우지 않는다. */
function takeHomeCuratedPrograms(programs: Program[], usedIds: Set<string>, limit: number) {
  const selected: Program[] = [];
  const sorted = [...programs].sort(compareHomePrograms);

  const tiers: Array<(program: Program) => boolean> = [
    (program) => isVideoReadyProgram(program),
    (program) => isHomeShowcaseProgram(program),
    (program) => isHomeHotCandidate(program),
    (program) => isHomeDisplayableProgram(program),
  ];

  const addProgram = (program: Program) => {
    if (usedIds.has(program.id)) return;
    selected.push(program);
    usedIds.add(program.id);
  };

  for (const match of tiers) {
    for (const program of sorted) {
      if (selected.length >= limit) return selected;
      if (!match(program)) continue;
      addProgram(program);
    }
  }

  return selected;
}

const HERO_FEATURE_TAGS = ['수업 준비 시간 단축', '영상·수업안 통합', 'TV·빔 바로 실행', '수업 후 설명 도구'] as const;

function Hero({ program, onPreview }: { program: Program; onPreview: () => void }) {
  const heroImage = getHeroImage(program);
  const hasVideo = programHasPlayableVideo(program);

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="grid lg:grid-cols-[1fr_460px]">
        <div className="flex min-h-[200px] flex-col justify-between p-4 sm:min-h-[340px] sm:p-7 lg:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-indigo-600 sm:text-xs sm:tracking-[0.14em]">
              <Sparkles className="h-3.5 w-3.5" />
              체육수업 운영 대시보드
            </span>
            <h1 className="mt-3 max-w-2xl text-[28px] font-black leading-tight text-slate-950 sm:mt-4 sm:text-[40px]">수업 자료와 실행 도구를 한 화면에서</h1>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-600">
              오늘 운영할 수업 자료를 빠르게 찾고, 참고 영상과 SPOMOVE 실행을 한 화면에서 연결합니다.
            </p>
            <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
              {HERO_FEATURE_TAGS.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/spokedu-master/library" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(79,70,229,0.22)]">
              <BookOpen className="h-4 w-4" />
              오늘 쓸 수업 찾기
            </Link>
            <Link href="/spokedu-master/spomove" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition-colors hover:border-indigo-200 hover:text-indigo-700">
              <MonitorPlay className="h-4 w-4" />
              SPOMOVE 실행하기
            </Link>
          </div>
        </div>
        <button type="button" onClick={onPreview} className="relative hidden min-h-[250px] overflow-hidden bg-slate-100 sm:block">
          {heroImage ? (
            <>
              <CoverImage src={heroImage} alt={getProgramTitle(program)} sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" priority quality={92} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/36 to-transparent" />
              {hasVideo ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl ring-4 ring-white/40">
                    <Play className="ml-1 h-7 w-7 fill-current" />
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-slate-100 to-white" />
          )}
          <div className="absolute bottom-5 left-5 right-5 rounded-[18px] border border-white/25 bg-white/88 p-4 text-left shadow-[0_18px_46px_rgba(15,23,42,0.2)] backdrop-blur-xl">
            <p className="text-[12px] font-bold text-slate-500">{hasVideo ? '참고 영상' : '수업 준비'}</p>
            <p className="mt-1 text-[15px] font-black leading-5 text-slate-950">
              {hasVideo ? '탭하면 미리보기에서 바로 재생' : getProgramCue(program)}
            </p>
          </div>
        </button>
      </div>
    </section>
  );
}

function KpiStrip({ kpis }: { kpis: DashboardKpi[] }) {
  if (kpis.length === 0) return null;
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="w-[44vw] min-w-[150px] shrink-0 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)] sm:w-auto sm:shrink sm:py-4"
        >
          <p className="text-[22px] font-black tabular-nums leading-none text-slate-950">{kpi.value}</p>
          <p className="mt-1.5 text-[12px] font-semibold leading-none text-slate-500">{kpi.label}</p>
        </div>
      ))}
    </div>
  );
}

function VideoCard({ item, onPreview, premiumLabel }: { item: VideoItem; onPreview: (program: Program) => void; premiumLabel?: string }) {
  const showPlay = item.hasVideo;
  const detail = item.program?.lessonDetail;
  const target = item.program ? formatGradeBadge(detail?.recommendedAge || getProgramGrade(item.program)) : '';
  const space = item.program ? formatSpaceBadge(getProgramSpace(item.program)) : '';
  const operationBadges = uniqueLabels(
    [
      target && !isPlaceholderText(target) ? target : null,
      space && !isPlaceholderText(space) ? space : null,
    ].filter((badge): badge is string => Boolean(badge)),
  ).slice(0, 2);
  const thumbOverlayCue = !showPlay && item.program ? getProgramThumbOverlayCue(item.program) : null;
  const cleanOverlayCue = thumbOverlayCue && !isPlaceholderText(thumbOverlayCue) ? thumbOverlayCue : null;
  return (
    <button type="button" onClick={() => item.program && onPreview(item.program)} className="group block w-full cursor-pointer text-left">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 group-hover:border-indigo-200 group-hover:shadow-[0_14px_32px_rgba(99,102,241,0.10)]">
        {item.thumbnail ? (
          <CoverImage src={item.thumbnail} alt={item.title} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" quality={90} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-100 via-slate-50 to-white">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
              {item.program ? <CategoryIcon category={getProgramCategory(item.program)} size={28} /> : <Play className="h-6 w-6" />}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />

        {showPlay ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-xl ring-4 ring-white/30">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </div>
          </div>
        ) : null}

        {showPlay ? (
          <div className="absolute left-3 top-3 rounded-lg bg-red-600/95 px-2.5 py-1 text-[12px] font-black text-white shadow-md">
            참고 영상
          </div>
        ) : null}

        {premiumLabel ? (
          <div className="absolute right-3 top-3 rounded-lg border border-indigo-100 bg-white/92 px-2.5 py-1 text-[12px] font-black text-indigo-700 shadow-sm backdrop-blur-sm">
            {premiumLabel}
          </div>
        ) : cleanOverlayCue ? (
          <div className="absolute right-3 top-3 rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm">
            {cleanOverlayCue}
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <h3 className="line-clamp-1 text-[17px] font-extrabold leading-5 text-slate-950">{item.title}</h3>
          <p className="mt-1 line-clamp-1 text-[13px] font-semibold leading-4 text-slate-600">{item.reason}</p>
        </div>
        {operationBadges.length > 0 ? (
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {operationBadges.map((badge, index) => (
              <span key={`${badge}-${index}`} className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-bold leading-none text-slate-600">
                {badge}
              </span>
            ))}
          </div>
        ) : null}
        <span className={`inline-flex h-9 w-fit items-center justify-center rounded-lg px-3.5 text-sm font-bold ${
          item.hasVideo ? 'bg-indigo-600 text-white shadow-[0_6px_14px_rgba(79,70,229,0.18)]' : 'border border-slate-200 bg-white text-slate-800'
        }`}>
          {item.hasVideo ? '영상 보기' : '수업 열기'}
        </span>
      </div>
    </button>
  );
}

function CurationEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
      <BookOpen className="mx-auto h-9 w-9 text-slate-400" />
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
      <Link href="/spokedu-master/library" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-black text-white">
        놀이체육에서 더 찾기
      </Link>
    </div>
  );
}

function VideoRow({
  title,
  subtitle,
  eyebrow,
  videos,
  onPreview,
  actionHref = '/spokedu-master/library',
  actionLabel = '놀이체육 보기',
  emptyMessage,
  showPremiumBadges = false,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  videos: VideoItem[];
  onPreview: (program: Program) => void;
  actionHref?: string;
  actionLabel?: string;
  emptyMessage?: string;
  showPremiumBadges?: boolean;
}) {
  if (videos.length === 0 && !emptyMessage) return null;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-[#f8fafc] px-5 pt-5 shadow-sm sm:px-6 sm:pt-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-500">{eyebrow}</p> : null}
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[24px]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-slate-600">{subtitle}</p>
        </div>
        {videos.length > 0 ? (
          <Link href={actionHref} className="shrink-0 text-[13px] font-bold text-indigo-600 transition hover:text-indigo-800">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {videos.length === 0 && emptyMessage ? (
        <div className="pb-5">
          <CurationEmptyState message={emptyMessage} />
        </div>
      ) : null}
      {videos.length > 0 ? (
        <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-5 [scrollbar-width:none] sm:-mx-6 sm:gap-5 sm:px-6 sm:pb-6 [&::-webkit-scrollbar]:hidden">
          {videos.map((item, index) => (
            <div key={item.id} className="w-[72vw] min-w-[250px] max-w-[340px] shrink-0 sm:w-[290px] xl:w-[340px]">
              <VideoCard item={item} onPreview={onPreview} premiumLabel={showPremiumBadges && index >= 2 ? 'MASTER' : undefined} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ContinueLessonsSection({ lessons, onPreview }: { lessons: VideoItem[]; onPreview: (program: Program) => void }) {
  if (lessons.length === 0) return null;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white px-5 pt-5 shadow-sm sm:px-6 sm:pt-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[18px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[20px]">내 수업 이어하기</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">최근 기록과 저장한 수업을 빠르게 다시 열 수 있습니다.</p>
        </div>
        <div className="flex gap-3 text-[13px] font-bold text-indigo-600">
          <Link href="/spokedu-master/class-record" className="transition hover:text-indigo-800">
            수업기록
          </Link>
          <Link href="/spokedu-master/library" className="transition hover:text-indigo-800">
            저장 목록
          </Link>
        </div>
      </div>
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-5 [scrollbar-width:none] sm:-mx-6 sm:px-6 sm:pb-6 [&::-webkit-scrollbar]:hidden">
        {lessons.map((item) => (
          <div key={item.id} className="w-[64vw] min-w-[220px] max-w-[270px] shrink-0 sm:w-[240px]">
            <VideoCard item={item} onPreview={onPreview} />
          </div>
        ))}
      </div>
    </section>
  );
}

function DrillCard({ item }: { item: DrillItem }) {
  return (
    <Link href={item.href} className="group block cursor-pointer">
      <div className="relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[radial-gradient(circle_at_75%_20%,rgba(99,102,241,0.45),transparent_30%),linear-gradient(135deg,#101014,#18181b_58%,#050505)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_22px_54px_rgba(99,102,241,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black shadow-xl">
            <MonitorPlay className="h-5 w-5" />
          </span>
          <span className="rounded-lg border border-white/10 bg-black/45 px-3 py-1.5 text-[12px] font-semibold text-white/90 backdrop-blur">
            {item.meta}
          </span>
        </div>
        <div>
          <h3 className="line-clamp-2 text-[18px] font-bold leading-snug text-white">{item.title}</h3>
          <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-zinc-400">{item.description}</p>
        </div>
      </div>
    </Link>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DrillRow({ title, subtitle, drills }: { title: string; subtitle: string; drills: DrillItem[] }) {
  if (drills.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-white sm:text-[24px]">{title}</h2>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-5 text-zinc-400">{subtitle}</p>
        </div>
        <Link href="/spokedu-master/spomove" className="shrink-0 text-[13px] font-bold text-zinc-300 transition hover:text-white">
          전체보기
        </Link>
      </div>
      <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:gap-5 sm:px-8 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden">
        {drills.map((item) => (
          <div key={item.id} className="w-[72vw] min-w-[250px] max-w-[340px] shrink-0 sm:w-[290px] xl:w-[340px]">
            <DrillCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}

function OfficialSpomoveDashboardCard({ preset }: { preset: OfficialSpomovePreset }) {
  return (
    <Link href={officialPresetSessionHref(preset)} className="group block cursor-pointer">
      <div className="flex aspect-video flex-col justify-between overflow-hidden rounded-xl border border-indigo-200 bg-white p-4 shadow-[0_4px_14px_rgba(99,102,241,0.08)] transition-all duration-300 group-hover:border-indigo-300 group-hover:shadow-[0_8px_24px_rgba(99,102,241,0.14)]">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <MonitorPlay className="h-4 w-4" />
          </span>
          <span className="rounded-lg border border-indigo-100 bg-white px-2.5 py-1 text-[12px] font-bold text-indigo-700">
            {preset.axisTitle}
          </span>
        </div>
        <div>
          <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-slate-950">{preset.title}</h3>
          {preset.salesCopy ? (
            <p className="mt-1 line-clamp-1 text-[13px] font-semibold leading-4 text-indigo-600">{preset.salesCopy}</p>
          ) : null}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {preset.settingChips.slice(0, 2).map((chip) => (
                <span key={chip} className="whitespace-nowrap rounded-md bg-slate-100 px-2.5 py-1 text-[12px] font-bold leading-none text-slate-700">
                  {chip}
                </span>
              ))}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-black text-white shadow-sm">
              <MonitorPlay className="h-3.5 w-3.5" />
              TV 실행
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SpomoveOfficialRow({ presets }: { presets: readonly OfficialSpomovePreset[] }) {
  return (
    <section className="rounded-[24px] border border-indigo-100 bg-indigo-50 px-5 pt-5 shadow-sm sm:px-6 sm:pt-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">SPOMOVE</p>
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[24px]">TV·빔으로 바로 실행하는 SPOMOVE</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-indigo-800/60">공식 세팅으로 큰 화면에서 바로 실행합니다.</p>
        </div>
        <Link href="/spokedu-master/spomove" className="shrink-0 text-[13px] font-bold text-indigo-600 transition hover:text-indigo-800">
          전체 프로그램 보기
        </Link>
      </div>
      {presets.length === 0 ? (
        <div className="pb-5">
          <CurationEmptyState message="지금 표시할 공식 SPOMOVE 세팅이 없습니다. 스포무브 화면에서 전체 목록을 확인해 주세요." />
        </div>
      ) : (
        <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-5 [scrollbar-width:none] sm:-mx-6 sm:gap-5 sm:px-6 sm:pb-6 [&::-webkit-scrollbar]:hidden">
          {presets.map((preset) => (
            <div key={preset.id} className="w-[72vw] min-w-[250px] max-w-[340px] shrink-0 sm:w-[290px] xl:w-[340px]">
              <OfficialSpomoveDashboardCard preset={preset} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SubscriptionValueSection() {
  return (
    <section className="rounded-[24px] border border-indigo-100 bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[15px] font-black text-slate-950">수업안 · 참고 영상 · 공식 SPOMOVE 활동 · 수업 기록 제공</p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500">SPOMOVE 세팅과 수업별 명시 연결은 순차적으로 확장됩니다.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Link href="/spokedu-master/profile?plans=1" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-[13px] font-black text-white">
            30일 이용권 보기
          </Link>
          <Link href="/spokedu-master/library" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-800">
            샘플 수업 보기
          </Link>
        </div>
      </div>
    </section>
  );
}

function ExplanationToolEntry({ program }: { program: Program }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[17px] font-black text-slate-950">수업 후 설명과 기록을 빠르게 정리하세요</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">학부모 안내 문구와 수업 설명을 한 번에 만들 수 있습니다.</p>
        </div>
        <Link href={`/spokedu-master/report?program=${program.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-[0_6px_14px_rgba(79,70,229,0.18)]">
          <Clipboard className="h-4 w-4" />
          설명 만들기
        </Link>
      </div>
    </section>
  );
}

function HomeProgramPreview({ program, onClose }: { program: Program; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const detail = program.lessonDetail;
  const heroImage = getHeroImage(program);
  const trustedVideoUrl = getTrustedProgramVideoUrl(program);
  const videoEmbedUrl = getVideoEmbedUrl(trustedVideoUrl, { autoplay: true });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(trustedVideoUrl) ? trustedVideoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(trustedVideoUrl) : undefined;
  const rules = detail?.rules?.length ? detail.rules : program.steps;
  const equipment = program.equipment.filter((item) => !isPlaceholderText(item));
  const setupNotes = (detail?.setupNotes ?? []).filter((item) => !isPlaceholderText(item));
  const briefingNotes = (detail?.briefingNotes ?? []).filter((item) => !isPlaceholderText(item));
  const checklistPreview = [...setupNotes, ...briefingNotes].slice(0, 2);
  const previewFacts = [
    ['대상', formatGradeBadge(detail?.recommendedAge || getProgramGrade(program))],
    ['공간', formatSpaceBadge(getProgramSpace(program))],
    ['시간', displayMasterDuration(program.duration)],
  ].filter(([, value]) => value && !isPlaceholderText(value));
  const parentCopy =
    detail?.parentNote ||
    `오늘은 ${getProgramTitle(program)} 활동으로 ${detail?.developmentFocus || getProgramCategory(program)}을 자연스럽게 경험했습니다. 아이들이 규칙을 이해하고 움직임을 조절하는 과정을 함께 확인했습니다.`;

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <BottomSheet open title="수업 미리보기" onClose={onClose} size="document">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
        <div className="lg:h-fit lg:self-start">
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            <div className="relative aspect-video">
              {videoEmbedUrl ? (
                <iframe
                  key={`${program.id}-${videoEmbedUrl}`}
                  src={videoEmbedUrl}
                  title={`${getProgramTitle(program)} 참고 영상`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : directVideoUrl ? (
                <video src={directVideoUrl} className="h-full w-full object-cover" controls playsInline autoPlay muted />
              ) : externalVideoUrl ? (
                <div className="grid h-full place-items-center bg-slate-950 p-6 text-center text-white">
                  <div>
                    <Play className="mx-auto h-10 w-10 fill-current text-red-500" />
                    <p className="mt-4 text-base font-black">참고 영상 링크</p>
                    <a href={externalVideoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-slate-950">
                      유튜브에서 열기
                    </a>
                  </div>
                </div>
              ) : heroImage ? (
                <CoverImage src={heroImage} alt={getProgramTitle(program)} sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" quality={92} />
              ) : (
                <div className="grid h-full place-items-center bg-slate-900 text-white">
                  <CategoryIcon category={getProgramCategory(program)} size={48} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-3.5">
          <header>
            <p className="text-xs font-black tracking-[0.14em] text-indigo-600">{getProgramCategory(program)}</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">{getProgramTitle(program)}</h2>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{program.description}</p>
          </header>
          {previewFacts.length > 0 ? (
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {previewFacts.map(([label, value]) => (
                <div key={label} className="rounded-[10px] border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
                  <p className="text-[12px] font-black tracking-[0.08em] text-indigo-500">{label}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] font-black leading-4 text-slate-950">{value}</p>
                </div>
              ))}
            </section>
          ) : null}
          {equipment.length > 0 || checklistPreview.length > 0 ? (
            <section className={`grid gap-3 ${equipment.length > 0 && checklistPreview.length > 0 ? 'md:grid-cols-2' : ''}`}>
              {equipment.length > 0 ? (
                <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                  <h3 className="text-[13px] font-black uppercase tracking-[0.08em] text-emerald-700">준비물</h3>
                  <ul className="mt-3 space-y-2">
                    {equipment.slice(0, 6).map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] font-bold leading-5 text-slate-700">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {checklistPreview.length > 0 ? (
                <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                  <h3 className="text-[13px] font-black uppercase tracking-[0.08em] text-indigo-700">수업 전 체크</h3>
                  <ul className="mt-3 space-y-2">
                    {checklistPreview.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] font-bold leading-5 text-slate-700">
                        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-indigo-200 bg-indigo-50 text-[10px] font-black text-indigo-600">✓</span>
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
          {rules.length > 0 ? (
            <section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                활동 방법
              </h3>
              <ul className="mt-3 space-y-2">
                {rules.slice(0, 2).map((step, index) => (
                  <li key={`${step}-${index}`} className="grid grid-cols-[28px_1fr] gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-black text-indigo-600 ring-1 ring-slate-200">{index + 1}</span>
                    <span className="min-w-0 font-semibold">{step}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(79,70,229,0.18)]">
              <BookOpen className="h-4 w-4" />
              수업 자료 보기
            </Link>
            <button type="button" onClick={copyParentNote} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료 ✓' : '알림장 문구 복사'}
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function DashboardView() {
  const { programs, programsLoaded, programsError, favorites, classRecords, reloadPrograms } = useMasterStore();
  const profile = useProfile();
  const isSubscribed = isPaidMasterPlan(profile);
  const [mounted, setMounted] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  useEffect(() => {
    setMounted(true);
    void reloadPrograms();
  }, [reloadPrograms]);

  const programPool = useMemo(
    () => buildProgramPool(programs).sort(compareHomePrograms),
    [programs],
  );
  const heroProgram = useMemo(() => pickHeroProgram(programPool), [programPool]);
  const homeStats = useMemo(() => {
    const pool = programPool;
    const withVideo = pool.filter((program) => programHasPlayableVideo(program)).length;
    const withThumb = pool.filter((program) => Boolean(getHeroImage(program))).length;
    return { total: pool.length, withVideo, withThumb };
  }, [programPool]);
  const dashboardKpis = useMemo(
    () => [
      { label: '전체 수업 자료', value: programPool.length },
      { label: '영상 포함 수업', value: homeStats.withVideo },
      { label: '저장한 수업', value: favorites.length || '저장하기' },
      { label: '최근 기록', value: classRecords.length || '기록하기' },
      { label: 'SPOMOVE 공식 프로그램', value: OFFICIAL_SPOMOVE_LIBRARY.length },
    ],
    [classRecords.length, favorites.length, homeStats.withVideo, programPool.length],
  );
  const curatedRows = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroProgram) usedIds.add(heroProgram.id);

    const weekly = takeHomeCuratedPrograms(programPool, usedIds, 4);

    return {
      weeklyLessons: weekly.map((program) => toVideoItem(program, 'weekly')),
    };
  }, [heroProgram, programPool]);

  const favoriteLessons = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroProgram) usedIds.add(heroProgram.id);
    curatedRows.weeklyLessons.forEach((item) => usedIds.add(item.id));
    const selected = programPool.filter((program) => favorites.includes(program.id) && !usedIds.has(program.id) && isHomeDisplayableProgram(program));
    return takeHomeCuratedPrograms(selected, usedIds, 8).map((program) =>
      toVideoItem(program, 'weekly'),
    );
  }, [curatedRows.weeklyLessons, favorites, heroProgram, programPool]);

  const recentLessons = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroProgram) usedIds.add(heroProgram.id);
    curatedRows.weeklyLessons.forEach((item) => usedIds.add(item.id));
    favoriteLessons.forEach((item) => usedIds.add(item.id));

    const programsById = new Map(programPool.map((program) => [program.id, program]));
    const recentPrograms: Program[] = [];

    for (const record of [...classRecords].sort((a, b) => b.date.localeCompare(a.date))) {
      if (recentPrograms.length >= 6) break;
      const program = programsById.get(record.programId);
      if (!program || usedIds.has(program.id) || !isHomeDisplayableProgram(program)) continue;
      recentPrograms.push(program);
      usedIds.add(program.id);
    }

    return recentPrograms.map((program) => toVideoItem(program, 'weekly'));
  }, [classRecords, curatedRows.weeklyLessons, favoriteLessons, heroProgram, programPool]);
  const continueLessons = useMemo(() => {
    const seen = new Set<string>();
    const combined: VideoItem[] = [];

    for (const item of [...recentLessons, ...favoriteLessons]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push(item);
      if (combined.length >= 4) break;
    }

    return combined;
  }, [favoriteLessons, recentLessons]);

  if (!mounted || !programsLoaded) {
    return <DashboardSkeleton />;
  }

  if (!heroProgram) {
    const message =
      programsError === 'unauthorized'
        ? '로그인 후 수업 자료를 불러올 수 있습니다.'
        : programsError === 'forbidden'
          ? '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다. 30일 이용권을 다시 결제하면 수업 자료를 이용할 수 있습니다.'
          : '수업 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto bg-[#f5f7fb] px-4 py-16 sm:px-6 lg:px-8">
        <section className="w-full max-w-xl rounded-[22px] border border-slate-200 bg-white p-6 text-center shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <h1 className="text-xl font-black text-slate-950">수업 자료를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          <Link href="/spokedu-master/subscription" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">
            30일 이용권 다시 결제하기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 overflow-y-auto bg-[#f5f7fb] px-4 pb-28 pt-4 sm:gap-8 sm:px-6 sm:pt-5 lg:px-8 lg:pb-16">
      <div className="flex flex-col gap-4">
        <Hero program={heroProgram} onPreview={() => setSelectedProgram(heroProgram)} />
        <KpiStrip kpis={dashboardKpis} />
      </div>
      <VideoRow
        eyebrow="LESSON"
        title="오늘 바로 운영 가능한 수업"
        subtitle="수업안, 참고 영상, 운영 조건을 한눈에 확인합니다."
        videos={curatedRows.weeklyLessons}
        onPreview={setSelectedProgram}
        actionLabel="전체 수업 보기"
        emptyMessage="표시할 수업이 없습니다. 놀이체육에서 전체 목록을 확인해 주세요."
        showPremiumBadges={!isSubscribed}
      />
      <ContinueLessonsSection lessons={continueLessons} onPreview={setSelectedProgram} />
      <SpomoveOfficialRow presets={OFFICIAL_SPOMOVE_LIBRARY} />
      <ExplanationToolEntry program={heroProgram} />
      {!isSubscribed ? <SubscriptionValueSection /> : null}
      {selectedProgram ? <HomeProgramPreview program={selectedProgram} onClose={() => setSelectedProgram(null)} /> : null}
    </main>
  );
}
