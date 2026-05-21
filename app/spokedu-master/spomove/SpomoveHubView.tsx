'use client';

import {
  Brain,
  ChevronRight,
  Clock3,
  Gamepad2,
  Goal,
  Lock,
  Maximize,
  MonitorPlay,
  Play,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  TimerReset,
  Trophy,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { formatReactionTime } from '../lib/utils';
import { useIsPro, useMasterStore, useStats } from '../store';
import type { Drill, Program } from '../types';

type IntentKey = 'warmup' | 'reaction' | 'focus' | 'finish';

const DRILL_NAME_FALLBACK: Record<string, string> = {
  'SR-05': '스피드 리액션',
  'SR-06': '방향 전환 챌린지',
  'RS-05': '팀 콜 사인',
  'IC-05': '스텝 밸런스',
  'RC-05': '리듬 체인지',
};

const CATEGORY_FALLBACK: Record<string, string> = {
  'SR-05': '시각 반응',
  'SR-06': '방향 전환',
  'RS-05': '협동 반응',
  'IC-05': '균형 조절',
  'RC-05': '리듬 반응',
};

const BROKEN_TEXT_PATTERN = /[\u4E00-\u9FFF\uF900-\uFAFF\uFFFD]/;

const FEATURED_MODE_ORDER = ['reactTrain', 'basic', 'simon', 'flanker'];

const INTENT_META: Record<
  IntentKey,
  {
    title: string;
    caption: string;
    badge: string;
    tone: string;
    icon: LucideIcon;
    matcher: RegExp;
  }
> = {
  warmup: {
    title: '도입 3분 집중 전환',
    caption: '수업 시작 전 시선과 움직임을 한 번에 모읍니다.',
    badge: 'Warm-up',
    tone: '#818cf8',
    icon: TimerReset,
    matcher: /warm|start|도입|집중|시선|신호|sr|visual|reaction|반응|스피드|순발/i,
  },
  reaction: {
    title: '수업 중 반응 전환',
    caption: '흐트러진 분위기를 방향, 신호, 순발 활동으로 다시 끌어올립니다.',
    badge: 'Reaction',
    tone: '#10b981',
    icon: Goal,
    matcher: /direction|flow|diagonal|공간|방향|전환|민첩|거리|펜싱|agility/i,
  },
  focus: {
    title: '기억·판단 챌린지',
    caption: '규칙 이해, 순간 판단, 패턴 기억을 짧고 선명하게 훈련합니다.',
    badge: 'Focus',
    tone: '#f59e0b',
    icon: Brain,
    matcher: /memory|pattern|spatial|기억|판단|패턴|집중|인지|sm|rc/i,
  },
  finish: {
    title: '마무리 참여 게임',
    caption: '마지막까지 참여감을 유지하고 수업을 기분 좋게 닫습니다.',
    badge: 'Finish',
    tone: '#ec4899',
    icon: Trophy,
    matcher: /finish|ending|마무리|정리|협동|리듬|게임|team/i,
  },
};

const CARD_GRADIENTS = [
  'linear-gradient(145deg,#0f172a 0%,#312e81 48%,#4f46e5 100%)',
  'linear-gradient(145deg,#052e16 0%,#064e3b 50%,#059669 100%)',
  'linear-gradient(145deg,#1f1338 0%,#4c1d95 50%,#7c3aed 100%)',
  'linear-gradient(145deg,#3f0b1f 0%,#831843 48%,#db2777 100%)',
];

function cleanText(value: string | undefined, fallback: string) {
  if (!value || BROKEN_TEXT_PATTERN.test(value)) return fallback;
  return value;
}

function getDrillName(drill: Drill) {
  return cleanText(drill.name, DRILL_NAME_FALLBACK[drill.id] ?? drill.category ?? drill.enName ?? 'SPOMOVE');
}

function getDrillCategory(drill: Drill) {
  return cleanText(drill.category, CATEGORY_FALLBACK[drill.id] ?? drill.tag ?? 'SPOMOVE');
}

function getDrillText(drill: Drill) {
  return `${drill.id} ${getDrillName(drill)} ${getDrillCategory(drill)} ${drill.description ?? ''} ${drill.tag ?? ''} ${drill.enName ?? ''} ${drill.engine?.mode ?? ''}`;
}

function getDrillIntent(drill: Drill): IntentKey {
  const text = getDrillText(drill);
  const matched = (Object.keys(INTENT_META) as IntentKey[]).find((key) => INTENT_META[key].matcher.test(text));
  return matched ?? 'warmup';
}

function getIntentLabel(drill: Drill) {
  return INTENT_META[getDrillIntent(drill)].title;
}

function getDrillsByIntent(drills: Drill[], intent: IntentKey, limit = 3) {
  const matched = drills.filter((drill) => INTENT_META[intent].matcher.test(getDrillText(drill)));
  return (matched.length ? matched : drills).slice(0, limit);
}

function getLinkedPrograms(drill: Drill, programs: Program[]) {
  return programs.filter((program) => program.lessonDetail?.relatedSpomoveIds?.includes(drill.id)).slice(0, 3);
}

function DrillCard({ drill, index, isLocked, linkedPrograms }: { drill: Drill; index: number; isLocked: boolean; linkedPrograms: Program[] }) {
  const intent = getDrillIntent(drill);
  const meta = INTENT_META[intent];
  const href = isLocked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`;
  const description = drill.description || getIntentLabel(drill);

  return (
    <Link
      href={href}
      className="group relative flex min-h-[228px] flex-col justify-between overflow-hidden rounded-3xl p-5 transition hover:-translate-y-0.5"
      style={{ background: CARD_GRADIENTS[index % CARD_GRADIENTS.length], border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 70px rgba(0,0,0,0.28)' }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 text-xl text-white">
          {drill.icon || <Zap className="h-5 w-5" />}
        </span>
        <span className="rounded-full bg-black/30 px-3 py-1 text-[11px] font-black text-white/70">{drill.tag || meta.badge}</span>
      </div>

      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">{drill.enName || getDrillCategory(drill)}</p>
        <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-white">{getDrillName(drill)}</h3>
        <p className="mt-3 line-clamp-1 text-sm font-semibold leading-6 text-white/64">
          {linkedPrograms.length > 0 ? `${linkedPrograms.length}개 수업 연동` : description}
        </p>
      </div>

      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/14 px-4 text-xs font-black text-white">
          <MonitorPlay className="h-4 w-4" />
          설정으로
        </span>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/16 transition group-hover:scale-105">
          {isLocked ? <Lock className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 fill-white text-white" />}
        </span>
      </div>

      {isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/65 backdrop-blur-[3px]">
          <span className="rounded-2xl border border-amber-300/35 bg-amber-300/14 px-4 py-2 text-xs font-black text-amber-100">PRO 전용</span>
        </div>
      ) : null}
    </Link>
  );
}

function IntentSection({ id, intent, drills, isPro }: { id: string; intent: IntentKey; drills: Drill[]; isPro: boolean }) {
  if (drills.length === 0) return null;
  const meta = INTENT_META[intent];
  const Icon = meta.icon;
  const first = drills[0];
  const firstLocked = first.isPro && !isPro;

  return (
    <section id={id} className="scroll-mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045]">
      <div className="flex flex-col gap-4 border-b border-white/8 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${meta.tone}20`, color: meta.tone }}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{meta.badge}</p>
            <h2 className="mt-1 text-xl font-black text-white">{meta.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{meta.caption}</p>
          </div>
        </div>
        {!firstLocked ? (
          <Link
            href={`/spokedu-master/spomove/session?drill=${first.id}&mode=projector`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black"
            style={{ background: `${meta.tone}18`, color: meta.tone, border: `1px solid ${meta.tone}28` }}
          >
            <Play className="h-4 w-4 fill-current" />
            바로 실행
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-3">
        {drills.map((drill) => {
          const locked = drill.isPro && !isPro;
          return (
            <Link
              key={`${id}-${drill.id}`}
              href={locked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`}
              className="flex min-h-[92px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:bg-white/[0.075]"
            >
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${meta.tone}18`, color: meta.tone }}>
                {drill.icon || <Zap className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="line-clamp-1 text-sm font-black text-white">{getDrillName(drill)}</strong>
                <span className="mt-1 block text-xs font-semibold text-slate-500">{locked ? 'PRO 플랜 필요' : drill.enName || getDrillCategory(drill)}</span>
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${meta.tone}18`, color: meta.tone }}>
                {locked ? <Lock className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function LaunchModeCard({ href, icon: Icon, title, caption, tone }: { href: string; icon: LucideIcon; title: string; caption: string; tone: string }) {
  return (
    <Link href={href} className="flex min-h-[120px] flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.052] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${tone}18`, color: tone }}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <strong className="block text-base font-black text-white">{title}</strong>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-400">{caption}</span>
      </span>
    </Link>
  );
}

function CatalogModeCard({ drill, isLocked, linkedPrograms }: { drill: Drill; isLocked: boolean; linkedPrograms: Program[] }) {
  const href = isLocked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`;
  const tone = drill.bgColor || '#818cf8';
  const levelCount = drill.levels?.length ?? 1;
  const firstLevel = drill.levels?.[0];

  return (
    <Link
      href={href}
      className="group grid min-h-[188px] grid-cols-[auto_1fr] gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.075]"
    >
      <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${tone}22`, color: tone }}>
        {drill.icon || <Zap className="h-6 w-6" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-black text-slate-300">{drill.tag || getDrillCategory(drill)}</span>
          <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-black text-slate-300">{levelCount}단계</span>
          {isLocked ? <span className="rounded-full bg-amber-300/14 px-2.5 py-1 text-[11px] font-black text-amber-100">PRO</span> : null}
        </span>
        <strong className="mt-3 line-clamp-1 block text-lg font-black text-white">{getDrillName(drill)}</strong>
        <span className="mt-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{drill.enName}</span>
        <span className="mt-3 line-clamp-2 block text-sm leading-6 text-slate-400">{drill.description}</span>
        <span className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-black text-slate-950">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            설정으로
          </span>
          {linkedPrograms.length > 0 ? (
            <span className="inline-flex h-9 items-center rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-300">{linkedPrograms.length}개 수업 연동</span>
          ) : firstLevel ? (
            <span className="inline-flex h-9 min-w-0 items-center rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-300">{firstLevel.enName}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

export default function SpomoveHubView() {
  const isPro = useIsPro();
  const sessions = useMasterStore((state) => state.sessions);
  const drills = useMasterStore((state) => state.drills);
  const programs = useMasterStore((state) => state.programs);
  const stats = useStats();

  const defaultDrill = drills[0];
  const defaultDrillId = defaultDrill?.id ?? 'reactTrain';

  const warmupDrills = useMemo(() => getDrillsByIntent(drills, 'warmup'), [drills]);
  const reactionDrills = useMemo(() => getDrillsByIntent(drills, 'reaction'), [drills]);
  const focusDrills = useMemo(() => getDrillsByIntent(drills, 'focus'), [drills]);
  const finishDrills = useMemo(() => getDrillsByIntent(drills, 'finish'), [drills]);
  const featuredDrills = useMemo(() => {
    const proAware = isPro ? drills : drills.filter((drill) => !drill.isPro);
    const source = proAware.length ? proAware : drills;
    const ordered = FEATURED_MODE_ORDER.map((mode) => source.find((drill) => drill.id === mode || drill.engine?.mode === mode)).filter(Boolean) as Drill[];
    const rest = source.filter((drill) => !ordered.some((featured) => featured.id === drill.id));
    return [...ordered, ...rest].slice(0, 4);
  }, [drills, isPro]);
  const recent = sessions.slice(0, 3);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
      <header>
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/72">
          <div className="relative min-h-[420px] p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#020617,#0f172a_52%,#111827)]" />
            <div className="relative flex h-full min-h-[340px] flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-indigo-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Screen Movement Engine
                </span>
                <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  빔, TV, 태블릿에 켜는
                  <br />
                  움직임 몰입 엔진.
                </h1>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-950">
                  <MonitorPlay className="h-4 w-4" />
                  지금 큰 화면 실행
                </Link>
                <Link href="/spokedu-master/library" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-5 text-sm font-bold text-white">
                  <Gamepad2 className="h-4 w-4" />
                  수업과 연결하기
                </Link>
              </div>
            </div>
          </div>
        </section>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-300">Launch Modes</p>
            <h2 className="mt-1 text-xl font-black text-white">수업 환경에 맞춰 실행</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <LaunchModeCard href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`} icon={MonitorPlay} title="큰 화면" caption="빔, TV, 노트북 화면으로 바로 실행" tone="#818cf8" />
          <LaunchModeCard href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=mobile`} icon={Smartphone} title="모바일" caption="강사가 손에 들고 짧게 진행" tone="#10b981" />
          <LaunchModeCard href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=class`} icon={Maximize} title="Class Mode" caption="수업안 흐름과 함께 운영" tone="#f59e0b" />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-300">Featured</p>
            <h2 className="mt-1 text-xl font-black text-white">실제 SPOMOVE 트레이닝</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featuredDrills.map((drill, index) => (
            <DrillCard key={drill.id} drill={drill} index={index} isLocked={drill.isPro && !isPro} linkedPrograms={getLinkedPrograms(drill, programs)} />
          ))}
        </div>
      </section>

      <section className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(Object.keys(INTENT_META) as IntentKey[]).map((intent) => {
          const meta = INTENT_META[intent];
          return (
            <a key={intent} href={`#${intent}`} className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-white/[0.085]">
              {meta.title}
            </a>
          );
        })}
      </section>

      <section className="space-y-4">
        <IntentSection id="warmup" intent="warmup" drills={warmupDrills} isPro={isPro} />
        <IntentSection id="reaction" intent="reaction" drills={reactionDrills} isPro={isPro} />
        <IntentSection id="focus" intent="focus" drills={focusDrills} isPro={isPro} />
        <IntentSection id="finish" intent="finish" drills={finishDrills} isPro={isPro} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-300">Training Catalog</p>
              <h2 className="mt-1 text-xl font-black text-white">실제 SPOMOVE 모드 전체</h2>
            </div>
            <span className="text-sm font-bold text-slate-500">{drills.length}개</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {drills.map((drill) => (
              <CatalogModeCard key={drill.id} drill={drill} isLocked={drill.isPro && !isPro} linkedPrograms={getLinkedPrograms(drill, programs)} />
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Recent</p>
                <h2 className="mt-1 text-lg font-black text-white">최근 실행</h2>
              </div>
              <Clock3 className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-4 space-y-3">
              {recent.length > 0 ? (
                recent.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <p className="truncate text-sm font-black text-white">{session.drillName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {new Date(session.date).toLocaleDateString('ko-KR')} · {session.cueCount}회 · 평균 {formatReactionTime(session.avg)}
                    </p>
                  </div>
                ))
              ) : (
                <Link href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <span>
                    <strong className="block text-sm font-black text-white">첫 SPOMOVE를 실행해보세요</strong>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">드릴을 선택해 첫 세션을 시작하세요.</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-500" />
                </Link>
              )}
            </div>
          </section>

          {stats.totalSessions > 0 ? (
            <section className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center">
                <p className="text-lg font-black text-white">{stats.totalSessions}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">세션</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center">
                <p className="text-lg font-black text-emerald-200">{formatReactionTime(stats.avgRT)}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">평균</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center">
                <p className="text-lg font-black text-white">{formatReactionTime(stats.bestRT)}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">최고</p>
              </div>
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
