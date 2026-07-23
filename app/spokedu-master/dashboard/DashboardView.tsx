'use client';

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  MonitorPlay,
  Play,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

const WEEKLY_RECOMMENDATION_COUNT = 4;

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveGuideVideoMap,
  normalizeSpomoveHomeFeaturedSlots,
  normalizeSpomoveThumbnailMap,
  SPOMOVE_GUIDE_VIDEO_PACK_ID,
  SPOMOVE_HOME_FEATURED_PACK_ID,
  SPOMOVE_THUMBNAIL_PACK_ID,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { resolveHomeFeaturedSpomove } from '../lib/spomoveHomeFeatured';
import { LessonCatalogCard } from '../components/lesson/LessonCatalogCard';
import { ProgramPreviewModal } from '../components/lesson/ProgramPreviewModal';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { buildLessonCardSupportMeta } from '../lib/lessonDisplay';
import { buildLessonDisplayModel } from '../lib/lessonDisplayModel';
import {
  programHasPlayableVideo,
  resolveProgramHero,
} from '../lib/program-media';
import { formatLibraryCardEquipmentName } from '../library/libraryViewModel';
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
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { SpomoveGuidelineSheet } from '../spomove/SpomoveGuidelineSheet';
import { SPOMOVE_PAD_GRID_HEX } from '../spomove/spomovePadDisplay';
import { parseMasterSpaces, parseMasterTargets } from '../lib/programDisplayTags';
import { selectWeeklyRecommendationSlots } from '../lib/weeklyRecommendations';
import { useHasMasterEntitlement, useHasPremiumEntitlement, useMasterAccessSnapshot } from '../access/MasterAccessProvider';
import { hasMasterEntitlement } from '../lib/masterAccessModel';
import { EntitlementPreviewHome } from './EntitlementPreviewHome';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { useExplanationData } from '../explanations/ExplanationDataProvider';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useIsPremium, useMasterStore, useProfile } from '../store';
import type { ClassRecord, Program } from '../types';

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

type SpomoveGuideVideoPackQueryResult = {
  data: { assets_json?: unknown } | null;
  error: { code?: string } | null;
};

