'use client';

import Link from 'next/link';
import { Check, ClipboardList, Maximize, Minimize, Play, RotateCcw, X } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../hooks/useSession';
import { SESSION_CUES } from '../../lib/data';
import { isTrialExpired } from '../../lib/subscription';
import { useIsPro, useMasterStore, useProfile } from '../../store';
import { EngineRouter } from './EngineRouter';

type SessionState = 'idle' | 'countdown' | 'running' | 'done' | 'paused';

const SUPPORTED_ENGINE_MODES = new Set(['reactTrain', 'flow', 'flash', 'pattern', 'diagonal', 'memory', 'spatial']);

function reactionColor(value: number | null) {
  if (value == null) return 'var(--spm-t2)';
  if (value < 300) return 'var(--spm-grn)';
  if (value < 400) return 'var(--spm-amb)';
  return 'var(--spm-red)';
}

function getIdleDescription(mode: string) {
  if (mode === 'projector') return '큰 화면으로 실행하면 학생들이 신호를 보고 함께 움직입니다. 수업 전환이나 워밍업에 바로 사용할 수 있습니다.';
  if (mode === 'class') return '수업 모드는 결과 노출을 줄이고 몰입을 우선합니다. 학생들이 화면 신호에만 집중하도록 설계했습니다.';
  return '화면 신호가 바뀌면 최대한 빠르게 화면을 터치하세요. 반응 시간이 기록됩니다.';
}

function getModeLabel(mode: string) {
  if (mode === 'projector') return 'PROJECTOR';
  if (mode === 'class') return 'CLASS MODE';
  return 'MOBILE';
}

function getModeConfig(mode: string) {
  if (mode === 'class') {
    return {
      maxCues: 16,
      showMetricsDuringRun: false,
      showReactionBadge: false,
      doneTitle: '수업 실행 완료',
      doneDescription: 'SPOMOVE 실행이 끝났습니다. 이어서 수업 기록이나 학부모 안내 문구로 정리할 수 있습니다.',
    };
  }
  if (mode === 'projector') {
    return {
      maxCues: 20,
      showMetricsDuringRun: false,
      showReactionBadge: false,
      doneTitle: '큰 화면 실행 완료',
      doneDescription: '프로젝터 수업 흐름이 끝났습니다. 연결된 수업안이 있으면 기록과 설명 문구로 바로 이어갈 수 있습니다.',
    };
  }
  return {
    maxCues: 20,
    showMetricsDuringRun: true,
    showReactionBadge: true,
    doneTitle: '세션 완료',
    doneDescription: '측정 결과가 저장되었습니다. 반복 실행으로 반응 패턴을 확인할 수 있습니다.',
  };
}

function CountdownLayer({ value }: { value: string }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/92">
      <span key={value} className="animate-[spmCountPop_0.75s_cubic-bezier(.34,1.56,.64,1)_both] text-[clamp(96px,22vw,220px)] font-black leading-none text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>
        {value}
      </span>
    </div>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[16px] p-4 text-center" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <p className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? '#fff' }}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/38">{label}</p>
    </div>
  );
}

function SessionHint({ mode }: { mode: string }) {
  const hints = mode === 'projector'
    ? ['F 전체화면', 'Space 시작', 'Esc 일시정지']
    : ['화면 터치', 'Space 시작/기록', 'Esc 일시정지'];

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {hints.map((hint) => (
        <span key={hint} className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white/58" style={{ background: 'rgba(255,255,255,0.075)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {hint}
        </span>
      ))}
    </div>
  );
}

