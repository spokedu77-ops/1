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
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { formatReactionTime } from '../lib/utils';
import { useIsPro, useMasterStore, useStats } from '../store';
import type { Drill, Program } from '../types';

type CoreCode = 'VM' | 'IC' | 'EWM';

const CORE_CODE_DRILL_MAP: Record<string, CoreCode> = {
  reactTrain: 'VM', basic: 'VM', flow: 'VM',
  simon: 'IC', flanker: 'IC', stroop: 'IC',
  gonogo: 'EWM', taskswitch: 'EWM', spatial: 'EWM',
};

const CORE_CODE_META: Record<CoreCode, { title: string; caption: string; badge: string; tone: string; icon: LucideIcon }> = {
  VM: { title: '시지각 · 반응 훈련', caption: '신호를 빠르게 감지하고 반응하는 시각-운동 처리 능력을 단계적으로 훈련합니다.', badge: 'Visual Motor', tone: '#818cf8', icon: Zap },
  IC: { title: '선택주의 · 간섭 제어', caption: '방해 자극 속에서 올바른 신호만 골라내는 집중력과 억제 제어를 기릅니다.', badge: 'Inhibitory Control', tone: '#f472b6', icon: Brain },
  EWM: { title: '실행 조절 · 작업기억', caption: '규칙을 기억하고 전환하며 순간 판단을 제어하는 실행 기능을 훈련합니다.', badge: 'Executive / Working Memory', tone: '#fb923c', icon: Goal },
};

const CORE_CODE_ORDER: CoreCode[] = ['VM', 'IC', 'EWM'];

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

const BROKEN_TEXT_PATTERN = /[一-鿿豈-﫿�]/;

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

function getDrillCode(drill: Drill): CoreCode {
  return CORE_CODE_DRILL_MAP[drill.id] ?? 'VM';
}

function getDrillsByCore(drills: Drill[], code: CoreCode) {
  return drills.filter((drill) => getDrillCode(drill) === code);
}

function getLinkedPrograms(drill: Drill, programs: Program[]) {
  return programs.filter((program) => program.lessonDetail?.relatedSpomoveIds?.includes(drill.id)).slice(0, 3);
}

