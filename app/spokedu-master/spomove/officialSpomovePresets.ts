import { SPOMOVE_AXIS_META, type SpomoveAxis } from '@/app/lib/spomove/spomoveAxisMeta';
import type { SpomoveColorThemeId } from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';
import {
  buildOfficialSpomoveExpansionPresets,
  OFFICIAL_SPOMOVE_EXPANSION_COUNT,
} from './officialSpomovePresetExpansion';
import type { MovementProfileId } from './movements/movementTypes';
import { enrichOfficialSpomoveLibrary } from './movements/enrichPresetMovement';
import { applyFullThemeSeedsToLibrary } from './operations/fullThemeSeed';
import { mergeOperationConfig } from './operations/operationMerge';
import { writeOperationQuery } from './operations/operationQuery';
import type {
  ActivityOperationConfig,
  ActivityOperationPatch,
} from './operations/operationTypes';

export type OfficialSpomoveAxis = SpomoveAxis;

export type SpomoveAxisTitle = (typeof SPOMOVE_AXIS_META)[OfficialSpomoveAxis]['title'];

export type OfficialFlowFeatureKey = 'faster' | 'punch' | 'duck' | 'reach' | 'kick' | 'colorGate';

export type OfficialSpomoveProgramGroup =
  | 'reaction-cognition'
  | 'visual-reaction'
  | 'simon'
  | 'flanker'
  | 'stroop'
  | 'sequential-memory'
  | 'dive'
  | 'bonus';

export type OfficialSpomoveEngineMode =
  | 'basic'
  | 'reactTrain'
  | 'simon'
  | 'flanker'
  | 'stroop'
  | 'spatial'
  | 'flow';

export type ExecutionFact = { label: string; value: string };

export type OfficialSpomovePreset = {
  id: string;
  sortOrder: number;
  title: string;
  en?: string;
  axis: OfficialSpomoveAxis;
  axisTitle: SpomoveAxisTitle;
  programGroup: OfficialSpomoveProgramGroup;
  programTitle: string;
  description: string;
  salesCopy?: string;
  engine: {
    mode: OfficialSpomoveEngineMode;
    level: number;
    variantColorTheme?: SpomoveColorThemeId;
    bodyLabelMode?: 'easy' | 'hard';
    hideBodyLabelModeControls?: boolean;
    spatialArrowColorMode?: 'basic' | 'color';
    spatialArrowColorMapping?: 'random' | 'compass';
    reactTrainConcurrent?: 1 | 2 | 3;
    moleLookMode?: 'classic' | 'variant';
    numberCartTier?: 1 | 2 | 3;
    colorTrackerTier?: 1 | 2 | 3;
    /** 골키퍼(10): 1=항상 1개 · 2=1~2개(더블) */
    goalkeeperTier?: 1 | 2;
    colorTrackerDualPanel?: boolean;
    flowFeatures?: OfficialFlowFeatureKey[];
    flowDuration?: number;
    flowLayout?: 'sequential' | 'random';
    flowIncludeBonus?: boolean;
    flankerStimulusType?: 'color' | 'number';
    flankerNestedCircleCount?: 3 | 5;
    camouflagePlacement?: 'center' | 'variant';
  };
  cueSeconds: number;
  rounds: number;
  bgmAutoPlay: true;
  bgmCategory: 'spomove-training';
  recommendedUse: string;
  isReady: boolean;
  readyLabel?: string;
  settingSummary: string;
  settingChips: string[];
  executionFacts: ExecutionFact[];
  /** 신체동작 레이어 — enrichment 후 필수. 테마 공유 키 */
  activityFamilyId?: string;
  /** 신체동작 레이어 — enrichment 후 필수 */
  movementProfileId?: MovementProfileId;
  /** Preset 공식 대표 움직임 (O2+). Family 추천보다 우선. */
  recommendedMovement?: import('./movements/movementTypes').MovementPick;
  /** Preset 공식 운영 Patch (O2+). */
  recommendedOperation?: import('./operations/operationTypes').ActivityOperationPatch;
  /** 예외적으로 Family Operation Profile 교체. 전면 6 Seed에서는 미사용. */
  operationProfileId?: import('./operations/operationTypes').ActivityOperationProfileId;
};

export const OFFICIAL_SPOMOVE_CORE_COUNT = 48;

export { OFFICIAL_SPOMOVE_EXPANSION_COUNT };