function TopBar({
  drillName,
  mode,
  isFullscreen,
  onToggleFullscreen,
  onExit,
}: {
  drillName: string;
  mode: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-0 z-30 flex min-h-[72px] items-center justify-between gap-4 bg-gradient-to-b from-black/72 to-transparent px-5 py-3 sm:px-7">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/38">{getModeLabel(mode)}</p>
        <p className="mt-1 line-clamp-1 text-[13px] font-semibold text-white/66">{drillName}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onToggleFullscreen} className="grid h-11 w-11 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} aria-label={isFullscreen ? '전체화면 해제' : '전체화면'}>
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
        <button type="button" onClick={onExit} className="grid h-11 w-11 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} aria-label="나가기">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function SpomoveSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDrillId = searchParams.get('drill') ?? 'SR-05';
  const launchMode = searchParams.get('mode') ?? 'mobile';
  const programId = searchParams.get('program') ?? '';
  const programs = useMasterStore((state) => state.programs);
  const drills = useMasterStore((state) => state.drills);
  const drill = useMemo(() => drills.find((item) => item.id === requestedDrillId) ?? drills[0] ?? null, [drills, requestedDrillId]);
  const program = useMemo(() => programs.find((item) => item.id === programId) ?? null, [programId, programs]);
  const modeConfig = useMemo(() => getModeConfig(launchMode), [launchMode]);
  const cues = drill?.cues?.length ? drill.cues : SESSION_CUES;
  const profile = useProfile();
  const isPro = useIsPro();
  const { activeSession, stats, start, end, markCue, markResponse, pause, resume } = useSession();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [state, setState] = useState<SessionState>('idle');
  const [countdown, setCountdown] = useState('3');
  const [cueIndex, setCueIndex] = useState(0);
  const [cueSerial, setCueSerial] = useState(0);
  const [lastRT, setLastRT] = useState<number | null>(null);
  const [finalSession, setFinalSession] = useState<ReturnType<typeof end>>(null);
  const timeoutRef = useRef<number | null>(null);

  const maxCues = modeConfig.maxCues;
  const currentCue = cues[cueIndex % cues.length] ?? cues[0]!;
  const recordedCount = activeSession?.cueCount ?? finalSession?.cueCount ?? 0;
  const avg = stats?.avg ?? finalSession?.avg ?? 0;
  const best = stats?.best ?? finalSession?.best ?? 0;

  useEffect(() => {
    if (!drill) {
      router.replace('/spokedu-master/spomove');
      return;
    }
    if (isTrialExpired(profile)) {
      router.replace('/spokedu-master/spomove');
      return;
    }
    if (drill.isPro && !isPro) router.replace('/spokedu-master/spomove');
  }, [drill, isPro, profile, router]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const finishSession = useCallback(() => {
    clearTimer();
    const session = end();
    setFinalSession(session);
    setState('done');
  }, [clearTimer, end]);

  const showNextCue = useCallback(() => {
    setCueIndex((index) => index + 1);
    setCueSerial((serial) => serial + 1);
    markCue();
  }, [markCue]);

  const beginRunning = useCallback(() => {
    start(drill?.id ?? '', drill?.name ?? '');
    setFinalSession(null);
    setLastRT(null);
    setCueIndex(0);
    setCueSerial((serial) => serial + 1);
    setState('running');
    window.setTimeout(markCue, 80);
  }, [drill, markCue, start]);

  const startCountdown = useCallback(() => {
    clearTimer();
    setCountdown('3');
    setState('countdown');
  }, [clearTimer]);

  useEffect(() => {
    if (state !== 'countdown') return;
    const sequence = ['3', '2', '1', 'GO'];
    let index = 0;
    setCountdown(sequence[index]!);
    const tick = () => {
      index += 1;
      if (index >= sequence.length) {
        timeoutRef.current = window.setTimeout(beginRunning, 500);
        return;
      }
      setCountdown(sequence[index]!);
      timeoutRef.current = window.setTimeout(tick, sequence[index] === 'GO' ? 500 : 900);
    };
    timeoutRef.current = window.setTimeout(tick, 900);
    return clearTimer;
  }, [beginRunning, clearTimer, state]);

  const handleResponse = useCallback(() => {
    if (state !== 'running') return;
    const reactionTime = markResponse();
    if (reactionTime !== null) {
      setLastRT(reactionTime);
      const nextCount = (activeSession?.cueCount ?? 0) + 1;
      if (nextCount >= maxCues) {
        finishSession();
        return;
      }
    }
    showNextCue();
  }, [activeSession?.cueCount, finishSession, markResponse, maxCues, showNextCue, state]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (state === 'idle' || state === 'done') startCountdown();
        else if (state === 'running') handleResponse();
      }
      if (event.code === 'Escape') {
        if (state === 'running') {
          pause();
          setState('paused');
        } else if (state === 'paused') {
          resume();
          setState('running');
          window.setTimeout(markCue, 80);
        }
      }
      if (event.key.toLowerCase() === 'f') {
        const element = document.documentElement;
        if (!document.fullscreenElement) void element.requestFullscreen?.();
        else void document.exitFullscreen?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResponse, markCue, pause, resume, startCountdown, state]);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const reset = () => {
    clearTimer();
    if (state === 'running' || state === 'paused') end();
    setFinalSession(null);
    setLastRT(null);
    setCueIndex(0);
    setCueSerial(0);
    setState('idle');
  };

  const exitSession = () => {
    reset();
    router.push('/spokedu-master/spomove');
  };

  const toggleFullscreen = () => {
    const element = document.documentElement;
    if (!document.fullscreenElement) void element.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  if (drill?.engine && SUPPORTED_ENGINE_MODES.has(drill.engine.mode) && state !== 'done') {
    return (
      <EngineRouter
        mode={drill.engine.mode}
        level={drill.engine.level}
        onExit={exitSession}
        onComplete={() => {
          start(drill.id, drill.name);
          const session = end();
          setFinalSession(session);
          setState('done');
        }}
      />
    );
  }

  if (!drill) return null;

  return (
    <div
      className="relative h-dvh overflow-hidden select-none"
      style={{ background: state === 'running' ? currentCue.bgColor : '#050509', color: '#fff', fontFamily: 'var(--spm-font-display)', transition: 'background 0.12s ease' }}
      onClick={state === 'running' ? handleResponse : undefined}
      role={state === 'running' ? 'button' : undefined}
      tabIndex={state === 'running' ? 0 : undefined}
    >
      {state !== 'running' ? (
        <TopBar drillName={drill.name} mode={launchMode} isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} onExit={exitSession} />
      ) : null}

      {state === 'idle' ? (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <button
            type="button"
            onClick={startCountdown}
            className="grid h-[128px] w-[128px] place-items-center rounded-full border shadow-[0_28px_90px_rgba(99,102,241,0.25)] active:scale-95 sm:h-[154px] sm:w-[154px]"
            style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.16), rgba(99,102,241,0.25) 42%, rgba(255,255,255,0.035))' }}
            aria-label="세션 시작"
          >
            <Play size={44} fill="#fff" />
          </button>
          <p className="mt-7 text-[38px] font-black sm:text-[54px]">START</p>
          {program ? <p className="mt-1 text-[12px] font-black uppercase tracking-[0.12em] text-indigo-200/70">{program.title}</p> : null}
          <p className="mt-3 max-w-[520px] text-[14px] font-medium leading-6 text-white/55 sm:text-[15px]">{getIdleDescription(launchMode)}</p>
          <SessionHint mode={launchMode} />
        </div>
      ) : null}

      {state === 'countdown' ? <CountdownLayer value={countdown} /> : null}

      {state === 'running' ? (
        <>
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <span key={cueSerial} className="animate-[spmCuePop_0.22s_cubic-bezier(.34,1.56,.64,1)_both] text-[clamp(104px,28vw,260px)] font-black leading-none text-white drop-shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
              {currentCue.symbol}
            </span>
            <span className="text-[20px] font-semibold uppercase tracking-[0.12em] text-white/62 sm:text-[26px]">{currentCue.label}</span>
          </div>
          {modeConfig.showReactionBadge && lastRT !== null ? (
            <div key={lastRT} className="absolute right-5 top-5 z-40 rounded-full px-3 py-1 text-[14px] font-black shadow-xl" style={{ background: 'rgba(0,0,0,0.35)', color: reactionColor(lastRT) }}>
              {lastRT}ms
            </div>
          ) : null}
          {modeConfig.showMetricsDuringRun ? (
            <div className="absolute inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 bg-gradient-to-t from-black/70 to-transparent px-5 pt-12" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}>
              <ResultStat label="횟수" value={`${recordedCount}/${maxCues}`} />
              <ResultStat label="평균" value={avg ? `${avg}ms` : '-'} tone="var(--spm-grn)" />
              <ResultStat label="최고" value={best ? `${best}ms` : '-'} />
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-white/10">
              <span className="block h-full transition-all duration-200" style={{ width: `${Math.min(100, (recordedCount / maxCues) * 100)}%`, background: 'rgba(255,255,255,0.72)' }} />
            </div>
          )}
        </>
      ) : null}

      {state === 'paused' ? (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <p className="text-[48px] font-black">PAUSED</p>
          <p className="mt-2 text-[14px] font-semibold text-white/48">수업 흐름을 잠시 멈췄습니다.</p>
          <button type="button" onClick={() => { resume(); setState('running'); window.setTimeout(markCue, 80); }} className="mt-6 rounded-[14px] px-6 py-4 text-[14px] font-bold text-white" style={{ background: 'var(--spm-acc)' }}>
            계속하기
          </button>
        </div>
      ) : null}

      {state === 'done' ? (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <div className="grid h-[96px] w-[96px] place-items-center rounded-full animate-[spmCuePop_0.28s_cubic-bezier(.34,1.56,.64,1)_both]" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Check size={42} color="var(--spm-grn)" />
          </div>
          <h1 className="mt-6 text-[36px] font-black">{modeConfig.doneTitle}</h1>
          {program ? <p className="mt-2 text-[12px] font-black uppercase tracking-[0.12em] text-indigo-200/70">{program.title}</p> : null}
          <p className="mt-2 max-w-[500px] text-[13px] font-semibold leading-6 text-white/48">{modeConfig.doneDescription}</p>
          <div className="mt-7 grid w-full max-w-[560px] grid-cols-3 gap-2">
            <ResultStat label="횟수" value={String(finalSession?.cueCount ?? recordedCount)} />
            <ResultStat label="평균" value={avg ? `${avg}ms` : '-'} tone="var(--spm-grn)" />
            <ResultStat label="최고" value={best ? `${best}ms` : '-'} />
          </div>
          <div className={`mt-7 grid w-full max-w-[660px] gap-2 ${programId ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
            <button type="button" onClick={startCountdown} className="flex h-12 items-center justify-center gap-2 rounded-[13px] text-[14px] font-bold text-white" style={{ background: 'var(--spm-acc)' }}>
              <RotateCcw size={16} /> 다시 시작
            </button>
            {programId ? (
              <Link href={`/spokedu-master/class-record?program=${programId}`} className="flex h-12 items-center justify-center gap-1.5 rounded-[13px] text-[13px] font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--spm-t)' }}>
                <ClipboardList size={14} /> 수업 기록
              </Link>
            ) : null}
            {programId ? (
              <Link href={`/spokedu-master/report?program=${programId}`} className="flex h-12 items-center justify-center rounded-[13px] text-[13px] font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--spm-t)' }}>
                설명 문구
              </Link>
            ) : null}
            <Link href="/spokedu-master/spomove" className="flex h-12 items-center justify-center rounded-[13px] text-[14px] font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--spm-t)' }}>
              목록으로
            </Link>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes spmCuePop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spmCountPop {
          0% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function SpomoveSessionPage() {
  return (
    <Suspense fallback={<div className="relative h-dvh overflow-hidden select-none" style={{ background: '#050509', color: '#fff', fontFamily: 'var(--spm-font-display)' }} />}>
      <SpomoveSessionContent />
    </Suspense>
  );
}
