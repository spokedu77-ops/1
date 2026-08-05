'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';

import { TRAINING_ENGINE_GUIDE_VIDEOS } from '@/app/lib/spomove/trainingEngineGuideVideos';
import { youtubeWatchOrShareToEmbedSrc } from '@/app/lib/spomove/youtubeEmbed';

import {
  MODES,
  SPOMOVE_AXIS_META,
  SPOMOVE_AXIS_ORDER,
  SPOMOVE_BOTTOM_CATALOG_SLOT_IDS,
  SPOMOVE_CATALOG_SLOT_IDS,
  reactTrainEngineLevelForUi,
  resolveReactTrainUiLevel,
  catalogReactTrainUiLevel,
  catalogBasicUiLevel,
  catalogSpatialUiLevel,
  isModifiedQuadrantLevel,
  isFront3PanelLevel,
  isColorSequenceLevel,
  isColorNumberLevel,
  modifiedQuadrantStage,
  modifiedQuadrantLevelFromStage,
  colorSequenceOption,
  colorSequenceLevelFromOption,
  type ColorSequenceOption,
  type SpomoveAxis,
} from './_player/constants';
import { GUIDE_BLOCKS } from './_player/trainingGuideContent';
import type { MemoryGameAutoLaunch, TrainingExitResume } from './_player/MemoryGameApp';
import { forceUnlockViewportScroll } from './_player/lib/lockViewportScroll';
import { SpomoveCatalogHero } from './_player/components/SpomoveCatalogHero';
import { SpeedSelector } from './_player/components/SpeedSelector';
import {
  SPOMOVE_COLOR_THEME_LABELS,
  SPOMOVE_COLOR_THEME_ORDER,
  SPOMOVE_VARIANT_THEME_LS_KEY,
  type SpomoveColorThemeId,
} from './_player/lib/spomoveVariantThemeConfig';
import { MemoryColorSlotsPicker } from './_player/components/MemoryColorSlotsPicker';
import {
  DEFAULT_MEMORY_COLOR_SLOTS,
  normalizeMemoryColorSlots,
  type SpomoveMemoryColorId,
} from './_player/lib/memoryColorSlots';
import { loadFlowPresets, saveFlowPresets, type FlowPreset } from './_player/lib/flowPresets';
import { DIVE_THEME_UI, normalizeDiveThemeId, type DiveThemeId } from '@/app/lib/spomove/diveThemes';
import { VariantAppendixFullscreen } from './_player/components/VariantAppendixFullscreen';
import { useSpomoveDiveEnvironments } from '@/app/lib/admin/hooks/useSpomoveDiveEnvironments';

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

type TabCode = 'ALL' | 'response' | 'attention' | 'executive';


const TABS: { code: TabCode; label: string; sub: string }[] = [
  { code: 'ALL', label: '전체', sub: '6개 핵심 프로그램 전체' },
  ...SPOMOVE_AXIS_ORDER.map((axis) => ({
    code: axis as TabCode,
    label: SPOMOVE_AXIS_META[axis].title,
    sub: SPOMOVE_AXIS_META[axis].tabSub,
  })),
];

const AXIS_GROUPS: ReadonlyArray<{
  axisCode: SpomoveAxis;
  title: string;
  enTitle: string;
  salesCopy: string;
  desc: string;
}> = SPOMOVE_AXIS_ORDER.map((axisCode) => ({
  axisCode,
  title: SPOMOVE_AXIS_META[axisCode].title,
  enTitle: SPOMOVE_AXIS_META[axisCode].enTitle,
  salesCopy: SPOMOVE_AXIS_META[axisCode].salesCopy,
  desc: SPOMOVE_AXIS_META[axisCode].desc,
}));

type TopTab = 'training' | 'teacher' | 'app';
const TEACHER_SPOMOVE_URL = '/teacher/spomove';

/** 카탈로그 배열 순서로 1번·2번… (엔진 id와 무관) */
function levelLabel(modeId: string, levelId: number): string {
  const m = MODES[modeId];
  const catalogId =
    modeId === 'basic'
      ? catalogBasicUiLevel(levelId)
      : modeId === 'spatial'
        ? catalogSpatialUiLevel(levelId)
        : levelId;
  const idx = m?.levels.findIndex((lv) => lv.id === catalogId) ?? -1;
  if (idx >= 0) return `${idx + 1}번`;
  return `${levelId}번`;
}

function modeLabelKoEn(modeId: string): string {
  const m = MODES[modeId];
  if (!m) return modeId;
  return `${m.title} (${m.en})`;
}

const LEVEL_KO_ALIAS_BY_EN: Record<string, string> = {
  'Arrow / Color Arrow': '공간방향 자극',
  '4-Quadrant Stimulus': '4분할 자극',
  'Full-Screen Single Stimulus': '전면단일 자극',
  '2-Split Stimulus': '2분할 자극',
  '3-Split Stimulus': '3분할 자극',
  'Random-Split Stimulus': '랜덤분할 자극',
  '(On Hold) Hand and Foot Separate Migration': '(보류) 손 따로, 발 따로 이관 예정',
  'Quad Color': '4분할 자극',
  'Modified Quadrant': '(보류) 손 따로, 발 따로 이관 예정',
  'Modified Quadrant L1': '(보류) 손 따로, 발 따로 이관 예정',
  'Modified Quadrant L2': '(보류) 손 따로, 발 따로 이관 예정',
  'Modified Quadrant L3': '(보류) 손 따로, 발 따로 이관 예정',
  'Modified Quadrant L4': '(보류) 손 따로, 발 따로 이관 예정',
  'Full-Screen Color': '전면단일 자극',
  'Variant Color (1)': '2분할 자극',
  'Variant Color 1': '2분할 자극',
  'Variant Color (2)': '3분할 자극',
  'Variant Color 2': '3분할 자극',
  'Variant Color 2/3': '3분할 자극',
  'Variant 3': '랜덤분할 자극',
  'Spatial Orientation': '공간방향 자극',
  'Spatial Orientation (Color)': '색상화살표',
  'Color Arrow': '색상화살표',
  'Arrow Stroop / Reverse': '색상화살표',
  'Arrow + BG Interference': '(보류) 화살표 배경간섭',
  'Word': '단어',
  'Word Stroop / Reverse': '단어',
  'Word + BG': '단어 + 배경',
  'Missing Color': '누락 색상 찾기',
  'Pole Shape': '폴 도형',
  'Pole Arrows': '폴 화살표',
  'Uniform Flankers': '동일 플랭커',
  'Random Flankers': '랜덤 자극',
  '(On Hold) Nested Circles': '(보류) 원 속의 원',
  'Nested Circles': '(보류) 원 속의 원',
  'Arrow Flanker': '화살표',
  'Theme Flanker': '테마 플랭커',
  'Mixed Size & Color': '크기/색 혼합',
  'Extreme': '극단',
  '5-Circle Extreme Sizes': '극단',
  'Go / No-Go (Color)': '색상 고/노고',
  'Go / No-Go (Shape)': '도형 고/노고',
  'Go / No-Go (Action)': '동작 고/노고',
  'Go / No-Go (Dual)': '이중 규칙 고/노고',
  'Task Switching (Text Cues)': '텍스트 큐 전환',
  'Task Switching (Icon Cues)': '아이콘 큐 전환',
  'Task Switching (Border Cues)': '테두리 큐 전환',
  '3항 기억': '순서 기억',
  '5항 기억': '순서 기억',
  '10항 기억': '순서 기억',
  '색깔-번호 기억': '색·번호 기억',
  '색깔-번호 전체 공개': '색·번호 기억',
  '3-Color Sequence': '순서 기억',
  '5-Color Sequence': '순서 기억',
  '10-Color Sequence': '순서 기억',
  'Color Sequence': '순서 기억',
  'Color-Number Quiz': '색·번호 기억',
  'Color-Number Full Board': '색·번호 기억',
  'Color-Number': '색·번호 기억',
  'Custom 10-Color Sequence': '직접 지정 10색',
  'Color-Number Integration': '색상-숫자 통합',
  'Color & Arrow': '색상 & 화살표',
  'Flow Program': '플로우 프로그램',
  'Rhythm Program': '리듬 프로그램',
  'Balloon Pop': '풍선 터뜨리기',
  'Falling Bricks': '떨어지는 벽돌',
  'Wave Dodge': '파도 피하기',
  FLOW: '떨어지는 벽돌',
  FLASH: '풍선 터뜨리기',
  'Beat Wave': '동그라미 파동',
  Rush: '파도 피하기',
  Camouflage: '매직 아이',
  'Camouflage L1': '매직 아이',
  'Camouflage L2': '매직 아이',
  'Mole Easy': '두더지 잡기',
  Mole: '두더지 잡기',
  'Mole L1': '두더지 잡기',
  'Mole L2': '두더지 잡기',
  Wormhole: '소행성을 피해라',
  'Number Train': '숫자 연산 기차',
  'Number Train L1': '숫자 연산 기차',
  'Number Train L2': '숫자 연산 기차',
  'Number Train L3': '숫자 연산 기차',
  'Color Tracker': '흰 공 찾기',
  'Color Tracker L1': '흰 공 찾기',
  'Color Tracker L2': '흰 공 찾기',
  'Color Tracker L3': '흰 공 찾기',
  Goalkeeper: '축구 : 골키퍼',
  'Soccer Goalkeeper': '축구 : 골키퍼',
  'Hand and Foot Separate': '손 따로, 발 따로',
  'Hand and Foot Separate Easy': '손 따로, 발 따로',
  'Hand and Foot Separate Normal': '손 따로, 발 따로 (보통)',
  'Hand and Foot Separate Hard': '손 따로, 발 따로 (어려움)',
  '(On Hold) Number Train': '(보류) 숫자 연산 기차',
  '(On Hold) Color Memory Grid': '(보류) 색 기억 그리드',
  '(On Hold) Virus Outbreak': '(보류) 바이러스 폭증',
};

