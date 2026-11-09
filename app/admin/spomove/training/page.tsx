'use client';

import { catalogTrainingActivity, resolveTrainingActivity, legacyTrainingActivityFlags, trainingActivityForLevelChange, resolveTrainingSelection, resolveCatalogTrainingSelection, type TrainingActivityId } from './_player/lib/trainingActivity';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';

import { TRAINING_ENGINE_GUIDE_VIDEOS } from '@/app/lib/spomove/trainingEngineGuideVideos';
import { youtubeWatchOrShareToEmbedSrc } from '@/app/lib/spomove/youtubeEmbed';

import {
  MODES,
  reactTrainEngineLevelForUi,
  isModifiedQuadrantLevel,
  isFront3PanelLevel,
  isColorSequenceLevel,
  ADMIN_SEQUENCE_OPTIONS,
  isColorNumberLevel,
  isInstantMemoryLevel,
  modifiedQuadrantStage,
  modifiedQuadrantLevelFromStage,
  colorSequenceOption,
  colorSequenceLevelFromOption,
  type ColorSequenceOption,
} from './_player/constants';
import { trainingActivityGuide } from './_player/lib/trainingActivityGuide';
import { GUIDE_BLOCKS } from './_player/trainingGuideContent';
import type { MemoryGameAutoLaunch, TrainingExitResume } from './_player/MemoryGameApp';
import { useViewportScrollLock } from './_player/lib/lockViewportScroll';
import { TrainingDashboard } from './TrainingDashboard';
import { normalizeGlassBridgeLength, normalizeGlassBridgeSeconds, normalizeGlassBridgeRounds, normalizeGlassBridgeDifficulty } from './_player/lib/glassBridgeMemory';
import { normalizeNumberReaderSeconds } from './_player/lib/movingNumberReader';
import { normalizeSearchSeconds, normalizeSearchStage, normalizeSearchTargetCount } from './_player/lib/visualSearch';
import { ADMIN_TRAINING_ROUNDS, normalizeAdminTrainingRounds } from './_player/lib/adminTrainingRounds';
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
import {
  diveActionMoveDurationSec,
  formatDiveActionMoveDuration,
  formatDiveActionMoveDurationDetail,
} from '@/app/lib/spomove/diveActionMoveTiming';
import { DIVE_THEME_UI, isDiveActionMoveUnityTheme, normalizeDiveThemeId, type DiveThemeId } from '@/app/lib/spomove/diveThemes';
import { VariantAppendixFullscreen } from './_player/components/VariantAppendixFullscreen';
import { ColorGatePoseAppendix } from './_player/components/ColorGatePoseAppendix';
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


type TopTab = 'training' | 'teacher' | 'app';
const TEACHER_SPOMOVE_URL = '/teacher/spomove';

/** 카탈로그 배열 순서로 1번·2번… (엔진 id와 무관) */

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
  'Pole Shape': '도형',
  Shape: '도형',
  'Pole Arrows': '화살표',
  Arrow: '화살표',
  'Mixed Gallery': '랜덤 테마',
  'Random Theme': '랜덤 테마',
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
  '색깔-번호 기억': '랜덤 기억',
  '색깔-번호 전체 공개': '랜덤 기억',
  '3-Color Sequence': '순서 기억',
  '5-Color Sequence': '순서 기억',
  '10-Color Sequence': '순서 기억',
  'Color Sequence': '순서 기억',
  'Color-Number Quiz': '랜덤 기억',
  'Color-Number Full Board': '랜덤 기억',
  'Color-Number': '랜덤 기억',
  'Custom 10-Color Sequence': '순서 기억',
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
  Camouflage: '카모플라쥬',
  'Camouflage L1': '카모플라쥬',
  'Camouflage L2': '카모플라쥬',
  'Balloon Simon': '풍선',
  Balloon: '풍선',
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
  '(On Hold) Color Memory Grid': '순간 기억',
  'Instant Memory': '순간 기억',
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

function catalogLevelLabelKoEn(modeId: string, catalogId: number): string {
  const m = MODES[modeId];
  const idx = m?.levels.findIndex((lv) => lv.id === catalogId) ?? -1;
  const lv = m?.levels.find((x) => x.id === catalogId);
  if (!lv) return `${catalogId}번`;
  const byEn = LEVEL_KO_ALIAS_BY_EN[lv.enName];
  const ko = byEn ?? lv.name;
  const enDisplay = levelNameEnDisplay(lv.enName);
  return `${idx >= 0 ? idx + 1 : catalogId}번 : ${ko} (${enDisplay})`;
}

function pickDefaultTimeMode(modeId: string): 'time' | 'reps' {
  return modeId === 'reactTrain' ? 'time' : 'reps';
}

type FlowFeatureKey = 'faster' | 'punch' | 'duck' | 'reach' | 'kick' | 'colorGate';
type SportsArenaFeatureKey = 'side' | 'jump' | 'duck';
type ColorGateVariant = 'solo-easy' | 'solo-normal' | 'together-easy' | 'together-normal' | 'together-family';
type ColorGateCategoryFilter = 'all' | 'strength' | 'flexibility' | 'balance' | 'power-jump';
type ColorGateSelectableCategory = Exclude<ColorGateCategoryFilter, 'all'> | 'together' | 'family';
type ColorGateDifficultySelection = 'single' | 'compound' | 'family';

type LaunchSettings = {
  visualSearchStage: 1 | 2;
  visualSearchTargetCount: 1 | 2;
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
  sportsArenaFeatures: SportsArenaFeatureKey[];
  diveEnvironmentTheme: DiveThemeId;
  flowDuration: number;
  flowIncludeBonus: boolean;
  colorGateVariant: ColorGateVariant;
  colorGateCategory: ColorGateCategoryFilter;
  colorGateCategories: ColorGateSelectableCategory[];
  colorGateDifficulties: ColorGateDifficultySelection[];
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
  /** 시지각반응(reactTrain) 두더지 잡기(6번) 전용: 본 활동 뒤 15초 가속 보너스타임 */
  moleBonusTimeEnabled: boolean;
  /** 레거시·사이먼 매직 아이: 극단(variant)만 사용 */
  camouflagePlacement: 'center' | 'variant';
  /** 시지각반응(reactTrain) 골키퍼(10번) 전용: 1=항상 1개 · 2=1~2개(더블) */
  goalkeeperTier: 1 | 2;
  goalkeeperBonusTimeEnabled: boolean;
  handFootDifficulty: 'easy' | 'normal' | 'hard';
  /** 순차 기억 · 순간 기억(7) 전용: 3×3 / 4×4 / 5×5 */
  colorMemoryGridSize: 3 | 4 | 5;
  /** 순차 기억 · 순간 기억(7) 전용: flicker=깜빡이 · oneshot=원샷 */
  colorMemoryGridMode: 'flicker' | 'oneshot';
  /** 시지각반응(reactTrain) 바이러스 폭증(13) 전용: easy/normal/hard */
  virusOutbreakDifficulty: 'easy' | 'normal' | 'hard';
  shellTrackingDifficulty: 'easy' | 'normal' | 'hard';
  shellTrackingTargetSeconds: 2 | 3 | 4 | 5 | 6;
  shellTrackingShuffleCount: 4 | 6 | 8 | 10 | 12;
  shellTrackingResponseSeconds: 2 | 3 | 4 | 5 | 6;
  relativeCompassDifficulty: 'easy' | 'normal' | 'hard';
  relativeCompassStartSeconds: 2 | 3 | 4 | 5 | 6;
  relativeCompassResponseSeconds: 2 | 3 | 4 | 5 | 6;
  activityId: TrainingActivityId;
  shapeCompletionDifficulty: 'easy' | 'normal' | 'hard';
  shapeCompletionResponseSeconds: 2 | 3 | 4 | 5 | 6;
  glassBridgeDifficulty: 'easy' | 'hard';
  glassBridgeStartLength: 3 | 4 | 5 | 6;
  /** 사이먼 폴 도형·화살표: 1=기본 1개 · 2=응용 2개 */
  simonPoleCount: 1 | 2;
  /** 변형 사분할(7·8·9) — easy 고정(레거시 필드) */
  bodyLabelMode: 'easy' | 'hard';
  /** 순차 기억 6단계: 1~10번 슬롯 색상 */
  memoryColorSlots: SpomoveMemoryColorId[];
};

