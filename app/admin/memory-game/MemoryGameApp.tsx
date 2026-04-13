'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { COLORS, MODES, MEMORY_ROUNDS, NUMBER_RULES } from './constants';
import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';
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
import { ChallengeSpomoveSetupPanel } from './components/ChallengeSpomoveSetupPanel';
import { TrainingGuideScreen } from './components/TrainingGuideScreen';
import { getSpomoveChallengeEmbed } from '@/app/lib/spomove/challengeEmbedStorage';
import { CSS, S } from './styles';
import type { DupStats } from './lib/signals';
import { preloadVariantFruitImages } from './lib/preloadVariantFruitImages';
import { variantFruitUrlsForPreload } from './lib/variantFruitAssets';
import { useSpomoveVariantSlidesForTraining } from './hooks/useSpomoveVariantFruitSlidesForTraining';
import {
  SPOMOVE_COLOR_THEME_LABELS,
  SPOMOVE_COLOR_THEME_ORDER,
  SPOMOVE_VARIANT_THEME_LS_KEY,
  parseStoredVariantTheme,
  type SpomoveColorThemeId,
} from './lib/spomoveVariantThemeConfig';
function modeLevelRangeLabel(modeId: string, levelCount: number): string {
  if (modeId === 'flow' || modeId === 'challenge') return '1번';
  return levelCount <= 1 ? '1번' : `1~${levelCount}번`;
}

function resultLevelLabel(mode: string | undefined, level: number): string {
  if (mode === 'dual') return level === 1 ? '1번' : '2-1번';
  return `${level}번`;
}

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
  /** 반응 인지 3·4·5번 변형 색지각 이미지 테마 (Asset Hub 1번 섹션과 localStorage 동기화) */
  variantColorTheme: SpomoveColorThemeId;
};

