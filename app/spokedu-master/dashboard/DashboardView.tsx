'use client';

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  MonitorPlay,
  Play,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveThumbnailMap,
  SPOMOVE_THUMBNAIL_PACK_ID,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { ProgramPreviewModal } from '../components/lesson/ProgramPreviewModal';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { buildLessonDisplayModel } from '../lib/lessonDisplayModel';
import {
  getImageFallbackSrc,
  isRemoteImage,
  normalizeImageSrc,
  programHasPlayableVideo,
  resolveProgramHero,
} from '../lib/program-media';
import {
  getProgramHomeReadiness,
  isProgramHomeRecommendationEligible,
} from '../lib/program-meta';
import { isMasterFirstUser, selectMasterLoopAction } from '../lib/masterUserLoop';
import {
  buildProgramResumeHref,
  getRecentActivityOwnerId,
  reconcileRecentProgramActivities,
  reconcileRecentSpomoveActivities,
  selectLatestProgramResume,
  selectRecentSpomoveActivity,
  type RecentProgramActivity,
} from '../lib/recentProgramActivity';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { SPOMOVE_PAD_GRID_HEX } from '../spomove/spomovePadDisplay';
import { parseMasterSpaces, parseMasterTargets } from '../lib/programDisplayTags';
import { selectWeeklyRecommendationSlots } from '../lib/weeklyRecommendations';
import { canUseSpomove } from '../lib/subscription';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { useExplanationData } from '../explanations/ExplanationDataProvider';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useIsPremium, useMasterStore, useProfile } from '../store';
import type { ClassRecord, Program, UserProfile } from '../types';

type ContinueItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  action: string;
  time?: string;
  href: string;
};

type SpomoveThumbnailPackQueryResult = {
  data: { assets_json?: unknown; updated_at?: string | null } | null;
  error: { code?: string } | null;
};

function getFirstStartSteps(profile: UserProfile | null) {
  const spomoveAvailable = canUseSpomove(profile);
  return [
  {
    title: '오늘 수업 고르기',
    href: '/spokedu-master/library',
    Icon: BookOpen,
  },
  {
    title: spomoveAvailable ? 'SPOMOVE 실행하기' : '프리미엄 SPOMOVE 보기',
    href: spomoveAvailable ? '/spokedu-master/spomove' : '/spokedu-master/payment?plan=premium',
    Icon: MonitorPlay,
  },
  {
    title: '기록·안내문 완성',
    href: '/spokedu-master/class-record',
    Icon: FileText,
  },
  ] as const;
}

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

function getHeroImage(program: Program) {
  return resolveProgramHero(program);
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

function getHomeSortOrder(program: Program) {
  return program.homeSortOrder ?? 9999;
}

function compareHomePrograms(a: Program, b: Program) {
  return (
    Number(b.isHot) - Number(a.isHot) ||
    getHomeSortOrder(a) - getHomeSortOrder(b) ||
    getProgramHomeReadiness(b) - getProgramHomeReadiness(a) ||
    Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
    Number(programHasPlayableVideo(b)) - Number(programHasPlayableVideo(a)) ||
    Number(b.isNew) - Number(a.isNew)
  );
}

function selectFeaturedSpomove() {
  const ready = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.isReady);
  const selected: OfficialSpomovePreset[] = [];
  const axes = new Set<string>();
  const groups = new Set<string>();

  for (const preset of ready) {
    if (selected.length >= 3) break;
    if (axes.has(preset.axis)) continue;
    selected.push(preset);
    axes.add(preset.axis);
    groups.add(preset.programGroup);
  }
  for (const preset of ready) {
    if (selected.length >= 4) break;
    if (groups.has(preset.programGroup)) continue;
    selected.push(preset);
    groups.add(preset.programGroup);
  }
  for (const preset of ready) {
    if (selected.length >= 4) break;
    if (!selected.some((item) => item.id === preset.id)) selected.push(preset);
  }
  return selected;
}

function resolveSpomoveThumbnailUrl(path: string | null | undefined, cacheBust?: number) {
  if (!path) return '';
  try {
    return withPublicUrlCacheBust(getPublicUrl(path), cacheBust);
  } catch {
    return '';
  }
}

type ContextProgramTab = 'classroom' | 'preschool';

