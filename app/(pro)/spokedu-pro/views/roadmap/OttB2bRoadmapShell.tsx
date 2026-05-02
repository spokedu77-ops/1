'use client';

import React, { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Filter,
  Flame,
  Play,
  PlayCircle,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';

export type OttMetric = {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
};

export type OttFeaturedProgram = {
  id: number;
  title: string;
  category: string;
  /** 펑셔널 무브 카드 기준 메타(활동 테마/신체 기능/활용 교구 등) */
  metaSlots?: Array<{ label: string; value: string }>;
  tag: string;
  accent: string;
  gradient: string;
  thumbnailUrl?: string | null;
  isScreenplay?: boolean;
};

export function filterPrograms(programs: OttFeaturedProgram[], searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  return programs.filter((program) => {
    const metaText = (program.metaSlots ?? []).map((m) => `${m.label} ${m.value}`).join(' ');
    const searchableText = `${program.title} ${program.category} ${program.tag} ${metaText}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);
    return matchesSearch;
  });
}

function MetricCard({ metric }: { metric: OttMetric }) {
  const Icon = metric.icon;
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01]">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
          {metric.change}
        </span>
      </div>
      <div className="mt-5">
        <p className="text-sm text-zinc-400">{metric.label}</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-white">{metric.value}</p>
      </div>
    </div>
  );
}

function ProgramPoster({
  program,
  onOpen,
}: {
  program: OttFeaturedProgram;
  onOpen: (program: OttFeaturedProgram) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(program)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(program);
        }
      }}
      className="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.06] shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-2 hover:border-white/25"
    >
      <div className={`relative aspect-video w-full bg-gradient-to-br ${program.gradient}`}>
        {program.thumbnailUrl ? (
          <img
            src={program.thumbnailUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-center scale-[1.12] transition-transform duration-500 group-hover:scale-[1.18]"
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.14),transparent_38%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
          <span className="truncate rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            {program.tag}
          </span>
          <span className="rounded-full bg-white/15 p-2 text-white backdrop-blur-md transition group-hover:bg-white group-hover:text-black">
            <Play className="h-4 w-4" />
          </span>
        </div>

        {!program.thumbnailUrl ? (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <div
              className={`grid h-28 w-28 place-items-center rounded-[2rem] bg-gradient-to-br ${program.accent} shadow-2xl shadow-black/30`}
            >
              <Activity className="h-12 w-12 text-black/80" />
            </div>
          </div>
        ) : null}

        <div className="absolute bottom-4 left-4 right-4 z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">{program.category}</p>
          <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-white">{program.title}</h3>
        </div>
      </div>

      <div className="mt-auto space-y-4 p-5">
        <div className="grid grid-cols-3 gap-3 text-xs text-zinc-400">
          {(program.metaSlots?.slice(0, 3) ?? [
            { label: '활동 테마', value: '—' },
            { label: '신체 기능', value: '—' },
            { label: '활용 교구', value: '—' },
          ]).map((slot) => (
            <div key={slot.label} className="min-w-0">
              <p className="text-zinc-300/80">{slot.label}</p>
              <p className="mt-1 line-clamp-1 font-bold text-white/95">{slot.value}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export type OttB2bRoadmapShellProps = {
  metrics: OttMetric[];
  featuredPrograms: OttFeaturedProgram[];
  /** 교구 추천(예: 후프) — 실시간 인기 영역에 이식 */
  spotlightTitle?: string;
  spotlightPrograms?: OttFeaturedProgram[];
  onOpenSpotlight?: (program: OttFeaturedProgram) => void;
  /** 히어로 우측 Now Playing 제목 (예: 이번 주 테마 제목) */
  nowPlayingTitle: string;
  /** 히어로 배지 문구 */
  heroBadge: string;
  /** 히어로 부제 (2~3문장) */
  heroSubtitle: string;
  onBrowsePremium: () => void;
  onOpenPlanBilling?: () => void;
  onOpenFeatured: (program: OttFeaturedProgram) => void;
  onMarketReport?: () => void;
  onSendToClass?: () => void;
  /** 헤더 아래: 오늘 수업 카드 등 */
  belowHeader?: React.ReactNode;
  /** 금주 추천 라인업 섹션 상단 라벨·제목 (기본: Browse Library / 스포키듀 오리지널 라인업) */
  lineupEyebrow?: string;
  lineupTitle?: string;
};

export function OttB2bRoadmapShell({
  metrics,
  featuredPrograms,
  spotlightTitle,
  spotlightPrograms,
  onOpenSpotlight,
  nowPlayingTitle,
  heroBadge,
  heroSubtitle,
  onBrowsePremium,
  onOpenPlanBilling,
  onOpenFeatured,
  onMarketReport,
  onSendToClass,
  belowHeader,
  lineupEyebrow = 'Browse Library',
  lineupTitle = '스포키듀 오리지널 라인업',
}: OttB2bRoadmapShellProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPrograms = useMemo(() => {
    return filterPrograms(featuredPrograms, searchTerm);
  }, [featuredPrograms, searchTerm]);

  const spotlightCards = spotlightPrograms?.slice(0, 4) ?? [];
  const openSpotlight = onOpenSpotlight ?? onOpenFeatured;

  return (
    <div className="relative isolate min-h-0 bg-[#050509] text-white selection:bg-fuchsia-500 selection:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-20%] h-[520px] w-[520px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-14%] top-[10%] h-[560px] w-[560px] rounded-full bg-cyan-500/20 blur-[130px]" />
        <div className="absolute bottom-[-18%] left-[30%] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(circle_at_top,black,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex w-full max-w-none gap-6 px-5 py-5 lg:px-8">
        <div className="min-w-0 flex-1">
          <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.9)]" />
                SPOKEDU B2B PLATFORM
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">프리미엄 콘텐츠 대시보드</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative min-w-0 flex-1 md:w-80">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="수업, 프로그램 검색"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30 focus:bg-black/50"
                />
              </div>

              <button
                type="button"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white hover:text-black"
                aria-label="필터"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </header>

          {belowHeader ? <div className="mt-4">{belowHeader}</div> : null}

          <section className="mt-6 overflow-hidden rounded-[2.5rem] border border-white/10 bg-black shadow-2xl shadow-black/40">
            <div className="relative min-h-[520px] bg-[radial-gradient(circle_at_25%_25%,rgba(217,70,239,0.4),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.32),transparent_24%),linear-gradient(135deg,#111827_0%,#020617_45%,#000_100%)] p-6 md:p-10">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.68)_34%,rgba(0,0,0,0.12)_100%)]" />

              <div className="absolute right-8 top-8 hidden h-[390px] w-[520px] rotate-2 overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/40 backdrop-blur-sm lg:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_32%)]" />

                <div className="grid h-full grid-cols-2 gap-3 p-5">
                  {['bg-fuchsia-400', 'bg-cyan-300', 'bg-lime-300', 'bg-orange-300'].map((color, index) => (
                    <div
                      key={`${color}-${index}`}
                      className={`${color} animate-pulse rounded-[2rem] shadow-2xl shadow-black/30`}
                    />
                  ))}
                </div>

                <div className="absolute inset-x-8 bottom-8 rounded-3xl border border-white/20 bg-black/45 p-4 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Now Playing</p>
                      <p className="mt-1 text-lg font-black text-white">{nowPlayingTitle}</p>
                    </div>
                    <PlayCircle className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex max-w-3xl flex-col justify-center py-10 md:py-16">
                <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md">
                  <Flame className="h-4 w-4 text-orange-300" />
                  {heroBadge}
                </div>

                <h2 className="mt-8 text-5xl font-black leading-[1.1] tracking-tight text-white md:text-7xl">
                  체육 교육의
                  <br />
                  <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">새로운 기준.</span>
                </h2>

                <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">{heroSubtitle}</p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onBrowsePremium}
                    className="group inline-flex h-14 items-center gap-3 rounded-2xl bg-white px-6 text-sm font-black text-black transition hover:scale-[1.02]"
                  >
                    <Play className="h-4 w-4" />
                    펑셔널 무브 144 둘러보기
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPlanBilling?.()}
                    className="inline-flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-6 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    플랜&결제
                  </button>
                </div>

                <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                  {[
                    ['Play', '놀이와 즐거움'],
                    ['Growth', '느린 아이도 함께'],
                    ['System', '검증된 연간 커리큘럼'],
                  ].map(([title, desc]) => (
                    <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
                      <p className="text-xl font-black text-white">{title}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </section>

          <section className="mt-8 min-w-0 max-w-full">
            <div className="flex min-w-0 max-w-full flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-zinc-500">{lineupEyebrow}</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{lineupTitle}</h2>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPrograms.slice(0, 4).map((program) => (
                <div key={`${program.id}-${program.isScreenplay ? 'sp' : 'pg'}`} className="min-w-0">
                  <ProgramPoster program={program} onOpen={onOpenFeatured} />
                </div>
              ))}
            </div>
          </section>

          {spotlightCards.length > 0 ? (
            <section className="mt-10 min-w-0 max-w-full">
              <div className="flex min-w-0 max-w-full flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-zinc-500">교구 큐레이션</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                    {spotlightTitle?.trim() ? spotlightTitle.trim() : '교구로 하는 추천 프로그램'}
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {spotlightCards.slice(0, 4).map((program) => (
                  <div key={`spotlight-${program.id}`} className="min-w-0">
                    <ProgramPoster program={program} onOpen={openSpotlight} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
