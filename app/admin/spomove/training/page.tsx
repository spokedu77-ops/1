'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';

import { TRAINING_ENGINE_GUIDE_VIDEOS } from '@/app/lib/spomove/trainingEngineGuideVideos';
import { youtubeWatchOrShareToEmbedSrc } from '@/app/lib/spomove/youtubeEmbed';
import { USER_SPOMOVE_PRESETS_KEY, isSupportedMasterEngineMode } from '@/app/spokedu-master/lib/spomovePresets';
import type { SpomoveLaunchPreset } from '@/app/spokedu-master/types';

import { isSpomoveCatalogTbdMode, MODES, resolveTrainingEngine, SPOMOVE_CATALOG_SLOT_IDS } from './_player/constants';
import { GUIDE_BLOCKS } from './_player/trainingGuideContent';
import type { MemoryGameAutoLaunch, TrainingExitResume } from './_player/MemoryGameApp';
import { SpomoveCatalogHero } from './_player/components/SpomoveCatalogHero';
import { SpeedSelector } from './_player/components/SpeedSelector';
import {
  SPOMOVE_COLOR_THEME_LABELS,
  SPOMOVE_COLOR_THEME_ORDER,
  SPOMOVE_VARIANT_THEME_LS_KEY,
  parseStoredVariantTheme,
  type SpomoveColorThemeId,
} from './_player/lib/spomoveVariantThemeConfig';

/* ─── MemoryGameApp (Training 전용): SSR 비활성, 클라이언트 전용 ─── */
const MemoryGameApp = dynamic(
  () => import('./_player/MemoryGameApp').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#020617', color: 'rgba(255,255,255,0.35)',
        fontFamily: 'sans-serif', fontSize: 12, letterSpacing: '0.14em', fontWeight: 600,
      }}>
        로딩 중…
      </div>
    ),
  },
);

/* ─── design tokens ─── */
const T = {
  bg:          '#0a0a0a',
  surface:     '#111111',
  card:        '#161616',
  border:      'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.15)',
  muted:       'rgba(255,255,255,0.32)',
  text:        'rgba(255,255,255,0.88)',
  textDim:     'rgba(255,255,255,0.48)',
};

type TabCode = 'ALL' | 'VM' | 'IC' | 'EWM';

const TRAINING_MATRIX_HEADERS = ['축', '1단계', '2단계', '3단계', '4단계'] as const;

const TRAINING_MATRIX_ROWS: ReadonlyArray<{
  axis: string;
  s1: string;
  s2: string;
  s3: string;
  s4: string;
}> = [
  {
    axis: '시지각-반응 처리',
    s1: '시지각 반응',
    s2: '반응 인지',
    s3: 'Flow Mode / 시각-운동 추적',
    s4: '미정',
  },
  {
    axis: '선택주의와 간섭통제',
    s1: '사이먼 효과',
    s2: '플랭커',
    s3: '스트룹 과제',
    s4: '미정',
  },
  {
    axis: '실행조절과 작업기억',
    s1: 'Go / No-Go',
    s2: 'Task Switching',
    s3: '순차 기억',
    s4: '미정',
  },
];

const TABS: { code: TabCode; label: string; sub: string }[] = [
  { code: 'ALL', label: '전체', sub: '모든 SPOMOVE 프로그램' },
  { code: 'VM', label: '시지각-반응 처리', sub: '시지각 반응 · 반응 인지 · 플로우' },
  { code: 'IC', label: '선택주의와 간섭통제', sub: '사이먼 · 플랭커 · 스트룹' },
  { code: 'EWM', label: '실행조절과 작업기억', sub: 'Go/No-Go · Task Switching · 순차 기억' },
];

type TopTab = 'training' | 'teacher' | 'app';
const TEACHER_SPOMOVE_URL = '/teacher/spomove';

function levelLabel(modeId: string, levelId: number): string {
  return `${levelId}번`;
}

function modeLabelKoEn(modeId: string): string {
  const m = MODES[modeId];
  if (!m) return modeId;
  return `${m.title} (${m.en})`;
}

const LEVEL_KO_ALIAS_BY_EN: Record<string, string> = {
  'Quad Color': '사분할 색상',
  'Full-Screen Color': '전면 색상',
  'Variant Color (1)': '변형 색상 2패널',
  'Variant Color (2)': '변형 색상 3패널',
  'Variant Color (3)': '변형 색상 3',
  'Variant 3': '변형 색상 3패널',
  'Spatial Orientation': '공간 방향',
  'Arrow Stroop / Reverse': '화살표 스트룹/역스트룹',
  'Arrow + BG Interference': '화살표 + 배경 간섭',
  'Word Stroop / Reverse': '단어 스트룹/역스트룹',
  'Word + BG': '단어 + 배경',
  'Missing Color': '누락 색상 찾기',
  'Pole Shape': '폴 도형',
  'Pole Arrows': '폴 화살표',
  'Uniform Flankers': '동일 플랭커',
  'Grouped Flankers': '그룹 플랭커',
  'Random Flankers': '랜덤 플랭커',
  'Mixed Size & Color': '크기/색 혼합',
  '3-Circle Extreme Sizes': '3원 극단 크기',
  '5-Circle Extreme Sizes': '5원 극단 크기',
  'Go / No-Go (Color)': '색상 고/노고',
  'Go / No-Go (Shape)': '도형 고/노고',
  'Go / No-Go (Action)': '동작 고/노고',
  'Go / No-Go (Dual)': '이중 규칙 고/노고',
  'Task Switching (Text Cues)': '텍스트 큐 전환',
  'Task Switching (Icon Cues)': '아이콘 큐 전환',
  'Task Switching (Border Cues)': '테두리 큐 전환',
  '3항 기억': '3항 기억',
  '5항 기억': '5항 기억',
  '10항 기억': '10항 기억',
  '색깔-번호 기억': '색상-번호 기억',
  '색깔-번호 전체 공개': '색상-번호 전체 공개',
  'Color-Number Integration': '색상-숫자 통합',
  'Color & Arrow': '색상 & 화살표',
  'Flow Program': '플로우 프로그램',
  'Rhythm Program': '리듬 프로그램',
  FLOW: '플로우',
  FLASH: '플래시',
  PATTERN: '패턴',
  Diagonal: '대각선 반응',
  'Deep Reaction': '심해 반응',
  Pulse: '펄스 반응',
  Blackout: '블랙아웃 반응',
  Sweep: '스윕 반응',
  Rush: '러시 반응',
};

