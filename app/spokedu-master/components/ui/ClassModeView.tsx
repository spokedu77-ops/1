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

import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import { getPrimarySupportedSpomovePreset, getSpomoveSessionHref } from '../../lib/program-meta';
import { useMasterStore } from '../../store';

const STEP_PRESETS = [
  { label: '1분', secs: 60 },
  { label: '3분', secs: 180 },
  { label: '5분', secs: 300 },
] as const;

type LessonCard = {
  type: 'step' | 'coach';
  label: string;
  text: string;
};

function getSpomoveUseLabel(text: string) {
  if (/진입|집중|신호|주의/.test(text)) return '진입 3분 집중 전환';
  if (/민첩|순발|반응|스피드|방향|거리|타이밍/.test(text)) return '수업 중 반응 전환';
  if (/마무리|정리|협동|리듬|기억/.test(text)) return '마무리 참여 게임';
  return '화면 몰입 활동';
}

function formatMissingInfo(label: string) {
  const map: Record<string, string> = {
    대상: '대상 정보 없음',
    시간: '시간 정보 없음',
    공간: '공간 정보 없음',
    준비물: '준비물 정보 없음',
    진행: '활동 단계 없음',
    안전: '안전 정보 없음',
    '지도·변형': '지도 포인트 없음',
    '미리보기 자료': '미리보기 자료 없음',
    '특수 대상 지원 근거': '특수 대상 지원 정보 없음',
  };
  return map[label] ?? `${label} 정보 없음`;
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
  const [stepNavLocked, setStepNavLocked] = useState(false);
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
    const model = buildLessonDisplayModel(program);
    const title = model.title || 'SPOKEDU 수업';
    const category = model.theme || '체육 수업';
    const focus = program.lessonDetail?.developmentFocus?.trim() || model.previewCoachScript || category;
    const equipmentLabel = model.equipment.length > 0
      ? model.equipment.slice(0, 3).join(', ')
      : model.quality.missing.includes('준비물')
        ? '준비물 정보 없음'
        : '준비물 없음';
    const safetyLabel = model.safetyNotes[0] ?? '안전 정보 없음';
    const steps = model.activityMethod;
    const cards: LessonCard[] = [
      ...steps.map((text, index) => ({ type: 'step' as const, label: `${index + 1}단계`, text })),
      ...(model.coachScript ? [{ type: 'coach' as const, label: '코치 멘트', text: model.coachScript }] : []),
    ];
    const spomovePreset = getPrimarySupportedSpomovePreset(program);

    return {
      title,
      category,
      focus,
      equipmentLabel,
      safetyLabel,
      grade: model.target || '대상 정보 없음',
      durationLabel: program.duration ? `${program.duration}분` : '시간 정보 없음',
      space: model.space || '공간 정보 없음',
      quality: model.quality,
      missingInfo: model.quality.missing.slice(0, 3).map(formatMissingInfo),
      executionBlocked: model.quality.status === 'INCOMPLETE' && steps.length === 0,
      cards,
      spomovePreset,
      spomoveName: spomovePreset?.title ?? '연계 SPOMOVE 없음',
      spomoveUse: getSpomoveUseLabel(`${title} ${category} ${focus} ${program.tags.join(' ')}`),
    };
  }, [program]);

  const executionBlocked = lesson?.executionBlocked ?? false;

  useEffect(() => {
    if (!program || executionBlocked || done || timerRunning || timerMs > 0) return;
    timerStart();
  }, [done, executionBlocked, program, timerMs, timerRunning, timerStart]);

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

  const moveStep = (direction: -1 | 1) => {
    if (stepNavLocked) return;
    setStepNavLocked(true);
    const maxIndex = Math.max(0, (lesson?.cards.length ?? 1) - 1);
    setStepIndex((index) => Math.max(0, Math.min(maxIndex, index + direction)));
    window.setTimeout(() => setStepNavLocked(false), 220);
  };

  if (!program || !lesson) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#070812] px-6 text-center text-white">
        <p className="text-lg font-black">수업 자료를 찾을 수 없습니다.</p>
        <button type="button" onClick={() => router.back()} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950">
          돌아가기
        </button>
      </main>
    );
  }

  const current = lesson.cards[stepIndex] ?? lesson.cards[0] ?? { type: 'step' as const, label: '정보 없음', text: '전체 수업 자료를 확인해 주세요.' };
  const isLast = stepIndex === lesson.cards.length - 1;
  const stepTone = current.type === 'coach' ? '#fbbf24' : '#a5b4fc';
  const detailHref = `/spokedu-master/library/${program.id}`;

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
          href={lesson.spomovePreset ? getSpomoveSessionHref(program, lesson.spomovePreset, 'class') : '/spokedu-master/spomove'}
          className="grid h-11 w-11 place-items-center rounded-full border border-indigo-300/25 bg-indigo-400/14"
          aria-label="SPOMOVE 실행"
        >
          <Zap className="h-5 w-5 text-indigo-200" />
        </Link>
      </header>

      {lesson.quality.status !== 'READY' ? (
        <section className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6">
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-amber-100">
                  {lesson.executionBlocked ? '이 수업은 실행 정보가 충분하지 않습니다.' : '일부 수업 정보가 제한적입니다.'}
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-100/65">
                  {lesson.executionBlocked ? '전체 수업 자료를 먼저 확인해 주세요.' : '수업 전 전체 수업 자료를 확인해 주세요.'}
                </p>
                {lesson.missingInfo.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {lesson.missingInfo.map((item) => (
                      <span key={item} className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-black text-amber-50/75">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Link href={detailHref} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-white px-4 text-xs font-black text-slate-950">
                전체 수업 자료 보기
              </Link>
            </div>
          </div>
        </section>
      ) : null}

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
            <Link href={`/spokedu-master/class-record?program=${program.id}`} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-950">
              <FileText className="h-4 w-4" />
              수업 기록 작성
            </Link>
            <Link href="/spokedu-master/library" className="flex h-12 items-center justify-center rounded-2xl bg-white/[0.055] text-sm font-black text-white/65">
              라이브러리로
            </Link>
          </div>
        </section>
      ) : lesson.executionBlocked ? (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center" style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-[520px] rounded-[24px] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-2xl font-black">현장 실행 정보가 부족합니다.</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/55">
              class-mode에서 임의 단계나 안전 문구를 만들지 않습니다. 상세 자료에서 원본 정보를 먼저 확인해 주세요.
            </p>
            <Link href={detailHref} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-950">
              전체 수업 자료 보기
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto flex w-full max-w-5xl shrink-0 flex-wrap items-center justify-center gap-2 px-4 pb-4 sm:px-6">
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/55">
              {lesson.grade}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/55">
              {lesson.durationLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/55">
              {lesson.space}
            </span>
            <Link
              href={lesson.spomovePreset ? getSpomoveSessionHref(program, lesson.spomovePreset, 'class') : '/spokedu-master/spomove'}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-400/12 px-3 py-2"
            >
              <MonitorPlay className="h-4 w-4 text-indigo-200" />
              <span className="max-w-[220px] truncate text-xs font-black text-indigo-100">{lesson.spomoveName}</span>
            </Link>
          </section>

          <section className="mx-auto grid w-full max-w-5xl shrink-0 gap-2 px-4 pb-5 sm:grid-cols-4 sm:px-6">
            {[
              { icon: Timer, label: '수업 초점', value: lesson.focus },
              { icon: Package, label: '준비물', value: lesson.equipmentLabel },
              { icon: CheckCircle2, label: '안전', value: lesson.safetyLabel },
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
                background: current.type === 'coach' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.045)',
                border: `1px solid ${stepExpired ? 'rgba(251,113,133,0.55)' : current.type === 'coach' ? 'rgba(245,158,11,0.22)' : 'rgba(255,255,255,0.1)'}`,
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
                  {!stepExpired ? (
                    <button type="button" onClick={() => setStepRunning((running) => !running)} className="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-black text-white/65">
                      {stepRunning ? '일시정지' : '재개'}
                    </button>
                  ) : null}
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
              onClick={() => moveStep(-1)}
              disabled={stepIndex === 0 || stepNavLocked}
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
              <button type="button" onClick={() => moveStep(1)} disabled={stepNavLocked} className="flex h-14 items-center gap-2 rounded-2xl bg-indigo-500 px-8 text-sm font-black text-white disabled:opacity-60">
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