const DEFAULT_LAUNCH: LaunchSettings = {
  visualSearchStage: 1,
  visualSearchTargetCount: 1,
  glassBridgeDifficulty: 'easy',
  glassBridgeStartLength: 3,
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
  sportsArenaFeatures: [],
  diveEnvironmentTheme: 'space',
  flowDuration: 60,
  flowIncludeBonus: true,
  colorGateVariant: 'solo-easy',
  colorGateCategory: 'all',
  colorGateCategories: [],
  colorGateDifficulties: [],
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
  shellTrackingDifficulty: 'normal',
  shellTrackingTargetSeconds: 3,
  shellTrackingShuffleCount: 6,
  shellTrackingResponseSeconds: 3,
  relativeCompassDifficulty: 'normal',
  relativeCompassStartSeconds: 3,
  relativeCompassResponseSeconds: 3,
  activityId: 'direction-cue',
  shapeCompletionDifficulty: 'normal',
  shapeCompletionResponseSeconds: 4,
  simonPoleCount: 1,
  bodyLabelMode: 'easy',
  memoryColorSlots: [...DEFAULT_MEMORY_COLOR_SLOTS],
};

function autoLaunchToLaunchSettings(auto: MemoryGameAutoLaunch, fallback: LaunchSettings, mode: string, level: number): LaunchSettings {
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
    sportsArenaFeatures: (auto.sportsArenaFeatures ?? fallback.sportsArenaFeatures) as SportsArenaFeatureKey[],
    diveEnvironmentTheme: normalizeDiveThemeId(auto.diveEnvironmentTheme ?? fallback.diveEnvironmentTheme),
    flowDuration: auto.flowDuration ?? fallback.flowDuration,
    flowIncludeBonus: auto.flowIncludeBonus ?? fallback.flowIncludeBonus,
    colorGateVariant: auto.colorGateVariant ?? fallback.colorGateVariant,
    colorGateCategory: auto.colorGateCategory ?? 'all',
    colorGateCategories: auto.colorGateCategories ?? fallback.colorGateCategories,
    colorGateDifficulties: auto.colorGateDifficulties ?? fallback.colorGateDifficulties,
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
    shellTrackingDifficulty:
      auto.shellTrackingDifficulty === 'easy' || auto.shellTrackingDifficulty === 'hard'
        ? auto.shellTrackingDifficulty
        : fallback.shellTrackingDifficulty,
    shellTrackingTargetSeconds: ([2, 3, 4, 5, 6] as const).includes(auto.shellTrackingTargetSeconds as 2 | 3 | 4 | 5 | 6)
      ? auto.shellTrackingTargetSeconds as 2 | 3 | 4 | 5 | 6
      : fallback.shellTrackingTargetSeconds,
    shellTrackingShuffleCount: ([4, 6, 8, 10, 12] as const).includes(auto.shellTrackingShuffleCount as 4 | 6 | 8 | 10 | 12)
      ? auto.shellTrackingShuffleCount as 4 | 6 | 8 | 10 | 12
      : fallback.shellTrackingShuffleCount,
    shellTrackingResponseSeconds: ([2, 3, 4, 5, 6] as const).includes(auto.shellTrackingResponseSeconds as 2 | 3 | 4 | 5 | 6)
      ? auto.shellTrackingResponseSeconds as 2 | 3 | 4 | 5 | 6
      : fallback.shellTrackingResponseSeconds,
    relativeCompassDifficulty: auto.relativeCompassDifficulty === 'easy' || auto.relativeCompassDifficulty === 'hard' ? auto.relativeCompassDifficulty : fallback.relativeCompassDifficulty,
    relativeCompassStartSeconds: ([2, 3, 4, 5, 6] as const).includes(auto.relativeCompassStartSeconds as 2 | 3 | 4 | 5 | 6) ? auto.relativeCompassStartSeconds as 2 | 3 | 4 | 5 | 6 : fallback.relativeCompassStartSeconds,
    relativeCompassResponseSeconds: ([2, 3, 4, 5, 6] as const).includes(auto.relativeCompassResponseSeconds as 2 | 3 | 4 | 5 | 6) ? auto.relativeCompassResponseSeconds as 2 | 3 | 4 | 5 | 6 : fallback.relativeCompassResponseSeconds,
    activityId: resolveTrainingActivity(mode, level, auto, fallback.activityId),
    visualSearchStage: normalizeSearchStage(auto.visualSearchStage),
    visualSearchTargetCount: normalizeSearchTargetCount(auto.visualSearchStage, auto.visualSearchTargetCount),
    glassBridgeDifficulty: normalizeGlassBridgeDifficulty(auto.glassBridgeDifficulty),
    glassBridgeStartLength: normalizeGlassBridgeLength(auto.glassBridgeStartLength ?? fallback.glassBridgeStartLength),
    shapeCompletionDifficulty: auto.shapeCompletionDifficulty === 'easy' || auto.shapeCompletionDifficulty === 'hard' ? auto.shapeCompletionDifficulty : fallback.shapeCompletionDifficulty,
    shapeCompletionResponseSeconds: ([2, 3, 4, 5, 6] as const).includes(auto.shapeCompletionResponseSeconds as 2 | 3 | 4 | 5 | 6) ? auto.shapeCompletionResponseSeconds as 2 | 3 | 4 | 5 | 6 : fallback.shapeCompletionResponseSeconds,
    simonPoleCount: auto.simonPoleCount === 2 ? 2 : fallback.simonPoleCount,
    bodyLabelMode: auto.bodyLabelMode ?? fallback.bodyLabelMode,
    memoryColorSlots: normalizeMemoryColorSlots(auto.memoryColorSlots ?? fallback.memoryColorSlots),
  };
}

const FLOW_COLOR_GATE_LEVEL_ID = 2;
const ACTION_MOVE_STAGE_SECONDS = [15, 20, 25, 30, 35] as const;
const COLOR_GATE_REPETITION_COUNTS = ADMIN_TRAINING_ROUNDS;
const REACT_TRAIN_REPETITION_LEVEL_IDS = new Set([3, 1, 2, 6, 10, 201, 15]);
const DEFAULT_ACTION_MOVE_STAGE_SEC = 20;

function isFlowColorGateLevel(modeId: string, levelId: number): boolean {
  return modeId === 'flow' && levelId === FLOW_COLOR_GATE_LEVEL_ID;
}

function isReactTrainRepetitionLevel(modeId: string, levelId: number): boolean {
  return modeId === 'reactTrain' && REACT_TRAIN_REPETITION_LEVEL_IDS.has(levelId);
}

