'use client';

import { useEffect } from 'react';
import { Zap, Star, ChevronRight } from 'lucide-react';
import { useSpokeduProDashboard } from '../hooks/useSpokeduProDashboard';
import {
  DEFAULT_DASHBOARD_V4,
  getProgramTitle,
  PROGRAM_BANK,
  THEME_LABELS,
  type ThemeKey,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import type { ProgramDetail } from '../types';

function ProgramCardRow1({
  programId,
  role,
  tag2,
  programDetail,
  onClick,
}: {
  programId: number;
  role: string;
  tag2: string[];
  programDetail?: ProgramDetail | null;
  onClick: () => void;
}) {
  const prog = PROGRAM_BANK.find((p) => p.id === programId);
  const gradient = prog?.gradient ?? 'from-orange-500 to-red-600';
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
          <span className="text-[10px] font-black uppercase text-white px-2 py-0.5 bg-black/60 rounded">{role}</span>
          {tags.map((t) => (
            <span key={t} className="text-[10px] font-black text-slate-300 px-2 py-0.5 bg-slate-800/60 rounded">
              {t}
            </span>
          ))}
        </div>
        <h4 className="text-white font-black text-lg md:text-xl line-clamp-2">{title}</h4>
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
          {tags.map((t) => (
            <span key={t} className="text-[10px] font-black text-slate-300 px-2 py-0.5 bg-slate-800/60 rounded">
              {t}
            </span>
          ))}
        </div>
        <h4 className="text-white font-black text-lg md:text-xl line-clamp-2">{title}</h4>
      </div>
    </div>
  );
}

export default function RoadmapView({
  onOpenDetail,
  onGoToLibrary,
  drawerContext,
  programDetails = {},
}: {
  onOpenDetail: (id: number, context?: { role?: string; themeKey?: string }) => void;
  onGoToLibrary?: (themeKey?: ThemeKey, preset?: string) => void;
  drawerContext?: { role?: string; themeKey?: string };
  programDetails?: Record<string, ProgramDetail>;
}) {
  const { data, weekLabel, loading, error, fetchDashboard } = useSpokeduProDashboard();

  useEffect(() => {
    const handler = () => fetchDashboard();
    window.addEventListener('spokedu-pro-dashboard-saved', handler);
    return () => window.removeEventListener('spokedu-pro-dashboard-saved', handler);
  }, [fetchDashboard]);

  const dashboard = data ?? DEFAULT_DASHBOARD_V4;
  const { weekTheme, row2 } = dashboard;

  const openWithContext = (programId: number, role?: string, themeKey?: string) => {
    onOpenDetail(programId, { role, themeKey });
  };

  return (
    <section className="pb-32 pt-0 mt-0">
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
              {weekTheme.badge}
            </span>
            {weekLabel && (
              <span className="text-slate-400 text-sm font-medium">{weekLabel}</span>
            )}
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight">
            {weekTheme.title}
          </h2>
          <p className="text-slate-300 font-medium leading-relaxed">{weekTheme.subtitle}</p>
          <p className="text-slate-500 text-sm">50분 전체 수업이 아니라, 웜업/리드업/놀이체육 파이를 책임집니다.</p>
        </div>
      </div>

      <div className="px-6 lg:px-12 mt-8 space-y-12">
        {error && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-sm text-red-300">
            <span className="flex-1">이번 주 추천을 불러오지 못했어요.</span>
            <button
              type="button"
              onClick={() => fetchDashboard()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors shrink-0"
            >
              다시 시도
            </button>
          </div>
        )}
        {loading && !data && (
          <div className="text-slate-400 font-medium">대시보드 불러오는 중...</div>
        )}

        {!error && data && dashboard.weekTheme.items.length === 0 && dashboard.row2.items.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <p className="font-medium">이번 주 추천이 아직 없어요.</p>
            <p className="text-sm mt-1">곧 업데이트될 예정이에요.</p>
          </div>
        )}

        {!error && (loading ? !!data : true) && (dashboard.weekTheme.items.length > 0 || dashboard.row2.items.length > 0) && (
        <>
        {/* Row1: 이번 주 수업 가이드 (고정) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 truncate">
                <Zap className="w-5 h-5 text-yellow-400 shrink-0" />
                <span className="truncate">이번 주 수업 가이드</span>
                {weekLabel && (
                  <span className="text-slate-400 font-medium text-sm shrink-0 hidden sm:inline">
                    · {weekLabel}
                  </span>
                )}
              </h3>
              <span className="hidden md:inline-block px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded border border-slate-700 shrink-0">
                {THEME_LABELS[weekTheme.themeKey]}
              </span>
            </div>
            {onGoToLibrary && (
              <button
                type="button"
                onClick={() => onGoToLibrary(weekTheme.themeKey)}
                className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                전체보기 <ChevronRight className="w-4 h-4" />
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
                onClick={() => openWithContext(item.programId, item.role, weekTheme.themeKey)}
              />
            ))}
          </div>
          {weekTheme.items.length > 0 && weekTheme.items.length < 4 && (
            <p className="text-slate-500 text-sm">나머지 추천은 곧 채워질 예정이에요.</p>
          )}
        </div>

        {/* Row2: 선생님 베스트 4개 */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 min-w-0 truncate">
              <Star className="w-5 h-5 text-orange-400 shrink-0" />
              <span className="truncate">{row2.title}</span>
            </h3>
            {onGoToLibrary && (
              <button
                type="button"
                onClick={() => onGoToLibrary(undefined, row2.preset)}
                className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                전체보기 <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
            {row2.items.slice(0, 4).map((item, idx) => (
              <ProgramCardRow2
                key={`row2-${idx}-${item.programId}`}
                programId={item.programId}
                tag2={item.tag2 ?? []}
                programDetail={programDetails[String(item.programId)] ?? null}
                onClick={() => onOpenDetail(item.programId, { themeKey: row2.preset })}
              />
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </section>
  );
}
