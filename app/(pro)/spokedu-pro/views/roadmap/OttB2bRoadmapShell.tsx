'use client';

import React, { useMemo, useState } from 'react';
import { useTranslator } from '@/app/providers/I18nProvider';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowRight,
  ChevronDown,
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
  /** 히어로 보조 CTA: SPOMOVE 쪽 진입(미지정 시 보조 버튼은 플랜·결제) */
  onHeroSpomove?: () => void;
  onOpenPlanBilling?: () => void;
  onOpenFeatured: (program: OttFeaturedProgram) => void;
  onMarketReport?: () => void;
  onSendToClass?: () => void;
  /** 구독자 슬림 히어로: 리포트·보조기능(미전달 시 해당 버튼 미표시) */
  onHeroReportTools?: () => void;
  /** 헤더 아래: 오늘 수업 카드 등 */
  belowHeader?: React.ReactNode;
  /** 금주 추천 라인업 섹션 상단 라벨·제목 */
  lineupEyebrow?: string;
  lineupTitle?: string;
  /** 구독자 홈: 지표·대형 히어로를 줄이고 이번 주 라인업을 앞에 둠 */
  subscriberHome?: boolean;
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
  onHeroSpomove,
  onOpenPlanBilling,
  onOpenFeatured,
  onMarketReport,
  onSendToClass,
  onHeroReportTools,
  belowHeader,
  lineupEyebrow = '프로그램 라이브러리',
  lineupTitle = '이번 주 추천',
  subscriberHome = false,
}: OttB2bRoadmapShellProps) {
  const tr = useTranslator();
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
          <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 shadow-xl shadow-black/20 backdrop-blur-xl sm:rounded-[2rem] sm:p-4 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-200/85 sm:text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.85)]" />
                {subscriberHome ? 'SPOKEDU PRO' : 'SPOKEDU B2B PLATFORM'}
              </div>
              <h1 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl md:text-2xl">
                {subscriberHome ? tr('오늘의 수업 허브') : tr('프리미엄 콘텐츠 대시보드')}
              </h1>
              {subscriberHome ? (
                <p className="mt-1 text-xs leading-snug text-zinc-500 sm:text-sm">{tr('아래에서 이번 주 추천과 교구 아이디어를 이어서 확인하세요.')}</p>
              ) : null}
            </div>

            <div className="flex w-full items-center gap-2 md:w-auto md:max-w-md md:flex-1 md:justify-end">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 sm:left-4" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={subscriberHome ? tr('추천 구성에서 검색…') : tr('수업, 프로그램 검색')}
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30 focus:bg-black/50 sm:h-12 sm:rounded-2xl sm:pl-11 sm:pr-4"
                />
              </div>
              {!subscriberHome ? (
                <button
                  type="button"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white hover:text-black sm:h-12 sm:rounded-2xl"
                  aria-label="필터"
                >
                  <Filter className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </header>

          {belowHeader ? <div className="mt-4">{belowHeader}</div> : null}

          {subscriberHome ? (
            <>
              <section className="mt-5 min-w-0 max-w-full sm:mt-6">
                <div className="flex min-w-0 max-w-full flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 sm:text-sm sm:tracking-[0.25em]">
                      {lineupEyebrow}
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:mt-2 sm:text-2xl md:text-3xl">
                      {lineupTitle}
                    </h2>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredPrograms.slice(0, 4).map((program) => (
                    <div key={`${program.id}-${program.isScreenplay ? 'sp' : 'pg'}`} className="min-w-0">
                      <ProgramPoster program={program} onOpen={onOpenFeatured} />
                    </div>
                  ))}
                </div>
              </section>

              <details className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] sm:mt-6 open:border-white/15">
                <summary className="cursor-pointer list-none px-4 py-3.5 text-left sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 text-sm font-semibold text-zinc-200 hover:text-white">
                  <span>{tr('추가 추천·안내')}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 opacity-80" aria-hidden />
                </summary>
                <div className="border-t border-white/10 px-2 pb-4 pt-2 sm:px-3 sm:pb-5 space-y-6">
                  {spotlightCards.length > 0 ? (
                    <section className="min-w-0 max-w-full">
                      <div className="flex min-w-0 max-w-full flex-col gap-2 md:flex-row md:items-end md:justify-between px-2">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 sm:text-sm">
                            {tr('교구 큐레이션')}
                          </p>
                          <h2 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl md:text-2xl">
                            {spotlightTitle?.trim() ? spotlightTitle.trim() : tr('추천 활동')}
                          </h2>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                        {spotlightCards.slice(0, 4).map((program) => (
                          <div key={`spotlight-${program.id}`} className="min-w-0">
                            <ProgramPoster program={program} onOpen={openSpotlight} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-lg shadow-black/30 sm:rounded-[2rem]">
                    <div className="relative min-h-[200px] bg-[radial-gradient(circle_at_20%_20%,rgba(217,70,239,0.28),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.22),transparent_28%),linear-gradient(135deg,#111827_0%,#020617_50%,#000_100%)] p-5 sm:min-h-[220px] sm:p-6 md:p-8">
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.2)_100%)]" />
                      <div className="relative z-10 flex max-w-2xl flex-col justify-center py-2 sm:py-4">
                        <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md sm:text-xs sm:px-4 sm:py-2">
                          <Flame className="h-3.5 w-3.5 text-orange-300 sm:h-4 sm:w-4" />
                          {heroBadge}
                        </div>
                        <p className="mt-3 text-xs font-semibold text-cyan-200/90 sm:text-sm">{nowPlayingTitle}</p>
                        <h2 className="mt-2 text-xl font-black leading-[1.15] tracking-tight text-white sm:text-2xl md:text-3xl">
                          {tr('체육 수업 준비·운영·설명을')}{' '}
                          <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
                            {tr('한 화면에서.')}
                          </span>
                        </h2>
                        <p className="mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-zinc-300 sm:mt-4">
                          {heroSubtitle}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
                          <button
                            type="button"
                            onClick={onBrowsePremium}
                            className="group inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black transition hover:brightness-110 sm:rounded-2xl sm:px-5 sm:text-sm"
                          >
                            <Play className="h-4 w-4 shrink-0" />
                            {tr('라이브러리 보기')}
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => (onHeroSpomove ?? onOpenPlanBilling)?.()}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black text-white backdrop-blur-md transition hover:bg-white/20 sm:rounded-2xl sm:px-5 sm:text-sm"
                          >
                            <Sparkles className="h-4 w-4 shrink-0" />
                            {onHeroSpomove ? tr('SPOMOVE 모음 보기') : tr('플랜&결제')}
                          </button>
                          {onHeroReportTools ? (
                            <button
                              type="button"
                              onClick={onHeroReportTools}
                              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-950/40 px-4 py-2.5 text-xs font-black text-violet-100 backdrop-blur-md transition hover:bg-violet-900/50 sm:rounded-2xl sm:px-5 sm:text-sm"
                            >
                              <TrendingUp className="h-4 w-4 shrink-0" />
                              {tr('성장 리포트')}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </details>
            </>
          ) : (
            <>
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
                      {tr('체육 수업 준비·운영·설명을')}
                      <br />
                      <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
                        {tr('한 화면에서.')}
                      </span>
                    </h2>

                    <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-zinc-300 md:text-lg">
                      {heroSubtitle}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={onBrowsePremium}
                        className="group inline-flex h-14 items-center gap-3 rounded-2xl bg-white px-6 text-sm font-black text-black transition hover:scale-[1.02]"
                      >
                        <Play className="h-4 w-4" />
                        {tr('프로그램 라이브러리')}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </button>

                      <button
                        type="button"
                        onClick={() => (onHeroSpomove ?? onOpenPlanBilling)?.()}
                        className="inline-flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-6 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/20"
                      >
                        <Sparkles className="h-4 w-4" />
                        {onHeroSpomove ? tr('SPOMOVE 바로 실행') : tr('플랜&결제')}
                      </button>
                    </div>

                    <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                      {[
                        [tr('프로그램 라이브러리'), tr('영상과 진행 요약으로 빠르게 고릅니다')],
                        [tr('SPOMOVE'), tr('스크린 반응훈련으로 몰입을 올립니다')],
                        [tr('리포트·보조'), tr('학부모·기관에 수업 가치를 설명합니다')],
                      ].map(([title, desc]) => (
                        <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
                          <p className="text-xl font-black text-white">{title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{desc}</p>
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
                        {spotlightTitle?.trim() ? spotlightTitle.trim() : tr('추천 활동')}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
