'use client';

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MonitorPlay,
  Pause,
  Package,
  Play,
  RotateCcw,
  Timer,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { cleanList, cleanText, DRILL_FALLBACK, hasBrokenText, PROGRAM_FALLBACK } from '../../lib/clean';
import { useMasterStore } from '../../store';
import type { Program } from '../../types';

const STEP_PRESETS = [
  { label: '1분', secs: 60 },
  { label: '3분', secs: 180 },
  { label: '5분', secs: 300 },
] as const;

function cleanProgramText(program: Program, key: 'title' | 'category' | 'grade' | 'space', fallback: string) {
  const value = program[key];
  if (!value || hasBrokenText(value)) return (PROGRAM_FALLBACK[program.id]?.[key] as string | undefined) ?? fallback;
  return value;
}

function cleanDrillName(id: string | undefined, name: string | undefined) {
  if (!id && !name) return 'SPOMOVE 실행';
  if (!name || hasBrokenText(name)) return (id ? DRILL_FALLBACK[id] : undefined) ?? 'SPOMOVE 실행';
  return name;
}

function getSpomoveUseLabel(text: string) {
  if (/도입|집중|신호|주의/.test(text)) return '도입 3분 집중 전환';
  if (/민첩|순발|반응|스피드|방향|거리|펜싱/.test(text)) return '수업 중 반응 전환';
  if (/마무리|정리|협동|리듬|기억/.test(text)) return '마무리 참여 게임';
  return '큰 화면 몰입 활동';
}

