'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Pause, Play, RotateCcw, X, Zap } from 'lucide-react';
import { useMasterStore } from '../../store';

const STEP_PRESETS = [
  { label: '1분', secs: 60 },
  { label: '3분', secs: 180 },
  { label: '5분', secs: 300 },
] as const;

function StepTimerRing({ remaining, total }: { remaining: number; total: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? remaining / total : 0;
  const color = pct < 0.2 ? '#ef4444' : pct < 0.4 ? '#fbbf24' : '#a5b4fc';
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
      <circle
        cx="16" cy="16" r={r} fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s' }}
      />
    </svg>
  );
}

export default function ClassModeView({ programId }: { programId: string }) {
  const router = useRouter();
  const programs = useMasterStore((s) => s.programs);
  const program = programs.find((p) => p.id === programId);

  const timerMs = useMasterStore((s) => s.classTimerMs);
  const timerRunning = useMasterStore((s) => s.classTimerRunning);
  const timerStartedAt = useMasterStore((s) => s.classTimerStartedAt);
  const timerStart = useMasterStore((s) => s.classTimerStart);
  const timerStop = useMasterStore((s) => s.classTimerStop);
  const timerReset = useMasterStore((s) => s.classTimerReset);

  const [displayMs, setDisplayMs] = useState(timerMs);
  const [stepIdx, setStepIdx] = useState(0);

  // Per-step countdown timer (local — no persistence needed)
  const [stepTotal, setStepTotal] = useState(0);
  const [stepRemaining, setStepRemaining] = useState(0);
  const [stepRunning, setStepRunning] = useState(false);
  const [stepExpired, setStepExpired] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!timerRunning) { setDisplayMs(timerMs); return; }
    const id = setInterval(() => setDisplayMs(timerMs + (timerStartedAt ? Date.now() - timerStartedAt : 0)), 500);
    return () => clearInterval(id);
  }, [timerRunning, timerMs, timerStartedAt]);

  useEffect(() => {
    if (!stepRunning) return;
    const id = setInterval(() => setStepRemaining((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [stepRunning]);

  useEffect(() => {
    if (stepRunning && stepRemaining === 0) {
      setStepRunning(false);
      setStepExpired(true);
    }
  }, [stepRunning, stepRemaining]);

  useEffect(() => {
    setStepRunning(false);
    setStepRemaining(0);
    setStepTotal(0);
    setStepExpired(false);
  }, [stepIdx]);

  const startStep = (s: number) => {
    setStepTotal(s);
    setStepRemaining(s);
    setStepRunning(true);
    setStepExpired(false);
  };

  const resetStep = () => {
    setStepRunning(false);
    setStepRemaining(0);
    setStepTotal(0);
    setStepExpired(false);
  };

  if (!program) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4" style={{ background: '#07070c', fontFamily: 'var(--spm-font-body)' }}>
        <p className="text-[16px] font-bold text-white">수업안을 찾을 수 없습니다.</p>
        <button type="button" onClick={() => router.back()} className="rounded-[12px] px-5 py-3 text-[14px] font-black" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
          돌아가기
        </button>
      </div>
    );
  }

  const hasActualSteps = program.steps.length > 0;
  const coachScript = program.lessonDetail?.coachScript ?? '';
  const fieldTips = program.lessonDetail?.fieldTips ?? [];

  // When steps exist: keep them + show fieldTips as amber/green extra cards.
  // When steps empty: promote description + fieldTips into unified step cards so the
  // presentation flow stays consistent (no colour-coded interruptions).
  let steps: string[];
  let extraCards: Array<{ type: 'coach' | 'tip'; text: string }>;

  if (hasActualSteps) {
    steps = program.steps;
    extraCards = [
      ...(coachScript && coachScript !== program.description
        ? [{ type: 'coach' as const, text: coachScript }]
        : []),
      ...fieldTips.slice(0, 3).map((t) => ({ type: 'tip' as const, text: t })),
    ];
  } else {
    const fallback: string[] = [];
    if (program.description?.trim()) fallback.push(program.description.trim());
    fallback.push(...fieldTips.slice(0, 4));
    steps = fallback.length > 0 ? fallback : ['수업을 시작합니다.'];
    extraCards = [];
  }

  const totalCards = steps.length + extraCards.length;

  const currentStep = stepIdx < steps.length ? steps[stepIdx] : null;
  const currentExtra = stepIdx >= steps.length ? extraCards[stepIdx - steps.length] : null;
  const spomoveId = program.lessonDetail?.relatedSpomoveIds?.[0];
  const mins = Math.floor(displayMs / 60000);
  const secs = Math.floor((displayMs % 60000) / 1000);
  const isLast = stepIdx === totalCards - 1;

  const stepMins = Math.floor(stepRemaining / 60);
  const stepSecs = stepRemaining % 60;

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: '#07070c', fontFamily: 'var(--spm-font-body)' }}>
      {/* Header */}
      <header
        className="flex shrink-0 items-center justify-between px-5"
        style={{ paddingTop: 'max(18px, env(safe-area-inset-top))', paddingBottom: '14px' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="grid h-11 w-11 place-items-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          aria-label="수업 종료"
        >
          <X size={20} color="rgba(255,255,255,0.6)" />
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {program.category}
          </p>
          <p className="max-w-[180px] truncate text-center text-[13px] font-black leading-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {program.title}
          </p>
        </div>

        {spomoveId ? (
          <Link
            href={`/spokedu-master/spomove/session?drill=${spomoveId}&mode=class&program=${program.id}`}
            className="grid h-11 w-11 place-items-center rounded-full"
            style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.32)' }}
            aria-label="SPOMOVE 연결 실행"
          >
            <Zap size={18} color="#a5b4fc" />
          </Link>
        ) : (
          <div className="h-11 w-11" />
        )}
      </header>

      {done ? (
        /* ── 수업 완료 화면 ── */
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6" style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
          <div className="w-full max-w-[420px] text-center">
            <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <CheckCircle2 size={40} color="#10b981" strokeWidth={1.5} />
            </div>
            <h2 className="text-[32px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: '#fff', letterSpacing: 0 }}>수업 완료</h2>
            <p className="mt-2 text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>{program.title}</p>
            <div className="mt-8 flex justify-center gap-4">
              {displayMs > 0 && (
                <div className="rounded-[14px] px-5 py-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="font-mono text-[22px] font-black tabular-nums" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>소요 시간</p>
                </div>
              )}
              <div className="rounded-[14px] px-5 py-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'rgba(255,255,255,0.9)' }}>{totalCards}</p>
                <p className="mt-1 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>단계 완료</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={`/spokedu-master/class-record?program=${program.id}`}
                className="flex h-14 items-center justify-center gap-2 rounded-[16px] text-[15px] font-black text-white"
                style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}
              >
                <ClipboardList size={18} />수업 기록 남기기
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-12 items-center justify-center rounded-[16px] text-[14px] font-black"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>

      {/* Global class timer */}
      <div className="flex shrink-0 justify-center pb-5">
        <div
          className="flex items-center gap-3 rounded-full px-5 py-2"
          style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <button
            type="button"
            onClick={timerRunning ? timerStop : timerStart}
            className="grid h-7 w-7 place-items-center rounded-full transition-colors"
            style={{ background: timerRunning ? 'rgba(239,68,68,0.22)' : 'rgba(16,185,129,0.22)' }}
            aria-label={timerRunning ? '타이머 일시정지' : '타이머 시작'}
          >
            {timerRunning
              ? <Pause size={13} color="var(--spm-red)" fill="var(--spm-red)" />
              : <Play size={13} color="var(--spm-grn)" fill="var(--spm-grn)" />}
          </button>
          <span className="font-mono text-[19px] font-black tabular-nums" style={{ color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em' }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => { timerReset(); setDisplayMs(0); }}
            className="grid h-6 w-6 place-items-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            aria-label="타이머 리셋"
          >
            <RotateCcw size={11} color="rgba(255,255,255,0.35)" />
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex shrink-0 justify-center gap-2 pb-5">
        {Array.from({ length: totalCards }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStepIdx(i)}
            aria-label={`${i + 1}단계`}
            style={{
              width: i === stepIdx ? '28px' : '7px',
              height: '7px',
              borderRadius: '9999px',
              background: i === stepIdx
                ? (i >= steps.length ? (extraCards[i - steps.length]?.type === 'coach' ? '#fbbf24' : '#34d399') : '#a5b4fc')
                : i < stepIdx ? 'rgba(165,180,252,0.35)' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.25s ease',
            }}
          />
        ))}
      </div>

      {/* Step card */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <p className="mb-6 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          {stepIdx + 1} / {totalCards}
        </p>
        <div
          className="w-full max-w-[600px] rounded-[24px] p-8"
          style={{
            background: currentExtra
              ? currentExtra.type === 'coach' ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${
              stepExpired
                ? 'rgba(239,68,68,0.55)'
                : currentExtra
                  ? currentExtra.type === 'coach' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'
                  : stepRunning ? 'rgba(165,180,252,0.2)' : 'rgba(255,255,255,0.08)'
            }`,
            transition: 'border-color 0.3s',
          }}
        >
          {currentStep ? (
            currentStep.length > 50 ? (
              <p
                className="text-left text-[clamp(1rem,3.2vw,1.3rem)] font-bold leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.92)', wordBreak: 'keep-all' }}
              >
                {currentStep}
              </p>
            ) : (
              <p
                className="text-center text-[clamp(1.4rem,4.5vw,2.2rem)] font-black leading-tight"
                style={{ fontFamily: 'var(--spm-font-display)', color: '#fff', wordBreak: 'keep-all' }}
              >
                {currentStep}
              </p>
            )
          ) : currentExtra ? (
            <>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: currentExtra.type === 'coach' ? '#fbbf24' : '#34d399' }}>
                {currentExtra.type === 'coach' ? '코치 포인트' : '현장 팁'}
              </p>
              <p
                className="text-[clamp(1rem,3.5vw,1.4rem)] font-bold leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.9)', wordBreak: 'keep-all' }}
              >
                {currentExtra.text}
              </p>
            </>
          ) : null}
        </div>

        {/* Step-level countdown */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {(stepRunning || stepExpired) ? (
            <>
              <StepTimerRing remaining={stepRemaining} total={stepTotal} />
              <span
                className="font-mono text-[17px] font-black tabular-nums"
                style={{
                  color: stepExpired ? '#ef4444' : stepRemaining < 30 ? '#fbbf24' : 'rgba(255,255,255,0.7)',
                  minWidth: '44px',
                }}
              >
                {stepExpired ? '종료' : `${String(stepMins).padStart(2, '0')}:${String(stepSecs).padStart(2, '0')}`}
              </span>
              <button
                type="button"
                onClick={resetStep}
                className="rounded-full px-3 py-1 text-[11px] font-black"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
              >
                초기화
              </button>
            </>
          ) : (
            <>
              <span className="mr-1 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>단계 타이머</span>
              {STEP_PRESETS.map(({ label, secs: s }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => startStep(s)}
                  className="rounded-full px-3 py-1 text-[12px] font-black"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div
        className="flex shrink-0 items-center justify-between px-6 pt-6"
        style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
          className="flex h-14 items-center gap-2 rounded-[16px] px-6 text-[14px] font-black transition-opacity disabled:opacity-25"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }}
        >
          <ChevronLeft size={20} />이전
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={() => { timerStop(); setDone(true); }}
            className="flex h-14 items-center gap-2 rounded-[16px] px-8 text-[14px] font-black text-white"
            style={{ background: 'rgba(16,185,129,0.75)', boxShadow: '0 8px 24px rgba(16,185,129,0.22)' }}
          >
            수업 완료 <CheckCircle2 size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.min(totalCards - 1, i + 1))}
            className="flex h-14 items-center gap-2 rounded-[16px] px-8 text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}
          >
            다음 <ChevronRight size={20} />
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
}
