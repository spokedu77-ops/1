'use client';

import { BookOpen, CheckCircle2, LayoutList, ListOrdered, MonitorPlay, Pause, Play, RotateCcw, Shuffle, Timer, UserPlus, Users, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toStudentProfile } from '../../lib/operationalDataAdapter';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { useMasterStore } from '../../store';
import type { StudentProfile } from '../../types';

type TabId = 'stopwatch' | 'return-timer' | 'scoreboard' | 'picker' | 'teams' | 'order';

const TABS: { id: TabId; label: string; icon: typeof Timer }[] = [
  { id: 'stopwatch', label: '타이머', icon: Timer },
  { id: 'return-timer', label: '복귀 타이머', icon: Timer },
  { id: 'scoreboard', label: '점수판', icon: LayoutList },
  { id: 'picker', label: '무작위 선택', icon: Shuffle },
  { id: 'teams', label: '팀 나누기', icon: Users },
  { id: 'order', label: '진행 순서', icon: ListOrdered },
];

const TOOL_STATUS = [
  { label: '화면 도구', value: '타이머·복귀·점수판' },
  { label: '명단 도구', value: '선택·팀·순서' },
  { label: '운영 방식', value: '수업 중 즉시 실행' },
] as const;

const TOOL_HELP: Record<TabId, string> = {
  stopwatch: '운동 루틴, 스테이션, 미션 제한 시간을 화면에 크게 띄웁니다.',
  'return-timer': '쉬는 시간 후 아이들이 정해진 시간 안에 다시 모이도록 돕는 10분 카운트다운 도구입니다.',
  scoreboard: '팀 경쟁 활동에서 점수를 크게 보여주고 흐름을 끊지 않습니다.',
  picker: '발표, 시범, 시작 순서를 공정하게 뽑습니다.',
  teams: '참여 수준을 고려해 팀을 빠르게 나눕니다.',
  order: '게임, 발표, 로테이션 순서를 한 번에 정합니다.',
};

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
      className="flex h-14 min-w-[132px] items-center justify-center gap-2 rounded-[14px] px-6 text-[14px] font-black text-white transition-opacity disabled:opacity-40"
      style={{ background: accent ?? 'var(--spm-acc)', boxShadow: `0 8px 24px ${accent ?? 'rgba(99,102,241,0.3)'}40` }}
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
    <div className="flex h-full flex-col items-center justify-center gap-10 p-8">
      <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-t3)' }}>수업 진행 타이머</p>
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
          onClick={() => {
            timerReset();
            setDisplayMs(0);
          }}
          className="flex h-14 items-center gap-2 rounded-[14px] px-6 text-[14px] font-black"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
        >
          <RotateCcw size={16} />초기화
        </button>
      </div>
    </div>
  );
}

const RETURN_TIMER_DURATION_MS = 10 * 60 * 1000;

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