function LaunchModeCard({ href, icon: Icon, title, caption, tone }: { href: string; icon: LucideIcon; title: string; caption: string; tone: string }) {
  return (
    <Link href={href} className="flex min-h-[120px] flex-col justify-between rounded-3xl border bg-white p-5 transition hover:-translate-y-0.5" style={{ borderColor: 'var(--spm-br2)' }}>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${tone}18`, color: tone }}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <strong className="block text-base font-black" style={{ color: 'var(--spm-t)' }}>{title}</strong>
        <span className="mt-1 block text-xs font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{caption}</span>
      </span>
    </Link>
  );
}

function CatalogModeCard({ drill, isLocked, linkedPrograms }: { drill: Drill; isLocked: boolean; linkedPrograms: Program[] }) {
  const href = isLocked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`;
  const code = getDrillCode(drill);
  const tone = drill.bgColor || CORE_CODE_META[code].tone;
  const levelCount = drill.levels?.length ?? 1;
  const firstLevel = drill.levels?.[0];

  return (
    <Link
      href={href}
      className="group grid min-h-[188px] grid-cols-[auto_1fr] gap-4 rounded-3xl border bg-white p-5 transition hover:-translate-y-0.5"
      style={{ borderColor: 'var(--spm-br2)' }}
    >
      <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${tone}22`, color: tone }}>
        {drill.icon || <Zap className="h-6 w-6" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t2)' }}>{drill.tag || getDrillCategory(drill)}</span>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t2)' }}>{levelCount}단계</span>
          {isLocked ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">PRO</span> : null}
        </span>
        <strong className="mt-3 line-clamp-1 block text-lg font-black" style={{ color: 'var(--spm-t)' }}>{getDrillName(drill)}</strong>
        <span className="mt-1 block text-xs font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>{drill.enName}</span>
        <span className="mt-3 line-clamp-2 block text-sm leading-6" style={{ color: 'var(--spm-t2)' }}>{drill.description}</span>
        <span className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-black text-slate-950">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            설정으로
          </span>
          {linkedPrograms.length > 0 ? (
            <span className="inline-flex h-9 items-center rounded-xl border px-3 text-xs font-bold" style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t3)' }}>{linkedPrograms.length}개 수업 연동</span>
          ) : firstLevel ? (
            <span className="inline-flex h-9 min-w-0 items-center rounded-xl border px-3 text-xs font-bold" style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t3)' }}>{firstLevel.enName}</span>
          ) : null}
          {isLocked ? <Lock className="h-3.5 w-3.5 text-amber-300" /> : null}
        </span>
      </span>
    </Link>
  );
}

function CoreCodeSection({ code, drills, isPro, programs }: { code: CoreCode; drills: Drill[]; isPro: boolean; programs: Program[] }) {
  if (drills.length === 0) return null;
  const meta = CORE_CODE_META[code];
  const Icon = meta.icon;
  const first = drills[0];
  const firstLocked = first.isPro && !isPro;

  return (
    <section id={code} className="scroll-mt-5 overflow-hidden rounded-3xl border bg-white" style={{ borderColor: 'var(--spm-br2)' }}>
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--spm-br)' }}>
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${meta.tone}1a`, color: meta.tone }}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>{meta.badge}</p>
            <h2 className="mt-1 text-xl font-black" style={{ color: 'var(--spm-t)' }}>{meta.title}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--spm-t2)' }}>{meta.caption}</p>
          </div>
        </div>
        {!firstLocked ? (
          <Link
            href={`/spokedu-master/spomove/session?drill=${first.id}&mode=projector`}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black"
            style={{ background: `${meta.tone}18`, color: meta.tone, border: `1px solid ${meta.tone}30` }}
          >
            <Play className="h-4 w-4 fill-current" />
            바로 실행
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {drills.map((drill) => (
          <CatalogModeCard key={drill.id} drill={drill} isLocked={drill.isPro && !isPro} linkedPrograms={getLinkedPrograms(drill, programs)} />
        ))}
      </div>
    </section>
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

  const drillsByCode = useMemo(() => {
    const result = {} as Record<CoreCode, Drill[]>;
    for (const code of CORE_CODE_ORDER) {
      result[code] = getDrillsByCore(drills, code);
    }
    return result;
  }, [drills]);

  const recent = sessions.slice(0, 3);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
      <header>
        <section className="overflow-hidden rounded-[28px]" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
          <div className="relative min-h-[340px] p-6 sm:p-8 lg:p-10">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(135deg, var(--spm-bg) 0%, #0d1f3c 52%, #111827 100%)' }}
            />
            <div className="relative flex h-full min-h-[260px] flex-col justify-between">
              <div>
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em]"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--spm-t2)' }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Screen Movement Engine
                </span>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
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
                  수업과 연결하기
                </Link>
              </div>
            </div>
          </div>
        </section>
      </header>

      <section>
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>Launch Modes</p>
          <h2 className="mt-1 text-xl font-black" style={{ color: 'var(--spm-t)' }}>수업 환경에 맞춰 실행</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <LaunchModeCard
            href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`}
            icon={MonitorPlay} title="큰 화면" caption="빔, TV, 노트북 화면으로 바로 실행" tone="#818cf8"
          />
          <LaunchModeCard
            href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=mobile`}
            icon={Smartphone} title="모바일" caption="강사가 손에 들고 짧게 진행" tone="#10b981"
          />
          <LaunchModeCard
            href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=class`}
            icon={Maximize} title="Class Mode" caption="수업안 흐름과 함께 운영" tone="#f59e0b"
          />
        </div>
      </section>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="SPOMOVE 카테고리">
        {CORE_CODE_ORDER.map((code) => {
          const meta = CORE_CODE_META[code];
          return (
            <a
              key={code}
              href={`#${code}`}
              className="shrink-0 rounded-full border px-4 py-2 text-sm font-black transition hover:opacity-80"
              style={{ borderColor: `${meta.tone}40`, color: meta.tone, background: `${meta.tone}0f` }}
            >
              {meta.title}
            </a>
          );
        })}
      </nav>

      <section className="space-y-4">
        {CORE_CODE_ORDER.map((code) => (
          <CoreCodeSection key={code} code={code} drills={drillsByCode[code]} isPro={isPro} programs={programs} />
        ))}
      </section>

      {(recent.length > 0 || stats.totalSessions > 0) ? (
        <section className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: 'var(--spm-br2)' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>Recent</p>
              <h2 className="mt-1 text-lg font-black" style={{ color: 'var(--spm-t)' }}>최근 실행</h2>
            </div>
            <Clock3 className="h-5 w-5" style={{ color: 'var(--spm-t3)' }} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {recent.map((session) => (
              <div key={session.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--spm-br)', background: 'var(--spm-bg)' }}>
                <p className="truncate text-sm font-black" style={{ color: 'var(--spm-t)' }}>{session.drillName}</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--spm-t3)' }}>
                  {new Date(session.date).toLocaleDateString('ko-KR')} · {session.cueCount}회 · 평균 {formatReactionTime(session.avg)}
                </p>
              </div>
            ))}
            {recent.length === 0 ? (
              <Link
                href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`}
                className="flex items-center justify-between rounded-2xl border p-4"
                style={{ borderColor: 'var(--spm-br)', background: 'var(--spm-bg)' }}
              >
                <span>
                  <strong className="block text-sm font-black" style={{ color: 'var(--spm-t)' }}>첫 SPOMOVE를 실행해보세요</strong>
                  <span className="mt-1 block text-xs font-semibold" style={{ color: 'var(--spm-t3)' }}>드릴을 선택해 첫 세션을 시작하세요.</span>
                </span>
                <ChevronRight className="h-5 w-5" style={{ color: 'var(--spm-t3)' }} />
              </Link>
            ) : null}
          </div>

          {stats.totalSessions > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border p-3 text-center" style={{ borderColor: 'var(--spm-br)', background: 'var(--spm-bg)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--spm-t)' }}>{stats.totalSessions}</p>
                <p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>세션</p>
              </div>
              <div className="rounded-2xl border p-3 text-center" style={{ borderColor: 'var(--spm-br)', background: 'var(--spm-bg)' }}>
                <p className="text-lg font-black text-emerald-600">{formatReactionTime(stats.avgRT)}</p>
                <p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>평균</p>
              </div>
              <div className="rounded-2xl border p-3 text-center" style={{ borderColor: 'var(--spm-br)', background: 'var(--spm-bg)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--spm-t)' }}>{formatReactionTime(stats.bestRT)}</p>
                <p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>최고</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