function launchSettingsForLevel(modeId: string, levelId: number, launch: LaunchSettings): LaunchSettings {
  const previousActivity = launch.activityId;
  launch = { ...launch, targetReps: normalizeAdminTrainingRounds(launch.targetReps), activityId: trainingActivityForLevelChange(modeId, levelId, launch.activityId) };
  if (launch.activityId === 'glass-bridge-memory') return { ...launch, glassBridgeStartLength: normalizeGlassBridgeLength(launch.glassBridgeStartLength), speed: normalizeGlassBridgeSeconds(launch.speed), targetReps: normalizeGlassBridgeRounds(launch.targetReps), timeMode: 'reps', intervalMode: false, accel: false };
  if (previousActivity === 'glass-bridge-memory') launch = { ...launch, speed: Math.min(6, launch.speed) };
  if (launch.activityId === 'visual-search') return { ...launch, visualSearchStage: normalizeSearchStage(launch.visualSearchStage), visualSearchTargetCount: normalizeSearchTargetCount(launch.visualSearchStage, launch.visualSearchTargetCount), speed: normalizeSearchSeconds(launch.speed), timeMode: 'reps', targetReps: normalizeAdminTrainingRounds(launch.targetReps), intervalMode: false, accel: false };
  if (launch.activityId === 'moving-number-reader') return { ...launch, speed: normalizeNumberReaderSeconds(launch.speed), timeMode: 'reps', targetReps: normalizeAdminTrainingRounds(launch.targetReps), intervalMode: false, accel: false };
  if (previousActivity === 'moving-number-reader') launch = { ...launch, speed: Math.min(6, launch.speed) };
  if (previousActivity === 'visual-search') launch = { ...launch, speed: Math.min(6, launch.speed) };
  if (isReactTrainRepetitionLevel(modeId, levelId)) {
    return {
      ...launch,
      timeMode: 'reps',
      targetReps: normalizeAdminTrainingRounds(launch.targetReps),
    };
  }
  if (launch.activityId === 'relative-compass') {
    return {
      ...launch,
      timeMode: 'reps',
      targetReps: [5, 10, 15, 20].includes(launch.targetReps) ? launch.targetReps : 10,
      relativeCompassDifficulty: launch.relativeCompassDifficulty === 'easy' || launch.relativeCompassDifficulty === 'hard' ? launch.relativeCompassDifficulty : 'normal',
      relativeCompassStartSeconds: ([2, 3, 4, 5, 6] as const).includes(launch.relativeCompassStartSeconds) ? launch.relativeCompassStartSeconds : 3,
      relativeCompassResponseSeconds: ([2, 3, 4, 5, 6] as const).includes(launch.relativeCompassResponseSeconds) ? launch.relativeCompassResponseSeconds : 3,
    };
  }
  if (isFlowColorGateLevel(modeId, levelId)) {
    const featuresOk = launch.flowFeatures.length === 1 && launch.flowFeatures[0] === 'colorGate';
    const repetitionsOk = (COLOR_GATE_REPETITION_COUNTS as readonly number[]).includes(launch.targetReps);
    if (featuresOk && repetitionsOk && launch.timeMode === 'reps') return launch;
    return {
      ...launch,
      flowFeatures: ['colorGate'],
      timeMode: 'reps',
      targetReps: repetitionsOk ? launch.targetReps : 20,
    };
  }

  if (modeId === 'flow') {
    const withoutGate = launch.flowFeatures.includes('colorGate')
      ? launch.flowFeatures.filter((key) => key !== 'colorGate')
      : launch.flowFeatures;
    const durationOk = (ACTION_MOVE_STAGE_SECONDS as readonly number[]).includes(launch.flowDuration);
    if (withoutGate !== launch.flowFeatures || !durationOk) {
      return {
        ...launch,
        flowFeatures: withoutGate,
        flowDuration: durationOk ? launch.flowDuration : DEFAULT_ACTION_MOVE_STAGE_SEC,
      };
    }
  }

  if (modeId === 'flanker' && (levelId === 4 || levelId === 5 || levelId === 6) && launch.flankerStimulusType !== 'color') {
    return { ...launch, flankerStimulusType: 'color' };
  }

  if (modeId === 'flanker' && levelId === 1 && launch.flankerStimulusType !== 'color') {
    return { ...launch, flankerStimulusType: 'color' };
  }

  if (modeId === 'reactTrain') return { ...launch, timeMode: [8, 9, 14].includes(reactTrainEngineLevelForUi(levelId)) ? 'reps' : 'time' };
  return (modeId === 'spatial' || modeId !== 'reactTrain' && modeId !== 'flow') ? { ...launch, timeMode: 'reps' } : launch;
}

type PagePhase =
  | { tag: 'catalog' }
  | { tag: 'settings'; modeId: string; levelId?: number; launch?: LaunchSettings }
  | { tag: 'training'; modeId: string; levelId: number; launch: LaunchSettings };

