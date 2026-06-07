'use client';

import { Check, ClipboardList, Clock3, Gauge, MapPin, Maximize, Minimize, Music2, Play, RotateCcw, Users, Volume2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BgmPlayer } from '@/app/lib/admin/audio/bgmPlayer';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';
import { getAudioCtx } from '@/app/admin/spomove/training/_player/lib/audio';

import { hasBrokenText } from '../../lib/clean';
import { useSession } from '../../hooks/useSession';
import { SESSION_CUES } from '../../lib/data';
import { OFFICIAL_SPOMOVE_PRESETS, formatSpomovePresetDuration, isSupportedMasterEngineMode } from '../../lib/spomovePresets';
import { isTrialExpired } from '../../lib/subscription';
import { useIsPro, useMasterStore, useProfile } from '../../store';
import type { Cue, Session, SpomoveLaunchPreset } from '../../types';
import { EngineRouter } from './EngineRouter';
import {
  findOfficialSpomovePreset,
  type OfficialSpomovePreset,
} from '../officialSpomovePresets';

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

function OfficialEngineBriefing({
  preset,
  startDisabled,
  onStart,
}: {
  preset: OfficialSpomovePreset;
  startDisabled: boolean;
  onStart: () => void;
}) {
  const { mode } = preset.engine;
  const countFact =
    mode === 'reactTrain'
      ? { icon: Users, label: '실행 시간', value: '약 75초' }
      : mode === 'spatial'
        ? { icon: Users, label: '라운드', value: '10라운드' }
        : { icon: Users, label: '반복 횟수', value: `${preset.rounds}회` };
  const facts = [
    { icon: Gauge, label: '프로그램', value: `${preset.axisTitle} · ${preset.programTitle}` },
    { icon: Clock3, label: '신호 간격', value: `${preset.cueSeconds}초` },
    countFact,
    { icon: Music2, label: 'BGM', value: 'BGM 자동 재생' },
  ];

  return (
    <div className="flex h-full items-center justify-center px-5 pb-8 pt-24 sm:px-8">
      <section className="w-full max-w-[880px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4 sm:px-7">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-200/70">SPOMOVE official preset</p>
          <h1 className="mt-2 text-[30px] font-black leading-tight text-white sm:text-[44px]">{preset.title}</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/58">{preset.description}</p>
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
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[12px] font-black text-white/78">큰 화면</span>
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[12px] font-black text-white/78">
                <Volume2 className="mr-1 inline h-3.5 w-3.5" />
                효과음 자동
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-white/42">{preset.recommendedUse}</p>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={startDisabled}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white px-6 text-sm font-black text-black shadow-[0_18px_55px_rgba(255,255,255,0.18)] transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-5 w-5 fill-black" />
            {startDisabled ? 'BGM 준비 중' : '큰 화면으로 실행'}
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
  const officialPreset = useMemo(() => findOfficialSpomovePreset(presetId), [presetId]);
  const requestedBgmPath = searchParams.get('bgm') ?? '';
  const soundEnabled = searchParams.get('sound') !== 'off';
  const requestedEngineMode = searchParams.get('engineMode') ?? '';
  const requestedLevel = Number(searchParams.get('level') ?? '');
  const requestedDuration = Number(searchParams.get('duration') ?? '');
  const requestedSpeed = Number(searchParams.get('speed') ?? '');
  const programId = searchParams.get('program') ?? '';
  const programs = useMasterStore((state) => state.programs);
  const drills = useMasterStore((state) => state.drills);
  const profile = useProfile();
  const isPro = useIsPro();
  const { list: bgmList, loading: bgmLoading } = useSpomoveTrainingBGM();
  const { activeSession, stats, start, end, markCue, markResponse, pause, resume } = useSession();

  const drill = useMemo(
    () =>
      officialPreset
        ? null
        : drills.find((item) => item.id === requestedDrillId || item.engine?.mode === requestedDrillId) ??
          (presetId ? null : drills[0] ?? null),
    [drills, officialPreset, presetId, requestedDrillId],
  );
  const preset = useMemo(() => OFFICIAL_SPOMOVE_PRESETS.find((item) => item.id === presetId) ?? null, [presetId]);
  const program = useMemo(() => programs.find((item) => item.id === programId) ?? null, [programId, programs]);
  const modeConfig = useMemo(() => getModeConfig(launchMode), [launchMode]);
  const cues = useMemo(() => (drill?.cues?.length ? drill.cues : SESSION_CUES).map(cleanCue), [drill]);
  const drillName = officialPreset?.title ?? (drill ? cleanDrillName(drill.id, drill.name, drill.engine?.mode) : 'SPOMOVE');
  const cueSeconds = officialPreset?.cueSeconds;
  const rounds = officialPreset?.rounds;
  const selectedBgmPath = useMemo(() => {
    if (requestedBgmPath) return bgmList.includes(requestedBgmPath) ? requestedBgmPath : '';
    if (officialPreset && bgmList.length > 0) return bgmList[0]!;
    return '';
  }, [bgmList, officialPreset, requestedBgmPath]);
  const isBgmPending = Boolean(officialPreset && bgmLoading);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [state, setState] = useState<SessionState>('idle');
  const [countdown, setCountdown] = useState('3');
  const [cueIndex, setCueIndex] = useState(0);
  const [cueSerial, setCueSerial] = useState(0);
  const [lastRT, setLastRT] = useState<number | null>(null);
  const [finalSession, setFinalSession] = useState<Session | null>(null);
  const [remotePreset, setRemotePreset] = useState<SpomoveLaunchPreset | null>(null);
  const [remotePresetChecked, setRemotePresetChecked] = useState(!presetId || Boolean(preset || officialPreset));
  const timeoutRef = useRef<number | null>(null);
  const bgmPlayerRef = useRef<BgmPlayer | null>(null);

  const maxCues = modeConfig.maxCues;
  const currentCue = cues[cueIndex % cues.length] ?? CLEAN_CUES[0]!;
  const recordedCount = activeSession?.cueCount ?? finalSession?.cueCount ?? 0;
  const avg = stats?.avg ?? finalSession?.avg ?? 0;
  const best = stats?.best ?? finalSession?.best ?? 0;
  const showResultStats = launchMode === 'mobile';
  const isScreenMode = launchMode === 'projector' || launchMode === 'class';

  useEffect(() => {
    if (!presetId || preset || officialPreset) {
      setRemotePresetChecked(true);
      return;
    }
    setRemotePreset(null);
    setRemotePresetChecked(false);
    let alive = true;
    fetch('/api/spokedu-master/spomove-presets')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: SpomoveLaunchPreset[] } | null) => {
        if (!alive || !Array.isArray(json?.data)) return;
        setRemotePreset(json.data.find((item) => item.id === presetId) ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setRemotePresetChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [officialPreset, preset, presetId]);

  useEffect(() => {
    if (officialPreset) {
      if (isTrialExpired(profile)) router.replace('/spokedu-master/spomove');
      return;
    }
    if (!drill) {
      if (!presetId) router.replace('/spokedu-master/spomove');
      return;
    }
    if (isTrialExpired(profile)) {
      router.replace('/spokedu-master/spomove');
      return;
    }
    if (drill.isPro && !isPro) router.replace('/spokedu-master/spomove');
  }, [drill, isPro, officialPreset, presetId, profile, router]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopBgm = useCallback(() => {
    try {
      bgmPlayerRef.current?.stop();
    } catch {
      // Audio cleanup must not block session exit.
    }
    bgmPlayerRef.current = null;
  }, []);

  const startOfficialSession = useCallback(() => {
    if (!officialPreset || isBgmPending || !officialPreset.isReady) return;
    stopBgm();
    if (launchMode === 'projector' && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    if (soundEnabled) getAudioCtx();
    if (selectedBgmPath) {
      const player = new BgmPlayer();
      player.init(getPublicUrl(selectedBgmPath), 0.35);
      bgmPlayerRef.current = player;
      void player.play();
      player.fadeIn(180);
    }
    setFinalSession(null);
    setState('running');
  }, [isBgmPending, launchMode, officialPreset, selectedBgmPath, soundEnabled, stopBgm]);

  const finishSession = useCallback(() => {
    clearTimer();
    stopBgm();
    const session = end();
    setFinalSession(session);
    setState('done');
  }, [clearTimer, end, stopBgm]);

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
        if (state === 'idle' || state === 'done') {
          if (officialPreset) startOfficialSession();
          else startCountdown();
        }
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
  }, [handleResponse, markCue, officialPreset, pause, resume, startCountdown, startOfficialSession, state]);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => stopBgm, [stopBgm]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const reset = () => {
    clearTimer();
    stopBgm();
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
  const engineMode = officialPreset?.engine.mode || requestedEngineMode || resolvedPreset?.engineMode || drill?.engine?.mode;
  const engineLevel = officialPreset?.engine.level ?? (Number.isFinite(requestedLevel) && requestedLevel > 0 ? requestedLevel : resolvedPreset?.engineLevel ?? drill?.engine?.level ?? 1);
  const engineDurationSec = Number.isFinite(requestedDuration) && requestedDuration > 0 ? requestedDuration : resolvedPreset?.durationSec;
  const engineSpeedSec = cueSeconds ?? (Number.isFinite(requestedSpeed) && requestedSpeed > 0 ? requestedSpeed : resolvedPreset?.speedSec);
  const canRunEngine = Boolean(
    engineMode &&
      (officialPreset ? officialPreset.isReady : drill?.engine && isSupportedMasterEngineMode(engineMode)),
  );
  const invalidPreset = Boolean(presetId && remotePresetChecked && !officialPreset && !resolvedPreset);

  if (canRunEngine && engineMode && state === 'running') {
    return (
      <EngineRouter
        mode={engineMode}
        level={engineLevel}
        durationSec={engineDurationSec}
        speedSec={engineSpeedSec}
        rounds={rounds}
        soundEnabled={soundEnabled}
        onExit={exitSession}
        onComplete={() => {
          stopBgm();
          setFinalSession(null);
          setState('done');
        }}
      />
    );
  }

  if (invalidPreset) {
    return (
      <main className="flex h-dvh items-center justify-center bg-slate-950 px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.06] p-8 text-center">
          <X className="mx-auto h-8 w-8 text-rose-300" />
          <h1 className="mt-5 text-2xl font-black">SPOMOVE 활동을 찾을 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold text-white/55">목록으로 돌아가 다시 선택해 주세요.</p>
          <Link href="/spokedu-master/spomove" className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-black text-slate-950">
            SPOMOVE 목록으로
          </Link>
        </section>
      </main>
    );
  }

  if (!drill && !officialPreset) return null;

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

      {state === 'idle' && officialPreset ? (
        <OfficialEngineBriefing
          preset={officialPreset}
          startDisabled={isBgmPending}
          onStart={startOfficialSession}
        />
      ) : null}

      {state === 'idle' && !officialPreset && canRunEngine && engineMode ? (
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

      {state === 'idle' && !officialPreset && !canRunEngine ? (
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
            <button type="button" onClick={officialPreset ? startOfficialSession : startCountdown} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-500 text-sm font-bold text-white shadow-[0_16px_44px_rgba(79,70,229,0.26)]">
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
