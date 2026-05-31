'use client';

import { BookOpen, Clipboard, MonitorPlay, Play, Search, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CategoryIcon } from '../components/ui/ProgramThumb';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
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
import { isFunstickFencingProgram } from '../lib/verified-program-video';
import { OFFICIAL_SPOMOVE_PRESETS, formatSpomovePresetDuration, spomovePresetHref } from '../lib/spomovePresets';
import { useMasterStore, useProfile } from '../store';
import type { Program, SpomoveLaunchPreset } from '../types';

const CATEGORIES = ['전체', '영상', '반응·민첩', '협동', '저학년', '실내'];

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
  return uniquePrograms(programs.length > 0 ? programs : STATIC_PROGRAMS);
}

/** API에 영상·비주얼이 부족할 때 정적 HOT 쇼케이스를 홈 풀에 보강한다 */
function mergeStaticShowcaseForHome(apiPool: Program[]) {
  const seen = new Set(apiPool.map((program) => normalizeTitle(getProgramTitle(program))));
  const extras: Program[] = [];

  for (const staticProgram of STATIC_PROGRAMS) {
    const isShowcase = staticProgram.isHot || (staticProgram.homeSortOrder ?? 9999) < 8;
    if (!isShowcase) continue;

    const key = normalizeTitle(staticProgram.title);
    if (!key || seen.has(key)) continue;
    if (!programHasPlayableVideo(staticProgram) && !getHeroImage(staticProgram)) continue;

    extras.push(staticProgram);
    seen.add(key);
  }

  return [...apiPool, ...extras].sort(compareHomePrograms);
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
  const tags = [getProgramCategory(program), getProgramGrade(program), getProgramSpace(program), ...program.tags]
    .filter(Boolean)
    .filter((item) => !isPlaceholderText(item));
  return Array.from(new Set(tags)).slice(0, 4);
}

