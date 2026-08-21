'use client';

import { CheckCircle2, LayoutList, ListOrdered, Pause, Play, RotateCcw, Route, Shuffle, Timer, Trophy, UserPlus, Users, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toStudentProfile } from '../../lib/operationalDataAdapter';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { useMasterStore } from '../../store';
import type { StudentProfile } from '../../types';

type TabId = 'stopwatch' | 'return-timer' | 'scoreboard' | 'picker' | 'teams' | 'order' | 'tournament' | 'ladder';

const UNASSIGNED_CLASS = '__unassigned__';

function studentClassKey(student: StudentProfile) {
  return student.group.trim() || UNASSIGNED_CLASS;
}

const TABS: { id: TabId; label: string; icon: typeof Timer }[] = [
  { id: 'stopwatch', label: '스탑워치', icon: Timer },
  { id: 'return-timer', label: '타이머', icon: Timer },
  { id: 'scoreboard', label: '점수판', icon: LayoutList },
  { id: 'picker', label: '무작위 선택', icon: Shuffle },
  { id: 'teams', label: '팀 나누기', icon: Users },
  { id: 'order', label: '진행 순서', icon: ListOrdered },
  { id: 'tournament', label: '토너먼트', icon: Trophy },
  { id: 'ladder', label: '사다리타기', icon: Route },
];

function shuffleItems<T>(items: T[]) {
  const copied = [...items];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[target]] = [copied[target]!, copied[index]!];
  }
  return copied;
}

function ActionButton({
  onClick,
  disabled,
  accent,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-[13px] px-6 text-[14px] font-black text-white transition-opacity disabled:opacity-40"
      style={{ background: accent ?? 'var(--spm-acc)', boxShadow: '0 10px 22px rgba(15,23,42,0.16)' }}
    >
      {children}
    </button>
  );
}