const defaultSettings: Settings = {
  mode: 'basic',
  level: 1,
  speed: 4.0,
  timeMode: 'time',
  duration: 60,
  targetReps: 20,
  // 신호별 음성/비프 미사용(기본 off). 배경음은 Asset Hub 「BGM」풀에서 무작위(플로우·챌린지 iframe 제외).
  audioMode: 'off',
  numberRule: 'odd_left',
  intervalMode: false,
  intervalWork: 30,
  intervalRest: 15,
  intervalSets: 4,
  warmup: 3,
  accel: false,
  dual21Advance: 'default',
  variantColorTheme: 'fruit',
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
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = parseStoredVariantTheme(localStorage.getItem(SPOMOVE_VARIANT_THEME_LS_KEY));
    setSettings((s) => ({ ...s, variantColorTheme: t }));
  }, []);
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
  const [dupFlashVisible, setDupFlashVisible] = useState(false);
  const [dupFlashNonce, setDupFlashNonce] = useState(0);
  const dupFlashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const { list: spomoveBgmList, loading: spomoveBgmLoading } = useSpomoveTrainingBGM();
  const pendingBgmStartRef = useRef<null | { mode: string }>(null);

  const challengeIframeSrc = useMemo(() => {
    const t = getSpomoveChallengeEmbed()?.templateId?.trim();
    return t
      ? `/program/iiwarmup/challenge?autoStart=1&template=${encodeURIComponent(t)}`
      : '/program/iiwarmup/challenge?autoStart=1';
  }, [screen]);

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

  const { slides: variantFruitSlides } = useSpomoveVariantSlidesForTraining(settings.variantColorTheme);
  const variantFruitUrls = useMemo(() => variantFruitUrlsForPreload(variantFruitSlides), [variantFruitSlides]);

  /** SPOMOVE 진입 직후 과일 이미지 선로딩(설정·난이도 선택 전에도 캐시 채움) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    void preloadVariantFruitImages(variantFruitUrls);
  }, [variantFruitUrls]);

  /** 변형 색지각(basic 3·4·5번): 설정·워밍업·훈련 중 과일 이미지 프리로드 */
  const basicVariantLevel = useMemo(
    () => settings.mode === 'basic' && (settings.level === 3 || settings.level === 4 || settings.level === 5),
    [settings.mode, settings.level]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (screen !== 'setup') return;
    if (!basicVariantLevel) return;
    void preloadVariantFruitImages(variantFruitUrls);
  }, [screen, basicVariantLevel, variantFruitUrls]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (screen !== 'training') return;
    if (countdown === null) return;
    if (!basicVariantLevel) return;
    void preloadVariantFruitImages(variantFruitUrls);
  }, [screen, countdown, basicVariantLevel, variantFruitUrls]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isTraining || screen !== 'training') return;
    if (!basicVariantLevel) return;
    void preloadVariantFruitImages(variantFruitUrls);
  }, [isTraining, screen, basicVariantLevel, variantFruitUrls]);

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
    setSettings((s) => {
      const next = { ...s, [key]: value } as Settings;
      if (key === 'variantColorTheme' && typeof window !== 'undefined' && typeof value === 'string') {
        localStorage.setItem(SPOMOVE_VARIANT_THEME_LS_KEY, value);
      }
      return next;
    });
  }, []);

  const onSignal = useCallback((sig: Record<string, unknown>) => {
    countRef.current++;
    setDisplayCount(countRef.current);
    const dupKey =
      sig.type === 'think_quad'
        ? String((sig.content as { colorId?: string })?.colorId ?? '')
        : String(sig.bg ?? '');
    const dupFlashColorBg =
      sig.type === 'full_color' ||
      sig.type === 'gonogo_color' ||
      sig.type === 'think_quad' ||
      (sig.type === 'task_switch' && (sig.content as { stimulusKind?: string })?.stimulusKind === 'color');
    if (dupFlashColorBg && dupKey === prevBgRef.current) {
      setDupFlashNonce((n) => n + 1);
      setDupFlashVisible(true);
      if (dupFlashClearRef.current != null) clearTimeout(dupFlashClearRef.current);
      dupFlashClearRef.current = setTimeout(() => {
        dupFlashClearRef.current = null;
        setDupFlashVisible(false);
      }, 360);
    }
    prevBgRef.current = dupKey || null;
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
    if (cfg.audioMode !== 'off') setTimeout(() => tts('트레이닝 완료! 수고했어요!', true), 300);
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
    fruitSlides: variantFruitSlides,
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
    fruitSlides: variantFruitSlides,
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
      if (dupFlashClearRef.current != null) {
        clearTimeout(dupFlashClearRef.current);
        dupFlashClearRef.current = null;
      }
      setDupFlashVisible(false);
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
      // - 그 외 SPOMOVE 훈련: Asset Hub 「BGM」풀(spomove_training_bgm_settings) 목록 중 무작위
      const bgmMode = cfg.mode;
      const shouldTryBgmParent =
        bgmMode === 'basic' ||
        bgmMode === 'spatial' ||
        bgmMode === 'dual' ||
        bgmMode === 'stroop' ||
        bgmMode === 'simon' ||
        bgmMode === 'flanker' ||
        bgmMode === 'gonogo' ||
        bgmMode === 'taskswitch';
      if (shouldTryBgmParent) {
        if (spomoveBgmList.length === 0) {
          if (spomoveBgmLoading) pendingBgmStartRef.current = { mode: bgmMode };
        } else {
          const pick = spomoveBgmList[Math.floor(Math.random() * spomoveBgmList.length)]!;
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
    [settings, spomoveBgmList, spomoveBgmLoading]
  );

  useEffect(() => {
    const pending = pendingBgmStartRef.current;
    if (!pending?.mode) return;
    if (spomoveBgmLoading) return;
    pendingBgmStartRef.current = null;
    if (spomoveBgmList.length === 0) return;
    if (!(screen === 'training' || screen === 'memory' || screen === 'flow' || screen === 'challenge')) return;

    const mode = pending.mode;
    if (mode === 'flow' || mode === 'challenge') return;
    const pick = spomoveBgmList[Math.floor(Math.random() * spomoveBgmList.length)]!;
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
  }, [spomoveBgmLoading, spomoveBgmList, screen]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (document.fullscreenElement) document.exitFullscreen();
    setIsTraining(false);
    if (dupFlashClearRef.current != null) {
      clearTimeout(dupFlashClearRef.current);
      dupFlashClearRef.current = null;
    }
    setDupFlashVisible(false);
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
              <span>오프라인 상태입니다 — 저장된 데이터로 트레이닝은 계속 가능합니다</span>
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
            <p style={{ fontSize: 'clamp(0.92rem,2.2vw,1.05rem)', color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, fontWeight: 400 }}>신체 활동과 인지 트레이닝을 통합한<br />교육 기반 퍼포먼스 도구 — SPOMOVE 트레이닝</p>
            <div className="home-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {Object.values(MODES).map((m) => {
                const rgbMap: Record<string, string> = {
                  '#3B82F6': '59,130,246',
                  '#A855F7': '168,85,247',
                  '#22C55E': '34,197,94',
                  '#F97316': '249,115,22',
                  '#EC4899': '236,72,153',
                  '#06B6D4': '6,182,212',
                  '#14B8A6': '20,184,166',
                  '#6366F1': '99,102,241',
                };
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
                    <div style={{ fontSize: 'clamp(0.55rem,1.3vw,0.62rem)', color: 'rgba(255,255,255,0.2)', marginTop: '0.2rem', fontWeight: 600 }}>{modeLevelRangeLabel(m.id, m.levels.length)}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="home-fadein-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <button type="button" onClick={() => setScreen('guide')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.85rem', padding: 'clamp(0.7rem,2vw,0.9rem)', fontSize: 'clamp(0.78rem,2vw,0.86rem)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📖 상세 가이드</button>
            </div>
            <div className="home-fadein-3" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'clamp(0.62rem,1.6vw,0.7rem)', color: 'rgba(255,255,255,0.18)', fontWeight: 500, lineHeight: 1.6 }}>연세대학교 체육교육 전문가가 설계한<br />신체·인지 통합 SPOMOVE 트레이닝</p>
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

  if (screen === 'guide') return <TrainingGuideScreen onBack={() => setScreen('home')} />;

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
    const stepBasicRule = isDual21 ? 6 : 7;
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, maxWidth: '34rem' }}>
            <button type="button" style={S.back} onClick={() => setScreen('home')}>← 처음으로</button>
            <h2 style={S.ctitle}>트레이닝 설정</h2>
            <p style={S.csub}>아래 항목을 순서대로 설정하고 시작하세요.</p>
            <div style={S.sec}>
              {stepNum(1, '어떤 트레이닝을 할까요?')}
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
                    <div style={{ ...(M.id === 'dual' ? { minWidth: 52, width: 'auto', padding: '0 0.35rem' } : { minWidth: 40, width: 40 }), height: 26, borderRadius: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.82rem', color: settings.level === lv.id ? '#fff' : 'var(--text)', background: settings.level === lv.id ? M.accent : 'var(--subtle-bg)', border: settings.level === lv.id ? `1px solid ${M.accent}` : `1px solid var(--border)`, flexShrink: 0, marginTop: '0.05rem' }}>{lv.name}</div>
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
              {settings.mode === 'basic' && [3, 4, 5].includes(settings.level) && (
                <div style={{ marginTop: '1.15rem', paddingTop: '1.15rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.35rem' }}>변형 색지각 이미지 테마</div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '0.65rem', lineHeight: 1.55 }}>
                    Asset Hub 색지각 <strong style={{ color: 'var(--text)' }}>1. 테마</strong> 섹션과 동일하게 저장됩니다. 고른 테마의 슬롯 이미지가 3·4·5번 신호에 나옵니다.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {SPOMOVE_COLOR_THEME_ORDER.map((tid) => (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => set('variantColorTheme', tid)}
                        style={{
                          padding: '0.55rem 0.95rem',
                          borderRadius: '0.75rem',
                          border: `2px solid ${settings.variantColorTheme === tid ? M.accent : 'var(--border)'}`,
                          background: settings.variantColorTheme === tid ? `${M.accent}12` : 'var(--card)',
                          color: settings.variantColorTheme === tid ? M.accent : 'var(--text)',
                          fontWeight: settings.variantColorTheme === tid ? 800 : 600,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {settings.variantColorTheme === tid ? '✓ ' : ''}
                        {SPOMOVE_COLOR_THEME_LABELS[tid]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {settings.mode === 'challenge' && <ChallengeSpomoveSetupPanel />}
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
                {settings.mode === 'basic' && settings.level === 7 && (
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
              <button type="button" style={{ ...S.btn, ...S.bPrimary, flex: 3, fontSize: '1.05rem', padding: '1.1rem' }} onClick={() => startSession()}>트레이닝 시작 →</button>
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
          key={challengeIframeSrc}
          src={challengeIframeSrc}
          title="SPOMOVE Challenge Program"
          style={{ width: '100%', height: '100%', border: 0 }}
          allow="autoplay"
        />
      </div>
    );
  }

  if (screen === 'training') {
    const bg = (signal?.bg as string) ?? '#0F172A';
    const dark = bg === '#0F172A' || bg.startsWith('#0') || bg.startsWith('#1');
    const currentRule = NUMBER_RULES.find((r) => r.id === settings.numberRule);
    const trainingDual21Touch =
      settings.mode === 'dual' && settings.level === 2 && settings.dual21Advance === 'touch';
    return (
      <div ref={trainingContainerRef} style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', transition: 'background 0.06s' }}>
        <style>{CSS}</style>
        {settings.mode === 'gonogo' && (
          <div
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              maxWidth: 'min(94vw, 36rem)',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)',
              borderRadius: '2rem',
              padding: '0.5rem 1.2rem',
              color: 'rgba(255,255,255,0.88)',
              fontSize: 'clamp(0.7rem, 2vw, 0.88rem)',
              fontWeight: 600,
              lineHeight: 1.45,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {settings.level === 1 && '📋 빨강·파랑·노랑 → 이동(Go) · 초록 → 멈춤(No-Go)'}
            {settings.level === 2 && '📋 동그라미 → 이동(Go) · 세모 → 멈춤(No-Go)'}
            {settings.level === 3 && '📋 화살표 → 이동 · ✕ → 멈춤'}
            {settings.level === 4 && '📋 빨강 동그라미 → 이동(Go) · 빨강 세모 → 멈춤(No-Go)'}
          </div>
        )}
        {settings.mode === 'taskswitch' && (
          <div
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              maxWidth: 'min(94vw, 38rem)',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)',
              borderRadius: '2rem',
              padding: '0.5rem 1.2rem',
              color: 'rgba(255,255,255,0.88)',
              fontSize: 'clamp(0.68rem, 1.9vw, 0.85rem)',
              fontWeight: 600,
              lineHeight: 1.45,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {settings.level === 1 &&
              '📋 색=보이는 색 콘 · 위치=화살표 방향 콘 · 반대로=색은 짝반대·화살표는 반대 방향'}
            {settings.level === 2 && '📋 🎨색 · 📍위치 · ⇄반대(색/화살표는 화면 자극과 동일)'}
            {settings.level === 3 &&
              '📋 흰 실선=색 규칙 · 흰 점선=위치 규칙 · 흰 이중선=반대로(자극은 색 또는 화살표)'}
          </div>
        )}
        {settings.mode === 'basic' && settings.level === 7 && currentRule && (
          <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', borderRadius: '2rem', padding: '0.5rem 1.2rem', color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(0.72rem,2vw,0.9rem)', fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.12)' }}>📋 규칙: {currentRule.label}</div>
        )}
        {settings.mode === 'basic' && [3, 4, 5].includes(settings.level) && (
          <div
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.45rem',
              maxWidth: 'min(92vw, 28rem)',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(10px)',
                borderRadius: '2rem',
                padding: '0.45rem 1rem',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'clamp(0.72rem,2vw,0.9rem)',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              🎨 테마: {SPOMOVE_COLOR_THEME_LABELS[settings.variantColorTheme]}
            </div>
            {settings.level === 5 && (
              <div
                style={{
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '2rem',
                  padding: '0.5rem 1.2rem',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 'clamp(0.72rem,2vw,0.9rem)',
                  fontWeight: 600,
                  lineHeight: 1.45,
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                두 색 콘을 동시에 한 발씩 밟으세요
              </div>
            )}
          </div>
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
          {dupFlashVisible && countdown === null ? (
            <div
              key={dupFlashNonce}
              className="training-dup-salience-overlay"
              aria-hidden
              style={{ position: 'absolute', inset: 0, zIndex: 16, pointerEvents: 'none' }}
            />
          ) : null}
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
    const mainLabel = spm != null ? '분당 신호 수(추정)' : '처리한 신호 횟수';
    const mainHint = spm != null
      ? '설정한 시간·속도를 기준으로, 1분이면 약 이 정도로 많은 신호를 보신 셈이에요.'
      : '이번 세션에서 화면에 나온 신호를 모두 세어요.';
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
                <span style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-muted)' }}>{mo?.title} · {resultLevelLabel(cfg.mode, cfg.level)}</span>
              </div>
              {student && <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><div style={{ width: 20, height: 20, borderRadius: '50%', background: student.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, color: '#fff' }}>{student.name[0]}</div><span style={{ fontSize: '0.96rem', fontWeight: 700, color: student.color }}>{student.name}</span></div>}
            </div>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: 'clamp(5rem,20vw,7rem)', fontWeight: 900, lineHeight: 1, color: mainColor, letterSpacing: '-0.03em' }}>{mainVal}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.35rem' }}>{mainLabel}</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.45rem', lineHeight: 1.55, maxWidth: '22rem', marginLeft: 'auto', marginRight: 'auto' }}>{mainHint}</div>
            </div>
            {cfg.mode === 'basic' && dupStats && (
              <div
                style={{
                  textAlign: 'left',
                  marginBottom: '1rem',
                  padding: '0.85rem 1rem',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#475569',
                  lineHeight: 1.65,
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', marginBottom: '0.5rem' }}>이번 세션 해석</div>
                <p style={{ margin: '0 0 0.55rem' }}>
                  <strong style={{ color: '#334155' }}>신호가 얼마나 바뀌었나요?</strong>{' '}
                  바로 이어서 똑같은 신호(같은 색·같은 그림 등)가 나온 비율이{' '}
                  <strong style={{ color: '#1E293B' }}>{Math.round(dupStats.dupRatio * 100)}%</strong>
                  이에요. 숫자가 낮을수록 매번 다른 과제를 보는 쪽에 가깝습니다.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#334155' }}>같은 신호를 연달아 본 적은?</strong>{' '}
                  {dupStats.maxConsecutiveSame >= 3 ? (
                    <>
                      최대 <strong style={{ color: '#B45309' }}>{dupStats.maxConsecutiveSame}번</strong>까지 이어졌어요. 속도를 조금 낮추거나 휴식을 넣으면 집중하기 더 수월해요.
                    </>
                  ) : (
                    <>
                      최대 <strong style={{ color: '#1E293B' }}>{dupStats.maxConsecutiveSame}번</strong>까지 이어졌어요. 2번 이내면 설계 목표에 가깝습니다.
                    </>
                  )}
                </p>
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
