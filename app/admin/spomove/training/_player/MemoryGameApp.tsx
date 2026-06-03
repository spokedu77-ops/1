'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { COLORS, isSpomoveCatalogTbdMode, MODES, normalizeLegacyTrainingMode, resolveTrainingEngine, SPOMOVE_CATALOG_SLOT_IDS, MEMORY_ROUNDS } from './constants';
import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { BgmPlayer } from '@/app/lib/admin/audio/bgmPlayer';
import { useStudents } from './hooks/useStudents';
import { useIntervalTimer } from './hooks/useIntervalTimer';
import { useTrainingTimer } from './hooks/useTrainingTimer';
import { tts } from './lib/tts';
import { StudentModal } from './components/StudentModal';
import { StudentManageScreen } from './components/StudentManageScreen';
import { Sparkline } from './components/Sparkline';
import { SpeedSelector } from './components/SpeedSelector';
import { SignalDisplay } from './components/SignalDisplay';
import { MemoryGame } from './components/MemoryGame';
import { MemoryGameLevel4 } from './components/MemoryGameLevel4';
import { MemoryGameLevel5 } from './components/MemoryGameLevel5';
import { VisualReactionTraining, type ReactTrainCompleteStats } from './components/VisualReactionTraining';
import { DiagonalReactionTraining } from './components/DiagonalReactionTraining';
import { DeepReactionTraining } from './components/DeepReactionTraining';
import { PulseReactionTraining } from './components/PulseReactionTraining';
import { BlackoutReactionTraining } from './components/BlackoutReactionTraining';
import { SweepReactionTraining } from './components/SweepReactionTraining';
import { RushReactionTraining } from './components/RushReactionTraining';
import { RobloxMoleReactionTraining } from './components/RobloxMoleReactionTraining';
import { mapSpomoveSpeedToReactTrainSpd } from './lib/mapReactTrainSpeed';
import { TrainingGuideScreen } from './components/TrainingGuideScreen';
import { CSS, S } from './styles';
import FlowGameClient from './flow/FlowGameClient';
import { buildStages } from './flow/engine/modules/stageBuilder';
import { SELECTABLE_MODULE_KEYS } from './flow/engine/modules/flowModules';
import type { FlowStats } from './flow/engine/FlowEngine';
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
  if (modeId === 'flow') return '1번';
  return levelCount <= 1 ? '1번' : `1~${levelCount}번`;
}

function resultLevelLabel(mode: string | undefined, level: number): string {
  return `${level}번`;
}

type Screen =
  | 'home'
  | 'setup'
  | 'guide'
  | 'students'
  | 'training'
  | 'memory'
  | 'visualReaction'
  | 'flow'
  | 'result';

type FlowFeatureKey = 'faster' | 'punch' | 'duck' | 'reach' | 'rock';

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
  kidsSafeMode: boolean;
  /** 반응 인지 2·3·4·5번 변형 색지각 이미지 테마 (Asset Hub 1번 섹션과 localStorage 동기화) */
  variantColorTheme: SpomoveColorThemeId;
  /** basic 3번 + 색상 테마: 전면 색상 위 숫자 오버레이 범위 */
  basicNumberOverlay: 'none' | '2' | '3';
  /** 플로우 추가 동작 기능 플래그 */
  flowFeatures: Set<FlowFeatureKey>;
  /** 플로우 배경 색상 테마 */
  flowColorTheme: 'default' | 'space' | 'neon' | 'ocean';
  /** 플로우 스테이지당 시간(초) */
  flowDuration: number;
  /** 플로우 배경 이미지 URL */
  flowBgImageUrl: string;
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
  kidsSafeMode: false,
  variantColorTheme: 'color',
  basicNumberOverlay: 'none',
  flowFeatures: new Set<FlowFeatureKey>(),
  flowColorTheme: 'default',
  flowDuration: 25,
  flowBgImageUrl: '',
};

export type MemoryGameAutoLaunch = {
  speed?: number;
  timeMode?: 'time' | 'reps';
  duration?: number;
  targetReps?: number;
  warmup?: number;
  accel?: boolean;
  intervalMode?: boolean;
  /** 시지각 반응 전체 속도/스폰 간격 완화 */
  kidsSafeMode?: boolean;
  /** 반응 인지 7번만 */
  numberRule?: string;
  /** 반응 인지 2·3·4·5번만 */
  variantColorTheme?: SpomoveColorThemeId;
  /** basic 3번 + 색상 테마: 숫자 오버레이 범위 */
  basicNumberOverlay?: 'none' | '2' | '3';
  /** Flow 2.0: 선택된 추가 동작 키 배열 → 내부에서 Set<FlowFeatureKey>로 변환 */
  flowFeatures?: string[];
  /** Flow 2.0: 배경 색상 테마 */
  flowColorTheme?: 'default' | 'space' | 'neon' | 'ocean';
  /** Flow 2.0: 스테이지당 시간(초) */
  flowDuration?: number;
  /** Flow 2.0: 배경 이미지 URL */
  flowBgImageUrl?: string;
};

/** Training 포털 복귀 시 설정 화면에 되돌릴 실행 세션 정보 */
export type TrainingExitResume = {
  levelId: number;
  launch: MemoryGameAutoLaunch;
};

export function settingsToExitResume(s: Settings): TrainingExitResume {
  return {
    levelId: s.level,
    launch: {
      speed: s.speed,
      timeMode: s.timeMode as 'time' | 'reps',
      duration: s.duration,
      targetReps: s.targetReps,
      warmup: s.warmup,
      accel: s.accel,
      intervalMode: s.intervalMode,
      kidsSafeMode: s.kidsSafeMode,
      numberRule: s.numberRule,
      variantColorTheme: s.variantColorTheme,
      flowFeatures: [...s.flowFeatures],
      flowColorTheme: s.flowColorTheme,
      flowDuration: s.flowDuration,
    },
  };
}

