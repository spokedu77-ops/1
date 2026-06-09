'use client';

import { BookOpen, Clipboard, MonitorPlay, Play, Settings2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CategoryIcon } from '../components/ui/ProgramThumb';
import { LessonPreviewContent } from '../components/lesson/LessonPreviewContent';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { getLessonFunction, getLessonSpace, getLessonTarget, getLessonTheme } from '../lib/lessonDisplay';
import {
  getImageFallbackSrc,
  isRemoteImage,
  normalizeImageSrc,
  programHasPlayableVideo,
  resolveProgramHero,
} from '../lib/program-media';
import { isPaidMasterPlan } from '../lib/subscription';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import {
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

/** 썸네일 우측 상단 — 영상 있을 때는 비우고 좌측 「참고 영상」만 쓴다 */
function getProgramThumbOverlayCue(program: Program) {
  if (programHasPlayableVideo(program)) return null;
  if (hasMasterSpace(program.space, '교실')) return '교실 운영';
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물 간단';
  return '자료 보기';
}

function getCurationReason(program: Program, intent: 'weekly' | 'indoor' = 'weekly') {
  const detail = program.lessonDetail;
  if (intent === 'indoor') {
    if (isPlaceholderText(program.space)) return '실내 수업안';
    return `${formatSpaceBadge(getProgramSpace(program))} 수업`;
  }
  if (detail?.videoUrl && (detail.rules?.length || program.steps.length)) return '추천 수업안';
  if (detail?.developmentFocus && !isInstructionalCopy(detail.developmentFocus)) return formatCompactBadge(detail.developmentFocus.split(/[\/,·]/)[0]?.trim() || '체육 수업');
  if (program.equipment.filter((item) => !isPlaceholderText(item)).length <= 2) return '준비물 간단';
  if (program.isHot) return '추천 수업안';
  return '추천 수업안';
}

function isInstructionalCopy(value: string) {
  return /처음에는|해주세요|주의하세요|탭하면|클릭하면|바로 재생|영상과 순서를 함께 확인|미리보기에서 바로 재생|오늘 바로 준비|설명과 진행 흐름 정리|준비물 적은 수업/.test(value);
}

function splitMetaTokens(value: string) {
  return value
    .split(/[\/,·]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanMetaToken(value?: string | null) {
  const text = cleanText(value ?? undefined, '').trim();
  if (!text || isPlaceholderText(text) || isInstructionalCopy(text)) return '';
  if (/영상 포함|수업안 포함/.test(text)) return '';
  if (text.length > 16) return '';
  return formatCompactBadge(text);
}

function normalizeDashboardTarget(value: string) {
  const tokens = splitMetaTokens(value).map(cleanMetaToken).filter(Boolean);
  const hasPreschool = tokens.some((token) => token.includes('미취학'));
  const hasElementary = tokens.some((token) => token.includes('초등'));
  if (hasPreschool && hasElementary) return '전 연령';
  return tokens[0] ?? '';
}

function getDashboardMetaTokens(program: Program) {
  const theme = cleanMetaToken(getLessonTheme(program));
  const functionTokens = splitMetaTokens(getLessonFunction(program)).map(cleanMetaToken).filter(Boolean);
  const target = cleanMetaToken(normalizeDashboardTarget(getLessonTarget(program)));
  const space = cleanMetaToken(getLessonSpace(program));
  return Array.from(new Set([theme, ...functionTokens, target, space].filter(Boolean))).slice(0, 3);
}

function getCardMetaLine(program: Program) {
  return getDashboardMetaTokens(program).join(' · ');
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

function getHomeSortOrder(program: Program) {
  return program.homeSortOrder ?? 9999;
}

function compareHomePrograms(a: Program, b: Program) {
  const hotDiff = Number(b.isHot) - Number(a.isHot);
  if (hotDiff !== 0) return hotDiff;

  const orderDiff = getHomeSortOrder(a) - getHomeSortOrder(b);
  if (orderDiff !== 0) return orderDiff;

  return (
    Number(isHomeShowcaseProgram(b)) - Number(isHomeShowcaseProgram(a)) ||
    getHomeReadiness(b) - getHomeReadiness(a) ||
    Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
    Number(hasHomeVideo(b)) - Number(hasHomeVideo(a)) ||
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
    reason: getCardMetaLine(program) || getCurationReason(program, intent),
    program,
  };
}

/** 홈 row는 검증된 콘텐츠만 노출한다. 부족한 개수는 억지로 채우지 않는다. */
function takeHomeCuratedPrograms(programs: Program[], usedIds: Set<string>, limit: number) {
  const selected: Program[] = [];
  const sorted = [...programs].sort(compareHomePrograms);

  for (const program of sorted) {
    if (selected.length >= limit) break;
    if (usedIds.has(program.id) || !isHomeDisplayableProgram(program)) continue;
    selected.push(program);
    usedIds.add(program.id);
  }

  return selected;
}

function Hero({
  recommendations,
  isAdmin,
  onPreview,
}: {
  recommendations: VideoItem[];
  isAdmin: boolean;
  onPreview: (program: Program) => void;
}) {
  return (
    <section
      id="weekly-programs"
      className="relative overflow-hidden rounded-[28px] border border-indigo-100/90 bg-white px-5 py-6 shadow-[0_24px_70px_rgba(67,56,202,0.10)] sm:px-7 sm:py-7 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_4%_0%,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_96%_8%,rgba(56,189,248,0.10),transparent_25%),linear-gradient(135deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92)_48%,rgba(238,242,255,0.72))]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent" />

      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
              Weekly Curation
            </p>
            <h1 className="mt-2 text-[24px] font-black tracking-[-0.035em] text-slate-950 sm:text-[30px]">
              이번 주 추천 수업
            </h1>
            <p className="mt-1.5 text-sm font-semibold leading-5 text-slate-600">
              관리자가 선정한 {recommendations.length}개의 수업을 바로 확인하고 운영하세요.
            </p>
          </div>
          {isAdmin ? (
            <Link
              href="/admin/spokedu-master/programs"
              className="inline-flex w-fit items-center gap-1.5 text-[12px] font-black text-indigo-600 transition hover:text-indigo-800"
            >
              <Settings2 className="h-3.5 w-3.5" />
              추천 관리
            </Link>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-indigo-100/80 py-3 text-[11px] font-bold text-slate-500 sm:text-[12px]">
          <span>추천 슬롯 {recommendations.length}개</span>
          <span className="text-indigo-300">·</span>
          <span>수업안/영상 포함</span>
          <span className="text-indigo-300">·</span>
          <span>상황별 수업은 아래에서 탐색</span>
        </div>

        {recommendations.length > 0 ? (
          <div className="-mx-5 mt-5 flex gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:-mx-7 sm:gap-5 sm:px-7 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
            {recommendations.map((item, index) => (
              <div
                key={item.id}
                className="w-[72vw] min-w-[250px] max-w-[340px] shrink-0 sm:w-[290px] xl:w-[340px]"
              >
                <VideoCard
                  item={item}
                  onPreview={onPreview}
                  slotLabel={`추천 ${String(index + 1).padStart(2, '0')}`}
                />
              </div>
            ))}
          </div>
        ) : isAdmin ? (
            <div className="flex min-h-64 items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <div>
                <p className="text-sm font-black text-slate-700">추천 수업을 설정하세요.</p>
                <Link
                  href="/admin/spokedu-master/programs"
                  className="mt-3 inline-flex text-[12px] font-black text-indigo-600"
                >
                  추천 관리 열기
                </Link>
              </div>
            </div>
        ) : null}
      </div>
    </section>
  );
}

function VideoCard({
  item,
  onPreview,
  slotLabel,
}: {
  item: VideoItem;
  onPreview: (program: Program) => void;
  slotLabel?: string;
}) {
  const showPlay = item.hasVideo;
  const space = item.program ? formatSpaceBadge(getProgramSpace(item.program)) : '';
  const primaryBadge = showPlay
    ? '참고 영상'
    : space && !isPlaceholderText(space)
      ? space
      : '';
  const thumbOverlayCue = !showPlay && item.program ? getProgramThumbOverlayCue(item.program) : null;
  const cleanOverlayCue = thumbOverlayCue && !isPlaceholderText(thumbOverlayCue) ? thumbOverlayCue : null;
  return (
    <button type="button" onClick={() => item.program && onPreview(item.program)} className="group block w-full cursor-pointer text-left">
      <div className="relative aspect-[6/5] w-full max-w-[1250px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-all duration-300 group-hover:border-indigo-200 group-hover:shadow-[0_18px_38px_rgba(99,102,241,0.14)]">
        {item.thumbnail ? (
          <CoverImage src={item.thumbnail} alt={item.title} sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" className="object-cover object-[center_38%] transition-transform duration-500 ease-out group-hover:scale-[1.015]" quality={90} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-100 via-slate-50 to-white">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
              {item.program ? <CategoryIcon category={getProgramCategory(item.program)} size={28} /> : <Play className="h-6 w-6" />}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/56 via-slate-950/10 to-transparent" />

        {showPlay ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-indigo-600 shadow-xl ring-4 ring-white/30 backdrop-blur transition-transform duration-300 group-hover:scale-105">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </div>
          </div>
        ) : null}

        {primaryBadge ? (
          <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black shadow-md backdrop-blur ${
            showPlay ? 'bg-indigo-600 text-white' : 'bg-white/90 text-slate-800'
          }`}>
            {primaryBadge}
          </div>
        ) : null}

        {slotLabel ? (
          <span className="absolute right-3 top-3 rounded-full border border-white/45 bg-white/92 px-2.5 py-1 text-[10px] font-black tracking-[0.04em] text-indigo-700 shadow-md backdrop-blur">
            {slotLabel}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/82 via-slate-950/44 to-transparent px-3 pb-2.5 pt-7">
          <h3 className="line-clamp-2 text-[15px] font-black leading-[1.18] text-white sm:text-[16px]">{item.title}</h3>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold leading-4 text-white/75">{item.reason}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            {cleanOverlayCue && !primaryBadge ? (
              <span className="min-w-0 truncate text-[11px] font-bold text-white/60">{cleanOverlayCue}</span>
            ) : (
              <span className="min-w-0" />
            )}
            <span className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full px-3 text-[12px] font-black ${
              item.hasVideo ? 'bg-white text-slate-950 shadow-[0_8px_18px_rgba(0,0,0,0.18)]' : 'bg-white/14 text-white ring-1 ring-white/24'
            }`}>
              {item.hasVideo ? '영상 미리보기' : '수업 미리보기'}
            </span>
          </div>
        </div>
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
  id,
  title,
  subtitle,
  eyebrow,
  videos,
  onPreview,
  actionHref = '/spokedu-master/library',
  actionLabel = '놀이체육 보기',
  emptyMessage,
}: {
  id?: string;
  title: string;
  subtitle: string;
  eyebrow?: string;
  videos: VideoItem[];
  onPreview: (program: Program) => void;
  actionHref?: string;
  actionLabel?: string;
  emptyMessage?: string;
}) {
  if (videos.length === 0 && !emptyMessage) return null;

  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-500">{eyebrow}</p> : null}
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[24px]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-slate-500">{subtitle}</p>
        </div>
        {videos.length > 0 ? (
          <Link href={actionHref} className="shrink-0 text-[13px] font-bold text-indigo-600 transition hover:text-indigo-800">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {videos.length === 0 && emptyMessage ? (
        <CurationEmptyState message={emptyMessage} />
      ) : null}
      {videos.length > 0 ? (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:gap-5 sm:px-6 sm:pb-0 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
          {videos.map((item) => (
            <div key={item.id} className="w-[72vw] min-w-[250px] max-w-[340px] shrink-0 sm:w-[290px] xl:w-[340px]">
              <VideoCard item={item} onPreview={onPreview} />
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
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[18px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[20px]">내 수업 이어하기</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">최근 기록과 저장한 수업을 빠르게 다시 열 수 있습니다.</p>
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
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 sm:pb-0 [&::-webkit-scrollbar]:hidden">
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
    <section id="spomove" className="-mx-4 scroll-mt-24 bg-indigo-50 px-4 py-5 sm:-mx-6 sm:px-6 sm:py-6 lg:-mx-8 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">SPOMOVE</p>
          <h2 className="text-[21px] font-bold tracking-[-0.01em] text-slate-950 sm:text-[24px]">큰 화면으로 움직이는 SPOMOVE</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-indigo-800/60">TV·빔에서 바로 실행하는 스크린 기반 신체활동입니다.</p>
        </div>
        <Link href="/spokedu-master/spomove" className="shrink-0 text-[13px] font-bold text-indigo-600 transition hover:text-indigo-800">
          전체 프로그램 보기
        </Link>
      </div>
      {presets.length === 0 ? (
        <CurationEmptyState message="지금 표시할 공식 SPOMOVE 세팅이 없습니다. 스포무브 화면에서 전체 목록을 확인해 주세요." />
      ) : (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:gap-5 sm:px-6 sm:pb-0 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
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
    <section className="rounded-[20px] border border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
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
    <section className="rounded-[20px] border border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
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
      <LessonPreviewContent
        program={program}
        footer={
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
          }
        />
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
  const curatedRows = useMemo(() => {
    const weekly = programPool
      .filter((program) => {
        const order = getHomeSortOrder(program);
        return program.isHot && order >= 1 && order <= 4 && isHomeDisplayableProgram(program);
      })
      .sort((a, b) => getHomeSortOrder(a) - getHomeSortOrder(b))
      .slice(0, 4);
    const classroom = takeHomeCuratedPrograms(
      programPool.filter((program) => {
        const spaces = parseMasterSpaces(getLessonSpace(program));
        return spaces.includes('교실') && hasMasterSpace(getLessonSpace(program), '교실');
      }),
      new Set<string>(),
      8,
    );
    const preschool = takeHomeCuratedPrograms(
      programPool.filter((program) =>
        parseMasterTargets(getLessonTarget(program)).some((target) => target.includes('미취학')),
      ),
      new Set<string>(),
      8,
    );

    return {
      weeklyLessons: weekly.map((program) => toVideoItem(program, 'weekly')),
      classroomLessons: classroom.map((program) => toVideoItem(program, 'indoor')),
      preschoolLessons: preschool.map((program) => toVideoItem(program, 'weekly')),
    };
  }, [programPool]);

  const favoriteLessons = useMemo(() => {
    const usedIds = new Set<string>();
    curatedRows.weeklyLessons.forEach((item) => usedIds.add(item.id));
    const selected = programPool.filter((program) => favorites.includes(program.id) && !usedIds.has(program.id) && isHomeDisplayableProgram(program));
    return takeHomeCuratedPrograms(selected, usedIds, 8).map((program) =>
      toVideoItem(program, 'weekly'),
    );
  }, [curatedRows.weeklyLessons, favorites, programPool]);

  const recentLessons = useMemo(() => {
    const usedIds = new Set<string>();
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
  }, [classRecords, curatedRows.weeklyLessons, favoriteLessons, programPool]);
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

  if (programPool.length === 0) {
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

  const supportProgram = curatedRows.weeklyLessons[0]?.program ?? programPool[0];

  return (
    <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 overflow-y-auto bg-[#f5f7fb] px-4 pb-28 pt-4 sm:gap-8 sm:px-6 sm:pt-5 lg:px-8 lg:pb-16">
      <Hero
        recommendations={curatedRows.weeklyLessons}
        isAdmin={Boolean(profile?.isAdmin)}
        onPreview={setSelectedProgram}
      />
      <SpomoveOfficialRow presets={OFFICIAL_SPOMOVE_LIBRARY} />
      <VideoRow
        id="classroom-programs"
        eyebrow="SPACE"
        title="교실에서 할 수 있는 프로그램"
        subtitle="넓은 체육관이 없어도 교실과 실내 공간에서 운영하기 좋은 수업입니다."
        videos={curatedRows.classroomLessons}
        onPreview={setSelectedProgram}
        actionLabel="전체 수업 보기"
      />
      <VideoRow
        id="preschool-programs"
        eyebrow="TARGET"
        title="미취학 아동이 할 수 있는 프로그램"
        subtitle="유아와 저연령 아동도 참여할 수 있도록 난이도와 활동 흐름을 고려한 수업입니다."
        videos={curatedRows.preschoolLessons}
        onPreview={setSelectedProgram}
        actionLabel="전체 수업 보기"
      />
      <ContinueLessonsSection lessons={continueLessons} onPreview={setSelectedProgram} />
      <ExplanationToolEntry program={supportProgram} />
      {!isSubscribed ? <SubscriptionValueSection /> : null}
      {selectedProgram ? <HomeProgramPreview program={selectedProgram} onClose={() => setSelectedProgram(null)} /> : null}
    </main>
  );
}
