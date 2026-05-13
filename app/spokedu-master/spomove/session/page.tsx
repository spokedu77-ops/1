'use client';

import Link from 'next/link';
import { Check, ClipboardCheck, Maximize, Play, RotateCcw, X } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../hooks/useSession';
import { DRILLS, SESSION_CUES } from '../../lib/data';

type SessionState = 'idle' | 'countdown' | 'running' | 'done' | 'paused';

function reactionColor(value: number | null) {
  if (value == null) return 'var(--spm-t2)';
  if (value < 300) return 'var(--spm-grn)';
  if (value < 400) return 'var(--spm-amb)';
  return 'var(--spm-red)';
}

function CountdownLayer({ value }: { value: string }) {
  return <div className="absolute inset-0 z-20 grid place-items-center bg-black/90"><span key={value} className="animate-[spmCountPop_0.75s_cubic-bezier(.34,1.56,.64,1)_both] text-[120px] font-black leading-none text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>{value}</span></div>;
}

function ResultStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-[14px] p-4 text-center" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}><p className="text-[22px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? '#fff' }}>{value}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35">{label}</p></div>;
}

function getIdleDescription(launchMode: string) {
  if (launchMode === 'projector') return '전체 화면으로 실행하면 학생들이 신호에 맞춰 움직입니다.';
  if (launchMode === 'class') return '세션이 끝나면 바로 수업 기록 화면으로 이어집니다.';
  return '화면의 신호가 바뀌면 최대한 빠르게 화면을 탭하세요.';
}

function getModeLabel(launchMode: string) {
  if (launchMode === 'projector') return 'PROJECTOR';
  if (launchMode === 'class') return 'CLASS SESSION';
  return 'SPOKEDU';
}

