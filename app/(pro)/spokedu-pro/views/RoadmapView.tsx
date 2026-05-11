'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RefreshCw,
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
  DASHBOARD_ROW1_GROUP_LABEL,
  type ThemeKey,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import { OttB2bRoadmapShell } from './roadmap/OttB2bRoadmapShell';
import type { OttFeaturedProgram, OttMetric } from './roadmap/OttB2bRoadmapShell';
import { SubscriberActionTile, SubscriberBadge, SubscriberButton, SubscriberFilterPill } from '../components/SubscriberWorkspacePrimitives';
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

type SpotlightApiRow = { id?: number; title?: string; video_url?: string | null };

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
  /** Parent-provided program library count. Prevents duplicate fetching in this view. */
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
  const [, setSpotlightLoading] = useState(false);
  const [, setSpotlightError] = useState<string | null>(null);
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
    params.set('function_type', '적응력');
    params.set('main_theme', '협동');
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

  const fmtMetric = (ready: boolean, n: number) => (!ready ? '...' : String(n));

  const buildFunctionalMoveMetaSlots = useCallback(
    (programId: number) => {
      const d = programDetails[String(programId)];
      const theme = String(d?.mainTheme ?? '').trim();
      const fnFirst = (Array.isArray(d?.functionTypes) ? d.functionTypes.filter(Boolean) : [d?.functionType])
        .filter((x): x is string => typeof x === 'string' && String(x).trim() !== '')[0];
      const eqFirst = extractEquipmentDisplayTags(d?.equipment ?? '')[0]?.trim() ?? '';
      const dash = '-';
      return [
        { label: tr('활동 테마'), value: theme || dash },
        { label: tr('신체 기능'), value: fnFirst?.trim() || dash },
        { label: tr('사용 교구'), value: eqFirst || dash },
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

  /** Top lineup: up to three curated programs plus one screenplay card. */
  const featuredOttPrograms: OttFeaturedProgram[] = (() => {
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
          { label: tr('인지 영역'), value: tr('인지') },
          { label: tr('과제 유형'), value: tr(String(firstScreenplay.modeId ?? 'SPOMOVE')) },
          { label: tr('레벨'), value: tr(String(firstScreenplay.subtitle ?? '-')) },
        ],
        tag: tr('SPOMOVE'),
        accent: pal.accent,
        gradient: pal.gradient,
        thumbnailUrl: screenplayThumbnailUrl,
        isScreenplay: true,
      });
    }
    return out;
  })();

  const spotlightOttPrograms: OttFeaturedProgram[] = (() => {
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
  })();

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

  const todaySlot = !isEditMode ? (
    <div className="mx-auto max-w-[1600px] px-5 pb-4 text-white lg:px-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="rounded-[var(--sp-ott-radius-2xl,2rem)] border border-cyan-400/20 bg-slate-950/50 p-4 shadow-[0_24px_70px_-44px_rgba(34,211,238,0.55)] md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">{tr('Today Class')}</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">{tr('오늘 수업을 먼저 정리해요')}</h2>
            </div>
            <p className="max-w-xl text-sm font-medium leading-6 text-slate-400">
              {tr('수업안 선택, SPOMOVE 실행, 수업 후 리포트까지 여기서 이어집니다. 상단 작업 바와 같은 순서로 움직이도록 맞췄습니다.')}
            </p>
          </div>
          <TodayClassCard
            weekThemeKey={weekTheme.themeKey}
            onGoToLibrary={(themeKey) => onGoToLibrary?.(themeKey)}
            onStartClass={() => onStartTodayClass?.()}
            onOpenPostClass={(className) => onOpenPostClass?.(className)}
            onGoToAIReport={() => {
              if (onGoToAIReportFromToday) onGoToAIReportFromToday();
              else onGoToAssistantTools?.();
            }}
            onAddClass={() => onAddClassFromToday?.()}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <SubscriberActionTile
            tone="emerald"
            label={tr('1. 수업안 고르기')}
            meta={tr('오늘 반과 공간에 맞는 프로그램을 고르고 준비물을 확인합니다.')}
            action={tr('라이브러리 열기')}
            onClick={() => onGoToLibrary?.('co-op')}
          />
          <SubscriberActionTile
            tone="cyan"
            label={tr('2. SPOMOVE 연결')}
            meta={tr('도입 집중 전환이나 반응훈련이 필요하면 바로 실행합니다.')}
            action={tr('SPOMOVE 보기')}
            onClick={() => onGoToLibrary?.('cognitive')}
          />
          <SubscriberActionTile
            tone="violet"
            label={tr('3. 리포트 남기기')}
            meta={tr('수업 후 관찰과 변화를 학부모가 이해할 수 있는 문장으로 정리합니다.')}
            action={tr('리포트 열기')}
            onClick={() => {
              if (onGoToAIReportFromToday) onGoToAIReportFromToday();
              else onGoToAssistantTools?.();
            }}
          />
        </div>
      </div>
    </div>
  ) : null;
  const visiblePackageKeysAdmin: LessonPackageKeyId[] = [...LESSON_PACKAGE_KEY_ORDER];

  /** Admin-only featured lesson block. */
  const showFeaturedBlock = isEditMode || featuredPrograms.length > 0;

  const threeAxisCards = null;

  return (
    <section className="pb-32 pt-0 mt-0">
      {error ? (
        <div className="px-5 py-4 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 sm:flex-row sm:items-center">
            <span className="flex-1">{tr('이번 주 추천을 불러오지 못했어요.')}</span>
            <SubscriberButton tone="red" size="sm" onClick={() => fetchDashboard()}>
              {tr('다시 시도')}
            </SubscriberButton>
          </div>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="px-5 py-6 text-center text-zinc-400 lg:px-8">{tr('대시보드 불러오는 중...')}</div>
      ) : null}

      {!error && todaySlot}

      {!error && threeAxisCards ? (
        <div className="mx-auto max-w-[1600px] space-y-3 px-5 pb-4 text-white lg:px-8">{threeAxisCards}</div>
      ) : null}

      {!error && isEditMode && showFeaturedBlock ? (
        <div className="mx-auto max-w-[1600px] space-y-3 px-5 pb-6 text-white lg:px-8">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/15 px-4 py-4 md:px-5 md:py-5">
            <h2 className="text-lg font-bold tracking-tight text-white md:text-xl">{tr('대표 수업안')}</h2>
            <p className="mt-1 text-sm text-slate-300/95">
              {tr('영상, 진행법, 표현력이 붙은 프로그램입니다. 관리자 확인용으로 노출합니다.')}
            </p>
            {featuredLoading ? (
              <p className="mt-4 text-sm text-slate-500">{tr('불러오는 중...')}</p>
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
                          <SubscriberBadge tone="amber">{tr('대표 수업안')}</SubscriberBadge>
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
                              <SubscriberBadge key={k} tone="sky">
                                {tr(LESSON_PACKAGE_KEY_LABELS[k as LessonPackageKeyId])}
                              </SubscriberBadge>
                            ))}
                        </div>
                        <SubscriberButton
                          tone="emerald"
                          wide
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
                        >
                          {tr('수업안 보기')}
                        </SubscriberButton>
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
            <h2 className="text-lg font-bold tracking-tight md:text-xl">{tr('상황별 수업 패키지')}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {tr('라이브러리 필터 보조용으로 관리자에서 구성 현황을 확인합니다.')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {visiblePackageKeysAdmin.map((key) => {
                const count = packageTotals[key] ?? 0;
                const emptyAdmin = count === 0;
                return (
                  <SubscriberFilterPill
                    key={key}
                    label={tr(LESSON_PACKAGE_KEY_LABELS[key])}
                    meta={emptyAdmin ? tr('미구성') : count > 0 ? `${count} ${tr('개')}` : undefined}
                    onClick={() => onGoToLibrary?.('co-op', undefined, { packageKey: key })}
                  />
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
            <p className="font-medium">{tr('?대쾲 二?異붿쿇???꾩쭅 ?놁뼱??')}</p>
            <p className="mt-1 text-sm">{tr('나머지 추천은 곧 채워질 예정이에요.')}</p>
          </div>
        )}

      {!error ? (
        <div className="mx-auto mt-8 max-w-[1600px] space-y-6 px-5 text-white lg:px-8">
          {screenplaysError ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200 sm:flex-row sm:items-center">
              <span className="flex-1">{tr('SPOMOVE 목록을 불러오지 못했어요.')}</span>
              <SubscriberButton tone="red" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => retryScreenplays()}>
                {tr('다시 시도')}
              </SubscriberButton>
            </div>
          ) : null}

          {/* Equipment recommendations now live in the upper curation area. */}

          <details className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-400">
            <summary className="cursor-pointer list-none font-bold text-zinc-200 [&::-webkit-details-marker]:hidden">
              {tr('지난 주와 다음 주 안내')}
            </summary>
            <div className="ml-1 mt-2 space-y-2 border-l border-white/10 pl-6">
              <p>{tr('이번 주 추천은 요일 시작 기준으로 갱신됩니다. 창을 켠 채로 날짜가 바뀌면 자동으로 다시 불러옵니다.')}</p>
              <p>
                {tr('지난 구성은 라이브러리에서 테마별로 다시 찾을 수 있어요.')}{' '}
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
                  '다음 주 미리보기 API는 아직 없습니다. 요일이 지나 캘린더 주가 바뀌면 이번 주 추천도 자동으로 갱신됩니다.'
                )}
              </p>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}