const CONTEXT_PROGRAM_TABS: Array<{ key: ContextProgramTab; label: string }> = [
  { key: 'classroom', label: '교실 체육' },
  { key: 'preschool', label: '미취학 체육' },
];

const isClassroomProgram = (program: Program) =>
  parseMasterSpaces(program.space).includes('교실');

const isPreschoolProgram = (program: Program) => {
  const target =
    program.lessonDetail?.recommendedAge ||
    program.grade ||
    '';

  return parseMasterTargets(target).includes('미취학');
};

function matchesContextTab(program: Program, tab: ContextProgramTab) {
  return tab === 'classroom'
    ? isClassroomProgram(program)
    : isPreschoolProgram(program);
}

function compareContextPrograms(a: Program, b: Program) {
  return (
    Number(isProgramHomeRecommendationEligible(b)) - Number(isProgramHomeRecommendationEligible(a)) ||
    Number(b.isHot) - Number(a.isHot) ||
    getHomeSortOrder(a) - getHomeSortOrder(b) ||
    getProgramHomeReadiness(b) - getProgramHomeReadiness(a) ||
    Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
    Number(programHasPlayableVideo(b)) - Number(programHasPlayableVideo(a)) ||
    Number(b.isNew) - Number(a.isNew)
  );
}

function selectContextPrograms(programs: Program[], tab: ContextProgramTab, weeklyIds: Set<string>) {
  const selected: Program[] = [];
  const usedIds = new Set<string>();
  const usedTitles = new Set<string>();
  const matched = programs.filter((program) => matchesContextTab(program, tab));
  const tiers = [
    matched.filter((program) => !weeklyIds.has(program.id)).sort(compareContextPrograms),
    matched.filter((program) => weeklyIds.has(program.id)).sort(compareContextPrograms),
  ];

  for (const tier of tiers) {
    for (const program of tier) {
      if (selected.length >= 4) return selected;
      const titleKey = normalizeTitle(getProgramTitle(program));
      if (!titleKey || usedIds.has(program.id) || usedTitles.has(titleKey)) continue;
      selected.push(program);
      usedIds.add(program.id);
      usedTitles.add(titleKey);
    }
  }
  return selected;
}

function formatRelativeDate(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '최근';
  const diffMs = Date.now() - time;
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) return '방금';
  const diffDays = Math.floor((Date.now() - time) / 86_400_000);
  if (diffDays <= 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(time));
}

function CoverImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  priority?: boolean;
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

  return <Image src={imageSrc} alt={alt} fill sizes={sizes} className={className} priority={priority} />;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="mb-1 text-[11px] font-black uppercase tracking-[0.15em] text-indigo-600">{eyebrow}</p> : null}
        <h2 className="text-[20px] font-black tracking-[-0.025em] text-slate-950 sm:text-[23px]">{title}</h2>
        {description ? <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500 sm:text-sm">{description}</p> : null}
      </div>
      {href && action ? (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-black text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
          {action}
          <ArrowRight size={15} />
        </Link>
      ) : null}
    </div>
  );
}