function levelNameEnDisplay(enName: string): string {
  return enName
    .replace('Spatial Orientation', 'Arrow / Color Arrow')
    .replace('Quad Color', '4-Quadrant Stimulus')
    .replace('Full-Screen Color', 'Full-Screen Single Stimulus')
    .replace('Variant Color (1)', '2-Split Stimulus')
    .replace('Variant Color 1', '2-Split Stimulus')
    .replace('Variant Color (2)', '3-Split Stimulus')
    .replace('Variant Color 2/3', '3-Split Stimulus')
    .replace('Variant Color 2', '3-Split Stimulus')
    .replace('Variant 3', 'Random-Split Stimulus')
    .replace('Modified Quadrant', '(On Hold) Hand and Foot Separate Migration');
}

function levelNameKo(modeId: string, levelId: number): string {
  const m = MODES[modeId];
  const catalogId =
    modeId === 'basic'
      ? catalogBasicUiLevel(levelId)
      : modeId === 'spatial'
        ? catalogSpatialUiLevel(levelId)
        : levelId;
  const lv = m?.levels.find((x) => x.id === catalogId);
  if (lv?.enName) {
    const byEn = LEVEL_KO_ALIAS_BY_EN[lv.enName];
    if (byEn) return byEn;
  }
  return lv?.name ?? levelLabel(modeId, levelId);
}

function levelLabelKoEn(modeId: string, levelId: number): string {
  const m = MODES[modeId];
  const catalogId =
    modeId === 'basic'
      ? catalogBasicUiLevel(levelId)
      : modeId === 'spatial'
        ? catalogSpatialUiLevel(levelId)
        : levelId;
  const lv = m?.levels.find((x) => x.id === catalogId);
  if (!lv) return levelLabel(modeId, levelId);
  const enDisplay = levelNameEnDisplay(lv.enName);
  return `${levelLabel(modeId, levelId)} : ${levelNameKo(modeId, levelId)} (${enDisplay})`;
}

function pickDefaultTimeMode(modeId: string): 'time' | 'reps' {
  return modeId === 'reactTrain' ? 'time' : 'reps';
}

type FlowFeatureKey = 'faster' | 'punch' | 'duck' | 'reach' | 'kick' | 'colorGate';

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
  /** 반응인지 1번 · 공간 방향: 기본(흰 화살표) | 색상(위 빨·좌 초·우 노·아래 파) */
  spatialArrowColorMode: 'basic' | 'color';
  flankerStimulusType: 'color' | 'number';
  flankerNestedCircleCount: 3 | 5;
  flankerExtremeMode: 'theme' | 'arrow';
  flankerArrowMode: 'lr' | 'udlr';
  stroopWordMode: 'bg' | 'missing';
  stroopArrowMode: 'basic' | 'bg';
  stroopWordDifficulty: 'basic' | 'bg';
  flowFeatures: FlowFeatureKey[];
  diveEnvironmentTheme: DiveThemeId;
  flowDuration: number;
  /** 시지각반응(reactTrain) 플로우(1번) 전용: 동시 낙하 신호 수 */
  reactTrainConcurrent: 1 | 2 | 3;
  /** 시지각반응(reactTrain) 숫자 연산 기차(엔진 8) 전용: L1/L2/L3 */
  numberCartTier: 1 | 2 | 3;
  /** 시지각반응(reactTrain) 흰 공 찾기(9번) 전용: 1=느림 · 3=빠름 */
  colorTrackerTier: 1 | 2 | 3;
  /** 시지각반응(reactTrain) 흰 공 찾기(9번) 전용: false=보통 1패널 · true=어려움 2패널 */
  colorTrackerDualPanel: boolean;
  /** 시지각반응(reactTrain) 두더지 잡기(6번) 전용: 기존(눈·코) / 변형(모자·선글라스 등) */
  moleLookMode: 'classic' | 'variant';
  /** 시지각반응(reactTrain) 두더지 잡기(6번) 전용: 본 활동 뒤 30초 보너스타임 */
  moleBonusTimeEnabled: boolean;
  /** 레거시·사이먼 매직 아이: 극단(variant)만 사용 */
  camouflagePlacement: 'center' | 'variant';
  /** 시지각반응(reactTrain) 골키퍼(10번) 전용: 1=항상 1개 · 2=1~2개(더블) */
  goalkeeperTier: 1 | 2;
  goalkeeperBonusTimeEnabled: boolean;
  handFootDifficulty: 'easy' | 'normal' | 'hard';
  /** 시지각반응(reactTrain) 색 기억 그리드(12) 전용: 3×3 / 4×4 / 5×5 */
  colorMemoryGridSize: 3 | 4 | 5;
  /** 시지각반응(reactTrain) 색 기억 그리드(12) 전용: flicker=깜빡이 · oneshot=원샷 */
  colorMemoryGridMode: 'flicker' | 'oneshot';
  /** 시지각반응(reactTrain) 바이러스 폭증(13) 전용: easy/normal/hard */
  virusOutbreakDifficulty: 'easy' | 'normal' | 'hard';
  /** 사이먼 폴 도형·화살표: 1=기본 1개 · 2=응용 2개 */
  simonPoleCount: 1 | 2;
  /** 변형 사분할(7·8·9) — easy 고정(레거시 필드) */
  bodyLabelMode: 'easy' | 'hard';
  /** 순차 기억 6단계: 1~10번 슬롯 색상 */
  memoryColorSlots: SpomoveMemoryColorId[];
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
  spatialArrowColorMode: 'basic',
  flankerStimulusType: 'color',
  flankerNestedCircleCount: 5,
  flankerExtremeMode: 'theme',
  flankerArrowMode: 'udlr',
  stroopWordMode: 'bg',
  stroopArrowMode: 'basic',
  stroopWordDifficulty: 'basic',
  flowFeatures: [],
  diveEnvironmentTheme: 'space',
  flowDuration: 25,
  reactTrainConcurrent: 2,
  numberCartTier: 2,
  colorTrackerTier: 1,
  colorTrackerDualPanel: false,
  moleLookMode: 'classic',
  moleBonusTimeEnabled: false,
  camouflagePlacement: 'variant',
  goalkeeperTier: 2,
  goalkeeperBonusTimeEnabled: false,
  handFootDifficulty: 'easy',
  colorMemoryGridSize: 4,
  colorMemoryGridMode: 'flicker',
  virusOutbreakDifficulty: 'normal',
  simonPoleCount: 1,
  bodyLabelMode: 'easy',
  memoryColorSlots: [...DEFAULT_MEMORY_COLOR_SLOTS],
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
    spatialArrowColorMode: auto.spatialArrowColorMode === 'color' ? 'color' : fallback.spatialArrowColorMode,
    flankerStimulusType: auto.flankerStimulusType ?? fallback.flankerStimulusType,
    flankerNestedCircleCount: auto.flankerNestedCircleCount === 3 ? 3 : (fallback.flankerNestedCircleCount ?? 5),
    flankerExtremeMode: auto.flankerExtremeMode === 'arrow' ? 'arrow' : (fallback.flankerExtremeMode ?? 'theme'),
    flankerArrowMode: auto.flankerArrowMode ?? fallback.flankerArrowMode,
    stroopWordMode: auto.stroopWordMode === 'missing' ? 'missing' : (fallback.stroopWordMode ?? 'bg'),
    stroopArrowMode: auto.stroopArrowMode === 'bg' ? 'bg' : (fallback.stroopArrowMode ?? 'basic'),
    stroopWordDifficulty: auto.stroopWordDifficulty === 'bg' ? 'bg' : (fallback.stroopWordDifficulty ?? 'basic'),
    flowFeatures: (auto.flowFeatures ?? fallback.flowFeatures) as FlowFeatureKey[],
    diveEnvironmentTheme: normalizeDiveThemeId(auto.diveEnvironmentTheme ?? fallback.diveEnvironmentTheme),
    flowDuration: auto.flowDuration ?? fallback.flowDuration,
    reactTrainConcurrent: (auto.reactTrainConcurrent as 1 | 2 | 3 | undefined) ?? fallback.reactTrainConcurrent,
    numberCartTier: (auto.numberCartTier as 1 | 2 | 3 | undefined) ?? fallback.numberCartTier,
    colorTrackerTier: (auto.colorTrackerTier as 1 | 2 | 3 | undefined) ?? fallback.colorTrackerTier,
    colorTrackerDualPanel: auto.colorTrackerDualPanel ?? fallback.colorTrackerDualPanel,
    moleLookMode: auto.moleLookMode === 'variant' ? 'variant' : fallback.moleLookMode,
    moleBonusTimeEnabled: typeof auto.moleBonusTimeEnabled === 'boolean' ? auto.moleBonusTimeEnabled : fallback.moleBonusTimeEnabled,
    camouflagePlacement: 'variant',
    goalkeeperTier: auto.goalkeeperTier === 1 ? 1 : fallback.goalkeeperTier,
    goalkeeperBonusTimeEnabled: typeof auto.goalkeeperBonusTimeEnabled === 'boolean' ? auto.goalkeeperBonusTimeEnabled : fallback.goalkeeperBonusTimeEnabled,
    handFootDifficulty:
      auto.handFootDifficulty === 'normal' || auto.handFootDifficulty === 'hard'
        ? auto.handFootDifficulty
        : fallback.handFootDifficulty,
    colorMemoryGridSize:
      auto.colorMemoryGridSize === 3 || auto.colorMemoryGridSize === 5
        ? auto.colorMemoryGridSize
        : fallback.colorMemoryGridSize,
    colorMemoryGridMode: auto.colorMemoryGridMode === 'oneshot' ? 'oneshot' : fallback.colorMemoryGridMode,
    virusOutbreakDifficulty:
      auto.virusOutbreakDifficulty === 'easy' || auto.virusOutbreakDifficulty === 'hard'
        ? auto.virusOutbreakDifficulty
        : fallback.virusOutbreakDifficulty,
    simonPoleCount: auto.simonPoleCount === 2 ? 2 : fallback.simonPoleCount,
    bodyLabelMode: auto.bodyLabelMode ?? fallback.bodyLabelMode,
    memoryColorSlots: normalizeMemoryColorSlots(auto.memoryColorSlots ?? fallback.memoryColorSlots),
  };
}