function diveAdminChoiceStyle(active: boolean, accent: string, tone: 'cyan' | 'amber' = 'cyan'): CSSProperties {
  const color = tone === 'amber' ? '#F59E0B' : accent;
  return {
    minHeight: 44,
    borderRadius: 12,
    border: `1.5px solid ${active ? color : T.border}`,
    background: active ? `${color}18` : T.card,
    color: active ? color : T.textDim,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

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
  useViewportScrollLock(true);

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
    sportsArenaFeatures: launch.sportsArenaFeatures,
    diveEnvironmentTheme: launch.diveEnvironmentTheme,
    flowDuration: launch.flowDuration,
    flowIncludeBonus: launch.flowIncludeBonus,
    colorGateVariant: launch.colorGateVariant,
    colorGateCategory: launch.colorGateCategory,
    colorGateCategories: launch.colorGateCategories,
    colorGateDifficulties: launch.colorGateDifficulties,
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
    shellTrackingDifficulty: launch.shellTrackingDifficulty,
    shellTrackingTargetSeconds: launch.shellTrackingTargetSeconds,
    shellTrackingShuffleCount: launch.shellTrackingShuffleCount,
    shellTrackingResponseSeconds: launch.shellTrackingResponseSeconds,
    relativeCompassDifficulty: launch.relativeCompassDifficulty,
    relativeCompassStartSeconds: launch.relativeCompassStartSeconds,
    relativeCompassResponseSeconds: launch.relativeCompassResponseSeconds,
    activityId: launch.activityId,
    ...legacyTrainingActivityFlags(launch.activityId),
    visualSearchStage: launch.visualSearchStage,
    visualSearchTargetCount: launch.visualSearchTargetCount,
    glassBridgeDifficulty: launch.glassBridgeDifficulty,
    glassBridgeStartLength: launch.glassBridgeStartLength,
    shapeCompletionDifficulty: launch.shapeCompletionDifficulty,
    shapeCompletionResponseSeconds: launch.shapeCompletionResponseSeconds,
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
        adminMemorySettings
        key={`${modeId}-${levelId}-${launch.speed}-${launch.timeMode}-${launch.duration}-${launch.targetReps}-${launch.warmup}-${launch.accel}-${launch.intervalMode}-${launch.kidsSafeMode}-${launch.numberRule}-${launch.variantColorTheme}-${launch.spatialArrowColorMode}-${launch.flankerStimulusType}-${launch.flankerNestedCircleCount}-${launch.flankerExtremeMode}-${launch.flankerArrowMode}-${launch.stroopWordMode}-${launch.stroopArrowMode}-${launch.stroopWordDifficulty}-${launch.flowFeatures.join(',')}-${launch.sportsArenaFeatures.join(',')}-${launch.diveEnvironmentTheme}-${launch.flowDuration}-${launch.flowIncludeBonus}-${launch.colorGateVariant}-${launch.colorGateCategories.join(',')}-${launch.colorGateDifficulties.join(',')}-${launch.numberCartTier}-${launch.colorTrackerTier}-${launch.colorTrackerDualPanel}-${launch.moleLookMode}-${launch.moleBonusTimeEnabled}-${launch.camouflagePlacement}-${launch.goalkeeperTier}-${launch.goalkeeperBonusTimeEnabled}-${launch.handFootDifficulty}-${launch.colorMemoryGridSize}-${launch.colorMemoryGridMode}-${launch.virusOutbreakDifficulty}-${launch.shellTrackingDifficulty}-${launch.shellTrackingTargetSeconds}-${launch.shellTrackingShuffleCount}-${launch.shellTrackingResponseSeconds}-${launch.relativeCompassDifficulty}-${launch.relativeCompassStartSeconds}-${launch.relativeCompassResponseSeconds}-${launch.activityId}-${launch.simonPoleCount}-${launch.memoryColorSlots.join(',')}`}
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

  const [selection, setSelection] = useState(() => {
    const levelId = typeof initialLevelId === 'number' ? initialLevelId : (m?.levels?.[0]?.id ?? 1);
    const launch = initial;
    const activityId = typeof initialLevelId === 'number'
      ? resolveTrainingActivity(modeId, levelId, launch)
      : catalogTrainingActivity(modeId, levelId);
    const selectedLaunch = { ...launch, activityId };
    return { levelId, launch: launchSettingsForLevel(modeId, levelId, selectedLaunch) };
  });
  const { levelId, launch } = selection;
  const setLevelId = (update: number | ((current: number) => number)) => setSelection(current => {
    const levelId = typeof update === 'function' ? update(current.levelId) : update;
    return { levelId, launch: { ...current.launch, activityId: trainingActivityForLevelChange(modeId, levelId, current.launch.activityId) } };
  });
  const setLaunch = useCallback((update: LaunchSettings | ((current: LaunchSettings) => LaunchSettings)) => setSelection(current => {
    const launch = typeof update === 'function' ? update(current.launch) : update;
    return { ...current, launch: { ...launch, activityId: trainingActivityForLevelChange(modeId, current.levelId, launch.activityId) } };
  }), [modeId]);
  const selectedActivity = resolveTrainingSelection(modeId, levelId, { activityId: launch.activityId });
  const [previousMemorySettings, setPreviousMemorySettings] = useState(() => {
    const source = initial.activityId === 'glass-bridge-memory' ? DEFAULT_LAUNCH : initial;
    return { speed: source.speed, targetReps: source.targetReps, timeMode: source.timeMode };
  });

  const [guideOpen, setGuideOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showVariantAppendix, setShowVariantAppendix] = useState(false);
  const [flowPresets, setFlowPresets] = useState<FlowPreset[]>(() => loadFlowPresets());
  const [flowPresetError, setFlowPresetError] = useState<string | null>(null);
  const { data: diveEnvData } = useSpomoveDiveEnvironments();

  const saveFlowPreset = () => {
    const name = window.prompt('프리셋 이름', `세팅 ${flowPresets.length + 1}`);
    if (!name) return;
    const next: FlowPreset[] = [...flowPresets, { id: Date.now().toString(), name, features: [...launch.flowFeatures], sportsArenaFeatures: [...launch.sportsArenaFeatures], environmentTheme: launch.diveEnvironmentTheme, duration: launch.flowDuration, includeBonus: launch.flowIncludeBonus, colorGateCategory: launch.colorGateCategory, colorGateCategories: launch.colorGateCategories, colorGateDifficulties: launch.colorGateDifficulties }];
    const result = saveFlowPresets(next);
    if (!result.success) { setFlowPresetError(result.error); return; }
    setFlowPresets(next);
    setFlowPresetError(null);
  };
  const loadFlowPreset = (p: FlowPreset) => setLaunch((s) => ({ ...s, flowFeatures: [...p.features] as FlowFeatureKey[], sportsArenaFeatures: [...(p.sportsArenaFeatures ?? [])], diveEnvironmentTheme: p.environmentTheme, flowDuration: p.duration, flowIncludeBonus: p.includeBonus ?? s.flowIncludeBonus, colorGateCategory: p.colorGateCategory ?? 'all', colorGateCategories: p.colorGateCategories ?? s.colorGateCategories, colorGateDifficulties: p.colorGateDifficulties ?? s.colorGateDifficulties }));
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
  }, [initialLevelId, setLaunch]);

  const guideBlock = useMemo(
    () => GUIDE_BLOCKS.find((b) => b.id === selectedActivity.catalogMode) ?? null,
    [selectedActivity.catalogMode],
  );

  const engineGuideVideoUrl = useMemo(
    () => TRAINING_ENGINE_GUIDE_VIDEOS[modeId] ?? null,
    [modeId],
  );

  const guidePhase = useMemo(
    () => trainingActivityGuide(modeId, levelId, { activityId: launch.activityId }) ?? null,
    [modeId, levelId, launch.activityId],
  );

  const isReactTrain = modeId === 'reactTrain';
  const isSpatial = modeId === 'spatial';
  const isSimon = modeId === 'simon';
  const isFlowOrChallenge = modeId === 'flow';
  const isColorGateTheme = isFlowColorGateLevel(modeId, levelId);
  const isReactTrainRepetition = isReactTrainRepetitionLevel(modeId, levelId);
  const compactSettingsMenu =
    isReactTrain ||
    isSimon || modeId === 'flanker' || isSpatial;

  useEffect(() => {
    if (!isFlowOrChallenge) return;
    setLaunch((s) => launchSettingsForLevel(modeId, levelId, s));
  }, [isFlowOrChallenge, levelId, modeId, setLaunch]);

  return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', ...(isSpatial ? { wordBreak: 'keep-all' as const } : {}) }}>
      <style jsx>{`
        .settings-body {
          flex: 1;
          padding: 30px 24px 48px;
          display: flex;
          justify-content: center;
        }
        .settings-body.dive-fit {
          padding: 14px 20px 20px;
        }
        .settings-body.dive-fit .settings-shell > h1 {
          font-size: 18px !important;
        }
        .settings-body.dive-fit .settings-columns {
          gap: 12px;
        }
        .settings-body.compact-menu { padding: 14px 20px 18px; }
        .settings-body.compact-menu .settings-shell > h1 { font-size: 18px !important; }
        .settings-body.compact-menu .settings-shell > p { margin-top: 4px !important; line-height: 1.35 !important; }
        .settings-body.compact-menu .settings-guide { margin-top: 8px !important; }
        .settings-body.compact-menu .settings-guide > button { padding: 8px 12px !important; }
        .settings-body.compact-menu .settings-divider { margin: 8px 0 10px !important; }
        .settings-body.compact-menu .settings-columns { gap: 14px; }
        .settings-body.compact-menu .settings-column > section { margin-bottom: 11px !important; }
        .settings-body.compact-menu .settings-column section button { padding-top: 7px !important; padding-bottom: 7px !important; border-radius: 9px !important; }
        .settings-body.compact-menu .settings-column section p { line-height: 1.35 !important; }
        .settings-shell {
          width: 100%;
          max-width: 1040px;
        }
        .settings-columns {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: clamp(16px, 3vw, 32px);
          align-items: start;
        }
        .settings-column {
          min-width: 0;
        }
        .theme-options {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 5px;
        }
        .theme-option span {
          line-height: 20px;
        }
        .settings-body button {
          min-height: 44px !important;
        }
        @media (max-width: 767px) {
          .settings-body {
            padding: 18px 12px calc(24px + env(safe-area-inset-bottom));
          }
          .settings-columns {
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
          }
          .settings-body button { min-height: 44px; }
          .settings-body.compact-menu,
          .settings-body.dive-fit { padding: 14px 12px calc(20px + env(safe-area-inset-bottom)); }
        }
        @media (max-height: 520px) and (orientation: landscape) {
          .settings-body { padding-top: 12px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); }
          .settings-columns { gap: 12px; }
        }
      `}</style>
      <header style={{
        minHeight: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: 'max(4px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 4px max(12px, env(safe-area-inset-left))', borderBottom: `1px solid ${T.border}`, background: T.bg,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', minHeight: 44, alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${T.border}`, background: 'transparent', color: T.muted,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >
          ← 목록
        </button>
        <span style={{ fontSize: 12, color: T.text, fontWeight: 800 }}>
          {m?.icon} {modeLabelKoEn(modeId)} · {`${selectedActivity.number ? `${selectedActivity.number}번 : ` : ''}${selectedActivity.title}`}
        </span>
      </header>

      <div className={`settings-body${isFlowOrChallenge ? ' dive-fit' : ''}${compactSettingsMenu ? ' compact-menu' : ''}`}>
        <div className="settings-shell">
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>
            트레이닝 설정
          </h1>
          {isFlowOrChallenge ? null : (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>
            자극 속도·분량(또는 시간)을 맞춘 뒤 시작하세요. 아래에서 상세 가이드를 펼칠 수 있습니다.
          </p>
          )}

          {/* 가이드 */}
          <div className="settings-guide" style={{ marginTop: isFlowOrChallenge ? 10 : 18, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
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
                {isFlowOrChallenge ? '활동 안내 · DIVE' : (
                  <>
                    엔진 · 난이도 안내 {guideBlock ? `· ${modeLabelKoEn(modeId)}` : ''}
                    <span style={{ fontWeight: 600, color: T.muted }}> ({`${selectedActivity.number ? `${selectedActivity.number}번 : ` : ''}${selectedActivity.title}`})</span>
                  </>
                )}
              </span>
            </button>
            {guideOpen ? (
              <div style={{ padding: '12px 14px 16px', borderTop: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
                {launch.activityId !== 'visual-search' && launch.activityId !== 'moving-number-reader' && launch.activityId !== 'glass-bridge-memory' && <SettingsGuideVideoIframe accent={accent} videoUrl={engineGuideVideoUrl} />}
                {launch.activityId === 'glass-bridge-memory' ? (
                  <p style={{ margin: '10px 0', fontSize: 12, color: T.text, lineHeight: 1.65 }}>
                    순서대로 점등되는 세로 유리 발판의 색상을 기억하고 실제 SPOMAT에서 같은 순서로 움직입니다.
                    순서를 기억한 뒤 교사가 이동한 색을 한 칸씩 선택합니다. 맞으면 성공 연출, 틀리면 유리 파괴 연출과 함께 해당 칸의 정답을 공개하고 다음 발판으로 진행합니다.
                    쉬움은 전체 색상을 20초 동안 함께 보고, 어려움은 한 색씩 봅니다. 길이는 3→4→5→6→7칸 순서입니다. 5라운드는 각 길이 1회, 10라운드는 2회, 15라운드는 3회씩 진행하며 오답과 관계없이 끝까지 이어집니다. 점등 75%·소등 25%입니다.
                  </p>
                ) : launch.activityId === 'moving-number-reader' ? (
                  <p style={{ margin: '10px 0', fontSize: 12, color: T.text, lineHeight: 1.65 }}>
                    움직이는 숫자 캡슐을 눈으로 추적하고 숫자에 해당하는 구역으로 이동하는 활동입니다.
                    준비 1.5초 → 설정된 비행 시간 → 이동 3초 → 정답 공개 2.5초로 진행합니다.
                    3회차부터 가림막 1개, 5회차부터 3개가 등장하고 캡슐 크기는 점차 줄어듭니다.
                    1은 왼쪽 위 빨강, 2는 오른쪽 위 노랑, 3은 왼쪽 아래 초록, 4는 오른쪽 아래 파랑입니다.
                  </p>
                ) : launch.activityId === 'visual-search' ? (
                  <p style={{ margin: '10px 0', fontSize: 12, color: T.text, lineHeight: 1.65 }}>
                    여러 기호 속에서 다른 기호를 찾아 해당 SPOMAT 구역으로 이동하는 활동입니다.
                    선택한 단계와 목표 개수, 탐색 시간은 훈련 내내 유지됩니다.
                    1단계는 전반에 +와 ×의 다수·소수 역할이 바뀌고, 후반에는 정답의 색·기호 조합이 바뀝니다. 기호 개수는 점진적으로 늘어납니다.
                    목표 1개·2개 모두 탐색 후 정답을 자동으로 3초 동안 공개합니다.
                    2단계는 정답의 색·기호 조합이 라운드마다 달라집니다. 화면의 네 구역은 SPOMAT의 색 배치와 같습니다.
                  </p>
                ) : guideBlock ? (
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

          <div className="settings-divider" style={{ height: 1, background: T.border, margin: isFlowOrChallenge ? '10px 0 12px' : '18px 0 20px' }} />

          <div className="settings-columns">
            <div className="settings-column">

          {/* 세부 테마 */}
          <section style={{ marginBottom: isFlowOrChallenge ? 10 : 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>{isFlowOrChallenge ? '활동 유형' : '세부 테마'}</label>
              <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                {`${selectedActivity.number ? `${selectedActivity.number}번 : ` : ''}${selectedActivity.title}`}
              </div>
            </div>
            <div className="theme-options">
              {(m?.levels ?? []).map((lv) => {
                const active = selectedActivity.catalogMode === modeId && selectedActivity.catalogLevel === lv.id;
                return (
                  <button
                    className="theme-option"
                    key={lv.id}
                    type="button"
                    onClick={() => {
                      if (modeId === 'spatial' && lv.id === 8 && launch.activityId !== 'glass-bridge-memory') {
                        setPreviousMemorySettings({ speed: launch.speed, targetReps: launch.targetReps, timeMode: launch.timeMode });
                      }
                      setSelection(current => {
                        const chosen = resolveCatalogTrainingSelection(modeId, lv.id, { level: current.levelId, activityId: current.launch.activityId });
                        let next = launchSettingsForLevel(modeId, chosen.level, { ...current.launch, activityId: chosen.activityId,
                          ...(current.launch.activityId === 'glass-bridge-memory' && chosen.activityId !== 'glass-bridge-memory' ? previousMemorySettings : {}),
                          ...(chosen.activityId === 'glass-bridge-memory' && current.launch.activityId !== 'glass-bridge-memory' ? { speed: 2, targetReps: 5, glassBridgeStartLength: 3 as const } : {}),
                          ...(chosen.activityId === 'moving-number-reader' && current.launch.activityId !== 'moving-number-reader' ? { speed: 3, targetReps: 20 } : {}),
                          ...(current.launch.activityId === 'moving-number-reader' && chosen.activityId !== 'moving-number-reader' ? { speed: Math.min(6, current.launch.speed) } : {}),
                          ...(chosen.activityId === 'visual-search' && current.launch.activityId !== 'visual-search' ? { speed: 5, targetReps: 20 } : {}),
                          ...(current.launch.activityId === 'visual-search' && chosen.activityId !== 'visual-search' ? { speed: Math.min(6, current.launch.speed) } : {}),
                        });
                        if (isReactTrain) {
                          const mapped = chosen.optionDefaults;
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
                          if (chosen.runtime === 'number-cart') {
                            next = {
                              ...next,
                              timeMode: 'reps',
                              targetReps: normalizeAdminTrainingRounds(next.targetReps),
                            };
                          }
                          if (chosen.runtime === 'color-tracker') {
                            next = {
                              ...next,
                              timeMode: 'reps',
                              targetReps: normalizeAdminTrainingRounds(next.targetReps),
                            };
                          }
                          if (chosen.runtime === 'goalkeeper') {
                            next = {
                              ...next,
                              timeMode: 'reps',
                              targetReps: normalizeAdminTrainingRounds(next.targetReps),
                            };
                          }
                          if (chosen.runtime === 'shell-tracking') {
                            next = {
                              ...next,
                              timeMode: 'reps',
                              targetReps: [5, 10, 15, 20].includes(next.targetReps) ? next.targetReps : 10,
                              shellTrackingDifficulty: 'normal',
                              shellTrackingTargetSeconds: 3,
                              shellTrackingShuffleCount: 6,
                              shellTrackingResponseSeconds: 3,
                            };
                          }
                        }
                        if (chosen.runtime === 'instant-memory') {
                          next = {
                            ...next,
                            timeMode: 'time',
                            duration: [30, 60, 120, 180].includes(next.duration) ? next.duration : 60,
                            colorMemoryGridSize:
                              next.colorMemoryGridSize === 3 || next.colorMemoryGridSize === 5
                                ? next.colorMemoryGridSize
                                : 4,
                            colorMemoryGridMode: next.colorMemoryGridMode === 'oneshot' ? 'oneshot' : 'flicker',
                          };
                        }
                        return { levelId: chosen.level, launch: next };
                      });
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 9,
                      border: `1px solid ${active ? accent : T.border}`,
                      background: active ? `${accent}16` : T.card,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 900, color: active ? accent : T.text }}>
                      {catalogLevelLabelKoEn(modeId, lv.id)}
                    </span>
                  </button>
                );
              })}
              {isColorGateTheme ? <ColorGatePoseAppendix /> : null}
              {modeId === 'basic' && (
                <button
                  className="theme-option"
                  type="button"
                  onClick={() => setShowVariantAppendix((v) => !v)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 9,
                    border: `1px solid ${showVariantAppendix ? accent : T.border}`,
                    background: showVariantAppendix ? `${accent}16` : T.card,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
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

            </div>
            <div className="settings-column">

          {/* 시지각반응 플로우(1번) 전용: 동시 자극 수 */}
          {launch.activityId !== 'visual-search' && modeId === 'flanker' && levelId !== 1 && levelId !== 2 && levelId !== 3 && levelId !== 5 && levelId !== 6 ? (
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
                연상 색지각과 동일한 8가지입니다. 색상이 기본값이며, 선택한 테마 이미지가 다섯 원 안에 나오고 가운데 원 색으로 반응합니다. 믹스는 과일·동물·음식·자연·탈 것 5개 이미지 테마를 섞습니다.
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
                  본 활동 뒤 15초 · 점점 빠르게 다중 등장
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
                  보통은 1패널, 어려움은 2패널입니다. 느림은 공 9개, 빠름은 공 13개입니다. 흰 공 1개를 끝까지 추적합니다.
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
                  { id: 1 as const, label: '느림', sub: '공 9개' },
                  { id: 3 as const, label: '빠름', sub: '공 13개' },
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
                  본 활동 뒤 15초 · 점점 빠르게 다중 슛
                </div>
              </button>
            </section>
          ) : null}

          {/* 순차 기억 · 순간 기억(7): 타일 수 · 진행 방식 */}
          {isSpatial && isInstantMemoryLevel(levelId) ? (
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

          {isReactTrain && reactTrainEngineLevelForUi(levelId) === 14 ? (
            <section style={{ marginBottom: 26 }}>
              {([
                { label: '난이도', field: 'shellTrackingDifficulty' as const, options: [['easy', '쉬움', '600ms'], ['normal', '보통', '400ms'], ['hard', '어려움', '250ms']] as const },
              ] as const).map((group) => (
                <div key={group.field} style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>{group.label}</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {group.options.map(([value, label, sub]) => {
                      const active = launch[group.field] === value;
                      return (
                        <button key={String(value)} type="button" onClick={() => setLaunch((s) => ({ ...s, [group.field]: value, shellTrackingShuffleCount: value === 'easy' ? 4 : value === 'hard' ? 10 : 6 }))} style={{ flex: '1 1 70px', padding: '10px 8px', borderRadius: 12, border: `1.5px solid ${active ? accent : T.border}`, background: active ? `${accent}16` : T.card, color: active ? accent : T.textDim, fontFamily: 'inherit', fontSize: 14, fontWeight: active ? 900 : 700, cursor: 'pointer', textAlign: 'center' }}>
                          {active ? '✓ ' : ''}{label}
                          {sub ? <div style={{ marginTop: 3, fontSize: 10, color: active ? accent : T.muted }}>{sub} · {value === 'easy' ? 4 : value === 'hard' ? 10 : 6}회</div> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>목표·반응 시간</label>
                <SpeedSelector value={launch.shellTrackingTargetSeconds} min={2} max={6} step={1} showPresets={false} compact onChange={(value) => setLaunch((s) => ({ ...s, shellTrackingTargetSeconds: value as 2 | 3 | 4 | 5 | 6, shellTrackingResponseSeconds: value as 2 | 3 | 4 | 5 | 6 }))} />
              </div>
            </section>
          ) : null}

          {modeId === 'basic' && levelId === 8 && launch.activityId === 'shape-completion' ? (
            <section style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
              <div style={{ display: 'flex', gap: 8 }}>{([['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']] as const).map(([value, label]) => { const active = launch.shapeCompletionDifficulty === value; return <button key={value} type="button" onClick={() => setLaunch((current) => ({ ...current, shapeCompletionDifficulty: value }))} style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: `1.5px solid ${active ? accent : T.border}`, background: active ? `${accent}16` : T.card, color: active ? accent : T.textDim, fontFamily: 'inherit', fontWeight: active ? 900 : 700 }}>{label}</button>; })}</div>
              <div style={{ marginTop: 16 }}><label style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>반응 시간</label><SpeedSelector value={launch.shapeCompletionResponseSeconds} min={2} max={6} step={1} compact showPresets={false} onChange={(value) => setLaunch((current) => ({ ...current, shapeCompletionResponseSeconds: Math.min(6, Math.max(2, Math.round(value))) as 2 | 3 | 4 | 5 | 6 }))} /></div>
            </section>
          ) : null}
          {launch.activityId === 'relative-compass' ? (
            <section style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
              <div style={{ display: 'flex', gap: 8 }}>{([['easy', '쉬움', '화살표'], ['normal', '보통', '색상 화살표'], ['hard', '어려움', '대각선']] as const).map(([value, label, detail]) => { const active = launch.relativeCompassDifficulty === value; return <button key={value} type="button" onClick={() => setLaunch((s) => ({ ...s, relativeCompassDifficulty: value }))} style={{ flex: 1, padding: '10px 8px', borderRadius: 12, border: `1.5px solid ${active ? accent : T.border}`, background: active ? `${accent}16` : T.card, color: active ? accent : T.textDim, fontFamily: 'inherit', fontWeight: active ? 900 : 700, cursor: 'pointer' }}>{label}<span style={{ display: 'block', marginTop: 3, fontSize: 10, color: active ? accent : T.muted }}>{detail}</span></button>; })}</div>
              <div style={{ marginTop: 16 }}><label style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>시작 위치 확인 · 반응 시간</label><SpeedSelector value={launch.relativeCompassStartSeconds} min={2} max={6} step={1} compact showPresets={false} onChange={(value) => setLaunch((s) => ({ ...s, relativeCompassStartSeconds: value as 2 | 3 | 4 | 5 | 6, relativeCompassResponseSeconds: value as 2 | 3 | 4 | 5 | 6 }))} /></div>
            </section>
          ) : null}

          {launch.activityId === 'visual-search' && <>
            <section style={{ marginBottom: 26 }} aria-label="복합 시각탐색 안내">
              <h3 style={{ margin: '0 0 8px', fontSize: 14, color: T.text }}>복합 시각탐색</h3>
              <p style={{ margin: 0, color: T.textDim, fontSize: 12, lineHeight: 1.65 }}>여러 기호 속에서 다른 기호를 찾아 해당 SPOMAT 구역으로 이동하는 활동입니다.</p>
            </section>
            <section style={{ marginBottom: 26 }} aria-label="탐색 단계">
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: T.text }}>탐색 단계</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {([1, 2] as const).map(stage => {
                  const active = launch.visualSearchStage === stage;
                  return <button key={stage} type="button" aria-pressed={active} onClick={() => setLaunch(s => ({ ...s, visualSearchStage: stage, visualSearchTargetCount: normalizeSearchTargetCount(stage, s.visualSearchTargetCount) }))}
                    style={{ minHeight: 64, padding: '12px 10px', borderRadius: 12, border: `2px solid ${active ? accent : T.border}`, background: active ? `${accent}18` : T.card, color: active ? accent : T.text, font: 'inherit', fontSize: 14, fontWeight: 700, wordBreak: 'keep-all' }}>
                    {stage}단계 · {stage === 1 ? '고정형' : '이동형'} 탐색
                  </button>;
                })}
              </div>
              <p style={{ margin: '8px 0 0', color: T.textDim, fontSize: 12, lineHeight: 1.6 }}>{launch.visualSearchStage === 1 ? `움직이지 않는 기호가 10개부터 최대 30개까지 늘어납니다. 앞 ${Math.floor(launch.targetReps / 2)}회는 +와 ×의 다수·소수 역할이 번갈아 바뀌고, 뒤 ${Math.ceil(launch.targetReps / 2)}회는 정답의 색·기호 조합이 바뀝니다.` : '움직이는 기호가 20개부터 최대 60개까지 늘어납니다. 드물게 등장하는 색·기호 조합이 라운드마다 정답이 됩니다.'}</p>
            </section>
            <section style={{ marginBottom: 26 }} aria-label="목표 개수">
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: T.text }}>목표 개수</h3>
              {launch.visualSearchStage === 1 ? <p style={{ margin: 0, color: T.textDim, fontSize: 14 }}>목표 1개 · 한 곳 찾기</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {([1, 2] as const).map(count => <button key={count} type="button" aria-pressed={launch.visualSearchTargetCount === count} onClick={() => setLaunch(s => ({ ...s, visualSearchTargetCount: count }))}
                  style={{ minHeight: 44, padding: '10px 8px', borderRadius: 12, border: `2px solid ${launch.visualSearchTargetCount === count ? accent : T.border}`, background: launch.visualSearchTargetCount === count ? `${accent}18` : T.card, color: launch.visualSearchTargetCount === count ? accent : T.text, font: 'inherit', fontSize: 14, fontWeight: 700 }}>
                  목표 {count}개 · {count === 1 ? '한 곳' : '두 곳'} 찾기
                </button>)}
              </div>}
            </section>
          </>}
          {launch.activityId === 'glass-bridge-memory' && <section style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', marginBottom: 10, fontSize: 11, fontWeight: 800, color: T.muted }}>난이도</label>
            <div style={{ display: 'flex', gap: 8 }}>{(['easy', 'hard'] as const).map(value => {
              const active = launch.glassBridgeDifficulty === value;
              return <button key={value} type="button" aria-pressed={active} onClick={() => setLaunch(s => ({ ...s, glassBridgeDifficulty: value }))}
                style={{ flex: 1, minHeight: 44, padding: '12px 8px', borderRadius: 12, border: `1.5px solid ${active ? accent : T.border}`, background: active ? `${accent}16` : T.card, color: active ? accent : T.textDim, fontFamily: 'inherit', fontWeight: 800 }}>
                {value === 'easy' ? '쉬움 · 전체 20초' : '어려움 · 한 색씩'}
              </button>;
            })}</div>
            {launch.glassBridgeDifficulty === 'easy' && <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>모든 발판의 색을 20초 동안 함께 본 뒤, 가려진 정답을 한 칸씩 맞춥니다.</p>}
          </section>}
          {/* 속도 / 순간 기억 기억 시간 */}
          {!(launch.activityId === 'glass-bridge-memory' && launch.glassBridgeDifficulty === 'easy') && (!isFlowOrChallenge || isColorGateTheme) && !(launch.activityId === 'relative-compass' || launch.activityId === 'shape-completion') && !(isReactTrain && (reactTrainEngineLevelForUi(levelId) === 5 || reactTrainEngineLevelForUi(levelId) === 9 || reactTrainEngineLevelForUi(levelId) === 14)) && !(isSpatial && isColorSequenceLevel(levelId)) ? (
            <section style={{ marginBottom: isColorGateTheme ? 10 : 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: isColorGateTheme ? 6 : 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>
                  {launch.activityId === 'glass-bridge-memory' ? '발판당 제시 시간 (점등 75% · 소등 25%)' : launch.activityId === 'moving-number-reader' ? '캡슐 비행 시간' : launch.activityId === 'visual-search' ? '탐색 시간 (정답 공개 3초 별도)' : isSpatial && isInstantMemoryLevel(levelId)
                    ? '기억 시간'
                    : isColorGateTheme
                      ? '게이트 통과 시간'
                      : isReactTrain && reactTrainEngineLevelForUi(levelId) === 10
                        ? '비행 시간'
                        : '신호 속도'}
                </label>
                <div style={{ fontSize: 12, color: T.textDim, fontWeight: 700 }}>
                  {launch.activityId === 'moving-number-reader' ? `${launch.speed.toFixed(1)}초 / 화면 통과` : isSpatial && isInstantMemoryLevel(levelId)
                    ? `${launch.speed.toFixed(1)}초 / 첫 화면`
                    : isColorGateTheme
                      ? `${launch.speed.toFixed(1)}초 / 화면 통과`
                      : isReactTrain && reactTrainEngineLevelForUi(levelId) === 10
                        ? `${launch.speed.toFixed(1)}초 / 스폰→히트`
                        : `${launch.speed.toFixed(1)}초 / 자극`}
                </div>
              </div>
              {isSpatial && isInstantMemoryLevel(levelId) ? (
                <p style={{ margin: '0 0 10px', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  첫 그리드가 보이는 시간입니다. 답 고르는 시간은 3초로 고정됩니다.
                </p>
              ) : null}
              <SpeedSelector
                value={launch.speed}
                onChange={(v) => setLaunch((s) => ({ ...s, speed: v }))}
                showPresets={false}
                compact={isColorGateTheme}
                max={isColorGateTheme || launch.activityId === 'moving-number-reader' ? 10 : 6}
              />
            </section>
          ) : null}

          {isSpatial && isColorSequenceLevel(levelId) ? (
            <>
              <section style={{ marginBottom: 22 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                    쉬움은 3색, 보통은 5색입니다.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {ADMIN_SEQUENCE_OPTIONS.map((opt) => {
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
                  색상별 1~2.5초 랜덤 제시
                </p>
              </section>
            </>
          ) : null}

          {isSpatial && isColorNumberLevel(levelId) ? (
            <section style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>난이도</label>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                  퀴즈와 전체 공개 모두 어려움 난이도로 진행합니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 4, label: '어려움', sub: '퀴즈' },
                  { id: 5, label: '어려움', sub: '전체 공개' },
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
          {isReactTrain && launch.activityId !== 'moving-number-reader' ? (
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

          {/* 모션 게이트 전용 옵션 */}
          {isColorGateTheme ? (
            <section style={{ marginBottom: 10 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>모션 게이트 옵션</label>
              </div>
              <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 800, color: T.muted }}>유형</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5, marginBottom: 8 }}>
                {([['all', '전체'], ['strength', '근력·근지구력'], ['flexibility', '유연성'], ['balance', '평형성'], ['power-jump', '순발력·민첩성'], ['together', '투게더'], ['family', '패밀리']] as const).map(([value, label]) => {
                  const soloCategories = ['strength', 'flexibility', 'balance', 'power-jump'] as const;
                  const active = value === 'all'
                    ? soloCategories.every((category) => launch.colorGateCategories.includes(category))
                    : launch.colorGateCategories.includes(value);
                  return (
                    <button key={value} type="button" onClick={() => setLaunch((s) => {
                      const next = value === 'family'
                        ? (s.colorGateCategories.includes('family')
                            ? s.colorGateCategories.filter((category) => category !== 'family')
                            : [...s.colorGateCategories.filter((category) => category === 'together'), 'family'] as ColorGateSelectableCategory[])
                        : value === 'all'
                        ? (soloCategories.every((category) => s.colorGateCategories.includes(category))
                            ? []
                            : [...soloCategories])
                        : s.colorGateCategories.includes(value)
                          ? s.colorGateCategories.filter((category) => category !== value)
                          : [...s.colorGateCategories, value];
                      return next.length ? { ...s, colorGateCategories: next } : s;
                    })}
                      aria-pressed={active}
                      style={{ minWidth: 0, minHeight: 40, padding: '7px 4px', borderRadius: 10, border: `1.5px solid ${active ? '#38BDF8' : T.border}`, background: active ? 'rgba(56,189,248,0.14)' : T.card, color: active ? '#38BDF8' : T.textDim, fontFamily: 'inherit', fontSize: 12, lineHeight: 1.2, fontWeight: 900, cursor: 'pointer', textAlign: 'center', wordBreak: 'keep-all' }}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 800, color: T.muted }}>난이도</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
                {([
                  ['single', '단일', '기본 동작'],
                  ['compound', '복합', '전체 동작'],
                ] as const).map(([value, label, difficulty]) => {
                  const familyOnly = launch.colorGateCategories.includes('family') && !launch.colorGateCategories.includes('together');
                  const active = familyOnly ? value === 'single' : launch.colorGateDifficulties.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={familyOnly}
                      onClick={() => setLaunch((s) => {
                        const next = s.colorGateDifficulties.includes(value)
                          ? s.colorGateDifficulties.filter((item) => item !== value)
                          : [...s.colorGateDifficulties, value];
                        return next.length ? { ...s, colorGateDifficulties: next } : s;
                      })}
                      aria-pressed={active}
                      style={{
                        minWidth: 0, padding: '8px 4px', borderRadius: 10, opacity: familyOnly && value !== 'single' ? 0.45 : 1,
                        border: `1.5px solid ${active ? '#06B6D4' : T.border}`,
                        background: active ? 'rgba(6,182,212,0.14)' : T.card,
                        color: active ? '#22D3EE' : T.textDim,
                        fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 900 }}>{active ? '✓ ' : ''}{label}</span>
                      <span style={{ display: 'block', marginTop: 2, fontSize: 10, fontWeight: 700 }}>{difficulty}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Flow 전용: Hub 파노라마 환경 테마 */}
          {isFlowOrChallenge ? (
            <section style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>환경 테마</label>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIVE_THEME_UI.map(({ id, label }) => {
                  const active = launch.diveEnvironmentTheme === id;
                  const hasHub = Boolean(diveEnvData.themes[id]);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, diveEnvironmentTheme: id, flowDuration: isDiveActionMoveUnityTheme(id) && !ACTION_MOVE_STAGE_SECONDS.includes(s.flowDuration as (typeof ACTION_MOVE_STAGE_SECONDS)[number]) ? DEFAULT_ACTION_MOVE_STAGE_SEC : s.flowDuration }))}
                      style={{
                        ...diveAdminChoiceStyle(active, accent),
                        flex: '1 1 88px',
                        padding: '8px 10px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        wordBreak: 'keep-all',
                      }}
                      title={hasHub ? 'Hub 파노라마' : '정적 폴백'}
                    >
                      <div style={{ fontWeight: 900, fontSize: 12, lineHeight: 1.2 }}>{active ? '✓ ' : ''}{label}</div>
                      {!hasHub ? <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>폴백</div> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {isColorGateTheme ? (
            <section style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>반복 횟수</label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                {COLOR_GATE_REPETITION_COUNTS.map((count) => {
                  const active = launch.targetReps === count;
                  return (
                    <button key={count} type="button" onClick={() => setLaunch((s) => ({ ...s, timeMode: 'reps', targetReps: count }))} style={{ ...diveAdminChoiceStyle(active, accent), padding: '8px 10px', fontSize: 13, fontWeight: active ? 900 : 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {count}회
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 액션 무브 전용: 스테이지 시간 */}
          {isFlowOrChallenge && !isColorGateTheme ? (
            <section style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>스테이지 시간</label>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ACTION_MOVE_STAGE_SECONDS.map((sec) => {
                  const active = launch.flowDuration === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setLaunch((s) => ({ ...s, flowDuration: sec }))}
                      style={{
                        ...diveAdminChoiceStyle(active, accent),
                        flex: '1 1 60px',
                        padding: '8px 10px',
                        fontSize: 13,
                        fontWeight: active ? 900 : 700,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sec}초
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {isFlowOrChallenge && !isColorGateTheme && isDiveActionMoveUnityTheme(launch.diveEnvironmentTheme) ? (
            <section style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>액션 구성</label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                {([
                  { key: 'side' as const, label: 'SIDE', detail: '좌·우 이동' },
                  { key: 'jump' as const, label: 'JUMP', detail: '장애물 뛰어넘기' },
                  { key: 'duck' as const, label: 'DUCK', detail: '숙여 통과하기' },
                ]).map(({ key, label, detail }) => {
                  const active = launch.sportsArenaFeatures.includes(key);
                  return (
                    <button key={key} type="button" onClick={() => setLaunch((current) => ({ ...current, sportsArenaFeatures: active ? current.sportsArenaFeatures.filter((feature) => feature !== key) : [...current.sportsArenaFeatures, key] }))} style={{ ...diveAdminChoiceStyle(active, accent), display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', textAlign: 'left', wordBreak: 'keep-all' }}>
                      <span><strong style={{ display: 'block', fontSize: 12, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{active ? '✓ ' : ''}{label}</strong><small style={{ color: active ? accent : T.muted, whiteSpace: 'nowrap' }}>{detail}</small></span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
          {/* Flow 전용: 추가 동작 선택 */}
          {isFlowOrChallenge && !isColorGateTheme && !isDiveActionMoveUnityTheme(launch.diveEnvironmentTheme) ? (
            <section style={{ marginBottom: 10 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>추가 동작 선택</label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                {(
                  [
                    { key: 'punch' as FlowFeatureKey, icon: '👊', label: '박스 펀치' },
                    { key: 'kick'  as FlowFeatureKey, icon: '🦵', label: '롤링 배럴 킥' },
                    { key: 'duck'  as FlowFeatureKey, icon: '🛸', label: 'UFO 숙이기' },
                    { key: 'reach' as FlowFeatureKey, icon: '🧱', label: '펀치 벽 두드리기' },
                  ]
                ).map(({ key, icon, label }) => {
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
                        ...diveAdminChoiceStyle(active, accent),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        textAlign: 'left',
                        wordBreak: 'keep-all',
                      }}
                    >
                      <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{icon}</span>
                      <span style={{ fontWeight: 900, fontSize: 12, color: active ? accent : T.text }}>
                        {active ? '✓ ' : ''}{label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {isFlowOrChallenge && !isColorGateTheme ? (
            <section style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>보너스</label>
              </div>
              <button type="button" onClick={() => setLaunch((current) => ({ ...current, flowIncludeBonus: !current.flowIncludeBonus }))} style={{ ...diveAdminChoiceStyle(launch.flowIncludeBonus, accent, 'amber'), width: '100%', padding: '8px 10px', fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap' }}>
                {launch.flowIncludeBonus ? '✓ ' : ''}BONUS · 60초
              </button>
              {isDiveActionMoveUnityTheme(launch.diveEnvironmentTheme) ? (() => {
                const actionMoveSelection = {
                  side: launch.sportsArenaFeatures.includes('side'),
                  jump: launch.sportsArenaFeatures.includes('jump'),
                  duck: launch.sportsArenaFeatures.includes('duck'),
                  bonus: launch.flowIncludeBonus,
                };
                const detail = formatDiveActionMoveDurationDetail(actionMoveSelection, launch.flowDuration);
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>예상 활동 시간</div>
                    <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: T.text, whiteSpace: 'nowrap' }}>{formatDiveActionMoveDuration(diveActionMoveDurationSec(actionMoveSelection, launch.flowDuration))}</div>
                    {detail ? <div style={{ marginTop: 2, fontSize: 11, fontWeight: 700, color: T.textDim, wordBreak: 'keep-all' }}><span style={{ whiteSpace: 'nowrap' }}>{detail}</span></div> : null}
                  </div>
                );
              })() : null}
            </section>
          ) : null}
          {/* Flow 전용: 프리셋 */}
          {isFlowOrChallenge && !isColorGateTheme ? (
            <section style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>프리셋</label>
                <button
                  type="button"
                  onClick={saveFlowPreset}
                  style={{ fontSize: 11, fontWeight: 800, color: accent, background: `${accent}18`, border: `1px solid ${accent}55`, borderRadius: 12, minHeight: 32, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  + 프리셋 저장
                </button>
              </div>
              {flowPresetError && (
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#F87171' }}>저장 실패: {flowPresetError}</p>
              )}
              {flowPresets.length === 0 ? (
                <p style={{ margin: 0, fontSize: 11, color: T.textDim, wordBreak: 'keep-all' }}>저장된 프리셋이 없습니다. 설정 후 저장하세요.</p>
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
          {!isFlowOrChallenge && <section style={{ marginBottom: 26 }}>
            <label style={{ display: 'block', marginBottom: 10, fontSize: 11, fontWeight: 800, color: T.muted }}>
              {isReactTrain && !isReactTrainRepetition && ![8, 9, 14].includes(reactTrainEngineLevelForUi(levelId)) ? '훈련 시간' : '목표 라운드'}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isReactTrain && !isReactTrainRepetition && ![8, 9, 14].includes(reactTrainEngineLevelForUi(levelId))
                ? [30, 60, 120, 180].map(sec => <button key={sec} type="button" aria-pressed={launch.duration === sec} onClick={() => setLaunch(s => ({ ...s, timeMode: 'time', duration: sec }))}
                    style={{ ...diveAdminChoiceStyle(launch.duration === sec, accent), flex: '1 1 64px', padding: '11px 10px' }}>{sec < 60 ? `${sec}초` : `${sec / 60}분`}</button>)
                : ADMIN_TRAINING_ROUNDS.map(r => <button key={r} type="button" aria-pressed={launch.targetReps === r} onClick={() => setLaunch(s => ({ ...s, timeMode: 'reps', targetReps: r }))}
                    style={{ ...diveAdminChoiceStyle(launch.targetReps === r, accent), flex: '1 1 64px', padding: '11px 10px', fontWeight: launch.targetReps === r ? 900 : 700 }}>{r}라운드</button>)}
            </div>
          </section>}

          {/* 변형 사분할: 단계 1~3 */}
          {modeId === 'basic' && isModifiedQuadrantLevel(levelId) && launch.activityId === 'hand-foot' ? (
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
                      onClick={() => { setLevelId(modifiedQuadrantLevelFromStage(stage)); setLaunch((current) => ({ ...current, activityId: 'hand-foot' })); }}
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

          {/* 사이먼 · 랜덤 테마 */}
          {modeId === 'simon' && levelId === 3 ? (
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
          {!isFlowOrChallenge && launch.activityId !== 'visual-search' && launch.activityId !== 'moving-number-reader' && launch.activityId !== 'glass-bridge-memory' ? (
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
            onClick={() => {
              if (document.fullscreenEnabled && !document.fullscreenElement) {
                void document.documentElement.requestFullscreen().catch((error: Error) => {
                  console.warn('[SPOMOVE] fullscreen request failed:', error.message);
                });
              }
              onStart(levelId, launchSettingsForLevel(modeId, levelId, launch));
            }}
            style={{
              width: '100%',
              padding: isFlowOrChallenge ? '12px 20px' : '17px 24px',
              borderRadius: isFlowOrChallenge ? 12 : 14,
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
    router.push(TEACHER_SPOMOVE_URL);
  }, [queryTopTab, router]);

  const switchTopTab = useCallback(
    (next: TopTab) => {
      if (next === 'teacher') {
        if (typeof window !== 'undefined') {
          router.push(TEACHER_SPOMOVE_URL);
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
              modeId: resume?.modeId ?? phase.modeId,
              levelId: resume?.levelId ?? phase.levelId,
              launch: resume?.launch
                ? autoLaunchToLaunchSettings(resume.launch, fallbackLaunch, resume.modeId, resume.levelId)
                : fallbackLaunch,
            });
          }}
        />
      )}

      <TrainingDashboard
        tab={topTab}
        filter={activeTab}
        onTabChange={switchTopTab}
        onFilterChange={setActiveTab}
        onPick={handlePick}
        appContent={<AppManagementTab />}
      />
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

