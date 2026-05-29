'use client';

import { Check, ClipboardList, Clock3, Gauge, MapPin, Maximize, Minimize, Play, RotateCcw, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { hasBrokenText } from '../../lib/clean';
import { useSession } from '../../hooks/useSession';
import { SESSION_CUES } from '../../lib/data';
import { OFFICIAL_SPOMOVE_PRESETS, formatSpomovePresetDuration, isSupportedMasterEngineMode } from '../../lib/spomovePresets';
import { isTrialExpired } from '../../lib/subscription';
import { useIsPro, useMasterStore, useProfile } from '../../store';
import type { Cue, Session, SpomoveLaunchPreset } from '../../types';
import { EngineRouter } from './EngineRouter';

type SessionState = 'idle' | 'countdown' | 'running' | 'done' | 'paused';
type LaunchMode = 'projector' | 'mobile' | 'class';

const CLEAN_CUES: Cue[] = [
  { symbol: 'L', label: '왼쪽', bgColor: '#1a0a3a' },
  { symbol: 'R', label: '오른쪽', bgColor: '#0a1a3a' },
  { symbol: 'F', label: '앞으로', bgColor: '#022c1a' },
  { symbol: 'B', label: '뒤로', bgColor: '#1c0a00' },
  { symbol: 'S', label: '멈춤', bgColor: '#1a0a1a' },
  { symbol: 'J', label: '점프', bgColor: '#0a1628' },
];

const MODE_LABELS: Record<string, string> = {
  reactTrain: '시지각 반응',
  basic: '반응 인지',
  simon: '사이먼 효과',
  flanker: '플랭커',
  gonogo: 'Go / No-Go',
  taskswitch: 'Task Switching',
  spatial: '순차 기억',
  stroop: '스트룹 과제',
  flow: '플로우',
  'SR-05': '시지각 반응',
  'SR-06': '반응 인지',
  'RS-05': '사이먼 효과',
  'IC-05': '플랭커',
  'RC-05': '플로우',
};

function cleanDrillName(id: string, name: string, engineMode?: string) {
  if (hasBrokenText(name)) return MODE_LABELS[engineMode ?? ''] ?? MODE_LABELS[id] ?? 'SPOMOVE';
  return name;
}

function cleanCue(cue: Cue): Cue {
  const fallback = CLEAN_CUES.find((item) => item.symbol === cue.symbol);
  if (!cue.label || hasBrokenText(cue.label)) return fallback ?? cue;
  return cue;
}

function reactionColor(value: number | null) {
  if (value == null) return 'rgba(255,255,255,0.62)';
  if (value < 300) return '#34d399';
  if (value < 430) return '#fbbf24';
  return '#fb7185';
}

function normalizeMode(mode: string | null): LaunchMode {
  if (mode === 'projector' || mode === 'class' || mode === 'mobile') return mode;
  return 'projector';
}

function getModeLabel(mode: LaunchMode) {
  if (mode === 'projector') return '큰 화면 모드';
  if (mode === 'class') return 'Class Mode';
  return '모바일 모드';
}

function getModeConfig(mode: LaunchMode) {
  if (mode === 'class') {
    return {
      maxCues: 16,
      showMetricsDuringRun: false,
      showReactionBadge: false,
      title: 'Class Mode 완료',
      description: '화면 활동이 끝났습니다. 이어서 설명 문구로 수업의 의미를 정리할 수 있습니다.',
    };
  }
  if (mode === 'projector') {
    return {
      maxCues: 20,
      showMetricsDuringRun: false,
      showReactionBadge: false,
      title: '큰 화면 실행 완료',
      description: '전체 참여 활동이 끝났습니다. 필요하면 수업 기록이나 설명 문구로 이어갈 수 있습니다.',
    };
  }
  return {
    maxCues: 20,
    showMetricsDuringRun: true,
    showReactionBadge: true,
    title: '세션 완료',
    description: '측정 결과가 저장되었습니다. 반복 실행으로 반응 패턴을 확인할 수 있습니다.',
  };
}

function formatMs(value: number | undefined) {
  return value ? `${value}ms` : '-';
}

function CountdownLayer({ value }: { value: string }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/94">
      <span key={value} className="animate-[spmCountPop_0.72s_cubic-bezier(.34,1.56,.64,1)_both] text-[clamp(96px,22vw,230px)] font-black leading-none text-white">
        {value}
      </span>
    </div>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center">
      <p className="text-2xl font-black" style={{ color: tone ?? '#fff' }}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/42">{label}</p>
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
  mode: LaunchMode;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-0 z-20 flex min-h-[72px] items-center justify-between gap-4 bg-gradient-to-b from-black/72 to-transparent px-5 py-3 sm:px-7">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/42">{getModeLabel(mode)}</p>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/70">{drillName}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onToggleFullscreen} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label={isFullscreen ? '전체화면 해제' : '전체화면'}>
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
        <button type="button" onClick={onExit} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label="나가기">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function EngineBriefing({
  preset,
  drillName,
  engineMode,
  engineLevel,
  durationSec,
  speedSec,
  onStart,
}: {
  preset: SpomoveLaunchPreset | null;
  drillName: string;
  engineMode: string;
  engineLevel: number;
  durationSec?: number;
  speedSec?: number;
  onStart: () => void;
}) {
  const title = preset?.title || drillName;
  const subtitle = preset?.subtitle || '관리자가 저장한 초·속도·단계 그대로 큰 화면에서 실행합니다.';
  const facts = [
    { icon: Clock3, label: '시간', value: durationSec ? formatSpomovePresetDuration(durationSec) : '기본값' },
    { icon: Gauge, label: '속도', value: speedSec ? `${speedSec.toFixed(1)}초 간격` : '기본값' },
    { icon: Users, label: '대상', value: preset?.target || '현장 판단' },
    { icon: MapPin, label: '공간', value: preset?.space || 'TV·빔 화면' },
  ];

  return (
    <div className="flex h-full items-center justify-center px-5 pb-8 pt-24 sm:px-8">
      <section className="w-full max-w-[880px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4 sm:px-7">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-200/70">SPOMOVE official preset</p>
          <h1 className="mt-2 text-[30px] font-black leading-tight text-white sm:text-[44px]">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/58">{subtitle}</p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-4 sm:p-7">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <Icon className="h-4 w-4 text-indigo-200" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/34">{label}</p>
              <p className="mt-1 line-clamp-2 text-sm font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {(preset?.tags?.length ? preset.tags : ['큰 화면', `Lv.${engineLevel}`, engineMode]).map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[12px] font-black text-white/78">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-white/42">
              {preset?.useCase || '수업 중 화면 활동이 필요할 때 바로 실행하는 세팅입니다.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white px-6 text-sm font-black text-black shadow-[0_18px_55px_rgba(255,255,255,0.18)] transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="h-5 w-5 fill-black" />
            이 세팅으로 시작
          </button>
        </div>
      </section>
    </div>
  );
}

function SpomoveSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDrillId = searchParams.get('drill') ?? 'reactTrain';
  const launchMode = normalizeMode(searchParams.get('mode'));
  const presetId = searchParams.get('preset') ?? '';
  const requestedEngineMode = searchParams.get('engineMode') ?? '';
  const requestedLevel = Number(searchParams.get('level') ?? '');
  const requestedDuration = Number(searchParams.get('duration') ?? '');
  const requestedSpeed = Number(searchParams.get('speed') ?? '');
  const programId = searchParams.get('program') ?? '';
  const programs = useMasterStore((state) => state.programs);
  const drills = useMasterStore((state) => state.drills);
  const profile = useProfile();
  const isPro = useIsPro();
  const { activeSession, stats, start, end, markCue, markResponse, pause, resume } = useSession();

  const drill = useMemo(() => drills.find((item) => item.id === requestedDrillId || item.engine?.mode === requestedDrillId) ?? drills[0] ?? null, [drills, requestedDrillId]);
  const preset = useMemo(() => OFFICIAL_SPOMOVE_PRESETS.find((item) => item.id === presetId) ?? null, [presetId]);
  const program = useMemo(() => programs.find((item) => item.id === programId) ?? null, [programId, programs]);
  const modeConfig = useMemo(() => getModeConfig(launchMode), [launchMode]);
  const cues = useMemo(() => (drill?.cues?.length ? drill.cues : SESSION_CUES).map(cleanCue), [drill]);
  const drillName = drill ? cleanDrillName(drill.id, drill.name, drill.engine?.mode) : 'SPOMOVE';

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [state, setState] = useState<SessionState>('idle');
  const [countdown, setCountdown] = useState('3');
  const [cueIndex, setCueIndex] = useState(0);
  const [cueSerial, setCueSerial] = useState(0);
  const [lastRT, setLastRT] = useState<number | null>(null);
  const [finalSession, setFinalSession] = useState<Session | null>(null);
  const [remotePreset, setRemotePreset] = useState<SpomoveLaunchPreset | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const maxCues = modeConfig.maxCues;
  const currentCue = cues[cueIndex % cues.length] ?? CLEAN_CUES[0]!;
  const recordedCount = activeSession?.cueCount ?? finalSession?.cueCount ?? 0;
  const avg = stats?.avg ?? finalSession?.avg ?? 0;
  const best = stats?.best ?? finalSession?.best ?? 0;
  const showResultStats = launchMode === 'mobile';
  const isScreenMode = launchMode === 'projector' || launchMode === 'class';

  useEffect(() => {
    if (!presetId || preset) return;
    let alive = true;
    fetch('/api/spokedu-master/spomove-presets')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: SpomoveLaunchPreset[] } | null) => {
        if (!alive || !Array.isArray(json?.data)) return;
        setRemotePreset(json.data.find((item) => item.id === presetId) ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [preset, presetId]);

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
    start(drill?.id ?? '', drillName);
    setFinalSession(null);
    setLastRT(null);
    setCueIndex(0);
    setCueSerial((serial) => serial + 1);
    setState('running');
    window.setTimeout(markCue, 80);
  }, [drill?.id, drillName, markCue, start]);

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
        timeoutRef.current = window.setTimeout(beginRunning, 420);
        return;
      }
      setCountdown(sequence[index]!);
      timeoutRef.current = window.setTimeout(tick, sequence[index] === 'GO' ? 420 : 820);
    };

    timeoutRef.current = window.setTimeout(tick, 820);
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
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
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

  const resolvedPreset = remotePreset ?? preset;
  const engineMode = requestedEngineMode || resolvedPreset?.engineMode || drill?.engine?.mode;
  const engineLevel = Number.isFinite(requestedLevel) && requestedLevel > 0 ? requestedLevel : resolvedPreset?.engineLevel ?? drill?.engine?.level ?? 1;
  const engineDurationSec = Number.isFinite(requestedDuration) && requestedDuration > 0 ? requestedDuration : resolvedPreset?.durationSec;
  const engineSpeedSec = Number.isFinite(requestedSpeed) && requestedSpeed > 0 ? requestedSpeed : resolvedPreset?.speedSec;
  const canRunEngine = Boolean(drill?.engine && engineMode && isSupportedMasterEngineMode(engineMode));

  if (canRunEngine && engineMode && state === 'running') {
    return (
      <EngineRouter
        mode={engineMode}
        level={engineLevel}
        durationSec={engineDurationSec}
        speedSec={engineSpeedSec}
        onExit={exitSession}
        onComplete={() => {
          setFinalSession(null);
          setState('done');
        }}
      />
    );
  }

  if (!drill) return null;

  return (
    <div
      className="relative h-dvh overflow-hidden select-none"
      style={{ background: state === 'running' ? currentCue.bgColor : '#050509', color: '#fff', fontFamily: 'var(--spm-font-display)', transition: 'background 0.08s linear' }}
      onClick={state === 'running' ? handleResponse : undefined}
      role={state === 'running' ? 'button' : undefined}
      tabIndex={state === 'running' ? 0 : undefined}
      aria-label={state === 'running' ? '반응 기록' : undefined}
    >
      {state !== 'running' ? <TopBar drillName={drillName} mode={launchMode} isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} onExit={exitSession} /> : null}

      {state === 'idle' && canRunEngine && engineMode ? (
        <EngineBriefing
          preset={resolvedPreset}
          drillName={drillName}
          engineMode={engineMode}
          engineLevel={engineLevel}
          durationSec={engineDurationSec}
          speedSec={engineSpeedSec}
          onStart={startCountdown}
        />
      ) : null}

      {state === 'idle' && !canRunEngine ? (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <button
            type="button"
            onClick={startCountdown}
            className="grid h-[136px] w-[136px] place-items-center rounded-full border bg-white/10 shadow-[0_26px_80px_rgba(79,70,229,0.22)] active:scale-95 sm:h-[168px] sm:w-[168px] lg:h-[196px] lg:w-[196px]"
            style={{ borderColor: 'rgba(255,255,255,0.18)' }}
            aria-label="세션 시작"
          >
            <Play className="ml-1 h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16" fill="#fff" />
          </button>
          <p className="mt-7 text-[44px] font-black leading-none sm:text-[64px] lg:text-[82px]">START</p>
          <p className="mt-3 max-w-[720px] text-sm font-black uppercase tracking-[0.12em] text-indigo-200/70 sm:text-base">{program?.title ?? drillName}</p>
          {isScreenMode ? <p className="mt-5 text-sm font-semibold text-white/42">스페이스 또는 START 버튼으로 시작</p> : null}
        </div>
      ) : null}

      {state === 'countdown' ? <CountdownLayer value={countdown} /> : null}

      {state === 'running' ? (
        <>
          <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
            <span key={cueSerial} className={`${isScreenMode ? 'text-[clamp(144px,34vw,360px)]' : 'text-[clamp(104px,28vw,260px)]'} animate-[spmCuePop_0.2s_cubic-bezier(.34,1.56,.64,1)_both] font-black leading-none text-white drop-shadow-[0_24px_80px_rgba(0,0,0,0.34)]`}>
              {currentCue.symbol}
            </span>
            <span className={`${isScreenMode ? 'text-[clamp(24px,4vw,48px)]' : 'text-[20px] sm:text-[26px]'} font-semibold uppercase tracking-[0.12em] text-white/68`}>{currentCue.label}</span>
          </div>
          {modeConfig.showReactionBadge && lastRT !== null ? (
            <div key={lastRT} className="absolute right-5 top-5 z-40 rounded-full bg-black/35 px-3 py-1 text-sm font-black shadow-xl" style={{ color: reactionColor(lastRT) }}>
              {lastRT}ms
            </div>
          ) : null}
          {modeConfig.showMetricsDuringRun ? (
            <div className="absolute inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 bg-gradient-to-t from-black/70 to-transparent px-5 pt-12" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}>
              <ResultStat label="횟수" value={`${recordedCount}/${maxCues}`} />
              <ResultStat label="평균" value={formatMs(avg)} tone="#34d399" />
              <ResultStat label="최고" value={formatMs(best)} />
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
          <p className="mt-2 text-sm font-semibold text-white/48">수업 흐름을 잠시 멈췄습니다.</p>
          <button
            type="button"
            onClick={() => {
              resume();
              setState('running');
              window.setTimeout(markCue, 80);
            }}
            className="mt-6 rounded-2xl bg-indigo-500 px-6 py-4 text-sm font-bold text-white"
          >
            계속하기
          </button>
        </div>
      ) : null}

      {state === 'done' ? (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <div className="grid h-24 w-24 animate-[spmCuePop_0.28s_cubic-bezier(.34,1.56,.64,1)_both] place-items-center rounded-full bg-white/10">
            <Check size={42} color="#34d399" />
          </div>
          <h1 className="mt-6 text-[36px] font-black">{modeConfig.title}</h1>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-indigo-200/70">{program?.title ?? drillName}</p>
          {showResultStats ? (
            <>
              <p className="mt-2 max-w-[520px] text-sm font-semibold leading-6 text-white/48">{modeConfig.description}</p>
              <div className="mt-7 grid w-full max-w-[560px] grid-cols-3 gap-2">
                <ResultStat label="횟수" value={String(finalSession?.cueCount ?? recordedCount)} />
                <ResultStat label="평균" value={formatMs(avg)} tone="#34d399" />
                <ResultStat label="최고" value={formatMs(best)} />
              </div>
            </>
          ) : null}
          <div className={`mt-7 grid w-full max-w-[680px] gap-2 ${programId ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
            <button type="button" onClick={startCountdown} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-500 text-sm font-bold text-white shadow-[0_16px_44px_rgba(79,70,229,0.26)]">
              <RotateCcw size={16} />
              다시 시작
            </button>
            {programId ? (
              <Link href={`/spokedu-master/report?program=${programId}`} className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white text-sm font-black text-black">
                <ClipboardList size={14} />
                설명 문구
              </Link>
            ) : null}
            <Link href="/spokedu-master/spomove" className="flex h-12 items-center justify-center rounded-2xl bg-white/[0.08] text-sm font-bold text-white">
              목록으로
            </Link>
          </div>
          {programId ? (
            <Link href={`/spokedu-master/class-record?program=${programId}`} className="mt-4 text-xs font-bold text-white/38 underline-offset-4 hover:text-white/70 hover:underline">
              수업 기록으로 오늘 활동 남기기
            </Link>
          ) : null}
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
    <Suspense fallback={<div className="relative h-dvh overflow-hidden select-none bg-black text-white" />}>
      <SpomoveSessionContent />
    </Suspense>
  );
}