const OFFICIAL_SPOMOVE_CORE_LIBRARY: OfficialSpomovePreset[] = [
  // ─── OFFICIAL SPOMOVE CORE LIBRARY (47 presets after MQ easy/hard expand) ───

  // sortOrder 1: 공간 방향 (level 1)
  {
    id: 'reaction-cognition-space-direction-01',
    sortOrder: 1,
    title: '반응인지 1번 · 공간 방향',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 1 },
    description: '화면 극단의 거대 기둥+화살표 방향을 보고 해당 색 패드로 빠르게 이동하는 활동',
    salesCopy: '기둥 화살표 방향을 보고 빠르게 움직이는 반응력',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '수업 도입, 방향 인지, 민첩 반응',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '극단 기둥+화살표' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 1b: 공간 방향 · 색상 모드 (level 1, color fill)
  {
    id: 'reaction-cognition-space-direction-color-01b',
    sortOrder: 2,
    title: '반응인지 1번 · 공간 방향 · 색상',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 1, spatialArrowColorMode: 'color', spatialArrowColorMapping: 'compass' },
    description: '화면 극단의 거대 기둥+화살표 방향을 보고 해당 색 패드로 빠르게 이동하는 활동. 색상 모드에서는 위 빨·좌 초·우 노·아래 파로 화살표가 채워집니다.',
    salesCopy: '색이 채워진 화살표로 방향 반응을 확장하는 변형',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '수업 도입, 방향 인지, 색 자극 변형',
    isReady: true,
    settingSummary: '3초 · 20회 · 색상 모드 · BGM 자동',
    settingChips: ['3초', '20회', '색상 모드', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '극단 기둥+색 화살표' },
      { label: '색 매핑', value: '위빨·좌초·우노·하파' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 2: 사분할 색상 (level 2, color)
  {
    id: 'reaction-cognition-quad-color-02',
    sortOrder: 2,
    title: '반응인지 2번 · 사분할 색상 반응',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 2, variantColorTheme: 'color' },
    description: '네 영역에 제시되는 색상 신호를 보고 정해진 색상 또는 위치에 맞춰 반응하는 활동',
    salesCopy: '색과 위치를 함께 보는 선택 반응력',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상 인지, 위치 선택, 준비운동',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '사분할 이미지' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 3: 사분할 과일 (level 2, fruit)
  {
    id: 'reaction-cognition-quad-fruit-10',
    sortOrder: 3,
    title: '반응인지 · 사분할 · 과일',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 2, variantColorTheme: 'fruit' },
    description: '네 영역에 제시되는 과일 이미지 신호를 보고 정해진 위치에 맞춰 반응하는 활동',
    salesCopy: '과일 이미지로 더 직관적인 사분할 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상 인지, 위치 선택, 어린 학습자',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '과일 테마', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '사분할 이미지' },
      { label: '테마', value: '과일' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 8: 전면 색상 (level 3, color)
  {
    id: 'reaction-cognition-full-color-03',
    sortOrder: 4,
    title: '반응인지 3번 · 전면 색상 반응',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 3, variantColorTheme: 'color' },
    description: '전면에 제시되는 색상 신호를 보고 빠르게 판단하고 움직이는 활동',
    salesCopy: '큰 색 자극에 즉시 반응하는 집중력',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 색상 판단, 집중 전환',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '전면 이미지' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 12: 전면 동물 (level 3, animal)
  {
    id: 'reaction-cognition-full-animal-18',
    sortOrder: 6,
    title: '반응인지 · 전면 · 동물',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 3, variantColorTheme: 'animal' },
    description: '전면에 제시되는 동물 이미지 신호를 보고 빠르게 판단하고 움직이는 활동',
    salesCopy: '동물 이미지로 친숙하게 즐기는 전면 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 이미지 판단, 어린 학습자 친화',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '동물 테마', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '전면 이미지' },
      { label: '테마', value: '동물' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 13: 전면 자연 (level 3, nature)
  {
    id: 'reaction-cognition-full-nature-19',
    sortOrder: 7,
    title: '반응인지 · 전면 · 자연',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 3, variantColorTheme: 'nature' },
    description: '전면에 제시되는 자연물 이미지 신호를 보고 빠르게 판단하고 움직이는 활동',
    salesCopy: '자연 소재로 차분하게 즐기는 전면 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 이미지 판단, 자연 친화 수업',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '자연 테마', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '전면 이미지' },
      { label: '테마', value: '자연' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 14: 2분할 색상 (level 4, color)
  {
    id: 'reaction-cognition-split-color-04',
    sortOrder: 8,
    title: '반응인지 4번 · 2분할 색상 반응',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 4, variantColorTheme: 'color' },
    description: '좌우 또는 상하로 나뉜 두 영역의 색상 신호를 보고 빠르게 선택 반응하는 활동',
    salesCopy: '좌우 정보를 빠르게 구분하는 판단력',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '선택 반응, 양측 이동, 난이도 확장',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '2분할 이미지' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 20: 3패널 색상 (level 5, color)
  {
    id: 'reaction-cognition-triple-color-25',
    sortOrder: 9,
    title: '반응인지 · 3패널 · 색상',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 5, variantColorTheme: 'color' },
    description: '세 패널에 제시되는 색상 신호를 보고 빠르게 선택 반응하는 고급 활동',
    salesCopy: '3패널 색상으로 선택 반응력을 극한으로',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '고급 선택 반응, 집중력 강화, 심화 훈련',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '색상 테마', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '3패널 이미지' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // 반응인지 6번 · 3패널 다른색
  {
    id: 'reaction-cognition-triple-diff-color-31',
    sortOrder: 10,
    title: '반응인지 6번 · 3패널 다른색',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 6, variantColorTheme: 'color' },
    description: '세 패널에 서로 다른 색 신호가 제시될 때 빠르게 선택 반응하는 활동',
    salesCopy: '3패널 서로 다른 색으로 선택 반응 심화',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '심화 반응, 집중력, 변형 사분할',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '색상 테마', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '3패널 이미지' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // 반응인지 7번 · 변형 사분할 1단계
  {
    id: 'reaction-cognition-mq1-32',
    sortOrder: 11,
    title: '반응인지 7번 · 변형 사분할 1단계',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 7, variantColorTheme: 'color' },
    description: '색상 자극과 신체 부위(발)가 함께 제시될 때 해당 패드에 발을 접촉하는 활동',
    salesCopy: '발 중심 변형 사분할로 신체-색 연결',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '심화 반응, 집중력, 변형 사분할',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '변형 사분할 · 발' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // 반응인지 8번 · 변형 사분할 2단계
  {
    id: 'reaction-cognition-mq2-33',
    sortOrder: 12,
    title: '반응인지 8번 · 변형 사분할 2단계',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 8 },
    description: '색상 1~2개와 신체 부위(발·손)가 함께 제시될 때 해당 패드로 이동하는 활동',
    salesCopy: '손·발 혼합 변형 사분할 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '심화 반응, 집중력, 변형 사분할',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '변형 사분할 · 손+발' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // 반응인지 9번 · 변형 사분할 3단계
  {
    id: 'reaction-cognition-mq3-34',
    sortOrder: 13,
    title: '반응인지 9번 · 변형 사분할 3단계',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 9 },
    description: '색상 1~3개와 신체 부위가 배정될 때 각 패드에 맞게 반응하는 활동',
    salesCopy: '3색 신체 배정 변형 사분할',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '심화 반응, 집중력, 변형 사분할',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '변형 사분할 · 3색' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // 반응인지 10번 · 변형 사분할 4단계
  {
    id: 'reaction-cognition-mq4-35',
    sortOrder: 14,
    title: '반응인지 10번 · 변형 사분할 4단계',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 10, variantColorTheme: 'color' },
    description: '3색에 손·발이 혼합 배정될 때 규칙에 맞게 패드로 이동하는 최고 난이도 활동',
    salesCopy: '손·발 혼합 3색 변형 사분할 극한',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '심화 반응, 집중력, 변형 사분할',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '변형 사분할 · 3색 혼합' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // 시지각 반응 — 1번: 파도타기 (engine level 1)
  {
    id: 'visual-reaction-rush-39',
    sortOrder: 15,
    title: '시지각 반응 · 파도타기',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 1 },
    description: '파도타기처럼 빠르게 쏟아지는 자극에 연속으로 반응하는 초고속 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '초고속 반응, 연속 자극 처리, 극한 집중',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['파도타기', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '파도타기' },
      { label: '진행 방식', value: '연속 반응' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 27: FLOW ×1 (level 1, concurrent 1)
  {
    id: 'visual-reaction-flow-05',
    sortOrder: 16,
    title: '시지각 반응 · 떨어지는 벽돌',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 2, reactTrainConcurrent: 1 },
    description: '떨어지는 벽돌처럼 색 자극이 흘러내릴 때 해당 색 위치로 이동하는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '수업 도입, 시선 집중, 기본 반응 깨우기',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '동시 자극', value: '1개' },
      { label: '진행 방식', value: '떨어지는 벽돌' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 28: FLOW ×2 (level 1, concurrent 2)
  {
    id: 'visual-reaction-flow-2x-31',
    sortOrder: 16,
    title: '시지각 반응 · 떨어지는 벽돌 ×2',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 2, reactTrainConcurrent: 2 },
    description: '떨어지는 벽돌처럼 색 자극이 동시에 2개씩 흘러내릴 때 빠르게 반응하는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '시지각 분할, 동시 자극 처리, 반응력 강화',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['동시 2개', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '동시 자극', value: '2개' },
      { label: '진행 방식', value: '떨어지는 벽돌' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 29: FLOW ×3 (level 1, concurrent 3)
  {
    id: 'visual-reaction-flow-3x-32',
    sortOrder: 17,
    title: '시지각 반응 · 떨어지는 벽돌 ×3',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 2, reactTrainConcurrent: 3 },
    description: '떨어지는 벽돌처럼 색 자극이 동시에 3개씩 흘러내릴 때 빠르게 반응하는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '시지각 분산, 다중 자극 처리, 집중력 극대화',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['동시 3개', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '동시 자극', value: '3개' },
      { label: '진행 방식', value: '떨어지는 벽돌' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 30: FLASH (level 3)
  {
    id: 'visual-reaction-flash-33',
    sortOrder: 18,
    title: '시지각 반응 · 풍선 터뜨리기',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 3 },
    description: '풍선 터뜨리기처럼 순간적으로 나타나는 자극에 빠르게 반응하는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '순간 집중, 빠른 반응, 시각 각성',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['풍선 터뜨리기', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '풍선 터뜨리기' },
      { label: '진행 방식', value: '순간 반응' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 31: Beat Wave (level 4)
  {
    id: 'visual-reaction-pulse-36',
    sortOrder: 19,
    title: '시지각 반응 · 동그라미 파동',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 4 },
    description: '동그라미 파동처럼 리듬감 있게 제시되는 자극에 빠르게 반응하는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '리듬 반응, 박자 감각, 집중 유지',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['동그라미 파동', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '동그라미 파동' },
      { label: '진행 방식', value: '리듬 반응' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 32: CAMOUFLAGE (level 5)
  {
    id: 'visual-reaction-blackout-37',
    sortOrder: 20,
    title: '시지각 반응 · 매직 아이',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 5, camouflagePlacement: 'center' },
    description: '노이즈 속에 위장된 색 사물(과일 등)이 드러날 때 해당 색을 찾는 시지각 반응 활동. 난이도 1/2는 세션에서 고릅니다.',
    cueSeconds: 5,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '고난도 집중, 색 변별, 위장 탐지',
    isReady: true,
    settingSummary: '5초 · 20회 · BGM 자동',
    settingChips: ['매직 아이', '5초 고정', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '매직 아이' },
      { label: '진행 방식', value: '위장 탐지' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 33: MOLE (level 6)
  {
    id: 'visual-reaction-mole-l1',
    sortOrder: 23,
    title: '시지각 반응 · 두더지 잡기',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 6, moleLookMode: 'classic' },
    description: '화면 곳곳 구멍에서 튀어나오는 두더지 자극에 빠르게 반응하는 시지각 반응. 난이도 1/2는 세션에서 고릅니다.',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '순발력, 팝업 반응, 게임형 활동',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['두더지 잡기', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '두더지 잡기' },
      { label: '진행 방식', value: '팝업 반응' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 34: WORMHOLE (level 7)
  {
    id: 'visual-reaction-wormhole-41',
    sortOrder: 24,
    title: '시지각 반응 · 소행성을 피해라',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 7 },
    description: '무한 가속하는 웜홀 속에서 소행성이 없는 안전한 색 구역으로 회피하는 고난도 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '고난도 집중, 회피 반응, 몰입 훈련',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['소행성 회피', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '소행성을 피해라' },
      { label: '진행 방식', value: '회피 반응' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 35: NUMBER CART (level 8)
  {
    id: 'visual-reaction-number-cart-l2',
    sortOrder: 25,
    title: '시지각 반응 · 숫자 기차',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 8, numberCartTier: 1 },
    description: '숫자 기차의 목표 숫자(또는 +-×÷ 식)를 보고 같은 답이 붙은 색 문으로 기차가 들어가는 시지각 반응 활동. 난이도 1/2/3은 세션에서 고릅니다.',
    cueSeconds: 3,
    rounds: 5,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '숫자·색 매칭, 사전 판단, 선택 반응',
    isReady: true,
    settingSummary: '3초 · 5라운드 · BGM 자동',
    settingChips: ['숫자 기차', '5라운드', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '숫자 기차' },
      { label: '진행 방식', value: '라운드 · 숫자·색 매칭' },
      { label: '라운드', value: '5라운드' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 36: COLOR TRACKER (level 9)
  {
    id: 'visual-reaction-color-tracker-l2',
    sortOrder: 26,
    title: '시지각 반응 · 흰 공 찾기',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 9, colorTrackerTier: 1 },
    description: '흰 공을 끝까지 추적한 뒤 빨·노·초·파 구역 중 어디에 멈췄는지 맞추는 시지각 반응 활동. 난이도 1/2/3은 세션에서 고릅니다.',
    cueSeconds: 3,
    rounds: 5,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '시각 추적, 지속 주의, 다중 물체 추적',
    isReady: true,
    settingSummary: '흰 공 추적 · 5라운드 · BGM 자동',
    settingChips: ['흰 공 찾기', '5라운드', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '흰 공을 찾아라' },
      { label: '진행 방식', value: '라운드 · 정답 수동 공개' },
      { label: '라운드', value: '5라운드' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // 10번: 골키퍼 모드 (engine level 10)
  {
    id: 'visual-reaction-goalkeeper-42',
    sortOrder: 27,
    title: '시지각 반응 · 골키퍼 모드',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 10, goalkeeperTier: 2 },
    description: '4코너로 날아오는 슛·커브볼·더블 블록을 끝까지 추적해 상단은 손, 하단은 발로 막는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 궤적 추적, 양손·양발 방어',
    isReady: true,
    settingSummary: '골키퍼 방어 · 비행 3초 · 1~2개 · 약 120초 · BGM 자동',
    settingChips: ['골키퍼 모드', '비행 3초', '1~2개', '120초', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '골키퍼 모드' },
      { label: '진행 방식', value: '궤적 추적 · 손/발 방어' },
      { label: '비행 시간', value: '약 3초(설정 가능)' },
      { label: '동시 공', value: '1~2개' },
      { label: '실행 시간', value: '약 120초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 37: Pole Shape (level 1)
  {
    id: 'simon-pole-shape-06',
    sortOrder: 27,
    title: '사이먼 효과 1번 · Pole Shape',
    en: 'Simon Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'simon',
    programTitle: '사이먼 효과',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'simon', level: 1 },
    description: '도형이 나타난 위치에 끌려가지 않고, 도형의 색을 기준으로 반응하는 선택 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '위치 간섭 조절, 선택주의, 집중 반응',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Pole Shape' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 38: Pole Arrows (level 2)
  {
    id: 'simon-pole-arrows-41',
    sortOrder: 28,
    title: '사이먼 효과 · Pole Arrows',
    en: 'Simon Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'simon',
    programTitle: '사이먼 효과',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'simon', level: 2 },
    description: '화살표 방향과 위치가 충돌할 때 위치가 아닌 화살표 색상에 반응하는 고급 선택 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '위치-방향 간섭, 선택주의 심화, 집중 반응',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '화살표 자극', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Pole Arrows' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 39: Uniform (level 1)
  {
    id: 'flanker-uniform-07',
    sortOrder: 29,
    title: '플랭커 1번 · Uniform Flankers',
    en: 'Flanker',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 1 },
    description: '가로로 나란히 제시되는 다섯 원 중 가운데 목표 색에 반응하는 선택 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '선택주의, 목표 집중, 방해 정보 조절',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Uniform' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 41: Random (level 3)
  {
    id: 'flanker-random-43',
    sortOrder: 31,
    title: '플랭커 · Random Flankers',
    en: 'Flanker',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 3 },
    description: '무작위로 배치된 방해 자극 사이에서 목표 신호를 선택하는 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '무작위 자극 처리, 선택주의 강화, 반응력',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '무작위 자극', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Random' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 43.5: Nested Circles (level 4)
  {
    id: 'flanker-nested-circles-04',
    sortOrder: 31.5,
    title: '플랭커 4번 · 원 속의 원',
    en: 'Flanker',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 4, flankerNestedCircleCount: 3 },
    description: '겹쳐진 원들 중 가장 안쪽 목표 원을 보고 해당 색 위치로 반응하는 선택주의 플랭커 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '중첩 자극 처리, 목표 원 집중, 방해 정보 억제',
    isReady: true,
    settingSummary: '3초 · 20회 · 원 속의 원 3개 · BGM 자동',
    settingChips: ['원 속의 원', '3개 기본', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Nested Circles' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 44: 5 Circle (level 6)
  {
    id: 'flanker-5circle-46',
    sortOrder: 32,
    title: '플랭커 · 5 Circle Flankers',
    en: 'Flanker',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 6 },
    description: '다섯 개 원 구성에서 가운데 목표 신호를 선택하는 표준 플랭커 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '표준 플랭커, 방해 자극 억제, 선택주의 훈련',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '5원 자극', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '5 Circle' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 45: 공간 방향 · 색상 (구 화살표 스트룹/역스트룹 1번 대체)
  {
    id: 'stroop-arrow-reverse-08',
    sortOrder: 33,
    title: '스트룹 과제 1번 · 공간 방향 · 색상',
    en: 'Stroop Task',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 과제',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'basic', level: 1, spatialArrowColorMode: 'color', spatialArrowColorMapping: 'compass' },
    description: '방향별 색이 채워진 화살표를 보고 해당 방향 패드로 빠르게 이동하는 활동. 위 빨·좌 초·우 노·아래 파로 고정됩니다.',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '방향 인지, 색-방향 연계, 수업 도입',
    isReady: true,
    settingSummary: '3초 · 20회 · 색상 모드 · BGM 자동',
    settingChips: ['3초', '20회', '색상 모드', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '방향별 색 화살표' },
      { label: '색 매핑', value: '위빨·좌초·우노·하파' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 46: Arrow BG (level 2)
  {
    id: 'stroop-arrow-bg-47',
    sortOrder: 34,
    title: '스트룹 과제 · Arrow BG',
    en: 'Stroop Task',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 과제',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'stroop', level: 2 },
    description: '배경 색상과 화살표 방향이 충돌할 때 화살표 규칙에 따라 반응하는 복합 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상-방향 충돌 처리, 규칙 우선 반응, 실행력 강화',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '배경 자극', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Arrow BG' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 47: Word Reverse (level 3)
  {
    id: 'stroop-word-reverse-48',
    sortOrder: 35,
    title: '스트룹 과제 · Word Reverse',
    en: 'Stroop Task',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 과제',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'stroop', level: 3 },
    description: '단어 의미와 반대되는 규칙에 따라 반응하는 언어-운동 복합 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '언어 간섭 처리, 규칙 역전, 실행력 심화',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '언어 역전', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Word Reverse' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 48: Word BG (level 4)
  {
    id: 'stroop-word-bg-49',
    sortOrder: 36,
    title: '스트룹 과제 · Word BG',
    en: 'Stroop Task',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 과제',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'stroop', level: 4 },
    description: '배경 색상과 단어 의미가 충돌할 때 단어 규칙을 따라 반응하는 복합 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '언어-색상 충돌 처리, 실행 제어, 심화 훈련',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '언어+배경', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Word BG' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 49: Missing Color (level 5)
  {
    id: 'stroop-missing-color-50',
    sortOrder: 37,
    title: '스트룹 과제 · Missing Color',
    en: 'Stroop Task',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 과제',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'stroop', level: 5 },
    description: '제시된 단어들 중 빠진 색상을 찾아 반응하는 고급 스트룹 과제 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '탐색적 실행 제어, 빠진 정보 탐지, 고급 집중력',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '색상 탐색', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Missing Color' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 50: 3 Color Memory (level 1)
  {
    id: 'sequential-memory-3color-09',
    sortOrder: 38,
    title: '순차 기억 1번 · 3 Color Memory',
    en: 'Sequential Memory',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'sequential-memory',
    programTitle: '순차 기억',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'spatial', level: 1 },
    description: '차례로 제시되는 색 3개의 순서를 기억하고 몸으로 재현하는 기억 수행 활동',
    cueSeconds: 3,
    rounds: 10,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '순서 기억, 작업기억, 차분한 마무리 활동',
    isReady: true,
    settingSummary: '3색 기억 · 1~2.5초 랜덤 · 10라운드 · BGM 자동',
    settingChips: ['3색 기억', '1~2.5초 랜덤', '10라운드', 'BGM 자동'],
    executionFacts: [
      { label: '기억 방식', value: '3색 순서' },
      { label: '색 전환', value: '1~2.5초 랜덤' },
      { label: '라운드', value: '10라운드' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 51: 5 Color Memory (level 2)
  {
    id: 'sequential-memory-5color-51',
    sortOrder: 39,
    title: '순차 기억 · 5 Color Memory',
    en: 'Sequential Memory',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'sequential-memory',
    programTitle: '순차 기억',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'spatial', level: 2 },
    description: '차례로 제시되는 색 5개의 순서를 기억하고 몸으로 재현하는 기억 수행 활동',
    cueSeconds: 3,
    rounds: 10,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '순서 기억, 작업기억 확장, 집중 마무리 활동',
    isReady: true,
    settingSummary: '5색 기억 · 1~2.5초 랜덤 · 10라운드 · BGM 자동',
    settingChips: ['5색 기억', '1~2.5초 랜덤', '10라운드', 'BGM 자동'],
    executionFacts: [
      { label: '기억 방식', value: '5색 순서' },
      { label: '색 전환', value: '1~2.5초 랜덤' },
      { label: '라운드', value: '10라운드' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 52: 10 Color Memory (level 3)
  {
    id: 'sequential-memory-10color-52',
    sortOrder: 40,
    title: '순차 기억 · 10 Color Memory',
    en: 'Sequential Memory',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'sequential-memory',
    programTitle: '순차 기억',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'spatial', level: 3 },
    description: '차례로 제시되는 색 10개의 순서를 기억하고 몸으로 재현하는 고급 기억 수행 활동',
    cueSeconds: 3,
    rounds: 10,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '장기 순서 기억, 작업기억 심화, 고급 마무리 활동',
    isReady: true,
    settingSummary: '10색 기억 · 10라운드 · BGM 자동',
    settingChips: ['10색 기억', '10라운드', 'BGM 자동'],
    executionFacts: [
      { label: '기억 방식', value: '10색 순서' },
      { label: '라운드', value: '10라운드' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 54: Full Reveal (level 5)
  {
    id: 'sequential-memory-full-reveal-54',
    sortOrder: 41,
    title: '순차 기억 · Full Reveal',
    en: 'Sequential Memory',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'sequential-memory',
    programTitle: '순차 기억',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'spatial', level: 5 },
    description: '전체 순서를 한 번에 보여준 후 재현하는 고급 전체 공개 기억 수행 활동',
    cueSeconds: 3,
    rounds: 10,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전체 패턴 기억, 시각적 순서 인지, 극한 작업기억',
    isReady: true,
    settingSummary: '전체 공개 기억 · 10라운드 · BGM 자동',
    settingChips: ['전체 공개', '10라운드', 'BGM 자동'],
    executionFacts: [
      { label: '기억 방식', value: '전체 공개 후 재현' },
      { label: '라운드', value: '10라운드' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // ─── DIVE (3 presets) ───
  {
    id: 'dive-standard',
    sortOrder: 42,
    title: 'DIVE · 기본',
    en: 'Dive',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'dive',
    programTitle: 'DIVE',
    engine: {
      mode: 'flow',
      level: 1,
      flowFeatures: ['punch', 'kick', 'duck', 'reach'],
      flowDuration: 20,
      flowLayout: 'sequential',
      flowIncludeBonus: false,
    },
    description: '점프·펀치·킥·숙이기·벽 닿기를 순서대로 익히는 DIVE 기본 활동. 스테이지당 20초.',
    salesCopy: '모든 장애물을 순차적으로 배우는 DIVE 기본 코스',
    cueSeconds: 3,
    rounds: 1,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, DIVE 도입, 장애물 순차 학습',
    isReady: true,
    settingSummary: '순차 · 스테이지 20초 · BGM 자동',
    settingChips: ['순차', '20초/스테이지', 'BGM 자동'],
    executionFacts: [
      { label: '동작', value: '점프+펀치+킥+숙이기+벽' },
      { label: '진행 방식', value: '순차 스테이지' },
      { label: '스테이지당', value: '20초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  {
    id: 'dive-random',
    sortOrder: 43,
    title: 'DIVE · 랜덤',
    en: 'Dive Random',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'dive',
    programTitle: 'DIVE',
    engine: {
      mode: 'flow',
      level: 1,
      flowFeatures: ['punch', 'kick', 'duck', 'reach'],
      flowDuration: 60,
      flowLayout: 'random',
    },
    description: '모든 장애물이 무작위로 등장하는 1분 DIVE 챌린지 활동',
    salesCopy: '1분 동안 모든 장애물을 랜덤으로 처리하는 DIVE',
    cueSeconds: 3,
    rounds: 1,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '종합 전신 반응, 챌린지, 수업 클라이맥스',
    isReady: true,
    settingSummary: '랜덤 · 60초 · BGM 자동',
    settingChips: ['랜덤', '60초', 'BGM 자동'],
    executionFacts: [
      { label: '동작', value: '점프+펀치+킥+숙이기+벽' },
      { label: '진행 방식', value: '랜덤 혼합' },
      { label: '세션', value: '60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  {
    id: 'dive-color-gate-61',
    sortOrder: 44,
    title: 'DIVE · Color Gate',
    en: 'Dive Color Gate',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'dive',
    programTitle: 'DIVE',
    engine: {
      mode: 'flow',
      level: 2,
      flowFeatures: ['colorGate'],
      flowDuration: 60,
      flowLayout: 'sequential',
    },
    description: 'DIVE 2단계: 빨·노·초·파 색 관문과 5가지 포즈(jump·kick·side-squat·lunge-reach·star)를 수행하는 활동',
    salesCopy: '색상 판단과 전신 포즈 전환을 함께 훈련하는 DIVE 2단계',
    cueSeconds: 3,
    rounds: 1,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상 반응, 포즈 전환, DIVE 2단계',
    isReady: true,
    settingSummary: 'Color Gate · 60초 · BGM 자동',
    settingChips: ['2단계', 'Color Gate', '60초', 'BGM 자동'],
    executionFacts: [
      { label: '단계', value: 'DIVE 2단계' },
      { label: '관문 색', value: '빨·노·초·파' },
      { label: '포즈', value: 'jump·kick·side-squat·lunge-reach·star' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
];

function assignSequentialSortOrders(presets: OfficialSpomovePreset[]): OfficialSpomovePreset[] {
  return presets.map((preset, index) => ({ ...preset, sortOrder: index + 1 }));
}

const VARIANT_QUADRANT_LABELS: Record<string, string> = {
  'reaction-cognition-mq1-32': '변형 사분할 1단계',
  'reaction-cognition-mq2-33': '변형 사분할 2단계',
  'reaction-cognition-mq3-34': '변형 사분할 3단계',
  'reaction-cognition-mq4-35': '변형 사분할 4단계',
};

function isVariantQuadrantPreset(preset: OfficialSpomovePreset) {
  return Object.prototype.hasOwnProperty.call(VARIANT_QUADRANT_LABELS, preset.id);
}

function withVariantQuadrantDifficultyPresets(presets: OfficialSpomovePreset[]): OfficialSpomovePreset[] {
  return presets.flatMap((preset) => {
    if (!isVariantQuadrantPreset(preset)) return [preset];
    const label = VARIANT_QUADRANT_LABELS[preset.id]!;
    const baseEngine = {
      ...preset.engine,
      variantColorTheme: 'color' as SpomoveColorThemeId,
      hideBodyLabelModeControls: true,
    };
    const easy: OfficialSpomovePreset = {
      ...preset,
      title: `${label} easy`,
      cueSeconds: 5,
      engine: { ...baseEngine, bodyLabelMode: 'easy' },
      settingSummary: '5초 · 20회 · easy',
      settingChips: ['easy', '5초', '20회'],
    };
    const hard: OfficialSpomovePreset = {
      ...preset,
      id: `${preset.id}-hard`,
      title: `${label} hard`,
      cueSeconds: 6,
      engine: { ...baseEngine, bodyLabelMode: 'hard' },
      settingSummary: '6초 · 20회 · hard',
      settingChips: ['hard', '6초', '20회'],
    };
    return [easy, hard];
  });
}

const OFFICIAL_SPOMOVE_LIBRARY_RAW: OfficialSpomovePreset[] = assignSequentialSortOrders([
  ...withVariantQuadrantDifficultyPresets(OFFICIAL_SPOMOVE_CORE_LIBRARY),
  ...buildOfficialSpomoveExpansionPresets(OFFICIAL_SPOMOVE_CORE_COUNT + 1),
]);

/** family/profile enrichment 완료본 — Hub·세션·테스트 SSOT */
export const OFFICIAL_SPOMOVE_LIBRARY: readonly OfficialSpomovePreset[] =
  applyFullThemeSeedsToLibrary(enrichOfficialSpomoveLibrary(OFFICIAL_SPOMOVE_LIBRARY_RAW));

export const OFFICIAL_SPOMOVE_LIBRARY_SIZE = OFFICIAL_SPOMOVE_LIBRARY.length;

export function standardSpomoveDurationSec(cueSeconds: number, rounds: number): number {
  return Math.max(1, cueSeconds) * Math.max(1, rounds);
}

export function findOfficialSpomovePreset(id: string | null | undefined) {
  return OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === id) ?? null;
}

export function officialPresetSessionHref(
  preset: OfficialSpomovePreset,
  options?: {
    bgmPath?: string;
    /** Public UI는 생성 금지. Legacy URL·테스트용으로만 사용 */
    autostart?: boolean;
    mode?: 'projector' | 'mobile';
    /** start | settings. 미지정 시 Session은 start로 해석 */
    entry?: 'start' | 'settings';
    /** 명시 시에만 URL에 부착 */
    movement?: string;
    limb?: string;
    /** 미지정 시 프리셋 기본값. Session이 URL cue를 읽음 */
    cueSeconds?: number;
    /** 난이도 오버라이드 (numberCart/colorTracker/mole/camouflage 값) */
    difficulty?: string;
    /** O3 Operation Layer — ActivityOperationConfig 전체 또는 Patch */
    operation?: ActivityOperationConfig | ActivityOperationPatch | null;
  },
) {
  const params = new URLSearchParams({
    preset: preset.id,
    rounds: String(preset.rounds),
    sound: 'on',
    mode: options?.mode ?? 'projector',
  });
  if (options?.entry) params.set('entry', options.entry);
  if (options?.cueSeconds != null) params.set('cueSeconds', String(options.cueSeconds));
  if (options?.bgmPath) params.set('bgm', options.bgmPath);
  if (options?.autostart) params.set('autostart', '1');
  if (options?.movement) params.set('movement', options.movement);
  if (options?.limb) params.set('limb', options.limb);
  if (options?.difficulty) params.set('difficulty', options.difficulty);
  if (options?.operation) {
    const base: ActivityOperationConfig = {
      startZone: 'onMat',
      participantScale: 'individual',
      equipment: { mode: 'none' },
      timing: { pattern: 'continuous' },
      participationFormat: 'independent',
    };
    writeOperationQuery(mergeOperationConfig(base, options.operation), params);
  }
  return `/spokedu-master/spomove/session?${params.toString()}`;
}

/** Public 생성기 — autostart를 절대 붙이지 않음 */
export function publicOfficialPresetSessionHref(
  preset: OfficialSpomovePreset,
  options?: Omit<NonNullable<Parameters<typeof officialPresetSessionHref>[1]>, 'autostart'>,
) {
  return officialPresetSessionHref(preset, { ...options, autostart: false });
}

export function bgmDisplayName(path: string) {
  const fileName = path.split('/').pop() ?? path;
  return decodeURIComponent(fileName)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_+/g, ' ')
    .trim();
}