const FLOW_COLOR_GATE_LEVEL_ID = 2;

function isFlowColorGateLevel(modeId: string, levelId: number): boolean {
  return modeId === 'flow' && levelId === FLOW_COLOR_GATE_LEVEL_ID;
}

function launchSettingsForLevel(modeId: string, levelId: number, launch: LaunchSettings): LaunchSettings {
  if (isFlowColorGateLevel(modeId, levelId)) {
    return launch.flowFeatures.length === 1 && launch.flowFeatures[0] === 'colorGate'
      ? launch
      : { ...launch, flowFeatures: ['colorGate'] };
  }

  if (modeId === 'flow' && launch.flowFeatures.includes('colorGate')) {
    return { ...launch, flowFeatures: launch.flowFeatures.filter((key) => key !== 'colorGate') };
  }

  if (modeId === 'flanker' && (levelId === 4 || levelId === 5 || levelId === 6) && launch.flankerStimulusType !== 'color') {
    return { ...launch, flankerStimulusType: 'color' };
  }

  if (modeId === 'flanker' && levelId === 1 && launch.flankerStimulusType !== 'color') {
    return { ...launch, flankerStimulusType: 'color' };
  }

  return launch;
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
  useEffect(() => () => forceUnlockViewportScroll(), []);

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
    spatialArrowColorMode: launch.spatialArrowColorMode,
    flankerStimulusType: launch.flankerStimulusType,
    flankerNestedCircleCount: launch.flankerNestedCircleCount,
    flankerExtremeMode: launch.flankerExtremeMode,
    flankerArrowMode: launch.flankerArrowMode,
    stroopWordMode: launch.stroopWordMode,
    stroopArrowMode: launch.stroopArrowMode,
    stroopWordDifficulty: launch.stroopWordDifficulty,
    flowFeatures: launch.flowFeatures,
    diveEnvironmentTheme: launch.diveEnvironmentTheme,
    flowDuration: launch.flowDuration,
    reactTrainConcurrent: launch.reactTrainConcurrent,
    numberCartTier: launch.numberCartTier,
    colorTrackerTier: launch.colorTrackerTier,
    colorTrackerDualPanel: launch.colorTrackerDualPanel,
    moleLookMode: launch.moleLookMode,
    moleBonusTimeEnabled: launch.moleBonusTimeEnabled,
    camouflagePlacement: launch.camouflagePlacement,
    goalkeeperTier: launch.goalkeeperTier,
    goalkeeperBonusTimeEnabled: launch.goalkeeperBonusTimeEnabled,
    handFootDifficulty: launch.handFootDifficulty,
    colorMemoryGridSize: launch.colorMemoryGridSize,
    colorMemoryGridMode: launch.colorMemoryGridMode,
    virusOutbreakDifficulty: launch.virusOutbreakDifficulty,
    simonPoleCount: launch.simonPoleCount,
    bodyLabelMode: launch.bodyLabelMode,
    memoryColorSlots: launch.memoryColorSlots,
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      background: '#020617',
    }}>
      <MemoryGameApp
        key={`${modeId}-${levelId}-${launch.speed}-${launch.timeMode}-${launch.duration}-${launch.targetReps}-${launch.warmup}-${launch.accel}-${launch.intervalMode}-${launch.kidsSafeMode}-${launch.numberRule}-${launch.variantColorTheme}-${launch.spatialArrowColorMode}-${launch.flankerStimulusType}-${launch.flankerNestedCircleCount}-${launch.flankerExtremeMode}-${launch.flankerArrowMode}-${launch.stroopWordMode}-${launch.stroopArrowMode}-${launch.stroopWordDifficulty}-${launch.flowFeatures.join(',')}-${launch.diveEnvironmentTheme}-${launch.flowDuration}-${launch.numberCartTier}-${launch.colorTrackerTier}-${launch.colorTrackerDualPanel}-${launch.moleLookMode}-${launch.moleBonusTimeEnabled}-${launch.camouflagePlacement}-${launch.goalkeeperTier}-${launch.goalkeeperBonusTimeEnabled}-${launch.handFootDifficulty}-${launch.colorMemoryGridSize}-${launch.colorMemoryGridMode}-${launch.virusOutbreakDifficulty}-${launch.simonPoleCount}-${launch.memoryColorSlots.join(',')}`}
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
  if (!m || m.isHidden) return null;

  return (
    <button
      type="button"
      onClick={() => onPick(modeId)}
      className="spmt-card"
      style={{
        position: 'relative',
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        background: T.card,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 240,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        padding: 0,
        boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
        transform: 'translateY(0px)',
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
      }}>
      <div aria-hidden style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        background: m.accent,
        borderRadius: '18px 18px 0 0',
      }} />
      <div style={{ padding: '18px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${m.accent}18`,
              border: `1px solid ${m.accent}33`,
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {m.icon}
          </span>
          {m.axisTitle ? (
            <span style={{
              padding: '3px 9px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.06em',
              background: `${m.accent}18`,
              color: m.accent,
              border: `1px solid ${m.accent}30`,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {m.axisTitle}
            </span>
          ) : null}
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="spmt-title" style={{ fontWeight: 950, color: T.text, lineHeight: 1.2, letterSpacing: '-0.02em', wordBreak: 'keep-all' }}>
            {m.title}
          </div>
          <div style={{ marginTop: 3, fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.05em' }}>
            {m.en}
          </div>
        </div>
        <p className="spmt-desc" style={{ margin: '10px 0 0', color: T.textDim, lineHeight: 1.62, wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {m.desc}
        </p>
      </div>

      <div style={{ marginTop: 'auto', padding: '0 18px 18px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 16px',
          borderRadius: 12,
          border: `1px solid ${m.accent}40`,
          background: `${m.accent}12`,
          color: m.accent,
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '0.04em',
        }}>
          설정으로 →
        </div>
      </div>
    </button>
  );
}

function CatalogBottomPrograms({ onPick }: { onPick: (modeId: string) => void }) {
  const ids = SPOMOVE_BOTTOM_CATALOG_SLOT_IDS.filter((id) => {
    const m = MODES[id];
    return m && !m.isHidden;
  });
  if (ids.length === 0) return null;

  const accent = MODES[ids[0]]?.accent ?? '#06B6D4';

  return (
    <section style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${T.border}` }}>
      <div style={{ marginBottom: 16, paddingLeft: 14, borderLeft: `3px solid ${accent}` }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: accent, letterSpacing: '0.2em' }}>
          IMMERSION · DIVE
        </p>
        <h2 style={{ margin: '4px 0 4px', fontSize: 20, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>
          3D 몰입 프로그램
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.55 }}>
          4색 패드 훈련과 별도로, 화면 안에서 달리고 동작하는 몰입형 DIVE MODE입니다.
        </p>
      </div>
      <div className="spmt-grid">
        {ids.map((modeId) => (
          <CatalogModeCard key={modeId} modeId={modeId} onPick={onPick} />
        ))}
      </div>
    </section>
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
    const candidate =
      typeof initialLevelId === 'number' ? initialLevelId : (m?.levels?.[0]?.id ?? 1);
    if (modeId === 'reactTrain') {
      const normalized = catalogReactTrainUiLevel(candidate);
      if (m?.levels?.some((lv) => lv.id === normalized)) return normalized;
    }
    if (modeId === 'basic') {
      // 변형사분할·3분할은 엔진 level을 유지하고 카탈로그만 묶음
      if (isModifiedQuadrantLevel(candidate) || isFront3PanelLevel(candidate)) return candidate;
      const normalized = catalogBasicUiLevel(candidate);
      if (m?.levels?.some((lv) => lv.id === normalized)) return normalized;
    }
    if (modeId === 'spatial') {
      if (isColorSequenceLevel(candidate) || isColorNumberLevel(candidate) || candidate === 6) {
        return candidate;
      }
      const normalized = catalogSpatialUiLevel(candidate);
      if (m?.levels?.some((lv) => lv.id === normalized)) return normalized;
    }
    if (m?.levels?.some((lv) => lv.id === candidate)) return candidate;
    return m?.levels?.[0]?.id ?? 1;
  });
  const [launch, setLaunch] = useState<LaunchSettings>(() => {
    if (modeId !== 'reactTrain' || typeof initialLevelId !== 'number') return initial;
    const mapped = resolveReactTrainUiLevel(initialLevelId);
    return {
      ...initial,
      ...(mapped.moleLookMode ? { moleLookMode: mapped.moleLookMode } : {}),
      ...(typeof initial.moleBonusTimeEnabled === 'boolean' ? { moleBonusTimeEnabled: initial.moleBonusTimeEnabled } : {}),
      ...(mapped.numberCartTier ? { numberCartTier: mapped.numberCartTier } : {}),
      ...(mapped.colorTrackerTier ? { colorTrackerTier: mapped.colorTrackerTier } : {}),
      ...(mapped.goalkeeperTier ? { goalkeeperTier: mapped.goalkeeperTier } : {}),
      ...(typeof initial.goalkeeperBonusTimeEnabled === 'boolean' ? { goalkeeperBonusTimeEnabled: initial.goalkeeperBonusTimeEnabled } : {}),
      ...(initial.handFootDifficulty ? { handFootDifficulty: initial.handFootDifficulty } : {}),
      ...(mapped.camouflagePlacement ? { camouflagePlacement: mapped.camouflagePlacement } : {}),
    };
  });
  const [guideOpen, setGuideOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showVariantAppendix, setShowVariantAppendix] = useState(false);

  // ── Flow 즐겨찾기 ──────────────────────────────────────────────────────────
  const [flowPresets, setFlowPresets] = useState<FlowPreset[]>(() => loadFlowPresets());
  const [flowPresetError, setFlowPresetError] = useState<string | null>(null);
  const { data: diveEnvData } = useSpomoveDiveEnvironments();

  const saveFlowPreset = () => {
    const name = window.prompt('즐겨찾기 이름', `세팅 ${flowPresets.length + 1}`);
    if (!name) return;
    const next: FlowPreset[] = [...flowPresets, { id: Date.now().toString(), name, features: [...launch.flowFeatures], environmentTheme: launch.diveEnvironmentTheme, duration: launch.flowDuration }];
    const result = saveFlowPresets(next);
    if (!result.success) { setFlowPresetError(result.error); return; }
    setFlowPresets(next);
    setFlowPresetError(null);
  };
  const loadFlowPreset = (p: FlowPreset) => setLaunch((s) => ({ ...s, flowFeatures: [...p.features] as FlowFeatureKey[], diveEnvironmentTheme: p.environmentTheme, flowDuration: p.duration }));
  const deleteFlowPreset = (id: string) => {
    const next = flowPresets.filter((p) => p.id !== id);
    const result = saveFlowPresets(next);
    if (!result.success) { setFlowPresetError(result.error); return; }
    setFlowPresets(next);
    setFlowPresetError(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 훈련 복귀 시에는 initial(launch)에 담긴 테마를 유지. 그 외에는 색상 기본값.
    if (typeof initialLevelId === 'number') return;
    setLaunch((s) => ({ ...s, variantColorTheme: 'color', basicNumberOverlay: 'none' }));
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
  const isSimon = modeId === 'simon';
  const isFlowOrChallenge = modeId === 'flow';
  const isColorGateTheme = isFlowColorGateLevel(modeId, levelId);

  useEffect(() => {
    if (!isFlowOrChallenge) return;
    setLaunch((s) => launchSettingsForLevel(modeId, levelId, s));
  }, [isFlowOrChallenge, levelId, modeId]);

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
                    {guidePhase ? (
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ margin: '10px 0 8px', fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.12em' }}>
                          {guidePhase.num} {guidePhase.name}
                          <span style={{ fontWeight: 600, color: T.textDim }}> · {guideBlock.tag}</span>
                        </p>
                        <p style={{ margin: '0 0 12px', fontSize: 12, color: T.text, lineHeight: 1.65 }}>{guidePhase.goal}</p>
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>화면</strong> {guidePhase.screen}</p>
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>실행</strong> {guidePhase.action}</p>
                        <p style={{ margin: guidePhase.pitfall ? '0 0 6px' : 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>코치</strong> {guidePhase.coach}</p>
                        {guidePhase.pitfall ? (
                          <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>주의</strong> {guidePhase.pitfall}</p>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <p style={{ margin: '10px 0 10px', fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.12em' }}>{guideBlock.tag}</p>
                        <p style={{ margin: '0 0 14px', fontSize: 12, color: T.text, lineHeight: 1.65 }}>{guideBlock.intro}</p>
                        <p style={{ margin: '0 0 12px', fontSize: 12, color: T.muted }}>
                          이 모드·난이도에 해당하는 단계별 상세 문단은 가이드에 없습니다.
                        </p>
                      </>
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
                const active =
                  modeId === 'basic'
                    ? catalogBasicUiLevel(levelId) === lv.id
                    : modeId === 'spatial'
                      ? catalogSpatialUiLevel(levelId) === lv.id
                      : levelId === lv.id;
                return (
                  <button
                    key={lv.id}
                    type="button"
                    onClick={() => {
                      setLevelId((current) => {
                        if (modeId === 'basic' && lv.id === 7) {
                          return isModifiedQuadrantLevel(current) ? current : 7;
                        }
                        if (modeId === 'basic' && lv.id === 5) {
                          return isFront3PanelLevel(current) ? current : 5;
                        }
                        if (modeId === 'spatial' && lv.id === 1) {
                          return isColorSequenceLevel(current) ? current : 1;
                        }
                        if (modeId === 'spatial' && lv.id === 4) {
                          return isColorNumberLevel(current) ? current : 4;
                        }
                        return lv.id;
                      });
                      setLaunch((s) => {
                        let next = launchSettingsForLevel(modeId, lv.id, s);
                        if (isReactTrain) {
                          const mapped = resolveReactTrainUiLevel(lv.id);
                          next = {
                            ...next,
                            reactTrainConcurrent: 2,
                            camouflagePlacement: 'variant',
                            moleLookMode: mapped.moleLookMode ?? next.moleLookMode,
                            moleBonusTimeEnabled: next.moleBonusTimeEnabled,
                            numberCartTier: mapped.numberCartTier ?? next.numberCartTier,
                            colorTrackerTier: mapped.colorTrackerTier ?? next.colorTrackerTier,
                            goalkeeperTier: mapped.goalkeeperTier ?? next.goalkeeperTier,
                            goalkeeperBonusTimeEnabled: next.goalkeeperBonusTimeEnabled,
                            handFootDifficulty: next.handFootDifficulty,
                          };
                          const engineLevel = mapped.engineLevel;
                          if (engineLevel === 8) {
                            next = {
                              ...next,
                              timeMode: 'reps',
                              targetReps: [7, 10, 15, 25].includes(next.targetReps) ? next.targetReps : 10,
                            };
                          }
                          if (engineLevel === 9) {
                            next = {
                              ...next,
                              timeMode: 'reps',
                              targetReps: [2, 3, 5, 10].includes(next.targetReps) ? next.targetReps : 5,
                            };
                          }
                          if (engineLevel === 10) {
                            next = {
                              ...next,
                              timeMode: 'time',
                              duration: [30, 60, 120, 180].includes(next.duration) ? next.duration : 120,
                            };
                          }
                        }
                        return next;
                      });
                    }}
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
                      {levelLabel(modeId, lv.id)} : {levelNameKo(modeId, lv.id)} ({levelNameEnDisplay(lv.enName)})
                    </span>
                  </button>
                );
              })}
              {modeId === 'basic' && (
                <button
                  type="button"
                  onClick={() => setShowVariantAppendix((v) => !v)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `1.5px solid ${showVariantAppendix ? accent : T.border}`,
                    background: showVariantAppendix ? `${accent}16` : T.card,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 900, color: showVariantAppendix ? accent : T.text }}>
                    (부록) 연상 색지각 이미지 소개
                  </span>
                </button>
              )}
            </div>
            {modeId === 'basic' && showVariantAppendix && (
              <VariantAppendixFullscreen onClose={() => setShowVariantAppendix(false)} />
            )}
          </section>

          {/* 시지각반응 플로우(1번) 전용: 동시 자극 수 */}
          {modeId === 'flanker' && levelId !== 1 && levelId !== 2 && levelId !== 3 && levelId !== 5 && levelId !== 6 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>시작 옵션</label>
                <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                  {levelId === 4 ? '기본 색상' : launch.flankerStimulusType === 'number' ? '색상 + 숫자' : '기본 색상'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(levelId === 4 ? ([['color', '기본 색상']] as const) : ([
                  ['color', '기본 색상'],
                  ['number', '색상 + 숫자 1~5'],
                ] as const)).map(([value, label]) => {
                  const active = launch.flankerStimulusType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, flankerStimulusType: value }))}
                      style={{
                        flex: '1 1 150px',
                        padding: '11px 12px',
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
                      {active ? '✓ ' : ''}{label}
                    </button>
                  );
                })}
              </div>
              {levelId === 4 ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>원 속의 원</label>
                    <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                      {launch.flankerNestedCircleCount === 3 ? '옵션 · 3개' : '기본 · 5개'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      [5, '기본 5개'],
                      [3, '옵션 · 3개'],
                    ] as const).map(([value, label]) => {
                      const active = launch.flankerNestedCircleCount === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setLaunch((s) => ({ ...s, flankerNestedCircleCount: value }))}
                          style={{
                            flex: '1 1 150px',
                            padding: '11px 12px',
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
                          {active ? '✓ ' : ''}{label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {modeId === 'flanker' && levelId === 3 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  보통은 7개 테마의 극단 크기 원, 어려움은 상하좌우 화살표 방해 자극입니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'theme' as const, label: '보통', sub: '7개 테마' },
                  { id: 'arrow' as const, label: '어려움', sub: '화살표' },
                ]).map((opt) => {
                  const active = launch.flankerExtremeMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, flankerExtremeMode: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {modeId === 'flanker' && levelId === 1 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  가운데 화살표 방향만 보고 이동합니다. 보통은 좌우, 어려움은 상하좌우입니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'lr' as const, label: '보통', sub: '좌우 화살표' },
                  { id: 'udlr' as const, label: '어려움', sub: '상하좌우 화살표' },
                ]).map((opt) => {
                  const active = launch.flankerArrowMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, flankerArrowMode: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 플랭커 랜덤 자극/테마 · 이미지 테마 (연상 색지각과 동일 7종) */}
          {modeId === 'flanker' && (levelId === 2 || levelId === 6 || (levelId === 3 && launch.flankerExtremeMode !== 'arrow')) ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>연상 색지각 이미지 테마</label>
                <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                  {SPOMOVE_COLOR_THEME_LABELS[launch.variantColorTheme as SpomoveColorThemeId]}
                </div>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>
                연상 색지각과 동일한 7가지입니다. 색상이 기본값이며, 선택한 테마 이미지가 다섯 원 안에 나오고 가운데 원 색으로 반응합니다. 믹스는 색상을 제외한 5개 이미지 테마를 섞습니다.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SPOMOVE_COLOR_THEME_ORDER.map((tid) => {
                  const active = launch.variantColorTheme === tid;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => {
                        setLaunch((s) => ({
                          ...s,
                          variantColorTheme: tid,
                          basicNumberOverlay: tid === 'color' ? s.basicNumberOverlay : 'none',
                        }));
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

          {modeId === 'basic' && levelId === 1 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                  {launch.spatialArrowColorMode === 'color' ? '보통 · 색상 화살표' : '쉬움 · 화살표'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([
                  { value: 'basic' as const, label: '쉬움', sub: '화살표' },
                  { value: 'color' as const, label: '보통', sub: '색상 화살표' },
                ]).map((option) => {
                  const { value, label, sub } = option;
                  const active = launch.spatialArrowColorMode === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, spatialArrowColorMode: value }))}
                      style={{
                        flex: '1 1 150px',
                        padding: '11px 12px',
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
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>
                        {active ? '✓ ' : ''}{label}
                      </span>
                      <span style={{ display: 'block', marginTop: 3, fontSize: 11, color: active ? accent : T.muted, fontWeight: 800 }}>
                        {sub}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.55 }}>
                쉬움은 흰 화살표, 보통은 방향별 색이 채워진 색상 화살표입니다. 위 빨·좌 초·우 노·아래 파. 반응은 여전히 화살표 방향 기준입니다.
              </p>
            </section>
          ) : null}

          {isReactTrain && levelId === 2 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>동시 자극 수</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  떨어지는 벽돌들은 동시에 2개로 고정됩니다.
                </p>
              </div>
              <div
                style={{
                  padding: '11px 12px',
                  borderRadius: 12,
                  border: `1.5px solid ${accent}`,
                  background: `${accent}16`,
                  color: accent,
                  fontSize: 15,
                  fontWeight: 900,
                  textAlign: 'center',
                }}
              >
                2개 고정
              </div>
            </section>
          ) : null}

          {isReactTrain && reactTrainEngineLevelForUi(levelId) === 6 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  쉬움은 항상 1마리, 보통은 1마리 50% · 2마리 50%로 등장합니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'classic' as const, label: '쉬움', sub: '1마리' },
                  { id: 'variant' as const, label: '보통', sub: '1마리 50% · 2마리 50%' },
                ]).map((opt) => {
                  const active = launch.moleLookMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, moleLookMode: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setLaunch((s) => ({ ...s, moleBonusTimeEnabled: !s.moleBonusTimeEnabled }))}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '11px 12px',
                  borderRadius: 12,
                  border: `1.5px solid ${launch.moleBonusTimeEnabled ? accent : T.border}`,
                  background: launch.moleBonusTimeEnabled ? `${accent}16` : T.card,
                  color: launch.moleBonusTimeEnabled ? accent : T.textDim,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                보너스타임 {launch.moleBonusTimeEnabled ? 'ON' : 'OFF'}
                <div style={{ fontSize: 10, fontWeight: 700, color: launch.moleBonusTimeEnabled ? accent : T.muted, marginTop: 3, letterSpacing: '0.03em' }}>
                  본 활동 뒤 30초 · 1초마다 1마리
                </div>
              </button>
            </section>
          ) : null}

          {/* 시지각반응 손 따로, 발 따로(6번) 전용: 난이도 */}
          {isReactTrain && levelId === 201 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  쉬움은 발만, 보통은 발+손, 어려움은 발·손 조합을 최대 2개까지만 표시합니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'easy' as const, label: '쉬움', sub: '발만 · 한 발/두 발' },
                  { id: 'normal' as const, label: '보통', sub: '발+손 · 발 필수' },
                  { id: 'hard' as const, label: '어려움', sub: '최대 2개 · 손발 혼합' },
                ]).map((opt) => {
                  const active = launch.handFootDifficulty === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, handFootDifficulty: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.03em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 시지각반응 숫자 연산 기차(엔진 8) 전용: 난이도 */}
          {isReactTrain && reactTrainEngineLevelForUi(levelId) === 8 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  L1은 1~4 단일 숫자, L2는 문마다 두 숫자, L3는 기차에 식(+-×÷)이 뜨고 문에는 답이 표시됩니다. 보고 맞는 문을 미리 찾는 시지각 반응입니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 1 as const, label: '1', sub: '1~4' },
                  { id: 2 as const, label: '2', sub: '1~8' },
                  { id: 3 as const, label: '3', sub: '사칙연산' },
                ]).map((opt) => {
                  const active = launch.numberCartTier === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, numberCartTier: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 시지각반응 흰 공 찾기(7번): 난이도 + 속도 */}
          {isReactTrain && reactTrainEngineLevelForUi(levelId) === 9 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  보통은 1패널, 어려움은 2패널입니다. 각 난이도에서 추적 속도만 느림/빠름으로 나눕니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'normal' as const, label: '보통', sub: '1패널', dual: false },
                  { id: 'hard' as const, label: '어려움', sub: '2패널', dual: true },
                ]).map((opt) => {
                  const active = launch.colorTrackerDualPanel === opt.dual;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setLaunch((s) => ({
                          ...s,
                          colorTrackerDualPanel: opt.dual,
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ margin: '14px 0 8px' }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>속도</label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 1 as const, label: '느림', sub: '추적 속도 낮음' },
                  { id: 3 as const, label: '빠름', sub: '추적 속도 높음' },
                ]).map((opt) => {
                  const active = (launch.colorTrackerTier === 3 ? 3 : 1) === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, colorTrackerTier: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 시지각반응 골키퍼(10번) 전용: 난이도 + 보너스타임 */}
          {isReactTrain && reactTrainEngineLevelForUi(levelId) === 10 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  쉬움은 항상 공 1개, 보통은 1개 50% · 2개 50%로 날아옵니다. 비행 시간은 아래 신호 속도로 조절합니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 1 as const, label: '쉬움', sub: '항상 1개' },
                  { id: 2 as const, label: '보통', sub: '1개 50% · 2개 50%' },
                ]).map((opt) => {
                  const active = launch.goalkeeperTier === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, goalkeeperTier: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setLaunch((s) => ({ ...s, goalkeeperBonusTimeEnabled: !s.goalkeeperBonusTimeEnabled }))}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '11px 12px',
                  borderRadius: 12,
                  border: `1.5px solid ${launch.goalkeeperBonusTimeEnabled ? accent : T.border}`,
                  background: launch.goalkeeperBonusTimeEnabled ? `${accent}16` : T.card,
                  color: launch.goalkeeperBonusTimeEnabled ? accent : T.textDim,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                보너스타임 {launch.goalkeeperBonusTimeEnabled ? 'ON' : 'OFF'}
                <div style={{ fontSize: 10, fontWeight: 700, color: launch.goalkeeperBonusTimeEnabled ? accent : T.muted, marginTop: 3, letterSpacing: '0.03em' }}>
                  본 활동 뒤 30초 · 1초마다 공 1개
                </div>
              </button>
            </section>
          ) : null}

          {/* 시지각반응 색 기억 그리드(12): 타일 수 · 진행 방식 */}
          {isReactTrain && reactTrainEngineLevelForUi(levelId) === 12 ? (
            <>
              <section style={{ marginBottom: 22 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>타일 개수</label>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                    기억 후 단 한 칸만 색이 바뀝니다. 그리드가 클수록 찾기 어렵습니다.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { id: 3 as const, label: '3×3', sub: '입문' },
                    { id: 4 as const, label: '4×4', sub: '보통' },
                    { id: 5 as const, label: '5×5', sub: '어려움' },
                  ]).map((opt) => {
                    const active = launch.colorMemoryGridSize === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLaunch((s) => ({ ...s, colorMemoryGridSize: opt.id }))}
                        style={{
                          flex: 1,
                          padding: '11px 8px',
                          borderRadius: 12,
                          border: `1.5px solid ${active ? accent : T.border}`,
                          background: active ? `${accent}16` : T.card,
                          color: active ? accent : T.textDim,
                          fontFamily: 'inherit',
                          fontSize: 15,
                          fontWeight: active ? 900 : 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {opt.label}
                        <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section style={{ marginBottom: 22 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>진행 방식</label>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                    깜빡이는 원본·변경 색을 번갈아 보여 주고, 원샷은 한 번만 바꾼 뒤 유지합니다.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { id: 'flicker' as const, label: '깜빡이', sub: '추천' },
                    { id: 'oneshot' as const, label: '원샷', sub: '하드코어' },
                  ]).map((opt) => {
                    const active = launch.colorMemoryGridMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLaunch((s) => ({ ...s, colorMemoryGridMode: opt.id }))}
                        style={{
                          flex: 1,
                          padding: '11px 8px',
                          borderRadius: 12,
                          border: `1.5px solid ${active ? accent : T.border}`,
                          background: active ? `${accent}16` : T.card,
                          color: active ? accent : T.textDim,
                          fontFamily: 'inherit',
                          fontSize: 15,
                          fontWeight: active ? 900 : 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {opt.label}
                        <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : null}

          {/* 시지각반응 바이러스 폭증(13 / UI 9): 난이도 */}
          {isReactTrain && reactTrainEngineLevelForUi(levelId) === 13 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>배양 난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  개체 수·비율 차이·크기 착시·회색 돌연변이 방해가 단계별로 올라갑니다. 숫자는 세지 말고 양감으로 판단합니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'easy' as const, label: '1', sub: '쉬움' },
                  { id: 'normal' as const, label: '2', sub: '보통' },
                  { id: 'hard' as const, label: '3', sub: '지옥' },
                ]).map((opt) => {
                  const active = launch.virusOutbreakDifficulty === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, virusOutbreakDifficulty: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 사이먼: 보통 1개 / 어려움 2개 */}
          {isSimon ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  보통은 자극 1개, 어려움은 서로 다른 극단 2곳에 동시에 뜹니다. 같은 답 쌍은 10% 미만입니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 1 as const, label: '보통', sub: '1개' },
                  { id: 2 as const, label: '어려움', sub: '2개' },
                ]).map((opt) => {
                  const active = launch.simonPoleCount === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, simonPoleCount: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 속도 (DIVE·흰 공·순차기억 1·2번은 내부 타이밍) */}
          {!isFlowOrChallenge && !(isReactTrain && (reactTrainEngineLevelForUi(levelId) === 5 || reactTrainEngineLevelForUi(levelId) === 9)) && !(isSpatial && isColorSequenceLevel(levelId)) ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>
                  {isReactTrain && reactTrainEngineLevelForUi(levelId) === 10 ? '비행 시간' : '신호 속도'}
                </label>
                <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                  {isReactTrain && reactTrainEngineLevelForUi(levelId) === 10
                    ? `${launch.speed.toFixed(1)}초 / 스폰→히트`
                    : `${launch.speed.toFixed(1)}초 / 자극`}
                </div>
              </div>
              <SpeedSelector
                value={launch.speed}
                onChange={(v) => setLaunch((s) => ({ ...s, speed: v }))}
                showPresets={false}
              />
            </section>
          ) : null}

          {isSpatial && isColorSequenceLevel(levelId) ? (
            <>
              <section style={{ marginBottom: 22 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                    쉬움은 3개, 보통은 5개, 어려움은 라운드마다 항목이 추가됩니다.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { id: 3 as const, label: '쉬움', detail: '3개' },
                    { id: 5 as const, label: '보통', detail: '5개' },
                    { id: 'ramp' as const, label: '어려움', detail: '추가' },
                  ] satisfies { id: ColorSequenceOption; label: string; detail: string }[]).map((opt) => {
                    const active = colorSequenceOption(levelId) === opt.id;
                    return (
                      <button
                        key={String(opt.id)}
                        type="button"
                        onClick={() => setLevelId(colorSequenceLevelFromOption(opt.id))}
                        style={{
                          flex: 1,
                          padding: '11px 8px',
                          borderRadius: 12,
                          border: `1.5px solid ${active ? accent : T.border}`,
                          background: active ? `${accent}16` : T.card,
                          color: active ? accent : T.textDim,
                          fontFamily: 'inherit',
                          fontSize: 15,
                          fontWeight: active ? 900 : 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ display: 'block' }}>{opt.label}</span>
                        <span style={{ display: 'block', marginTop: 3, fontSize: 11, color: active ? accent : T.muted, fontWeight: 800 }}>{opt.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section style={{ marginBottom: 26 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>색 전환 간격</label>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: T.textDim, lineHeight: 1.55, fontWeight: 600 }}>
                  {levelId === 2
                    ? '1.0~3.0초 사이에서 매 색마다 자동으로 바뀝니다.'
                    : '1.0~2.5초 사이에서 매 색마다 자동으로 바뀝니다.'}
                </p>
              </section>
            </>
          ) : null}

          {isSpatial && isColorNumberLevel(levelId) ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>진행 방식</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  퀴즈는 질문으로 확인하고, 전체 공개는 번호별 정답을 한 화면에 펼칩니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 4, label: '퀴즈', sub: '질문 확인' },
                  { id: 5, label: '전체 공개', sub: '한 화면 복습' },
                ] as const).map((opt) => {
                  const active = levelId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLevelId(opt.id)}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 순차 기억 직접 지정: 슬롯 색상 */}
          {isSpatial && levelId === 6 ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>1~10번 색상 선택</label>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.55 }}>
                  각 번호에 빨·노·초·파 중 하나를 지정합니다. 지정한 순서대로 10색 기억 훈련이 진행됩니다.
                </p>
              </div>
              <MemoryColorSlotsPicker
                slots={launch.memoryColorSlots}
                onChange={(next) => setLaunch((s) => ({ ...s, memoryColorSlots: next }))}
                accent={accent}
                borderColor={T.border}
                mutedColor={T.muted}
                textColor={T.text}
                cardBg={T.card}
              />
            </section>
          ) : null}

          {/* 키즈 세이프 모드 (시지각 반응 전용) */}
          {isReactTrain ? (
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
                  (시지각 반응 전체 속도/스폰 간격 완화)
                </span>
              </button>
            </section>
          ) : null}

          {/* Flow 전용: Hub 파노라마 환경 테마 */}
          {isFlowOrChallenge ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>환경 테마</label>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>
                  Asset Hub DIVE 파노라마와 연결됩니다. 저사양 PC·태블릿은 자동으로 가벼운 모드로 실행됩니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DIVE_THEME_UI.map(({ id, label }) => {
                  const active = launch.diveEnvironmentTheme === id;
                  const hasHub = Boolean(diveEnvData.themes[id]);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, diveEnvironmentTheme: id }))}
                      style={{
                        flex: '1 1 88px',
                        padding: '10px 6px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? '#8B5CF6' : T.border}`,
                        background: active ? 'rgba(139,92,246,0.16)' : T.card,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                      title={hasHub ? 'Hub 파노라마' : '정적 폴백'}
                    >
                      <div style={{ fontWeight: 900, fontSize: 13, color: active ? '#8B5CF6' : T.text }}>{active ? '✓ ' : ''}{label}</div>
                      {!hasHub ? <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>폴백</div> : null}
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

          {/* Flow 전용: 추가 동작 선택 */}
          {isFlowOrChallenge && !isColorGateTheme ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>추가 동작 선택</label>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  선택한 동작이 스테이지별로 순차 추가됩니다. 복수 선택 가능합니다.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.035)' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: T.text, marginBottom: 6 }}>선택한 단계 구성</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.textDim, lineHeight: 1.7 }}>
                    1단계 · DIVE Program
                    {launch.flowFeatures.includes('colorGate') ? <><br />2단계 · 색 포즈 관문 (GATE)</> : null}
                  </div>
                </div>
                {(
                  [
                    { key: 'punch'    as FlowFeatureKey, icon: '👊', label: '박스 펀치 (PUNCH)',      desc: '레인 위 낮은 박스가 등장합니다. 주먹으로 파괴하세요.' },
                    { key: 'kick'     as FlowFeatureKey, icon: '🦵', label: '롤링 배럴 킥 (KICK)',    desc: '가슴 높이 배럴이 옵니다. 발을 들어 차세요.' },
                    { key: 'duck'     as FlowFeatureKey, icon: '🛸', label: 'UFO 숙이기 (DUCK)',      desc: '저공 UFO가 나타납니다. 빠르게 몸을 낮춰 피하세요.' },
                    { key: 'reach'    as FlowFeatureKey, icon: '🧱', label: '펀치 벽 두드리기',         desc: '브릿지를 막는 벽이 등장합니다. 5번 두드려 부수세요.' },
                    { key: 'colorGate' as FlowFeatureKey, icon: '🎯', label: '색 포즈 관문 (GATE)',   desc: '빨·노·초·파 배경 — 해당 색 패드로 이동해 5가지 동작을 순서대로!' },
                  ]
                ).filter(({ key }) => key !== 'colorGate').map(({ key, icon, label, desc }) => {
                  const active = launch.flowFeatures.includes(key);
                  const displayIcon = key === 'colorGate' ? '🎯' : icon;
                  const displayLabel = key === 'colorGate' ? '색 포즈 관문 (GATE · 2단계)' : label;
                  const displayDesc = key === 'colorGate'
                    ? '1단계에 섞이지 않고 별도 2단계에서 실행됩니다. 브릿지 없이 파란 게이트를 보고 런지 펀치 자세를 취합니다.'
                    : desc;
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
                      <span style={{ fontSize: '1.15rem', lineHeight: 1, marginTop: 2 }}>{displayIcon}</span>
                      <div>
                        {key === 'colorGate' ? (
                          <div style={{ fontWeight: 900, fontSize: 13, color: active ? '#16A34A' : T.text, marginBottom: 2 }}>
                            {active ? '✓ ' : ''}{displayLabel}
                          </div>
                        ) : null}
                        <div style={{ display: key === 'colorGate' ? 'none' : undefined, fontWeight: 900, fontSize: 13, color: active ? '#16A34A' : T.text, marginBottom: 2 }}>
                          {active ? '✓ ' : ''}{label}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.45 }}>{displayDesc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Flow 전용: 즐겨찾기 */}
          {isFlowOrChallenge && !isColorGateTheme ? (
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
              {flowPresetError && (
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#F87171' }}>저장 실패: {flowPresetError}</p>
              )}
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
                          {p.environmentTheme} · {p.duration}초 · {p.features.length > 0 ? p.features.join(', ') : '기본'}
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
                  {isReactTrain && (reactTrainEngineLevelForUi(levelId) === 8 || reactTrainEngineLevelForUi(levelId) === 9) ? '라운드' : isReactTrain ? '훈련 시간' : isSpatial ? '진행' : '분량'}
                </label>
              </div>

              {isReactTrain && reactTrainEngineLevelForUi(levelId) === 8 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[7, 10, 15, 25].map((r) => {
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
                        {r}라운드
                      </button>
                    );
                  })}
                </div>
              ) : isReactTrain && reactTrainEngineLevelForUi(levelId) === 9 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[2, 3, 5, 10].map((r) => {
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
                        {r}라운드
                      </button>
                    );
                  })}
                </div>
              ) : isReactTrain ? (
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

          {/* 변형 사분할: 단계 1~3 */}
          {modeId === 'basic' && isModifiedQuadrantLevel(levelId) ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>단계</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  1=발만 · 2=1~3색 손발 혼합 · 3=3색 손발 혼합
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([1, 2, 3] as const).map((stage) => {
                  const active = modifiedQuadrantStage(levelId) === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setLevelId(modifiedQuadrantLevelFromStage(stage))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 15,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {modeId === 'stroop' && levelId === 1 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  보통은 검정 배경의 색상화살표, 어려움은 화살표 색과 다른 배경 간섭이 추가됩니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'basic' as const, label: '보통', sub: '기본' },
                  { id: 'bg' as const, label: '어려움', sub: '배경 간섭' },
                ]).map((opt) => {
                  const active = launch.stroopArrowMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, stroopArrowMode: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {modeId === 'stroop' && levelId === 2 ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  보통은 검정 배경의 단어, 어려움은 단어 색과 다른 배경 간섭이 추가됩니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'basic' as const, label: '보통', sub: '기본' },
                  { id: 'bg' as const, label: '어려움', sub: '배경 간섭' },
                ]).map((opt) => {
                  const active = launch.stroopWordDifficulty === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, stroopWordDifficulty: opt.id }))}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 스트룹 4단계: 기본(단어+배경) / 누락 */}
          {modeId === 'stroop' && (levelId === 4 || levelId === 5) ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>4단계 옵션</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  기본은 단어+배경 간섭, 누락은 화면에 없는 색을 찾아 말합니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'bg' as const, label: '기본', sub: '단어+배경' },
                  { id: 'missing' as const, label: '누락', sub: '누락 색상 찾기' },
                ]).map((opt) => {
                  const active = launch.stroopWordMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setLevelId(4);
                        setLaunch((s) => ({ ...s, stroopWordMode: opt.id }));
                      }}
                      style={{
                        flex: 1,
                        padding: '11px 8px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? accent : T.border}`,
                        background: active ? `${accent}16` : T.card,
                        color: active ? accent : T.textDim,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        fontWeight: active ? 900 : 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? accent : T.muted, marginTop: 3, letterSpacing: '0.06em' }}>
                        {opt.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 3분할/랜덤분할: 고정 색 구성 안내 */}
          {modeId === 'basic' && isFront3PanelLevel(levelId) ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>색 구성</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  {levelId === 5
                    ? '3분할 자극은 세 패널에 서로 다른 신호가 항상 표시됩니다.'
                    : '랜덤분할 자극은 1개=전면, 2개=2패널, 3개=3패널이 20%/30%/50% 확률로 나옵니다.'}
                </p>
              </div>
            </section>
          ) : null}

          {/* 사이먼 4번 · 랜덤 테마 */}
          {modeId === 'simon' && levelId === 4 ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>랜덤 테마</label>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>
                Asset Hub에 업로드된 <strong style={{ color: T.text }}>과일·동물·음식·자연·탈 것</strong> 이미지가 전부 섞여 나옵니다. 테마를 따로 고를 필요는 없습니다.
              </p>
            </section>
          ) : null}

          {/* 연상 색지각 테마 */}
          {modeId === 'basic' && (levelId === 2 || levelId === 3 || levelId === 4 || isFront3PanelLevel(levelId)) ? (
            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>연상 색지각 이미지 테마</label>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SPOMOVE_COLOR_THEME_ORDER.map((tid) => {
                  const active = launch.variantColorTheme === tid;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => {
                        setLaunch((s) => ({
                          ...s,
                          variantColorTheme: tid,
                          basicNumberOverlay: tid === 'color' ? s.basicNumberOverlay : 'none',
                        }));
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
            onClick={() => onStart(levelId, launchSettingsForLevel(modeId, levelId, launch))}
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
    const ids = SPOMOVE_CATALOG_SLOT_IDS.filter((id) => {
      const m = MODES[id];
      return m && !m.isHidden;
    });
    const byAxis = new Map<TabCode, string[]>();
    for (const tab of TABS) byAxis.set(tab.code, []);
    for (const id of ids) {
      const m = MODES[id];
      if (!m) continue;
      byAxis.get('ALL')!.push(id);
      const axis = m.axis as TabCode | undefined;
      if (axis && byAxis.has(axis)) byAxis.get(axis)!.push(id);
    }
    return byAxis;
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
            forceUnlockViewportScroll();
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
        }}>
          <div style={{ maxWidth: 1024, margin: '0 auto' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontSize: 10, letterSpacing: '0.22em', color: T.muted, fontWeight: 800, margin: 0 }}>
                      SPOKEDU · SPOMOVE
                    </p>
                    <h1 style={{
                      fontSize: 'clamp(15px, 2vw, 22px)',
                      fontWeight: 950,
                      color: T.text,
                      margin: 0,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.15,
                      wordBreak: 'keep-all',
                    }}>
                      단순·선택·복합 반응을 움직임으로 경험하는 SPOMOVE
                    </h1>
                    <p style={{ margin: 0, fontSize: 11, color: T.textDim, lineHeight: 1.65, maxWidth: 540 }}>
                      SPOMOVE는 4색 패드 위에서 화면 신호를 보고, 필요한 정보를 선택하고, 기억한 규칙을 몸으로 수행하는 스크린 기반 인지운동 프로그램입니다.
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: T.muted, lineHeight: 1.6, maxWidth: 540 }}>
                      6개 핵심 프로그램을 기본·심화로 반복하며 단순·선택·복합 반응력을 단계적으로 경험합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {AXIS_GROUPS.map((group) => {
                const gAccent = Object.values(MODES).find((m) => !m.isHidden && m.axis === group.axisCode)?.accent ?? 'rgba(255,255,255,0.65)';
                const programs = SPOMOVE_CATALOG_SLOT_IDS
                  .filter((id) => { const m = MODES[id]; return m && !m.isHidden && m.axis === group.axisCode; })
                  .map((id) => MODES[id]!.title)
                  .join(' · ');
                return (
                  <div
                    key={group.axisCode}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1px solid ${gAccent}30`,
                      background: `${gAccent}08`,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: gAccent, letterSpacing: '0.2em' }}>
                      {group.title.toUpperCase()} · {group.enTitle.toUpperCase()}
                    </p>
                    <p style={{ margin: '4px 0 3px', fontSize: 13, fontWeight: 900, color: T.text, lineHeight: 1.25, letterSpacing: '-0.01em', wordBreak: 'keep-all' }}>
                      {group.salesCopy}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: '0.03em' }}>
                      {programs}
                    </p>
                  </div>
                );
              })}
            </div>

            <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 6, marginTop: 12, paddingBottom: 2 }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.code;
                const accent =
                  tab.code === 'ALL'
                    ? 'rgba(255,255,255,0.72)'
                    : Object.values(MODES).find((m) => !m.isHidden && m.axis === tab.code)?.accent ?? 'rgba(255,255,255,0.65)';
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

        <main style={{ maxWidth: 1024, margin: '0 auto', padding: '28px 24px 0' }}>
          <style>{`
            .spmt-card:hover { transform: translateY(-2px) !important; border-color: rgba(255,255,255,0.18) !important; box-shadow: 0 16px 36px rgba(0,0,0,0.40) !important; }
            .spmt-card:active { transform: translateY(-1px) scale(0.99) !important; }
            .spmt-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
            .spmt-title { font-size: 1.3rem; }
            .spmt-desc { font-size: 0.9rem; }
            @media (max-width: 599px) {
              .spmt-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .spmt-title { font-size: 1.05rem; }
              .spmt-desc { font-size: 0.85rem; }
            }
            @media (prefers-reduced-motion: reduce) {
              .spmt-card { transition: none !important; }
              .spmt-card:hover { transform: none !important; }
              .spmt-card:active { transform: none !important; }
            }
          `}</style>
          {activeTab === 'ALL' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
              {AXIS_GROUPS.map((group) => {
                const groupIds = visibleModeIds.filter((id) => MODES[id]?.axis === group.axisCode);
                if (groupIds.length === 0) return null;
                const groupAccent = MODES[groupIds[0]]?.accent ?? 'rgba(255,255,255,0.65)';
                return (
                  <section key={group.axisCode}>
                    <div style={{ marginBottom: 16, paddingLeft: 14, borderLeft: `3px solid ${groupAccent}` }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: groupAccent, letterSpacing: '0.2em' }}>
                        {group.title.toUpperCase()} · {group.enTitle.toUpperCase()}
                      </p>
                      <h2 style={{ margin: '4px 0 4px', fontSize: 20, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>
                        {group.salesCopy}
                      </h2>
                      <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.55 }}>{group.desc}</p>
                    </div>
                    <div className="spmt-grid">
                      {groupIds.map((modeId) => (
                        <CatalogModeCard key={modeId} modeId={modeId} onPick={handlePick} />
                      ))}
                    </div>
                  </section>
                );
              })}
              <CatalogBottomPrograms onPick={handlePick} />
            </div>
          ) : (
            <div>
              {(() => {
                const group = AXIS_GROUPS.find((g) => g.axisCode === activeTab);
                const groupAccent = Object.values(MODES).find((m) => !m.isHidden && m.axis === activeTab)?.accent ?? 'rgba(255,255,255,0.65)';
                if (!group) return null;
                return (
                  <div style={{ marginBottom: 20, paddingLeft: 14, borderLeft: `3px solid ${groupAccent}` }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: groupAccent, letterSpacing: '0.2em' }}>
                      {group.title.toUpperCase()} · {group.enTitle.toUpperCase()}
                    </p>
                    <h2 style={{ margin: '4px 0 4px', fontSize: 20, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>
                      {group.salesCopy}
                    </h2>
                    <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.55 }}>{group.desc}</p>
                  </div>
                );
              })()}
              <div className="spmt-grid">
                {visibleModeIds.map((modeId) => (
                  <CatalogModeCard key={modeId} modeId={modeId} onPick={handlePick} />
                ))}
              </div>
              <CatalogBottomPrograms onPick={handlePick} />
            </div>
          )}
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

