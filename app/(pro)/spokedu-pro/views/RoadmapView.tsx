'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Zap,
  RefreshCw,
  Package,
  ChevronRight,
  ChevronLeft,
  MonitorPlay,
  TrendingUp,
  LayoutGrid,
  Users,
} from 'lucide-react';
import { useSpokeduProDashboard } from '../hooks/useSpokeduProDashboard';
import { useClassStore } from '../hooks/useClassStore';
import {
  DEFAULT_DASHBOARD_V4,
  getProgramTitle,
  PROGRAM_BANK,
  DASHBOARD_ROW1_GROUP_LABEL,
  type ThemeKey,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import { OttB2bRoadmapShell } from './roadmap/OttB2bRoadmapShell';
import type { OttFeaturedProgram, OttMetric } from './roadmap/OttB2bRoadmapShell';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import type { ProgramDetail } from '../types';
import { stripMonthWeekPrefix } from '@/app/lib/spokedu-pro/titleSanitizer';
import TodayClassCard from './roadmap/TodayClassCard';
import { extractEquipmentDisplayTags, isEquipmentCatalogItem } from '@/app/lib/spokedu-pro/programClassification';
import {
  LESSON_PACKAGE_KEY_LABELS,
  LESSON_PACKAGE_KEY_ORDER,
  isLessonPackageKeyId,
  type LessonPackageKeyId,
} from '@/app/lib/spokedu-pro/lessonPackageKeys';
import type { ProgramLessonDetail } from '@/app/lib/spokedu-pro/programLessonDetail';
import type { SpokeduProOpenDetailContext } from '../programDrawerContext';

type FeaturedProgramApiRow = {
  id: number;
  title: string;
  video_url?: string | null;
  function_type?: string | null;
  function_types?: string[] | null;
  main_theme?: string | null;
  group_size?: string | null;
  lesson_detail?: ProgramLessonDetail | null;
};

type ScreenplayRow = {
  id: number | string;
  modeId?: string;
  title?: string;
  subtitle?: string;
  thumbnailUrl?: string;
};

const SCREENPLAYS_TTL_MS = 2 * 60 * 1000;
let screenplaysCache:
  | { ts: number; data: ScreenplayRow[]; error: string | null }
  | null = null;

const SPOTLIGHT_TTL_MS = 2 * 60 * 1000;
let spotlightCache:
  | {
      ts: number;
      equipment: string;
      data: SpotlightApiRow[];
      error: string | null;
    }
  | null = null;

function scheduleIdle(fn: () => void) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(fn, { timeout: 1200 });
    return;
  }
  window.setTimeout(fn, 200);
}

