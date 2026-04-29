'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Zap, RefreshCw, Package, ChevronRight, ChevronLeft } from 'lucide-react';
import { useSpokeduProDashboard } from '../hooks/useSpokeduProDashboard';
import {
  DEFAULT_DASHBOARD_V4,
  getProgramTitle,
  PROGRAM_BANK,
  DASHBOARD_ROW1_GROUP_LABEL,
  type ThemeKey,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import type { ProgramDetail } from '../types';
import TodayClassCard from './roadmap/TodayClassCard';
import { isEquipmentCatalogItem } from '@/app/lib/spokedu-pro/programClassification';

type ScreenplayRow = {
  id: number | string;
  modeId?: string;
  title?: string;
  subtitle?: string;
  thumbnailUrl?: string;
};

const SECTION_BLOCK = 'space-y-6 rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/55 to-slate-950/35 p-4 md:p-5';
const HEADER_TO_ROW_GAP = 'space-y-4';

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

function ProgramCardRow1({
  programId,
  role,
  tag2,
  programDetail,
  onOpenProgram,
}: {
  programId: number;
  role: string;
  tag2: string[];
  programDetail?: ProgramDetail | null;
  onOpenProgram: () => void;
}) {
  const tr = useTranslator();
  const prog = PROGRAM_BANK.find((p) => p.id === programId);
  const gradient = prog?.gradient ?? 'from-orange-500 to-red-600';
  const title = programDetail?.title ?? getProgramTitle(programId);
  const thumbnailUrl = programDetail?.videoUrl ? getYouTubeThumbnailUrl(programDetail.videoUrl) : null;
  return (
    <div
      className="media-card relative w-full aspect-[16/9] md:aspect-[4/3] lg:aspect-[16/9] overflow-hidden group cursor-pointer rounded-[1rem] border border-slate-700/70 bg-slate-900/55 shadow-[0_16px_34px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.04]"
      onClick={onOpenProgram}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="thumb-grade absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center`}
        >
          <span className="text-6xl text-white/90">▶</span>
        </div>
      )}
      <div className="relative absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/52 to-transparent p-4 md:p-5 flex flex-col justify-end">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_42%)] opacity-40" />
        <div className="mb-2 opacity-90">
          <span className="text-[10px] font-black uppercase text-white px-2 py-0.5 rounded-full bg-black/65 border border-white/15">
            {tr(role)}
          </span>
        </div>
        <h4 className="relative text-white font-black text-[1.02rem] md:text-[1.06rem] lg:text-[1.15rem] leading-tight line-clamp-2">
          {tr(title)}
        </h4>
        <div className="pointer-events-none hidden md:flex absolute bottom-4 right-4 opacity-0 md:group-hover:opacity-100 transition-opacity">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-100 shadow-sm">
            <span className="text-slate-200">▶</span> {tr('열기')}
          </span>
        </div>
      </div>
    </div>
  );
}