function formatElapsed(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function StepTimerRing({ remaining, total }: { remaining: number; total: number }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? remaining / total : 0;
  const color = pct < 0.2 ? '#fb7185' : pct < 0.4 ? '#fbbf24' : '#a5b4fc';

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0 -rotate-90">
      <circle cx="16" cy="16" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

export default function ClassModeView({ programId }: { programId: string }) {
  const router = useRouter();
  const programs = useMasterStore((state) => state.programs);
  const drills = useMasterStore((state) => state.drills);
  const program = programs.find((item) => item.id === programId);

  const timerMs = useMasterStore((state) => state.classTimerMs);
  const timerRunning = useMasterStore((state) => state.classTimerRunning);
  const timerStartedAt = useMasterStore((state) => state.classTimerStartedAt);
  const timerStart = useMasterStore((state) => state.classTimerStart);
  const timerStop = useMasterStore((state) => state.classTimerStop);
  const timerReset = useMasterStore((state) => state.classTimerReset);

  const [displayMs, setDisplayMs] = useState(timerMs);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepTotal, setStepTotal] = useState(0);
  const [stepRemaining, setStepRemaining] = useState(0);
  const [stepRunning, setStepRunning] = useState(false);
  const [stepExpired, setStepExpired] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!timerRunning) {
      setDisplayMs(timerMs);
      return;
    }

    const id = window.setInterval(() => {
      setDisplayMs(timerMs + (timerStartedAt ? Date.now() - timerStartedAt : 0));
    }, 500);

    return () => window.clearInterval(id);
  }, [timerMs, timerRunning, timerStartedAt]);

  useEffect(() => {
    if (!program || done || timerRunning || timerMs > 0) return;
    timerStart();
  }, [done, program, timerMs, timerRunning, timerStart]);

  useEffect(() => {
    if (!stepRunning) return;
    const id = window.setInterval(() => {
      setStepRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [stepRunning]);

  useEffect(() => {
    if (stepRunning && stepRemaining === 0) {
      setStepRunning(false);
      setStepExpired(true);
    }
  }, [stepRemaining, stepRunning]);

  useEffect(() => {
    setStepRunning(false);
    setStepRemaining(0);
    setStepTotal(0);
    setStepExpired(false);
  }, [stepIndex]);

  const lesson = useMemo(() => {
    if (!program) return null;
    const title = cleanProgramText(program, 'title', 'SPOKEDU 수업');
    const category = cleanProgramText(program, 'category', '체육 수업');
    const focus = cleanText(program.lessonDetail?.developmentFocus, category);
    const equipment = cleanList(program.equipment, ['현장 기본 교구']);
    const steps = cleanList(program.lessonDetail?.rules?.length ? program.lessonDetail.rules : program.steps, [
      '공간과 준비물을 확인하고 학생들이 움직일 범위를 정합니다.',
      '규칙을 짧게 설명하고 시범을 보여줍니다.',
      '기본 라운드 후 학생 반응에 맞춰 난이도를 조절합니다.',
    ]);
    const coachScript = cleanText(program.lessonDetail?.coachScript, '');
    const fieldTips = cleanList(program.lessonDetail?.fieldTips, []);
    const spomoveId = program.lessonDetail?.relatedSpomoveIds?.[0];
    const spomoveDrill = drills.find((drill) => drill.id === spomoveId);
    const cards = [
      ...steps.map((text, index) => ({ type: 'step' as const, label: `${index + 1}단계`, text })),
      ...(coachScript ? [{ type: 'coach' as const, label: '코치 멘트', text: coachScript }] : []),
      ...fieldTips.slice(0, 3).map((text) => ({ type: 'tip' as const, label: '현장 팁', text })),
    ];

    return {
      title,
      category,
      focus,
      equipment,
      grade: cleanProgramText(program, 'grade', '전 학년'),
      duration: program.duration,
      space: cleanProgramText(program, 'space', '실내 또는 체육 공간'),
      cards: cards.length > 0 ? cards : [{ type: 'step' as const, label: '1단계', text: '수업을 시작합니다.' }],
      spomoveId,
      spomoveName: cleanDrillName(spomoveDrill?.id, spomoveDrill?.name),
      spomoveUse: getSpomoveUseLabel(`${title} ${category} ${focus} ${program.tags.join(' ')}`),
    };
  }, [drills, program]);

  const startStepTimer = (seconds: number) => {
    setStepTotal(seconds);
    setStepRemaining(seconds);
    setStepRunning(true);
    setStepExpired(false);
  };

  const resetStepTimer = () => {
    setStepRunning(false);
    setStepRemaining(0);
    setStepTotal(0);
    setStepExpired(false);
  };

  if (!program || !lesson) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#070812] px-6 text-center text-white">
        <p className="text-lg font-black">수업안을 찾을 수 없습니다.</p>
        <button type="button" onClick={() => router.back()} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950">
          돌아가기
        </button>
      </main>
    );
  }

  const current = lesson.cards[stepIndex] ?? lesson.cards[0]!;
  const isLast = stepIndex === lesson.cards.length - 1;
  const stepTone = current.type === 'coach' ? '#fbbf24' : current.type === 'tip' ? '#34d399' : '#a5b4fc';

  const finishClass = () => {
    timerStop();
    setDone(true);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#070812] text-white">
      <header className="flex shrink-0 items-center justify-between px-4 pb-3 sm:px-6" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => router.back()} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08]" aria-label="수업 나가기">
          <X className="h-5 w-5 text-white/65" />
        </button>

        <div className="min-w-0 px-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{lesson.category}</p>
          <p className="mt-1 max-w-[240px] truncate text-sm font-black text-white/86">{lesson.title}</p>
        </div>

        <Link
          href={lesson.spomoveId ? `/spokedu-master/spomove/session?drill=${lesson.spomoveId}&mode=class&program=${program.id}` : '/spokedu-master/spomove'}
          className="grid h-11 w-11 place-items-center rounded-full border border-indigo-300/25 bg-indigo-400/14"
          aria-label="SPOMOVE 실행"
        >
          <Zap className="h-5 w-5 text-indigo-200" />
        </Link>
      </header>

      {done ? (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center" style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-300/25 bg-emerald-400/12">
            <CheckCircle2 className="h-10 w-10 text-emerald-300" />
          </div>
          <h1 className="mt-6 text-4xl font-black">수업 완료</h1>
          <p className="mt-2 text-sm font-semibold text-white/45">{lesson.title}</p>

          <div className="mt-8 w-full max-w-[260px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <p className="font-mono text-2xl font-black tabular-nums">{formatElapsed(displayMs)}</p>
              <p className="mt-1 text-xs font-bold text-white/35">소요 시간</p>
            </div>
          </div>

          <div className="mt-8 flex w-full max-w-[460px] flex-col gap-3">
            <Link href={`/spokedu-master/report?program=${program.id}`} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-950">
              <FileText className="h-4 w-4" />
              설명 문구 만들기
            </Link>
            <Link href={lesson.spomoveId ? `/spokedu-master/spomove/session?drill=${lesson.spomoveId}&mode=projector&program=${program.id}` : '/spokedu-master/spomove'} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-500 text-sm font-black text-white">
              <MonitorPlay className="h-4 w-4" />
              SPOMOVE 다시 실행
            </Link>
            <button type="button" onClick={() => router.back()} className="flex h-12 items-center justify-center rounded-2xl bg-white/[0.055] text-sm font-black text-white/55">
              나가기
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto flex w-full max-w-5xl shrink-0 flex-wrap items-center justify-center gap-2 px-4 pb-4 sm:px-6">
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/55">
              {lesson.grade}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/55">
              {lesson.duration}분
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/55">
              {lesson.space}
            </span>
            <Link
              href={lesson.spomoveId ? `/spokedu-master/spomove/session?drill=${lesson.spomoveId}&mode=class&program=${program.id}` : '/spokedu-master/spomove'}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-400/12 px-3 py-2"
            >
              <MonitorPlay className="h-4 w-4 text-indigo-200" />
              <span className="max-w-[220px] truncate text-xs font-black text-indigo-100">{lesson.spomoveName}</span>
            </Link>
          </section>

          <section className="mx-auto grid w-full max-w-5xl shrink-0 gap-2 px-4 pb-5 sm:grid-cols-3 sm:px-6">
            {[
              { icon: Timer, label: '수업 초점', value: lesson.focus },
              { icon: Package, label: '준비물', value: lesson.equipment.slice(0, 3).join(', ') },
              { icon: MonitorPlay, label: '화면 활동', value: lesson.spomoveUse },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-white/35" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-white/25">{label}</span>
                  <span className="mt-0.5 block truncate text-xs font-black text-white/72">{value}</span>
                </span>
              </div>
            ))}
          </section>

          <section className="flex shrink-0 justify-center pb-5">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-5 py-2">
              <button
                type="button"
                onClick={timerRunning ? timerStop : timerStart}
                className={`grid h-8 w-8 place-items-center rounded-full ${timerRunning ? 'bg-rose-400/18' : 'bg-emerald-400/18'}`}
                aria-label={timerRunning ? '타이머 일시정지' : '타이머 시작'}
              >
                {timerRunning ? <Pause className="h-3.5 w-3.5 fill-rose-300 text-rose-300" /> : <Play className="h-3.5 w-3.5 fill-emerald-300 text-emerald-300" />}
              </button>
              <span className="font-mono text-xl font-black tabular-nums text-white/88">{formatElapsed(displayMs)}</span>
              <button
                type="button"
                onClick={() => {
                  timerReset();
                  setDisplayMs(0);
                }}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06]"
                aria-label="타이머 초기화"
              >
                <RotateCcw className="h-3 w-3 text-white/40" />
              </button>
            </div>
          </section>

          <section className="flex shrink-0 justify-center gap-2 pb-5">
            {lesson.cards.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setStepIndex(index)}
                aria-label={`${index + 1}단계로 이동`}
                className="h-2 rounded-full transition-all"
                style={{
                  width: index === stepIndex ? 30 : 8,
                  background: index === stepIndex ? stepTone : index < stepIndex ? 'rgba(165,180,252,0.35)' : 'rgba(255,255,255,0.16)',
                }}
              />
            ))}
          </section>

          <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
            <p className="mb-6 text-[11px] font-black uppercase tracking-[0.18em] text-white/30">
              {stepIndex + 1} / {lesson.cards.length} · {current.label}
            </p>
            <div
              className="w-full max-w-3xl rounded-[28px] p-8 sm:p-10"
              style={{
                background: current.type === 'coach' ? 'rgba(245,158,11,0.08)' : current.type === 'tip' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.045)',
                border: `1px solid ${stepExpired ? 'rgba(251,113,133,0.55)' : current.type === 'coach' ? 'rgba(245,158,11,0.22)' : current.type === 'tip' ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              <p
                className={current.text.length > 54 ? 'text-left text-[clamp(1rem,3.2vw,1.35rem)] font-bold leading-relaxed text-white/90' : 'text-center text-[clamp(1.5rem,5vw,2.6rem)] font-black leading-tight text-white'}
                style={{ wordBreak: 'keep-all' }}
              >
                {current.text}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {stepRunning || stepExpired ? (
                <>
                  <StepTimerRing remaining={stepRemaining} total={stepTotal} />
                  <span className={`min-w-14 font-mono text-lg font-black tabular-nums ${stepExpired ? 'text-rose-300' : stepRemaining < 30 ? 'text-amber-300' : 'text-white/70'}`}>
                    {stepExpired ? '종료' : formatCountdown(stepRemaining)}
                  </span>
                  <button type="button" onClick={resetStepTimer} className="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-black text-white/45">
                    초기화
                  </button>
                </>
              ) : (
                <>
                  <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-white/28"><Timer className="h-3.5 w-3.5" />단계 타이머</span>
                  {STEP_PRESETS.map(({ label, secs }) => (
                    <button key={label} type="button" onClick={() => startStepTimer(secs)} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-white/55">
                      {label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </section>

          <footer className="flex shrink-0 items-center justify-between px-6 pt-6" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={stepIndex === 0}
              className="flex h-14 items-center gap-2 rounded-2xl bg-white/[0.07] px-6 text-sm font-black text-white/65 transition disabled:opacity-25"
            >
              <ChevronLeft className="h-5 w-5" />
              이전
            </button>

            {isLast ? (
              <button type="button" onClick={finishClass} className="flex h-14 items-center gap-2 rounded-2xl bg-emerald-500 px-8 text-sm font-black text-white">
                수업 완료
                <CheckCircle2 className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" onClick={() => setStepIndex((index) => Math.min(lesson.cards.length - 1, index + 1))} className="flex h-14 items-center gap-2 rounded-2xl bg-indigo-500 px-8 text-sm font-black text-white">
                다음
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </footer>
        </>
      )}
    </main>
  );
}
