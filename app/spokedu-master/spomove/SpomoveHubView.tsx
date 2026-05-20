'use client';

import {
  Activity,
  Brain,
  ChevronRight,
  Clock3,
  Gamepad2,
  Goal,
  History,
  Lock,
  Maximize,
  MonitorPlay,
  Play,
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
    matcher: /warm|start|도입|집중|시선|신호|sr|visual|reaction|반응|속도|스피드|순발/i,
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
    caption: '마지막까지 아이들의 참여감을 유지하고 수업을 기분 좋게 닫습니다.',
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

function getDrillText(drill: Drill) {
  return `${drill.id} ${drill.name} ${drill.category} ${drill.engine?.mode ?? ''}`;
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
  return programs
    .filter((program) => program.lessonDetail?.relatedSpomoveIds?.includes(drill.id))
    .slice(0, 3);
}

function DrillCard({
  drill,
  index,
  isLocked,
  linkedPrograms,
}: {
  drill: Drill;
  index: number;
  isLocked: boolean;
  linkedPrograms: Program[];
}) {
  const intent = getDrillIntent(drill);
  const meta = INTENT_META[intent];
  const href = isLocked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`;

  return (
    <Link
      href={href}
      className="group relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-3xl p-5 transition hover:-translate-y-0.5"
      style={{ background: CARD_GRADIENTS[index % CARD_GRADIENTS.length], border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 70px rgba(0,0,0,0.28)' }}
    >
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 text-white">
          <Zap className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-black/30 px-3 py-1 text-[11px] font-black text-white/70">{meta.badge}</span>
      </div>

      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">{drill.category}</p>
        <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-white">{drill.name}</h3>
        <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-white/64">
          {linkedPrograms.length > 0 ? `${linkedPrograms[0].title} 등 ${linkedPrograms.length}개 수업과 연결됩니다.` : getIntentLabel(drill)}
        </p>
      </div>

      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/14 px-4 text-xs font-black text-white">
          <MonitorPlay className="h-4 w-4" />
          큰 화면 실행
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

function IntentSection({
  id,
  intent,
  drills,
  isPro,
}: {
  id: string;
  intent: IntentKey;
  drills: Drill[];
  isPro: boolean;
}) {
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
                <Zap className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="line-clamp-1 text-sm font-black text-white">{drill.name}</strong>
                <span className="mt-1 block text-xs font-semibold text-slate-500">{locked ? 'PRO 플랜 필요' : drill.category}</span>
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

function LaunchModeCard({
  href,
  icon: Icon,
  title,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[100px] flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.052] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${tone}18`, color: tone }}>
        <Icon className="h-5 w-5" />
      </span>
      <strong className="block text-base font-black text-white">{title}</strong>
    </Link>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${tone}18`, color: tone }}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

export default function SpomoveHubView() {
  const isPro = useIsPro();
  const sessions = useMasterStore((state) => state.sessions);
  const drills = useMasterStore((state) => state.drills);
  const programs = useMasterStore((state) => state.programs);
  const stats = useStats();

  const defaultDrill = drills[0];
  const defaultDrillId = defaultDrill?.id ?? 'SR-05';

  const warmupDrills = useMemo(() => getDrillsByIntent(drills, 'warmup'), [drills]);
  const reactionDrills = useMemo(() => getDrillsByIntent(drills, 'reaction'), [drills]);
  const focusDrills = useMemo(() => getDrillsByIntent(drills, 'focus'), [drills]);
  const finishDrills = useMemo(() => getDrillsByIntent(drills, 'finish'), [drills]);
  const featuredDrills = useMemo(() => {
    const proAware = isPro ? drills : drills.filter((drill) => !drill.isPro);
    return (proAware.length ? proAware : drills).slice(0, 4);
  }, [drills, isPro]);
  const linkedProgramCount = useMemo(() => {
    return programs.filter((program) => (program.lessonDetail?.relatedSpomoveIds?.length ?? 0) > 0).length;
  }, [programs]);

  const recent = sessions.slice(0, 3);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
      <header className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/72">
          <div className="relative min-h-[420px] p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(99,102,241,0.45),transparent_32%),radial-gradient(circle_at_76%_28%,rgba(16,185,129,0.25),transparent_30%),linear-gradient(135deg,#020617,#0f172a_48%,#020617)]" />
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
                <Link
                  href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-950"
                >
                  <MonitorPlay className="h-4 w-4" />
                  지금 큰 화면 실행
                </Link>
                <Link
                  href="/spokedu-master/library"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-5 text-sm font-bold text-white"
                >
                  <Gamepad2 className="h-4 w-4" />
                  연결 수업 찾기
                </Link>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Metric label="실행 가능한 드릴" value={`${drills.length}`} icon={Zap} tone="#818cf8" />
          <Metric label="라이브러리 연결 수업" value={`${linkedProgramCount}`} icon={Activity} tone="#10b981" />
          <Metric label="누적 실행 세션" value={`${stats.totalSessions}`} icon={History} tone="#f59e0b" />
        </aside>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-300">Launch Modes</p>
            <h2 className="mt-1 text-xl font-black text-white">수업 환경에 맞춰 실행</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <LaunchModeCard href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`} icon={MonitorPlay} title="큰 화면" tone="#818cf8" />
          <LaunchModeCard href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=mobile`} icon={Smartphone} title="모바일" tone="#10b981" />
          <LaunchModeCard href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=class`} icon={Maximize} title="Class Mode" tone="#f59e0b" />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-300">Featured</p>
            <h2 className="mt-1 text-xl font-black text-white">오늘 바로 쓸 SPOMOVE</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featuredDrills.map((drill, index) => (
            <DrillCard
              key={drill.id}
              drill={drill}
              index={index}
              isLocked={drill.isPro && !isPro}
              linkedPrograms={getLinkedPrograms(drill, programs)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {(Object.keys(INTENT_META) as IntentKey[]).map((intent) => {
          const meta = INTENT_META[intent];
          const Icon = meta.icon;
          return (
            <a
              key={intent}
              href={`#${intent}`}
              className="flex min-h-[116px] flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition hover:bg-white/[0.075]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${meta.tone}18`, color: meta.tone }}>
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm font-black text-white">{meta.title}</strong>
                <span className="mt-1 block text-xs font-semibold text-slate-500">{meta.badge}</span>
              </span>
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
              <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-300">All Drills</p>
              <h2 className="mt-1 text-xl font-black text-white">전체 실행 목록</h2>
            </div>
            <span className="text-sm font-bold text-slate-500">{drills.length}개</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {drills.map((drill) => {
              const intent = getDrillIntent(drill);
              const meta = INTENT_META[intent];
              const locked = drill.isPro && !isPro;
              return (
                <Link
                  key={drill.id}
                  href={locked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:bg-white/[0.075]"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${meta.tone}18`, color: meta.tone }}>
                    <Zap className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="line-clamp-1 text-sm font-black text-white">{drill.name}</strong>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">{meta.title}</span>
                  </span>
                  {locked ? <Lock className="h-4 w-4 text-amber-200" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                </Link>
              );
            })}
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
                    <span className="mt-1 block text-xs font-semibold text-slate-500">드릴을 선택해 첫 세션을 시작하세요</span>
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