function getFirstStartSteps(spomoveAvailable: boolean) {
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
    title: '기록 남기고 안내문 만들기',
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

function resolveSpomoveThumbnailUrl(path: string | null | undefined, cacheBust?: number) {
  if (!path) return '';
  try {
    return withPublicUrlCacheBust(getPublicUrl(path), cacheBust);
  } catch {
    return '';
  }
}

function shouldStretchSpomoveThumbnail(_width: number, _height: number, src: string) {
  return /\.svg(\?|#|$)/i.test(src);
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

/** 추천 슬롯을 최대 4개까지 풀에서 보충한다. */
function ensureWeeklyRecommendationCount(
  selected: Program[],
  pool: Program[],
  count = WEEKLY_RECOMMENDATION_COUNT,
): Program[] {
  const result = selected.slice(0, count);
  if (result.length >= count) return result;

  const usedIds = new Set(result.map((program) => program.id));
  const usedTitles = new Set(result.map((program) => normalizeTitle(getProgramTitle(program))).filter(Boolean));

  for (const program of pool) {
    if (result.length >= count) break;
    const titleKey = normalizeTitle(getProgramTitle(program));
    if (!titleKey || usedIds.has(program.id) || usedTitles.has(titleKey)) continue;
    result.push(program);
    usedIds.add(program.id);
    usedTitles.add(titleKey);
  }

  return result;
}

function SectionHeader({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  href,
  action,
  titleId,
  size = 'md',
  tone = 'light',
}: {
  eyebrow?: string;
  eyebrowIcon?: ReactNode;
  title: string;
  description?: string;
  href?: string;
  action?: string;
  titleId?: string;
  size?: 'md' | 'lg';
  tone?: 'light' | 'dark' | 'feature';
}) {
  const titleClass =
    size === 'lg'
      ? `break-keep text-[25px] font-black leading-tight tracking-normal sm:text-[32px] ${tone === 'dark' ? 'text-white' : 'text-[color:var(--spm-t)]'}`
      : `break-keep text-[20px] font-black leading-tight tracking-normal sm:text-[23px] ${tone === 'dark' ? 'text-white' : 'text-[color:var(--spm-t)]'}`;
  const eyebrowClass = tone === 'dark'
    ? 'mb-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-300'
    : tone === 'feature'
      ? 'mb-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-700'
      : 'mb-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--spm-acc)]';
  const descriptionClass = tone === 'dark'
    ? 'mt-1.5 max-w-2xl text-[13px] font-semibold leading-5 text-slate-300 sm:text-sm'
    : tone === 'feature'
      ? 'mt-1.5 max-w-2xl text-[13px] font-semibold leading-5 text-slate-600 sm:text-sm'
      : 'mt-1.5 max-w-2xl text-[13px] font-semibold leading-5 text-[color:var(--spm-t2)] sm:text-sm';
  const actionClass = tone === 'dark'
    ? 'inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-black text-white/90 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'
    : tone === 'feature'
      ? 'inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-black text-slate-800 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900'
      : 'inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-black text-[var(--spm-acc)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]';

  return (
    <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className={eyebrowClass}>
            {eyebrowIcon}
            {eyebrow}
          </p>
        ) : null}
        <h2 id={titleId} className={titleClass}>
          {title}
        </h2>
        {description ? (
          <p className={descriptionClass}>
            {description}
          </p>
        ) : null}
      </div>
      {href && action ? (
        <Link
          href={href}
          className={`${actionClass} -mt-1 sm:mt-0`}
        >
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
  cornerLabel?: string;
  onPreview: (program: Program) => void;
  scope?: 'weekly' | 'context';
  priority?: boolean;
}) {
  const model = buildLessonDisplayModel(program);
  const prep = program.equipment[0] ? formatLibraryCardEquipmentName(program.equipment[0]) : '';
  const supportMeta = buildLessonCardSupportMeta(program, { equipmentFallback: prep });

  return (
    <LessonCatalogCard
      variant="home"
      title={model.title}
      heroImageUrl={model.heroImageUrl}
      categoryFallback={model.theme || '체육 수업'}
      hasVideo={programHasPlayableVideo(program)}
      onPreview={() => onPreview(program)}
      detailHref={`/spokedu-master/library/${program.id}`}
      decisionMeta={model.theme || '체육 수업'}
      supportMeta={supportMeta}
      cornerLabel={cornerLabel}
      priority={priority}
      dataAttrs={{
        'data-weekly-program': scope === 'weekly' ? program.id : undefined,
        'data-context-program': scope === 'context' ? program.id : undefined,
      }}
      sizes="(min-width: 1280px) 290px, (min-width: 768px) 45vw, 82vw"
    />
  );
}

function ContinueSection({ item }: { item: ContinueItem }) {
  return (
    <section className="h-full rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <SectionHeader
        eyebrow="이어하기"
        title="최근 수업"
        description="마지막으로 연 수업을 바로 이어갑니다."
        tone="feature"
      />
      <Link
        data-continue-item={item.id}
        href={item.href}
        className="flex min-h-[74px] items-center gap-3 rounded-[14px] border border-[color:var(--spm-br)] bg-[var(--spm-s2)] px-3 py-2 transition-colors hover:border-slate-300 hover:bg-[var(--spm-s3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--spm-s1)] text-[var(--spm-acc)] shadow-sm">
          {item.type === 'SPOMOVE' ? <MonitorPlay size={18} /> : <BookOpen size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-black text-[var(--spm-acc)]">{item.type}</span>
          <span className="mt-0.5 block truncate text-[13px] font-black text-[color:var(--spm-t)]">{item.title}</span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-[color:var(--spm-t2)]">{item.status}</span>
        </span>
        <span className="shrink-0 text-right">
          {item.time ? <span className="block text-[11px] font-bold text-[color:var(--spm-t3)]">{item.time}</span> : null}
          <span className="mt-1 block text-[11px] font-black text-[var(--spm-acc)]">{item.action}</span>
        </span>
      </Link>
    </section>
  );
}

function FirstStartGuide({ spomoveAvailable }: { spomoveAvailable: boolean }) {
  const firstStartSteps = getFirstStartSteps(spomoveAvailable);
  return (
    <section
      data-dashboard-section="first-start"
      aria-labelledby="first-start-heading"
      className="rounded-[20px] border border-[color-mix(in_srgb,var(--spm-acc)_22%,transparent)] bg-[var(--spm-acc-glow)] p-4 shadow-[0_8px_24px_rgba(79,70,229,0.06)] sm:p-5"
    >
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--spm-acc)]">시작하기</p>
        <h2 id="first-start-heading" className="mt-1 text-[20px] font-black tracking-[-0.03em] text-[color:var(--spm-t)]">
          SPOKEDU MASTER 시작하기
        </h2>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-[color:var(--spm-t2)]">
          오늘 바로 쓸 수업을 먼저 고르고, {spomoveAvailable ? 'SPOMOVE 화면 활동까지 이어서 실행해 보세요.' : 'SPOMOVE는 프리미엄에서 함께 사용할 수 있습니다.'}
        </p>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {firstStartSteps.map(({ title, href, Icon }, index) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--spm-acc)_22%,transparent)] bg-[var(--spm-s1)] px-3 text-[13px] font-black text-[color:var(--spm-t)] transition-colors hover:border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--spm-s1)_90%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--spm-acc)] text-[12px] text-white">
              {index + 1}
            </span>
            <Icon size={16} className="shrink-0 text-[var(--spm-acc)]" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-keep">{title}</span>
            <ArrowRight size={14} className="shrink-0 text-[var(--spm-acc)]" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SpomoveCard({
  preset,
  thumbnailUrl,
  onOpenGuide,
}: {
  preset: OfficialSpomovePreset;
  thumbnailUrl: string;
  onOpenGuide: (preset: OfficialSpomovePreset) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [stretch, setStretch] = useState(() => /\.svg(\?|#|$)/i.test(thumbnailUrl));
  const showThumbnail = Boolean(thumbnailUrl) && !imageFailed;
  const fitClass = stretch ? 'object-fill object-center' : 'object-cover object-center';

  return (
    <article
      data-spomove-preset={preset.id}
      className="group flex h-full min-h-[324px] flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white text-[color:var(--spm-t)] shadow-[0_14px_30px_rgba(15,23,42,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_38px_rgba(15,23,42,0.14)]"
    >
      <button
        type="button"
        onClick={() => onOpenGuide(preset)}
        className="relative aspect-[6/5] overflow-hidden border-b border-[color:var(--spm-br)] bg-[var(--spm-s1)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--spm-acc)]"
        aria-label={`${preset.title} 미리보기`}
      >
        {showThumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element -- SPOMOVE 썸네일은 외부 URL이라 next/image remotePatterns 밖일 수 있음 */
          <img
            src={thumbnailUrl}
            alt=""
            className={`h-full w-full ${fitClass}`}
            onLoad={(event) => {
              if (
                shouldStretchSpomoveThumbnail(
                  event.currentTarget.naturalWidth,
                  event.currentTarget.naturalHeight,
                  thumbnailUrl,
                )
              ) {
                setStretch(true);
              }
            }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="grid h-full w-full grid-cols-2 gap-1.5 bg-slate-950 p-5" aria-hidden="true">
            {SPOMOVE_PAD_GRID_HEX.map((color) => (
              <span key={color} className="rounded-[10px] shadow-inner" style={{ background: color }} />
            ))}
          </div>
        )}
        <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-150 group-hover:bg-black/[0.07]" />
        <span className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.22)] ring-1 ring-black/5 transition-transform duration-150 group-hover:scale-105"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
          </span>
        </span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/34 to-transparent px-3 pb-3 pt-16">
          <p className="max-w-[76%] truncate text-[11px] font-black text-white/82 drop-shadow">
            {preset.programTitle}
          </p>
          <h3 className="mt-1 line-clamp-2 max-w-[92%] text-[17px] font-black leading-5 text-white drop-shadow">
            {preset.title}
          </h3>
        </div>
      </button>
      <div className="flex flex-1 flex-col bg-white p-3">
        <div className="mb-2 flex min-h-5 min-w-0 items-center overflow-hidden text-[12px] font-semibold leading-5 text-[color:var(--spm-t2)]">
          <span className="min-w-0 truncate">{preset.axisTitle}</span>
        </div>
        <button
          type="button"
          data-spm-spomove-card-action="start"
          onClick={() => onOpenGuide(preset)}
          className="mt-auto inline-flex h-9 w-full items-center justify-between gap-3 rounded-[9px] bg-slate-950 px-3 text-[13px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <MonitorPlay size={14} />
            시작하기
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}

function ActivityPanel({
  reportCount,
  recordCount,
  studentMemoCount,
  compact = false,
  className = '',
}: {
  reportCount: number | null;
  recordCount: number;
  studentMemoCount: number;
  compact?: boolean;
  className?: string;
}) {
  const accessSnapshot = useMasterAccessSnapshot();
  const status = accessSnapshot.isAdmin
    ? 'Admin'
    : accessSnapshot.isCenterOrTeam
      ? 'Team 이용 중'
      : accessSnapshot.canUseSpomove
        ? '프리미엄 이용 중'
        : '구독 확인';

  const activities: Array<{
    label: string;
    value: number | null;
    href: string;
    Icon: typeof FileText;
    action?: string;
  }> = [
    { label: '안내문 보관', value: reportCount, href: '/spokedu-master/report', Icon: FileText },
    { label: '수업 기록', value: recordCount, href: '/spokedu-master/class-record', Icon: CheckCircle2 },
    { label: '학생 메모', value: studentMemoCount, href: '/spokedu-master/students', Icon: UsersRound },
  ];

  if (compact) {
    return (
      <section data-dashboard-section="activity" aria-labelledby="activity-heading" className={`relative rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ${className}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">기록</p>
            <h2 id="activity-heading" className="mt-1 text-[20px] font-black text-[color:var(--spm-t)]">수업 기록</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-600">안내문·기록·학생 메모를 빠르게 확인하세요.</p>
          </div>
          <Link href="/spokedu-master/profile" className="inline-flex min-h-9 items-center rounded-full bg-[var(--spm-s2)] px-3 text-[12px] font-black text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900">
            {status}
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {activities.map(({ label, value, href, Icon, action }) => (
            <Link
              key={label}
              href={href}
              className="flex min-h-[68px] items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300 hover:bg-[var(--spm-s2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
              title={label === '학생 메모' ? '저장된 수업 기록 내 학생 메모 수' : undefined}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[var(--spm-s2)] text-emerald-700 shadow-sm"><Icon size={17} /></span>
              <span className="min-w-0">
                <span className="block text-[12px] font-bold text-[color:var(--spm-t2)]">{label}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[15px] font-black text-[color:var(--spm-t)]">
                  {action ?? (value === null ? '확인 중' : `${value}개`)}
                  {action ? <ArrowRight size={14} className="text-[var(--spm-acc)]" /> : null}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section data-dashboard-section="activity" aria-labelledby="activity-heading" className="rounded-[20px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="activity-heading" className="text-[18px] font-black text-[color:var(--spm-t)]">수업 기록</h2>
          <p className="mt-1 text-[13px] font-semibold text-[color:var(--spm-t2)]">빠른 기록·보강 기록과 안내문을 한곳에서 이어가세요.</p>
        </div>
        <Link href="/spokedu-master/profile" className="inline-flex min-h-9 items-center rounded-full bg-[var(--spm-acc-glow)] px-3 text-[12px] font-black text-[var(--spm-acc)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]">
          {status}
        </Link>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {activities.map(({ label, value, href, Icon, action }) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-[74px] items-center gap-3 rounded-[14px] border border-[color:var(--spm-br)] bg-[var(--spm-s2)] px-3 transition-colors hover:border-[color-mix(in_srgb,var(--spm-acc)_22%,transparent)] hover:bg-[var(--spm-acc-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
            title={label === '학생 메모' ? '저장된 수업 기록 내 학생 메모 수' : undefined}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[var(--spm-s1)] text-emerald-700 shadow-sm"><Icon size={17} /></span>
            <span className="min-w-0">
              <span className="block text-[12px] font-bold text-[color:var(--spm-t2)]">{label}</span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[15px] font-black text-[color:var(--spm-t)]">
                {action ?? (value === null ? '확인 중' : `${value}개`)}
                {action ? <ArrowRight size={14} className="text-[var(--spm-acc)]" /> : null}
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
  const accessSnapshot = useMasterAccessSnapshot();
  if (!hasMasterEntitlement(accessSnapshot)) {
    return <EntitlementPreviewHome snapshot={accessSnapshot} />;
  }
  return <EntitledDashboardView />;
}

function EntitledDashboardView() {
  const spomoveAvailable = useHasPremiumEntitlement();
  const hasEntitlement = useHasMasterEntitlement();
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
  const [guideVideoUrls, setGuideVideoUrls] = useState<Record<string, string>>({});
  const [featuredSpomoveSlotIds, setFeaturedSpomoveSlotIds] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [previewSpomove, setPreviewSpomove] = useState<OfficialSpomovePreset | null>(null);
  const [contextTab, setContextTab] = useState<ContextProgramTab>('classroom');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowserClient();
    void Promise.all([
      supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', SPOMOVE_THUMBNAIL_PACK_ID)
        .maybeSingle(),
      supabase.from('think_asset_packs').select('assets_json').eq('id', SPOMOVE_GUIDE_VIDEO_PACK_ID).maybeSingle(),
      supabase
        .from('think_asset_packs')
        .select('assets_json')
        .eq('id', SPOMOVE_HOME_FEATURED_PACK_ID)
        .maybeSingle(),
    ])
      .then(([thumbnailResult, guideVideoResult, featuredResult]) => {
        if (!alive) return;
        const { data, error } = thumbnailResult as SpomoveThumbnailPackQueryResult;
        if (error && error.code !== 'PGRST116') {
          setSpomoveThumbnailPaths({});
          setSpomoveThumbnailCacheBust(undefined);
        } else {
          const next = normalizeSpomoveThumbnailMap(data?.assets_json);
          setSpomoveThumbnailPaths(next);
          setSpomoveThumbnailCacheBust(
            resolveSpomovePackCacheBust(data?.updated_at as string | undefined, Object.values(next)),
          );
        }

        const { data: guideVideoData, error: guideVideoError } = guideVideoResult as SpomoveGuideVideoPackQueryResult;
        if (guideVideoError && guideVideoError.code !== 'PGRST116') {
          setGuideVideoUrls({});
        } else {
          setGuideVideoUrls(normalizeSpomoveGuideVideoMap(guideVideoData?.assets_json));
        }

        const { data: featuredData, error: featuredError } = featuredResult as {
          data: { assets_json?: unknown } | null;
          error: { code?: string } | null;
        };
        if (featuredError && featuredError.code !== 'PGRST116') {
          setFeaturedSpomoveSlotIds([null, null, null, null]);
        } else {
          setFeaturedSpomoveSlotIds(normalizeSpomoveHomeFeaturedSlots(featuredData?.assets_json));
        }
      })
      .catch(() => {
        if (!alive) return;
        setSpomoveThumbnailPaths({});
        setSpomoveThumbnailCacheBust(undefined);
        setGuideVideoUrls({});
        setFeaturedSpomoveSlotIds([null, null, null, null]);
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
  const programPool = useMemo(() => uniquePrograms(programs).sort(compareHomePrograms), [programs]);
  const weeklyPrograms = useMemo(
    () => ensureWeeklyRecommendationCount(weeklySelection.programs, programPool, WEEKLY_RECOMMENDATION_COUNT),
    [programPool, weeklySelection.programs],
  );
  const weeklyIds = useMemo(() => new Set(weeklyPrograms.map((program) => program.id)), [weeklyPrograms]);
  const featuredSpomove = useMemo(
    () => resolveHomeFeaturedSpomove(featuredSpomoveSlotIds),
    [featuredSpomoveSlotIds],
  );
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
      entitlement: { hasEntitlement },
      recentLessonActivities: validLessonActivities,
      recentSpomoveActivities: validSpomoveActivities,
      classRecords,
      explanationCount: explanationData.status === 'loading' ? 0 : explanationData.total,
    }),
    [classRecords, explanationData.status, explanationData.total, hasEntitlement, profile, validLessonActivities, validSpomoveActivities],
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && programsLoaded && programPool.length >= 4 && weeklyPrograms.length < 4) {
      console.error('[SPOKEDU MASTER] Weekly recommendations could not be filled to four items.');
    }
    if (process.env.NODE_ENV !== 'production' && weeklySelection.slotConflicts.length > 0) {
      console.error('[SPOKEDU MASTER] Conflicting explicit weekly slots.', weeklySelection.slotConflicts);
    }
    if (process.env.NODE_ENV !== 'production' && weeklySelection.slotDiagnostics.length > 0) {
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
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto px-4 py-16" style={{ background: 'var(--spm-bg)' }}>
        <section className="w-full max-w-xl rounded-[22px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-6 text-center shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <h1 className="text-xl font-black text-[color:var(--spm-t)]">수업 자료를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">{message}</p>
          {isUnauthorized ? (
            <Link href="/login?next=/spokedu-master/dashboard" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--spm-acc)] px-5 text-sm font-black text-white">로그인하기</Link>
          ) : isForbidden ? (
            <Link href="/spokedu-master/subscription" className="mt-5 inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--spm-acc)] px-5 text-[13px] font-black text-white">다시 구독하기</Link>
          ) : (
            <button type="button" onClick={() => void reloadPrograms()} className="mt-5 inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--spm-acc)] px-5 text-[13px] font-black text-white">다시 시도</button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-[1376px] flex-col gap-4 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:gap-5 lg:px-8 lg:pb-12" style={{ background: 'var(--spm-bg)' }}>
      <header className="flex min-h-[64px] flex-col justify-center gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">SPOKEDU MASTER</p>
          <h1 className="mt-1 text-[24px] font-black leading-tight text-[color:var(--spm-t)] sm:text-[29px]">
            오늘 수업 운영
          </h1>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-600">
            수업 선택, 화면 활동, 기록을 한 화면에서 정리하세요.
          </p>
        </div>
        <Link href={loopAction.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900">
          <ArrowRight size={15} />
          {loopAction.label}
        </Link>
      </header>

      {isFirstUser ? <FirstStartGuide spomoveAvailable={spomoveAvailable} /> : null}

      <section
        data-dashboard-section="featured-flow"
        aria-label="오늘의 추천 콘텐츠"
        className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,var(--spm-s1)_0%,var(--spm-s2)_58%,color-mix(in_srgb,var(--spm-s3)_82%,white)_100%)] p-4 shadow-[0_18px_46px_rgba(15,23,42,0.10)] ring-1 ring-white/70 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#111827_0%,#475569_45%,rgba(71,85,105,0)_100%)] sm:p-5 lg:p-5"
      >
        <section data-dashboard-section="weekly" aria-labelledby="weekly-heading" className="relative">
          <SectionHeader
            eyebrow="수업"
            eyebrowIcon={<BookOpen size={14} />}
            title="이번 주 바로 준비할 수업"
            titleId="weekly-heading"
            size="lg"
            tone="feature"
            description="대상·공간·교구 기준으로 바로 준비할 수업을 골라보세요."
            href="/spokedu-master/library"
            action="수업자료 더 보기"
          />
          {weeklyPrograms.length > 0 ? (
            <div className="relative -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-5 sm:px-5 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
              {weeklyPrograms.map((program, index) => (
                <div key={program.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start [container-type:inline-size] md:w-auto md:max-w-none">
                  <WeeklyProgramCard
                    program={program}
                    onPreview={(item) => openPreview(item, programHasPlayableVideo(item))}
                    priority={index < 2}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-5 text-center">
              <p className="text-[14px] font-semibold text-[color:var(--spm-t2)]">오늘 쓸 수업을 라이브러리에서 골라 보세요.</p>
              <Link href="/spokedu-master/library" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--spm-acc)] px-5 text-[13px] font-black text-white">
                라이브러리 열기
              </Link>
            </div>
          )}
        </section>

        <div className="relative my-5 h-px bg-[color:var(--spm-br)]" />

        <section data-dashboard-section="spomove" aria-labelledby="spomove-heading" className="relative">
          <SectionHeader
            eyebrow="화면 활동"
            eyebrowIcon={<MonitorPlay size={14} />}
            title="SPOMOVE"
            titleId="spomove-heading"
            size="lg"
            tone="feature"
            description="프로젝터로 바로 여는 반응 활동을 선택하세요."
            href="/spokedu-master/spomove"
            action="활동 더 보기"
          />
          <div className="relative -mx-4 flex snap-x items-stretch gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {featuredSpomove.map((preset) => (
              <div key={preset.id} className="h-full w-[76vw] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none">
                <SpomoveCard
                  preset={preset}
                  thumbnailUrl={resolveSpomoveThumbnailUrl(spomoveThumbnailPaths[preset.id], spomoveThumbnailCacheBust)}
                  onOpenGuide={setPreviewSpomove}
                />
              </div>
            ))}
          </div>
        </section>
      </section>

      <section
        data-dashboard-section="operations-flow"
        aria-label="수업 운영 흐름"
        className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,var(--spm-s1)_0%,var(--spm-s2)_64%,color-mix(in_srgb,var(--spm-s3)_76%,white)_100%)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/70 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#111827_0%,#475569_45%,rgba(71,85,105,0)_100%)] sm:p-5 lg:p-5"
      >
        <div
          className="relative space-y-5 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-stretch lg:gap-5 lg:space-y-0"
          style={{ gridTemplateAreas: '"recent activity" "context context"' }}
        >
          <div className="h-full" style={{ gridArea: 'recent' }}>
            {showRecentUse && continueItem ? <ContinueSection item={continueItem} /> : (
              <div className="h-full rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">이어하기</p>
                <h2 className="mt-1 text-[20px] font-black text-[color:var(--spm-t)]">최근 수업</h2>
                <p className="mt-1 text-[13px] font-semibold text-slate-600">최근에 연 수업이 여기에 표시됩니다.</p>
              </div>
            )}
          </div>

            {availableContextTabs.length > 0 || profile?.isAdmin ? (
            <section data-dashboard-section="context-programs" style={{ gridArea: 'context' }}>
              <SectionHeader
                eyebrow="현장 맞춤"
                title="맞춤 수업"
                description="현장 조건에 맞는 보조 추천만 추렸습니다."
                href="/spokedu-master/library"
                action="맞춤 더 보기"
                tone="feature"
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
                        className="inline-flex min-h-10 items-center rounded-[10px] px-3 text-[13px] font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
                        style={{
                          background: active ? '#0f172a' : '#ffffff',
                          color: active ? '#ffffff' : '#475569',
                          border: active ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {contextPrograms.length > 0 ? (
                <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-5 sm:px-5 md:grid md:grid-cols-3 md:overflow-visible xl:-mx-0 xl:px-0 [&::-webkit-scrollbar]:hidden">
                  {contextPrograms.slice(0, 3).map((program) => (
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
                <p className="rounded-[14px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] px-4 py-3 text-[13px] font-semibold text-[color:var(--spm-t2)]">
                  교실체육 또는 미취학 태그가 저장된 프로그램을 확인해 주세요.
                </p>
              ) : null}
            </section>
            ) : null}
          <div className="h-full" style={{ gridArea: 'activity' }}>
            <ActivityPanel
              compact
              className="h-full"
              reportCount={explanationData.status === 'loading' ? null : explanationData.total}
              recordCount={classRecords.length}
              studentMemoCount={studentMemoCount}
            />
          </div>
        </div>
      </section>

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

      <SpomoveGuidelineSheet
        preset={previewSpomove}
        guideVideoUrl={previewSpomove ? guideVideoUrls[previewSpomove.id] ?? '' : ''}
        onClose={() => setPreviewSpomove(null)}
      />
    </main>
  );
}
