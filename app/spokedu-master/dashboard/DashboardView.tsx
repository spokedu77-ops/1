'use client';

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  MonitorPlay,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

const WEEKLY_RECOMMENDATION_COUNT = 4;

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveContentMap,
  SPOMOVE_CONTENT_PACK_ID,
  normalizeSpomoveHomeFeaturedSlots,
  normalizeSpomoveThumbnailMap,
  SPOMOVE_HOME_FEATURED_PACK_ID,
  SPOMOVE_THUMBNAIL_PACK_ID,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { resolveHomeFeaturedSpomove } from '../lib/spomoveHomeFeatured';
import { LessonCatalogCard } from '../components/lesson/LessonCatalogCard';
import { ProgramPreviewModal } from '../components/lesson/ProgramPreviewModal';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { buildLessonCardSupportMeta } from '../lib/lessonDisplay';
import { formatProgramSelectionReasons } from '../library/librarySelectionReasons';
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
import { sortProgramsByAgeGroupPreference } from '../lib/homeAgePreference';
import { isMasterFirstUser } from '../lib/masterUserLoop';
import {
  getRecentActivityOwnerId,
  reconcileRecentProgramActivities,
  reconcileRecentSpomoveActivities,
} from '../lib/recentProgramActivity';
import { HomeContinuityPanel, HomeNextSessionPanel } from './TodaySessionsPanel';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { SpomoveGuidelineSheet, type SpomoveContentLoadState } from '../spomove/SpomoveGuidelineSheet';
import { SPOMOVE_PAD_GRID_HEX } from '../spomove/spomovePadDisplay';
import { getSpomovePresetDisplayModel } from '../spomove/spomovePresetDisplayModel';
import { selectWeeklyRecommendationSlots } from '../lib/weeklyRecommendations';
import { useMasterAccessSnapshot } from '../access/MasterAccessProvider';
import { hasMasterEntitlement } from '../lib/masterAccessModel';
import { EntitlementPreviewHome } from './EntitlementPreviewHome';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useIsPremium, useMasterStore, useProfile } from '../store';
import type { Program } from '../types';
import { useSpomoveGuideVideo } from '../spomove/useSpomoveGuideVideo';

type SpomoveThumbnailPackQueryResult = {
  data: { assets_json?: unknown; updated_at?: string | null } | null;
  error: { code?: string } | null;
};

type SpomoveContentPackQueryResult = { data: { assets_json?: unknown } | null; error: { code?: string } | null };

function getFirstStartPaths() {
  return [
    { title: '좋은 활동부터 찾아보기', description: '수업에 맞는 프로그램을 둘러보세요.', href: '/spokedu-master/programs', Icon: BookOpen },
    { title: '수업부터 만들기', description: '수업반과 이번 주 일정을 한 번에 준비하세요.', href: '/spokedu-master/manage', Icon: UsersRound },
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
      ? `break-keep text-[22px] font-semibold leading-tight ${tone === 'dark' ? 'text-white' : 'text-[color:var(--spm-t)]'}`
      : `break-keep text-[20px] font-semibold leading-tight ${tone === 'dark' ? 'text-white' : 'text-[color:var(--spm-t)]'}`;
  const descriptionClass = tone === 'dark'
    ? 'mt-1 max-w-xl text-[12px] font-semibold leading-5 text-slate-400 sm:text-[13px]'
    : tone === 'feature'
      ? 'mt-1 max-w-xl text-[12px] font-semibold leading-5 text-slate-500 sm:text-[13px]'
      : 'mt-1 max-w-xl text-[12px] font-semibold leading-5 text-slate-500 sm:text-[13px]';
  const actionClass = tone === 'dark'
    ? 'inline-flex min-h-11 shrink-0 items-center gap-1 text-[12px] font-bold text-white/75 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:min-h-9'
    : tone === 'feature'
      ? 'inline-flex min-h-11 shrink-0 items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 sm:min-h-9'
      : 'inline-flex min-h-11 shrink-0 items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 sm:min-h-9';

  return (
    <div className="mb-2.5 flex flex-col items-start justify-between gap-1.5 sm:mb-3 sm:flex-row sm:items-end sm:gap-3">
      <div className="min-w-0">
        {void eyebrow}{void eyebrowIcon}
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
          className={`${actionClass} -mt-0.5 text-[11px] sm:mt-0 sm:text-[12px]`}
        >
          {action}
          <ArrowRight size={13} />
        </Link>
      ) : null}
    </div>
  );
}

