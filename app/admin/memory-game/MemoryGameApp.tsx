'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { COLORS, MODES, MEMORY_ROUNDS, NUMBER_RULES } from './constants';
import { useFlowBGM } from '@/app/lib/admin/hooks/useFlowBGM';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { BgmPlayer } from '@/app/lib/admin/audio/bgmPlayer';
import { useStudents } from './hooks/useStudents';
import { useIntervalTimer } from './hooks/useIntervalTimer';
import { useTrainingTimer } from './hooks/useTrainingTimer';
import { useDual21TouchTraining } from './hooks/useDual21TouchTraining';
import { tts } from './lib/tts';
import { StudentModal } from './components/StudentModal';
import { StudentManageScreen } from './components/StudentManageScreen';
import { Sparkline } from './components/Sparkline';
import { SpeedSelector } from './components/SpeedSelector';
import { SignalDisplay } from './components/SignalDisplay';
import { MemoryGame } from './components/MemoryGame';
import { MemoryGameLevel4 } from './components/MemoryGameLevel4';
import { MemoryGameLevel5 } from './components/MemoryGameLevel5';
import { CSS, S } from './styles';
import type { DupStats } from './lib/signals';

type Screen = 'home' | 'setup' | 'guide' | 'students' | 'training' | 'memory' | 'flow' | 'challenge' | 'result';

type Settings = {
  mode: string;
  level: number;
  speed: number;
  timeMode: string;
  duration: number;
  targetReps: number;
  audioMode: string;
  numberRule: string;
  intervalMode: boolean;
  intervalWork: number;
  intervalRest: number;
  intervalSets: number;
  warmup: number;
  accel: boolean;
  /** 이중과제 2-1번만: 기본형(신호 속도 자동) / 터치형(화면 터치 시 다음) */
  dual21Advance: 'default' | 'touch';
};

const defaultSettings: Settings = {
  mode: 'basic',
  level: 1,
  speed: 4.0,
  timeMode: 'time',
  duration: 60,
  targetReps: 20,
  // 신호별 음성/비프 미사용(기본 off). 배경음은 훈련 시작 시 월별 BGM(플로우 제외).
  audioMode: 'off',
  numberRule: 'odd_left',
  intervalMode: false,
  intervalWork: 30,
  intervalRest: 15,
  intervalSets: 4,
  warmup: 3,
  accel: false,
  dual21Advance: 'default',
};

