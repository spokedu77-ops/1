'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useEffect, useState, useCallback } from 'react';
import { Zap, Star, ChevronRight, RefreshCw } from 'lucide-react';
import { useSpokeduProDashboard } from '../hooks/useSpokeduProDashboard';
import {
  DEFAULT_DASHBOARD_V4,
  getProgramTitle,
  PROGRAM_BANK,
  DASHBOARD_ROW1_GROUP_LABEL,
  DASHBOARD_ROW2_GROUP_LABEL,
  type ThemeKey,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import type { ProgramDetail } from '../types';
import TodayClassCard from './roadmap/TodayClassCard';
import { setTodayClassPhase } from '../utils/todayClassStorage';

type ScreenplayRow = {
  id: number | string;
  modeId?: string;
  title?: string;
  subtitle?: string;
  thumbnailUrl?: string;
};

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
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
  const tags = tag2.slice(0, 2);
  const thumbnailUrl = programDetail?.videoUrl ? getYouTubeThumbnailUrl(programDetail.videoUrl) : null;
  return (
    <div
      className="media-card relative w-full aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"
      onClick={onOpenProgram}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center`}
        >
          <span className="text-6xl text-white/90">▶</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent p-5 flex flex-col justify-end">
        <div className="flex gap-1.5 mb-2 opacity-75">
          <span className="text-[10px] font-black uppercase text-white px-2 py-0.5 bg-black/60 rounded">{tr(role)}</span>
          {tags.map((tag) => (
            <span key={tag} className="text-[10px] font-black text-slate-300/90 px-2 py-0.5 bg-slate-900/35 border border-white/10 rounded">
              {tr(tag)}
            </span>
          ))}
        </div>
        <h4 className="text-white font-black text-lg md:text-xl line-clamp-2">{tr(title)}</h4>
      </div>
    </div>
  );
}

function ProgramCardRow2({
  programId,
  tag2,
  programDetail,
  onClick,
}: {
  programId: number;
  tag2: string[];
  programDetail?: ProgramDetail | null;
  onClick: () => void;
}) {
  const tr = useTranslator();
  const prog = PROGRAM_BANK.find((p) => p.id === programId);
  const gradient = prog?.gradient ?? 'from-emerald-500 to-teal-600';
  const title = programDetail?.title ?? getProgramTitle(programId);
  const tags = tag2.slice(0, 2);
  const thumbnailUrl = programDetail?.videoUrl ? getYouTubeThumbnailUrl(programDetail.videoUrl) : null;
  return (
    <div
      className="media-card relative w-full aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center`}
        >
          <span className="text-6xl text-white/90">▶</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent p-5 flex flex-col justify-end">
        <div className="flex gap-1.5 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="text-[10px] font-black text-slate-300 px-2 py-0.5 bg-slate-800/60 rounded">
              {tr(tag)}
            </span>
          ))}
        </div>
        <h4 className="text-white font-black text-lg md:text-xl line-clamp-2">{tr(title)}</h4>
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
      className="media-card relative w-full aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 to-cyan-700 opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-5xl text-white/90">S</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent p-5 flex flex-col justify-end">
        {subtitle ? (
          <div className="mb-2">
            <span className="text-[10px] font-black text-slate-200 px-2 py-0.5 bg-slate-800/70 rounded">{tr(subtitle)}</span>
          </div>
        ) : null}
        <h4 className="text-white font-black text-lg md:text-xl line-clamp-2">{tr(title)}</h4>
      </div>
    </div>
  );
}