function WeeklyProgramCard({
  program,
  onPreview,
  priority = false,
}: {
  program: Program;
  onPreview: (program: Program) => void;
  priority?: boolean;
}) {
  const model = buildLessonDisplayModel(program);
  const prep = program.equipment[0] ? formatLibraryCardEquipmentName(program.equipment[0]) : '';
  const selectionMeta = formatProgramSelectionReasons(program);
  const supportMeta = selectionMeta || buildLessonCardSupportMeta(program, { equipmentFallback: prep });

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
      priority={priority}
      dataAttrs={{
        'data-weekly-program': program.id,
      }}
      sizes="(min-width: 1280px) 290px, (min-width: 768px) 45vw, 82vw"
    />
  );
}

function FirstStartGuide() {
  const firstStartPaths = getFirstStartPaths();
  return (
    <section
      data-dashboard-section="first-start"
      aria-labelledby="first-start-heading"
      className="border-t border-slate-200 pt-4"
    >
      <div>
        <p className="text-[13px] font-medium text-slate-500">처음이라면</p>
        <h2 id="first-start-heading" className="mt-1 text-[20px] font-semibold text-[color:var(--spm-t)]">
          첫 수업을 시작해 보세요
        </h2>
        <p className="mt-1 text-[14px] font-normal leading-6 text-slate-500">
          콘텐츠부터 찾아도, 수업부터 만들어도 같은 준비 흐름으로 이어집니다.
        </p>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {firstStartPaths.map(({ title, description, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-12 items-center gap-2.5 rounded-[12px] bg-slate-100 px-3 text-[14px] font-semibold text-[color:var(--spm-t)] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-white"><Icon size={14} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><strong className="block break-keep">{title}</strong><small className="mt-0.5 block text-[12px] font-medium text-slate-500">{description}</small></span>
            <ArrowRight size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SpomoveCard({
  preset,
  thumbnailUrl,
  contentOverride,
  onOpenGuide,
  priority = false,
}: {
  preset: OfficialSpomovePreset;
  thumbnailUrl: string;
  contentOverride?: import('@/app/lib/spomove/spomoveOfficialAssets').SpomovePresetContentOverride;
  onOpenGuide: (preset: OfficialSpomovePreset) => void;
  priority?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [stretch, setStretch] = useState(() => /\.svg(\?|#|$)/i.test(thumbnailUrl));
  const showThumbnail = Boolean(thumbnailUrl) && !imageFailed;
  const fitClass = stretch ? 'object-fill object-center' : 'object-cover object-center';
  const displayModel = getSpomovePresetDisplayModel(preset, contentOverride);

  return (
    <article
      data-spomove-preset={preset.id}
      className="group flex h-[345px] min-h-[345px] flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white text-[color:var(--spm-t)] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-slate-300 active:translate-y-0"
    >
      <button
        type="button"
        onClick={() => onOpenGuide(preset)}
        className="relative min-h-0 w-full flex-1 aspect-[6/5] overflow-hidden border-b border-[color:var(--spm-br)] bg-[var(--spm-s1)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--spm-acc)]"
        aria-label={`${displayModel.displayTitle} 활동 준비 열기`}
      >
        {showThumbnail ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 74vw"
            quality={75}
            className={fitClass}
            priority={priority}
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/34 to-transparent px-3 pb-3 pt-16">
          <p className="max-w-[76%] truncate text-[12px] font-medium text-white/82">
            {displayModel.programLabel}
          </p>
          <h3 className="mt-1 line-clamp-2 max-w-[92%] text-[17px] font-semibold leading-5 text-white">
            {displayModel.displayTitle}
          </h3>
        </div>
      </button>
      <div className="flex h-[96px] shrink-0 flex-col gap-2 bg-white p-3">
        <div className="flex h-5 min-w-0 items-center overflow-hidden text-[12px] font-semibold leading-5 text-[color:var(--spm-t2)]" aria-label="활동 정보">
          {[
            displayModel.variantLabel,
            displayModel.difficultyLabel,
            displayModel.targetLabel,
          ].filter(Boolean).slice(0, 3).map((part, index) => (
            <span
              key={`${part}-${index}`}
              className="min-w-0 truncate after:mx-1.5 after:text-[color:var(--spm-t3)] after:content-['·'] last:after:content-none"
            >
              {part}
            </span>
          ))}
        </div>
        <button
          type="button"
          data-spm-spomove-card-action="start"
          onClick={() => onOpenGuide(preset)}
          className="inline-flex h-11 w-full shrink-0 items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>활동 준비</span>
          <ArrowRight size={14} aria-hidden />
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
  recordCount: number | null;
  studentMemoCount: number | null;
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
  }> = compact
    ? [
        { label: '안내문', value: reportCount, href: '/spokedu-master/report', Icon: FileText, action: '안내문 보기' },
        { label: '수업 일정', value: recordCount, href: '/spokedu-master/activity', Icon: CheckCircle2, action: '수업 일정 보기' },
      ]
    : [
        { label: '안내문 보관', value: reportCount, href: '/spokedu-master/report', Icon: FileText },
        { label: '수업', value: recordCount, href: '/spokedu-master/activity', Icon: CheckCircle2 },
        { label: '학생 메모', value: studentMemoCount, href: '/spokedu-master/students', Icon: UsersRound },
      ];

  if (compact) {
    return (
      <section data-dashboard-section="activity" aria-labelledby="activity-heading" className={`relative rounded-[12px] border border-slate-200/70 bg-slate-50/60 px-2.5 py-2 ${className}`}>
        <div className="mb-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">참고</p>
          <h2 id="activity-heading" className="mt-0.5 text-[13px] font-black text-slate-600">기록 · 안내문</h2>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {activities.map(({ label, value, href, Icon, action }) => (
            <Link
              key={label}
              href={href}
              className="flex min-h-11 items-center gap-2 rounded-[9px] border border-slate-100/80 bg-white/80 px-2.5 transition-colors hover:border-slate-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-slate-50 text-slate-500"><Icon size={14} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-slate-500">{label}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-bold text-slate-700">
                  {action}
                  <ArrowRight size={12} className="text-slate-400" />
                </span>
              </span>
              {value !== null ? (
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400" aria-label={`${label} ${value}개`}>
                  {value}
                </span>
              ) : null}
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
          <p className="mt-1 text-[13px] font-semibold text-[color:var(--spm-t2)]">완료한 수업의 안내문과 학생 이력을 확인하세요.</p>
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

// Retained temporarily as reusable legacy primitives while Home IA is frozen.
void SpomoveCard;
void ActivityPanel;

export default function DashboardView() {
  const accessSnapshot = useMasterAccessSnapshot();
  if (!hasMasterEntitlement(accessSnapshot)) {
    return <EntitlementPreviewHome snapshot={accessSnapshot} />;
  }
  return <EntitledDashboardView />;
}

function EntitledDashboardView() {
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
    classes: operationalClasses,
    sessions: operationalSessions,
    status: operationalStatus,
    reload: reloadOperationalData,
  } = useOperationalData();
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
    programsLoaded &&
    recentActivityOwnerResolved &&
    isMasterFirstUser({
      studentCount: serverStudents.length,
      sessionCount: operationalSessions.length,
      recentLessonActivities: validLessonActivities,
      recentSpomoveActivities: validSpomoveActivities,
    });
  const [mounted, setMounted] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [previewAutoplay, setPreviewAutoplay] = useState(false);
  const [spomoveThumbnailPaths, setSpomoveThumbnailPaths] = useState<Record<string, string>>({});
  const [spomoveThumbnailCacheBust, setSpomoveThumbnailCacheBust] = useState<number | undefined>();
  const [spomoveContentMap, setSpomoveContentMap] = useState<Record<string, import('@/app/lib/spomove/spomoveOfficialAssets').SpomovePresetContentOverride>>({});
  const [spomoveContentLoadState, setSpomoveContentLoadState] = useState<SpomoveContentLoadState>('loading');
  const [featuredSpomoveSlotIds, setFeaturedSpomoveSlotIds] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [previewSpomove, setPreviewSpomove] = useState<OfficialSpomovePreset | null>(null);
  const guideVideo = useSpomoveGuideVideo(previewSpomove?.id ?? null, isPremium);

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
      supabase.from('think_asset_packs').select('assets_json').eq('id', SPOMOVE_CONTENT_PACK_ID).maybeSingle(),
      supabase
        .from('think_asset_packs')
        .select('assets_json')
        .eq('id', SPOMOVE_HOME_FEATURED_PACK_ID)
        .maybeSingle(),
    ])
      .then(([thumbnailResult, contentResult, featuredResult]) => {
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

        const { data: contentData, error: contentError } = contentResult as SpomoveContentPackQueryResult;
        if (contentError && contentError.code !== 'PGRST116') {
          setSpomoveContentMap({});
          setSpomoveContentLoadState('error');
        } else {
          setSpomoveContentMap(normalizeSpomoveContentMap(contentData?.assets_json));
          setSpomoveContentLoadState('ready');
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
        setSpomoveContentMap({});
        setSpomoveContentLoadState('error');
        setFeaturedSpomoveSlotIds([null, null, null, null]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const weeklySelection = useMemo(
    () =>
      selectWeeklyRecommendationSlots(programs, {
        isRecommendationEligible: (program) => !program.isPro && isProgramHomeRecommendationEligible(program),
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
  const programPool = useMemo(() => uniquePrograms(programs.filter((program) => !program.isPro)).sort(compareHomePrograms), [programs]);
  const weeklyPrograms = useMemo(
    () =>
      sortProgramsByAgeGroupPreference(
        ensureWeeklyRecommendationCount(weeklySelection.programs, programPool, WEEKLY_RECOMMENDATION_COUNT),
        profile?.ageGroups,
      ),
    [programPool, profile?.ageGroups, weeklySelection.programs],
  );
  const featuredSpomove = useMemo(
    () => resolveHomeFeaturedSpomove(featuredSpomoveSlotIds),
    [featuredSpomoveSlotIds],
  );

  const openPreview = (program: Program, autoplayVideo = false) => {
    setPreviewAutoplay(autoplayVideo);
    setSelectedProgram(program);
  };
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

  if (!mounted) return <DashboardSkeleton />;

  if (programsLoaded && programPool.length === 0 && operationalStatus === 'error') {
    const isUnauthorized = programsError === 'unauthorized';
    const isForbidden = programsError === 'forbidden';
    const message = isUnauthorized
      ? '로그인 후 수업 라이브러리를 불러올 수 있습니다.'
      : isForbidden
        ? '이용 기간이 종료되어 수업 라이브러리를 불러올 수 없습니다.'
        : programsError === 'network'
          ? '네트워크 문제로 수업 라이브러리를 불러오지 못했습니다. 연결 상태를 확인해 주세요.'
          : '수업 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto px-4 py-16" style={{ background: 'var(--spm-bg)' }}>
        <section className="w-full max-w-xl rounded-[22px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-6 text-center shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <h1 className="text-xl font-black text-[color:var(--spm-t)]">수업 라이브러리를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">{message}</p>
          {isUnauthorized ? (
            <Link href="/login?next=/spokedu-master/dashboard" className="spm-btn-primary mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-black focus-visible:outline-none">로그인하기</Link>
          ) : isForbidden ? (
            <Link href="/spokedu-master/subscription" className="spm-btn-primary mt-5 inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-black focus-visible:outline-none">다시 구독하기</Link>
          ) : (
            <button type="button" onClick={() => void reloadPrograms()} className="spm-btn-primary mt-5 inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-black focus-visible:outline-none">다시 시도</button>
          )}
        </section>
      </main>
    );
  }

  const continuityEntry = isFirstUser && operationalSessions.length === 0 ? null : (
    <HomeContinuityPanel
      sessions={operationalSessions}
      classes={operationalClasses}
      loading={operationalStatus === 'idle' || operationalStatus === 'loading'}
      error={operationalStatus === 'error'}
      onRetry={() => void reloadOperationalData()}
    />
  );

  return (
    <main className="mx-auto flex h-full w-full max-w-[1376px] flex-col gap-5 overflow-y-auto px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8" style={{ background: 'var(--spm-bg)' }}>
      <header className="relative px-0.5 pt-0.5 sm:px-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1
              className="max-w-xl whitespace-pre-line text-[32px] font-bold leading-[1.15] tracking-[-0.025em] text-[color:var(--spm-t)] md:text-[40px]"
              style={{ fontFamily: 'var(--spm-font-display, inherit)' }}
            >
              {'이번 주,\n어떤 수업을 해볼까요?'}
            </h1>
          </div>
          <Link
            href="/spokedu-master/activity"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 self-start text-[11px] font-bold text-slate-400 transition-colors hover:text-slate-700 sm:min-h-8 sm:self-auto"
          >
            수업 일정 보기
            <ArrowRight size={12} />
          </Link>
        </div>
      </header>

      {!isFirstUser ? continuityEntry : null}

      <section
        data-dashboard-section="featured-flow"
        aria-label="이번 주 수업 추천"
        className="relative overflow-hidden rounded-[16px] border border-slate-200/90 bg-white p-3 sm:p-3.5"
      >
        <section data-dashboard-section="weekly" aria-labelledby="weekly-heading" className="relative">
          <SectionHeader
            eyebrow="SPOKEDU WEEKLY PICK"
            eyebrowIcon={<BookOpen size={14} />}
            title="이번 주 SPOKEDU 추천"
            titleId="weekly-heading"
            size="lg"
            tone="feature"
            href="/spokedu-master/library"
            action="수업 더 보기"
          />
          {!programsLoaded ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">수업 콘텐츠를 불러오는 중입니다.</p>
          ) : weeklyPrograms.length > 0 ? (
            <div className="relative -mx-3.5 flex snap-x items-stretch gap-3.5 overflow-x-auto px-3.5 pb-2 [scrollbar-width:none] sm:-mx-4 sm:gap-4 sm:px-4 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
              {weeklyPrograms.map((program, index) => (
                <div key={program.id} className="h-full w-[78vw] max-w-[310px] shrink-0 snap-start [container-type:inline-size] md:w-auto md:max-w-none">
                  <WeeklyProgramCard
                    program={program}
                    onPreview={(item) => openPreview(item, programHasPlayableVideo(item))}
                    priority={index < 2}
                  />
                </div>
              ))}
            </div>
          ) : programsError ? (
            <div className="rounded-xl bg-rose-50 p-4 text-center">
              <p className="text-sm font-bold text-rose-700">수업 콘텐츠를 불러오지 못했습니다.</p>
              <button type="button" onClick={() => void reloadPrograms()} className="mt-2 min-h-11 px-3 text-sm font-black text-rose-700 underline underline-offset-2">다시 시도</button>
            </div>
          ) : (
            <div className="rounded-[18px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-5 text-center">
              <p className="text-[14px] font-semibold text-[color:var(--spm-t2)]">오늘 쓸 수업을 라이브러리에서 골라 보세요.</p>
              <Link href="/spokedu-master/library" className="spm-btn-primary mt-4 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-[13px] font-black focus-visible:outline-none">
                수업 라이브러리 열기
              </Link>
            </div>
          )}
        </section>
      </section>

      <section data-dashboard-section="spomove-extension" aria-labelledby="spomove-heading" className="border-t border-slate-200 pt-4">
          <SectionHeader
            eyebrow="SPOMOVE"
            eyebrowIcon={<MonitorPlay size={14} />}
            title={isPremium ? 'SPOMOVE로 확장하기' : 'SPOMOVE 둘러보기'}
            titleId="spomove-heading"
            description={isPremium ? '이번 주 수업에 화면 반응 활동을 더해 보세요.' : '활동을 둘러보고 Premium 실행 기능을 확인해 보세요.'}
            href="/spokedu-master/spomove"
            action="SPOMOVE 더 보기"
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {featuredSpomove.slice(0, 4).map((preset) => {
              const model = getSpomovePresetDisplayModel(preset, spomoveContentMap[preset.id]);
              const thumbnail = resolveSpomoveThumbnailUrl(spomoveThumbnailPaths[preset.id], spomoveThumbnailCacheBust);
              return <button key={preset.id} type="button" onClick={() => setPreviewSpomove(preset)} className="flex min-h-16 items-center gap-3 rounded-[12px] border border-slate-200 bg-white p-2 text-left hover:border-slate-300">
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[8px] bg-slate-900">{thumbnail ? <Image src={thumbnail} alt="" fill sizes="64px" className="object-cover" /> : null}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{model.displayTitle}</span><span className="mt-0.5 block text-xs text-slate-500">수업에 활동 더하기</span></span>
                <ArrowRight size={15} className="shrink-0 text-slate-400" />
              </button>;
            })}
          </div>
        </section>

      {!isFirstUser ? <HomeNextSessionPanel sessions={operationalSessions} classes={operationalClasses} /> : null}
      {isFirstUser ? <FirstStartGuide /> : null}

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
        contentOverride={previewSpomove ? spomoveContentMap[previewSpomove.id] : undefined}
        contentLoadState={spomoveContentLoadState}
        guideVideoUrl={guideVideo.url}
        guideVideoState={guideVideo.state}
        hubReturnHref="/spokedu-master/dashboard"
        onClose={() => setPreviewSpomove(null)}
      />
    </main>
  );
}