function SessionHint({ launchMode }: { launchMode: string }) {
  const hints = launchMode === 'projector' ? ['F 전체 화면', 'Space 시작', 'Esc 일시정지'] : ['화면 탭 반응 기록', 'Space 시작/기록', 'Esc 일시정지'];
  return <div className="mt-6 flex flex-wrap justify-center gap-2">{hints.map((hint) => <span key={hint} className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white/55" style={{ background: 'rgba(255,255,255,0.075)', border: '1px solid rgba(255,255,255,0.08)' }}>{hint}</span>)}</div>;
}

function SpomoveSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDrillId = searchParams.get('drill') ?? 'speed-track';
  const launchMode = searchParams.get('mode') ?? 'mobile';
  const requestedProgramId = searchParams.get('program');
  const drill = useMemo(() => DRILLS.find((item) => item.id === requestedDrillId) ?? DRILLS[0]!, [requestedDrillId]);
  const cues = drill.cues.length ? drill.cues : SESSION_CUES;
  const { activeSession, stats, start, end, markCue, markResponse, pause, resume } = useSession();
  const [state, setState] = useState<SessionState>('idle');
  const [countdown, setCountdown] = useState('3');
  const [cueIndex, setCueIndex] = useState(0);
  const [cueSerial, setCueSerial] = useState(0);
  const [lastRT, setLastRT] = useState<number | null>(null);
  const [finalSession, setFinalSession] = useState<ReturnType<typeof end>>(null);
  const timeoutRef = useRef<number | null>(null);
  const maxCues = 20;
  const currentCue = cues[cueIndex % cues.length] ?? cues[0]!;
  const recordedCount = activeSession?.cueCount ?? finalSession?.cueCount ?? 0;
  const avg = stats?.avg ?? finalSession?.avg ?? 0;
  const best = stats?.best ?? finalSession?.best ?? 0;
  const recordHref = launchMode === 'class' ? `/spokedu-master/class-record${requestedProgramId ? `?program=${encodeURIComponent(requestedProgramId)}` : ''}` : '/spokedu-master/spomove';

  const clearTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showNextCue = useCallback(() => {
    setCueIndex((index) => index + 1);
    setCueSerial((serial) => serial + 1);
    markCue();
  }, [markCue]);

  const finishSession = useCallback(() => {
    clearTimer();
    const session = end();
    setFinalSession(session);
    setState('done');
  }, [clearTimer, end, setFinalSession, setState]);

  const beginRunning = useCallback(() => {
    start(drill.id, drill.name);
    setFinalSession(null);
    setLastRT(null);
    setCueIndex(0);
    setCueSerial((serial) => serial + 1);
    setState('running');
    window.setTimeout(markCue, 80);
  }, [drill.id, drill.name, markCue, setCueIndex, setCueSerial, setFinalSession, setLastRT, setState, start]);

  const startCountdown = useCallback(() => {
    clearTimer();
    setCountdown('3');
    setState('countdown');
  }, [clearTimer, setCountdown, setState]);

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
  }, [activeSession?.cueCount, finishSession, markResponse, showNextCue, state]);

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

  return (
    <div className="relative h-dvh overflow-hidden select-none" style={{ background: state === 'running' ? currentCue.bgColor : 'var(--spm-bg)', color: '#fff', fontFamily: 'var(--spm-font-display)', transition: 'background 0.12s ease' }} onClick={state === 'running' ? handleResponse : undefined} role={state === 'running' ? 'button' : undefined} tabIndex={state === 'running' ? 0 : undefined}>
      <div className="absolute left-0 right-0 top-0 z-30 flex min-h-[68px] items-center justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent px-5 py-3 sm:px-7">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">{getModeLabel(launchMode)}</p><p className="mt-1 line-clamp-1 text-[12px] font-semibold text-white/60">{drill.name}</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); const element = document.documentElement; if (!document.fullscreenElement) void element.requestFullscreen?.(); else void document.exitFullscreen?.(); }} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} aria-label="전체 화면"><Maximize size={15} /></button><button type="button" onClick={(event) => { event.stopPropagation(); exitSession(); }} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} aria-label="나가기"><X size={16} /></button></div>
      </div>

      {state === 'idle' ? <div className="flex h-full flex-col items-center justify-center px-8 text-center"><button type="button" onClick={startCountdown} className="grid h-[126px] w-[126px] place-items-center rounded-full border shadow-[0_28px_90px_rgba(99,102,241,0.2)] active:scale-95 sm:h-[148px] sm:w-[148px]" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.16), rgba(99,102,241,0.22) 42%, rgba(255,255,255,0.035))' }} aria-label="세션 시작"><Play size={42} fill="#fff" /></button><p className="mt-7 text-[34px] font-black sm:text-[46px]">START</p><p className="mt-2 max-w-[460px] text-[13px] font-medium leading-6 text-white/50 sm:text-[15px]">{getIdleDescription(launchMode)}</p><SessionHint launchMode={launchMode} /></div> : null}
      {state === 'countdown' ? <CountdownLayer value={countdown} /> : null}
      {state === 'running' ? <><div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center"><span key={cueSerial} className="animate-[spmCuePop_0.22s_cubic-bezier(.34,1.56,.64,1)_both] text-[clamp(82px,24vw,210px)] font-black leading-none text-white drop-shadow-[0_18px_50px_rgba(0,0,0,0.28)]">{currentCue.symbol}</span><span className="text-[18px] font-semibold uppercase tracking-[0.12em] text-white/55 sm:text-[22px]">{currentCue.label}</span></div>{lastRT !== null ? <div key={lastRT} className="absolute right-5 top-[76px] z-40 rounded-full px-3 py-1 text-[14px] font-black shadow-xl" style={{ background: 'rgba(0,0,0,0.35)', color: reactionColor(lastRT) }}>{lastRT}ms</div> : null}<div className="absolute inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 bg-gradient-to-t from-black/70 to-transparent px-5 pb-7 pt-12"><ResultStat label="횟수" value={`${recordedCount}/${maxCues}`} /><ResultStat label="평균" value={avg ? `${avg}ms` : '-'} tone="var(--spm-grn)" /><ResultStat label="최고" value={best ? `${best}ms` : '-'} /></div></> : null}
      {state === 'paused' ? <div className="flex h-full flex-col items-center justify-center px-8 text-center"><p className="text-[42px] font-black">PAUSED</p><p className="mt-2 text-[13px] font-semibold text-white/45">수업 흐름을 잠시 멈췄습니다.</p><button type="button" onClick={() => { resume(); setState('running'); window.setTimeout(markCue, 80); }} className="mt-6 rounded-[12px] px-6 py-4 text-[14px] font-bold text-white" style={{ background: 'var(--spm-acc)' }}>계속하기</button></div> : null}
      {state === 'done' ? <div className="flex h-full flex-col items-center justify-center px-8 text-center"><div className="grid h-[92px] w-[92px] place-items-center rounded-full animate-[spmCuePop_0.28s_cubic-bezier(.34,1.56,.64,1)_both]" style={{ background: 'rgba(255,255,255,0.1)' }}><Check size={42} color="var(--spm-grn)" /></div><h1 className="mt-6 text-[34px] font-black">세션 완료!</h1><p className="mt-2 max-w-[460px] text-[13px] font-semibold leading-6 text-white/45">{launchMode === 'class' ? '이 기록은 학생별 수업 기록으로 이어가면 성장 리포트와 학부모 공유에 반영됩니다.' : '측정 결과가 저장되었습니다. 반복 측정으로 반응 패턴을 쌓아보세요.'}</p><div className="mt-7 grid w-full max-w-[560px] grid-cols-3 gap-2"><ResultStat label="횟수" value={String(finalSession?.cueCount ?? recordedCount)} /><ResultStat label="평균" value={avg ? `${avg}ms` : '-'} tone="var(--spm-grn)" /><ResultStat label="최고" value={best ? `${best}ms` : '-'} /></div><div className="mt-7 grid w-full max-w-[560px] grid-cols-2 gap-2"><button type="button" onClick={startCountdown} className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[14px] font-bold text-white" style={{ background: 'var(--spm-acc)' }}><RotateCcw size={16} />다시 시작</button><Link href={recordHref} className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--spm-t)' }}>{launchMode === 'class' ? <span className="inline-flex items-center gap-2"><ClipboardCheck size={16} />기록하기</span> : '목록으로'}</Link></div></div> : null}
      <style jsx global>{`@keyframes spmCuePop{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}@keyframes spmCountPop{0%{transform:scale(1.4);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

export default function SpomoveSessionPage() {
  return <Suspense fallback={<div className="relative h-dvh overflow-hidden select-none" style={{ background: 'var(--spm-bg)', color: '#fff', fontFamily: 'var(--spm-font-display)' }} />}><SpomoveSessionContent /></Suspense>;
}