function WeeklyProgramCard({
  program,
  cornerLabel,
  onPreview,
  scope = 'weekly',
  priority = false,
}: {
  program: Program;
  cornerLabel: string;
  onPreview: (program: Program) => void;
  scope?: 'weekly' | 'context';
  priority?: boolean;
}) {
  const model = buildLessonDisplayModel(program);
  const image = model.heroImageUrl;
  const meta = [model.theme, model.target, model.space].filter(Boolean).slice(0, 3);
  const hasVideo = programHasPlayableVideo(program);

  return (
    <article
      data-weekly-program={scope === 'weekly' ? program.id : undefined}
      data-context-program={scope === 'context' ? program.id : undefined}
      className="flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.07)]"
    >
      <div data-card-media className="group relative h-[calc(83.333333cqw+32px)] w-full overflow-hidden bg-slate-100 lg:h-[calc(83.333333cqw+42px)]">
        <button
          type="button"
          onClick={() => onPreview(program)}
          className="absolute inset-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-indigo-500"
          aria-label={`${model.title} 미리보기`}
        >
          {image ? (
            <CoverImage src={image} alt={model.title} sizes="(min-width: 1280px) 290px, (min-width: 768px) 45vw, 82vw" className="object-cover object-[center_38%] transition-transform duration-300 group-hover:scale-[1.01]" priority={priority} />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-100 to-slate-50">
              <CategoryIcon category={model.theme || '체육 수업'} size={30} />
            </div>
          )}
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-white/92 px-2.5 py-1 text-[10px] font-black tracking-[0.06em] text-indigo-700">
          {cornerLabel}
        </span>
        {hasVideo ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-indigo-600 text-white shadow-[0_6px_16px_rgba(49,46,129,0.22)] ring-2 ring-white/70"
          >
            <Play className="h-4 w-4 fill-current" />
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="line-clamp-2 text-[16px] font-black leading-5 text-white">{model.title}</h3>
          {meta.length > 0 ? (
            <p className="mt-1 truncate text-[11px] font-bold text-white/85 sm:text-[12px]">{meta.join(' · ')}</p>
          ) : null}
        </div>
      </div>
      <div data-card-footer className="flex h-16 items-center px-2.5 py-2 lg:h-[54px]">
        <div data-card-actions className="flex w-full items-center gap-1.5">
          <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-indigo-600 px-3 text-[13px] font-black text-white transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 lg:h-9">
            수업 자료
          </Link>
        </div>
      </div>
    </article>
  );
}

function ContinueSection({ item }: { item: ContinueItem }) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <SectionHeader title="최근 사용" description="최근 열어본 수업과 SPOMOVE를 빠르게 다시 확인합니다." />
      <Link
        data-continue-item={item.id}
        href={item.href}
        className="flex min-h-[82px] items-center gap-3 rounded-[14px] border border-slate-100 bg-slate-50 px-3 py-2 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-indigo-600 shadow-sm">
          {item.type === 'SPOMOVE' ? <MonitorPlay size={18} /> : <BookOpen size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-black text-indigo-600">{item.type}</span>
          <span className="mt-0.5 block truncate text-[13px] font-black text-slate-900">{item.title}</span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{item.status}</span>
        </span>
        <span className="shrink-0 text-right">
          {item.time ? <span className="block text-[11px] font-bold text-slate-400">{item.time}</span> : null}
          <span className="mt-1 block text-[11px] font-black text-indigo-600">{item.action}</span>
        </span>
      </Link>
    </section>
  );
}