function SectionHeader({
  icon,
  title,
  sub,
  badge,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string | null;
  badge?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950/80 px-4 py-3.5 md:px-5 md:py-4">
      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-sky-500/12 blur-2xl" />
      <div className="pointer-events-none absolute -left-6 bottom-0 h-16 w-20 rounded-full bg-violet-500/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-2.5 md:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/90 text-slate-100 ring-1 ring-white/10">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[1.04rem] font-black tracking-tight text-white md:text-[1.08rem] lg:text-[1.16rem]">
              {title}
              {sub ? <span className="ml-2 text-xs md:text-[13px] lg:text-sm font-semibold text-slate-400">· {sub}</span> : null}
            </h3>
            {badge ? (
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{badge}</p>
            ) : null}
          </div>
        </div>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-800/85 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
          >
            {action.label}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** 모바일=넷플릭스형 가로 스냅, 웹=4열 고정 그리드 */
function DashboardPosterRow({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(240, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className="-mx-6 lg:-mx-12 px-6 lg:px-12 relative" role="region" aria-label={ariaLabel}>
      {/* 좌우 페이드 마스크: 모바일에서만 */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[var(--sp-pro-bg)] to-transparent md:hidden" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[var(--sp-pro-bg)] to-transparent md:hidden" />

      <button
        type="button"
        aria-label="이전"
        onClick={() => scrollByCard(-1)}
        className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 z-[5] h-9 w-9 rounded-full bg-slate-900/80 border border-slate-700/70 text-slate-100 flex items-center justify-center shadow-lg"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="다음"
        onClick={() => scrollByCard(1)}
        className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 z-[5] h-9 w-9 rounded-full bg-slate-900/80 border border-slate-700/70 text-slate-100 flex items-center justify-center shadow-lg"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div
        ref={scrollerRef}
        className="flex w-max flex-row gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain pb-2 scroll-smooth snap-x snap-mandatory touch-pan-x [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent md:grid md:w-full md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-3 lg:gap-4 md:overflow-visible md:snap-none md:touch-auto md:pb-0"
      >
        {children}
      </div>
    </div>
  );
}

const POSTER_CELL = 'snap-start shrink-0 w-[min(88vw,340px)] sm:w-[300px] md:w-auto md:shrink md:snap-none';

type SpotlightApiRow = { id?: number; title?: string; video_url?: string | null };

function SpotlightProgramCard({
  programId,
  title,
  videoUrl,
  equipmentLabel,
  programDetail,
  onOpen,
}: {
  programId: number;
  title: string;
  videoUrl?: string | null;
  equipmentLabel: string;
  programDetail?: ProgramDetail | null;
  onOpen: () => void;
}) {
  const tr = useTranslator();
  const prog = PROGRAM_BANK.find((p) => p.id === programId);
  const gradient = prog?.gradient ?? 'from-violet-500 to-fuchsia-600';
  const displayTitle = programDetail?.title ?? title;
  const thumb = programDetail?.videoUrl ?? videoUrl ?? null;
  const thumbnailUrl = thumb ? getYouTubeThumbnailUrl(String(thumb)) : null;
  return (
    <div
      className="media-card relative w-full aspect-[16/9] md:aspect-[4/3] lg:aspect-[16/9] overflow-hidden group cursor-pointer rounded-[1rem] border border-slate-700/70 bg-slate-900/55 shadow-[0_16px_34px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.04]"
      onClick={onOpen}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="thumb-grade absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center`}
        >
          <span className="text-6xl text-white/90">▶</span>
        </div>
      )}
      <div className="relative absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/58 to-transparent p-4 md:p-5 flex flex-col justify-end">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_42%)] opacity-35" />
        <div className="flex gap-1.5 mb-2 opacity-90">
          <span className="text-[10px] font-black text-amber-100 px-2 py-0.5 bg-black/55 rounded-full border border-amber-400/30">
            {equipmentLabel}
          </span>
        </div>
        <h4 className="relative text-white font-black text-[1.02rem] md:text-[1.06rem] lg:text-[1.15rem] leading-tight line-clamp-2">{displayTitle}</h4>
        <div className="pointer-events-none hidden md:flex absolute bottom-4 right-4 opacity-0 md:group-hover:opacity-100 transition-opacity">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-100 shadow-sm">
            <span className="text-slate-200">▶</span> {tr('열기')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RoadmapView({
  onOpenDetail,
  onGoToLibrary,
  isEditMode = false,
  programDetails = {},
  onStartTodayClass,
  onOpenPostClass,
  onGoToAIReportFromToday,
  onAddClassFromToday,
  onGoToAssistantTools,
  onOpenPlanBilling,
  programLibraryCount = 0,
  programLibraryReady = false,
}: {
  onOpenDetail: (id: number, context?: SpokeduProOpenDetailContext) => void;
  onGoToLibrary?: (
    themeKey?: ThemeKey,
    preset?: string,
    extra?: { packageKey?: string; featuredLesson?: boolean }
  ) => void;
  isEditMode?: boolean;
  programDetails?: Record<string, ProgramDetail>;
  onStartTodayClass?: () => void;
  onOpenPostClass?: (className: string) => void;
  onGoToAIReportFromToday?: () => void;
  onAddClassFromToday?: () => void;
  onGoToAssistantTools?: () => void;
  onOpenPlanBilling?: () => void;
  /** 상위에서 이미 불러온 본편 프로그램 목록 길이(중복 fetch 방지) */
  programLibraryCount?: number;
  programLibraryReady?: boolean;
}) {
  const tr = useTranslator();
  const { data, loading, error, fetchDashboard } = useSpokeduProDashboard();
  const { classes, loaded: classesLoaded } = useClassStore();
  const [screenplays, setScreenplays] = useState<ScreenplayRow[]>([]);
  const [screenplaysError, setScreenplaysError] = useState<string | null>(null);
  const [screenplaysLoading, setScreenplaysLoading] = useState(true);
  const [screenplaysFetchKey, setScreenplaysFetchKey] = useState(0);
  const [spotlightPrograms, setSpotlightPrograms] = useState<SpotlightApiRow[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightError, setSpotlightError] = useState<string | null>(null);
  const [spotlightFetchKey, setSpotlightFetchKey] = useState(0);
  const [featuredPrograms, setFeaturedPrograms] = useState<FeaturedProgramApiRow[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredFetchErr, setFeaturedFetchErr] = useState(false);
  const [packageTotals, setPackageTotals] = useState<Partial<Record<LessonPackageKeyId, number>>>({});

  useEffect(() => {
    const controller = new AbortController();
    setFeaturedLoading(true);
    setFeaturedFetchErr(false);
    scheduleIdle(() => {
      fetch('/api/spokedu-pro/programs?featuredLesson=1&limit=6', {
        credentials: 'include',
        signal: controller.signal,
      })
        .then((res) => res.json().then((json) => ({ res, json })))
        .then(({ res, json }) => {
          if (controller.signal.aborted) return;
          if (!res.ok || !Array.isArray(json?.data)) {
            setFeaturedPrograms([]);
            setFeaturedFetchErr(true);
            return;
          }
          setFeaturedPrograms(json.data as FeaturedProgramApiRow[]);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setFeaturedPrograms([]);
            setFeaturedFetchErr(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setFeaturedLoading(false);
        });
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (isEditMode) {
      setPackageTotals({});
      return;
    }
    let cancelled = false;
    scheduleIdle(() => {
      void Promise.all(
        LESSON_PACKAGE_KEY_ORDER.map(async (id) => {
          try {
            const res = await fetch(`/api/spokedu-pro/programs?packageKey=${encodeURIComponent(id)}&limit=1`, {
              credentials: 'include',
            });
            const json = (await res.json().catch(() => ({}))) as { total?: number };
            const total = typeof json.total === 'number' ? json.total : 0;
            return [id, total] as const;
          } catch {
            return [id, 0] as const;
          }
        })
      ).then((pairs) => {
        if (cancelled) return;
        setPackageTotals(Object.fromEntries(pairs) as Partial<Record<LessonPackageKeyId, number>>);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isEditMode]);

  useEffect(() => {
    const handler = () => fetchDashboard();
    window.addEventListener('spokedu-pro-dashboard-saved', handler);
    return () => window.removeEventListener('spokedu-pro-dashboard-saved', handler);
  }, [fetchDashboard]);

  useEffect(() => {
    const handler = () => setScreenplaysFetchKey((k) => k + 1);
    window.addEventListener('spokedu-pro-screenplays-synced', handler);
    return () => window.removeEventListener('spokedu-pro-screenplays-synced', handler);
  }, []);

  useEffect(() => {
    const cached = screenplaysCache;
    if (cached && Date.now() - cached.ts < SCREENPLAYS_TTL_MS) {
      setScreenplays(cached.data);
      setScreenplaysError(cached.error);
      setScreenplaysLoading(false);
      return;
    }

    const controller = new AbortController();
    setScreenplaysLoading(true);
    setScreenplaysError(null);

    scheduleIdle(() => {
      fetch('/api/spokedu-pro/screenplays', { credentials: 'include', signal: controller.signal })
        .then(async (res) => {
          const json = (await res.json().catch(() => ({}))) as { screenplays?: unknown; error?: string };
          if (controller.signal.aborted) return;
          if (!res.ok) {
            const err = json.error ?? `HTTP ${res.status}`;
            setScreenplays([]);
            setScreenplaysError(err);
            screenplaysCache = { ts: Date.now(), data: [], error: err };
            return;
          }
          const rows = Array.isArray(json.screenplays) ? (json.screenplays as ScreenplayRow[]) : [];
          setScreenplays(rows);
          setScreenplaysError(null);
          screenplaysCache = { ts: Date.now(), data: rows, error: null };
        })
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          const msg = e instanceof Error ? e.message : 'Network error';
          setScreenplays([]);
          setScreenplaysError(msg);
          screenplaysCache = { ts: Date.now(), data: [], error: msg };
        })
        .finally(() => {
          if (!controller.signal.aborted) setScreenplaysLoading(false);
        });
    });

    return () => controller.abort();
  }, [screenplaysFetchKey]);

  const retryScreenplays = useCallback(() => {
    setScreenplaysFetchKey((k) => k + 1);
  }, []);

  const dashboard = data ?? DEFAULT_DASHBOARD_V4;
  const { weekTheme } = dashboard;
  const spotlightConfig = dashboard.equipmentSpotlight;
  const spotlightEquipment =
    spotlightConfig && isEquipmentCatalogItem(spotlightConfig.equipmentCatalogItem)
      ? spotlightConfig.equipmentCatalogItem
      : null;

  useEffect(() => {
    const bump = () => setSpotlightFetchKey((k) => k + 1);
    window.addEventListener('spokedu-pro-dashboard-saved', bump);
    return () => window.removeEventListener('spokedu-pro-dashboard-saved', bump);
  }, []);

  useEffect(() => {
    if (spotlightConfig === null || !spotlightEquipment) {
      setSpotlightPrograms([]);
      setSpotlightLoading(false);
      setSpotlightError(null);
      return;
    }

    const cached = spotlightCache;
    if (
      cached &&
      cached.equipment === spotlightEquipment &&
      Date.now() - cached.ts < SPOTLIGHT_TTL_MS
    ) {
      setSpotlightPrograms(cached.data);
      setSpotlightError(cached.error);
      setSpotlightLoading(false);
      return;
    }

    const controller = new AbortController();
    setSpotlightLoading(true);
    setSpotlightError(null);
    const params = new URLSearchParams();
    params.set('limit', '16');
    params.set('only_curriculum', '1');
    params.set('function_type', '협응력');
    params.set('main_theme', '협동형');
    params.set('group_size', '소그룹');
    params.set('equipment', spotlightEquipment);

    scheduleIdle(() => {
      fetch(`/api/spokedu-pro/programs?${params.toString()}`, {
        credentials: 'include',
        signal: controller.signal,
      })
        .then(async (res) => {
          const json = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string };
          if (controller.signal.aborted) return;
          if (!res.ok) {
            const err = json.error ?? `HTTP ${res.status}`;
            setSpotlightPrograms([]);
            setSpotlightError(err);
            spotlightCache = { ts: Date.now(), equipment: spotlightEquipment, data: [], error: err };
            return;
          }
          const rows = Array.isArray(json.data) ? (json.data as SpotlightApiRow[]) : [];
          const sliced = rows.slice(0, 4);
          setSpotlightPrograms(sliced);
          setSpotlightError(null);
          spotlightCache = { ts: Date.now(), equipment: spotlightEquipment, data: sliced, error: null };
        })
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          const msg = e instanceof Error ? e.message : 'Network error';
          setSpotlightPrograms([]);
          setSpotlightError(msg);
          spotlightCache = { ts: Date.now(), equipment: spotlightEquipment, data: [], error: msg };
        })
        .finally(() => {
          if (!controller.signal.aborted) setSpotlightLoading(false);
        });
    });

    return () => controller.abort();
  }, [spotlightConfig, spotlightEquipment, spotlightFetchKey]);

  const openWithContext = (programId: number, role?: string, themeKey?: string) => {
    onOpenDetail(programId, { role, themeKey });
  };

  const firstScreenplay = screenplays[0];
  const numericScreenplayId =
    firstScreenplay != null ? Number(firstScreenplay.id) : NaN;
  const canOpenScreenplay = Number.isFinite(numericScreenplayId) && numericScreenplayId > 0;

  const screenplaysMetricReady = !screenplaysLoading;
  const curationMetricReady = data !== null;
  const curationItemTotal =
    data !== null ? data.weekTheme.items.length + data.row2.items.length : 0;

  const POSTER_PALETTES = [
    { accent: 'from-fuchsia-400 to-cyan-300', gradient: 'from-fuchsia-600/80 via-indigo-700/70 to-cyan-500/70' },
    { accent: 'from-emerald-300 to-lime-300', gradient: 'from-emerald-600/80 via-teal-700/70 to-lime-500/70' },
    { accent: 'from-orange-300 to-rose-300', gradient: 'from-orange-600/80 via-red-700/70 to-rose-500/70' },
    { accent: 'from-sky-300 to-violet-300', gradient: 'from-sky-600/80 via-blue-700/70 to-violet-500/70' },
    { accent: 'from-yellow-300 to-orange-300', gradient: 'from-yellow-500/80 via-amber-700/70 to-orange-500/70' },
  ] as const;

  const fmtMetric = (ready: boolean, n: number) => (!ready ? '—' : String(n));

  const buildFunctionalMoveMetaSlots = useCallback(
    (programId: number) => {
      const d = programDetails[String(programId)];
      const theme = String(d?.mainTheme ?? '').trim();
      const fnFirst = (Array.isArray(d?.functionTypes) ? d.functionTypes.filter(Boolean) : [d?.functionType])
        .filter((x): x is string => typeof x === 'string' && String(x).trim() !== '')[0];
      const eqFirst = extractEquipmentDisplayTags(d?.equipment ?? '')[0]?.trim() ?? '';
      const dash = '—';
      return [
        { label: tr('활동 테마'), value: theme || dash },
        { label: tr('신체 기능'), value: fnFirst?.trim() || dash },
        { label: tr('활용 교구'), value: eqFirst || dash },
      ];
    },
    [programDetails, tr]
  );

  const ottMetrics: OttMetric[] = useMemo(
    () => [
      {
        label: tr('프로그램 라이브러리'),
        value: fmtMetric(programLibraryReady, programLibraryCount),
        change: '+0%',
        icon: MonitorPlay,
      },
      {
        label: tr('운영 중인 반'),
        value: fmtMetric(classesLoaded, classes.length),
        change: '+0명',
        icon: Users,
      },
      {
        label: tr('주간 추천 구성'),
        value: fmtMetric(curationMetricReady, curationItemTotal),
        change: '+0%',
        icon: TrendingUp,
      },
      {
        label: tr('SPOMOVE 반응훈련'),
        value: fmtMetric(screenplaysMetricReady, screenplays.length),
        change: '+0',
        icon: LayoutGrid,
      },
    ],
    [
      tr,
      programLibraryReady,
      programLibraryCount,
      classesLoaded,
      classes.length,
      curationMetricReady,
      curationItemTotal,
      screenplaysMetricReady,
      screenplays.length,
    ]
  );

  /** 기존 대시보드와 동일: Row1 상위 3슬롯 + 스크린플레이 1슬롯(최대 4). 교구 스포트라이트는 하단 전용 섹션. */
  const featuredOttPrograms: OttFeaturedProgram[] = useMemo(() => {
    const out: OttFeaturedProgram[] = [];
    let idx = 0;
    const row1 = weekTheme.items.slice(0, 3);
    for (const item of row1) {
      const pal = POSTER_PALETTES[idx % POSTER_PALETTES.length];
      const rawTitle = programDetails[String(item.programId)]?.title ?? getProgramTitle(item.programId);
      const videoUrl = programDetails[String(item.programId)]?.videoUrl ?? null;
      const thumbnailUrl = videoUrl ? getYouTubeThumbnailUrl(String(videoUrl)) : null;
      out.push({
        id: item.programId,
        title: tr(rawTitle),
        category: tr(item.role),
        metaSlots: buildFunctionalMoveMetaSlots(item.programId),
        tag: idx === 0 ? tr(weekTheme.badge) : tr(item.role),
        accent: pal.accent,
        gradient: pal.gradient,
        thumbnailUrl,
      });
      idx++;
    }
    if (firstScreenplay && canOpenScreenplay) {
      const pal = POSTER_PALETTES[idx % POSTER_PALETTES.length];
      const screenplayVideoUrl =
        programDetails[String(numericScreenplayId)]?.videoUrl ?? null;
      const screenplayThumbnailUrl =
        firstScreenplay.thumbnailUrl ??
        (screenplayVideoUrl ? getYouTubeThumbnailUrl(String(screenplayVideoUrl)) : null);
      out.push({
        id: numericScreenplayId,
        title: tr(firstScreenplay.title ?? 'SPOMOVE'),
        category: tr('SPOMOVE 반응훈련'),
        metaSlots: [
          { label: tr('인지영역'), value: tr('인지') },
          { label: tr('과제유형'), value: tr(String(firstScreenplay.modeId ?? 'SPOMOVE')) },
          { label: tr('레벨'), value: tr(String(firstScreenplay.subtitle ?? '—')) },
        ],
        tag: tr('SPOMOVE'),
        accent: pal.accent,
        gradient: pal.gradient,
        thumbnailUrl: screenplayThumbnailUrl,
        isScreenplay: true,
      });
    }
    return out;
  }, [
    weekTheme.items,
    weekTheme.badge,
    programDetails,
    tr,
    firstScreenplay,
    canOpenScreenplay,
    numericScreenplayId,
    classes.length,
    buildFunctionalMoveMetaSlots,
  ]);

  const spotlightOttPrograms: OttFeaturedProgram[] = useMemo(() => {
    if (!spotlightConfig || !spotlightEquipment) return [];
    return spotlightPrograms
      .flatMap((row, idx) => {
        const id = Number(row.id);
        if (!Number.isFinite(id) || id <= 0) return [];
        const pal = POSTER_PALETTES[idx % POSTER_PALETTES.length];
        const rawTitle = programDetails[String(id)]?.title ?? String(row.title ?? '').trim() ?? getProgramTitle(id);
        const videoUrl = programDetails[String(id)]?.videoUrl ?? row.video_url ?? null;
        const thumbnailUrl = videoUrl ? getYouTubeThumbnailUrl(String(videoUrl)) : null;
        const item: OttFeaturedProgram = {
          id,
          title: tr(rawTitle),
          category: tr('교구 추천'),
          metaSlots: buildFunctionalMoveMetaSlots(id),
          tag: spotlightEquipment,
          accent: pal.accent,
          gradient: pal.gradient,
          thumbnailUrl,
        };
        return [item];
      })
      .slice(0, 4);
  }, [
    spotlightConfig,
    spotlightEquipment,
    spotlightPrograms,
    programDetails,
    tr,
    classes.length,
    buildFunctionalMoveMetaSlots,
  ]);

  const onOpenFeatured = useCallback(
    (p: OttFeaturedProgram) => {
      if (p.isScreenplay && canOpenScreenplay && firstScreenplay) {
        onOpenDetail(numericScreenplayId, {
          screenplay: true,
          themeKey: 'cognitive',
          row: {
            id: numericScreenplayId,
            title: firstScreenplay.title,
            mode_id: firstScreenplay.modeId ?? null,
            thumbnail_url: firstScreenplay.thumbnailUrl ?? null,
          },
        });
        return;
      }
      onOpenDetail(p.id, { themeKey: 'co-op' });
    },
    [canOpenScreenplay, firstScreenplay, numericScreenplayId, onOpenDetail]
  );

  // 요청: "오늘의 수업" 블록은 일단 숨김
  const todaySlot = null;

  const visiblePackageKeysAdmin: LessonPackageKeyId[] = [...LESSON_PACKAGE_KEY_ORDER];

  /** 관리자: 대표 수업안 블록 표시 여부 */
  const showFeaturedBlock = isEditMode || featuredPrograms.length > 0;

  const threeAxisCards = !isEditMode ? (
    <div className="space-y-4">
      <p className="mx-auto max-w-xl text-center text-sm font-medium leading-relaxed text-slate-300 sm:text-base px-2">
        {tr('오늘 수업 준비는 아래 세 가지에서 시작하면 돼요.')}
      </p>
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="flex flex-col rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-4 shadow-lg shadow-black/20 md:p-5">
          <h3 className="text-base font-black text-white md:text-lg">{tr('프로그램 라이브러리')}</h3>
          <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400 md:text-sm">
            {tr('영상과 핵심 진행법 중심으로 수업 프로그램을 빠르게 확인하세요.')}
          </p>
          <button
            type="button"
            onClick={() => onGoToLibrary?.('co-op')}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-center text-xs font-black text-white transition hover:bg-emerald-500 md:text-sm"
          >
            {tr('라이브러리 보기')}
          </button>
        </div>
        <div className="flex flex-col rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4 shadow-lg shadow-black/20 md:p-5">
          <h3 className="text-base font-black text-white md:text-lg">{tr('SPOMOVE 반응훈련')}</h3>
          <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400 md:text-sm">
            {tr('수업 전 집중 전환이나 반응훈련이 필요할 때 화면을 띄워 바로 실행하세요.')}
          </p>
          <button
            type="button"
            onClick={() => onGoToLibrary?.('cognitive')}
            className="mt-4 w-full rounded-xl border border-cyan-500/40 bg-cyan-950/50 py-2.5 text-center text-xs font-black text-cyan-50 transition hover:bg-cyan-900/60 md:text-sm"
          >
            {tr('SPOMOVE 모음 보기')}
          </button>
        </div>
        <div className="flex flex-col rounded-2xl border border-violet-500/20 bg-slate-950/60 p-4 shadow-lg shadow-black/20 md:p-5">
          <h3 className="text-base font-black text-white md:text-lg">{tr('성장 리포트')}</h3>
          <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400 md:text-sm">
            {tr('수업 가치를 학부모·기관에 설명할 때 활용해 보세요.')}
          </p>
          <button
            type="button"
            onClick={() => {
              if (onGoToAIReportFromToday) onGoToAIReportFromToday();
              else onGoToAssistantTools?.();
            }}
            className="mt-4 w-full rounded-xl bg-violet-600 py-2.5 text-center text-xs font-black text-white transition hover:bg-violet-500 md:text-sm"
          >
            {tr('성장 리포트 열기')}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section className="pb-32 pt-0 mt-0">
      {error ? (
        <div className="px-5 py-4 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 sm:flex-row sm:items-center">
            <span className="flex-1">{tr('이번 주 추천을 불러오지 못했어요.')}</span>
            <button
              type="button"
              onClick={() => fetchDashboard()}
              className="shrink-0 rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition-colors hover:bg-red-500"
            >
              {tr('다시 시도')}
            </button>
          </div>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="px-5 py-6 text-center text-zinc-400 lg:px-8">{tr('대시보드 불러오는 중...')}</div>
      ) : null}

      {!error && threeAxisCards ? (
        <div className="mx-auto max-w-[1600px] space-y-3 px-5 pb-4 text-white lg:px-8">{threeAxisCards}</div>
      ) : null}

      {!error && isEditMode && showFeaturedBlock ? (
        <div className="mx-auto max-w-[1600px] space-y-3 px-5 pb-6 text-white lg:px-8">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/15 px-4 py-4 md:px-5 md:py-5">
            <h2 className="text-lg font-black tracking-tight text-white md:text-xl">{tr('대표 수업안')}</h2>
            <p className="mt-1 text-sm text-slate-300/95">
              {tr('영상·진행법·현장 팁 등 보조 정보가 붙은 프로그램입니다. (관리자 확인용)')}
            </p>
            {featuredLoading ? (
              <p className="mt-4 text-sm text-slate-500">{tr('불러오는 중…')}</p>
            ) : featuredFetchErr ? (
              <p className="mt-4 text-sm text-red-300">{tr('대표 수업안 목록을 불러오지 못했습니다.')}</p>
            ) : featuredPrograms.length === 0 ? (
              <p className="mt-4 text-sm text-amber-100/90">
                {tr('대표 수업안이 아직 없습니다. 수업안 보조정보 관리에서 지정해 주세요.')}
              </p>
            ) : (
              <div
                className={[
                  'mt-4 grid gap-4 justify-items-stretch',
                  featuredPrograms.length === 1
                    ? 'grid-cols-1 max-w-md'
                    : featuredPrograms.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2 sm:max-w-3xl'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                ].join(' ')}
              >
                {featuredPrograms.map((row) => {
                  const detail = programDetails[String(row.id)];
                  const title = stripMonthWeekPrefix(detail?.title ?? row.title ?? '').trim();
                  const video = detail?.videoUrl ?? row.video_url ?? null;
                  const thumb = video ? getYouTubeThumbnailUrl(String(video)) : null;
                  const ld = row.lesson_detail;
                  const summary =
                    typeof ld?.summary === 'string' && ld.summary.trim() ? ld.summary.trim() : '';
                  return (
                    <div
                      key={row.id}
                      className="flex flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/50 shadow-lg"
                    >
                      <div className="relative aspect-video w-full shrink-0 bg-slate-800">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl text-white/35">
                            ▶
                          </div>
                        )}
                        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                          <span className="rounded-full border border-amber-400/50 bg-black/50 px-2 py-0.5 text-[10px] font-black text-amber-100">
                            {tr('대표 수업안')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <h3 className="line-clamp-2 text-base font-black leading-snug text-white">{tr(title)}</h3>
                        {summary ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{tr(summary)}</p>
                        ) : null}
                        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                          {(Array.isArray(ld?.packageKeys) ? ld?.packageKeys : [])
                            .filter((x): x is string => typeof x === 'string' && isLessonPackageKeyId(x))
                            .slice(0, 2)
                            .map((k) => (
                              <span
                                key={k}
                                className="rounded-full border border-sky-500/30 bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-sky-100"
                              >
                                {tr(LESSON_PACKAGE_KEY_LABELS[k as LessonPackageKeyId])}
                              </span>
                            ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenDetail(row.id, {
                              themeKey: 'co-op',
                              row: {
                                id: row.id,
                                title: row.title,
                                video_url: row.video_url ?? null,
                                function_type: row.function_type ?? null,
                                function_types: row.function_types ?? undefined,
                                main_theme: row.main_theme ?? null,
                                group_size: row.group_size ?? null,
                                lesson_detail: row.lesson_detail ?? undefined,
                              },
                            })
                          }
                          className="mt-1 w-full rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-black text-white hover:bg-emerald-500"
                        >
                          {tr('수업안 보기')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!error && isEditMode ? (
        <div className="mx-auto max-w-[1600px] space-y-3 px-5 pb-8 text-white lg:px-8">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-950/30 px-4 py-4 md:px-5 md:py-5">
            <h2 className="text-lg font-black tracking-tight md:text-xl">{tr('상황별 수업 패키지')}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {tr('라이브러리 필터 보조용. 관리자에서 구성 현황을 확인합니다.')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {visiblePackageKeysAdmin.map((key) => {
                const count = packageTotals[key] ?? 0;
                const emptyAdmin = count === 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onGoToLibrary?.('co-op', undefined, { packageKey: key })}
                    className="flex flex-col rounded-xl border border-slate-600/60 bg-slate-900/60 px-3 py-3 text-left text-xs font-bold text-slate-100 transition-colors hover:border-emerald-500/40 hover:bg-slate-800/80 md:text-[13px]"
                  >
                    <span className="line-clamp-2 pr-1">{tr(LESSON_PACKAGE_KEY_LABELS[key])}</span>
                    {emptyAdmin ? (
                      <span className="mt-1.5 inline-flex w-fit rounded-full border border-slate-500/50 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                        {tr('미구성')}
                      </span>
                    ) : count > 0 ? (
                      <span className="mt-1 text-[10px] font-semibold tabular-nums text-slate-500">
                        {count} {tr('개')}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {!error ? (
        <OttB2bRoadmapShell
          metrics={ottMetrics}
          featuredPrograms={featuredOttPrograms}
          spotlightTitle={
            spotlightConfig?.sectionTitle?.trim()
              ? spotlightConfig.sectionTitle.trim()
              : spotlightEquipment
                ? tr('추천 활동')
                : undefined
          }
          spotlightPrograms={spotlightOttPrograms}
          onOpenSpotlight={(p) => openWithContext(p.id, undefined, 'co-op')}
          lineupEyebrow={tr(DASHBOARD_ROW1_GROUP_LABEL)}
          lineupTitle={tr('이번 주 추천')}
          nowPlayingTitle={tr(dashboard.weekTheme.title)}
          heroBadge={tr(dashboard.weekTheme.badge)}
          heroSubtitle={tr(dashboard.weekTheme.subtitle)}
          onBrowsePremium={() => onGoToLibrary?.('co-op')}
          onHeroSpomove={() => onGoToLibrary?.('cognitive')}
          onOpenPlanBilling={onOpenPlanBilling}
          onOpenFeatured={onOpenFeatured}
          onMarketReport={() => onGoToLibrary?.('co-op')}
          onSendToClass={() => onGoToAssistantTools?.()}
          onHeroReportTools={
            onGoToAIReportFromToday || onGoToAssistantTools
              ? () => {
                  if (onGoToAIReportFromToday) onGoToAIReportFromToday();
                  else onGoToAssistantTools?.();
                }
              : undefined
          }
          belowHeader={todaySlot}
          subscriberHome={!isEditMode}
        />
      ) : null}

      {!error &&
        data &&
        featuredOttPrograms.length === 0 &&
        screenplays.length === 0 &&
        !screenplaysError &&
        !screenplaysLoading && (
          <div className="mx-auto max-w-[1600px] px-5 py-10 text-center text-zinc-400 lg:px-8">
            <p className="font-medium">{tr('이번 주 추천이 아직 없어요.')}</p>
            <p className="mt-1 text-sm">{tr('나머지 추천은 곧 채워질 예정이에요.')}</p>
          </div>
        )}

      {!error ? (
        <div className="mx-auto mt-8 max-w-[1600px] space-y-6 px-5 text-white lg:px-8">
          {screenplaysError ? (
            <div className="flex flex-col gap-3 rounded-[2rem] border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200 sm:flex-row sm:items-center">
              <span className="flex-1">{tr('스포무브 목록을 불러오지 못했어요.')}</span>
              <button
                type="button"
                onClick={() => retryScreenplays()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {tr('다시 시도')}
              </button>
            </div>
          ) : null}

          {/* 교구 추천은 상단 셸의 "교구 큐레이션" 영역으로 이동 */}

          <details className="rounded-[1.5rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-400">
            <summary className="cursor-pointer list-none font-bold text-zinc-200 [&::-webkit-details-marker]:hidden">
              {tr('지난 주·다음 주 안내')}
            </summary>
            <div className="ml-1 mt-2 space-y-2 border-l border-white/10 pl-6">
              <p>{tr('이번 주 추천은 월요일 시작 캘린더 주 기준으로 갱신됩니다. 탭을 켜 둔 채로 날짜가 바뀌면 자동으로 다시 불러옵니다.')}</p>
              <p>
                {tr('지난 구성은 라이브러리에서 테마별로 다시 열 수 있어요.')}{' '}
                {onGoToLibrary ? (
                  <button
                    type="button"
                    className="font-bold text-amber-400 hover:underline"
                    onClick={() => onGoToLibrary('co-op')}
                  >
                    {tr('라이브러리로 이동')}
                  </button>
                ) : null}
              </p>
              <p>
                {tr(
                  '「다음 주」 미리보기 API는 없습니다. 월요일이 지나 캘린더 주가 바뀌면, 이번 주 추천이 한 주 밀려 자동으로 갱신됩니다.'
                )}
              </p>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}