function getCardTags(program: Program) {
  const focusTags = (program.lessonDetail?.developmentFocus ?? '')
    .split(/[\/,·]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const tags = [
    getProgramGrade(program),
    getProgramSpace(program),
    ...focusTags,
    ...program.tags,
  ]
    .filter(Boolean)
    .filter((item) => !isPlaceholderText(item) && item !== '영상 확인');
  return Array.from(new Set(tags)).slice(0, 5);
}

/** 썸네일 우측 상단 — 영상 있을 때는 비우고 좌측 「참고 영상」만 쓴다 */
function getProgramThumbOverlayCue(program: Program) {
  if (programHasPlayableVideo(program)) return null;
  if (/실내|체육관|교실|복도|좁은 공간/.test(getSearchText(program))) return '공간 부담 적음';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물 간단';
  return '자료 보기';
}

function getProgramCue(program: Program) {
  if (programHasPlayableVideo(program)) return '미리보기에서 참고 영상 확인';
  if (/실내|체육관|교실|복도|좁은 공간/.test(getSearchText(program))) return '공간 부담 적음';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물 간단';
  return '자료 보기';
}

function getCurationReason(program: Program, intent: 'weekly' | 'indoor' = 'weekly') {
  const detail = program.lessonDetail;
  if (intent === 'indoor') {
    if (isPlaceholderText(program.space)) return '좁은 공간 운영에 맞춰 확인';
    return `${getProgramSpace(program)} 운영에 맞춰 확인`;
  }
  if (detail?.videoUrl && (detail.rules?.length || program.steps.length)) return '영상과 진행 순서를 함께 확인';
  if (detail?.objective && detail?.developmentFocus) return '목표와 발달 영역이 정리된 수업';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물이 적어 바로 시작 좋음';
  if (program.isHot) return '현장 활용도가 높은 대표 수업';
  return '오늘 수업 준비용으로 먼저 확인';
}

function CompactTagList({ tags, max = 3, className = '', onMedia = false }: { tags: string[]; max?: number; className?: string; onMedia?: boolean }) {
  const visibleTags = tags.slice(0, max);
  const hiddenCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      {visibleTags.map((tag) => (
        <span
          key={tag}
          className={`max-w-full shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold leading-none ${
            onMedia ? 'border border-white/20 bg-black/55 text-white backdrop-blur-sm' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {tag}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span
          className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold leading-none ${
            onMedia ? 'border border-white/10 bg-black/40 text-white/80' : 'bg-slate-50 text-slate-500'
          }`}
        >
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

function getSearchText(program: Program) {
  return [
    getProgramTitle(program),
    getProgramCategory(program),
    getProgramGrade(program),
    getProgramSpace(program),
    program.description,
    program.tags.join(' '),
    program.equipment.join(' '),
    program.lessonDetail?.developmentFocus,
  ]
    .filter(Boolean)
    .join(' ');
}

function programMatchesCategory(program: Program, category: string) {
  const text = getSearchText(program);
  if (category === '전체') return true;
  if (category === '영상') return programHasPlayableVideo(program);
  if (category === '반응·민첩') return /민첩|반응|순발|스피드|속도|방향|전환/.test(text);
  if (category === '협동') return /협동|릴레이|팀|그룹|대결/.test(text);
  if (category === '저학년') return /유아|저학년|1학년|2학년|초등\s*[12]|초등 1|초등 2/.test(text);
  if (category === '실내') return /실내|체육관|교실|복도|좁은 공간/.test(text);
  return true;
}

function getHomeReadiness(program: Program) {
  const detail = program.lessonDetail;
  const checks = [
    Boolean(getHeroImage(program)),
    Boolean(detail?.videoUrl),
    Boolean(detail?.rules?.length || program.steps.length),
    Boolean(detail?.setupNotes?.length || program.equipment.length),
    Boolean(detail?.developmentFocus || program.category),
  ];
  const penalty = [program.title, program.category, program.grade, program.space, program.description, detail?.objective].filter(isPlaceholderText).length;
  return checks.filter(Boolean).length - penalty;
}

function hasHomeVisual(program: Program) {
  return Boolean(getHeroImage(program));
}

function hasHomeFlow(program: Program) {
  return Boolean(program.lessonDetail?.rules?.length || program.steps.length);
}

function hasHomeContext(program: Program) {
  const detail = program.lessonDetail;
  return Boolean((detail?.objective && !isPlaceholderText(detail.objective)) || (program.description && !isPlaceholderText(program.description)));
}

function isHomeDisplayableProgram(program: Program) {
  return hasHomeVisual(program) && hasHomeContext(program);
}

function isHomeShowcaseProgram(program: Program) {
  return hasHomeVisual(program) && hasHomeFlow(program) && hasHomeContext(program) && getHomeReadiness(program) >= 3;
}

function hasHomeVideo(program: Program) {
  return programHasPlayableVideo(program);
}

function isHomeHotCandidate(program: Program) {
  return Boolean(program.isHot) && (hasHomeVisual(program) || hasHomeVideo(program));
}

function isHomeContextProgram(program: Program) {
  return hasHomeFlow(program) && hasHomeContext(program);
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
  const pool = buildProgramPool(programs);
  const funstickHero =
    pool.find((program) => program.id === 'funstick-fencing') ||
    pool.find((program) => isFunstickFencingProgram(program));
  const sorted = [...pool].sort(compareHomePrograms);
  return (
    funstickHero ||
    sorted.find((program) => programHasPlayableVideo(program) && isHomeHotCandidate(program)) ||
    sorted.find((program) => programHasPlayableVideo(program) && isHomeShowcaseProgram(program)) ||
    sorted.find(isHomeHotCandidate) ||
    sorted.find(isHomeShowcaseProgram) ||
    sorted.find((program) => program.isHot) ||
    sorted.find(isHomeDisplayableProgram) ||
    sorted.find(isHomeContextProgram) ||
    sorted[0]
  );
}

/** 홈 row는 품질 단계를 내려가며 limit까지 채운다. 빈 row보다 수업 선택을 우선한다. */
function takeHomeCuratedPrograms(programs: Program[], usedIds: Set<string>, limit: number) {
  const selected: Program[] = [];
  const sorted = [...programs].sort(compareHomePrograms);

  const tiers: Array<(program: Program) => boolean> = [
    (program) => isHomeShowcaseProgram(program),
    (program) => isHomeHotCandidate(program),
    (program) => isHomeDisplayableProgram(program),
    (program) => isHomeContextProgram(program),
    (program) => hasHomeContext(program),
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

  for (const program of sorted) {
    if (selected.length >= limit) return selected;
    addProgram(program);
  }

  return selected;
}

function Hero({ program, kpis, onPreview }: { program: Program; kpis: DashboardKpi[]; onPreview: () => void }) {
  const heroImage = getHeroImage(program);
  const tags = getCardTags(program);
  const hasVideo = programHasPlayableVideo(program);
  const mobilePrimaryKpis = new Set(['전체 수업 자료', '영상 포함 수업', 'SPOMOVE 세팅']);

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="grid lg:grid-cols-[1fr_460px]">
        <div className="flex min-h-[240px] flex-col justify-between p-4 sm:min-h-[360px] sm:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-indigo-600 sm:text-xs sm:tracking-[0.14em]">
              <Sparkles className="h-3.5 w-3.5" />
              SPOKEDU 운영 대시보드
            </span>
            <h1 className="mt-3 max-w-2xl text-2xl font-black leading-tight text-slate-950 sm:mt-5 sm:text-4xl">오늘 수업 준비, 5분 안에 끝내세요</h1>
            <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-5 text-slate-600 sm:mt-4 sm:text-sm sm:leading-7">
              대상·공간·교구에 맞는 놀이체육 수업안과 참고 영상을 확인하고, SPOMOVE 활동은 TV·빔 화면으로 바로 실행할 수 있습니다.
            </p>
            <div className="mt-3 hidden flex-wrap gap-1.5 sm:mt-5 sm:flex sm:gap-2">
              {tags.slice(0, 6).map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-6 sm:grid-cols-3 sm:gap-2.5 xl:grid-cols-5">
              {kpis.map((item) => (
                <div key={item.label} className={`${mobilePrimaryKpis.has(item.label) ? '' : 'hidden sm:block'} rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 sm:rounded-2xl sm:px-3 sm:py-3`}>
                  <p className="text-[10px] font-bold leading-none text-slate-500 sm:text-[11px] sm:leading-normal">{item.label}</p>
                  <p className={`mt-1 font-black text-slate-950 ${typeof item.value === 'number' ? 'text-lg leading-none sm:text-xl sm:leading-normal' : 'text-[12px] leading-4 sm:text-[13px] sm:leading-5'}`}>
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-8 sm:flex sm:flex-row sm:gap-3">
            <button type="button" onClick={onPreview} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-extrabold text-white sm:min-h-12 sm:px-5">
              <Play className="h-4 w-4 fill-current" />
              오늘 수업 준비하기
            </button>
            <Link href="/spokedu-master/library" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 sm:min-h-12 sm:gap-2 sm:px-5 sm:text-sm">
              <BookOpen className="h-4 w-4" />
              수업 자료 둘러보기
            </Link>
            <Link href="/spokedu-master/spomove" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-[13px] font-bold text-indigo-700 sm:min-h-12 sm:gap-2 sm:px-5 sm:text-sm">
              <MonitorPlay className="h-4 w-4" />
              SPOMOVE 실행
            </Link>
          </div>
        </div>
        <button type="button" onClick={onPreview} className="relative hidden min-h-[260px] overflow-hidden bg-slate-100 sm:block">
          {heroImage ? (
            <>
              <CoverImage src={heroImage} alt={getProgramTitle(program)} sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" priority quality={92} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
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
            <p className="text-xs font-bold text-slate-500">{hasVideo ? '참고 영상' : '수업 준비'}</p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {hasVideo ? '탭하면 미리보기에서 바로 재생' : getProgramCue(program)}
            </p>
          </div>
        </button>
      </div>
    </section>
  );
}

function CategoryStrip({
  activeCategory,
  search,
  onCategoryChange,
  onSearchChange,
}: {
  activeCategory: string;
  search: string;
  onCategoryChange: (category: string) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <section className="mb-7">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-black transition ${
                activeCategory === category
                  ? 'bg-slate-950 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <label className="relative block w-full max-w-[420px] shrink-0">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="수업명, 교구, 발달 영역 검색"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-950 shadow-[0_8px_22px_rgba(15,23,42,0.04)] outline-none placeholder:text-slate-400 focus:border-indigo-300"
          />
        </label>
      </div>
    </section>
  );
}

function VideoCard({ item, onPreview, premiumLabel }: { item: VideoItem; onPreview: (program: Program) => void; premiumLabel?: string }) {
  const showPlay = item.hasVideo;
  const detail = item.program?.lessonDetail;
  const target = item.program ? detail?.recommendedAge || getProgramGrade(item.program) : '';
  const space = item.program ? getProgramSpace(item.program) : '';
  const equipmentCount = item.program?.equipment.filter((equipment) => !isPlaceholderText(equipment)).length ?? 0;
  const hasLessonPlan = Boolean((detail?.rules?.length ?? 0) > 0 || (item.program?.steps.length ?? 0) > 0);
  const operationBadges = [
    item.hasVideo ? '영상 포함' : null,
    hasLessonPlan ? '수업안 포함' : null,
    equipmentCount > 0 ? `교구 ${equipmentCount}개` : null,
    target && !isPlaceholderText(target) ? target : null,
    space && !isPlaceholderText(space) ? space : null,
  ].filter((badge): badge is string => Boolean(badge) && !isPlaceholderText(badge)).slice(0, 4);
  const thumbOverlayCue = item.program ? getProgramThumbOverlayCue(item.program) : item.meta;
  const cleanOverlayCue = thumbOverlayCue && !isPlaceholderText(thumbOverlayCue) ? thumbOverlayCue : null;
  return (
    <button type="button" onClick={() => item.program && onPreview(item.program)} className="group block w-full cursor-pointer text-left">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 group-hover:border-indigo-200 group-hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)]">
        {item.thumbnail ? (
          <CoverImage src={item.thumbnail} alt={item.title} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-all duration-500 ease-out group-hover:scale-[1.03]" quality={90} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-100 via-slate-50 to-white">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
              {item.program ? <CategoryIcon category={getProgramCategory(item.program)} size={30} /> : <Play className="h-7 w-7" />}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

        <div className={`absolute inset-0 flex items-center justify-center ${showPlay ? 'opacity-100' : 'opacity-0 transition-opacity duration-300 group-hover:opacity-100'}`}>
          <div className={`flex items-center justify-center rounded-full shadow-xl ${showPlay ? 'h-12 w-12 bg-red-600 text-white ring-4 ring-white/30' : 'h-14 w-14 bg-white text-slate-950'}`}>
            <Play className={`fill-current ${showPlay ? 'ml-0.5 h-5 w-5' : 'ml-0.5 h-6 w-6'}`} />
          </div>
        </div>

        {showPlay ? (
          <div className="absolute left-3 top-3 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-black text-white shadow-md">
            참고 영상
          </div>
        ) : null}

        {premiumLabel ? (
          <div className="absolute right-3 top-3 rounded-lg border border-indigo-100 bg-white/92 px-2.5 py-1 text-[11px] font-black text-indigo-700 shadow-sm backdrop-blur-sm">
            {premiumLabel}
          </div>
        ) : cleanOverlayCue ? (
          <div className="absolute right-3 top-3 rounded-lg border border-white/20 bg-black/55 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm">
            {cleanOverlayCue}
          </div>
        ) : null}

        <div className="absolute bottom-3 left-3 right-3">
          <CompactTagList tags={item.tags} max={2} onMedia />
        </div>
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{item.title}</h3>
      <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-slate-500">{item.reason}</p>
      <div className="mt-2 flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {operationBadges.map((badge) => (
            <span key={badge} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold leading-none text-slate-600">
              {badge}
            </span>
          ))}
        </div>
        <span className="shrink-0 text-[12px] font-bold text-indigo-600">수업 열기</span>
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
  videos,
  onPreview,
  actionHref = '/spokedu-master/library',
  actionLabel = '놀이체육 보기',
  emptyMessage,
  showPremiumBadges = false,
}: {
  title: string;
  subtitle: string;
  videos: VideoItem[];
  onPreview: (program: Program) => void;
  actionHref?: string;
  actionLabel?: string;
  emptyMessage?: string;
  showPremiumBadges?: boolean;
}) {
  if (videos.length === 0 && !emptyMessage) return null;

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[24px]">{title}</h2>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-5 text-slate-500">{subtitle}</p>
        </div>
        {videos.length > 0 ? (
          <Link href={actionHref} className="shrink-0 text-[13px] font-bold text-indigo-600 transition hover:text-indigo-800">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {videos.length === 0 && emptyMessage ? <CurationEmptyState message={emptyMessage} /> : null}
      {videos.length > 0 ? (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:gap-5 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
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
    <section className="rounded-[18px] border border-slate-200 bg-white px-4 py-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)] sm:px-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[18px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[20px]">내 수업 이어하기</h2>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500">최근 기록과 저장한 수업을 빠르게 다시 열 수 있습니다.</p>
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
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden">
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

function SpomovePresetCard({ preset, premiumLabel }: { preset: SpomoveLaunchPreset; premiumLabel?: string }) {
  return (
    <Link href={spomovePresetHref(preset)} className="group block cursor-pointer">
      <div className="relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 group-hover:border-indigo-200 group-hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <MonitorPlay className="h-5 w-5" />
          </span>
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-[12px] font-bold text-indigo-700">{premiumLabel || '공식 실행'}</span>
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] font-bold text-slate-700">{formatSpomovePresetDuration(preset.durationSec)}</span>
          </div>
        </div>
        <div>
          <h3 className="line-clamp-2 text-[18px] font-bold leading-snug text-slate-950">{preset.title}</h3>
          <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-slate-600">{preset.useCase || preset.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['TV·빔 실행', preset.target, preset.space, ...preset.tags]
              .filter((tag): tag is string => Boolean(tag) && !isPlaceholderText(tag))
              .slice(0, 3)
              .map((tag) => (
              <span key={tag} className="max-w-full whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold leading-none text-slate-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-indigo-600 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </div>
      </div>
    </Link>
  );
}

function SpomovePresetRow({ presets, showPremiumBadges = false }: { presets: SpomoveLaunchPreset[]; showPremiumBadges?: boolean }) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[24px]">TV·빔으로 바로 실행하는 SPOMOVE</h2>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-5 text-slate-500">초·속도·단계를 미리 맞춰둔 공식 실행 세팅으로 현장에서 바로 시작할 수 있습니다.</p>
        </div>
        <Link href="/spokedu-master/spomove" className="shrink-0 text-[13px] font-bold text-indigo-600 transition hover:text-indigo-800">
          실행 세팅 보기
        </Link>
      </div>
      {presets.length === 0 ? (
        <CurationEmptyState message="지금 표시할 공식 SPOMOVE 세팅이 없습니다. 스포무브 화면에서 전체 목록을 확인해 주세요." />
      ) : (
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:gap-5 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {presets.map((preset, index) => (
          <div key={preset.id} className="w-[72vw] min-w-[250px] max-w-[340px] shrink-0 sm:w-[290px] xl:w-[340px]">
            <SpomovePresetCard preset={preset} premiumLabel={showPremiumBadges && index >= 2 ? 'MASTER 실행' : undefined} />
          </div>
        ))}
      </div>
      )}
    </section>
  );
}

function SubscriptionValueSection() {
  return (
    <section className="rounded-[18px] border border-indigo-100 bg-white px-4 py-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[15px] font-black text-slate-950">수업안 · 참고 영상 · SPOMOVE 실행 · 수업 기록까지 한 번에</p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500">MASTER 구독으로 전체 자료와 실행 세팅을 열람하세요.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Link href="/spokedu-master/profile?plans=1" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-[13px] font-black text-white">
            구독 플랜 보기
          </Link>
          <Link href="/spokedu-master/library" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-800">
            샘플 수업 보기
          </Link>
        </div>
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
  const tags = getCardTags(program);
  const rules = detail?.rules?.length ? detail.rules : program.steps;
  const equipment = program.equipment.filter((item) => !isPlaceholderText(item));
  const setupNotes = (detail?.setupNotes ?? []).filter((item) => !isPlaceholderText(item));
  const hasVideo = Boolean(videoEmbedUrl || directVideoUrl || externalVideoUrl);
  const previewFacts = [
    ['대상', detail?.recommendedAge || getProgramGrade(program)],
    ['인원', detail?.recommendedPlayers],
    ['공간', getProgramSpace(program)],
    ['발달 영역', detail?.developmentFocus || getProgramCategory(program)],
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <div className="space-y-4">
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
                    <p className="mt-4 text-base font-black">외부 영상</p>
                    <a href={externalVideoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-slate-950">
                      영상 열기
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
              <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur">
                {hasVideo ? (videoEmbedUrl || directVideoUrl ? '자동 재생' : '영상 링크') : '대표 이미지'}
              </div>
              {videoEmbedUrl || directVideoUrl ? (
                <p className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-lg bg-black/50 px-3 py-2 text-center text-[11px] font-semibold text-white backdrop-blur">
                  브라우저 정책상 음소거로 시작됩니다. 소리는 영상 컨트롤에서 켤 수 있습니다.
                </p>
              ) : null}
            </div>
          </div>
          {previewFacts.length > 0 ? (
            <section className="grid gap-2 sm:grid-cols-2">
              {previewFacts.map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-black tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </section>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <header>
            <p className="text-xs font-black tracking-[0.14em] text-indigo-600">{getProgramCategory(program)}</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">{getProgramTitle(program)}</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{detail?.objective || program.description}</p>
          </header>
          <section className="rounded-[16px] border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-950">수업 자료</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(equipment.length ? equipment.slice(0, 6) : ['도구 정보 아직 없음']).map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                  <span className="h-3.5 w-3.5 shrink-0 border border-slate-400 bg-white" />
                  {item}
                </div>
              ))}
            </div>
            {setupNotes.length > 0 ? (
              <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                {setupNotes.slice(0, 3).map((item) => (
                  <li key={item} className="text-xs font-semibold leading-5 text-slate-500">- {item}</li>
                ))}
              </ul>
            ) : null}
          </section>
          {rules.length > 0 ? (
            <section className="rounded-[16px] border border-slate-200 bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                진행 순서
              </h3>
              <ul className="mt-3 space-y-2">
                {rules.slice(0, 4).map((step, index) => (
                  <li key={`${step}-${index}`} className="grid grid-cols-[22px_1fr] gap-2 text-sm leading-6 text-slate-700">
                    <span className="font-black text-slate-400">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={copyParentNote} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '학부모 문구 복사'}
            </button>
            <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900">
              <BookOpen className="h-4 w-4" />
              라이브러리에서 보기
            </Link>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function DashboardView() {
  const { programs, programsLoaded, favorites, classRecords, reloadPrograms } = useMasterStore();
  const profile = useProfile();
  const isSubscribed = profile?.plan === 'pro' || profile?.plan === 'team' || Boolean(profile?.isAdmin);
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [spomovePresets, setSpomovePresets] = useState<SpomoveLaunchPreset[]>(OFFICIAL_SPOMOVE_PRESETS);

  useEffect(() => {
    setMounted(true);
    void reloadPrograms();
  }, [reloadPrograms]);

  useEffect(() => {
    let alive = true;
    fetch('/api/spokedu-master/spomove-presets')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: SpomoveLaunchPreset[] } | null) => {
        if (!alive || !Array.isArray(json?.data) || json.data.length === 0) return;
        setSpomovePresets(json.data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const programPool = useMemo(
    () => mergeStaticShowcaseForHome(buildProgramPool(programs).sort(compareHomePrograms)),
    [programs],
  );
  const filteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return programPool.filter((program) => {
      const matchesCategory = programMatchesCategory(program, activeCategory);
      const matchesSearch = !query || getSearchText(program).toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, programPool, search]);
  const heroProgram = useMemo(() => pickHeroProgram(filteredPrograms.length ? filteredPrograms : programPool), [filteredPrograms, programPool]);
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
      { label: 'SPOMOVE 세팅', value: spomovePresets.length },
    ],
    [classRecords.length, favorites.length, homeStats.withVideo, programPool.length, spomovePresets.length],
  );
  const curatedRows = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroProgram) usedIds.add(heroProgram.id);

    const weeklySource = filteredPrograms.length ? filteredPrograms : programPool.filter((program) => program.isHot);
    const weekly = takeHomeCuratedPrograms(weeklySource.length ? weeklySource : programPool, usedIds, 4);
    const indoorCandidates = programPool.filter((program) => /실내|체육관|교실|복도|좁은 공간/.test(getSearchText(program)));
    const indoor = takeHomeCuratedPrograms(indoorCandidates.length ? indoorCandidates : programPool, usedIds, 8);

    return {
      weeklyLessons: weekly.map((program) => toVideoItem(program, 'weekly')),
      indoorLessons: indoor.map((program) => toVideoItem(program, 'indoor')),
    };
  }, [filteredPrograms, heroProgram, programPool]);

  const favoriteLessons = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroProgram) usedIds.add(heroProgram.id);
    curatedRows.weeklyLessons.forEach((item) => usedIds.add(item.id));
    curatedRows.indoorLessons.forEach((item) => usedIds.add(item.id));
    const selected = programPool.filter((program) => favorites.includes(program.id) && !usedIds.has(program.id) && isHomeDisplayableProgram(program));
    return takeHomeCuratedPrograms(selected.length ? selected : programPool.filter((p) => favorites.includes(p.id)), usedIds, 8).map((program) =>
      toVideoItem(program, 'weekly'),
    );
  }, [curatedRows.indoorLessons, curatedRows.weeklyLessons, favorites, heroProgram, programPool]);

  const recentLessons = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroProgram) usedIds.add(heroProgram.id);
    curatedRows.weeklyLessons.forEach((item) => usedIds.add(item.id));
    curatedRows.indoorLessons.forEach((item) => usedIds.add(item.id));
    favoriteLessons.forEach((item) => usedIds.add(item.id));

    const programsById = new Map(programPool.map((program) => [program.id, program]));
    const recentPrograms: Program[] = [];

    for (const record of [...classRecords].sort((a, b) => b.date.localeCompare(a.date))) {
      if (recentPrograms.length >= 6) break;
      const program = programsById.get(record.programId);
      if (!program || usedIds.has(program.id)) continue;
      recentPrograms.push(program);
      usedIds.add(program.id);
    }

    return recentPrograms.map((program) => toVideoItem(program, 'weekly'));
  }, [classRecords, curatedRows.indoorLessons, curatedRows.weeklyLessons, favoriteLessons, heroProgram, programPool]);
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

  if (!mounted || !programsLoaded || !heroProgram) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-7 overflow-y-auto bg-[#f5f7fb] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-16">
      <Hero program={heroProgram} kpis={dashboardKpis} onPreview={() => setSelectedProgram(heroProgram)} />
      <CategoryStrip activeCategory={activeCategory} search={search} onCategoryChange={setActiveCategory} onSearchChange={setSearch} />
      <VideoRow
        title="오늘 바로 운영 가능한 수업"
        subtitle="대상, 공간, 교구 조건을 빠르게 확인하고 수업안과 참고 영상까지 바로 열어볼 수 있습니다."
        videos={curatedRows.weeklyLessons}
        onPreview={setSelectedProgram}
        actionLabel="전체 수업 보기"
        emptyMessage="표시할 수업이 없습니다. 놀이체육에서 전체 목록을 확인해 주세요."
        showPremiumBadges={!isSubscribed}
      />
      <ContinueLessonsSection lessons={continueLessons} onPreview={setSelectedProgram} />
      <SpomovePresetRow presets={spomovePresets} showPremiumBadges={!isSubscribed} />
      <VideoRow
        title="좁은 공간에서도 운영 쉬운 수업"
        subtitle="체육관이 없거나 이동이 어려운 날에도 교실, 복도, 제한된 공간에서 안정적으로 운영할 수 있습니다."
        videos={curatedRows.indoorLessons}
        onPreview={setSelectedProgram}
        actionLabel="공간별 수업 보기"
        emptyMessage="실내 필터에 맞는 수업이 없습니다. 카테고리를 바꾸거나 놀이체육 전체에서 찾아보세요."
        showPremiumBadges={!isSubscribed}
      />
      {!isSubscribed ? <SubscriptionValueSection /> : null}
      {selectedProgram ? <HomeProgramPreview program={selectedProgram} onClose={() => setSelectedProgram(null)} /> : null}
    </main>
  );
}