function FirstStartGuide({ profile }: { profile: UserProfile | null }) {
  const firstStartSteps = getFirstStartSteps(profile);
  const spomoveAvailable = canUseSpomove(profile);
  return (
    <section
      data-dashboard-section="first-start"
      aria-labelledby="first-start-heading"
      className="rounded-[20px] border border-indigo-100 bg-indigo-50/60 p-4 shadow-[0_8px_24px_rgba(79,70,229,0.06)] sm:p-5"
    >
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-indigo-600">Start</p>
        <h2 id="first-start-heading" className="mt-1 text-[20px] font-black tracking-[-0.03em] text-slate-950">
          SPOKEDU MASTER 시작하기
        </h2>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-600">
          오늘 바로 쓸 수업을 먼저 고르고, {spomoveAvailable ? 'SPOMOVE 화면 활동까지 이어서 실행해 보세요.' : 'SPOMOVE는 프리미엄에서 함께 사용할 수 있습니다.'}
        </p>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {firstStartSteps.map(({ title, href, Icon }, index) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-center gap-3 rounded-[14px] border border-indigo-100 bg-white px-3 text-[13px] font-black text-slate-800 transition-colors hover:border-indigo-200 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-600 text-[12px] text-white">
              {index + 1}
            </span>
            <Icon size={16} className="shrink-0 text-indigo-600" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-keep">{title}</span>
            <ArrowRight size={14} className="shrink-0 text-indigo-500" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SpomoveCard({ preset, thumbnailUrl }: { preset: OfficialSpomovePreset; thumbnailUrl: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showThumbnail = Boolean(thumbnailUrl) && !imageFailed;
  return (
    <article data-spomove-preset={preset.id} className="flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-[18px] border border-slate-700 bg-[radial-gradient(circle_at_82%_12%,rgba(99,102,241,0.48),transparent_34%),linear-gradient(145deg,#111827,#0f172a_62%,#020617)] p-4 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-3">
        {showThumbnail ? (
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/15 bg-black/20">
            <img
              src={thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5" aria-hidden="true">
            {SPOMOVE_PAD_GRID_HEX.map((color) => (
              <span key={color} className="h-3 w-3 rounded-[4px]" style={{ background: color }} />
            ))}
          </div>
        )}
        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-black text-white/85">{preset.axisTitle}</span>
      </div>
      <div>
        <h3 className="line-clamp-2 text-[17px] font-black leading-5">{preset.title}</h3>
        <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-4 text-slate-300">{preset.salesCopy || preset.recommendedUse}</p>
        <Link
          href={officialPresetSessionHref(preset, { autostart: true })}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-black text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <MonitorPlay size={15} />
          바로 실행
        </Link>
      </div>
    </article>
  );
}

function ActivityPanel({
  reportCount,
  recordCount,
  studentMemoCount,
  profile,
}: {
  reportCount: number | null;
  recordCount: number;
  studentMemoCount: number;
  profile: UserProfile | null;
}) {
  const status = profile?.isAdmin
    ? 'Admin'
    : profile?.plan === 'team'
      ? 'Team 이용 중'
      : profile?.plan === 'pro'
        ? '프리미엄 이용 중'
        : '이용권 확인';

  const activities: Array<{
    label: string;
    value: number | null;
    href: string;
    Icon: typeof FileText;
    action?: string;
  }> = [
    { label: '저장 안내문', value: reportCount, href: '/spokedu-master/report', Icon: FileText },
    { label: '수업 기록', value: recordCount, href: '/spokedu-master/class-record', Icon: CheckCircle2 },
    { label: '학생 메모', value: studentMemoCount, href: '/spokedu-master/students', Icon: UsersRound },
  ];

  return (
    <section data-dashboard-section="activity" aria-labelledby="activity-heading" className="rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="activity-heading" className="text-[18px] font-black text-slate-950">수업 기록</h2>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">안내문과 수업 운영 기록을 한곳에서 이어가세요.</p>
        </div>
        <Link href="/spokedu-master/profile" className="inline-flex min-h-9 items-center rounded-full bg-indigo-50 px-3 text-[12px] font-black text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
          {status}
        </Link>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {activities.map(({ label, value, href, Icon, action }) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-[74px] items-center gap-3 rounded-[14px] border border-slate-100 bg-slate-50 px-3 transition-colors hover:border-indigo-100 hover:bg-indigo-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            title={label === '학생 메모' ? '저장된 수업 기록 내 학생 메모 수' : undefined}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white text-emerald-700 shadow-sm"><Icon size={17} /></span>
            <span className="min-w-0">
              <span className="block text-[12px] font-bold text-slate-500">{label}</span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[15px] font-black text-slate-900">
                {action ?? (value === null ? '확인 중' : `${value}개`)}
                {action ? <ArrowRight size={14} className="text-indigo-600" /> : null}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// 계속 사용하기: 일반 수업과 SPOMOVE 중 가장 최근 하나만 반환.
// 안내문은 수업 기록 섹션 전용이므로 여기에 포함하지 않는다.
function buildContinueItem(
  classRecords: ClassRecord[],
  recentProgramActivities: RecentProgramActivity[],
  recentActivityOwnerId: string | null,
  programs: Program[],
): ContinueItem | null {
  const programsById = new Map(programs.map((p) => [p.id, p]));
  const validLessonActivities = reconcileRecentProgramActivities(recentProgramActivities, programs);
  const recentLesson = recentActivityOwnerId
    ? selectLatestProgramResume(
        validLessonActivities,
        classRecords.filter((r) => programsById.has(r.programId)),
        recentActivityOwnerId,
      )
    : null;
  const validPresetIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((p) => p.id));
  const validSpomoveActivities = reconcileRecentSpomoveActivities(recentProgramActivities, validPresetIds);
  const recentSpomove = recentActivityOwnerId
    ? selectRecentSpomoveActivity(validSpomoveActivities, recentActivityOwnerId)
    : null;
  const useSpomove =
    recentSpomove !== null &&
    (recentLesson === null || recentSpomove.occurredAt > recentLesson.occurredAt);

  if (useSpomove && recentSpomove) {
    return {
      id: `spomove-${recentSpomove.programId}`,
      type: 'SPOMOVE',
      title: recentSpomove.programTitle,
      status: '최근 실행한 반응 프로그램',
      action: '다시 보기',
      time: formatRelativeDate(recentSpomove.occurredAt),
      href: buildProgramResumeHref(recentSpomove.programId, 'spomove_started'),
    };
  }

  if (recentLesson) {
    return {
      id: `lesson-${recentLesson.programId}`,
      type: '수업',
      title: recentLesson.programTitle,
      status: recentLesson.source === 'video_started' ? '최근 시청한 수업 영상' : '최근 열어본 수업',
      action: '다시 보기',
      time: formatRelativeDate(recentLesson.occurredAt),
      href: recentLesson.resumeHref,
    };
  }

  return null;
}


export default function DashboardView() {
  const {
    programs,
    programsLoaded,
    programsError,
    recentProgramActivities,
    recentActivityOwnerResolved,
    recordRecentProgramActivity,
    reloadPrograms,
  } = useMasterStore();
  const {
    students: serverStudents,
    classRecords: serverClassRecords,
    status: operationalStatus,
  } = useOperationalData();
  const explanationData = useExplanationData();
  const classRecords = useMemo(() => serverClassRecords.map(toClassRecord), [serverClassRecords]);
  const profile = useProfile();
  const isPremium = useIsPremium();
  const recentActivityOwnerId = recentActivityOwnerResolved
    ? getRecentActivityOwnerId(profile)
    : null;
  const validLessonActivities = useMemo(() => {
    if (!recentActivityOwnerId) return [];
    return reconcileRecentProgramActivities(recentProgramActivities, programs)
      .filter((activity) => activity.ownerId === recentActivityOwnerId);
  }, [programs, recentActivityOwnerId, recentProgramActivities]);
  const validSpomoveActivities = useMemo(() => {
    if (!recentActivityOwnerId) return [];
    const validPresetIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id));
    return reconcileRecentSpomoveActivities(recentProgramActivities, validPresetIds)
      .filter((activity) => activity.ownerId === recentActivityOwnerId);
  }, [recentActivityOwnerId, recentProgramActivities]);
  const isFirstUser =
    operationalStatus === 'ready' &&
    isMasterFirstUser({
      studentCount: serverStudents.length,
      classRecords,
      recentLessonActivities: validLessonActivities,
      recentSpomoveActivities: validSpomoveActivities,
    });
  const [mounted, setMounted] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [previewAutoplay, setPreviewAutoplay] = useState(false);
  const [spomoveThumbnailPaths, setSpomoveThumbnailPaths] = useState<Record<string, string>>({});
  const [spomoveThumbnailCacheBust, setSpomoveThumbnailCacheBust] = useState<number | undefined>();
  const [contextTab, setContextTab] = useState<ContextProgramTab>('classroom');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowserClient();
    void supabase
      .from('think_asset_packs')
      .select('assets_json, updated_at')
      .eq('id', SPOMOVE_THUMBNAIL_PACK_ID)
      .maybeSingle()
      .then((result: SpomoveThumbnailPackQueryResult) => {
        if (!alive) return;
        const { data, error } = result;
        if (error && error.code !== 'PGRST116') {
          setSpomoveThumbnailPaths({});
          setSpomoveThumbnailCacheBust(undefined);
          return;
        }
        const next = normalizeSpomoveThumbnailMap(data?.assets_json);
        setSpomoveThumbnailPaths(next);
        setSpomoveThumbnailCacheBust(resolveSpomovePackCacheBust(data?.updated_at as string | undefined, Object.values(next)));
      })
      .catch(() => {
        if (!alive) return;
        setSpomoveThumbnailPaths({});
        setSpomoveThumbnailCacheBust(undefined);
      });
    return () => {
      alive = false;
    };
  }, []);

  const weeklySelection = useMemo(
    () =>
      selectWeeklyRecommendationSlots(programs, {
        isRecommendationEligible: isProgramHomeRecommendationEligible,
        compareFallback: (a, b) =>
          Number(b.isHot) - Number(a.isHot) ||
          getProgramHomeReadiness(b) - getProgramHomeReadiness(a) ||
          Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
          Number(programHasPlayableVideo(b)) - Number(programHasPlayableVideo(a)) ||
          Number(b.isNew) - Number(a.isNew) ||
          getHomeSortOrder(a) - getHomeSortOrder(b),
        normalizeTitle,
      }),
    [programs],
  );
  const weeklyPrograms = weeklySelection.programs;
  const programPool = useMemo(() => uniquePrograms(programs).sort(compareHomePrograms), [programs]);
  const weeklyIds = useMemo(() => new Set(weeklyPrograms.map((program) => program.id)), [weeklyPrograms]);
  const featuredSpomove = useMemo(() => selectFeaturedSpomove(), []);
  const contextPrograms = useMemo(() => {
    const tab = CONTEXT_PROGRAM_TABS.find((item) => item.key === contextTab) ?? CONTEXT_PROGRAM_TABS[0];
    return selectContextPrograms(programs, tab.key, weeklyIds);
  }, [contextTab, programs, weeklyIds]);
  const contextProgramCounts = useMemo(
    () =>
      CONTEXT_PROGRAM_TABS.map((tab) => ({
        ...tab,
        count: selectContextPrograms(programs, tab.key, weeklyIds).length,
      })),
    [programs, weeklyIds],
  );
  const availableContextTabs = contextProgramCounts.filter((tab) => tab.count > 0);
  const contextTabsToDisplay = profile?.isAdmin
    ? CONTEXT_PROGRAM_TABS
    : availableContextTabs;
  const showContextTypeControl = contextTabsToDisplay.length > 1;

  useEffect(() => {
    if (availableContextTabs.length === 1 && contextTab !== availableContextTabs[0].key) {
      setContextTab(availableContextTabs[0].key);
    }
  }, [availableContextTabs, contextTab]);

  const openPreview = (program: Program, autoplayVideo = false) => {
    setPreviewAutoplay(autoplayVideo);
    setSelectedProgram(program);
  };
  const continueItem = useMemo(
    () => buildContinueItem(classRecords, recentProgramActivities, recentActivityOwnerId, programs),
    [classRecords, programs, recentActivityOwnerId, recentProgramActivities],
  );
  const showRecentUse = !isFirstUser && Boolean(continueItem);
  const studentMemoCount = useMemo(
    () => classRecords.flatMap((record) => record.students).filter((student) => student.memo?.trim()).length,
    [classRecords],
  );
  const loopAction = useMemo(
    () => selectMasterLoopAction({
      profile,
      recentLessonActivities: validLessonActivities,
      recentSpomoveActivities: validSpomoveActivities,
      classRecords,
      explanationCount: explanationData.status === 'loading' ? 0 : explanationData.total,
    }),
    [classRecords, explanationData.status, explanationData.total, profile, validLessonActivities, validSpomoveActivities],
  );

  useEffect(() => {
    if (programsLoaded && programPool.length >= 4 && weeklyPrograms.length < 4) {
      console.error('[SPOKEDU MASTER] Weekly recommendations could not be filled to four items.');
    }
    if (weeklySelection.slotConflicts.length > 0) {
      console.error('[SPOKEDU MASTER] Conflicting explicit weekly slots.', weeklySelection.slotConflicts);
    }
    if (weeklySelection.slotDiagnostics.length > 0) {
      console.error('[SPOKEDU MASTER] Weekly recommendation slot diagnostics.', weeklySelection.slotDiagnostics);
    }
  }, [programPool.length, programsLoaded, weeklyPrograms.length, weeklySelection.slotConflicts, weeklySelection.slotDiagnostics]);

  if (!mounted || !programsLoaded) return <DashboardSkeleton />;

  if (programPool.length === 0) {
    const isUnauthorized = programsError === 'unauthorized';
    const isForbidden = programsError === 'forbidden';
    const message = isUnauthorized
      ? '로그인 후 수업 자료를 불러올 수 있습니다.'
      : isForbidden
        ? '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다.'
        : programsError === 'network'
          ? '네트워크 문제로 수업 자료를 불러오지 못했습니다. 연결 상태를 확인해 주세요.'
          : '수업 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto px-4 py-16">
        <section className="w-full max-w-xl rounded-[22px] border border-slate-200 bg-white p-6 text-center shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <h1 className="text-xl font-black text-slate-950">수업 자료를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          {isUnauthorized ? (
            <Link href="/login?next=/spokedu-master/dashboard" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">로그인하기</Link>
          ) : isForbidden ? (
            <Link href="/spokedu-master/subscription" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">이용권 다시 구독하기</Link>
          ) : (
            <button type="button" onClick={() => void reloadPrograms()} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">다시 시도하기</button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-[1376px] flex-col gap-6 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-12">
      <header className="flex min-h-[76px] flex-col justify-center gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600">Today</p>
          <h1 className="mt-1 text-[25px] font-black tracking-[-0.035em] text-slate-950">오늘 운영</h1>
          <p className="mt-1 text-[13px] font-semibold text-slate-500 sm:text-sm">오늘 쓸 수업을 고르고, 필요한 화면 활동과 기록으로 이어가세요.</p>
        </div>
        <div className="flex max-w-sm flex-col items-stretch gap-1.5 sm:items-end">
          <Link href={loopAction.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-600 px-4 text-[13px] font-black text-white">
            <ArrowRight size={15} />
            {loopAction.label}
          </Link>
          <p className="max-w-[280px] text-right text-[11px] font-semibold leading-4 text-slate-500">{loopAction.summary}</p>
        </div>
      </header>

      {isFirstUser ? <FirstStartGuide profile={profile} /> : null}

      <section data-dashboard-section="weekly" aria-labelledby="weekly-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-indigo-600"><Sparkles size={13} />Weekly selection</p>
            <h2 id="weekly-heading" className="text-[22px] font-black tracking-[-0.03em] text-slate-950 sm:text-[26px]">이번 주 추천 프로그램</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-500">이번 주 현장에서 바로 활용하기 좋은 수업 4개를 골랐습니다.</p>
          </div>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {weeklyPrograms.map((program, index) => (
            <div key={program.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start [container-type:inline-size] md:w-auto md:max-w-none">
              <WeeklyProgramCard
                program={program}
                cornerLabel={`추천 ${String(index + 1).padStart(2, '0')}`}
                onPreview={(item) => openPreview(item, programHasPlayableVideo(item))}
                priority={index < 2}
              />
            </div>
          ))}
        </div>
      </section>

      {showRecentUse && continueItem ? <ContinueSection item={continueItem} /> : null}

      <section data-dashboard-section="spomove">
        <SectionHeader
          eyebrow="공식 활동"
          title="SPOMOVE 공식 활동"
          description="수업 도입·집중 전환·마무리에 바로 쓸 수 있는 큰 화면 반응 활동"
          href="/spokedu-master/spomove"
          action="전체 보기"
        />
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {featuredSpomove.map((preset) => (
            <div key={preset.id} className="w-[76vw] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none">
              <SpomoveCard
                preset={preset}
                thumbnailUrl={resolveSpomoveThumbnailUrl(spomoveThumbnailPaths[preset.id], spomoveThumbnailCacheBust)}
              />
            </div>
          ))}
        </div>
      </section>

      {availableContextTabs.length > 0 || profile?.isAdmin ? (
      <section data-dashboard-section="context-programs">
        <SectionHeader
          title="현장 맞춤 프로그램"
          description="교실 체육과 미취학 체육 프로그램을 바로 찾아보세요."
          href="/spokedu-master/library"
          action="라이브러리 보기"
        />
        {showContextTypeControl ? (
          <div className="mb-4 flex gap-2" role="group" aria-label="현장 맞춤 프로그램 유형">
            {contextTabsToDisplay.map((tab) => {
              const active = contextTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setContextTab(tab.key)}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                  style={{
                    background: active ? '#4f46e5' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    border: active ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
        {contextPrograms.length > 0 ? (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
            {contextPrograms.map((program) => (
              <div key={program.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start [container-type:inline-size] md:w-auto md:max-w-none">
                <WeeklyProgramCard
                  program={program}
                  cornerLabel={contextTab === 'classroom' ? '교실 체육' : '미취학 체육'}
                  onPreview={(item) => openPreview(item, programHasPlayableVideo(item))}
                  scope="context"
                />
              </div>
            ))}
          </div>
        ) : profile?.isAdmin ? (
          <p className="rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-500">
            교실체육 또는 미취학 태그가 저장된 프로그램을 확인해 주세요.
          </p>
        ) : null}
      </section>
      ) : null}

      <ActivityPanel
        reportCount={explanationData.status === 'loading' ? null : explanationData.total}
        recordCount={classRecords.length}
        studentMemoCount={studentMemoCount}
        profile={profile}
      />

      {selectedProgram ? (
        <ProgramPreviewModal
          program={selectedProgram}
          autoplayVideo={previewAutoplay}
          isPremium={isPremium}
          onPlaybackStarted={() => {
            recordRecentProgramActivity({
              programId: selectedProgram.id,
              programTitle: selectedProgram.title,
              action: 'video_started',
              occurredAt: new Date().toISOString(),
            });
          }}
          onClose={() => {
            setSelectedProgram(null);
            setPreviewAutoplay(false);
          }}
        />
      ) : null}

    </main>
  );
}
