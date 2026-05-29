'use client';

import { BookOpen, Clipboard, MonitorPlay, Play, Search, Sparkles, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CategoryIcon } from '../components/ui/ProgramThumb';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
import { OFFICIAL_SPOMOVE_PRESETS, formatSpomovePresetDuration, spomovePresetHref } from '../lib/spomovePresets';
import { useMasterStore } from '../store';
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

function isPlaceholderText(value: string | undefined) {
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

function getYouTubeId(url?: string) {
  if (!url) return undefined;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1];
}

function getVideoThumbnail(url?: string) {
  const youtubeId = getYouTubeId(url);
  return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : undefined;
}

function getVideoEmbedUrl(url?: string) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=0&playsinline=1&rel=0&modestbranding=1`;
  return undefined;
}

function isDirectVideoUrl(url?: string) {
  return Boolean(url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url));
}

function getExternalVideoUrl(url?: string) {
  const text = (url ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return undefined;
  if (getVideoEmbedUrl(text) || isDirectVideoUrl(text)) return undefined;
  return text;
}

function getHeroImage(program: Program | undefined) {
  return program?.lessonDetail?.heroImageUrl || program?.thumbnailUrl || getVideoThumbnail(program?.lessonDetail?.videoUrl);
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

function normalizeImageSrc(src: string) {
  if (!src.includes('img.youtube.com')) return src;
  return src
    .replace('/mqdefault.jpg', '/maxresdefault.jpg')
    .replace('/hqdefault.jpg', '/maxresdefault.jpg')
    .replace('/default.jpg', '/maxresdefault.jpg');
}

function getImageFallbackSrc(src: string) {
  if (!src.includes('img.youtube.com') || !src.includes('/maxresdefault.jpg')) return undefined;
  return src.replace('/maxresdefault.jpg', '/hqdefault.jpg');
}

function isRemoteImage(src: string) {
  return /^https?:\/\//.test(src);
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
    ...(program.lessonDetail?.videoUrl ? ['영상 확인'] : []),
  ]
    .filter(Boolean)
    .filter((item) => !isPlaceholderText(item));
  return Array.from(new Set(tags)).slice(0, 5);
}

function getProgramCue(program: Program) {
  if (program.lessonDetail?.videoUrl) return '영상 보고 준비';
  if (/실내|체육관|교실|복도|좁은 공간/.test(getSearchText(program))) return '공간 부담 적음';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물 간단';
  return '수업안 확인';
}

function getCurationReason(program: Program, intent: 'weekly' | 'indoor' = 'weekly') {
  const detail = program.lessonDetail;
  if (intent === 'indoor') {
    if (isPlaceholderText(program.space)) return '좁은 공간 운영에 맞춰 확인';
    return `${getProgramSpace(program)} 운영에 맞춰 확인`;
  }
  if (detail?.videoUrl && (detail.rules?.length || program.steps.length)) return '영상과 진행 순서를 함께 확인';
  if (detail?.objective && detail?.developmentFocus) return '목표와 발달 초점이 정리된 수업';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물이 적어 바로 시작 좋음';
  if (program.isHot) return '현장 활용도가 높은 대표 수업';
  return '오늘 수업 준비용으로 먼저 확인';
}

function CompactTagList({ tags, max = 3, className = '' }: { tags: string[]; max?: number; className?: string }) {
  const visibleTags = tags.slice(0, max);
  const hiddenCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      {visibleTags.map((tag) => (
        <span key={tag} className="max-w-full shrink-0 whitespace-nowrap rounded-md border border-white/16 bg-white/10 px-2 py-1 text-[11px] font-semibold leading-none text-white/85 backdrop-blur-sm">
          {tag}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="shrink-0 whitespace-nowrap rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-semibold leading-none text-zinc-300">
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
  if (category === '영상') return Boolean(program.lessonDetail?.videoUrl);
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

function compareHomePrograms(a: Program, b: Program) {
  return (
    Number(isHomeShowcaseProgram(b)) - Number(isHomeShowcaseProgram(a)) ||
    Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
    Number(Boolean(b.lessonDetail?.videoUrl)) - Number(Boolean(a.lessonDetail?.videoUrl)) ||
    Number(b.isHot) - Number(a.isHot) ||
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
    hasVideo: Boolean(program.lessonDetail?.videoUrl),
    tags: getCardTags(program),
    reason: getCurationReason(program, intent),
    program,
  };
}

function pickHeroProgram(programs: Program[]) {
  const sorted = [...buildProgramPool(programs)].sort(compareHomePrograms);
  return sorted.find(isHomeShowcaseProgram) ?? sorted[0];
}

function takeUniquePrograms(programs: Program[], usedIds: Set<string>, limit: number, strict = false) {
  const selected: Program[] = [];
  const addProgram = (program: Program) => {
    if (usedIds.has(program.id)) return false;
    selected.push(program);
    usedIds.add(program.id);
    return true;
  };

  for (const program of programs) {
    if (!isHomeShowcaseProgram(program)) continue;
    addProgram(program);
    if (selected.length >= limit) return selected;
  }

  if (strict) return selected;

  for (const program of programs) {
    if (!isHomeDisplayableProgram(program)) continue;
    addProgram(program);
    if (selected.length >= limit) return selected;
  }

  for (const program of programs) {
    addProgram(program);
    if (selected.length >= limit) return selected;
  }

  return selected;
}

function Hero({ program, onPreview }: { program: Program; onPreview: () => void }) {
  const heroImage = getHeroImage(program);
  const tags = getProgramTags(program);

  return (
    <section className="relative h-[56vh] min-h-[390px] overflow-hidden sm:h-[58vh] sm:min-h-[470px]">
      <div className="absolute inset-0">
        {heroImage ? (
          <CoverImage src={heroImage} alt={getProgramTitle(program)} sizes="(min-width: 1024px) 1200px, 100vw" className="scale-105 object-cover" priority quality={92} />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(139,92,246,0.26),transparent_34%),linear-gradient(135deg,#09090b,#18181b_55%,#020617)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/64 via-[#0a0a0a]/12 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.06)_100%)]" />
      </div>

      <div className="relative flex h-full items-end px-5 pb-16 sm:px-8 sm:pb-22 lg:px-10">
        <div className="max-w-3xl space-y-4 sm:space-y-5">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-gradient-to-r from-white/[0.12] to-white/[0.08] px-4 py-2 shadow-xl backdrop-blur-xl">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            <Sparkles className="h-[15px] w-[15px] text-violet-300" />
            <span className="text-[13px] font-medium tracking-wide text-white">이번 주 대표 수업안</span>
          </div>

          <h1 className="text-[34px] font-bold leading-[1.08] text-white sm:text-6xl xl:text-7xl">
            {getProgramTitle(program)}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] sm:gap-4 sm:text-[15px]">
            <div className="flex items-center gap-1.5">
              <Star className="h-[15px] w-[15px] fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-white">SPOKEDU 추천</span>
            </div>
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-zinc-300">
                <span className="mr-4 text-zinc-500">·</span>
                {tag}
              </span>
            ))}
          </div>

          <p className="max-w-xl text-[14px] leading-relaxed text-zinc-300 sm:text-[17px]">
            {displayText(program.lessonDetail?.objective || program.description, '수업 흐름과 참고 자료를 확인할 수 있습니다.')}
          </p>

          <div className="flex flex-col gap-2 pt-1 min-[420px]:flex-row sm:gap-4 sm:pt-2">
            <button type="button" onClick={onPreview} className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-[14px] font-semibold text-black shadow-2xl transition hover:scale-[1.02] hover:bg-zinc-100 hover:shadow-white/20 active:scale-[0.98] sm:px-8 sm:py-4 sm:text-[15px]">
              <Play className="h-5 w-5 fill-black transition-transform group-hover:scale-110" />
              빠른 미리보기
            </button>
            <Link href="/spokedu-master/library" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.12] px-5 py-3 text-[14px] font-semibold text-white shadow-xl backdrop-blur-xl transition hover:scale-[1.02] hover:border-white/30 hover:bg-white/20 active:scale-[0.98] sm:px-8 sm:py-4 sm:text-[15px]">
              놀이체육 보기
            </Link>
          </div>
        </div>
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
    <section className="relative z-10 -mt-10 mb-7 px-5 sm:-mt-14 sm:mb-9 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="-mx-5 flex min-w-0 gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-[13px] font-semibold transition-all sm:px-6 sm:text-[14px] ${
                activeCategory === category
                  ? 'scale-105 bg-white text-black shadow-2xl shadow-white/20'
                  : 'border border-white/[0.08] bg-white/[0.06] text-zinc-400 hover:scale-105 hover:border-white/20 hover:bg-white/[0.12] hover:text-white active:scale-95'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <label className="relative block w-full max-w-[420px] shrink-0">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="수업명, 교구, 발달 초점 검색"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.06] py-3 pl-12 pr-4 text-[15px] text-white transition-all placeholder:text-zinc-500 focus:border-white/20 focus:bg-white/[0.1] focus:outline-none"
          />
        </label>
      </div>
    </section>
  );
}

function VideoCard({ item, onPreview }: { item: VideoItem; onPreview: (program: Program) => void }) {
  return (
    <button type="button" onClick={() => item.program && onPreview(item.program)} className="group block w-full cursor-pointer text-left">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.05] transition-all duration-500 group-hover:ring-white/20">
        {item.thumbnail ? (
          <CoverImage src={item.thumbnail} alt={item.title} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-all duration-700 ease-out group-hover:scale-110" quality={90} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-zinc-900">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.08] text-zinc-300 ring-1 ring-white/10">
              {item.program ? <CategoryIcon category={getProgramCategory(item.program)} size={30} /> : <Play className="h-7 w-7" />}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/0 via-transparent to-fuchsia-600/0 transition-all duration-700 group-hover:from-violet-600/10 group-hover:to-fuchsia-600/10" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100">
          <div className="relative">
            <div className="absolute inset-0 scale-150 rounded-full bg-white/20 blur-xl" />
            <div className="relative flex h-16 w-16 scale-75 items-center justify-center rounded-full bg-white/95 shadow-2xl ring-2 ring-white/20 backdrop-blur-md transition-transform duration-500 group-hover:scale-100">
              <Play className="ml-1 h-7 w-7 fill-black text-black" />
            </div>
          </div>
        </div>

        <div className="absolute right-3 top-3 rounded-lg border border-white/10 bg-black/80 px-3 py-1.5 text-[13px] font-medium text-white opacity-90 shadow-xl backdrop-blur-xl transition-opacity group-hover:opacity-100">
          {item.program ? getProgramCue(item.program) : item.meta}
        </div>

        <div className="absolute bottom-0 left-0 right-0 translate-y-2 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <CompactTagList tags={item.tags} max={4} />
        </div>
      </div>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-semibold leading-snug text-white transition-colors duration-300 group-hover:text-zinc-200">
        {item.title}
      </h3>
      <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-zinc-500 transition group-hover:text-zinc-300">
        {item.reason}
      </p>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
        <CompactTagList tags={item.tags} max={2} />
        <span className="shrink-0 text-[12px] font-bold text-zinc-400 transition group-hover:text-white">미리보기</span>
      </div>
    </button>
  );
}

function VideoRow({
  title,
  subtitle,
  videos,
  onPreview,
  actionHref = '/spokedu-master/library',
  actionLabel = '놀이체육 보기',
}: {
  title: string;
  subtitle: string;
  videos: VideoItem[];
  onPreview: (program: Program) => void;
  actionHref?: string;
  actionLabel?: string;
}) {
  if (videos.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-white sm:text-[24px]">{title}</h2>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-5 text-zinc-400">{subtitle}</p>
        </div>
        <Link href={actionHref} className="shrink-0 text-[13px] font-bold text-zinc-300 transition hover:text-white">
          {actionLabel}
        </Link>
      </div>
      <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:gap-5 sm:px-8 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden">
        {videos.map((item) => (
          <div key={item.id} className="w-[72vw] min-w-[250px] max-w-[340px] shrink-0 sm:w-[290px] xl:w-[340px]">
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

function SpomovePresetCard({ preset }: { preset: SpomoveLaunchPreset }) {
  return (
    <Link href={spomovePresetHref(preset)} className="group block cursor-pointer">
      <div className="relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[radial-gradient(circle_at_78%_18%,rgba(79,70,229,0.42),transparent_32%),linear-gradient(135deg,#101014,#18181b_56%,#050505)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_22px_54px_rgba(99,102,241,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black shadow-xl">
            <MonitorPlay className="h-5 w-5" />
          </span>
          <span className="rounded-lg border border-white/10 bg-black/45 px-3 py-1.5 text-[12px] font-semibold text-white/90 backdrop-blur">
            {formatSpomovePresetDuration(preset.durationSec)}
          </span>
        </div>
        <div>
          <h3 className="line-clamp-2 text-[18px] font-bold leading-snug text-white">{preset.title}</h3>
          <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-zinc-400">{preset.useCase || preset.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[preset.target, preset.space, ...preset.tags].filter((tag): tag is string => Boolean(tag)).slice(0, 3).map((tag) => (
              <span key={tag} className="max-w-full whitespace-nowrap rounded-md border border-white/12 bg-white/[0.08] px-2 py-1 text-[11px] font-bold leading-none text-white/78">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-white/[0.04]" />
          <div className="absolute bottom-4 right-4 grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-2xl">
            <Play className="ml-0.5 h-5 w-5 fill-black" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function SpomovePresetRow({ presets }: { presets: SpomoveLaunchPreset[] }) {
  if (presets.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-white sm:text-[24px]">스포무브 바로 실행</h2>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-5 text-zinc-400">TV나 빔에 띄우기 전에 초, 속도, 단계를 확인한 공식 세팅입니다.</p>
        </div>
        <Link href="/spokedu-master/spomove" className="shrink-0 text-[13px] font-bold text-zinc-300 transition hover:text-white">
          스포무브 보기
        </Link>
      </div>
      <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:gap-5 sm:px-8 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden">
        {presets.map((preset) => (
          <div key={preset.id} className="w-[72vw] min-w-[250px] max-w-[340px] shrink-0 sm:w-[290px] xl:w-[340px]">
            <SpomovePresetCard preset={preset} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeProgramPreview({ program, onClose }: { program: Program; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const detail = program.lessonDetail;
  const heroImage = getHeroImage(program);
  const videoEmbedUrl = getVideoEmbedUrl(detail?.videoUrl);
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(detail?.videoUrl) ? detail?.videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(detail?.videoUrl) : undefined;
  const tags = getCardTags(program);
  const rules = detail?.rules?.length ? detail.rules : program.steps;
  const equipment = program.equipment.filter((item) => !isPlaceholderText(item));
  const setupNotes = (detail?.setupNotes ?? []).filter((item) => !isPlaceholderText(item));
  const hasVideo = Boolean(videoEmbedUrl || directVideoUrl || externalVideoUrl);
  const previewFacts = [
    ['대상', detail?.recommendedAge || getProgramGrade(program)],
    ['인원', detail?.recommendedPlayers],
    ['공간', getProgramSpace(program)],
    ['초점', detail?.developmentFocus || getProgramCategory(program)],
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
                <iframe src={videoEmbedUrl} title={`${getProgramTitle(program)} 영상 확인`} className="h-full w-full" allow="fullscreen; picture-in-picture" allowFullScreen />
              ) : directVideoUrl ? (
                <video src={directVideoUrl} className="h-full w-full object-cover" controls playsInline />
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
                {hasVideo ? '영상 확인' : '대표 이미지'}
              </div>
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
            <h3 className="text-sm font-black text-slate-950">수업안 확인</h3>
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
              수업안 열기
            </Link>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function DashboardView() {
  const { programs, programsLoaded } = useMasterStore();
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [spomovePresets, setSpomovePresets] = useState<SpomoveLaunchPreset[]>(OFFICIAL_SPOMOVE_PRESETS);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const programPool = useMemo(() => buildProgramPool(programs).sort(compareHomePrograms), [programs]);
  const filteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return programPool.filter((program) => {
      const matchesCategory = programMatchesCategory(program, activeCategory);
      const matchesSearch = !query || getSearchText(program).toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, programPool, search]);
  const heroProgram = useMemo(() => pickHeroProgram(filteredPrograms.length ? filteredPrograms : programPool), [filteredPrograms, programPool]);
  const curatedRows = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroProgram) usedIds.add(heroProgram.id);

    const weekly = takeUniquePrograms(filteredPrograms, usedIds, 4, true);
    const indoorCandidates = programPool.filter((program) => /실내|체육관|교실|복도|좁은 공간/.test(getSearchText(program)));
    const indoor = takeUniquePrograms(indoorCandidates.length ? indoorCandidates : programPool, usedIds, 8, true);

    return {
      weeklyLessons: weekly.map((program) => toVideoItem(program, 'weekly')),
      indoorLessons: indoor.map((program) => toVideoItem(program, 'indoor')),
    };
  }, [filteredPrograms, heroProgram, programPool]);

  if (!mounted || !programsLoaded || !heroProgram) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="h-full overflow-y-auto bg-[#0a0a0a]">
      <Hero program={heroProgram} onPreview={() => setSelectedProgram(heroProgram)} />
      <CategoryStrip activeCategory={activeCategory} search={search} onCategoryChange={setActiveCategory} onSearchChange={setSearch} />
      <div className="space-y-6 px-5 pb-28 sm:space-y-8 sm:px-8 sm:pb-24 lg:px-10 lg:pb-16">
        <VideoRow title="금주 추천 수업안" subtitle="영상과 진행 순서가 갖춰진 수업부터 먼저 골랐습니다." videos={curatedRows.weeklyLessons} onPreview={setSelectedProgram} actionLabel="놀이체육 보기" />
        <VideoRow title="실내 수업 큐레이션" subtitle="체육관, 교실, 좁은 공간에서 운영 부담이 낮은 수업입니다." videos={curatedRows.indoorLessons} onPreview={setSelectedProgram} actionLabel="더 찾아보기" />
        <SpomovePresetRow presets={spomovePresets} />
      </div>
      <div className="h-8 bg-gradient-to-t from-black to-transparent sm:h-12" />
      {selectedProgram ? <HomeProgramPreview program={selectedProgram} onClose={() => setSelectedProgram(null)} /> : null}
    </main>
  );
}