function formatMs(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

function StopwatchTab() {
  const timerMs = useMasterStore((state) => state.classTimerMs);
  const timerRunning = useMasterStore((state) => state.classTimerRunning);
  const timerStartedAt = useMasterStore((state) => state.classTimerStartedAt);
  const timerStart = useMasterStore((state) => state.classTimerStart);
  const timerStop = useMasterStore((state) => state.classTimerStop);
  const timerReset = useMasterStore((state) => state.classTimerReset);
  const [displayMs, setDisplayMs] = useState(timerMs);
  const [laps, setLaps] = useState<number[]>([]);

  useEffect(() => {
    if (!timerRunning) {
      setDisplayMs(timerMs);
      return;
    }

    const update = () => setDisplayMs(timerMs + (timerStartedAt ? Date.now() - timerStartedAt : 0));
    update();
    const id = window.setInterval(update, 80);
    return () => window.clearInterval(id);
  }, [timerMs, timerRunning, timerStartedAt]);

  return (
    <div className="flex h-full min-h-min flex-col items-center gap-8 p-6 py-8 sm:gap-10 sm:p-8">
      <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-t3)' }}>수업 진행 스탑워치</p>
      <div
        className="font-mono text-[clamp(4rem,20vw,9rem)] font-black tabular-nums leading-none"
        style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}
      >
        {formatMs(displayMs)}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <ActionButton onClick={timerRunning ? timerStop : timerStart} accent={timerRunning ? 'rgba(239,68,68,0.85)' : 'var(--spm-acc)'}>
          {timerRunning ? <><Pause size={18} fill="currentColor" />일시정지</> : <><Play size={18} fill="currentColor" />시작</>}
        </ActionButton>
        <button
          type="button"
          onClick={() => setLaps((items) => [displayMs, ...items].slice(0, 12))}
          disabled={displayMs <= 0}
          className="flex h-14 items-center gap-2 rounded-[14px] px-6 text-[14px] font-black disabled:opacity-40"
          style={{ background: 'var(--spm-grn-a14)', border: '1px solid var(--spm-grn-a28)', color: 'var(--spm-grn)' }}
        >
          <Timer size={16} />랩타임
        </button>
        <button
          type="button"
          onClick={() => {
            timerReset();
            setDisplayMs(0);
            setLaps([]);
          }}
          className="flex h-14 items-center gap-2 rounded-[14px] px-6 text-[14px] font-black"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
        >
          <RotateCcw size={16} />초기화
        </button>
      </div>
      {laps.length > 0 ? (
        <section className="w-full max-w-[520px] rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>랩타임</h2>
            <button type="button" onClick={() => setLaps([])} className="text-[12px] font-black" style={{ color: 'var(--spm-t3)' }}>
              지우기
            </button>
          </div>
          <ol className="max-h-[220px] space-y-2 overflow-y-auto">
            {laps.map((lap, index) => (
              <li key={`${lap}-${index}`} className="flex items-center justify-between rounded-[12px] px-3 py-2" style={{ background: 'var(--spm-s3)' }}>
                <span className="text-[12px] font-black" style={{ color: 'var(--spm-t3)' }}>#{laps.length - index}</span>
                <span className="font-mono text-[18px] font-black tabular-nums" style={{ color: 'var(--spm-t)' }}>{formatMs(lap)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

const RETURN_TIMER_OPTIONS = [
  { label: '3분', value: 3 * 60 * 1000 },
  { label: '5분', value: 5 * 60 * 1000 },
  { label: '10분', value: 10 * 60 * 1000 },
] as const;

const DEFAULT_RETURN_TIMER_DURATION_MS = 10 * 60 * 1000;
const MAX_RETURN_TIMER_MINUTES = 99;

type ReturnTimerStatus = 'idle' | 'running' | 'paused' | 'expired' | 'completed';

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}초`;
  return `${mins}분 ${secs}초`;
}

function clampTimerNumber(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function durationPartsFromMs(durationMs: number) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

function durationMsFromParts(minutes: number, seconds: number) {
  const normalizedMinutes = clampTimerNumber(minutes, MAX_RETURN_TIMER_MINUTES);
  const normalizedSeconds = clampTimerNumber(seconds, 59);
  return Math.max(1000, (normalizedMinutes * 60 + normalizedSeconds) * 1000);
}

function ReturnTimerTab() {
  const [selectedDurationMs, setSelectedDurationMs] = useState(DEFAULT_RETURN_TIMER_DURATION_MS);
  const [remainingMs, setRemainingMs] = useState(DEFAULT_RETURN_TIMER_DURATION_MS);
  const [customMinutes, setCustomMinutes] = useState(() => String(durationPartsFromMs(DEFAULT_RETURN_TIMER_DURATION_MS).minutes));
  const [customSeconds, setCustomSeconds] = useState(() => String(durationPartsFromMs(DEFAULT_RETURN_TIMER_DURATION_MS).seconds));
  const [status, setStatus] = useState<ReturnTimerStatus>('idle');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedMs, setCompletedMs] = useState<number | null>(null);
  const endAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBeepSecondRef = useRef<number | null>(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === 'undefined') return null;

    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContextConstructor();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, delay = 0, volume = 0.1) => {
    const context = audioContextRef.current;
    if (!context || !soundEnabledRef.current) return;

    const startAt = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  }, []);

  const playWarning = useCallback((seconds: number) => {
    if (!soundEnabledRef.current) return;
    if (seconds >= 21 && seconds % 3 === 0) playTone(660, 0.12);
    else if (seconds >= 11 && seconds % 2 === 0) playTone(720, 0.12);
    else if (seconds >= 4) playTone(780, 0.13);
    else playTone(980, 0.18);
  }, [playTone]);

  const playFinishAlert = useCallback(() => {
    if (!soundEnabledRef.current) return;
    [0, 0.28, 0.56, 0.84].forEach((delay, index) => {
      playTone(index % 2 === 0 ? 720 : 920, 0.24, delay, 0.12);
    });
    playTone(820, 0.8, 1.12, 0.12);
  }, [playTone]);

  useEffect(() => {
    if (status !== 'running') return;

    const update = () => {
      const endAt = endAtRef.current;
      if (!endAt) return;

      const nextRemainingMs = Math.max(0, endAt - Date.now());
      const nextSecond = Math.ceil(nextRemainingMs / 1000);
      setRemainingMs(nextRemainingMs);

      if (nextSecond > 0 && nextSecond <= 30 && lastBeepSecondRef.current !== nextSecond) {
        lastBeepSecondRef.current = nextSecond;
        playWarning(nextSecond);
      }

      if (nextRemainingMs <= 0) {
        endAtRef.current = null;
        lastBeepSecondRef.current = null;
        setStatus('expired');
        playFinishAlert();
      }
    };

    update();
    const intervalId = window.setInterval(update, 100);
    return () => window.clearInterval(intervalId);
  }, [playFinishAlert, playWarning, status]);

  useEffect(() => () => {
    endAtRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') {
      void context.close();
    }
  }, []);

  const start = useCallback(async () => {
    if (soundEnabledRef.current) await ensureAudioContext();
    lastBeepSecondRef.current = null;
    setCompletedMs(null);
    setRemainingMs(selectedDurationMs);
    endAtRef.current = Date.now() + selectedDurationMs;
    setStatus('running');
  }, [ensureAudioContext, selectedDurationMs]);

  const pause = useCallback(() => {
    const endAt = endAtRef.current;
    const nextRemainingMs = endAt ? Math.max(0, endAt - Date.now()) : remainingMs;
    endAtRef.current = null;
    setRemainingMs(nextRemainingMs);
    setStatus('paused');
  }, [remainingMs]);

  const resume = useCallback(async () => {
    if (soundEnabledRef.current) await ensureAudioContext();
    lastBeepSecondRef.current = null;
    endAtRef.current = Date.now() + remainingMs;
    setStatus('running');
  }, [ensureAudioContext, remainingMs]);

  const reset = useCallback(() => {
    endAtRef.current = null;
    lastBeepSecondRef.current = null;
    setCompletedMs(null);
    setRemainingMs(selectedDurationMs);
    setStatus('idle');
  }, [selectedDurationMs]);

  const complete = useCallback(() => {
    const endAt = endAtRef.current;
    const nextRemainingMs = status === 'running' && endAt ? Math.max(0, endAt - Date.now()) : remainingMs;
    endAtRef.current = null;
    lastBeepSecondRef.current = null;
    setRemainingMs(nextRemainingMs);
    setCompletedMs(selectedDurationMs - nextRemainingMs);
    setStatus('completed');
  }, [remainingMs, selectedDurationMs, status]);

  const selectDuration = useCallback((durationMs: number) => {
    if (status === 'running' || status === 'paused') return;
    const parts = durationPartsFromMs(durationMs);
    setSelectedDurationMs(durationMs);
    setRemainingMs(durationMs);
    setCustomMinutes(String(parts.minutes));
    setCustomSeconds(String(parts.seconds));
    setCompletedMs(null);
    endAtRef.current = null;
    lastBeepSecondRef.current = null;
    setStatus('idle');
  }, [status]);

  const applyCustomDuration = useCallback((nextMinutes: number, nextSeconds: number) => {
    if (status === 'running' || status === 'paused') return;
    const nextDurationMs = durationMsFromParts(nextMinutes, nextSeconds);
    const parts = durationPartsFromMs(nextDurationMs);
    setCustomMinutes(String(parts.minutes));
    setCustomSeconds(String(parts.seconds));
    setSelectedDurationMs(nextDurationMs);
    setRemainingMs(nextDurationMs);
    setCompletedMs(null);
    endAtRef.current = null;
    lastBeepSecondRef.current = null;
    setStatus('idle');
  }, [status]);

  const updateCustomMinutes = useCallback((value: string) => {
    const minutes = clampTimerNumber(Number(value), MAX_RETURN_TIMER_MINUTES);
    const seconds = clampTimerNumber(Number(customSeconds), 59);
    applyCustomDuration(minutes, seconds);
  }, [applyCustomDuration, customSeconds]);

  const updateCustomSeconds = useCallback((value: string) => {
    const minutes = clampTimerNumber(Number(customMinutes), MAX_RETURN_TIMER_MINUTES);
    const seconds = clampTimerNumber(Number(value), 59);
    applyCustomDuration(minutes, seconds);
  }, [applyCustomDuration, customMinutes]);

  const toggleSound = useCallback(async () => {
    if (soundEnabledRef.current) {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      return;
    }
    const context = await ensureAudioContext();
    soundEnabledRef.current = Boolean(context);
    setSoundEnabled(Boolean(context));
  }, [ensureAudioContext]);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const isFinalThirty = status === 'running' && remainingSeconds <= 30;
  const progress = Math.max(0, Math.min(100, (remainingMs / selectedDurationMs) * 100));
  const durationSelectDisabled = status === 'running' || status === 'paused';
  const statusLabel = status === 'idle'
    ? '대기 중'
    : status === 'paused'
      ? '일시정지'
      : status === 'expired'
        ? '종료'
        : status === 'completed'
          ? '모두 모임 완료'
          : isFinalThirty
            ? '마지막 30초'
            : '실행 중';
  const tone = status === 'expired'
    ? { accent: '#ef4444', soft: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.28)' }
    : status === 'completed'
      ? { accent: 'var(--spm-grn)', soft: 'var(--spm-grn-a12)', border: 'var(--spm-grn-a28)' }
      : isFinalThirty
        ? { accent: 'var(--spm-amb)', soft: 'var(--spm-amb-a12)', border: 'var(--spm-amb-a28)' }
        : { accent: 'var(--spm-acc)', soft: 'var(--spm-acc-a09)', border: 'var(--spm-acc-a22)' };

  return (
    <div className="h-full px-3 py-3 pb-4 sm:px-5 sm:py-4">
      <div
        className="mx-auto flex h-full w-full max-w-[1040px] flex-col items-center justify-between gap-4 overflow-hidden rounded-[24px] bg-white px-4 py-5 text-center shadow-[0_18px_46px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 sm:px-7 sm:py-6"
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 text-[20px] font-black sm:text-[24px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>타이머</h2>
            <span className="rounded-full px-3 py-1.5 text-[12px] font-black" style={{ background: tone.border, color: tone.accent }}>
              {statusLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[12px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {soundEnabled ? '소리 켜짐' : '소리 꺼짐'}
          </button>
        </div>

        <div
          className="font-mono text-[clamp(4.5rem,18vmin,10rem)] font-black tabular-nums leading-none"
          style={{ fontFamily: 'var(--spm-font-display)', color: tone.accent, letterSpacing: 0 }}
          aria-live="polite"
          aria-label={`${Math.floor(remainingSeconds / 60)}분 ${remainingSeconds % 60}초 남음`}
        >
          {formatCountdown(remainingMs)}
        </div>

        <div className="h-2 w-full max-w-[760px] overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${progress}%`, background: tone.accent }} />
        </div>

        <div className="flex min-h-8 items-center justify-center">
          {status === 'expired' ? (
            <p className="text-[14px] font-black sm:text-[16px]" style={{ color: tone.accent }}>
              설정한 시간이 종료되었습니다.
            </p>
          ) : null}
          {status === 'completed' && completedMs !== null ? (
            <div className="flex items-center justify-center gap-2 text-[14px] font-black sm:text-[16px]" style={{ color: tone.accent }}>
              <CheckCircle2 size={21} />
              {formatElapsed(completedMs)} 진행 후 완료했습니다.
            </div>
          ) : null}
          {isFinalThirty ? (
            <p className="text-[14px] font-black sm:text-[16px]" style={{ color: tone.accent }}>마지막 30초입니다.</p>
          ) : null}
        </div>

        <div className="flex w-full max-w-[760px] flex-col items-center gap-3">
          <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="타이머 빠른 시간 선택">
              {RETURN_TIMER_OPTIONS.map((option) => {
                const active = selectedDurationMs === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectDuration(option.value)}
                    disabled={durationSelectDisabled}
                    className="h-9 min-w-[58px] rounded-[11px] px-3 text-[12px] font-black transition-opacity disabled:opacity-45"
                    style={{
                      background: active ? tone.accent : 'var(--spm-s2)',
                      border: active ? '1px solid transparent' : '1px solid var(--spm-br2)',
                      color: active ? '#fff' : 'var(--spm-t2)',
                    }}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <label className="order-2 flex items-center gap-1.5 rounded-[12px] bg-white px-2 py-1 ring-1 ring-slate-200">
              <input
                type="number"
                min={0}
                max={MAX_RETURN_TIMER_MINUTES}
                inputMode="numeric"
                value={customMinutes}
                onChange={(event) => updateCustomMinutes(event.target.value)}
                disabled={durationSelectDisabled}
                className="h-9 w-14 rounded-[10px] border-0 bg-transparent px-1 text-center text-[16px] font-black tabular-nums outline-none disabled:opacity-45"
                style={{ color: 'var(--spm-t)' }}
              />
              <span className="text-[11px] font-black" style={{ color: 'var(--spm-t3)' }}>분</span>
            </label>
            <label className="order-1 flex items-center gap-1.5 rounded-[12px] bg-white px-2 py-1 ring-1 ring-slate-200">
              <input
                type="number"
                min={0}
                max={59}
                inputMode="numeric"
                value={customSeconds}
                onChange={(event) => updateCustomSeconds(event.target.value)}
                disabled={durationSelectDisabled}
                className="h-9 w-14 rounded-[10px] border-0 bg-transparent px-1 text-center text-[16px] font-black tabular-nums outline-none disabled:opacity-45"
                style={{ color: 'var(--spm-t)' }}
              />
              <span className="text-[11px] font-black" style={{ color: 'var(--spm-t3)' }}>초</span>
            </label>
          </div>

          <div className="flex w-full flex-wrap justify-center gap-2">
            {status === 'idle' ? (
              <ActionButton onClick={start}>
                <Play size={18} fill="currentColor" />시작
              </ActionButton>
            ) : null}
            {status === 'running' ? (
              <>
                <ActionButton onClick={pause} accent="var(--spm-amb)">
                  <Pause size={18} fill="currentColor" />일시정지
                </ActionButton>
                <ActionButton onClick={complete} accent="var(--spm-grn)">
                  <CheckCircle2 size={19} />완료
                </ActionButton>
              </>
            ) : null}
            {status === 'paused' ? (
              <>
                <ActionButton onClick={resume}>
                  <Play size={18} fill="currentColor" />계속
                </ActionButton>
                <ActionButton onClick={complete} accent="var(--spm-grn)">
                  <CheckCircle2 size={19} />완료
                </ActionButton>
              </>
            ) : null}
            {status !== 'idle' ? (
              <button
                type="button"
                onClick={reset}
                className="flex h-14 min-w-[132px] items-center justify-center gap-2 rounded-[14px] px-6 text-[14px] font-black"
                style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
              >
                <RotateCcw size={16} />초기화
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorePanel({ label, score, tone, onPlus, onMinus }: { label: string; score: number; tone: 'red' | 'blue'; onPlus: () => void; onMinus: () => void }) {
  const colors = tone === 'red'
    ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.28)', text: 'var(--spm-red)' }
    : { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.28)', text: '#60a5fa' };

  return (
    <div className="flex flex-col items-center gap-5 rounded-[22px] p-6" style={{ background: colors.bg, border: `1.5px solid ${colors.border}` }}>
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: colors.text }}>{label}</p>
      <div className="text-[clamp(4rem,16vw,8rem)] font-black tabular-nums leading-none" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{score}</div>
      <div className="flex gap-3">
        <button type="button" onClick={onMinus} className="grid h-14 w-14 place-items-center rounded-full text-[24px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>-</button>
        <button type="button" onClick={onPlus} className="grid h-14 w-14 place-items-center rounded-full text-[24px] font-black text-white" style={{ background: colors.text }}>+</button>
      </div>
    </div>
  );
}

function ScoreboardTab() {
  const [red, setRed] = useState(0);
  const [blue, setBlue] = useState(0);

  return (
    <div className="flex h-full min-h-min flex-col items-center gap-4 p-6 py-8">
      <div className="grid w-full max-w-[560px] grid-cols-2 gap-4">
        <ScorePanel label="A팀" score={red} tone="red" onPlus={() => setRed((score) => score + 1)} onMinus={() => setRed((score) => Math.max(0, score - 1))} />
        <ScorePanel label="B팀" score={blue} tone="blue" onPlus={() => setBlue((score) => score + 1)} onMinus={() => setBlue((score) => Math.max(0, score - 1))} />
      </div>
      <button type="button" onClick={() => { setRed(0); setBlue(0); }} className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>점수 초기화</button>
    </div>
  );
}

function StudentModeNote({ usingSample }: { usingSample: boolean }) {
  if (!usingSample) return null;
  return (
    <div className="mx-auto mb-4 flex max-w-[560px] flex-col items-center gap-3 rounded-[14px] px-4 py-3 text-center text-[12px] font-bold sm:flex-row sm:justify-between sm:text-left" style={{ background: 'var(--spm-amb-a12)', border: '1px solid var(--spm-amb-a24)', color: 'var(--spm-amb)' }}>
      <span>등록된 학생 명단이 없어 예시 명단으로 흐름을 보여줍니다.</span>
      <Link href="/spokedu-master/students?add=1" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-amb-a16)', border: '1px solid var(--spm-amb-a26)', color: 'var(--spm-amb)' }}>
        <UserPlus size={14} />
        학생 추가
      </Link>
    </div>
  );
}

function EmptyStudentsForTools() {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-3 rounded-[16px] px-5 py-6 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <UserPlus size={28} color="var(--spm-t3)" />
      <div>
        <p className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>등록된 학생이 없습니다.</p>
        <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
          학생 관리에서 학생을 먼저 등록해 주세요.
        </p>
      </div>
      <Link href="/spokedu-master/students?add=1" className="spm-btn-primary inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-[13px] font-black focus-visible:outline-none">
        <UserPlus size={14} />
        학생 추가
      </Link>
    </div>
  );
}

function ClassSelector({
  classKeys,
  selectedClassKey,
  onChange,
  studentCount,
}: {
  classKeys: string[];
  selectedClassKey: string;
  onChange: (classKey: string) => void;
  studentCount: number;
}) {
  if (!classKeys.length) return null;

  return (
    <div className="mx-auto mb-1 flex w-full max-w-[560px] items-center gap-3 rounded-[14px] px-4 py-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <label htmlFor="class-tools-class" className="shrink-0 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>
        진행할 반
      </label>
      <select
        id="class-tools-class"
        value={selectedClassKey}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-0 flex-1 rounded-[10px] px-3 text-[13px] font-black outline-none"
        style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
      >
        {classKeys.map((classKey) => (
          <option key={classKey} value={classKey}>
            {classKey === UNASSIGNED_CLASS ? '반 미지정' : classKey}
          </option>
        ))}
      </select>
      <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: 'var(--spm-grn-a18)', color: 'var(--spm-grn)' }}>
        {studentCount}명
      </span>
    </div>
  );
}

function PickerTab({ students, usingSample }: { students: StudentProfile[]; usingSample: boolean }) {
  const [picked, setPicked] = useState<StudentProfile | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState('');
  const [excludePrev, setExcludePrev] = useState(false);
  const [prevId, setPrevId] = useState<string | null>(null);

  const handlePick = useCallback(() => {
    if (!students.length) return;
    let pool = students;
    if (excludePrev && prevId) {
      const filtered = students.filter((student) => student.id !== prevId);
      if (filtered.length > 0) pool = filtered;
    }

    setSpinning(true);
    setPicked(null);
    let count = 0;
    const id = window.setInterval(() => {
      const candidate = pool[Math.floor(Math.random() * pool.length)]!;
      setDisplay(candidate.name);
      count += 1;
      if (count >= 18) {
        window.clearInterval(id);
        const final = pool[Math.floor(Math.random() * pool.length)]!;
        setPicked(final);
        setDisplay(final.name);
        setPrevId(final.id);
        setSpinning(false);
        try {
          navigator.vibrate?.(12);
        } catch {
          // Vibration is optional.
        }
      }
    }, 80);
  }, [excludePrev, prevId, students]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
      <StudentModeNote usingSample={usingSample} />
      {!students.length ? <EmptyStudentsForTools /> : null}
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>명단 {students.length}명 중 1명 선택</p>
      <label className="flex cursor-pointer items-center gap-2 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
        <input type="checkbox" checked={excludePrev} onChange={(event) => setExcludePrev(event.target.checked)} className="rounded" />
        직전 선택 제외
      </label>
      <div
        className="flex min-h-[160px] w-full max-w-[400px] flex-col items-center justify-center rounded-[22px] p-8"
        style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
      >
        {spinning || picked ? (
          <div className="space-y-2 text-center">
            <div className={`text-[64px] font-black leading-none transition-opacity ${spinning ? 'opacity-50' : ''}`} style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{display}</div>
            {!spinning && picked ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>{picked.group}</p> : null}
          </div>
        ) : (
          <div className="text-center">
            <Shuffle size={40} color="var(--spm-t3)" className="mx-auto mb-3" />
            <p className="text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>버튼을 눌러 한 명을 선택합니다.</p>
          </div>
        )}
      </div>
      <ActionButton onClick={handlePick} disabled={spinning || !students.length} accent="rgba(239,68,68,0.85)">
        <Shuffle size={18} />{spinning ? '선택 중...' : '선택하기'}
      </ActionButton>
    </div>
  );
}

function TeamsTab({ students, usingSample }: { students: StudentProfile[]; usingSample: boolean }) {
  const [teams, setTeams] = useState<{ a: StudentProfile[]; b: StudentProfile[] } | null>(null);
  const [nameA, setNameA] = useState('A팀');
  const [nameB, setNameB] = useState('B팀');

  const balance = useCallback(() => {
    if (!students.length) return;
    const shuffled = shuffleItems(students);
    const a: StudentProfile[] = [];
    const b: StudentProfile[] = [];
    shuffled.forEach((student, index) => (index % 2 === 0 ? a : b).push(student));
    setTeams({ a, b });
  }, [students]);

  const random = useCallback(() => {
    if (!students.length) return;
    const shuffled = shuffleItems(students);
    const mid = Math.ceil(shuffled.length / 2);
    setTeams({ a: shuffled.slice(0, mid), b: shuffled.slice(mid) });
  }, [students]);

  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-y-auto px-6 py-8">
      <StudentModeNote usingSample={usingSample} />
      {!students.length ? <EmptyStudentsForTools /> : null}
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>명단 {students.length}명 팀 배분</p>
      <div className="flex flex-wrap justify-center gap-3">
        <ActionButton onClick={balance} disabled={!students.length} accent="#2563eb">
          <Users size={16} />균형 배분
        </ActionButton>
        <button type="button" onClick={random} disabled={!students.length} className="flex h-14 items-center gap-2 rounded-[14px] px-6 text-[14px] font-black disabled:opacity-40" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
          <Shuffle size={16} />무작위
        </button>
      </div>
      {teams ? (
        <div className="grid w-full max-w-[560px] gap-4 sm:grid-cols-2">
          {(['a', 'b'] as const).map((key) => {
            const isA = key === 'a';
            const colors = isA ? { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.28)', text: 'var(--spm-red)' } : { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.28)', text: '#60a5fa' };
            return (
              <div key={key} className="rounded-[18px] p-5" style={{ background: colors.bg, border: `1.5px solid ${colors.border}` }}>
                <input
                  value={isA ? nameA : nameB}
                  onChange={(event) => (isA ? setNameA : setNameB)(event.target.value)}
                  className="mb-4 w-20 border-b bg-transparent text-[18px] font-black outline-none"
                  style={{ borderColor: colors.border, color: colors.text }}
                />
                <div className="space-y-2">
                  {teams[key].map((student) => (
                    <div key={student.id} className="flex items-center justify-between rounded-[12px] px-3 py-2" style={{ background: 'rgba(0,0,0,0.12)' }}>
                      <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{student.name}</span>
                      <span className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>{student.group}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 rounded-[14px] px-4 py-3 sm:col-span-2" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <span className="shrink-0 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>인원 균등 배분</span>
            <span className="flex-1 text-right text-[11px] font-bold" style={{ color: 'var(--spm-t2)' }}>{teams.a.length}명 : {teams.b.length}명</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Users size={40} color="var(--spm-t3)" />
          <p className="text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>팀 배분 방식을 선택하세요.</p>
        </div>
      )}
    </div>
  );
}

function OrderTab({ students, usingSample }: { students: StudentProfile[]; usingSample: boolean }) {
  const [ordered, setOrdered] = useState<StudentProfile[]>([]);
  const key = students.map((student) => student.id).join('|');

  const reshuffle = useCallback(() => {
    setOrdered(shuffleItems(students));
  }, [students]);

  useEffect(() => { reshuffle(); }, [key, reshuffle]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
      <StudentModeNote usingSample={usingSample} />
      {!students.length ? <EmptyStudentsForTools /> : null}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>발표·게임 순서 · {students.length}명</p>
        <button type="button" onClick={reshuffle} className="rounded-full px-4 py-2 text-[12px] font-black" style={{ background: 'var(--spm-amb-a14)', color: 'var(--spm-amb)', border: '1px solid var(--spm-amb-a28)' }}>
          다시 섞기
        </button>
      </div>
      <ol className="mx-auto w-full max-w-[440px] space-y-2">
        {ordered.map((student, index) => (
          <li key={`${student.id}-${index}`} className="flex items-center gap-3 rounded-[13px] px-4 py-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-black text-white" style={{ background: 'var(--spm-amb)', fontFamily: 'var(--spm-font-display)' }}>{index + 1}</span>
            <span className="flex-1 text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>{student.name}</span>
            <span className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>{student.group}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TournamentTab({ students, usingSample }: { students: StudentProfile[]; usingSample: boolean }) {
  const [matches, setMatches] = useState<Array<[StudentProfile, StudentProfile | null]>>([]);

  const createBracket = useCallback(() => {
    const shuffled = shuffleItems(students);
    const nextMatches: Array<[StudentProfile, StudentProfile | null]> = [];
    for (let index = 0; index < shuffled.length; index += 2) {
      nextMatches.push([shuffled[index]!, shuffled[index + 1] ?? null]);
    }
    setMatches(nextMatches);
  }, [students]);

  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-y-auto px-6 py-8">
      <StudentModeNote usingSample={usingSample} />
      {!students.length ? <EmptyStudentsForTools /> : null}
      <div className="flex w-full max-w-[680px] items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>1라운드 대진 · {students.length}명</p>
        <ActionButton onClick={createBracket} disabled={students.length < 2} accent="#7c3aed">
          <Trophy size={17} />{matches.length ? '다시 만들기' : '대진 만들기'}
        </ActionButton>
      </div>
      {students.length === 1 ? <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t3)' }}>대진을 만들려면 학생이 2명 이상 필요합니다.</p> : null}
      {matches.length ? (
        <div className="grid w-full max-w-[680px] gap-3 sm:grid-cols-2">
          {matches.map(([first, second], index) => (
            <section key={`${first.id}-${second?.id ?? 'bye'}`} className="overflow-hidden rounded-[16px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <div className="px-4 py-2 text-[11px] font-black" style={{ background: 'var(--spm-acc-a08)', color: 'var(--spm-acc)' }}>MATCH {index + 1}</div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{first.name}</span>
                <span className="text-[11px] font-black" style={{ color: 'var(--spm-t3)' }}>VS</span>
                <span className="flex-1 text-right text-[14px] font-black" style={{ color: second ? 'var(--spm-t)' : 'var(--spm-grn)' }}>{second?.name ?? '부전승'}</span>
              </div>
            </section>
          ))}
        </div>
      ) : students.length >= 2 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Trophy size={42} color="var(--spm-t3)" />
          <p className="text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>학생을 섞어 1라운드 대진을 만듭니다.</p>
        </div>
      ) : null}
    </div>
  );
}

type LadderRung = { level: number; left: number };

function LadderTab({ students, usingSample }: { students: StudentProfile[]; usingSample: boolean }) {
  const [outcomes, setOutcomes] = useState(() => students.map((_, index) => `결과 ${index + 1}`));
  const [rungs, setRungs] = useState<LadderRung[]>([]);
  const [revealed, setRevealed] = useState(false);
  const levelCount = Math.max(5, students.length * 2);
  const ladderWidth = Math.max(520, (students.length - 1) * 96 + 80);
  const ladderHeight = 300;
  const xAt = (index: number) => ((index + 0.5) * ladderWidth) / students.length;
  const yAt = (level: number) => 24 + level * ((ladderHeight - 48) / (levelCount - 1));

  const createLadder = useCallback(() => {
    const nextRungs: LadderRung[] = [];
    for (let level = 0; level < levelCount; level += 1) {
      const used = new Set<number>();
      for (let left = 0; left < students.length - 1; left += 1) {
        if (used.has(left) || used.has(left + 1) || Math.random() > 0.36) continue;
        nextRungs.push({ level, left });
        used.add(left);
        used.add(left + 1);
      }
    }
    setRungs(nextRungs);
    setRevealed(false);
  }, [levelCount, students.length]);

  const destinations = useMemo(() => students.map((_, start) => {
    let column = start;
    for (let level = 0; level < levelCount; level += 1) {
      if (rungs.some((rung) => rung.level === level && rung.left === column)) column += 1;
      else if (rungs.some((rung) => rung.level === level && rung.left === column - 1)) column -= 1;
    }
    return column;
  }), [levelCount, rungs, students]);

  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-y-auto px-6 py-8">
      <StudentModeNote usingSample={usingSample} />
      {!students.length ? <EmptyStudentsForTools /> : null}
      <div className="flex w-full max-w-[760px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>사다리 · {students.length}명</p>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>아래 결과 이름을 먼저 바꾼 뒤 사다리를 만드세요.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRevealed(true)} disabled={!rungs.length} className="h-12 rounded-[13px] px-5 text-[13px] font-black disabled:opacity-40" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>결과 공개</button>
          <ActionButton onClick={createLadder} disabled={students.length < 2} accent="#0891b2"><Route size={17} />{rungs.length ? '다시 만들기' : '사다리 만들기'}</ActionButton>
        </div>
      </div>
      {students.length === 1 ? <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t3)' }}>사다리를 만들려면 학생이 2명 이상 필요합니다.</p> : null}
      {students.length >= 2 ? (
        <div className="w-full max-w-[760px] overflow-x-auto rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div style={{ minWidth: ladderWidth }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${students.length}, minmax(72px, 1fr))` }}>
              {students.map((student) => <div key={student.id} className="truncate text-center text-[12px] font-black" style={{ color: 'var(--spm-t)' }}>{student.name}</div>)}
            </div>
            <svg width={ladderWidth} height={ladderHeight} className="my-1 block" aria-label="사다리 선">
              {students.map((student, index) => <line key={student.id} x1={xAt(index)} y1={16} x2={xAt(index)} y2={ladderHeight - 16} stroke="var(--spm-t3)" strokeWidth="3" opacity="0.55" />)}
              {rungs.map((rung) => <line key={`${rung.level}-${rung.left}`} x1={xAt(rung.left)} y1={yAt(rung.level)} x2={xAt(rung.left + 1)} y2={yAt(rung.level)} stroke="var(--spm-acc)" strokeWidth="4" strokeLinecap="round" />)}
            </svg>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${students.length}, minmax(72px, 1fr))` }}>
              {outcomes.map((outcome, index) => (
                <input key={index} value={outcome} onChange={(event) => setOutcomes((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="h-9 min-w-0 rounded-[9px] px-2 text-center text-[11px] font-black outline-none" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }} aria-label={`${index + 1}번 결과`} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {revealed ? (
        <div className="grid w-full max-w-[760px] gap-2 sm:grid-cols-2">
          {students.map((student, index) => <div key={student.id} className="flex items-center justify-between rounded-[12px] px-4 py-3" style={{ background: 'var(--spm-grn-a14)', border: '1px solid var(--spm-grn-a28)' }}><span className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{student.name}</span><span className="text-[13px] font-black" style={{ color: 'var(--spm-grn)' }}>{outcomes[destinations[index]!] || `결과 ${destinations[index]! + 1}`}</span></div>)}
        </div>
      ) : null}
    </div>
  );
}

export default function ClassToolsView() {
  const [tab, setTab] = useState<TabId>('stopwatch');
  const operationalData = useOperationalData();
  const students = useMemo(() => operationalData.students.map(toStudentProfile), [operationalData.students]);
  const classKeys = useMemo(
    () => Array.from(new Set(students.map(studentClassKey))).sort((a, b) => {
      if (a === UNASSIGNED_CLASS) return 1;
      if (b === UNASSIGNED_CLASS) return -1;
      return a.localeCompare(b, 'ko');
    }),
    [students],
  );
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const effectiveClassKey = classKeys.includes(selectedClassKey) ? selectedClassKey : (classKeys[0] ?? '');
  const selectedStudents = useMemo(
    () => students.filter((student) => studentClassKey(student) === effectiveClassKey),
    [effectiveClassKey, students],
  );
  const usesClassRoster = tab === 'picker' || tab === 'teams' || tab === 'order' || tab === 'tournament' || tab === 'ladder';
  const usingSample = false;
  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col pb-[86px] lg:pb-0" style={{ background: 'var(--spm-bg)' }}>
      <div data-class-tools-tabs className="flex shrink-0 overflow-x-auto border-b" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          const hasCount = (id === 'picker' || id === 'teams' || id === 'order' || id === 'tournament' || id === 'ladder') && selectedStudents.length > 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="flex min-h-[48px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[13px] font-black transition-colors"
              style={{
                borderColor: active ? 'var(--spm-acc)' : 'transparent',
                color: active ? 'var(--spm-acc)' : 'var(--spm-t3)',
                background: active ? 'var(--spm-acc-a06)' : 'transparent',
              }}
            >
              <Icon size={15} />
              {label}
              {hasCount ? (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black" style={{ background: 'var(--spm-grn-a18)', color: 'var(--spm-grn)' }}>
                  {selectedStudents.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div data-class-tools-content className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {tab === 'stopwatch' && <StopwatchTab />}
        {tab === 'return-timer' && <ReturnTimerTab />}
        {tab === 'scoreboard' && <ScoreboardTab />}
        {usesClassRoster ? (
          <div className="px-6 pt-5">
            <ClassSelector
              classKeys={classKeys}
              selectedClassKey={effectiveClassKey}
              onChange={setSelectedClassKey}
              studentCount={selectedStudents.length}
            />
          </div>
        ) : null}
        {tab === 'picker' && <PickerTab key={`picker-${effectiveClassKey}`} students={selectedStudents} usingSample={usingSample} />}
        {tab === 'teams' && <TeamsTab key={`teams-${effectiveClassKey}`} students={selectedStudents} usingSample={usingSample} />}
        {tab === 'order' && <OrderTab key={`order-${effectiveClassKey}`} students={selectedStudents} usingSample={usingSample} />}
        {tab === 'tournament' && <TournamentTab key={`tournament-${effectiveClassKey}`} students={selectedStudents} usingSample={usingSample} />}
        {tab === 'ladder' && <LadderTab key={`ladder-${effectiveClassKey}`} students={selectedStudents} usingSample={usingSample} />}
      </div>

      <div className="shrink-0 border-t px-5 py-3" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)' }}>
        <Link
          href="/spokedu-master/students"
          className="flex h-10 items-center justify-center gap-2 rounded-[11px] text-[12px] font-black"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
        >
          <UserPlus size={14} />학생 명단 관리
        </Link>
      </div>
    </div>
  );
}