function levelNameKo(modeId: string, levelId: number): string {
  const m = MODES[modeId];
  const lv = m?.levels.find((x) => x.id === levelId);
  if (lv?.enName) {
    const byEn = LEVEL_KO_ALIAS_BY_EN[lv.enName];
    if (byEn) return byEn;
  }
  return lv?.name ?? levelLabel(modeId, levelId);
}

function levelLabelKoEn(modeId: string, levelId: number): string {
  const m = MODES[modeId];
  const lv = m?.levels.find((x) => x.id === levelId);
  if (!lv) return levelLabel(modeId, levelId);
  const enDisplay = lv.enName.replace('Variant Color (1)', 'Variant Color 1').replace('Variant Color (2)', 'Variant Color 2');
  return `${levelLabel(modeId, levelId)} : ${levelNameKo(modeId, levelId)} (${enDisplay})`;
}

function pickDefaultTimeMode(modeId: string): 'time' | 'reps' {
  return modeId === 'reactTrain' ? 'time' : 'reps';
}

type FlowFeatureKey = 'faster' | 'punch' | 'duck' | 'reach' | 'rock';

type LaunchSettings = {
  speed: number;
  timeMode: 'time' | 'reps';
  duration: number;
  targetReps: number;
  warmup: number;
  accel: boolean;
  intervalMode: boolean;
  kidsSafeMode: boolean;
  numberRule: string;
  variantColorTheme: SpomoveColorThemeId;
  basicNumberOverlay: 'none' | '2' | '3';
  flowFeatures: FlowFeatureKey[];
  flowColorTheme: 'default' | 'space' | 'neon' | 'ocean';
  flowDuration: number;
  flowBgImageUrl: string;
};

const DEFAULT_LAUNCH: LaunchSettings = {
  speed: 2.0,
  timeMode: 'reps',
  duration: 60,
  targetReps: 20,
  warmup: 3,
  accel: false,
  intervalMode: false,
  kidsSafeMode: false,
  numberRule: 'odd_left',
  variantColorTheme: 'color',
  basicNumberOverlay: 'none',
  flowFeatures: [],
  flowColorTheme: 'default',
  flowDuration: 25,
  flowBgImageUrl: '',
};

function autoLaunchToLaunchSettings(auto: MemoryGameAutoLaunch, fallback: LaunchSettings): LaunchSettings {
  return {
    speed: auto.speed ?? fallback.speed,
    timeMode: auto.timeMode ?? fallback.timeMode,
    duration: auto.duration ?? fallback.duration,
    targetReps: auto.targetReps ?? fallback.targetReps,
    warmup: auto.warmup ?? fallback.warmup,
    accel: auto.accel ?? fallback.accel,
    intervalMode: auto.intervalMode ?? fallback.intervalMode,
    kidsSafeMode: auto.kidsSafeMode ?? fallback.kidsSafeMode,
    numberRule: auto.numberRule ?? fallback.numberRule,
    variantColorTheme: auto.variantColorTheme ?? fallback.variantColorTheme,
    basicNumberOverlay: auto.basicNumberOverlay ?? fallback.basicNumberOverlay,
    flowFeatures: (auto.flowFeatures ?? fallback.flowFeatures) as FlowFeatureKey[],
    flowColorTheme: auto.flowColorTheme ?? fallback.flowColorTheme,
    flowDuration: auto.flowDuration ?? fallback.flowDuration,
    flowBgImageUrl: fallback.flowBgImageUrl,
  };
}

type PagePhase =
  | { tag: 'catalog' }
  | { tag: 'settings'; modeId: string; levelId?: number; launch?: LaunchSettings }
  | { tag: 'training'; modeId: string; levelId: number; launch: LaunchSettings };