function ReturnTimerTab() {
  const [remainingMs, setRemainingMs] = useState(RETURN_TIMER_DURATION_MS);
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
    setRemainingMs(RETURN_TIMER_DURATION_MS);
    endAtRef.current = Date.now() + RETURN_TIMER_DURATION_MS;
    setStatus('running');
  }, [ensureAudioContext]);

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
    setRemainingMs(RETURN_TIMER_DURATION_MS);
    setStatus('idle');
  }, []);

  const complete = useCallback(() => {
    const endAt = endAtRef.current;
    const nextRemainingMs = status === 'running' && endAt ? Math.max(0, endAt - Date.now()) : remainingMs;
    endAtRef.current = null;
    lastBeepSecondRef.current = null;
    setRemainingMs(nextRemainingMs);
    setCompletedMs(RETURN_TIMER_DURATION_MS - nextRemainingMs);
    setStatus('completed');
  }, [remainingMs, status]);

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
  const progress = Math.max(0, Math.min(100, (remainingMs / RETURN_TIMER_DURATION_MS) * 100));
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
            : '진행 중';
  const tone = status === 'expired'
    ? { accent: '#ef4444', soft: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.28)' }
    : status === 'completed'
      ? { accent: '#10b981', soft: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)' }
      : isFinalThirty
        ? { accent: '#f59e0b', soft: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)' }
        : { accent: 'var(--spm-acc)', soft: 'rgba(99,102,241,0.09)', border: 'rgba(99,102,241,0.22)' };

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
      <div
        className="mx-auto flex min-h-full w-full max-w-[1100px] flex-col items-center justify-center rounded-[22px] px-4 py-8 text-center sm:px-8 lg:py-10"
        style={{ background: tone.soft, border: `1px solid ${tone.border}` }}
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full px-3 py-1.5 text-[12px] font-black" style={{ background: tone.border, color: tone.accent }}>
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={toggleSound}
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {soundEnabled ? '소리 켜짐' : '소리 꺼짐'}
          </button>
        </div>

        <div className="mt-5">
          <h2 className="text-[24px] font-black sm:text-[32px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
            쉬는 시간 복귀 타이머
          </h2>
          <p className="mx-auto mt-2 max-w-[620px] text-[13px] font-semibold leading-6 sm:text-[14px]" style={{ color: 'var(--spm-t2)' }}>
            쉬는 시간 후 아이들이 정해진 시간 안에 다시 모이도록 돕는 10분 카운트다운 도구입니다.
          </p>
        </div>

        <div
          className="my-7 font-mono text-[clamp(5rem,22vw,13rem)] font-black tabular-nums leading-[0.85]"
          style={{ fontFamily: 'var(--spm-font-display)', color: tone.accent, letterSpacing: 0 }}
          aria-live="polite"
          aria-label={`${Math.floor(remainingSeconds / 60)}분 ${remainingSeconds % 60}초 남음`}
        >
          {formatCountdown(remainingMs)}
        </div>

        <div className="h-3 w-full max-w-[760px] overflow-hidden rounded-full" style={{ background: 'var(--spm-s3)' }}>
          <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${progress}%`, background: tone.accent }} />
        </div>

        <div className="mt-5 min-h-[52px]">
          {status === 'expired' ? (
            <p className="text-[16px] font-black sm:text-[19px]" style={{ color: tone.accent }}>
              시간이 종료되었습니다. 모두 제자리로 모여주세요.
            </p>
          ) : null}
          {status === 'completed' && completedMs !== null ? (
            <div className="flex items-center justify-center gap-2 text-[16px] font-black sm:text-[19px]" style={{ color: tone.accent }}>
              <CheckCircle2 size={21} />
              모두 모였습니다. {formatElapsed(completedMs)} 만에 모였습니다.
            </div>
          ) : null}
          {isFinalThirty ? (
            <p className="text-[15px] font-black sm:text-[18px]" style={{ color: tone.accent }}>마지막 30초입니다. 제자리로 모여주세요.</p>
          ) : null}
        </div>

        <div className="mt-4 flex w-full max-w-[760px] flex-wrap justify-center gap-3">
          {status === 'idle' ? (
            <ActionButton onClick={start}>
              <Play size={18} fill="currentColor" />타이머 시작하기
            </ActionButton>
          ) : null}
          {status === 'running' ? (
            <>
              <ActionButton onClick={pause} accent="#f59e0b">
                <Pause size={18} fill="currentColor" />일시정지
              </ActionButton>
              <ActionButton onClick={complete} accent="#10b981">
                <CheckCircle2 size={19} />모두 모였어요
              </ActionButton>
            </>
          ) : null}
          {status === 'paused' ? (
            <>
              <ActionButton onClick={resume}>
                <Play size={18} fill="currentColor" />계속하기
              </ActionButton>
              <ActionButton onClick={complete} accent="#10b981">
                <CheckCircle2 size={19} />모두 모였어요
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
              <RotateCcw size={16} />다시 시작
            </button>
          ) : null}
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
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
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
    <div className="mx-auto mb-4 flex max-w-[560px] flex-col items-center gap-3 rounded-[14px] px-4 py-3 text-center text-[12px] font-bold sm:flex-row sm:justify-between sm:text-left" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.24)', color: 'var(--spm-amb)' }}>
      <span>등록된 학생 명단이 없어 예시 명단으로 흐름을 보여줍니다.</span>
      <Link href="/spokedu-master/students" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[12px] font-black" style={{ background: 'rgba(245,158,11,0.16)', border: '1px solid rgba(245,158,11,0.26)', color: 'var(--spm-amb)' }}>
        <UserPlus size={14} />
        명단 등록
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
      <Link href="/spokedu-master/students" className="inline-flex h-10 items-center gap-2 rounded-[11px] px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
        <UserPlus size={14} />
        학생 관리로 이동
      </Link>
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
        <button type="button" onClick={reshuffle} className="rounded-full px-4 py-2 text-[12px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)', border: '1px solid rgba(245,158,11,0.28)' }}>
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

export default function ClassToolsView() {
  const [tab, setTab] = useState<TabId>('stopwatch');
  const operationalData = useOperationalData();
  const students = useMemo(() => operationalData.students.map(toStudentProfile), [operationalData.students]);
  const usingSample = false;
  const ActiveIcon = TABS.find((item) => item.id === tab)?.icon ?? Timer;

  return (
    <div className="flex h-full min-h-0 flex-col pb-[86px] lg:pb-0" style={{ background: 'var(--spm-bg)' }}>
      <section className="shrink-0 border-b px-5 py-5 sm:px-7" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)' }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[640px]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>CLASS COMMAND</p>
            <h1 className="mt-1 text-[26px] font-black leading-tight sm:text-[34px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
              수업 중 바로 꺼내 쓰는 진행 콘솔
            </h1>
            <p className="mt-2 text-[13px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
              타이머, 쉬는 시간 복귀, 점수판, 학생 선택, 팀 배분, 진행 순서를 수업 중 바로 처리합니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[420px]">
            {TOOL_STATUS.map((item) => (
              <div key={item.label} className="rounded-[14px] px-4 py-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <p className="text-[10px] font-black" style={{ color: 'var(--spm-t3)' }}>{item.label}</p>
                <p className="mt-1 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-[16px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'var(--spm-acc)', color: 'white' }}>
              <ActiveIcon size={18} />
            </span>
            <div>
              <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{TABS.find((item) => item.id === tab)?.label}</p>
              <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{TOOL_HELP[tab]}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/spokedu-master/library" className="grid h-10 w-10 place-items-center rounded-[11px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }} aria-label="라이브러리">
              <BookOpen size={16} />
            </Link>
            <Link href="/spokedu-master/spomove" className="grid h-10 w-10 place-items-center rounded-[11px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }} aria-label="스포무브 실행">
              <MonitorPlay size={16} />
            </Link>
            <Link href="/spokedu-master/students" className="grid h-10 w-10 place-items-center rounded-[11px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }} aria-label="학생 명단">
              <UserPlus size={16} />
            </Link>
          </div>
        </div>
      </section>

      <div className="flex shrink-0 overflow-x-auto border-b" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          const hasCount = (id === 'picker' || id === 'teams' || id === 'order') && students.length > 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="flex min-h-[48px] items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[13px] font-black transition-colors"
              style={{
                borderColor: active ? 'var(--spm-acc)' : 'transparent',
                color: active ? 'var(--spm-acc)' : 'var(--spm-t3)',
                background: active ? 'rgba(99,102,241,0.06)' : 'transparent',
              }}
            >
              <Icon size={15} />
              {label}
              {hasCount ? (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black" style={{ background: 'rgba(16,185,129,0.18)', color: 'var(--spm-grn)' }}>
                  {students.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'stopwatch' && <StopwatchTab />}
        {tab === 'return-timer' && <ReturnTimerTab />}
        {tab === 'scoreboard' && <ScoreboardTab />}
        {tab === 'picker' && <PickerTab students={students} usingSample={usingSample} />}
        {tab === 'teams' && <TeamsTab students={students} usingSample={usingSample} />}
        {tab === 'order' && <OrderTab students={students} usingSample={usingSample} />}
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