export default function MemoryGameApp({
  initialMode,
  initialLevel,
  autoLaunch,
  embed = false,
  onExit,
  onUnavailable,
}: {
  initialMode?: string;
  initialLevel?: number;
  /** SPOKEDU MASTER iframe 등 외부 화면에 삽입될 때 admin용 홈/뒤로 진입을 줄인다. */
  embed?: boolean;
  /** 제공 시 설정 화면을 건너뛰고 이 설정으로 훈련을 즉시 시작 */
  autoLaunch?: MemoryGameAutoLaunch;
  /** autoLaunch 모드에서 포털을 닫을 때 — resume에 실제 실행 세션 설정을 전달 */
  onExit?: (resume?: TrainingExitResume) => void;
  /** initialMode가 MODES에 없을 때 (매핑 누락) 부모에 알림 */
  onUnavailable?: () => void;
}) {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [pendingAutoStart, setPendingAutoStart] = useState(false);
  const autoLaunchCfgRef = useRef<Settings | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // autoLaunch(Training 포털)로 테마가 전달되면, 그 값을 우선 적용하고 localStorage에도 동기화한다.
    // 그렇지 않으면 저장된 테마(localStorage)를 불러와 기본값을 맞춘다.
    const fromAuto = autoLaunch?.variantColorTheme;
    if (typeof fromAuto === 'string' && fromAuto.trim()) {
      try {
        localStorage.setItem(SPOMOVE_VARIANT_THEME_LS_KEY, fromAuto);
      } catch {
        /* ignore */
      }
      setSettings((s) => ({ ...s, variantColorTheme: fromAuto }));
      return;
    }
    const t = parseStoredVariantTheme(localStorage.getItem(SPOMOVE_VARIANT_THEME_LS_KEY));
    setSettings((s) => ({ ...s, variantColorTheme: t }));
  }, [autoLaunch?.variantColorTheme]);
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
  const visualReactionContainerRef = useRef<HTMLDivElement>(null);
  const flowCompleteGuardRef = useRef(false);
  const flowBgmPathRef = useRef<string | undefined>(undefined);
  const flowEngineApiRef = useRef<{ loadBgmLate: (path: string) => Promise<void> } | null>(null);

  // ── Flow 즐겨찾기 ────────────────────────────────────────────────────────
  const FLOW_PRESETS_KEY = 'spomove_flow_presets';
  interface FlowPreset { id: string; name: string; features: string[]; colorTheme: string; duration: number; }
  const [flowPresets, setFlowPresets] = useState<FlowPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(FLOW_PRESETS_KEY) || '[]') as FlowPreset[]; } catch { return []; }
  });
  const saveFlowPreset = () => {
    const name = prompt('즐겨찾기 이름을 입력하세요', `세팅 ${flowPresets.length + 1}`);
    if (!name) return;
    const next = [...flowPresets, { id: Date.now().toString(), name, features: [...settings.flowFeatures], colorTheme: settings.flowColorTheme, duration: settings.flowDuration }];
    setFlowPresets(next);
    localStorage.setItem(FLOW_PRESETS_KEY, JSON.stringify(next));
  };
  const loadFlowPreset = (p: FlowPreset) => {
    setSettings((s) => ({ ...s, flowFeatures: new Set(p.features as FlowFeatureKey[]), flowColorTheme: p.colorTheme as Settings['flowColorTheme'], flowDuration: p.duration }));
  };
  const deleteFlowPreset = (id: string) => {
    const next = flowPresets.filter((p) => p.id !== id);
    setFlowPresets(next);
    localStorage.setItem(FLOW_PRESETS_KEY, JSON.stringify(next));
  };
  const bgmPlayerRef = useRef<BgmPlayer | null>(null);
  /** startSession 진입 후에만 onExit 허용 — 초기 home·카운트다운 대기 home에서 오동작 방지 */
  const sessionLaunchedRef = useRef(false);

  const { list: spomoveBgmList, loading: spomoveBgmLoading } = useSpomoveTrainingBGM();
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

  const { slides: variantFruitSlides } = useSpomoveVariantSlidesForTraining(settings.variantColorTheme);
  const variantFruitUrls = useMemo(() => variantFruitUrlsForPreload(variantFruitSlides), [variantFruitSlides]);
  const variantSignalSlides = settings.variantColorTheme === 'color' ? undefined : variantFruitSlides;

  /** SPOMOVE 진입 직후 과일 이미지 선로딩(설정·난이도 선택 전에도 캐시 채움) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    void preloadVariantFruitImages(variantFruitUrls);
  }, [variantFruitUrls]);

  /** 변형 색지각(basic 2·3·4·5번): 설정·워밍업·훈련 중 이미지 프리로드 */
  const basicVariantLevel = useMemo(
    () => settings.mode === 'basic' && (settings.level === 3 || settings.level === 4 || settings.level === 5 || settings.level === 6),
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

  /** initialMode가 MODES에 없으면 부모에게 즉시 알려 빈 화면을 피한다 */
  useEffect(() => {
    if (!initialMode) return;
    const normalized = normalizeLegacyTrainingMode(initialMode, typeof initialLevel === 'number' ? initialLevel : 1);
    if (normalized.mode in MODES) return;
    onUnavailable?.();
  }, [initialMode, initialLevel, onUnavailable]);

  /** autoLaunch 모드에서 세션이 한 번 시작된 뒤 home/result로 복귀하면 부모에게 닫힘 신호 */
  useEffect(() => {
    if (!autoLaunch) return;
    if (screen === 'home') {
      if (!sessionLaunchedRef.current) return;
      if (countdown !== null) return;
      onExit?.();
    }
  }, [autoLaunch, screen, onExit, countdown]);

  useEffect(() => {
    if (!initialMode) return;
    const normalized = normalizeLegacyTrainingMode(initialMode, typeof initialLevel === 'number' ? initialLevel : 1);
    if (!(normalized.mode in MODES)) return;
    const modeDef = MODES[normalized.mode];
    if (!modeDef) return;
    const targetLevel =
      typeof normalized.level === 'number' && modeDef.levels.some((lv) => lv.id === normalized.level)
        ? normalized.level
        : modeDef.levels[0]?.id ?? 1;

    if (autoLaunch) {
      const { flowFeatures: flowFeaturesArr, flowColorTheme: fcTheme, ...restAutoLaunch } = autoLaunch;
      const merged: Settings = {
        ...defaultSettings,
        mode: normalized.mode,
        level: targetLevel,
        ...restAutoLaunch,
        /** Training 임베드: 항상 3초 카운트다운 후 시작 (전달값 0이어도 무시) */
        warmup: 3,
        flowFeatures: flowFeaturesArr?.length
          ? new Set(flowFeaturesArr as FlowFeatureKey[])
          : defaultSettings.flowFeatures,
        flowColorTheme: fcTheme ?? 'default',
      };
      autoLaunchCfgRef.current = merged;
      setSettings(merged);
      // setScreen('setup') 호출 생략 — home 화면도 렌더하지 않도록 early-return이 처리
      setPendingAutoStart(true);
    } else {
      setSettings((s) => ({ ...s, mode: normalized.mode, level: targetLevel }));
      setScreen('setup');
    }
  }, [initialMode, initialLevel, autoLaunch]);

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

  const { engineMode, engineLevel } = useMemo(
    () => resolveTrainingEngine(settings.mode, settings.level),
    [settings.mode, settings.level],
  );

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
    active: isTraining && !settings.intervalMode,
    speed: settings.speed,
    accel: settings.accel ?? false,
    timeMode: settings.timeMode,
    duration: settings.duration,
    targetReps: settings.targetReps,
    mode: settings.mode,
    level: settings.level,
    audioMode: settings.audioMode,
    colors: COLORS,
    fruitSlides: variantSignalSlides,
    basicNumberOverlay: settings.basicNumberOverlay,
    onSignal,
    onFinish,
  });

  const { intervalPhase, intervalSet, intervalLeft } = useIntervalTimer({
    active: isTraining && !!settings.intervalMode,
    workSec: settings.intervalWork,
    restSec: settings.intervalRest,
    sets: settings.intervalSets,
    speed: settings.speed,
    mode: settings.mode,
    level: settings.level,
    audioMode: settings.audioMode,
    colors: COLORS,
    fruitSlides: variantSignalSlides,
    basicNumberOverlay: settings.basicNumberOverlay,
    onSignal,
    onFinish,
  });

  const rafStatsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isTraining) return;
    const tick = () =>
      setStats(
        getProgress()
      );
    const loop = () => {
      tick();
      rafStatsRef.current = requestAnimationFrame(loop);
    };
    rafStatsRef.current = requestAnimationFrame(loop);
    return () => { if (rafStatsRef.current != null) cancelAnimationFrame(rafStatsRef.current); };
  }, [isTraining, getProgress]);

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
    if (screen === 'training' || screen === 'memory' || screen === 'visualReaction' || screen === 'flow')
      return;
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

  useEffect(() => {
    if (screen !== 'visualReaction') return;
    const id = requestAnimationFrame(() => {
      visualReactionContainerRef.current?.requestFullscreen?.().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [screen]);

  const startSession = useCallback(
    (cfg: Settings = settings) => {
      sessionLaunchedRef.current = true;
      const resolved = resolveTrainingEngine(cfg.mode, cfg.level);
      // 분량 선택은 횟수만 노출/사용 → 시지각 반응(reactTrain) 제외하고 reps로 고정
      if (cfg.mode !== 'reactTrain' && cfg.timeMode !== 'reps') cfg = { ...cfg, timeMode: 'reps' };
      // 인터벌 세트는 4로 고정
      if (cfg.intervalSets !== 4) cfg = { ...cfg, intervalSets: 4 };
      // 신호별 음성·비프는 사용하지 않음(모든 모드 audioMode off)
      if (cfg.audioMode !== 'off') cfg = { ...cfg, audioMode: 'off' };
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
      // - flow: iframe 안에서 BGM 재생 — 부모 BgmPlayer로 재생하면 이중 재생됨
      // - 그 외 SPOMOVE 훈련: Asset Hub 「BGM」풀(spomove_training_bgm_settings) 목록 중 무작위
      const bgmMode = cfg.mode;
      const shouldTryBgmParent =
        bgmMode === 'basic' ||
        bgmMode === 'spatial' ||
        bgmMode === 'stroop' ||
        bgmMode === 'simon' ||
        bgmMode === 'flanker' ||
        bgmMode === 'executive' ||
        bgmMode === 'gonogo' ||
        bgmMode === 'taskswitch' ||
        bgmMode === 'reactTrain';
      if (shouldTryBgmParent) {
        if (spomoveBgmList.length === 0) {
          if (spomoveBgmLoading) pendingBgmStartRef.current = { mode: bgmMode };
        } else {
          const pick = spomoveBgmList[Math.floor(Math.random() * spomoveBgmList.length)]!;
          playBgm(pick);
        }
      }

      /** Training 임베드: 최소 3초 카운트다운 (flow 포함) */
      const warmupSec = Math.max(3, cfg.warmup ?? 0);

      if (cfg.mode === 'flow') {
        // FlowGameClient(Flow 2.0)가 자체 카운트다운과 스테이지 전환을 처리
        flowCompleteGuardRef.current = false;
        // BGM: 랜덤 픽 → FlowAudio가 내부에서 재생 (부모 BgmPlayer와 이중 재생 방지)
        flowBgmPathRef.current = spomoveBgmList.length > 0
          ? spomoveBgmList[Math.floor(Math.random() * spomoveBgmList.length)]!
          : undefined;
        setScreen('flow');
        setCountdown(null);
      } else {
        // spatial(순차기억)·시지각 반응도 warmup 카운트다운 적용
        const nextScreen: Screen =
          cfg.mode === 'spatial' ? 'memory' : cfg.mode === 'reactTrain' ? 'visualReaction' : 'training';
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

  /** autoLaunch: 마운트 직후 startSession을 ref-cfg로 즉시 호출 (setup 화면 경유 없음) */
  useEffect(() => {
    if (!pendingAutoStart) return;
    const cfg = autoLaunchCfgRef.current;
    if (!cfg) return;
    setPendingAutoStart(false);
    autoLaunchCfgRef.current = null;
    startSession(cfg);
  }, [pendingAutoStart, startSession]);

  useEffect(() => {
    const pending = pendingBgmStartRef.current;
    if (!pending?.mode) return;
    if (spomoveBgmLoading) return;
    pendingBgmStartRef.current = null;
    if (spomoveBgmList.length === 0) return;
    if (
      !(
        screen === 'training' ||
        screen === 'memory' ||
        screen === 'visualReaction' ||
        screen === 'flow'
      )
    )
      return;

    const mode = pending.mode;
    if (mode === 'flow') return;
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

  // Flow BGM 늦은 로딩 — 첫 시작 시 BGM 목록이 아직 없을 때 엔진에 주입
  useEffect(() => {
    if (screen !== 'flow') return;
    if (spomoveBgmLoading || spomoveBgmList.length === 0) return;
    if (flowBgmPathRef.current) return;
    const path = spomoveBgmList[Math.floor(Math.random() * spomoveBgmList.length)]!;
    flowBgmPathRef.current = path;
    void flowEngineApiRef.current?.loadBgmLate(path);
  }, [screen, spomoveBgmLoading, spomoveBgmList]);

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
    setCountdown(null);
    setPendingAutoStart(false);
    autoLaunchCfgRef.current = null;
    bgmPlayerRef.current?.fadeOut(220);
    flowEngineApiRef.current = null;
    flowBgmPathRef.current = undefined;
    if (autoLaunch) {
      // training 포털(autoLaunch): 내부 setup이 아니라 포털 바깥 트레이닝 설정 화면으로 복귀
      onExit?.(settingsToExitResume(settings));
      return;
    }
    // 일반 admin/memory-game: 현재 설정을 유지한 내부 setup으로 복귀
    setScreen('setup');
  }, [autoLaunch, onExit, settings]);

  const handleFlowComplete = useCallback(() => {
    if (flowCompleteGuardRef.current) return;
    flowCompleteGuardRef.current = true;
    if (document.fullscreenElement) document.exitFullscreen();
    const cfg = { ...settings, mode: 'flow', level: 1 };
    const completedStages = 5;
    setResult({ count: completedStages, cfg });
    setScreen('result');
  }, [settings, selectedStudentId]);

  const handleReactTrainComplete = useCallback(
    (stats: ReactTrainCompleteStats) => {
      if (document.fullscreenElement) document.exitFullscreen();
      setResult({ count: stats.stims, cfg: { ...settings } });
      setScreen('result');
    },
    [settings]
  );

  useEffect(() => {
    if (screen !== 'flow') return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const messageType = (event.data as { type?: string } | null)?.type;
      if (messageType === 'flow-ending' || messageType === 'flow-ended') handleFlowComplete();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [screen, handleFlowComplete]);

  /** Training 포털의 ✕ 종료처럼 부모가 곧바로 언마운트할 때 — fadeOut 전에 끊기면 BGM이 남는 문제 방지 */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (dupFlashClearRef.current != null) {
        clearTimeout(dupFlashClearRef.current);
        dupFlashClearRef.current = null;
      }
      try {
        bgmPlayerRef.current?.stop();
      } catch {
        /* ignore */
      }
      bgmPlayerRef.current = null;
    };
  }, []);

  const M = MODES[settings.mode];
  if (!M) return null;

  // autoLaunch 모드: home/setup/result 화면을 렌더하지 않고 검정 대기 화면만 표시
  // (pendingAutoStart → startSession이 실행되면 바로 훈련 화면으로 전환됨)
  // result 진입 시에는 위의 onExit effect가 부모에게 닫힘을 알려 포털이 곧 언마운트된다.
  if (autoLaunch && pendingAutoStart && (screen === 'home' || screen === 'setup' || screen === 'result')) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#020617',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden={countdown == null}
      >
        <style>{CSS}</style>
        {countdown !== null ? (
          <div key={countdown} className="countdown-pop" style={{ fontSize: 'clamp(120px,30vw,240px)', fontWeight: 900, color: '#F97316', lineHeight: 1 }}>
            {countdown}
          </div>
        ) : null}
      </div>
    );
  }

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
              {SPOMOVE_CATALOG_SLOT_IDS.filter((id) => !isSpomoveCatalogTbdMode(id)).map((id) => {
                const m = MODES[id];
                if (!m) return null;
                const rgbMap: Record<string, string> = {
                  '#3B82F6': '59,130,246',
                  '#A855F7': '168,85,247',
                  '#22C55E': '34,197,94',
                  '#F97316': '249,115,22',
                  '#E11D48': '225,29,72',
                  '#EC4899': '236,72,153',
                  '#06B6D4': '6,182,212',
                  '#6366F1': '99,102,241',
                };
                const rgb = rgbMap[m.accent] ?? '249,115,22';
                const active = settings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSettings((s) => ({
                        ...s,
                        mode: m.id,
                        level: 1,
                        ...(m.id === 'reactTrain' ? { timeMode: 'time' as const, duration: 60 } : {}),
                      }));
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
    const stepSpeed = 3;
    const stepReps = 4;
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, maxWidth: '34rem' }}>
            {!embed ? <button type="button" style={S.back} onClick={() => setScreen('home')}>← 처음으로</button> : null}
            <h2 style={S.ctitle}>트레이닝 설정</h2>
            <p style={S.csub}>아래 항목을 순서대로 설정하고 시작하세요.</p>
            <div style={S.sec}>
              {stepNum(1, '어떤 트레이닝을 할까요?')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                {SPOMOVE_CATALOG_SLOT_IDS.filter((id) => !isSpomoveCatalogTbdMode(id)).map((id) => {
                  const m = MODES[id];
                  if (!m) return null;
                  return (
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
                  );
                })}
              </div>
            </div>
            <div style={S.sec}>
              {stepNum(2, '난이도를 선택하세요')}
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '0.7rem', lineHeight: 1.55 }}>{M.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {M.levels.map((lv) => (
                  <button key={lv.id} type="button" onClick={() => set('level', lv.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.8rem 1rem', borderRadius: '1rem', border: `2px solid ${settings.level === lv.id ? M.accent : 'var(--border)'}`, background: settings.level === lv.id ? `${M.accent}08` : 'var(--card)', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'all 0.13s', textAlign: 'left' }}>
                    <div style={{ minWidth: 40, width: 40, height: 26, borderRadius: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.82rem', color: settings.level === lv.id ? '#fff' : 'var(--text)', background: settings.level === lv.id ? M.accent : 'var(--subtle-bg)', border: settings.level === lv.id ? `1px solid ${M.accent}` : `1px solid var(--border)`, flexShrink: 0, marginTop: '0.05rem' }}>{lv.id}번</div>
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
              {settings.mode === 'basic' && [2, 3, 4, 5].includes(settings.level) && (
                <div style={{ marginTop: '1.15rem', paddingTop: '1.15rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.35rem' }}>변형 색지각 이미지 테마</div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '0.65rem', lineHeight: 1.55 }}>
                    Asset Hub 색지각 <strong style={{ color: 'var(--text)' }}>1. 테마</strong> 섹션과 동일하게 저장됩니다. 고른 테마의 슬롯 이미지가 2·3·4·5번 신호에 반영됩니다.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {SPOMOVE_COLOR_THEME_ORDER
                      .slice()
                      .sort((a, b) =>
                        SPOMOVE_COLOR_THEME_LABELS[a].localeCompare(SPOMOVE_COLOR_THEME_LABELS[b], 'ko')
                      )
                      .map((tid) => (
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
            {settings.mode === 'flow' && (
              <>
                <div style={S.sec}>
                  {stepNum(3, '배경 테마')}
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {(
                      [
                        { key: 'default', label: '🌑 기본', desc: '순수 검정 배경, 노랑·초록·빨강 다리' },
                        { key: 'space',   label: '🔮 우주', desc: '딥 퍼플 배경, 보라·파랑·청록 다리' },
                        { key: 'neon',    label: '💚 네온', desc: '야간 초록 배경, 형광 청록·빨강·노랑 다리' },
                        { key: 'ocean',   label: '🌊 바다', desc: '딥 네이비 배경, 하늘색·청록·흰 다리' },
                      ] as { key: 'default' | 'space' | 'neon' | 'ocean'; label: string; desc: string }[]
                    ).map(({ key, label, desc }) => {
                      const active = settings.flowColorTheme === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSettings((s) => ({ ...s, flowColorTheme: key }))}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '0.65rem 0.5rem',
                            borderRadius: '0.9rem',
                            border: `2px solid ${active ? '#8B5CF6' : 'var(--border)'}`,
                            background: active ? 'rgba(139,92,246,0.12)' : 'var(--card)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            textAlign: 'center',
                          }}
                          title={desc}
                        >
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: active ? '#8B5CF6' : 'var(--text)', marginBottom: '0.1rem' }}>
                            {active ? '✓ ' : ''}{label}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={S.sec}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem' }}>
                    배경 이미지 URL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(선택)</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    JPG / PNG 직접 URL. 비우면 기본 테마 사용.
                  </p>
                  <input
                    type="text"
                    placeholder="https://... 또는 /images/bg.jpg"
                    value={settings.flowBgImageUrl}
                    onChange={(e) => setSettings((s) => ({ ...s, flowBgImageUrl: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.7rem',
                      border: '1.5px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--text)',
                      fontSize: '0.82rem',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div style={S.sec}>
                  {stepNum(4, '추가 동작 선택')}
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.55 }}>
                    선택한 동작이 게임 중 추가됩니다. 복수 선택 가능합니다.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {(
                      [
                        { key: 'faster',   icon: '⚡', label: '속도 증가 (FASTER)',    desc: '이전 스테이지보다 다리 이동 속도가 빨라집니다.' },
                        { key: 'punch',    icon: '👊', label: '박스 펀치 (PUNCH)',     desc: '다리 위에 박스가 등장합니다. 주먹으로 파괴하세요.' },
                        { key: 'duck',     icon: '🛸', label: 'UFO 숙이기 (DUCK)',     desc: '저공 UFO가 나타납니다. 빠르게 몸을 낮춰 피하세요.' },
                        { key: 'reach',    icon: '🧱', label: '펀치 벽 두드리기',        desc: '브릿지를 막는 벽이 등장합니다. 5번 연속 두드려 부수세요.' },
                        { key: 'rock',     icon: '🪨', label: '돌뿌리 점프 (ROCK)',    desc: '다리 위 돌뿌리가 등장합니다. 제때 뛰어서 넘으세요.' },
                      ] as { key: FlowFeatureKey; icon: string; label: string; desc: string }[]
                    ).map(({ key, icon, label, desc }) => {
                      const active = settings.flowFeatures.has(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSettings((s) => {
                              const next = new Set(s.flowFeatures);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return { ...s, flowFeatures: next };
                            });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '1rem',
                            border: `2px solid ${active ? '#22C55E' : 'var(--border)'}`,
                            background: active ? 'rgba(34,197,94,0.08)' : 'var(--card)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            textAlign: 'left',
                            transition: 'all 0.13s',
                          }}
                        >
                          <span style={{ fontSize: '1.3rem', lineHeight: 1, marginTop: '0.05rem' }}>{icon}</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: active ? '#16A34A' : 'var(--text)', marginBottom: '0.15rem' }}>
                              {active ? '✓ ' : ''}{label}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={S.sec}>
                  {stepNum(5, '스테이지당 시간')}
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '0.65rem', lineHeight: 1.55 }}>
                    각 스테이지가 끝나는 시간입니다. 스테이지 수 × 이 시간 = 총 운동 시간.
                  </p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[15, 20, 25, 30, 45, 60].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, flowDuration: n }))}
                        style={{
                          flex: 1, minWidth: '48px', padding: '0.55rem 0.4rem', borderRadius: '0.75rem', border: `2px solid ${settings.flowDuration === n ? '#3B82F6' : 'var(--border)'}`, background: settings.flowDuration === n ? 'rgba(59,130,246,0.12)' : 'var(--card)', color: settings.flowDuration === n ? '#3B82F6' : 'var(--text)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem', textAlign: 'center',
                        }}
                      >
                        {n}초
                      </button>
                    ))}
                  </div>
                </div>
                <div style={S.sec}>
                  {stepNum(6, '키즈 세이프 모드')}
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '0.65rem', lineHeight: 1.55 }}>
                    플로우 3D·이동 체감 속도만 낮춥니다. 레벨당 시간과 상단 진행바는 그대로입니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => set('kidsSafeMode', !settings.kidsSafeMode)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.9rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${settings.kidsSafeMode ? '#F97316' : 'var(--border)'}`,
                      background: settings.kidsSafeMode ? '#FFF7ED' : 'var(--card)',
                      color: settings.kidsSafeMode ? '#C2410C' : 'var(--text)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    키즈 세이프 모드 {settings.kidsSafeMode ? '켜짐 ✓' : '끔'}
                  </button>
                </div>
                <div style={S.sec}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>⭐ 즐겨찾기</div>
                    <button
                      type="button"
                      onClick={saveFlowPreset}
                      style={{ padding: '0.3rem 0.8rem', borderRadius: '0.6rem', border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem' }}
                    >
                      + 현재 설정 저장
                    </button>
                  </div>
                  {flowPresets.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>저장된 즐겨찾기가 없습니다.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {flowPresets.map((p) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card)' }}>
                          <button type="button" onClick={() => loadFlowPreset(p)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.86rem' }}>
                            {p.name}
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>{p.features.length}개 동작 · {p.duration}초</span>
                          </button>
                          <button type="button" onClick={() => deleteFlowPreset(p.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.15rem 0.3rem', borderRadius: '0.4rem', fontFamily: 'inherit' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {settings.mode !== 'flow' && (
              <>
                <div style={S.sec}>
                  {stepNum(stepSpeed, '신호 속도를 정하세요')}
                  <SpeedSelector value={settings.speed} onChange={(v) => set('speed', v)} showPresets={false} />
                </div>

                {/* 시지각 반응: 훈련 시간 / 그 외(spatial 제외): 분량(횟수) */}
                {settings.mode === 'reactTrain' && (
                  <div style={S.sec}>
                    {stepNum(stepReps, '훈련 시간을 선택하세요')}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {[30, 60, 120, 180].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setSettings((s) => ({ ...s, timeMode: 'time', duration: n }));
                          }}
                          style={{
                            padding: '0.6rem 1rem',
                            borderRadius: '0.75rem',
                            border: `2px solid ${settings.duration === n ? '#F97316' : 'var(--border)'}`,
                            background: settings.duration === n ? '#FFF7ED' : 'var(--card)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            color: 'var(--text)',
                          }}
                        >
                          {n < 60 ? `${n}초` : n === 60 ? '1분' : n === 120 ? '2분' : '3분'}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => set('kidsSafeMode', !settings.kidsSafeMode)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.9rem',
                          borderRadius: '0.75rem',
                          border: `2px solid ${settings.kidsSafeMode ? '#F97316' : 'var(--border)'}`,
                          background: settings.kidsSafeMode ? '#FFF7ED' : 'var(--card)',
                          color: settings.kidsSafeMode ? '#C2410C' : 'var(--text)',
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        키즈 세이프 모드 {settings.kidsSafeMode ? '켜짐 ✓' : '끔'}
                      </button>
                    </div>
                  </div>
                )}
                {settings.mode !== 'spatial' && settings.mode !== 'reactTrain' && (
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

  if (screen === 'visualReaction') {
    const rawReactSpeedLevel = mapSpomoveSpeedToReactTrainSpd(settings.speed);
    const safeReactSpeedLevel = settings.kidsSafeMode
      ? Math.max(1, rawReactSpeedLevel - 2)
      : rawReactSpeedLevel;
    const safeReactSpeedSec = settings.kidsSafeMode
      ? Math.min(6, settings.speed * 1.25)
      : settings.speed;
    if (countdown !== null) {
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
          <style>{CSS}</style>
          <div key={countdown} className="countdown-pop" style={{ fontSize: 'clamp(120px,30vw,240px)', fontWeight: 900, color: '#F97316', lineHeight: 1 }}>{countdown}</div>
        </div>
      );
    }
    return (
      <div ref={visualReactionContainerRef} style={{ position: 'fixed', inset: 0, zIndex: 320 }}>
        <style>{CSS}</style>
        {settings.level === 10 ? (
          <RobloxMoleReactionTraining
            durationSec={Math.max(1, settings.duration ?? 60)}
            speedLevel={safeReactSpeedLevel}
            speedSec={safeReactSpeedSec}
            onExit={stop}
            onComplete={handleReactTrainComplete}
          />
        ) : settings.level === 9 ? (
          <RushReactionTraining
            durationSec={Math.max(1, settings.duration ?? 60)}
            speedLevel={safeReactSpeedLevel}
            speedSec={safeReactSpeedSec}
            onExit={stop}
            onComplete={handleReactTrainComplete}
          />
        ) : settings.level === 8 ? (
          <SweepReactionTraining
            durationSec={Math.max(1, settings.duration ?? 60)}
            speedLevel={safeReactSpeedLevel}
            speedSec={safeReactSpeedSec}
            onExit={stop}
            onComplete={handleReactTrainComplete}
          />
        ) : settings.level === 7 ? (
          <BlackoutReactionTraining
            durationSec={Math.max(1, settings.duration ?? 60)}
            speedLevel={safeReactSpeedLevel}
            speedSec={safeReactSpeedSec}
            onExit={stop}
            onComplete={handleReactTrainComplete}
          />
        ) : settings.level === 6 ? (
          <PulseReactionTraining
            durationSec={Math.max(1, settings.duration ?? 60)}
            speedLevel={safeReactSpeedLevel}
            speedSec={safeReactSpeedSec}
            onExit={stop}
            onComplete={handleReactTrainComplete}
          />
        ) : settings.level === 5 ? (
          <DeepReactionTraining
            durationSec={Math.max(1, settings.duration ?? 60)}
            speedLevel={safeReactSpeedLevel}
            speedSec={safeReactSpeedSec}
            onExit={stop}
            onComplete={handleReactTrainComplete}
          />
        ) : settings.level === 4 ? (
          <DiagonalReactionTraining
            durationSec={Math.max(1, settings.duration ?? 60)}
            speedLevel={safeReactSpeedLevel}
            speedSec={safeReactSpeedSec}
            onExit={stop}
            onComplete={handleReactTrainComplete}
          />
        ) : (
          <VisualReactionTraining
            variant={settings.level === 1 ? 'flow' : settings.level === 2 ? 'flash' : 'pattern'}
            durationSec={Math.max(1, settings.duration ?? 60)}
            speedSec={safeReactSpeedSec}
            onExit={stop}
            onComplete={handleReactTrainComplete}
          />
        )}
      </div>
    );
  }

  if (screen === 'flow') {
    // SELECTABLE_MODULE_KEYS 순서로 선택된 모듈 정렬 → 스테이지 도입 순서 결정
    const selectedModules = SELECTABLE_MODULE_KEYS.filter((k) => settings.flowFeatures.has(k as FlowFeatureKey));
    const stages = buildStages(selectedModules, settings.flowDuration);

    const handleFlowDone = (stats: FlowStats) => {
      if (flowCompleteGuardRef.current) return;
      flowCompleteGuardRef.current = true;
      if (document.fullscreenElement) document.exitFullscreen();
      const cfg = { ...settings, mode: 'flow', level: 1 };
      setResult({ count: stats.stagesCompleted, cfg });
      setScreen('result');
    };

    return (
      <FlowGameClient
        stages={stages}
        colorTheme={settings.flowColorTheme}
        motionScale={settings.kidsSafeMode ? 0.5 : 1}
        bgmPath={flowBgmPathRef.current}
        bgImageUrl={settings.flowBgImageUrl || undefined}
        onComplete={handleFlowDone}
        onExit={stop}
        onEngineReady={(api) => { flowEngineApiRef.current = api; }}
      />
    );
  }

  if (screen === 'training') {
    const bg = (signal?.bg as string) ?? '#0F172A';
    const dark = bg === '#0F172A' || bg.startsWith('#0') || bg.startsWith('#1');
    return (
      <div ref={trainingContainerRef} style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', transition: 'background 0.06s' }}>
        <style>{CSS}</style>
        {engineMode === 'gonogo' && (
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
            {engineLevel === 1 && '📋 빨강·파랑·노랑 → 이동(Go) · 초록 → 멈춤(No-Go)'}
            {engineLevel === 2 && '📋 동그라미 → 이동(Go) · 세모 → 멈춤(No-Go)'}
            {engineLevel === 3 && '📋 화살표 → 이동 · ✕ → 멈춤'}
            {engineLevel === 4 && '📋 빨강 동그라미 → 이동(Go) · 빨강 세모 → 멈춤(No-Go)'}
          </div>
        )}
        {engineMode === 'taskswitch' && (
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
            {engineLevel === 1 &&
              '📋 색=보이는 색 위치 · 위치=화살표 방향 위치 · 반대로=색은 짝반대·화살표는 반대 방향'}
            {engineLevel === 2 && '📋 🎨색 · 📍위치 · ⇄반대(색/화살표는 화면 자극과 동일)'}
            {engineLevel === 3 &&
              '📋 흰 실선=색 규칙 · 흰 점선=위치 규칙 · 흰 이중선=반대로(자극은 색 또는 화살표)'}
          </div>
        )}
        {settings.mode === 'basic' && [2, 3, 4, 5].includes(settings.level) && (
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
          </div>
        )}
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {settings.intervalMode ? <><span style={{ color: intervalPhase === 'work' ? '#FCA5A5' : '#86EFAC' }}>{intervalPhase === 'work' ? '🔥' : '😮‍💨'}</span><span>{intervalLeft}초</span><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{intervalSet}/{settings.intervalSets}세트</span></> : settings.timeMode === 'time' ? <><span style={{ color: '#FCA5A5' }}>⏱</span> {stats.timeLeft}초</> : <><span style={{ color: '#86EFAC' }}>🎯</span> {stats.repsLeft}회</>}
          </div>
          <button type="button" onClick={stop} style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1rem', cursor: 'pointer', fontWeight: 800, letterSpacing: '0.08em' }}>STOP</button>
        </div>
        {settings.intervalMode && intervalPhase === 'rest' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 25, gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>😮‍💨</div>
            <div style={{ fontWeight: 900, fontSize: '2rem', color: '#86EFAC' }}>휴식 {intervalLeft}초</div>
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
        </div>
      </div>
    );
  }

  if (screen === 'result' && result) {
    const { count, cfg, dupStats } = result;
    const mo = MODES[cfg.mode];
    const isMem = cfg.mode === 'spatial' || cfg.mode === 'flow';
    const totalSec = isMem
      ? MEMORY_ROUNDS * 5
      : cfg.timeMode === 'time'
          ? (cfg.duration ?? 0)
          : (cfg.targetReps ?? 0) * (cfg.speed ?? 1);
    const spm = !isMem && totalSec > 0 ? Math.round((count / totalSec) * 60) : null;
    const mainVal = spm != null ? `${spm}` : `${count}`;
    const mainLabel = spm != null ? '처리 속도 지표 (SPM)' : '총 처리 신호 수';
    const completionRate = cfg.timeMode === 'reps' && (cfg.targetReps ?? 0) > 0
      ? Math.round((count / (cfg.targetReps ?? 1)) * 100)
      : null;
    const consistency = spm != null
      ? Math.max(0, Math.min(100, Math.round(100 - (Math.abs((cfg.speed > 0 ? 60 / cfg.speed : 0) - spm) * 1.4))))
      : null;
    const mainHint = spm != null
      ? '현재 세션에서 1분 기준으로 처리 가능한 반응량을 보여주는 지표입니다.'
      : '이번 세션에서 실제 처리한 신호 총량입니다.';
    const mainColor = mo?.accent ?? '#F97316';
    const student = students.find((s) => s.id === selectedStudentId);
    const goToList = () => {
      setSettings(cfg);
      if (autoLaunch) {
        onExit?.(settingsToExitResume(cfg));
        return;
      }
      setScreen('setup');
    };
    const statBox: React.CSSProperties = {
      border: '1px solid var(--border)',
      borderRadius: '0.65rem',
      padding: '0.55rem 0.7rem',
      background: 'var(--subtle-bg)',
    };
    return (
      <div style={{ ...S.page, height: '100vh', minHeight: '100vh' }}>
        <style>{CSS}</style>
        <header
          style={{
            flexShrink: 0,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem clamp(0.75rem, 3vw, 1.25rem)',
            borderBottom: '1px solid var(--border)',
            background: 'var(--card)',
          }}
        >
          <button
            type="button"
            style={{
              ...S.btn,
              ...S.bSecondary,
              justifySelf: 'start',
              padding: '0.55rem 0.9rem',
              fontSize: '0.88rem',
              borderRadius: '0.75rem',
            }}
            onClick={goToList}
          >
            ← 목록으로
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              fontSize: 'clamp(0.82rem, 2.4vw, 0.96rem)',
              fontWeight: 800,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{mo?.icon}</span>
            <span>{mo?.title} · {resultLevelLabel(cfg.mode, cfg.level)}</span>
          </div>
          <button
            type="button"
            style={{
              ...S.btn,
              ...S.bPrimary,
              justifySelf: 'end',
              padding: '0.55rem 1rem',
              fontSize: '0.88rem',
              borderRadius: '0.75rem',
            }}
            onClick={() => startSession(cfg)}
          >
            다시 ▶
          </button>
        </header>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(0.75rem, 3vw, 1.5rem)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 'clamp(20rem, 92vw, 32rem)',
              textAlign: 'center',
            }}
          >
            {student ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.65rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: student.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, color: '#fff' }}>{student.name[0]}</div>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: student.color }}>{student.name}</span>
              </div>
            ) : null}
            <div style={{ fontSize: 'clamp(4rem, 18vw, 6.5rem)', fontWeight: 900, lineHeight: 1, color: mainColor, letterSpacing: '-0.03em' }}>{mainVal}</div>
            <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.35rem' }}>{mainLabel}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5, maxWidth: '20rem', marginLeft: 'auto', marginRight: 'auto' }}>{mainHint}</div>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', textAlign: 'left' }}>
              <div style={statBox}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800 }}>총 수행 시간</div>
                <div style={{ fontSize: '0.98rem', color: 'var(--text)', fontWeight: 900, marginTop: '0.15rem' }}>{Math.max(0, Math.round(totalSec))}초</div>
              </div>
              <div style={statBox}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800 }}>평균 반응 밀도</div>
                <div style={{ fontSize: '0.98rem', color: 'var(--text)', fontWeight: 900, marginTop: '0.15rem' }}>{spm != null ? `${spm} SPM` : '-'}</div>
              </div>
              <div style={statBox}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800 }}>목표 달성률</div>
                <div style={{ fontSize: '0.98rem', color: 'var(--text)', fontWeight: 900, marginTop: '0.15rem' }}>{completionRate != null ? `${completionRate}%` : '시간모드'}</div>
              </div>
              <div style={statBox}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800 }}>수행 안정도</div>
                <div style={{ fontSize: '0.98rem', color: 'var(--text)', fontWeight: 900, marginTop: '0.15rem' }}>{consistency != null ? `${consistency}점` : '-'}</div>
              </div>
            </div>
            {cfg.mode === 'basic' && dupStats ? (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.65rem 0.75rem',
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  lineHeight: 1.55,
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>이번 세션 해석</div>
                <p style={{ margin: '0 0 0.35rem' }}>
                  연속 동일 신호 비율 <strong style={{ color: 'var(--text)' }}>{Math.round(dupStats.dupRatio * 100)}%</strong>
                  · 최대 연속 <strong style={{ color: 'var(--text)' }}>{dupStats.maxConsecutiveSame}번</strong>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