function ScreenplayCard({
  title,
  subtitle,
  thumbnailUrl,
  onClick,
}: {
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  onClick: () => void;
}) {
  const tr = useTranslator();
  return (
    <div
      className="media-card relative w-full aspect-[16/9] md:aspect-[4/3] lg:aspect-[16/9] overflow-hidden group cursor-pointer rounded-[1rem] border border-slate-700/70 bg-slate-900/55 shadow-[0_16px_34px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.04]"
      onClick={onClick}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="thumb-grade absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 to-cyan-700 opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-5xl text-white/90">S</span>
        </div>
      )}
      <div className="relative absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/58 to-transparent p-4 md:p-5 flex flex-col justify-end">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_42%)] opacity-35" />
        {subtitle ? (
          <div className="mb-2">
            <span className="text-[10px] font-black text-slate-100 px-2 py-0.5 rounded-full bg-slate-900/70 border border-slate-400/30">
              {tr(subtitle)}
            </span>
          </div>
        ) : null}
        <h4 className="relative text-white font-black text-[1.02rem] md:text-[1.06rem] lg:text-[1.15rem] leading-tight line-clamp-2">{tr(title)}</h4>
        <div className="pointer-events-none hidden md:flex absolute bottom-4 right-4 opacity-0 md:group-hover:opacity-100 transition-opacity">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-100 shadow-sm">
            <span className="text-slate-200">▶</span> {tr('열기')}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyGuideSlot({ message }: { message: string }) {
  return (
    <div className="relative w-full aspect-[16/9] md:aspect-[4/3] lg:aspect-[16/9] rounded-[1rem] border border-dashed border-slate-600/80 bg-slate-900/40 flex flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-sm font-bold text-slate-400">{message}</p>
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
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0F172A] to-transparent md:hidden" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0F172A] to-transparent md:hidden" />

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
  programDetails = {},
  onStartTodayClass,
  onOpenPostClass,
  onGoToAIReportFromToday,
  onAddClassFromToday,
  onGoToAssistantTools,
}: {
  onOpenDetail: (
    id: number,
    context?: {
      role?: string;
      themeKey?: string;
      screenplay?: boolean;
      row?: {
        id?: number;
        title?: string;
        video_url?: string | null;
        mode_id?: string | null;
        preset_ref?: string | null;
        thumbnail_url?: string | null;
      };
    }
  ) => void;
  onGoToLibrary?: (themeKey?: ThemeKey, preset?: string) => void;
  programDetails?: Record<string, ProgramDetail>;
  onStartTodayClass?: () => void;
  onOpenPostClass?: (className: string) => void;
  onGoToAIReportFromToday?: () => void;
  onAddClassFromToday?: () => void;
  onGoToAssistantTools?: () => void;
}) {
  const tr = useTranslator();
  const { data, weekLabel, loading, error, fetchDashboard } = useSpokeduProDashboard();
  const [screenplays, setScreenplays] = useState<ScreenplayRow[]>([]);
  const [screenplaysError, setScreenplaysError] = useState<string | null>(null);
  const [screenplaysLoading, setScreenplaysLoading] = useState(true);
  const [screenplaysFetchKey, setScreenplaysFetchKey] = useState(0);
  const [spotlightPrograms, setSpotlightPrograms] = useState<SpotlightApiRow[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightError, setSpotlightError] = useState<string | null>(null);
  const [spotlightFetchKey, setSpotlightFetchKey] = useState(0);

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
    let cancelled = false;
    setScreenplaysLoading(true);
    setScreenplaysError(null);
    fetch('/api/spokedu-pro/screenplays', { credentials: 'include' })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { screenplays?: unknown; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setScreenplays([]);
          setScreenplaysError(json.error ?? `HTTP ${res.status}`);
          return;
        }
        if (Array.isArray(json.screenplays)) {
          setScreenplays(json.screenplays as ScreenplayRow[]);
        } else {
          setScreenplays([]);
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setScreenplays([]);
        setScreenplaysError(e.message || 'Network error');
      })
      .finally(() => {
        if (!cancelled) setScreenplaysLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
    let cancelled = false;
    setSpotlightLoading(true);
    setSpotlightError(null);
    const params = new URLSearchParams();
    params.set('limit', '16');
    params.set('only_curriculum', '1');
    params.set('function_type', '협응력');
    params.set('main_theme', '협동형');
    params.set('group_size', '소그룹');
    params.set('equipment', spotlightEquipment);
    fetch(`/api/spokedu-pro/programs?${params.toString()}`, { credentials: 'include' })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setSpotlightPrograms([]);
          setSpotlightError(json.error ?? `HTTP ${res.status}`);
          return;
        }
        const rows = Array.isArray(json.data) ? (json.data as SpotlightApiRow[]) : [];
        setSpotlightPrograms(rows.slice(0, 4));
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setSpotlightPrograms([]);
          setSpotlightError(e.message || 'Network error');
        }
      })
      .finally(() => {
        if (!cancelled) setSpotlightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spotlightConfig, spotlightEquipment, spotlightFetchKey]);

  const openWithContext = (programId: number, role?: string, themeKey?: string) => {
    onOpenDetail(programId, { role, themeKey });
  };

  const row1Programs = weekTheme.items.slice(0, 3);
  const paddedPrograms: (typeof weekTheme.items[0] | null)[] = [0, 1, 2].map((i) => row1Programs[i] ?? null);
  const firstScreenplay = screenplays[0];
  const numericScreenplayId =
    firstScreenplay != null ? Number(firstScreenplay.id) : NaN;
  const canOpenScreenplay = Number.isFinite(numericScreenplayId) && numericScreenplayId > 0;

  const openFirstScreenplay = () => {
    if (!firstScreenplay) return;
    if (canOpenScreenplay) {
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
    onGoToLibrary?.('cognitive');
  };

  return (
    <section className="pb-32 pt-0 mt-0">
      {(onStartTodayClass && onOpenPostClass && onGoToAIReportFromToday && onAddClassFromToday && onGoToLibrary) && (
        <div className="px-6 lg:px-12 pt-6 lg:pt-8 pb-2">
          <div className="w-full lg:w-2/3 lg:max-w-3xl">
            <TodayClassCard
              weekThemeKey={dashboard.weekTheme.themeKey}
              onGoToLibrary={(tk) => onGoToLibrary(tk)}
              onStartClass={onStartTodayClass}
              onOpenPostClass={onOpenPostClass}
              onGoToAIReport={onGoToAIReportFromToday}
              onAddClass={onAddClassFromToday}
            />
          </div>
        </div>
      )}

      <div className="px-6 lg:px-12 mt-6 space-y-8">
        {error && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-sm text-red-300">
            <span className="flex-1">{tr('이번 주 추천을 불러오지 못했어요.')}</span>
            <button
              type="button"
              onClick={() => fetchDashboard()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors shrink-0"
            >
              {tr('다시 시도')}
            </button>
          </div>
        )}
        {loading && !data && (
          <div className="text-slate-400 font-medium">{tr('대시보드 불러오는 중...')}</div>
        )}

        {!error &&
          data &&
          dashboard.weekTheme.items.length === 0 &&
          screenplays.length === 0 &&
          !screenplaysError &&
          !screenplaysLoading && (
            <div className="py-12 text-center text-slate-400">
              <p className="font-medium">{tr('이번 주 추천이 아직 없어요.')}</p>
              <p className="text-sm mt-1">{tr('나머지 추천은 곧 채워질 예정이에요.')}</p>
            </div>
          )}

        {!error &&
          (loading ? !!data : true) &&
          (dashboard.weekTheme.items.length > 0 ||
            screenplays.length > 0 ||
            !!screenplaysError ||
            screenplaysLoading) && (
            <>
              <div className={SECTION_BLOCK}>
                <div className={HEADER_TO_ROW_GAP}>
                  <SectionHeader
                    icon={<Zap className="h-4 w-4 text-yellow-300" />}
                    title={tr('이번 주 수업 가이드')}
                    sub={weekLabel ? tr(weekLabel) : null}
                    badge={tr(DASHBOARD_ROW1_GROUP_LABEL)}
                  />

                {screenplaysError ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-sm text-red-200">
                    <span className="flex-1">{tr('스포무브 목록을 불러오지 못했어요.')}</span>
                    <button
                      type="button"
                      onClick={() => retryScreenplays()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {tr('다시 시도')}
                    </button>
                  </div>
                ) : null}

                  <DashboardPosterRow ariaLabel={tr('이번 주 수업 가이드')}>
                  {paddedPrograms.map((item, idx) => (
                    <div key={`guide-wrap-${idx}`} className={POSTER_CELL}>
                      {item ? (
                        <ProgramCardRow1
                          programId={item.programId}
                          role={item.role}
                          tag2={item.tag2 ?? []}
                          programDetail={programDetails[String(item.programId)] ?? null}
                          onOpenProgram={() => openWithContext(item.programId, item.role, 'co-op')}
                        />
                      ) : (
                        <EmptyGuideSlot message={tr('추천 준비 중')} />
                      )}
                    </div>
                  ))}
                  <div className={POSTER_CELL}>
                    {screenplaysLoading && screenplays.length === 0 ? (
                      <div className="relative w-full aspect-[16/9] md:aspect-[4/3] lg:aspect-[16/9] rounded-[1rem] border border-slate-700 bg-slate-900/50 flex items-center justify-center">
                        <p className="text-sm font-medium text-slate-500">{tr('스포무브 목록 불러오는 중...')}</p>
                      </div>
                    ) : firstScreenplay ? (
                      <ScreenplayCard
                        title={firstScreenplay.title ?? `Screenplay #${firstScreenplay.id}`}
                        subtitle={firstScreenplay.subtitle ?? firstScreenplay.modeId}
                        thumbnailUrl={firstScreenplay.thumbnailUrl}
                        onClick={openFirstScreenplay}
                      />
                    ) : (
                      <EmptyGuideSlot message={tr('스포무브(브레인체육) 추천 준비 중')} />
                    )}
                  </div>
                  </DashboardPosterRow>
                </div>

                {spotlightConfig !== null && spotlightEquipment ? (
                  <div className="space-y-4 pt-4 border-t border-slate-800/70">
                    <SectionHeader
                      icon={<Package className="h-4 w-4 text-amber-300" />}
                      title={
                        spotlightConfig.sectionTitle?.trim()
                          ? spotlightConfig.sectionTitle.trim()
                          : `${spotlightEquipment}${tr('로 하는 추천 프로그램')}`
                      }
                      badge={tr('교구 큐레이션')}
                      action={
                        onGoToLibrary
                          ? {
                              label: tr('라이브러리에서 더 보기'),
                              onClick: () => onGoToLibrary('co-op'),
                            }
                          : undefined
                      }
                    />
                    {spotlightError ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-sm text-red-200">
                        <span className="flex-1">{tr('교구 추천을 불러오지 못했어요.')}</span>
                        <button
                          type="button"
                          onClick={() => setSpotlightFetchKey((k) => k + 1)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {tr('다시 시도')}
                        </button>
                      </div>
                    ) : spotlightLoading ? (
                      <div className="text-slate-500 text-sm font-medium">{tr('추천 불러오는 중...')}</div>
                    ) : spotlightPrograms.length === 0 ? (
                      <div className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
                        {tr('이 교구에 맞는 본편 프로그램이 아직 없어요.')}
                      </div>
                    ) : (
                      <DashboardPosterRow
                        ariaLabel={
                          spotlightConfig.sectionTitle?.trim() ?? `${spotlightEquipment} ${tr('추천 프로그램')}`
                        }
                      >
                        {spotlightPrograms.map((row, idx) => {
                          const id = Number(row.id);
                          if (!Number.isFinite(id) || id <= 0) return null;
                          const title = String(row.title ?? '').trim() || getProgramTitle(id);
                          return (
                            <div key={`spotlight-${spotlightEquipment}-${idx}-${id}`} className={POSTER_CELL}>
                              <SpotlightProgramCard
                                programId={id}
                                title={title}
                                videoUrl={row.video_url}
                                equipmentLabel={spotlightEquipment}
                                programDetail={programDetails[String(id)] ?? null}
                                onOpen={() => openWithContext(id, undefined, 'co-op')}
                              />
                            </div>
                          );
                        })}
                      </DashboardPosterRow>
                    )}
                  </div>
                ) : null}

                {onGoToAssistantTools && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
                    <p className="text-slate-300 text-sm font-medium">
                      {tr('수업 중 술래·팀 나누기·타이머가 필요하면')}
                    </p>
                    <button
                      type="button"
                      onClick={onGoToAssistantTools}
                      className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
                    >
                      {tr('수업 보조도구 열기')}
                    </button>
                  </div>
                )}
                <details className="rounded-xl border border-slate-700/80 bg-slate-900/30 px-4 py-2 text-sm text-slate-400">
                  <summary className="cursor-pointer font-bold text-slate-300 list-none [&::-webkit-details-marker]:hidden">
                    {tr('지난 주·다음 주 안내')}
                  </summary>
                  <div className="mt-2 pl-6 space-y-2 border-l border-slate-700 ml-1">
                    <p>{tr('이번 주 추천은 월요일 시작 캘린더 주 기준으로 갱신됩니다. 탭을 켜 둔 채로 날짜가 바뀌면 자동으로 다시 불러옵니다.')}</p>
                    <p>
                      {tr('지난 구성은 라이브러리에서 테마별로 다시 열 수 있어요.')}{' '}
                      {onGoToLibrary ? (
                        <button
                          type="button"
                          className="text-amber-400 font-bold hover:underline"
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
            </>
          )}
      </div>
    </section>
  );
}
