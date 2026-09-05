'use client';

import {
  ArrowRight,
  CheckCircle2,
  FileText,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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
import { WeeklyEditorialCard } from '../components/lesson/WeeklyEditorialCard';
import { ProgramPreviewModal } from '../components/lesson/ProgramPreviewModal';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { buildHomeWeeklySupportMeta, splitLessonTitle } from '../lib/lessonDisplay';
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
  type RecentProgramActivity,
} from '../lib/recentProgramActivity';
import { getHomeSpomoveShelfCopy } from './homeSpomoveShelf';
import { HomeContinuityPanel, HomeNextSessionPanel } from './TodaySessionsPanel';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  publicOfficialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { SpomoveGuidelineSheet, type SpomoveContentLoadState } from '../spomove/SpomoveGuidelineSheet';
import { SPOMOVE_PAD_GRID_HEX } from '../spomove/spomovePadDisplay';
import { SpomoveLayeredThumb } from '../spomove/SpomoveLayeredThumb';
import { canReproduceSpomoveSameSettings } from '../spomove/movements/canReproduceSpomoveSameSettings';
import { MASTER_CONTEXT_ORIGIN } from '../lib/masterNavigationContext';
import { selectWeeklyRecommendationSlots } from '../lib/weeklyRecommendations';
import { useMasterAccessSnapshot } from '../access/MasterAccessProvider';
import { hasMasterEntitlement } from '../lib/masterAccessModel';
import { EntitlementPreviewHome } from './EntitlementPreviewHome';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useIsPremium, useMasterStore, useProfile } from '../store';
import type { Program } from '../types';
import { useSpomoveGuideVideo } from '../spomove/useSpomoveGuideVideo';
import {
  MV_CONTENT_TITLE,
  MV_EDITORIAL_WIDTH,
  MV_EXTENSION_TITLE,
  MV_HEADING_TO_SHELF,
  MV_HOME_DISPLAY,
  MV_HOME_START_QUIET,
  MV_META,
  MV_QUIET_ACTION,
  MV_REENTRY_IDENTITY,
  MV_REENTRY_OBJECT,
  MV_REENTRY_SECONDARY,
  MV_SECTION_COPY,
  MV_SECTION_TITLE,
} from '../lib/masterUiClasses';

type SpomoveThumbnailPackQueryResult = {
  data: { assets_json?: unknown; updated_at?: string | null } | null;
  error: { code?: string } | null;
};

type SpomoveContentPackQueryResult = { data: { assets_json?: unknown } | null; error: { code?: string } | null };