export default function RoadmapView({
  onOpenDetail,
  onGoToLibrary,
  drawerContext,
  programDetails = {},
  onStartTodayClass,
  onOpenPostClass,
  onGoToAIReportFromToday,
  onAddClassFromToday,
  onGoToAssistantTools,
}: {
  onOpenDetail: (id: number, context?: { role?: string; themeKey?: string }) => void;
  onGoToLibrary?: (themeKey?: ThemeKey, preset?: string) => void;
  drawerContext?: { role?: string; themeKey?: string };
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
  const { weekTheme, row2 } = dashboard;

  const openWithContext = (programId: number, role?: string, themeKey?: string) => {
    onOpenDetail(programId, { role, themeKey });
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

      {/* Hero: 테마 1개(4개 묶음) 설명 — 다른 페이지와 동일한 좌/상단 여백만 사용 */}
      <div
        className="relative w-full min-h-[140px] py-10 bg-slate-900 flex items-end px-6 lg:px-12"
        style={{
          background:
            'linear-gradient(to top, #0F172A 0%, transparent 100%), url(https://images.unsplash.com/photo-1576625807986-773a241e57c5?auto=format&fit=crop&q=80&w=2000) center/cover',
        }}
      >
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex px-3 py-1 bg-blue-600/90 text-white rounded text-xs font-bold uppercase tracking-widest backdrop-blur-md">
              {tr(weekTheme.badge)}
            </span>
            {weekLabel && (
              <span className="text-slate-400 text-sm font-medium">{tr(weekLabel)}</span>
            )}
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight">
            {tr(weekTheme.title)}
          </h2>
          <p className="text-slate-300 font-medium leading-relaxed">{tr(weekTheme.subtitle)}</p>
          <p className="text-slate-500 text-sm">{tr('50분 전체 수업이 아니라, 웜업/리드업/놀이체육 파이를 책임집니다.')}</p>
          {weekTheme.ctaPrimary && onGoToLibrary && (
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setTodayClassPhase('ready');
                  onGoToLibrary(weekTheme.themeKey);
                }}
                className="px-6 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors"
              >
                {tr(weekTheme.ctaPrimary.label)}
              </button>
              {weekTheme.ctaSecondary && weekTheme.items[0] && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenDetail(weekTheme.items[0].programId, {
                      role: weekTheme.items[0].role,
                      themeKey: weekTheme.themeKey,
                    })
                  }
                  className="px-6 py-3 rounded-xl font-bold border border-slate-500 text-slate-200 hover:bg-slate-800/80 transition-colors"
                >
                  {tr(weekTheme.ctaSecondary.label)}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 lg:px-12 mt-8 space-y-12">
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
        {/* Row1: 이번 주 수업 가이드 (고정) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 truncate">
                <Zap className="w-5 h-5 text-yellow-400 shrink-0" />
                <span className="truncate">{tr('이번 주 수업 가이드')}</span>
                {weekLabel && (
                  <span className="text-slate-400 font-medium text-sm shrink-0 truncate max-w-[11rem] sm:max-w-none">
                    · {tr(weekLabel)}
                  </span>
                )}
              </h3>
              <span className="hidden md:inline-block px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded border border-slate-700 shrink-0">
                {tr(DASHBOARD_ROW1_GROUP_LABEL)}
              </span>
            </div>
            {onGoToLibrary && (
              <button
                type="button"
                onClick={() => onGoToLibrary('co-op')}
                className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                {tr('전체보기')} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
            {weekTheme.items.slice(0, 4).map((item, idx) => (
              <ProgramCardRow1
                key={`row1-${idx}-${item.programId}`}
                programId={item.programId}
                role={item.role}
                tag2={item.tag2 ?? []}
                programDetail={programDetails[String(item.programId)] ?? null}
                onOpenProgram={() => openWithContext(item.programId, item.role, 'co-op')}
              />
            ))}
          </div>
          {weekTheme.items.length > 0 && weekTheme.items.length < 4 && (
            <p className="text-slate-500 text-sm">{tr('나머지 추천은 곧 채워질 예정이에요.')}</p>
          )}
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

        {/* Row2: 스포무브 (브레인체육) 4칸 */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 min-w-0 truncate">
              <Star className="w-5 h-5 text-orange-400 shrink-0" />
              <span className="truncate">{tr(DASHBOARD_ROW2_GROUP_LABEL)}</span>
            </h3>
            {onGoToLibrary && (
              <button
                type="button"
                onClick={() => onGoToLibrary('cognitive')}
                className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                {tr('전체보기')} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
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
          ) : screenplaysLoading && screenplays.length === 0 ? (
            <div className="text-slate-500 text-sm font-medium">{tr('스포무브 목록 불러오는 중...')}</div>
          ) : screenplays.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
              {tr('등록된 스포무브(Screenplay) 프로그램이 없습니다.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
              {screenplays.slice(0, 4).map((item, idx) => (
                <ScreenplayCard
                  key={`row2-screenplay-${idx}-${item.id}`}
                  title={item.title ?? `Screenplay #${item.id}`}
                  subtitle={item.subtitle ?? item.modeId}
                  thumbnailUrl={item.thumbnailUrl}
                  onClick={() => onGoToLibrary?.('cognitive')}
                />
              ))}
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </section>
  );
}
