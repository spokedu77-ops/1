'use client';

import {
  Brain,
  ChevronRight,
  Clock3,
  Gauge,
  Lock,
  Maximize,
  MonitorPlay,
  Play,
  Shapes,
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

import { cleanText } from '../lib/clean';
import { formatReactionTime } from '../lib/utils';
import { useIsPro, useMasterStore, useStats } from '../store';
import type { Drill } from '../types';

type IntentKey = 'ready' | 'reaction' | 'control' | 'flow';

type ModePreset = {
  name: string;
  enName: string;
  category: string;
  description: string;
  icon: string;
  tag: string;
  intent: IntentKey;
};

const MODE_ALIASES: Record<string, string> = {
  'SR-05': 'reactTrain',
  'SR-06': 'basic',
  'RS-05': 'simon',
  'IC-05': 'flanker',
  'RC-05': 'flow',
};

const MODE_PRESETS: Record<string, ModePreset> = {
  reactTrain: {
    name: '시지각 반응',
    enName: 'Visual Reaction',
    category: '색 자극 반응',
    description: '색 자극이 떨어질 때 해당 색 위치를 밟는 시지각 및 반응 훈련입니다.',
    icon: '◆',
    tag: '색 자극',
    intent: 'ready',
  },
  basic: {
    name: '반응 인지',
    enName: 'Reactive Cognition',
    category: '즉시 판단',
    description: '화면 신호를 보는 순간 판단하고 즉시 움직이는 기본 반응 훈련입니다.',
    icon: '⚡',
    tag: '인지 반응',
    intent: 'ready',
  },
  simon: {
    name: '사이먼 효과',
    enName: 'Simon Effect',
    category: '간섭 억제',
    description: '위치와 색이 충돌할 때, 규칙에 맞는 색 위치로 이동합니다.',
    icon: '◈',
    tag: '판단 전환',
    intent: 'reaction',
  },
  flanker: {
    name: '플랭커',
    enName: 'Flanker',
    category: '주의 집중',
    description: '가운데 자극만 보고 주변 방해 자극을 억제하는 집중 훈련입니다.',
    icon: '◎',
    tag: '집중',
    intent: 'control',
  },
  gonogo: {
    name: 'Go / No-Go',
    enName: 'Go / No-Go',
    category: '반응 억제',
    description: '움직여야 할 때와 멈춰야 할 때를 구분해 반응을 조절합니다.',
    icon: '🛑',
    tag: '멈춤 조절',
    intent: 'control',
  },
  taskswitch: {
    name: 'Task Switching',
    enName: 'Task Switching',
    category: '규칙 전환',
    description: '큐에 따라 색, 위치, 반대 규칙을 바꾸며 빠르게 반응합니다.',
    icon: '🔀',
    tag: '규칙 전환',
    intent: 'reaction',
  },
  spatial: {
    name: '순차 기억',
    enName: 'Sequential Memory',
    category: '작업 기억',
    description: '색깔이 차례로 나타나는 순서를 기억하고 재현합니다.',
    icon: '🎨',
    tag: '순서 기억',
    intent: 'control',
  },
  stroop: {
    name: '스트룹 과제',
    enName: 'Stroop Task',
    category: '인지 억제',
    description: '화살표와 글자 과제에서 규칙에 따라 방향, 색, 의미를 판단합니다.',
    icon: '🧠',
    tag: '인지 조절',
    intent: 'control',
  },
  flow: {
    name: '플로우',
    enName: 'Flow Mode',
    category: '몰입 러닝',
    description: '우주 러닝 FLOW를 SPOMOVE에서 바로 실행하는 몰입형 활동입니다.',
    icon: '🌌',
    tag: '몰입',
    intent: 'flow',
  },
};

const INTENT_META: Record<
  IntentKey,
  {
    title: string;
    caption: string;
    badge: string;
    tone: string;
    icon: LucideIcon;
  }
> = {
  ready: {
    title: '수업 시작 3분',
    caption: '아이들의 시선과 움직임을 한 번에 모으는 진입 루틴입니다.',
    badge: 'Ready',
    tone: '#635bff',
    icon: TimerReset,
  },
  reaction: {
    title: '반응 전환',
    caption: '색, 위치, 규칙이 바뀌는 순간 판단하고 움직이게 합니다.',
    badge: 'Reaction',
    tone: '#10b981',
    icon: Gauge,
  },
  control: {
    title: '집중 조절',
    caption: '멈춤, 억제, 기억, 주의 집중을 놀이처럼 훈련합니다.',
    badge: 'Control',
    tone: '#f59e0b',
    icon: Brain,
  },
  flow: {
    title: '마무리 몰입',
    caption: '수업의 마지막 에너지를 큰 화면 활동으로 정리합니다.',
    badge: 'Flow',
    tone: '#ec4899',
    icon: Trophy,
  },
};

const MODE_ORDER = ['reactTrain', 'basic', 'simon', 'flanker', 'gonogo', 'taskswitch', 'spatial', 'stroop', 'flow'];
const NATIVE_ENGINE_MODES = new Set(['reactTrain', 'flow', 'flash', 'pattern', 'diagonal', 'memory', 'spatial']);

function canonicalMode(drill: Drill) {
  const raw = drill.engine?.mode || drill.id;
  return MODE_ALIASES[raw] || MODE_ALIASES[drill.id] || raw;
}

function modePreset(drill: Drill) {
  return MODE_PRESETS[canonicalMode(drill)] ?? MODE_PRESETS.reactTrain;
}

function drillName(drill: Drill) {
  return cleanText(drill.name, modePreset(drill).name);
}

function drillEnName(drill: Drill) {
  return cleanText(drill.enName, modePreset(drill).enName);
}

function drillDescription(drill: Drill) {
  return cleanText(drill.description, modePreset(drill).description);
}

function drillIcon(drill: Drill) {
  return cleanText(drill.icon, modePreset(drill).icon);
}

function drillTag(drill: Drill) {
  return cleanText(drill.tag, modePreset(drill).tag);
}

function drillIntent(drill: Drill): IntentKey {
  return modePreset(drill).intent;
}

function hasNativeEngine(drill: Drill) {
  const mode = drill.engine?.mode;
  return Boolean(mode && NATIVE_ENGINE_MODES.has(mode));
}

function sessionHref(drillId: string, mode: 'projector' | 'mobile' | 'class' = 'projector') {
  return `/spokedu-master/spomove/session?drill=${drillId}&mode=${mode}`;
}

function sortDrills(drills: Drill[]) {
  return [...drills].sort((a, b) => {
    const aIndex = MODE_ORDER.indexOf(canonicalMode(a));
    const bIndex = MODE_ORDER.indexOf(canonicalMode(b));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
}

function DrillGlyph({ drill, className = 'h-11 w-11 text-xl' }: { drill: Drill; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ${className}`}>{drillIcon(drill) || <Zap className="h-5 w-5" />}</span>;
}

function ScreenActivityPreview({ drill }: { drill?: Drill }) {
  const label = drill ? drillName(drill) : '시지각 반응';
  const tiles = [
    { label: 'RED', tone: '#ef4444' },
    { label: 'BLUE', tone: '#3b82f6' },
    { label: 'GO', tone: '#22c55e' },
    { label: 'STOP', tone: '#f59e0b' },
  ];

  return (
    <div className="relative hidden min-h-full overflow-hidden bg-slate-950 lg:block">
      <div className="absolute inset-8 rounded-[28px] border border-white/10 bg-slate-900" />
      <div className="absolute inset-8 flex items-center justify-center p-8">
        <div className="relative aspect-video w-full max-w-[360px] overflow-hidden rounded-[24px] border border-white/12 bg-black shadow-2xl">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 bg-white/8 px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/46">SPOMOVE LIVE</span>
            <span className="rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black text-slate-950">READY</span>
          </div>
          <div className="grid h-full grid-cols-2 gap-3 p-6 pt-16">
            {tiles.map((tile) => (
              <span key={tile.label} className="flex items-center justify-center rounded-2xl text-sm font-black text-white" style={{ background: tile.tone }}>
                {tile.label}
              </span>
            ))}
          </div>
          <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/10 bg-slate-950/82 p-4 backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-200/70">오늘 실행 모드</p>
            <p className="mt-1 text-xl font-black text-white">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LaunchModeCard({ href, icon: Icon, title, caption, tone }: { href: string; icon: LucideIcon; title: string; caption: string; tone: string }) {
  return (
    <Link href={href} className="group flex min-h-[116px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${tone}14`, color: tone }}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <strong className="block text-base font-black text-slate-950">{title}</strong>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{caption}</span>
      </span>
    </Link>
  );
}

function FeaturedCard({ drill, index, isLocked }: { drill: Drill; index: number; isLocked: boolean }) {
  const href = isLocked ? '/spokedu-master/payment?plan=pro' : sessionHref(drill.id);
  const tones = ['#635bff', '#10b981', '#f59e0b', '#ec4899'];
  const tone = tones[index % tones.length];
  const engineLabel = hasNativeEngine(drill) ? '전용 엔진' : '기본 실행';

  return (
    <Link href={href} className="group relative flex min-h-[236px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: tone }} />
      <div className="flex items-start justify-between gap-3">
        <DrillGlyph drill={drill} className="h-12 w-12 text-2xl" />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{drillTag(drill)}</span>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-500">{drillEnName(drill)}</p>
        <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-slate-950">{drillName(drill)}</h3>
        <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{drillDescription(drill)}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white">
          <SlidersHorizontal className="h-4 w-4" />
          설정으로
        </span>
        <span className="text-xs font-bold text-slate-500">{engineLabel}</span>
      </div>

      {isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
            <Lock className="h-3.5 w-3.5" />
            PRO 전용
          </span>
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
    <section id={id} className="scroll-mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${meta.tone}14`, color: meta.tone }}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{meta.badge}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{meta.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{meta.caption}</p>
          </div>
        </div>
        {!firstLocked ? (
          <Link href={sessionHref(first.id)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black" style={{ background: `${meta.tone}14`, color: meta.tone, border: `1px solid ${meta.tone}24` }}>
            <Play className="h-4 w-4 fill-current" />
            바로 실행
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-3">
        {drills.map((drill) => {
          const locked = drill.isPro && !isPro;
          return (
            <Link key={`${id}-${drill.id}`} href={locked ? '/spokedu-master/payment?plan=pro' : sessionHref(drill.id)} className="flex min-h-[96px] items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-white">
              <DrillGlyph drill={drill} className="h-12 w-12 text-xl" />
              <span className="min-w-0 flex-1">
                <strong className="line-clamp-1 text-sm font-black text-slate-950">{drillName(drill)}</strong>
                <span className="mt-1 block text-xs font-semibold text-slate-500">{locked ? 'PRO 플랜 필요' : drillEnName(drill)}</span>
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
                {locked ? <Lock className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CatalogModeCard({ drill, isLocked }: { drill: Drill; isLocked: boolean }) {
  const href = isLocked ? '/spokedu-master/payment?plan=pro' : sessionHref(drill.id);
  const levelCount = drill.levels?.length ?? 1;
  const firstLevel = drill.levels?.[0];
  const engineLabel = hasNativeEngine(drill) ? '전용 엔진' : '기본 실행';

  return (
    <Link href={href} className="group grid min-h-[188px] grid-cols-[auto_1fr] gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <DrillGlyph drill={drill} className="h-14 w-14 text-2xl" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{drillTag(drill)}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{levelCount}단계</span>
          {isLocked ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">PRO</span> : null}
        </span>
        <strong className="mt-3 line-clamp-1 block text-lg font-black text-slate-950">{drillName(drill)}</strong>
        <span className="mt-1 block text-xs font-black uppercase tracking-[0.12em] text-indigo-500">{drillEnName(drill)}</span>
        <span className="mt-3 line-clamp-2 block text-sm leading-6 text-slate-500">{drillDescription(drill)}</span>
        <span className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-black text-white">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            설정으로
          </span>
          <span className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600">{engineLabel}</span>
          {firstLevel ? (
            <span className="inline-flex h-9 min-w-0 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600">{firstLevel.enName}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

export default function SpomoveHubView() {
  const isPro = useIsPro();
  const sessions = useMasterStore((state) => state.sessions);
  const rawDrills = useMasterStore((state) => state.drills);
  const stats = useStats();

  const drills = useMemo(() => sortDrills(rawDrills), [rawDrills]);
  const defaultDrill = drills[0];
  const defaultDrillId = defaultDrill?.id ?? 'reactTrain';
  const featuredDrills = useMemo(() => {
    const visible = isPro ? drills : drills.filter((drill) => !drill.isPro);
    return (visible.length ? visible : drills).slice(0, 4);
  }, [drills, isPro]);
  const intentDrills = useMemo(
    () =>
      ({
        ready: drills.filter((drill) => drillIntent(drill) === 'ready'),
        reaction: drills.filter((drill) => drillIntent(drill) === 'reaction'),
        control: drills.filter((drill) => drillIntent(drill) === 'control'),
        flow: drills.filter((drill) => drillIntent(drill) === 'flow'),
      }) satisfies Record<IntentKey, Drill[]>,
    [drills],
  );
  const recent = sessions.slice(0, 3);
  const nativeEngineCount = useMemo(() => drills.filter(hasNativeEngine).length, [drills]);
  const fallbackEngineCount = Math.max(drills.length - nativeEngineCount, 0);
  const hubStats = [
    { label: '실행 모드', value: `${drills.length}개` },
    { label: '전용 엔진', value: `${nativeEngineCount}개` },
    { label: '기본 실행', value: `${fallbackEngineCount}개` },
  ];

  return (
    <main className="h-full overflow-y-auto bg-[#f5f7fb]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header>
          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="grid min-h-[390px] lg:grid-cols-[1fr_460px]">
              <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-600">
                    <Sparkles className="h-3.5 w-3.5" />
                    큰 화면 반응 수업
                  </span>
                  <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
                    체육관 TV가
                    <br />
                    바로 수업 도구가 됩니다.
                  </h1>
                  <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-slate-600">
                    색, 위치, 규칙 신호를 빔과 TV에 띄우고 아이들이 보고, 고르고, 움직입니다. 준비 설명보다 실행이 먼저인 체육교육 화면 활동입니다.
                  </p>
                  <div className="mt-6 grid max-w-xl grid-cols-3 gap-2">
                    {hubStats.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-black text-slate-400">{item.label}</p>
                        <p className="mt-1 text-xl font-black text-slate-950">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href={sessionHref(defaultDrillId)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-500">
                    <MonitorPlay className="h-4 w-4" />
                    큰 화면 실행
                  </Link>
                  <Link href="/spokedu-master/class-tools" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:border-indigo-200">
                    <Shapes className="h-4 w-4" />
                    수업 도구 열기
                  </Link>
                </div>
              </div>

              <ScreenActivityPreview drill={defaultDrill} />
            </div>
          </section>
        </header>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.14em] text-indigo-500">실행 환경</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">수업 환경에 맞게 실행</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <LaunchModeCard href={sessionHref(defaultDrillId, 'projector')} icon={MonitorPlay} title="큰 화면" caption="빔, TV, 노트북 화면으로 바로 실행" tone="#635bff" />
            <LaunchModeCard href={sessionHref(defaultDrillId, 'mobile')} icon={Smartphone} title="모바일" caption="강사가 손에 들고 빠르게 진행" tone="#10b981" />
            <LaunchModeCard href={sessionHref(defaultDrillId, 'class')} icon={Maximize} title="Class Mode" caption="수업 흐름과 단계까지 함께 운영" tone="#f59e0b" />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.14em] text-indigo-500">대표 활동</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">바로 실행하는 대표 모드</h2>
            </div>
          </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredDrills.map((drill, index) => (
              <FeaturedCard key={drill.id} drill={drill} index={index} isLocked={drill.isPro && !isPro} />
            ))}
          </div>
        </section>

        <section className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {(Object.keys(INTENT_META) as IntentKey[]).map((intent) => (
            <a key={intent} href={`#${intent}`} className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200">
              {INTENT_META[intent].title}
            </a>
          ))}
        </section>

        <section className="space-y-4">
          <IntentSection id="ready" intent="ready" drills={intentDrills.ready} isPro={isPro} />
          <IntentSection id="reaction" intent="reaction" drills={intentDrills.reaction} isPro={isPro} />
          <IntentSection id="control" intent="control" drills={intentDrills.control} isPro={isPro} />
          <IntentSection id="flow" intent="flow" drills={intentDrills.flow} isPro={isPro} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.14em] text-indigo-500">전체 활동</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">SPOMOVE 모드 전체</h2>
              </div>
              <span className="text-sm font-bold text-slate-500">{drills.length}개</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {drills.map((drill) => (
                <CatalogModeCard key={drill.id} drill={drill} isLocked={drill.isPro && !isPro} />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[0.14em] text-slate-400">최근 실행</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">최근 실행</h2>
                </div>
                <Clock3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-4 space-y-3">
                {recent.length > 0 ? (
                  recent.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="truncate text-sm font-black text-slate-950">{session.drillName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {new Date(session.date).toLocaleDateString('ko-KR')} · {session.cueCount}회 · 평균 {formatReactionTime(session.avg)}
                      </p>
                    </div>
                  ))
                ) : (
                  <Link href={sessionHref(defaultDrillId)} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white">
                    <span>
                      <strong className="block text-sm font-black text-slate-950">첫 SPOMOVE를 실행해보세요</strong>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">대표 모드를 선택해 첫 세션을 시작합니다.</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </Link>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-500">수업 흐름</p>
              <h2 className="mt-2 text-lg font-black text-slate-950">언제 쓰면 되나요?</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: '#635bff' }}>1</span>
                  <div>
                    <strong className="text-sm font-black text-slate-950">수업 도입 3분</strong>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">시지각 반응·반응 인지로 아이들의 시선을 한 번에 모으세요.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: '#10b981' }}>2</span>
                  <div>
                    <strong className="text-sm font-black text-slate-950">수업 중 전환</strong>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">플랭커·Go/No-Go로 집중이 흐트러질 때 빠르게 리셋합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: '#ec4899' }}>3</span>
                  <div>
                    <strong className="text-sm font-black text-slate-950">마무리 몰입</strong>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">플로우로 수업 마지막 에너지를 큰 화면 활동으로 마무리합니다.</p>
                  </div>
                </div>
              </div>
            </section>

            {stats.totalSessions > 0 ? (
              <section className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <p className="text-lg font-black text-slate-950">{stats.totalSessions}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">세션</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <p className="text-lg font-black text-emerald-600">{formatReactionTime(stats.avgRT)}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">평균</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <p className="text-lg font-black text-slate-950">{formatReactionTime(stats.bestRT)}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">최고</p>
                </div>
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