function SettingsGuideVideoIframe({ videoUrl, accent }: { videoUrl?: string | null; accent: string }) {
  const src = videoUrl?.trim() ? youtubeWatchOrShareToEmbedSrc(videoUrl) : null;
  if (!src) return null;
  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 4,
        width: '100%',
        aspectRatio: '16 / 9',
        maxHeight: 220,
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${accent}55`,
        background: '#000',
      }}
    >
      <iframe
        title="YouTube 가이드 영상"
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </div>
  );
}

function TrainingPortal({
  modeId,
  levelId,
  launch,
  onClose,
}: {
  modeId: string;
  levelId: number;
  launch: LaunchSettings;
  onClose: (resume?: TrainingExitResume) => void;
}) {
  if (typeof document === 'undefined') return null;

  const autoLaunch: MemoryGameAutoLaunch = {
    speed: launch.speed,
    timeMode: launch.timeMode,
    duration: launch.duration,
    targetReps: launch.targetReps,
    warmup: launch.warmup,
    accel: launch.accel,
    intervalMode: launch.intervalMode,
    kidsSafeMode: launch.kidsSafeMode,
    numberRule: launch.numberRule,
    variantColorTheme: launch.variantColorTheme,
    basicNumberOverlay: launch.basicNumberOverlay,
    flowFeatures: launch.flowFeatures,
    flowColorTheme: launch.flowColorTheme,
    flowDuration: launch.flowDuration,
    flowBgImageUrl: launch.flowBgImageUrl || undefined,
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      background: '#020617',
    }}>
      <MemoryGameApp
        key={`${modeId}-${levelId}-${launch.speed}-${launch.timeMode}-${launch.duration}-${launch.targetReps}-${launch.warmup}-${launch.accel}-${launch.intervalMode}-${launch.kidsSafeMode}-${launch.numberRule}-${launch.variantColorTheme}-${launch.flowColorTheme}-${launch.flowDuration}`}
        initialMode={modeId}
        initialLevel={levelId}
        autoLaunch={autoLaunch}
        onExit={onClose}
        onUnavailable={onClose}
      />
    </div>,
    document.body,
  );
}

function AppManagementTab() {
  const cards = [
    {
      href: '/admin/iiwarmup/assets',
      title: 'Asset Hub',
      desc: 'Think / Flow 에셋 업로드·관리 (챌린지는 스튜디오에서 직접)',
    },
    {
      href: '/admin/spomove/training',
      title: 'SPOMOVE',
      desc: 'SPOMOVE 트레이닝으로 바로 진입합니다.',
    },
    {
      href: '/admin/iiwarmup/flow',
      title: 'Flow',
      desc: '몰입형 Flow 프로그램으로 바로 진입합니다.',
    },
    {
      href: '/admin/camera',
      title: '카메라 앱',
      desc: '수업용 카메라 앱으로 바로 진입합니다.',
    },
  ];

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '42px 24px 0' }}>
      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.22em', color: T.muted, fontWeight: 800 }}>
          SPOKEDU · APP MANAGEMENT
        </p>
        <h1 style={{ margin: '8px 0 0', color: T.text, fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 950, letterSpacing: '-0.04em' }}>
          앱 관리
        </h1>
        <p style={{ margin: '8px 0 0', color: T.textDim, fontSize: 14, lineHeight: 1.7 }}>
          Asset Hub와 SPOMOVE에서 수업용 도구를 관리합니다.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              display: 'block',
              borderRadius: 18,
              background: T.surface,
              border: `1px solid ${T.border}`,
              padding: 20,
              textDecoration: 'none',
              transition: 'border-color 160ms ease, transform 160ms ease, background 160ms ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.borderHover;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.055)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.background = T.surface;
            }}
          >
            <h3 style={{ margin: 0, color: T.text, fontSize: 16, fontWeight: 900 }}>{card.title}</h3>
            <p style={{ margin: '10px 0 0', color: T.textDim, fontSize: 13, lineHeight: 1.6 }}>{card.desc}</p>
            <span style={{ marginTop: 14, display: 'inline-block', color: '#60A5FA', fontSize: 13, fontWeight: 700 }}>
              진입 →
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}

function CatalogModeCard({
  modeId,
  onPick,
}: {
  modeId: string;
  onPick: (modeId: string) => void;
}) {
  const m = MODES[modeId];
  if (!m) return null;
  const isTbd = isSpomoveCatalogTbdMode(modeId);

  return (
    <button
      type="button"
      onClick={() => {
        if (isTbd) return;
        onPick(modeId);
      }}
      className="spmt-card"
      style={{
        position: 'relative',
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        background: `linear-gradient(180deg, ${m.accent}12 0%, rgba(255,255,255,0.02) 22%, rgba(255,255,255,0.00) 100%)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 248,
        cursor: isTbd ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        padding: 0,
        boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
        opacity: isTbd ? 0.55 : 1,
        transform: 'translateY(0px)',
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
    }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(650px 220px at 22% 0%, ${m.accent}22 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <span
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${m.accent}18`,
              border: `1px solid ${m.accent}33`,
              boxShadow: `0 6px 18px ${m.accent}22`,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {m.icon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="spmt-title" style={{ fontWeight: 950, color: T.text, lineHeight: 1.16, letterSpacing: '-0.015em', wordBreak: 'keep-all' }}>
              {m.title} : {m.en}
            </div>
          </div>
        </div>
        <p className="spmt-desc" style={{ margin: '12px 0 0', color: T.textDim, lineHeight: 1.62, wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 78 }}>
          {m.desc}
        </p>
      </div>

      <div style={{ padding: '0 16px 16px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 10px',
              borderRadius: 999,
              border: `1px solid ${isTbd ? T.border : `${m.accent}50`}`,
              background: isTbd ? 'rgba(255,255,255,0.03)' : `${m.accent}14`,
              color: isTbd ? T.textDim : `${m.accent}ee`,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '0.02em',
            }}
          >
            <span>설정으로</span>
            <span
              aria-hidden
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 900,
                color: isTbd ? 'rgba(255,255,255,0.45)' : '#fff',
                background: isTbd ? 'rgba(255,255,255,0.12)' : `${m.accent}`,
              }}
            >
              ▶
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function SettingsScreen({
  modeId,
  initial,
  initialLevelId,
  onStart,
  onBack,
}: {
  modeId: string;
  initial: LaunchSettings;
  /** 훈련 중 STOP·완료 후 복귀 시 이전에 선택한 난이도 유지 */
  initialLevelId?: number;
  onStart: (levelId: number, launch: LaunchSettings) => void;
  onBack: () => void;
}) {
  const m = MODES[modeId];
  const accent = m?.accent ?? '#F97316';

  const [levelId, setLevelId] = useState<number>(() => {
    if (
      typeof initialLevelId === 'number' &&
      m?.levels?.some((lv) => lv.id === initialLevelId)
    ) {
      return initialLevelId;
    }
    return m?.levels?.[0]?.id ?? 1;
  });
  const [launch, setLaunch] = useState<LaunchSettings>(initial);
  const [guideOpen, setGuideOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ── Flow 즐겨찾기 ──────────────────────────────────────────────────────────
  const FLOW_PRESETS_KEY = 'spomove_flow_presets_v2';
  interface FlowPreset { id: string; name: string; features: FlowFeatureKey[]; colorTheme: LaunchSettings['flowColorTheme']; duration: number; }
  const [flowPresets, setFlowPresets] = useState<FlowPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(FLOW_PRESETS_KEY) ?? '[]') as FlowPreset[]; } catch { return []; }
  });
  const saveFlowPreset = () => {
    const name = window.prompt('즐겨찾기 이름', `세팅 ${flowPresets.length + 1}`);
    if (!name) return;
    const next: FlowPreset[] = [...flowPresets, { id: Date.now().toString(), name, features: [...launch.flowFeatures], colorTheme: launch.flowColorTheme, duration: launch.flowDuration }];
    setFlowPresets(next);
    localStorage.setItem(FLOW_PRESETS_KEY, JSON.stringify(next));
  };
  const loadFlowPreset = (p: FlowPreset) => setLaunch((s) => ({ ...s, flowFeatures: [...p.features], flowColorTheme: p.colorTheme, flowDuration: p.duration }));
  const deleteFlowPreset = (id: string) => {
    const next = flowPresets.filter((p) => p.id !== id);
    setFlowPresets(next);
    localStorage.setItem(FLOW_PRESETS_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 훈련 복귀 시에는 initial(launch)에 담긴 테마를 유지
    if (typeof initialLevelId === 'number') return;
    const storedTheme = parseStoredVariantTheme(localStorage.getItem(SPOMOVE_VARIANT_THEME_LS_KEY));
    setLaunch((s) => ({ ...s, variantColorTheme: storedTheme }));
  }, [initialLevelId]);


  const guideBlock = useMemo(
    () => GUIDE_BLOCKS.find((b) => b.id === modeId) ?? null,
    [modeId],
  );

  const engineGuideVideoUrl = useMemo(
    () => TRAINING_ENGINE_GUIDE_VIDEOS[modeId] ?? null,
    [modeId],
  );

  const guidePhase = useMemo(() => {
    if (!guideBlock) return null;
    const num = levelLabel(modeId, levelId);
    return guideBlock.phases.find((p) => p.num === num) ?? null;
  }, [guideBlock, modeId, levelId]);

  const isReactTrain = modeId === 'reactTrain';
  const isSpatial = modeId === 'spatial';
  const isFlowOrChallenge = modeId === 'flow';

  const saveMasterLaunchPreset = async () => {
    const name = window.prompt('구독 서비스에 표시할 프리셋 이름', `${modeLabelKoEn(modeId)} ${levelLabel(modeId, levelId)}`);
    if (!name) return;
    const engine = resolveTrainingEngine(modeId, levelId);
    if (!isSupportedMasterEngineMode(engine.engineMode)) {
      window.alert('아직 SPOKEDU MASTER 실행 화면에 이식되지 않은 엔진입니다. 먼저 이 엔진을 구독 서비스 세션에 연결해야 합니다.');
      return;
    }
    const durationSec = isFlowOrChallenge ? launch.flowDuration : launch.timeMode === 'time' ? launch.duration : Math.max(30, Math.round(launch.targetReps * launch.speed));
    const preset: SpomoveLaunchPreset = {
      id: `admin-${Date.now()}`,
      title: name.trim().slice(0, 48),
      subtitle: `${levelLabelKoEn(modeId, levelId)} · ${durationSec}초 · ${launch.speed.toFixed(1)}초 간격`,
      intent: isFlowOrChallenge ? 'finish' : modeId === 'reactTrain' ? 'warmup' : 'focus',
      drillId: modeId,
      engineMode: engine.engineMode,
      engineLevel: engine.engineLevel,
      durationSec,
      speedSec: launch.speed,
      mode: 'projector',
      tags: [levelLabel(modeId, levelId), `${durationSec}초`, launch.kidsSafeMode ? '키즈 세이프' : '기본'],
      target: '관리자 설정',
      space: '현장 선택',
      useCase: '관리자가 Training에서 저장한 실행 세팅',
    };

    try {
      const res = await fetch('/api/spokedu-master/spomove-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });
      if (res.ok) {
        window.alert('SPOKEDU MASTER 공식 SPOMOVE 프리셋으로 저장했습니다.');
        return;
      }

      const raw = window.localStorage.getItem(USER_SPOMOVE_PRESETS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const next = [preset, ...(Array.isArray(list) ? list : [])].slice(0, 12);
      window.localStorage.setItem(USER_SPOMOVE_PRESETS_KEY, JSON.stringify(next));
      window.alert('DB 저장은 실패했지만, 이 브라우저의 SPOKEDU MASTER SPOMOVE 홈에 임시 저장했습니다.');
    } catch {
      window.alert('프리셋 저장에 실패했습니다.');
    }
  };

  return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 24px', borderBottom: `1px solid ${T.border}`, background: T.bg,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${T.border}`, background: 'transparent', color: T.muted,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >
          ← 목록
        </button>
        <span style={{ fontSize: 12, color: T.text, fontWeight: 800 }}>
          {m?.icon} {modeLabelKoEn(modeId)} · {levelLabelKoEn(modeId, levelId)}
        </span>
      </header>

      <div style={{ flex: 1, padding: '42px 24px 80px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>
            트레이닝 설정
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>
            자극 속도·분량(또는 시간)을 맞춘 뒤 시작하세요. 아래에서 상세 가이드를 펼칠 수 있습니다.
          </p>

          {/* 가이드 */}
          <div style={{ marginTop: 18, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setGuideOpen((v) => !v)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 14px',
                background: T.card, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10, color: T.text,
              }}
            >
              <span style={{ color: accent, fontSize: 11, fontWeight: 800, width: 18 }}>{guideOpen ? '▼' : '▶'}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                엔진 · 난이도 안내 {guideBlock ? `· ${modeLabelKoEn(modeId)}` : ''}
                <span style={{ fontWeight: 600, color: T.muted }}> ({levelLabelKoEn(modeId, levelId)})</span>
              </span>
            </button>
            {guideOpen ? (
              <div style={{ padding: '12px 14px 16px', borderTop: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
                <SettingsGuideVideoIframe accent={accent} videoUrl={engineGuideVideoUrl} />
                {guideBlock ? (
                  <>
                    <p style={{ margin: '10px 0 10px', fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.12em' }}>{guideBlock.tag}</p>
                    <p style={{ margin: '0 0 14px', fontSize: 12, color: T.text, lineHeight: 1.65 }}>{guideBlock.intro}</p>
                    {guidePhase ? (
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: accent, letterSpacing: '0.08em' }}>
                          {guidePhase.num} {guidePhase.name}
                        </p>
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>목표</strong> {guidePhase.goal}</p>
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>화면</strong> {guidePhase.screen}</p>
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>실행</strong> {guidePhase.action}</p>
                        <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>코치</strong> {guidePhase.coach}</p>
                      </div>
                    ) : (
                      <p style={{ margin: '0 0 12px', fontSize: 12, color: T.muted }}>
                        이 모드·난이도에 해당하는 단계별 상세 문단은 가이드에 없습니다.
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>
                    가이드 블록이 없는 모드입니다.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div style={{ height: 1, background: T.border, margin: '22px 0 26px' }} />

          {/* 세부 테마 */}
          <section style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>세부 테마</label>
              <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                {levelLabelKoEn(modeId, levelId)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(m?.levels ?? []).map((lv) => {
                const active = levelId === lv.id;
                return (
                  <button
                    key={lv.id}
                    type="button"
                    onClick={() => setLevelId(lv.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `1.5px solid ${active ? accent : T.border}`,
                      background: active ? `${accent}16` : T.card,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 900, color: active ? accent : T.text }}>
                      {levelLabel(modeId, lv.id)} : {levelNameKo(modeId, lv.id)} ({lv.enName.replace('Variant Color (1)', 'Variant Color 1').replace('Variant Color (2)', 'Variant Color 2')})
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 속도 (FLOW는 내부 타이밍으로 동작하므로 숨김) */}
          {!isFlowOrChallenge ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>신호 속도</label>
                <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                  {launch.speed.toFixed(1)}초 / 자극
                </div>
              </div>
              <SpeedSelector
                value={launch.speed}
                onChange={(v) => setLaunch((s) => ({ ...s, speed: v }))}
                showPresets={false}
              />
            </section>
          ) : null}

          {/* 키즈 세이프 모드 (시지각 반응 + 플로우) */}
          {isReactTrain || isFlowOrChallenge ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>
                  키즈 세이프 모드
                </label>
              </div>
              <button
                type="button"
                onClick={() => setLaunch((s) => ({ ...s, kidsSafeMode: !s.kidsSafeMode }))}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: 12,
                  border: `1.5px solid ${launch.kidsSafeMode ? accent : T.border}`,
                  background: launch.kidsSafeMode ? `${accent}16` : T.card,
                  color: launch.kidsSafeMode ? accent : T.textDim,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {launch.kidsSafeMode ? '켜짐 ✓' : '끔'}
                <span style={{ marginLeft: 10, fontWeight: 700, opacity: 0.85 }}>
                  {isFlowOrChallenge
                    ? '(Flow 3D 체감 속도 완화)'
                    : '(시지각 반응 전체 속도/스폰 간격 완화)'}
                </span>
              </button>
            </section>
          ) : null}

          {/* Flow 전용: 배경 테마 */}
          {isFlowOrChallenge ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>배경 테마</label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(
                  [
                    { key: 'default' as const, label: '기본',  desc: '검정 · 노랑/초록/빨강' },
                    { key: 'space'   as const, label: '우주',  desc: '다크 퍼플 · 보라/파랑' },
                    { key: 'neon'    as const, label: '네온',  desc: '다크 틸 · 청록/빨강' },
                    { key: 'ocean'   as const, label: '🌊 바다', desc: '딥 네이비 · 하늘/청록' },
                  ]
                ).map(({ key, label, desc }) => {
                  const active = launch.flowColorTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, flowColorTheme: key }))}
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? '#8B5CF6' : T.border}`,
                        background: active ? 'rgba(139,92,246,0.16)' : T.card,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: 13, color: active ? '#8B5CF6' : T.text }}>{active ? '✓ ' : ''}{label}</div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Flow 전용: 스테이지 시간 */}
          {isFlowOrChallenge ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>스테이지당 시간</label>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: T.textDim }}>스테이지 한 구간을 달리는 시간입니다.</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[15, 20, 25, 30, 45, 60].map((sec) => {
                  const active = launch.flowDuration === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, flowDuration: sec }))}
                      style={{
                        flex: '1 1 60px', padding: '9px 6px', borderRadius: 12,
                        border: `1.5px solid ${active ? '#3B82F6' : T.border}`,
                        background: active ? 'rgba(59,130,246,0.14)' : T.card,
                        color: active ? '#3B82F6' : T.textDim,
                        fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 900 : 700,
                        cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      {sec}초
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Flow 전용: 배경 이미지 URL */}
          {isFlowOrChallenge ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>배경 이미지 URL <span style={{ fontWeight: 400 }}>(선택)</span></label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim }}>JPG / PNG URL. 비우면 기본 테마 사용.</p>
              </div>
              <input
                type="text"
                placeholder="https://... 또는 /images/bg.jpg"
                value={launch.flowBgImageUrl}
                onChange={(e) => setLaunch((s) => ({ ...s, flowBgImageUrl: e.target.value }))}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: `1.5px solid ${T.border}`,
                  background: T.card,
                  color: T.text,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </section>
          ) : null}

          {/* Flow 전용: 추가 동작 선택 */}
          {isFlowOrChallenge ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>추가 동작 선택</label>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  선택한 동작이 스테이지별로 순차 추가됩니다. 복수 선택 가능합니다.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(
                  [
                    { key: 'faster'   as FlowFeatureKey, icon: '⚡', label: '속도 증가 (FASTER)',     desc: '이전 스테이지보다 이동 속도가 빨라집니다.' },
                    { key: 'punch'    as FlowFeatureKey, icon: '👊', label: '박스 펀치 (PUNCH)',      desc: '다리 위에 박스가 등장합니다. 주먹으로 파괴하세요.' },
                    { key: 'duck'     as FlowFeatureKey, icon: '🛸', label: 'UFO 숙이기 (DUCK)',      desc: '저공 UFO가 나타납니다. 빠르게 몸을 낮춰 피하세요.' },
                    { key: 'reach'    as FlowFeatureKey, icon: '🧱', label: '펀치 벽 두드리기',         desc: '브릿지를 막는 벽이 등장합니다. 5번 두드려 부수세요.' },
                    { key: 'rock'     as FlowFeatureKey, icon: '🪨', label: '돌뿌리 점프 (ROCK)',     desc: '다리 위 돌뿌리가 등장합니다. 제때 뛰어서 넘으세요.' },
                  ]
                ).map(({ key, icon, label, desc }) => {
                  const active = launch.flowFeatures.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setLaunch((s) => {
                          const next = active
                            ? s.flowFeatures.filter((k) => k !== key)
                            : [...s.flowFeatures, key];
                          return { ...s, flowFeatures: next };
                        });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? '#22C55E' : T.border}`,
                        background: active ? 'rgba(34,197,94,0.10)' : T.card,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        transition: 'all 0.13s',
                      }}
                    >
                      <span style={{ fontSize: '1.15rem', lineHeight: 1, marginTop: 2 }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 13, color: active ? '#16A34A' : T.text, marginBottom: 2 }}>
                          {active ? '✓ ' : ''}{label}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.45 }}>{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Flow 전용: 즐겨찾기 */}
          {isFlowOrChallenge ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>즐겨찾기</label>
                <button
                  type="button"
                  onClick={saveFlowPreset}
                  style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  + 현재 설정 저장
                </button>
              </div>
              {flowPresets.length === 0 ? (
                <p style={{ margin: 0, fontSize: 11, color: T.textDim }}>저장된 즐겨찾기가 없습니다. 설정 후 저장하세요.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {flowPresets.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.card }}>
                      <button
                        type="button"
                        onClick={() => loadFlowPreset(p)}
                        style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                          {p.colorTheme} · {p.duration}초 · {p.features.length > 0 ? p.features.join(', ') : '기본'}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFlowPreset(p.id)}
                        style={{ fontSize: 11, color: 'rgba(255,100,100,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit' }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {/* 분량/시간 */}
          {!isFlowOrChallenge ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>
                  {isReactTrain ? '훈련 시간' : isSpatial ? '진행' : '분량'}
                </label>
              </div>

              {isReactTrain ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[30, 60, 120, 180].map((sec) => {
                    const active = launch.duration === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setLaunch((s) => ({ ...s, timeMode: 'time', duration: sec }))}
                        style={{
                          flex: '1 1 90px',
                          padding: '11px 10px',
                          borderRadius: 12,
                          border: `1.5px solid ${active ? accent : T.border}`,
                          background: active ? `${accent}16` : T.card,
                          color: active ? accent : T.textDim,
                          fontFamily: 'inherit',
                          fontSize: 13,
                          fontWeight: active ? 900 : 700,
                          cursor: 'pointer',
                        }}
                      >
                        {sec < 60 ? `${sec}초` : sec === 60 ? '1분' : sec === 120 ? '2분' : '3분'}
                      </button>
                    );
                  })}
                </div>
              ) : isSpatial ? (
                <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>
                  순차 기억은 설정 후 전용 메모리 화면에서 진행됩니다.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[10, 20, 30, 40].map((r) => {
                    const active = launch.targetReps === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setLaunch((s) => ({ ...s, timeMode: 'reps', targetReps: r }))}
                        style={{
                          flex: '1 1 90px',
                          padding: '11px 10px',
                          borderRadius: 12,
                          border: `1.5px solid ${active ? accent : T.border}`,
                          background: active ? `${accent}16` : T.card,
                          color: active ? accent : T.textDim,
                          fontFamily: 'inherit',
                          fontSize: 13,
                          fontWeight: active ? 900 : 700,
                          cursor: 'pointer',
                        }}
                      >
                        {r}회
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {/* 변형 색지각 테마 */}
          {modeId === 'basic' && (levelId === 3 || levelId === 4 || levelId === 5 || levelId === 6) ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>변형 색지각 이미지 테마</label>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SPOMOVE_COLOR_THEME_ORDER
                  .slice()
                  .sort((a, b) =>
                    SPOMOVE_COLOR_THEME_LABELS[a].localeCompare(SPOMOVE_COLOR_THEME_LABELS[b], 'ko')
                  )
                  .map((tid) => {
                  const active = launch.variantColorTheme === tid;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => {
                        setLaunch((s) => ({ ...s, variantColorTheme: tid }));
                        if (typeof window !== 'undefined') {
                          localStorage.setItem(SPOMOVE_VARIANT_THEME_LS_KEY, tid);
                        }
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                      }}
                    >
                      {active ? '✓ ' : ''}{SPOMOVE_COLOR_THEME_LABELS[tid]}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 숫자 오버레이 (basic 3번 + 색상 테마 전용) */}
          {modeId === 'basic' && levelId === 3 && launch.variantColorTheme === 'color' ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>숫자 오버레이</label>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: T.textDim, lineHeight: 1.6 }}>
                색상 화면 위에 숫자를 표시합니다. 색을 보고 그 번호 위치로 점프하거나 숫자를 말하는 확장 과제입니다.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['none', '2', '3'] as const).map((opt) => {
                  const active = launch.basicNumberOverlay === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, basicNumberOverlay: opt }))}
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt === 'none' ? '없음' : opt}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 고급 설정 */}
          {!isFlowOrChallenge ? (
            <section style={{ marginBottom: 26 }}>
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%',
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  color: T.muted,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 900,
                }}
              >
                <span style={{ width: 18, color: accent }}>{advancedOpen ? '▼' : '▶'}</span>
                고급 설정
              </button>
              {advancedOpen ? (
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 8 }}>워밍업 카운트다운</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[0, 3, 5].map((n) => {
                        const active = launch.warmup === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setLaunch((s) => ({ ...s, warmup: n }))}
                            style={{
                              padding: '9px 12px',
                              borderRadius: 10,
                              border: `1.5px solid ${active ? accent : T.border}`,
                              background: active ? `${accent}16` : T.card,
                              color: active ? accent : T.textDim,
                              fontFamily: 'inherit',
                              fontSize: 12,
                              fontWeight: active ? 900 : 700,
                              cursor: 'pointer',
                            }}
                          >
                            {n === 0 ? '없음' : `${n}초`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 8 }}>인터벌 모드 (Tabata)</div>
                    <button
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, intervalMode: !s.intervalMode }))}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: `1.5px solid ${launch.intervalMode ? accent : T.border}`,
                        background: launch.intervalMode ? `${accent}16` : T.card,
                        color: launch.intervalMode ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 900,
                    cursor: 'pointer',
                      }}
                    >
                      {launch.intervalMode ? '켜짐' : '끔'}
                    </button>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 8 }}>점진 가속 (accel)</div>
                    <button
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, accel: !s.accel }))}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: `1.5px solid ${launch.accel ? accent : T.border}`,
                        background: launch.accel ? `${accent}16` : T.card,
                        color: launch.accel ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {launch.accel ? '켜짐' : '끔'}
                    </button>
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                      세션 진행률에 따라 신호 간격이 빨라집니다. 인터벌 모드에서는 적용되지 않습니다.
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <button
            type="button"
            onClick={() => onStart(levelId, launch)}
            style={{
              width: '100%',
              padding: '17px 24px',
              borderRadius: 14,
              border: 'none',
              background: accent,
              color: '#000',
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 900,
              cursor: 'pointer',
              letterSpacing: '0.08em',
              boxShadow: `0 4px 24px ${accent}50`,
              transition: 'opacity 0.15s, transform 0.12s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            }}
          >
            훈련 시작 ▶
          </button>
          <button
            type="button"
            onClick={saveMasterLaunchPreset}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '13px 20px',
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: T.card,
              color: T.text,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            구독 SPOMOVE 프리셋으로 저장
          </button>
        </div>
      </div>
    </div>
  );
}

function SpomoveTrainingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTab = searchParams.get('tab');
  const queryTopTab: TopTab = queryTab === 'teacher' ? 'teacher' : queryTab === 'app' ? 'app' : 'training';
  const [topTab, setTopTab] = useState<TopTab>(queryTopTab);
  const [activeTab, setActiveTab] = useState<TabCode>('ALL');
  const [phase, setPhase] = useState<PagePhase>({ tag: 'catalog' });

  useEffect(() => {
    setTopTab(queryTopTab);
  }, [queryTopTab]);

  useEffect(() => {
    if (queryTopTab !== 'teacher') return;
    if (typeof window === 'undefined') return;
    window.location.href = TEACHER_SPOMOVE_URL;
  }, [queryTopTab]);

  const switchTopTab = useCallback(
    (next: TopTab) => {
      if (next === 'teacher') {
        if (typeof window !== 'undefined') {
          window.location.href = TEACHER_SPOMOVE_URL;
        }
        return;
      }
      setTopTab(next);
      setPhase({ tag: 'catalog' });
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'app') {
        params.set('tab', 'app');
      } else {
        params.delete('tab');
      }
      const qs = params.toString();
      const basePath = '/admin/spomove/training';
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    },
    [router, searchParams],
  );

  const modeIdsByTab = useMemo(() => {
    const ids = SPOMOVE_CATALOG_SLOT_IDS.filter((id) => id in MODES);
    const byCore = new Map<TabCode, string[]>();
    for (const tab of TABS) byCore.set(tab.code, []);
    byCore.set('ALL', []);
    for (const id of ids) {
      const m = MODES[id];
      if (!m) continue;
      const core = m.coreCode as TabCode | undefined;
      byCore.get('ALL')!.push(id);
      if (core && byCore.has(core)) byCore.get(core)!.push(id);
    }
    return byCore;
  }, []);

  const visibleModeIds = useMemo(() => {
    const list = modeIdsByTab.get(activeTab) ?? [];
    const set = new Set(list);
    return SPOMOVE_CATALOG_SLOT_IDS.filter((id) => set.has(id));
  }, [activeTab, modeIdsByTab]);

  const handlePick = useCallback((modeId: string) => {
    setPhase({ tag: 'settings', modeId });
  }, []);

  const handleStart = useCallback((levelId: number, launch: LaunchSettings) => {
    setPhase((prev) => {
      if (prev.tag !== 'settings') return prev;
      return { tag: 'training', modeId: prev.modeId, levelId, launch };
    });
  }, []);

  if (phase.tag === 'settings') {
    const modeId = phase.modeId;
    const initial: LaunchSettings = phase.launch ?? {
      ...DEFAULT_LAUNCH,
      timeMode: pickDefaultTimeMode(modeId),
      // reactTrain은 time 기본
      duration: 60,
      // 나머지는 reps 기본
      targetReps: 20,
    };
    return (
      <SettingsScreen
        key={`${modeId}-${phase.levelId ?? 'new'}`}
        modeId={modeId}
        initial={initial}
        initialLevelId={phase.levelId}
        onStart={handleStart}
        onBack={() => setPhase({ tag: 'catalog' })}
      />
    );
  }

  return (
    <>
      {topTab === 'training' && phase.tag === 'training' && (
        <TrainingPortal
          modeId={phase.modeId}
          levelId={phase.levelId}
          launch={phase.launch}
          onClose={(resume) => {
            const fallbackLaunch = phase.launch;
            setPhase({
              tag: 'settings',
              modeId: phase.modeId,
              levelId: resume?.levelId ?? phase.levelId,
              launch: resume?.launch
                ? autoLaunchToLaunchSettings(resume.launch, fallbackLaunch)
                : fallbackLaunch,
            });
          }}
        />
      )}

      <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 80 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 24px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {([
              { id: 'training' as const, label: '1. Training' },
              { id: 'teacher' as const, label: '2. teacher' },
              { id: 'app' as const, label: '3. 앱 관리' },
            ]).map((t) => {
              const active = topTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTopTab(t.id)}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${active ? 'rgba(249,115,22,0.45)' : T.border}`,
                    background: active ? 'rgba(249,115,22,0.14)' : 'rgba(255,255,255,0.03)',
                    color: active ? '#F97316' : T.textDim,
                    fontWeight: active ? 900 : 700,
                    fontSize: 14,
                    letterSpacing: '0.02em',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {topTab === 'training' ? (
          <>
        <SpomoveCatalogHero />
        <header style={{
          borderBottom: `1px solid ${T.border}`,
          padding: '18px 24px 14px',
          position: 'sticky',
          top: 0,
          background: 'rgba(10,10,10,0.72)',
          zIndex: 20,
          backdropFilter: 'blur(18px)',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      fontWeight: 950,
                      letterSpacing: '-0.02em',
                      boxShadow: '0 10px 22px rgba(0,0,0,0.35)',
                      flexShrink: 0,
                    }}
                  >
                    S
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.22em', color: T.muted, fontWeight: 800, margin: 0 }}>
                      SPOKEDU · SPOMOVE
                    </p>
                    <h1 style={{
                      fontSize: 'clamp(20px, 2.6vw, 28px)',
                      fontWeight: 950,
                      color: T.text,
                      margin: 0,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.05,
                    }}>
                      트레이닝
                    </h1>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                  minWidth: 560,
                  fontFamily: 'inherit',
                }}
              >
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {TRAINING_MATRIX_HEADERS.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        style={{
                          padding: '9px 10px',
                          textAlign: h === '축' ? 'left' : 'center',
                          borderBottom: `1px solid ${T.border}`,
                          color: T.text,
                          fontWeight: 900,
                          letterSpacing: h === '축' ? '0.02em' : '0.04em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TRAINING_MATRIX_ROWS.map((row) => (
                    <tr key={row.axis}>
                      <th
                        scope="row"
                        style={{
                          padding: '9px 10px',
                          fontWeight: 900,
                          color: T.text,
                          borderBottom: `1px solid ${T.border}`,
                          textAlign: 'left',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                        }}
                      >
                        {row.axis}
                      </th>
                      {[row.s1, row.s2, row.s3, row.s4].map((cell, ci) => (
                        <td
                          key={`${row.axis}-${ci}`}
                          style={{
                            padding: '9px 10px',
                            color: T.textDim,
                            borderBottom: `1px solid ${T.border}`,
                            textAlign: 'center',
                            fontWeight: 650,
                            lineHeight: 1.35,
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 6, marginTop: 12, paddingBottom: 2 }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.code;
                const accent =
                  tab.code === 'ALL'
                    ? 'rgba(255,255,255,0.72)'
                    : tab.code === 'EWM'
                      ? MODES.gonogo?.accent ?? '#F97316'
                      : Object.values(MODES).find((m) => m.coreCode === tab.code)?.accent ?? 'rgba(255,255,255,0.65)';
                return (
                  <button
                    key={tab.code}
                    type="button"
                    onClick={() => setActiveTab(tab.code)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 14,
                      border: `1px solid ${isActive ? `${accent}55` : T.border}`,
                      background: isActive ? `${accent}18` : 'rgba(255,255,255,0.03)',
                      color: isActive ? accent : T.muted,
                      fontWeight: isActive ? 900 : 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      whiteSpace: 'normal',
                      minHeight: 54,
                      letterSpacing: '0.02em',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxShadow: isActive ? `0 10px 24px ${accent}14` : 'none',
                      transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease',
                    }}
                  >
                    <span style={{ display: 'block', lineHeight: 1.25 }}>{tab.label}</span>
                    <span style={{ display: 'block', marginTop: 3, color: isActive ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.24)', fontSize: 10, fontWeight: 700, letterSpacing: 0 }}>
                      {tab.sub}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 0' }}>
          <style>{`
            .spmt-card:hover { transform: translateY(-2px) !important; border-color: rgba(255,255,255,0.16) !important; box-shadow: 0 16px 38px rgba(0,0,0,0.45) !important; }
            .spmt-card:active { transform: translateY(-1px) scale(0.99) !important; }
            .spmt-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
            .spmt-title { font-size: 1.4rem; }
            .spmt-desc { font-size: 0.95rem; }
            @media (max-width: 767px) {
              .spmt-title { font-size: 1.02rem; }
              .spmt-desc { font-size: 0.84rem; min-height: 68px !important; }
              .spmt-card { min-height: 220px !important; }
            }
            @media (min-width: 768px) and (max-width: 1199px) {
              .spmt-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .spmt-title { font-size: 1.12rem; }
              .spmt-desc { font-size: 0.88rem; }
              .spmt-card { min-height: 236px !important; }
            }
            @media (min-width: 1200px) {
              .spmt-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
              .spmt-title { font-size: 1.26rem; }
              .spmt-desc { font-size: 0.92rem; }
            }
            @media (prefers-reduced-motion: reduce) {
              .spmt-card { transition: none !important; }
              .spmt-card:hover { transform: none !important; }
              .spmt-card:active { transform: none !important; }
            }
          `}</style>
          <div className="spmt-grid">
            {visibleModeIds.map((modeId) => (
              <CatalogModeCard key={modeId} modeId={modeId} onPick={handlePick} />
            ))}
          </div>
        </main>
          </>
        ) : topTab === 'app' ? (
          <AppManagementTab />
        ) : null}
      </div>
    </>
  );
}

export default function SpomoveTrainingPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: T.bg,
            color: T.muted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            fontSize: 12,
            letterSpacing: '0.14em',
            fontWeight: 600,
          }}
        >
          로딩 중…
        </div>
      }
    >
      <SpomoveTrainingPageContent />
    </Suspense>
  );
}