function getFirstStartPaths() {
  return [
    { title: '좋은 활동부터 찾아보기', description: '수업에 맞는 프로그램을 둘러보세요.', href: '/spokedu-master/programs' },
    { title: '수업부터 만들기', description: '수업반과 이번 주 일정을 한 번에 준비하세요.', href: '/spokedu-master/manage' },
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

function withDiscoveryReturn(href: string, returnTo: string, source: 'home') {
  const url = new URL(href, MASTER_CONTEXT_ORIGIN);
  url.searchParams.set('returnTo', returnTo);
  url.searchParams.set('source', source);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function usePreferredLaunchMode(): 'projector' | 'mobile' {
  const [mode, setMode] = useState<'projector' | 'mobile'>('projector');
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const apply = () => setMode(media.matches ? 'mobile' : 'projector');
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return mode;
}

function SectionHeader({
  title,
  description,
  href,
  action,
  titleId,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  titleId?: string;
}) {
  return (
    <div className={`${MV_HEADING_TO_SHELF} flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end sm:gap-3`}>
      <div className="min-w-0">
        <h2 id={titleId} className={MV_SECTION_TITLE}>
          {title}
        </h2>
        {description ? <p className={MV_SECTION_COPY}>{description}</p> : null}
      </div>
      {href && action ? (
        <Link href={href} className={MV_QUIET_ACTION}>
          {action}
          <ArrowRight size={15} />
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
  const titles = splitLessonTitle(model.title);
  const prep = program.equipment[0] ? formatLibraryCardEquipmentName(program.equipment[0]) : '';
  const supportMeta = buildHomeWeeklySupportMeta(program, { equipmentFallback: prep });

  return (
    <WeeklyEditorialCard
      title={titles.koreanTitle}
      heroImageUrl={model.heroImageUrl}
      category={model.theme || '체육 수업'}
      supportMeta={supportMeta}
      hasVideo={programHasPlayableVideo(program)}
      onPreview={() => onPreview(program)}
      priority={priority}
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
    >
      <h2 id="first-start-heading" className={MV_SECTION_TITLE}>
        첫 수업을 시작해 보세요
      </h2>
      <p className="mt-2 max-w-xl text-[15px] font-normal leading-6 text-slate-600">
        콘텐츠부터 찾아도, 수업부터 만들어도 같은 준비 흐름으로 이어집니다.
      </p>
      <div className="mt-5 grid gap-6 md:grid-cols-2 md:gap-10">
        {firstStartPaths.map(({ title, description, href }) => (
          <Link
            key={href}
            href={href}
            className="min-h-11 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
          >
            <span className={`${MV_CONTENT_TITLE} block`}>{title}</span>
            <span className={`${MV_META} mt-1.5 block`}>{description}</span>
            <span className={`${MV_QUIET_ACTION} mt-3`}>
              시작하기
              <ArrowRight size={15} aria-hidden="true" />
            </span>
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
  launchMode,
  priority = false,
}: {
  preset: OfficialSpomovePreset;
  thumbnailUrl: string;
  contentOverride?: import('@/app/lib/spomove/spomoveOfficialAssets').SpomovePresetContentOverride;
  onOpenGuide: (preset: OfficialSpomovePreset) => void;
  launchMode: 'projector' | 'mobile';
  priority?: boolean;
}) {
  const displayModel = getHomeSpomoveShelfCopy(preset, contentOverride);
  const startHref = withDiscoveryReturn(
    publicOfficialPresetSessionHref(preset, {
      entry: 'start',
      cueSeconds: preset.cueSeconds,
      mode: launchMode,
    }),
    '/spokedu-master/dashboard',
    'home',
  );

  return (
    <article data-spomove-preset={preset.id} className="flex h-full w-full min-w-0 flex-col">
      <button
        type="button"
        onClick={() => onOpenGuide(preset)}
        className="relative w-full overflow-hidden rounded-[16px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
        aria-label={`${displayModel.title} 활동 준비 열기`}
      >
        <SpomoveLayeredThumb
          src={thumbnailUrl}
          sizes="(min-width: 1280px) 290px, (min-width: 768px) 45vw, 82vw"
          priority={priority}
          className="!aspect-video rounded-[16px]"
          fallback={(
            <div className="grid h-full w-full grid-cols-2 gap-1.5 bg-slate-950 p-4" aria-hidden="true">
              {SPOMOVE_PAD_GRID_HEX.map((color) => (
                <span key={color} className="rounded-[8px] shadow-inner" style={{ background: color }} />
              ))}
            </div>
          )}
        />
      </button>
      <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
        {displayModel.typeLabel ? <p className={MV_META}>{displayModel.typeLabel}</p> : null}
        <h3 className={`${MV_EXTENSION_TITLE} mt-1`}>{displayModel.title}</h3>
        {displayModel.support ? <p className={`${MV_META} mt-2`}>{displayModel.support}</p> : null}
        <Link href={startHref} data-spm-spomove-card-action="start" className={`${MV_HOME_START_QUIET} mt-auto pt-2`}>
          활동 바로 시작
          <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

function RecentSpomoveReuseCard({
  activity,
  thumbnailUrl,
  onOpenGuide,
  launchMode,
}: {
  activity: RecentProgramActivity;
  thumbnailUrl: string;
  onOpenGuide: (preset: OfficialSpomovePreset) => void;
  launchMode: 'projector' | 'mobile';
}) {
  const preset = OFFICIAL_SPOMOVE_LIBRARY.find((item) => item.id === activity.programId) ?? null;
  const canReproduce = canReproduceSpomoveSameSettings(activity, preset);
  const snapshot = activity.spomoveSnapshot;
  const cueSeconds = snapshot?.cueSeconds ?? activity.cueSeconds ?? preset?.cueSeconds;
  const shelf = preset ? getHomeSpomoveShelfCopy(preset) : null;
  const displayTitle = shelf?.title ?? activity.programTitle;
  const contextLine = [
    shelf?.typeLabel,
    cueSeconds ? `자극 ${cueSeconds}초` : null,
  ].filter(Boolean).join(' · ');
  const recentHref = preset
    ? withDiscoveryReturn(
        canReproduce
          ? publicOfficialPresetSessionHref(preset, {
              entry: 'start',
              mode: launchMode,
              cueSeconds: snapshot?.cueSeconds ?? activity.cueSeconds,
              difficulty: snapshot?.difficultyValue ?? activity.difficultyValue,
              operation:
                snapshot && snapshot.operationLayerStatus !== 'legacyDisabled'
                  ? snapshot.operation
                  : null,
            })
          : publicOfficialPresetSessionHref(preset, {
              entry: 'start',
              mode: launchMode,
              cueSeconds: preset.cueSeconds,
            }),
        '/spokedu-master/dashboard',
        'home',
      )
    : `/spokedu-master/spomove/session?preset=${activity.programId}&mode=projector&sound=on&entry=start`;

  if (!preset) return null;

  return (
    <article data-dashboard-section="recent-spomove" className={MV_REENTRY_OBJECT}>
      <button
        type="button"
        onClick={() => onOpenGuide(preset)}
        className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[12px]"
        aria-label={`${displayTitle} 미리보기 열기`}
      >
        <SpomoveLayeredThumb
          src={thumbnailUrl}
          sizes="72px"
          className="!h-full !w-full !aspect-auto rounded-[12px]"
          fallback={(
            <div className="grid h-full w-full grid-cols-2 gap-1 bg-slate-950 p-1.5" aria-hidden="true">
              {SPOMOVE_PAD_GRID_HEX.map((color) => (
                <span key={color} className="rounded-[4px]" style={{ background: color }} />
              ))}
            </div>
          )}
        />
      </button>
      <div className={MV_REENTRY_IDENTITY}>
        <p className={`${MV_META} min-w-0 truncate`}>최근 사용한 활동</p>
        <button
          type="button"
          onClick={() => onOpenGuide(preset)}
          className={`${MV_CONTENT_TITLE} mt-0.5 block w-full truncate text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]`}
        >
          {displayTitle}
        </button>
        {contextLine ? <p className={`${MV_META} mt-0.5 truncate`}>{contextLine}</p> : null}
      </div>
      <Link
        href={recentHref}
        data-spm-spomove-recent-action="rerun"
        data-spm-spomove-recent-reproduce={canReproduce ? '1' : '0'}
        className={`${MV_REENTRY_SECONDARY} ml-[84px] sm:ml-0`}
      >
        다시 시작
        <ArrowRight size={15} aria-hidden />
      </Link>
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
          <p className="text-[12px] font-medium text-slate-400">참고</p>
          <h2 id="activity-heading" className="mt-0.5 text-[13px] font-semibold text-slate-600">기록 · 안내문</h2>
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
          <h2 id="activity-heading" className="text-[18px] font-semibold text-[color:var(--spm-t)]">수업 기록</h2>
          <p className="mt-1 text-[13px] font-semibold text-[color:var(--spm-t2)]">완료한 수업의 안내문과 학생 이력을 확인하세요.</p>
        </div>
        <Link href="/spokedu-master/profile" className="inline-flex min-h-9 items-center rounded-full bg-[var(--spm-acc-glow)] px-3 text-[12px] font-semibold text-[var(--spm-acc)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]">
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
              <span className="mt-0.5 inline-flex items-center gap-1 text-[15px] font-semibold text-[color:var(--spm-t)]">
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
  const launchMode = usePreferredLaunchMode();

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
  const latestSpomoveActivity = useMemo(() => {
    return [...validSpomoveActivities].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0] ?? null;
  }, [validSpomoveActivities]);

  const openPreview = (program: Program, autoplayVideo = false) => {
    setPreviewAutoplay(autoplayVideo);
    setSelectedProgram(program);
  };
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && programsLoaded && programPool.length >= 4 && weeklyPrograms.length < 4) {
      console.warn('[SPOKEDU MASTER] Weekly recommendations could not be filled to four items.');
    }
    if (process.env.NODE_ENV !== 'production' && weeklySelection.slotConflicts.length > 0) {
      console.warn('[SPOKEDU MASTER] Conflicting explicit weekly slots.', weeklySelection.slotConflicts);
    }
    if (process.env.NODE_ENV !== 'production' && weeklySelection.slotDiagnostics.length > 0) {
      console.warn('[SPOKEDU MASTER] Weekly recommendation slot diagnostics.', weeklySelection.slotDiagnostics);
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
      <main className={`${MV_EDITORIAL_WIDTH} flex h-full items-center justify-center overflow-y-auto px-4 py-16`} style={{ background: 'var(--spm-bg)' }}>
        <section className="w-full max-w-xl text-center">
          <h1 className={MV_SECTION_TITLE}>수업 라이브러리를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-[15px] font-normal leading-6 text-slate-600">{message}</p>
          {isUnauthorized ? (
            <Link href="/login?next=/spokedu-master/dashboard" className="spm-btn-primary mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold focus-visible:outline-none">로그인하기</Link>
          ) : isForbidden ? (
            <Link href="/spokedu-master/subscription" className="spm-btn-primary mt-5 inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[14px] font-semibold focus-visible:outline-none">다시 구독하기</Link>
          ) : (
            <button type="button" onClick={() => void reloadPrograms()} className="spm-btn-primary mt-5 inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[14px] font-semibold focus-visible:outline-none">다시 시도</button>
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
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-12">
      <section data-dashboard-chapter="opening" className="px-4 pb-10 pt-5 sm:px-6 lg:pb-11 lg:pt-6">
        <div className={MV_EDITORIAL_WIDTH}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className={MV_HOME_DISPLAY} style={{ fontFamily: 'var(--spm-font-display, inherit)' }}>
          {'이번 주,\n어떤 수업을 해볼까요?'}
        </h1>
        <Link href="/spokedu-master/activity" className={`${MV_QUIET_ACTION} shrink-0`}>
          수업 일정 보기
          <ArrowRight size={15} />
        </Link>
      </header>

      <div className="mt-6 flex flex-col gap-3 empty:hidden">
        {!isFirstUser ? continuityEntry : null}
        {latestSpomoveActivity ? (
          <RecentSpomoveReuseCard
            activity={latestSpomoveActivity}
            thumbnailUrl={resolveSpomoveThumbnailUrl(
              spomoveThumbnailPaths[latestSpomoveActivity.programId],
              spomoveThumbnailCacheBust,
            )}
            onOpenGuide={setPreviewSpomove}
            launchMode={launchMode}
          />
        ) : null}
        {!isFirstUser ? <HomeNextSessionPanel sessions={operationalSessions} classes={operationalClasses} /> : null}
        {isFirstUser ? <FirstStartGuide /> : null}
      </div>
        </div>
      </section>

      <section
        data-dashboard-section="featured-flow"
        aria-label="이번 주 수업 추천"
        className="bg-white px-4 py-11 sm:px-6 lg:pb-14 lg:pt-12"
      >
        <div className={MV_EDITORIAL_WIDTH}>
        <section data-dashboard-section="weekly" aria-labelledby="weekly-heading">
          <SectionHeader
            title="이번 주 SPOKEDU 추천"
            titleId="weekly-heading"
            href="/spokedu-master/library"
            action="수업 더 보기"
          />
          {!programsLoaded ? (
            <p className="text-[15px] text-slate-500">수업 콘텐츠를 불러오는 중입니다.</p>
          ) : weeklyPrograms.length > 0 ? (
            <div className="relative -mx-4 flex snap-x snap-mandatory items-start gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:gap-6 lg:px-0 [&::-webkit-scrollbar]:hidden">
              {weeklyPrograms.map((program, index) => (
                <div key={program.id} className="w-[82vw] max-w-[340px] shrink-0 snap-start md:w-auto md:max-w-none">
                  <WeeklyProgramCard
                    program={program}
                    onPreview={(item) => openPreview(item, programHasPlayableVideo(item))}
                    priority={index < 2}
                  />
                </div>
              ))}
            </div>
          ) : programsError ? (
            <div>
              <p className="text-[15px] text-rose-700">수업 콘텐츠를 불러오지 못했습니다.</p>
              <button type="button" onClick={() => void reloadPrograms()} className="mt-2 min-h-11 px-3 text-[14px] font-semibold text-rose-700 underline underline-offset-2">다시 시도</button>
            </div>
          ) : (
            <div>
              <p className="text-[15px] text-slate-600">오늘 쓸 수업을 라이브러리에서 골라 보세요.</p>
              <Link href="/spokedu-master/library" className="spm-btn-primary mt-4 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-[14px] font-semibold focus-visible:outline-none">
                수업 라이브러리 열기
              </Link>
            </div>
          )}
        </section>
        </div>
      </section>

      <section
        data-dashboard-section="spomove-extension"
        aria-labelledby="spomove-heading"
        className="w-full border-t border-slate-200/70 bg-[var(--spm-s2)] px-4 pb-14 pt-11 sm:px-6 lg:pb-14 lg:pt-12"
      >
        <div className={MV_EDITORIAL_WIDTH}>
        <SectionHeader
          title="SPOMOVE로 확장하기"
          titleId="spomove-heading"
          description="놀이체육을 디지털 자극 활동으로 확장합니다."
          href="/spokedu-master/spomove"
          action="SPOMOVE 더 보기"
        />
        <div className="-mx-4 flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:gap-6 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {featuredSpomove.slice(0, 4).map((preset) => {
            const thumbnail = resolveSpomoveThumbnailUrl(spomoveThumbnailPaths[preset.id], spomoveThumbnailCacheBust);
            return (
              <div key={preset.id} className="flex h-auto w-[82vw] max-w-[340px] shrink-0 snap-start md:h-full md:w-auto md:max-w-none">
                <SpomoveCard
                  preset={preset}
                  thumbnailUrl={thumbnail}
                  contentOverride={spomoveContentMap[preset.id]}
                  onOpenGuide={setPreviewSpomove}
                  launchMode={launchMode}
                />
              </div>
            );
          })}
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