export default function MemoryGameApp({
  initialMode,
  initialLevel,
}: {
  initialMode?: string;
  initialLevel?: number;
}) {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const { students, add: addStudent, remove: removeStudent, rename: renameStudent } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('spokedu_theme') || 'light' : 'light'));
  const [isOffline, setIsOffline] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [isTraining, setIsTraining] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [signal, setSignal] = useState<Record<string, unknown> | null>(null);
  const [signalKey, setSignalKey] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const prevBgRef = useRef<string | null>(null);
  const [stats, setStats] = useState({ timeLeft: 30, repsLeft: 20, progress: 0 });
  const [result, setResult] = useState<{
    count: number;
    cfg: Settings;
    dupStats?: DupStats | null;
    nbackScore?: { hits: number; misses: number; falseAlarms: number; accuracy: number; level: number };
    battleResult?: unknown;
  } | null>(null);
  const [sessionMemo, setSessionMemo] = useState('');
  const [displayCount, setDisplayCount] = useState(0);
  /** 훈련 세션마다 증가 — 터치형 2-1 첫 신호 부트스트랩용 */
  const [trainingKey, setTrainingKey] = useState(0);
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trainingContainerRef = useRef<HTMLDivElement>(null);
  const flowCompleteGuardRef = useRef(false);
  const challengeCompleteGuardRef = useRef(false);
  const bgmPlayerRef = useRef<BgmPlayer | null>(null);

  const month = new Date().getMonth() + 1;
  const { list: flowBgmList, selected: flowBgmSelected, loading: flowBgmLoading } = useFlowBGM(month);
  const pendingBgmStartRef = useRef<null | { mode: string }>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') localStorage.setItem('spokedu_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    if (!initialMode || !(initialMode in MODES)) return;
    const modeDef = MODES[initialMode];
    if (!modeDef) return;
    const targetLevel =
      typeof initialLevel === 'number' && modeDef.levels.some((lv) => lv.id === initialLevel)
        ? initialLevel
        : modeDef.levels[0]?.id ?? 1;
    setSettings((s) => ({ ...s, mode: initialMode, level: targetLevel }));
    setScreen('setup');
  }, [initialMode, initialLevel]);

  const set = useCallback((key: keyof Settings, value: unknown) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const onSignal = useCallback((sig: Record<string, unknown>) => {
    countRef.current++;
    setDisplayCount(countRef.current);
    if (sig.type === 'full_color' && (sig.bg as string) === prevBgRef.current) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 80);
    }
    prevBgRef.current = (sig.bg as string) ?? null;
    setSignal(sig);
    setSignalKey((k) => k + 1);
  }, []);

  const isDual21Touch =
    settings.mode === 'dual' && settings.level === 2 && settings.dual21Advance === 'touch';

  const onFinish = useCallback((dupStats?: DupStats | null) => {
    if (document.fullscreenElement) document.exitFullscreen();
    setIsTraining(false);
    const cfg = { ...settings };
    const count = countRef.current;
    setResult({ count, cfg, dupStats: cfg.mode === 'basic' ? dupStats ?? undefined : undefined });
    setSessionMemo('');
    setScreen('result');
    if (cfg.audioMode !== 'off') setTimeout(() => tts('훈련 완료! 수고했어요!', true), 300);
  }, [settings, selectedStudentId]);

  const { getProgress } = useTrainingTimer({
    active: isTraining && !settings.intervalMode && !isDual21Touch,
    speed: settings.speed,
    accel: settings.accel ?? false,
    timeMode: settings.timeMode,
    duration: settings.duration,
    targetReps: settings.targetReps,
    mode: settings.mode,
    level: settings.level,
    audioMode: settings.audioMode,
    colors: COLORS,
    onSignal,
    onFinish,
  });

  const { advance: advanceDual21Touch, getProgress: getDual21TouchProgress } = useDual21TouchTraining({
    active: isTraining && !settings.intervalMode && isDual21Touch,
    trainingKey,
    targetReps: settings.targetReps,
    colors: COLORS,
    audioMode: settings.audioMode,
    onSignal,
    onFinish: () => onFinish(undefined),
  });

  const { intervalPhase, intervalSet, intervalLeft } = useIntervalTimer({
    active: isTraining && !!settings.intervalMode && !isDual21Touch,
    workSec: settings.intervalWork,
    restSec: settings.intervalRest,
    sets: settings.intervalSets,
    speed: settings.speed,
    mode: settings.mode,
    level: settings.level,
    audioMode: settings.audioMode,
    colors: COLORS,
    onSignal,
    onFinish,
  });

  const rafStatsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isTraining) return;
    const tick = () =>
      setStats(
        isDual21Touch && !settings.intervalMode ? getDual21TouchProgress() : getProgress()
      );
    const loop = () => {
      tick();
      rafStatsRef.current = requestAnimationFrame(loop);
    };
    rafStatsRef.current = requestAnimationFrame(loop);
    return () => { if (rafStatsRef.current != null) cancelAnimationFrame(rafStatsRef.current); };
  }, [isTraining, getProgress, getDual21TouchProgress, isDual21Touch, settings.intervalMode]);

  useEffect(() => {
    if (!isTraining) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isTraining]);

  useEffect(() => {
    // 훈련/메모리 화면 이탈 시 BGM 정지 (요청: 시작 클릭 시만 재생, 훈련/메모리에서만 유지)
    if (screen === 'training' || screen === 'memory' || screen === 'flow' || screen === 'challenge') return;
    bgmPlayerRef.current?.fadeOut(220);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'training') return;
    const id = requestAnimationFrame(() => {
      trainingContainerRef.current?.requestFullscreen?.().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'memory') return;
    const id = requestAnimationFrame(() => {
      document.documentElement.requestFullscreen?.().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [screen]);

  const startSession = useCallback(
    (cfg: Settings = settings) => {
      // 분량 선택은 횟수만 노출/사용 → 안전하게 reps로 고정
      if (cfg.timeMode !== 'reps') cfg = { ...cfg, timeMode: 'reps' };
      // 인터벌 세트는 4로 고정
      if (cfg.intervalSets !== 4) cfg = { ...cfg, intervalSets: 4 };
      // 신호별 음성·비프는 사용하지 않음(모든 모드 audioMode off)
      if (cfg.audioMode !== 'off') cfg = { ...cfg, audioMode: 'off' };
      if (cfg.dual21Advance == null) cfg = { ...cfg, dual21Advance: 'default' };
      if (cfg.mode === 'dual' && cfg.level === 2 && cfg.dual21Advance === 'touch') {
        cfg = { ...cfg, intervalMode: false };
      }
      setSettings(cfg);
      countRef.current = 0;
      setDisplayCount(0);
      setSignal(null);
      setFlashing(false);
      prevBgRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const playBgm = (path: string) => {
        try {
          const url = getPublicUrl(path);
          if (!bgmPlayerRef.current) bgmPlayerRef.current = new BgmPlayer();
          // 사용자 클릭(제스처) 컨텍스트에서 play까지 최대한 이어지게 동기적으로 호출
          bgmPlayerRef.current.init(url, 0.275);
          void bgmPlayerRef.current.play();
          bgmPlayerRef.current.fadeIn(180);
        } catch {
          // ignore
        }
      };

      // BGM 정책:
      // - flow / challenge: iframe 안에서 BGM 재생 — 부모 BgmPlayer로 재생하면 이중 재생됨
      // - basic/spatial/dual/stroop: 월별 BGM list 랜덤 재생
      const bgmMode = cfg.mode;
      const shouldTryBgmParent =
        bgmMode === 'basic' || bgmMode === 'spatial' || bgmMode === 'dual' || bgmMode === 'stroop';
      if (shouldTryBgmParent) {
        if (flowBgmList.length === 0) {
          if (flowBgmLoading) pendingBgmStartRef.current = { mode: bgmMode };
        } else {
          const pick = flowBgmList[Math.floor(Math.random() * flowBgmList.length)]!;
          playBgm(pick);
        }
      }

      const warmupSec = Math.max(0, cfg.warmup ?? 0);

      if (cfg.mode === 'flow') {
        flowCompleteGuardRef.current = false;
        setScreen('flow');
        setCountdown(null);
      } else if (cfg.mode === 'challenge') {
        challengeCompleteGuardRef.current = false;
        setScreen('challenge');
        setCountdown(null);
      } else {
        // spatial(순차기억)도 warmup 카운트다운 적용
        const nextScreen: Screen = cfg.mode === 'spatial' ? 'memory' : 'training';
        setScreen(nextScreen);
        setIsTraining(false);

        if (warmupSec <= 0) {
          setCountdown(null);
          if (nextScreen === 'training') {
            setTrainingKey((k) => k + 1);
            setIsTraining(true);
            if (cfg.audioMode !== 'off') tts('시작!', true);
          }
          return;
        }

        setCountdown(warmupSec);
        let c = warmupSec;
        if (cfg.audioMode !== 'off') tts(warmupSec === 3 ? '셋' : String(warmupSec), true);
        timerRef.current = setInterval(() => {
          c--;
          if (c <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setCountdown(null);
            if (nextScreen === 'training') {
              setTrainingKey((k) => k + 1);
              setIsTraining(true);
              if (cfg.audioMode !== 'off') tts('시작!', true);
            }
          } else {
            setCountdown(c);
            const voices = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
            if (cfg.audioMode !== 'off') tts(voices[c - 1] ?? String(c), true);
          }
        }, 900);
      }
    },
    [settings, flowBgmList, flowBgmSelected, flowBgmLoading]
  );

  useEffect(() => {
    const pending = pendingBgmStartRef.current;
    if (!pending?.mode) return;
    if (flowBgmLoading) return;
    pendingBgmStartRef.current = null;
    if (flowBgmList.length === 0) return;
    if (!(screen === 'training' || screen === 'memory' || screen === 'flow' || screen === 'challenge')) return;

    const mode = pending.mode;
    if (mode === 'flow' || mode === 'challenge') return;
    const pick = flowBgmList[Math.floor(Math.random() * flowBgmList.length)]!;
    if (!pick) return;
    try {
      const url = getPublicUrl(pick);
      if (!bgmPlayerRef.current) bgmPlayerRef.current = new BgmPlayer();
      bgmPlayerRef.current.init(url, 0.275);
      void bgmPlayerRef.current.play();
      bgmPlayerRef.current.fadeIn(180);
    } catch {
      // ignore
    }
  }, [flowBgmLoading, flowBgmList, flowBgmSelected, screen]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (document.fullscreenElement) document.exitFullscreen();
    setIsTraining(false);
    setFlashing(false);
    setSignal(null);
    bgmPlayerRef.current?.fadeOut(220);
    setScreen('home');
  }, []);

  const handleFlowComplete = useCallback(() => {
    if (flowCompleteGuardRef.current) return;
    flowCompleteGuardRef.current = true;
    if (document.fullscreenElement) document.exitFullscreen();
    const cfg = { ...settings, mode: 'flow', level: 1 };
    const completedStages = 5;
    setResult({ count: completedStages, cfg });
    setScreen('result');
  }, [settings, selectedStudentId]);

  const handleChallengeComplete = useCallback(() => {
    if (challengeCompleteGuardRef.current) return;
    challengeCompleteGuardRef.current = true;
    if (document.fullscreenElement) document.exitFullscreen();
    const cfg = { ...settings, mode: 'challenge', level: 1 };
    const completedStages = 4;
    setResult({ count: completedStages, cfg });
    setScreen('result');
  }, [settings]);

  useEffect(() => {
    if (screen !== 'flow' && screen !== 'challenge') return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const messageType = (event.data as { type?: string } | null)?.type;
      if (screen === 'flow' && (messageType === 'flow-ending' || messageType === 'flow-ended')) {
        handleFlowComplete();
      }
      if (screen === 'challenge' && messageType === 'challenge-ended') {
        handleChallengeComplete();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [screen, handleFlowComplete, handleChallengeComplete]);

  const M = MODES[settings.mode];
  if (!M) return null;

  // ── HOME ──
  if (screen === 'home') {
    const M_cur = MODES[settings.mode];
    return (
      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <style>{CSS}</style>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-15%', width: '55vw', height: '55vw', maxWidth: 600, maxHeight: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(1.8rem,5vw,3rem) clamp(1.5rem,5vw,3rem)', maxWidth: 520, margin: '0 auto', width: '100%', gap: '1.8rem', boxSizing: 'border-box' }}>
          {isOffline && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.96rem', fontWeight: 700, color: '#FCA5A5' }}>
              <span>📵</span>
              <span>오프라인 상태입니다 — 저장된 데이터로 훈련은 계속 가능합니다</span>
            </div>
          )}
          <div className="home-fadein" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'clamp(0.6rem,1.5vw,0.72rem)', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Cognitive · Physical · Education</div>
              <div style={{ fontSize: 'clamp(1.5rem,4.5vw,2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>SPOKEDU</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button type="button" onClick={() => setShowStudentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.65rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.6rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                {(() => {
                  const s = students.find((st) => st.id === selectedStudentId);
                  if (s) return <><div style={{ width: 18, height: 18, borderRadius: '50%', background: s.color }} /><span>{s.name}</span></>;
                  return <><span>👤</span><span>학생 선택</span></>;
                })()}
              </button>
              <button type="button" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} style={{ width: 36, height: 36, borderRadius: '0.6rem', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, cursor: 'pointer' }}>{theme === 'light' ? '🌙' : '☀️'}</button>
            </div>
          </div>
          <div className="home-fadein-1" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(1rem,3vw,1.5rem)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {['PLAY', 'THINK', 'FLOW'].map((w, i) => (
                <React.Fragment key={w}>
                  <span style={{ fontSize: 'clamp(0.68rem,1.8vw,0.82rem)', fontWeight: 800, letterSpacing: '0.15em', color: i === 0 ? '#F97316' : i === 1 ? '#3B82F6' : '#22C55E' }}>{w}</span>
                  {i < 2 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>·</span>}
                </React.Fragment>
              ))}
            </div>
            <h1 style={{ fontSize: 'clamp(2.2rem,9vw,4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, margin: 0 }}>
              몸이 움직이면<br />
              <span style={{ color: '#F97316' }}>뇌가 깨어납니다</span>
            </h1>
            <p style={{ fontSize: 'clamp(0.92rem,2.2vw,1.05rem)', color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, fontWeight: 400 }}>신체 활동과 인지 훈련을 통합한<br />교육 기반 퍼포먼스 트레이닝 도구</p>
            <div className="home-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {Object.values(MODES).map((m) => {
                const rgbMap: Record<string, string> = { '#3B82F6': '59,130,246', '#A855F7': '168,85,247', '#22C55E': '34,197,94', '#F97316': '249,115,22' };
                const rgb = rgbMap[m.accent] ?? '249,115,22';
                const active = settings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSettings((s) => ({ ...s, mode: m.id, level: 1 }));
                      setScreen('setup');
                    }}
                    style={{ background: active ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.04)', border: `2px solid ${active ? m.accent : 'rgba(255,255,255,0.08)'}`, borderRadius: '0.85rem', padding: 'clamp(0.6rem,2vw,0.85rem)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}
                  >
                    <div style={{ fontSize: 'clamp(1rem,2.5vw,1.2rem)', marginBottom: '0.25rem' }}>{m.icon}</div>
                    <div style={{ fontSize: 'clamp(0.72rem,1.8vw,0.82rem)', fontWeight: 800, color: active ? m.accent : 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>{m.title}</div>
                    <div style={{ fontSize: 'clamp(0.58rem,1.4vw,0.65rem)', color: 'rgba(255,255,255,0.28)', marginTop: '0.12rem', fontWeight: 500 }}>{m.en}</div>
                    <div style={{ fontSize: 'clamp(0.55rem,1.3vw,0.62rem)', color: 'rgba(255,255,255,0.2)', marginTop: '0.2rem', fontWeight: 600 }}>{m.id === 'spatial' || m.id === 'dual' ? `${m.levels.length}번` : m.id === 'flow' || m.id === 'challenge' ? `${m.levels.length}프로그램` : `${m.levels.length}단계`}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="home-fadein-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <button type="button" onClick={() => setScreen('guide')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.85rem', padding: 'clamp(0.7rem,2vw,0.9rem)', fontSize: 'clamp(0.78rem,2vw,0.86rem)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📖 가이드</button>
            </div>
            <div className="home-fadein-3" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'clamp(0.62rem,1.6vw,0.7rem)', color: 'rgba(255,255,255,0.18)', fontWeight: 500, lineHeight: 1.6 }}>연세대학교 체육교육 전문가가 설계한<br />신체·인지 통합 트레이닝 도구</p>
            </div>
          </div>
        </div>
        {showStudentModal && (
          <StudentModal
            students={students}
            selectedId={selectedStudentId}
            onSelect={(id) => { setSelectedStudentId(id); setShowStudentModal(false); }}
            onClose={() => setShowStudentModal(false)}
            onManage={() => { setShowStudentModal(false); setScreen('students'); }}
          />
        )}
      </div>
    );
  }

  // ── STUDENTS / HISTORY / GUIDE (delegate to components) ──
  if (screen === 'students') return <StudentManageScreen students={students} onAdd={addStudent} onRemove={removeStudent} onRename={renameStudent} onBack={() => setScreen('home')} />;

  if (screen === 'guide') {
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, maxWidth: '36rem' }}>
            <button type="button" style={S.back} onClick={() => setScreen('home')}>← 처음으로</button>
            <h2 style={S.ctitle}>📖 훈련 가이드</h2>
            <p style={S.csub}>어떤 훈련인지, 어떻게 진행하는지 확인하세요.</p>
            <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', borderRadius: '1.1rem', padding: '1rem 1.1rem', marginBottom: '1.2rem', border: '1px solid rgba(148,163,184,0.24)', boxShadow: '0 10px 22px rgba(15,23,42,0.22)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 900, color: '#FDBA74', letterSpacing: '0.08em', marginBottom: '0.55rem', textTransform: 'uppercase', padding: '0.3rem 0.55rem', borderRadius: '999px', border: '1px solid rgba(251,146,60,0.45)', background: 'rgba(251,146,60,0.12)' }}>
                준비 체크
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.8, fontWeight: 600 }}>
                체육관 바닥 네 방향에 <strong style={{ color: '#fff' }}>빨강 / 파랑 / 초록 / 노랑</strong> 콘을 배치하세요.
                <br />
                화면 신호가 나오면 해당 콘으로 이동해 터치 후 제자리로 복귀합니다.
              </div>
            </div>
            {[
              {
                icon: '⚡',
                title: '반응 인지',
                tag: '키우는 능력: 순발력 · 지각(색/방향/수) · 반응-실행 연결',
                steps: [
                  '준비물/세팅: 빨강·파랑·초록·노랑 콘을 4방향(앞/뒤/좌/우)으로 배치. 초보는 거리 2~3m, 익숙하면 4~6m.',
                  '진행 기본 룰: 신호가 나오면 즉시 해당 콘으로 이동 → 터치(또는 발로 라인 밟기) → 출발점 복귀.',
                  '단계 1(색): 화면 전체 색 = 이동할 콘. 코칭: “색 먼저 보고, 한 박자 빠르게 출발!”',
                  '단계 2(변형 색지각): 좌·우에 같은 과일이 보이며, 연속 신호에서 같은 과일은 반복되지 않습니다. 해당 색 콘으로 이동. 코칭: “보이는 색만 빠르게!”',
                  '단계 3(방향): ↑/↓/←/→ 방향 이동. 코칭: “몸은 먼저, 눈은 다음 신호로.”',
                  '단계 4(수 판단): 숫자를 규칙으로 판단(예: 홀수 왼쪽/짝수 오른쪽). 코칭: “판단은 짧게, 움직임은 크게.”',
                  '난이도 조절: 신호 속도(초)를 낮추면 난이도↑. 분량은 횟수(10/20/30/40회)로 운영.',
                ],
                tip: '시작 후 월별 BGM이 깔립니다. 신호마다 음성·비프는 나오지 않으니 코칭은 선생님 구두로 진행하세요.',
                accent: '#3B82F6',
              },
              {
                icon: '🧠',
                title: '스트룹 과제',
                tag: '키우는 능력: 억제 제어 · 인지 유연성 · 오류 교정',
                steps: [
                  '목표: “자동 반응(글자 읽기)”을 억제하고 “정답 규칙(색/내용)”에 맞춰 응답하기.',
                  '단계 1(역 스트룹): 색은 무시하고 글자 내용을 그대로 말하기(가장 흔히 헷갈림).',
                  '단계 2(색 명명): 글자 내용은 무시하고 글자 색을 말하기. 예: “파란색 빨강” → “파랑”.',
                  '단계 3(배경 간섭): 배경색까지 섞여 방해. 규칙은 동일(글자 색만). 초반엔 속도 느리게.',
                  '단계 4(채움 화살표): 위·아래·좌·우를 가리키는 화살표 안이 색으로 채워집니다. 방향은 무시하고 화살표 안 색 이름만 말합니다.',
                  '운영 팁: 실수했을 때 즉시 정답을 말하게 하고 다음 신호로 넘어가기(멈추지 않기).',
                  '배경: 다른 훈련과 같이 월별 BGM이 재생됩니다(시작 버튼 클릭 후).',
                ],
                tip: '스트룹은 신호별 음성 힌트 없이 진행합니다. 정답은 선생님이 확인·코칭해 주세요.',
                accent: '#A855F7',
              },
              {
                icon: '🎨',
                title: '순차 기억',
                tag: '키우는 능력: 작업기억 · 순서 재생 · 집중 유지',
                steps: [
                  '진행 방식: 화면에 색(및 번호)이 순서대로 제시 → 학생이 순서대로 말하기 → 선생님이 정답 공개.',
                  '속도: 설정의 “신호 속도(초)”가 색/번호가 바뀌는 실제 템포입니다(예: 4.0초면 4초마다 다음 카드).',
                  '1번(3항): 3개를 기억해 순서대로 말하기. 초보 워밍업용.',
                  '2번(5항): 5개를 기억해 순서대로 말하기. 집중 유지 훈련.',
                  '3번(10항): 10개를 본 뒤 전체 정답 목록으로 확인(반복 학습용).',
                  '4번(색-번호 Q&A): 1~10을 모두 본 뒤 5개 질문. 질문 문구는 “숫자 N은 무슨 색깔이었을까요?”로 통일.',
                  '5번(색-번호 전체 공개): 10개를 모두 본 뒤 번호별 정답을 한 화면에 공개.',
                ],
                tip: '순차기억은 “정답 맞히기”보다 “기억 전략”을 코칭하는 게 핵심입니다(예: 소리내어 묶기, 3개 단위 청킹).',
                accent: '#22C55E',
              },
              {
                icon: '🔀',
                title: '이중 과제',
                tag: '키우는 능력: 분산 주의 · 복합 실행 · 전환 능력',
                steps: [
                  '목표: 두 정보를 동시에 처리하고 행동으로 옮기기.',
                  '1번(색깔·숫자): 화면 배경 색에 맞는 콘으로 이동한 뒤, 숫자만큼 반복 동작(터치·점프 등)을 수행합니다.',
                  '2-1번(색깔·화살표): 파랑 또는 빨강 콘으로 이동한 뒤, 화면 화살표(왼쪽·오른쪽) 방향으로 이동합니다. 색과 방향은 매번 무작위입니다.',
                  '난이도 조절: 신호 속도·분량(횟수)으로 조절합니다.',
                ],
                tip: '실수 교정은 “규칙을 다시 말하게 하기 → 바로 다음 신호”가 가장 좋습니다. 멈춰서 길게 설명하면 훈련 효과가 떨어집니다.',
                accent: '#F97316',
              },
            ].map((block, blockIndex) => (
              <section
                key={block.title}
                style={{
                  marginBottom: '1rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
                }}
              >
                <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #EEF2F7', background: `linear-gradient(90deg, ${block.accent}10 0%, #F8FAFC 70%)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.3rem' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: '#fff', border: `1px solid ${block.accent}55`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>{block.icon}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0F172A' }}>{block.title}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 800, color: block.accent }}>STEP {blockIndex + 1}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', lineHeight: 1.45 }}>{block.tag}</div>
                </div>
                <div style={{ padding: '0.9rem 1rem', background: '#FCFDFE' }}>
                  <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {block.steps.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', fontSize: '0.87rem', color: '#475569', lineHeight: 1.62, fontWeight: 600 }}>
                        <span style={{ marginTop: '0.13rem', width: 20, height: 20, borderRadius: 6, background: '#EEF2FF', color: '#4F46E5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, flexShrink: 0 }}>
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '0.75rem', padding: '0.7rem 0.8rem', fontSize: '0.83rem', color: '#334155', lineHeight: 1.55, fontWeight: 700 }}>
                    <span style={{ color: block.accent, fontWeight: 900 }}>코칭 팁</span>
                    <span style={{ color: '#64748B' }}> · </span>
                    {block.tip}
                  </div>
                </div>
              </section>
            ))}
            <div style={{ background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFBF5 100%)', border: '1px solid #FED7AA', borderRadius: '1rem', padding: '0.95rem 1.05rem', marginTop: '0.2rem', color: '#9A3412', boxShadow: '0 8px 20px rgba(251,146,60,0.12)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.4rem', textTransform: 'uppercase' }}>고급 설정 요약</div>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.65, fontWeight: 700 }}>
                - 인터벌 모드(Tabata)는 <strong>4세트 고정</strong>입니다(Work/Rest는 설정값 사용).<br />
                - 점진 가속(accel)은 인터벌이 아닌 일반 모드에서만 적용되며, 진행률에 따라 신호 간격이 선형으로 빨라져 마지막엔 <strong>60%</strong>까지 단축됩니다.<br />
                - 반응 인지·스트룹·순차 기억·이중 과제는 시작 시 <strong>월별 BGM</strong>이 재생됩니다(플로우는 iframe 내부 BGM).
              </div>
            </div>
            <button type="button" style={{ ...S.btn, ...S.bDark, marginTop: '0.5rem' }} onClick={() => setScreen('home')}>🏠 처음으로</button>
          </div>
        </div>
      </div>
    );
  }

  // ── SETUP (abbreviated: only mode/level/speed/start to keep file size down; full setup can be added in same pattern)
  if (screen === 'setup') {
    const stepNum = (n: number, label: string) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--subtle-bg)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.84rem', fontWeight: 900, flexShrink: 0, border: '2px solid #F97316' }}>{n}</div>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>{label}</span>
      </div>
    );
    const isDual21 = settings.mode === 'dual' && settings.level === 2;
    const stepSpeed = isDual21 ? 4 : 3;
    const stepReps = isDual21 ? 5 : 4;
    const stepBasicRule = isDual21 ? 6 : 5;
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, maxWidth: '34rem' }}>
            <button type="button" style={S.back} onClick={() => setScreen('home')}>← 처음으로</button>
            <h2 style={S.ctitle}>훈련 설정</h2>
            <p style={S.csub}>아래 항목을 순서대로 설정하고 시작하세요.</p>
            <div style={S.sec}>
              {stepNum(1, '어떤 훈련을 할까요?')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                {Object.values(MODES).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSettings((s) => ({
                        ...s,
                        mode: m.id,
                        level: 1,
                        audioMode: 'off',
                        // 인터벌 세트는 4로 고정
                        intervalSets: 4,
                      }));
                    }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.85rem 0.95rem', borderRadius: '1rem', border: `2px solid ${settings.mode === m.id ? m.accent : 'var(--border)'}`, background: settings.mode === m.id ? `${m.accent}10` : 'var(--subtle-bg)', cursor: 'pointer', gap: '0.15rem', fontFamily: 'inherit', transition: 'all 0.13s' }}
                  >
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{m.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.84rem', color: settings.mode === m.id ? m.accent : 'var(--text)', marginTop: '0.3rem', lineHeight: 1.2 }}>{m.title}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>{m.en}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={S.sec}>
              {stepNum(2, '난이도를 선택하세요')}
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '0.7rem', lineHeight: 1.55 }}>{M.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {M.levels.map((lv) => (
                  <button key={lv.id} type="button" onClick={() => set('level', lv.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.8rem 1rem', borderRadius: '1rem', border: `2px solid ${settings.level === lv.id ? M.accent : 'var(--border)'}`, background: settings.level === lv.id ? `${M.accent}08` : 'var(--card)', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'all 0.13s', textAlign: 'left' }}>
                    <div style={{ ...(M.id === 'dual' ? { minWidth: 52, width: 'auto', padding: '0 0.35rem' } : { width: 40 }), height: 26, borderRadius: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.82rem', color: settings.level === lv.id ? '#fff' : 'var(--text)', background: settings.level === lv.id ? M.accent : 'var(--subtle-bg)', border: settings.level === lv.id ? `1px solid ${M.accent}` : '1px solid var(--border)', flexShrink: 0, marginTop: '0.05rem' }}>{M.id === 'spatial' ? lv.name : M.id === 'dual' ? (lv.id === 1 ? '1번' : '2-1번') : `단계 ${lv.id}`}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.12rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--text)' }}>{lv.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{lv.enName}</span>
                      </div>
                      <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{lv.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {settings.mode !== 'flow' && settings.mode !== 'challenge' && (
              <>
                {isDual21 && (
                  <div style={S.sec}>
                    {stepNum(3, '2-1번 진행 방식')}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => set('dual21Advance', 'default')}
                        style={{
                          flex: 1,
                          minWidth: '8rem',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.85rem',
                          border: `2px solid ${settings.dual21Advance === 'default' ? '#F97316' : 'var(--border)'}`,
                          background: settings.dual21Advance === 'default' ? '#FFF7ED' : 'var(--card)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          color: 'var(--text)',
                        }}
                      >
                        기본형
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSettings((s) => ({ ...s, dual21Advance: 'touch', intervalMode: false }));
                        }}
                        style={{
                          flex: 1,
                          minWidth: '8rem',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.85rem',
                          border: `2px solid ${settings.dual21Advance === 'touch' ? '#F97316' : 'var(--border)'}`,
                          background: settings.dual21Advance === 'touch' ? '#FFF7ED' : 'var(--card)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          color: 'var(--text)',
                        }}
                      >
                        터치형
                      </button>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.65rem', lineHeight: 1.65 }}>
                      <strong>기본형</strong>: 아래에서 정한 신호 속도로 자동으로 다음 신호로 넘어갑니다.
                      <br />
                      <strong>터치형</strong>: 화면을 누를 때마다 다음 신호로 넘어갑니다. 분량(회)만 사용합니다.
                    </p>
                  </div>
                )}
                <div style={S.sec}>
                  {stepNum(stepSpeed, '신호 속도를 정하세요')}
                  {isDual21 && settings.dual21Advance === 'touch' ? (
                    <p style={{ fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.55 }}>
                      터치형에서는 신호 속도를 사용하지 않습니다.
                    </p>
                  ) : (
                    <SpeedSelector value={settings.speed} onChange={(v) => set('speed', v)} showPresets={false} />
                  )}
                </div>

                {/* 분량 선택: 횟수만 (spatial은 분량 선택 숨김) */}
                {settings.mode !== 'spatial' && (
                  <div style={S.sec}>
                    {stepNum(stepReps, '분량을 선택하세요')}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {[10, 20, 30, 40].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            // UI는 횟수만 노출 → timeMode는 reps로 고정
                            if (settings.timeMode !== 'reps') set('timeMode', 'reps');
                            set('targetReps', n);
                          }}
                          style={{
                            padding: '0.6rem 1rem',
                            borderRadius: '0.75rem',
                            border: `2px solid ${settings.targetReps === n ? '#F97316' : 'var(--border)'}`,
                            background: settings.targetReps === n ? '#FFF7ED' : 'var(--card)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            color: 'var(--text)',
                          }}
                        >
                          {n}회
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {settings.mode === 'basic' && settings.level === 4 && (
                  <div style={S.sec}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--subtle-bg)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.84rem', fontWeight: 900, flexShrink: 0, border: '2px solid #3B82F6' }}>{stepBasicRule}</div>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>판단 규칙을 정하세요</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {NUMBER_RULES.map((rule) => (
                        <button key={rule.id} type="button" onClick={() => set('numberRule', rule.id)} style={{ padding: '0.7rem 1rem', borderRadius: '0.85rem', border: `2px solid ${settings.numberRule === rule.id ? '#3B82F6' : 'var(--border)'}`, background: settings.numberRule === rule.id ? '#EFF6FF' : 'var(--card)', color: settings.numberRule === rule.id ? '#1D4ED8' : 'var(--text)', fontWeight: settings.numberRule === rule.id ? 700 : 600, fontSize: '0.91rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s' }}>{settings.numberRule === rule.id ? '✓ ' : ''}{rule.label}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={S.sec}>
                  <button type="button" onClick={() => setAdvancedOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.96rem', fontWeight: 700, color: '#64748B' }}>
                    <span>{advancedOpen ? '▼' : '▶'}</span>
                    <span>고급 설정</span>
                  </button>
                  {advancedOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0' }}>
                      <div>
                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#64748B', marginBottom: '0.35rem' }}>워밍업 카운트다운 (초)</div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>{[0, 3, 5].map((n) => (
                          <button key={n} type="button" onClick={() => set('warmup', n)} style={{ padding: '0.5rem 0.8rem', borderRadius: '0.6rem', border: `2px solid ${settings.warmup === n ? '#0F172A' : '#E2E8F0'}`, background: settings.warmup === n ? '#0F172A' : '#fff', color: settings.warmup === n ? '#fff' : '#475569', fontWeight: 600, fontSize: '0.96rem', cursor: 'pointer', fontFamily: 'inherit' }}>{n === 0 ? '없음' : `${n}초`}</button>
                        ))}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#64748B', marginBottom: '0.35rem' }}>인터벌 모드 (Tabata)</div>
                        <button type="button" onClick={() => set('intervalMode', !settings.intervalMode)} style={{ padding: '0.5rem 0.9rem', borderRadius: '0.6rem', border: `2px solid ${settings.intervalMode ? '#22C55E' : '#E2E8F0'}`, background: settings.intervalMode ? '#F0FDF4' : '#fff', fontWeight: 600, fontSize: '0.96rem', cursor: 'pointer', fontFamily: 'inherit' }}>{settings.intervalMode ? '켜짐' : '끔'}</button>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#64748B', marginBottom: '0.35rem' }}>점진 가속 (accel)</div>
                        <button type="button" onClick={() => set('accel', !settings.accel)} style={{ padding: '0.5rem 0.9rem', borderRadius: '0.6rem', border: `2px solid ${settings.accel ? '#22C55E' : '#E2E8F0'}`, background: settings.accel ? '#F0FDF4' : '#fff', fontWeight: 600, fontSize: '0.96rem', cursor: 'pointer', fontFamily: 'inherit' }}>{settings.accel ? '켜짐' : '끔'}</button>
                        <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.35rem', lineHeight: 1.5 }}>
                          세션 진행률에 따라 신호 간격이 선형으로 빨라집니다. 마지막에는 설정 속도의 <strong>60%</strong>까지 단축됩니다 (예: 4.0초 → 2.4초).
                          <br />
                          인터벌 모드에서는 적용되지 않습니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" style={{ ...S.btn, ...S.bPrimary, flex: 3, fontSize: '1.05rem', padding: '1.1rem' }} onClick={() => startSession()}>훈련 시작 →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MEMORY / TRAINING / RESULT ──
  const handleMemoryComplete = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    setResult({ count: MEMORY_ROUNDS, cfg: { ...settings } });
    setScreen('result');
  };

  if (screen === 'memory') {
    if (countdown !== null) {
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
          <style>{CSS}</style>
          <div key={countdown} className="countdown-pop" style={{ fontSize: 'clamp(120px,30vw,240px)', fontWeight: 900, color: '#F97316', lineHeight: 1 }}>{countdown}</div>
        </div>
      );
    }
    if (settings.level === 4)
      return <MemoryGameLevel4 onExit={stop} onComplete={handleMemoryComplete} audioMode={settings.audioMode} speedSec={settings.speed} startDelayMs={0} />;
    if (settings.level === 5)
      return <MemoryGameLevel5 onExit={stop} onComplete={handleMemoryComplete} audioMode={settings.audioMode} speedSec={settings.speed} startDelayMs={0} />;
    return (
      <MemoryGame level={settings.level} onExit={stop} onComplete={handleMemoryComplete} audioMode={settings.audioMode} speedSec={settings.speed} startDelayMs={0} />
    );
  }

  if (screen === 'flow') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 320 }}>
        <style>{CSS}</style>
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
            🌌 FLOW 프로그램 실행 중
          </div>
          <button type="button" onClick={stop} style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
        <iframe
          src="/program/iiwarmup/flow?autoStart=1&memoryPreset=shortFlow5"
          title="SPOMOVE FLOW Program"
          style={{ width: '100%', height: '100%', border: 0 }}
          allow="autoplay"
        />
      </div>
    );
  }

  if (screen === 'challenge') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0c0a09', zIndex: 320 }}>
        <style>{CSS}</style>
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
            챌린지 프로그램 실행 중
          </div>
          <button type="button" onClick={stop} style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
        <iframe
          src="/program/iiwarmup/challenge?autoStart=1"
          title="SPOMOVE Challenge Program"
          style={{ width: '100%', height: '100%', border: 0 }}
          allow="autoplay"
        />
      </div>
    );
  }

  if (screen === 'training') {
    const bg = flashing ? '#ffffff' : (signal?.bg as string) ?? '#0F172A';
    const dark = !flashing && (bg === '#0F172A' || bg.startsWith('#0') || bg.startsWith('#1'));
    const currentRule = NUMBER_RULES.find((r) => r.id === settings.numberRule);
    const trainingDual21Touch =
      settings.mode === 'dual' && settings.level === 2 && settings.dual21Advance === 'touch';
    return (
      <div ref={trainingContainerRef} style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', transition: flashing ? 'none' : 'background 0.06s' }}>
        <style>{CSS}</style>
        {settings.mode === 'basic' && settings.level === 4 && currentRule && (
          <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', borderRadius: '2rem', padding: '0.5rem 1.2rem', color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(0.72rem,2vw,0.9rem)', fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.12)' }}>📋 규칙: {currentRule.label}</div>
        )}
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {settings.intervalMode ? <><span style={{ color: intervalPhase === 'work' ? '#FCA5A5' : '#86EFAC' }}>{intervalPhase === 'work' ? '🔥' : '😮‍💨'}</span><span>{intervalLeft}초</span><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{intervalSet}/{settings.intervalSets}세트</span></> : settings.timeMode === 'time' ? <><span style={{ color: '#FCA5A5' }}>⏱</span> {stats.timeLeft}초</> : <><span style={{ color: '#86EFAC' }}>🎯</span> {stats.repsLeft}회</>}
          </div>
          <button type="button" onClick={stop} style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
        {settings.intervalMode && intervalPhase === 'rest' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 25, gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>😮‍💨</div>
            <div style={{ fontWeight: 900, fontSize: '2rem', color: '#86EFAC' }}>휴식 {intervalLeft}초</div>
          </div>
        )}
        {trainingDual21Touch && countdown === null && (
          <div
            style={{
              position: 'absolute',
              bottom: '0.85rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 21,
              maxWidth: '90%',
              textAlign: 'center',
              fontSize: 'clamp(0.78rem, 2.2vw, 0.95rem)',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              textShadow: '0 1px 8px rgba(0,0,0,0.45)',
              pointerEvents: 'none',
            }}
          >
            화면을 터치하면 다음 신호로 넘어갑니다
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.1)', zIndex: 20 }}>
          <div style={{ height: '100%', width: `${stats.progress * 100}%`, background: dark ? '#F97316' : 'rgba(0,0,0,0.3)', transition: 'width 0.1s linear', borderRadius: '0 2px 2px 0' }} />
        </div>
        {countdown !== null && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, backdropFilter: 'blur(8px)' }}>
            <div key={countdown} className="countdown-pop" style={{ fontSize: 'clamp(120px,30vw,240px)', fontWeight: 900, color: '#F97316', lineHeight: 1 }}>{countdown}</div>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0 }}>
          {countdown !== null ? null : signal ? <SignalDisplay signal={signal} animKey={signalKey} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '2rem', fontWeight: 700 }}>준비하세요</div>}
          {countdown === null && trainingDual21Touch && (
            <div
              role="presentation"
              aria-hidden
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                e.preventDefault();
                advanceDual21Touch();
              }}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 12,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            />
          )}
        </div>
      </div>
    );
  }

  if (screen === 'result' && result) {
    const { count, cfg, dupStats } = result;
    const mo = MODES[cfg.mode];
    const isMem = cfg.mode === 'spatial' || cfg.mode === 'flow' || cfg.mode === 'challenge';
    const isDual21TouchCfg = cfg.mode === 'dual' && cfg.level === 2 && cfg.dual21Advance === 'touch';
    const totalSec = isMem
      ? MEMORY_ROUNDS * 5
      : isDual21TouchCfg
        ? 0
        : cfg.timeMode === 'time'
          ? (cfg.duration ?? 0)
          : (cfg.targetReps ?? 0) * (cfg.speed ?? 1);
    const spm = !isMem && !isDual21TouchCfg && totalSec > 0 ? Math.round((count / totalSec) * 60) : null;
    const mainVal = spm != null ? `${spm}` : `${count}`;
    const mainLabel = spm != null ? 'SPM' : '회';
    const mainColor = mo?.accent ?? '#F97316';
    const student = students.find((s) => s.id === selectedStudentId);
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, paddingTop: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{mo?.icon}</span>
                <span style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-muted)' }}>{mo?.title} · {cfg.mode === 'spatial' ? `${cfg.level}번` : cfg.mode === 'dual' ? (cfg.level === 1 ? '1번' : '2-1번') : cfg.mode === 'flow' || cfg.mode === 'challenge' ? `${cfg.level}프로그램` : `단계 ${cfg.level}`}</span>
              </div>
              {student && <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><div style={{ width: 20, height: 20, borderRadius: '50%', background: student.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, color: '#fff' }}>{student.name[0]}</div><span style={{ fontSize: '0.96rem', fontWeight: 700, color: student.color }}>{student.name}</span></div>}
            </div>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: 'clamp(5rem,20vw,7rem)', fontWeight: 900, lineHeight: 1, color: mainColor, letterSpacing: '-0.03em' }}>{mainVal}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{mainLabel}</div>
            </div>
            {cfg.mode === 'basic' && dupStats && (
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '1rem',
                  padding: '0.65rem 0.9rem',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                전환 중복{' '}
                {dupStats.tripleViolation ? (
                  <span style={{ color: '#94A3B8' }}>0%</span>
                ) : (
                  <span style={{ color: '#64748B' }}>{Math.round(dupStats.dupRatio * 100)}%</span>
                )}
                <span style={{ opacity: 0.45, margin: '0 0.35rem' }}>·</span>
                최대 연속 동일{' '}
                <span style={{ color: '#64748B' }}>{dupStats.displayMaxConsecutive}회</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" style={{ ...S.btn, ...S.bSecondary, flex: 1 }} onClick={() => setScreen('home')}>🏠 홈</button>
              <button type="button" style={{ ...S.btn, ...S.bPrimary, flex: 2 }} onClick={() => startSession(cfg)}>▶ 다시</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
