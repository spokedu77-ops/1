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
import { withPublicCatalogOrder } from './spomovePublicCatalogOrder';

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
    handFootDifficulty?: 'easy' | 'normal' | 'hard';
    /** 골키퍼(10): 1=항상 1개 · 2=1~2개(더블) */
    goalkeeperTier?: 1 | 2;
    /** 사이먼 폴 도형(1)·폴 화살표(2): 1=기본 1개 · 2=응용 2개 */
    simonPoleCount?: 1 | 2;
    colorTrackerDualPanel?: boolean;
    flowFeatures?: OfficialFlowFeatureKey[];
    flowDuration?: number;
    flowLayout?: 'sequential' | 'random';
    flowIncludeBonus?: boolean;
    flankerStimulusType?: 'color' | 'number';
    flankerNestedCircleCount?: 3 | 5;
    flankerExtremeMode?: 'theme' | 'arrow';
    flankerArrowMode?: 'lr' | 'udlr';
    camouflagePlacement?: 'center' | 'variant';
    /** stroop 4단계: 단어+배경(기본) | 누락 색상 */
    stroopWordMode?: 'bg' | 'missing';
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
  /** 예외적으로 Family Operation Profile 교체. 전면단일 theme seed에서는 미사용. */
  operationProfileId?: import('./operations/operationTypes').ActivityOperationProfileId;
  /** active: SPOKEDU MASTER 노출, hold: Admin 보존·SPOKEDU MASTER 숨김 */
  catalogStatus?: 'active' | 'hold';
  holdReason?: string;
};

export const OFFICIAL_SPOMOVE_CORE_COUNT = 42;

export { OFFICIAL_SPOMOVE_EXPANSION_COUNT };

const OFFICIAL_SPOMOVE_CORE_LIBRARY: OfficialSpomovePreset[] = [
  // ─── OFFICIAL SPOMOVE CORE LIBRARY (MQ 1~3 · easy 고정) ───

  // sortOrder 1: 공간 방향 (level 1)
  {
    id: 'reaction-cognition-space-direction-01',
    sortOrder: 1,
    title: '화살표',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 1 },
    description: '전체형 화면 중앙에 표시되는 큰 화살표를 보고, 화살표가 가리키는 방향 색 패드로 즉시 점프하거나 이동하는 공간방향 자극 활동',
    salesCopy: '순발력 · 색·방향·수 지각 · 반응-실행 연결',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '수업 도입, 방향 인지, 순발력, 반응-실행 연결',
    isReady: true,
    settingSummary: '쉬움 · 화살표 · 3초 · 20회',
    settingChips: ['쉬움', '화살표', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '전체형 · 중앙 화살표' },
      { label: '신호 방식', value: '화살표' },
      { label: '난이도', value: '쉬움' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 1b: 공간 방향 · 색상 모드 (level 1, color fill)
  {
    id: 'reaction-cognition-space-direction-color-01b',
    sortOrder: 2,
    title: '색상 화살표',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 1, spatialArrowColorMode: 'color', spatialArrowColorMapping: 'compass' },
    description: '전체형 화면 중앙에 표시되는 큰 색상 화살표를 보고, 화살표가 가리키는 방향 색 패드로 즉시 점프하거나 이동하는 공간방향 자극 활동. 위 빨·좌 초·우 노·아래 파로 방향별 색이 고정됩니다.',
    salesCopy: '순발력 · 색·방향·수 지각 · 반응-실행 연결',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '수업 도입, 방향 인지, 색상 화살표, 반응-실행 연결',
    isReady: true,
    settingSummary: '보통 · 색상 화살표 · 3초 · 20회',
    settingChips: ['보통', '색상 화살표', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '전체형 · 중앙 화살표' },
      { label: '신호 방식', value: '색상 화살표' },
      { label: '난이도', value: '보통' },
      { label: '색 매핑', value: '위·좌·우·아래 고정' },
      { label: '반복', value: '20회' },
    ],
  },
  // sortOrder 3: 4분할 자극 · 색상 (level 2, color)
  {
    id: 'reaction-cognition-quad-color-02',
    sortOrder: 3,
    title: '색상',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 2, variantColorTheme: 'color' },
    description: '2×2 그리드형 화면에서 한 칸에 표시되는 색상 신호를 보고 해당 색 패드 위치로 즉시 이동하는 4분할 자극 활동',
    salesCopy: '색·위치 지각을 연결하는 4분할 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상 지각, 위치 선택, 반응-실행 연결',
    isReady: true,
    settingSummary: '4분할 그리드형 · 색상 · 3초 · 20회',
    settingChips: ['4분할', '그리드형', '색상', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '4분할 그리드형' },
      { label: '신호 방식', value: '색상 신호' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 4: 4분할 자극 · 과일 (level 2, fruit)
  {
    id: 'reaction-cognition-quad-fruit-10',
    sortOrder: 4,
    title: '과일',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 2, variantColorTheme: 'fruit' },
    description: '2×2 그리드형 화면에서 한 칸에 표시되는 과일 이미지 신호를 보고 해당 색 패드 위치로 즉시 이동하는 4분할 자극 활동',
    salesCopy: '과일 테마로 색·위치 지각을 연결하는 4분할 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상 지각, 위치 선택, 어린 학습자',
    isReady: true,
    settingSummary: '4분할 그리드형 · 과일 · 3초 · 20회',
    settingChips: ['4분할', '그리드형', '과일', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '4분할 그리드형' },
      { label: '신호 방식', value: '테마 이미지' },
      { label: '테마', value: '과일' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 10: 전면단일 자극 · 색상 (level 3, color)
  {
    id: 'reaction-cognition-full-color-03',
    sortOrder: 4,
    title: '전면단일 · 색상',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 3, variantColorTheme: 'color' },
    description: '전체형 화면 하나를 채우는 색상 신호를 보고 해당 색 패드 위치로 즉시 이동하는 전면단일 자극 활동',
    salesCopy: '색상 테마로 전신 반응을 끌어내는 전면단일 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 색상 판단, 집중 전환',
    isReady: true,
    settingSummary: '전면단일 전체형 · 색상 · 3초 · 20회',
    settingChips: ['전면단일', '전체형', '색상', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '전면단일 전체형' },
      { label: '신호 방식', value: '색상 신호' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 11: 전면단일 자극 · 동물 (level 3, animal)
  {
    id: 'reaction-cognition-full-animal-18',
    sortOrder: 6,
    title: '전면단일 · 동물',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 3, variantColorTheme: 'animal' },
    description: '전체형 화면 하나에 크게 표시되는 동물 이미지 신호를 보고 해당 색 패드 위치로 즉시 이동하는 전면단일 자극 활동',
    salesCopy: '동물 테마로 색·이미지 지각을 연결하는 전면단일 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 이미지 판단, 어린 학습자 친화',
    isReady: true,
    settingSummary: '전면단일 전체형 · 동물 · 3초 · 20회',
    settingChips: ['전면단일', '전체형', '동물', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '전면단일 전체형' },
      { label: '신호 방식', value: '테마 이미지' },
      { label: '테마', value: '동물' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 14: 전면단일 자극 · 자연 (level 3, nature)
  {
    id: 'reaction-cognition-full-nature-19',
    sortOrder: 7,
    title: '전면단일 · 자연',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 3, variantColorTheme: 'nature' },
    description: '전체형 화면 하나에 크게 표시되는 자연 이미지 신호를 보고 해당 색 패드 위치로 즉시 이동하는 전면단일 자극 활동',
    salesCopy: '자연 테마로 색·이미지 지각을 연결하는 전면단일 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 이미지 판단, 자연 친화 수업',
    isReady: true,
    settingSummary: '전면단일 전체형 · 자연 · 3초 · 20회',
    settingChips: ['전면단일', '전체형', '자연', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '전면단일 전체형' },
      { label: '신호 방식', value: '테마 이미지' },
      { label: '테마', value: '자연' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 14: 2분할 자극 · 색상 (level 4, color)
  {
    id: 'reaction-cognition-split-color-04',
    sortOrder: 8,
    title: '2분할 · 색상',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 4, variantColorTheme: 'color' },
    description: '2분할 패널형 화면의 좌우 두 패널에 표시되는 색상 신호를 보고 해당 색 패드 위치로 즉시 이동하는 활동',
    salesCopy: '색상 테마로 두 패널의 색 지각을 연결하는 2분할 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '선택 반응, 양측 이동, 색상 판단, 반응-실행 연결',
    isReady: true,
    settingSummary: '2분할 패널형 · 색상 · 3초 · 20회',
    settingChips: ['2분할', '패널형', '색상', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '2분할 패널형' },
      { label: '신호 방식', value: '색상 신호' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 20: 3분할 자극 · 색상 (level 5, color)
  {
    id: 'reaction-cognition-triple-color-25',
    sortOrder: 9,
    title: '3분할 · 색상',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 5, variantColorTheme: 'color' },
    description: '3분할 패널형 화면의 세 패널에 표시되는 서로 다른 색상 신호 중 목표 색을 골라 해당 색 패드 위치로 즉시 이동하는 활동',
    salesCopy: '색상 테마로 서로 다른 세 신호를 빠르게 고르는 3분할 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '선택 반응, 시선 분산, 색상 판단, 반응-실행 연결',
    isReady: true,
    settingSummary: '3분할 패널형 · 색상 · 3초 · 20회',
    settingChips: ['3분할', '패널형', '색상', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '3분할 패널형' },
      { label: '신호 방식', value: '색상 신호' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // 반응인지 6번 · 랜덤분할 자극 · 색상
  {
    id: 'reaction-cognition-triple-diff-color-31',
    sortOrder: 10,
    title: '랜덤분할 · 색상',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 6, variantColorTheme: 'color' },
    description: '전면 1개·2분할·3분할이 20%·30%·50% 확률로 바뀌며 제시되는 색상 신호를 보고 해당 색 패드 위치로 즉시 이동하는 활동',
    salesCopy: '색상 테마로 전체형과 패널형 전환에 반응하는 랜덤분할 반응',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '심화 선택 반응, 시선 분산, 색상 판단, 반응-실행 연결',
    isReady: true,
    settingSummary: '랜덤분할 전체/패널형 · 색상 · 3초 · 20회',
    settingChips: ['랜덤분할', '패널형', '색상', '3초', '20회'],
    executionFacts: [
      { label: '화면 형태', value: '랜덤분할 전체/패널형' },
      { label: '신호 방식', value: '색상 신호' },
      { label: '테마', value: '색상' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // 반응인지 7번 · 변형 사분할 1단계
  {
    id: 'reaction-cognition-mq1-32',
    sortOrder: 11,
    title: '(보류) 손 따로, 발 따로 · 쉬움',
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
    catalogStatus: 'hold',
    holdReason: '시지각 반응 · 손 따로, 발 따로 쉬움으로 이관 예정',
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
    title: '(보류) 손 따로, 발 따로 · 보통',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 8 },
    description: '색상 1~3개와 신체 부위(발·손)가 함께 제시될 때 해당 패드로 이동하는 활동',
    salesCopy: '1~3색 손·발 혼합 변형 사분할',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '심화 반응, 집중력, 변형 사분할',
    isReady: true,
    catalogStatus: 'hold',
    holdReason: '시지각 반응 · 손 따로, 발 따로 보통으로 이관 예정',
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '변형 사분할 · 1~3색' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // 반응인지 9번 · 변형 사분할 3단계
  {
    id: 'reaction-cognition-mq3-34',
    sortOrder: 13,
    title: '(보류) 손 따로, 발 따로 · 어려움',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 9 },
    description: '3색에 손·발이 혼합 배정될 때 규칙에 맞게 패드로 이동하는 활동',
    salesCopy: '3색 손·발 혼합 변형 사분할',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '심화 반응, 집중력, 변형 사분할',
    isReady: true,
    catalogStatus: 'hold',
    holdReason: '시지각 반응 · 손 따로, 발 따로 어려움으로 이관 예정',
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '신호 방식', value: '변형 사분할 · 3색 혼합' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // FLASH (level 3)
  {
    id: 'visual-reaction-flash-33',
    sortOrder: 15,
    title: '시지각 반응 · 풍선 터뜨리기',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 3 },
    description: '화면 어디서든 떨어지는 색 풍선이 하단 가시에 닿을 때 해당 색으로 반응하는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '낙하 추적, 가시 접촉 타이밍, 시각 각성',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['풍선 터뜨리기', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '풍선 터뜨리기' },
      { label: '진행 방식', value: '낙하 · 가시 접촉' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // 시지각 반응 — 파도 피하기 (engine level 1)
  {
    id: 'visual-reaction-rush-39',
    sortOrder: 16,
    title: '시지각 반응 · 파도 피하기',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 1 },
    description: '파도처럼 빠르게 쏟아지는 자극에 연속으로 반응하는 초고속 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '초고속 반응, 연속 자극 처리, 극한 집중',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['파도 피하기', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '파도 피하기' },
      { label: '진행 방식', value: '연속 반응' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // FLOW ×2 only (engine level 2, concurrent 2)
  {
    id: 'visual-reaction-flow-2x-31',
    sortOrder: 17,
    title: '시지각 반응 · 떨어지는 벽돌',
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
    settingChips: ['떨어지는 벽돌', '동시 2개', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '동시 자극', value: '2개' },
      { label: '진행 방식', value: '떨어지는 벽돌' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // MOLE (level 6)
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
    description: '화면 곳곳 구멍에서 색 두더지가 튀어나오면 같은 색 패드로 빠르게 반응하는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '순발력, 팝업 반응, 게임형 활동',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['두더지 잡기', '쉬움/보통', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '두더지 잡기' },
      { label: '난이도', value: '쉬움 1마리 · 보통 1~2마리' },
      { label: '진행 방식', value: '팝업 반응' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // NUMBER CART (level 8)
  {
    id: 'visual-reaction-number-cart-l2',
    catalogStatus: 'hold',
    holdReason: '보류: 숫자 연산 기차는 스포키듀 마스터 공개 목록에서 숨김',
    sortOrder: 25,
    title: '시지각 반응 · 숫자 연산 기차',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 8, numberCartTier: 1 },
    description: '숫자 연산 기차의 목표 숫자(또는 +-×÷ 식)를 보고 같은 답이 붙은 색 문으로 기차가 들어가는 시지각 반응 활동. 난이도 1/2/3은 세션에서 고릅니다.',
    cueSeconds: 3,
    rounds: 5,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '숫자·색 매칭, 사전 판단, 선택 반응',
    isReady: true,
    settingSummary: '3초 · 5라운드 · BGM 자동',
    settingChips: ['숫자 연산 기차', '5라운드', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '숫자 연산 기차' },
      { label: '진행 방식', value: '라운드 · 숫자·색 매칭' },
      { label: '라운드', value: '5라운드' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // COLOR TRACKER (level 9)
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
    engine: { mode: 'reactTrain', level: 9, colorTrackerTier: 1, colorTrackerDualPanel: false },
    description: '흰 공을 끝까지 추적한 뒤 빨·노·초·파 구역 중 어디에 멈췄는지 맞추는 시지각 반응 활동. 난이도 보통/어려움과 속도 느림/빠름은 세션에서 고릅니다.',
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
  // 골키퍼 모드 (engine level 10)
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
    description: '4코너로 날아오는 슛·커브볼을 끝까지 추적해 도착 코너 색 패드로 반응하는 시지각 반응 활동. 보통 난이도는 공 1~2개가 동시에 올 수 있습니다.',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '궤적 추적, 도착 코너 색 반응, 동시 자극 처리',
    isReady: true,
    settingSummary: '골키퍼 방어 · 비행 3초 · 1~2개 · 약 120초 · BGM 자동',
    settingChips: ['골키퍼 모드', '비행 3초', '1~2개', '120초', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '골키퍼 모드' },
      { label: '진행 방식', value: '궤적 추적 · 도착 코너 색 반응' },
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
    title: '사이먼 이펙트 1번 · Pole Shape',
    en: 'Simon Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'simon',
    programTitle: '사이먼 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'simon', level: 1, simonPoleCount: 1 },
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
    title: '사이먼 이펙트 · Pole Arrows',
    en: 'Simon Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'simon',
    programTitle: '사이먼 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'simon', level: 2, simonPoleCount: 1 },
    description: '화살표가 극단에 나타나 위치와 충돌할 때, 위치가 아니라 화살표가 가리키는 방향으로 반응하는 선택 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '위치-방향 간섭, 선택주의 심화, 집중 반응',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '화살표 방향', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Pole Arrows · 방향' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // 사이먼 4번: 매직 아이 (극단 고정) — preset id 유지
  {
    id: 'visual-reaction-blackout-37',
    sortOrder: 28,
    title: '사이먼 이펙트 4번 · 매직 아이',
    en: 'Simon Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'simon',
    programTitle: '사이먼 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'simon', level: 4, camouflagePlacement: 'variant' },
    description: '노이즈 속에 위장된 색 사물이 화면 극단에 드러날 때 해당 색을 찾는 선택 반응 활동',
    cueSeconds: 5,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '고난도 집중, 색 변별, 극단 위치 탐지',
    isReady: true,
    settingSummary: '5초 · 20회 · 극단 · BGM 자동',
    settingChips: ['매직 아이', '극단', '5초 고정', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '매직 아이' },
      { label: '배치', value: '극단' },
      { label: '진행 방식', value: '위장 탐지' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // 사이먼 5번: 풍선 사이먼 (순간 등장 · 바늘 없음)
  {
    id: 'simon-balloon-flash-05',
    sortOrder: 28,
    title: '사이먼 이펙트 5번 · 풍선 사이먼',
    en: 'Simon Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'simon',
    programTitle: '사이먼 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'simon', level: 5 },
    description: '화면 어디에나 나타나는 색 풍선이 터질 때 해당 색 위치로 이동하는 선택 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '위치 간섭 조절, 순간 색 변별, 선택주의',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['풍선 사이먼', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '풍선 사이먼' },
      { label: '진행 방식', value: '순간 등장 · 터짐' },
      { label: '실행 시간', value: '약 60초' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 39: Uniform (level 1)
  {
    id: 'flanker-uniform-07',
    sortOrder: 29,
    title: '플랭커 이펙트 1번 · Uniform Flankers',
    en: 'Flanker Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커 이펙트',
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
  // sortOrder 41: Random (level 2)
  {
    id: 'flanker-random-43',
    sortOrder: 31,
    title: '플랭커 이펙트 2번 · Random Flankers',
    en: 'Flanker Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 2 },
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
  // sortOrder 42: 5 Circle Extreme (level 3)
  {
    id: 'flanker-5circle-46',
    sortOrder: 31.25,
    title: '플랭커 이펙트 3번 · 5원 극단 크기',
    en: 'Flanker Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 3 },
    description: '매우 큰 원과 매우 작은 원이 섞인 다섯 원에서 가운데 목표 색에 반응하는 플랭커 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '크기 극단 비교, 방해 자극 억제, 선택주의 훈련',
    isReady: true,
    settingSummary: '3초 · 20회 · 극단 크기 · BGM 자동',
    settingChips: ['3초', '20회', '극단 크기', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '5 Circle Extreme' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 43.5: Nested Circles (level 4)
  {
    id: 'flanker-nested-circles-04',
    sortOrder: 31.5,
    title: '플랭커 이펙트 4번 · 원 속의 원',
    en: 'Flanker Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 4, flankerNestedCircleCount: 5 },
    description: '동심으로 겹친 원들 중 가장 안쪽 목표 원을 보고 해당 색 위치로 반응하는 선택주의 플랭커 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '중첩 자극 처리, 목표 원 집중, 방해 정보 억제',
    isReady: true,
    settingSummary: '3초 · 20회 · 원 속의 원 5개 · BGM 자동',
    settingChips: ['원 속의 원', '5개 기본', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Nested Circles' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 44: Arrow Flanker (level 5)
  {
    id: 'flanker-arrow-05',
    sortOrder: 32,
    title: '플랭커 이펙트 5번 · 화살표 플랭커',
    en: 'Flanker Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 5, flankerArrowMode: 'udlr' },
    description: '다섯 화살표 중 가운데 방향만 보고 해당 방향으로 이동하는 화살표 플랭커 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '방향 방해 억제, 선택주의, 좌우 반응',
    isReady: true,
    settingSummary: '3초 · 20회 · 좌우 · BGM 자동',
    settingChips: ['화살표', '좌우 기본', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Arrow Flanker · UDLR' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 44.5: Theme Flanker (level 6)
  {
    id: 'flanker-theme-06',
    sortOrder: 32.5,
    title: '플랭커 이펙트 6번 · 테마 플랭커',
    en: 'Flanker Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커 이펙트',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 6, variantColorTheme: 'fruit' },
    description: '선택한 이미지 테마(색상·과일 등 7종)가 다섯 원 안에 나타날 때 가운데 원 색 위치로 반응하는 테마 플랭커 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '이미지 색 반응, 방해 억제, 선택주의',
    isReady: true,
    settingSummary: '3초 · 20회 · 과일 테마 · BGM 자동',
    settingChips: ['테마 플랭커', '이미지 테마', '20회', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: 'Theme Flanker' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 45: 공간 방향 · 색상 (구 화살표 스트룹/역스트룹 1번 대체)
  {
    id: 'stroop-arrow-reverse-08',
    sortOrder: 33,
    title: '스트룹 이펙트 1번 · 공간 방향 · 색상',
    en: 'Stroop Effect',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 이펙트',
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
    title: '스트룹 이펙트 · Word Switch',
    en: 'Stroop Effect',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 이펙트',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'stroop', level: 2 },
    description:
      '검정 배경의 색 단어에서 의미 또는 글자 색(잉크) 규칙을 따라 말로 답하고, 규칙이 뒤집히면 반대로 말하는 음성 스트룹 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '의미-잉크 전환, 규칙 역전, 음성 반응',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '단어 전환', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '단어 의미/잉크 전환' },
      { label: '응답', value: '음성 · 교사 확인' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
    ],
  },
  // sortOrder 47: Word Reverse (level 3)
  {
    id: 'stroop-word-reverse-48',
    sortOrder: 35,
    title: '스트룹 이펙트 · Word Reverse',
    en: 'Stroop Effect',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 이펙트',
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
    title: '스트룹 이펙트 · 단어+배경',
    en: 'Stroop Effect',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 이펙트',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'stroop', level: 4, stroopWordMode: 'bg' },
    description: '배경 색상과 단어 의미가 충돌할 때 단어 규칙을 따라 반응하는 복합 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '언어-색상 충돌 처리, 실행 제어, 심화 훈련',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '단어+배경', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '단어+배경' },
      { label: '반복', value: '20회' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ],
  },
  // sortOrder 49: Missing Color (level 4 · 누락 옵션)
  {
    id: 'stroop-missing-color-50',
    catalogStatus: 'hold',
    holdReason: '보류: 스트룹 3/4번 정리로 마스터 공개 목록에서 숨김',
    sortOrder: 37,
    title: '스트룹 이펙트 · 누락 색상 찾기',
    en: 'Stroop Effect',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 이펙트',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'stroop', level: 4, stroopWordMode: 'missing' },
    description: '글자·잉크·배경에 쓰인 세 색을 제외한 남은 색을 찾아 말하는 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '탐색적 실행 제어, 빠진 정보 탐지, 고급 집중력',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', '누락 색상', 'BGM 자동'],
    executionFacts: [
      { label: '자극 방식', value: '누락 색상 찾기' },
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
  // sortOrder 52: Color Sequence Ramp / 추가 (level 3)
  {
    id: 'sequential-memory-10color-52',
    sortOrder: 40,
    title: '순차 기억 · 추가(3→7)',
    en: 'Sequential Memory',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'sequential-memory',
    programTitle: '순차 기억',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'spatial', level: 3 },
    description: '5라운드 동안 색 항 수가 3→7개로 늘어나는 색 순서 기억 활동',
    cueSeconds: 3,
    rounds: 5,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '점증 순서 기억, 작업기억 심화, 고급 마무리 활동',
    isReady: true,
    settingSummary: '추가 · 5라운드 · 3→7색 · BGM 자동',
    settingChips: ['추가', '5라운드', '3→7색', 'BGM 자동'],
    executionFacts: [
      { label: '기억 방식', value: '추가(3→7)' },
      { label: '라운드', value: '5라운드' },
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
    catalogStatus: 'hold',
    holdReason: '보류: 다이브는 액션 무브/모션 게이트 2개만 공개',
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
    title: 'DIVE · 모션 게이트',
    en: 'Dive Motion Gate',
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
    description: '모션 게이트: 빨·노·초·파 색 관문과 5가지 포즈(jump·kick·side-squat·lunge-reach·star)를 수행하는 활동',
    salesCopy: '색상 판단과 전신 포즈 전환을 함께 훈련하는 모션 게이트',
    cueSeconds: 3,
    rounds: 1,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상 반응, 포즈 전환, 모션 게이트',
    isReady: true,
    settingSummary: '모션 게이트 · 60초 · BGM 자동',
    settingChips: ['모션 게이트', '60초', 'BGM 자동'],
    executionFacts: [
      { label: '항목', value: '모션 게이트' },
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
  'reaction-cognition-mq1-32': '(보류) 손 따로, 발 따로 · 쉬움',
  'reaction-cognition-mq2-33': '(보류) 손 따로, 발 따로 · 보통',
  'reaction-cognition-mq3-34': '(보류) 손 따로, 발 따로 · 어려움',
};

const SIMON_CATALOG_TITLE_BY_ID: Record<string, string> = {
  'simon-pole-arrows-41': '사이먼 이펙트 · 화살표 · 보통',
  'simon-arrow-hard-skeleton': '사이먼 이펙트 · 화살표 · 어려움',
  'simon-pole-shape-06': '사이먼 이펙트 · 도형 · 보통',
  'simon-shape-hard-skeleton': '사이먼 이펙트 · 도형 · 어려움',
  'simon-balloon-flash-05': '사이먼 이펙트 · 풍선 · 보통',
  'simon-balloon-hard-skeleton': '사이먼 이펙트 · 풍선 · 어려움',
  'simon-mixed-gallery-exp': '사이먼 이펙트 · 랜덤 테마 · 보통',
  'simon-random-hard-skeleton': '사이먼 이펙트 · 랜덤 테마 · 어려움',
  'simon-camouflage-center-skeleton': '사이먼 이펙트 · 카모플라쥬 · 보통',
  'visual-reaction-blackout-37': '사이먼 이펙트 · 카모플라쥬 · 어려움',
};

const SIMON_CATALOG_ORDER = Object.keys(SIMON_CATALOG_TITLE_BY_ID);

const STROOP_CATALOG_TITLE_BY_ID: Record<string, string> = {
  'stroop-arrow-reverse-08': '색상화살표 · 보통 (기본)',
  /** Runtime: stroop L2 word meaning/ink ± reverse (not arrow+BG). ID kept for compat. */
  'stroop-arrow-bg-47': '단어 · 보통 (의미/잉크 전환)',
  'stroop-word-reverse-48': '단어 · 보통+ (의미/잉크·역전)',
  'stroop-word-bg-49': '단어 · 어려움 (배경간섭 추가)',
};

const SEQUENTIAL_MEMORY_CATALOG_TITLE_BY_ID: Record<string, string> = {
  'sequential-memory-3color-09': '순서 기억 · 쉬움 (3개)',
  'sequential-memory-5color-51': '순서 기억 · 보통 (5개)',
  'sequential-memory-10color-52': '순서 기억 · 쉬움 → 보통 → 어려움 (3~7개)',
  'sequential-memory-custom-10color-exp': '순서 기억 · 어려움 (커스텀)',
  'sequential-memory-color-number-exp': '랜덤 기억 · 어려움 (퀴즈)',
  'sequential-memory-full-reveal-54': '전체 공개 · 어려움',
};

function isSpokeduMasterCatalogHoldout(preset: OfficialSpomovePreset) {
  return (
    (preset.engine.mode === 'basic' && (preset.engine.level === 5 || preset.engine.level === 6)) ||
    (preset.engine.mode === 'reactTrain' && preset.engine.level === 9)
  );
}

function isVariantQuadrantPreset(preset: OfficialSpomovePreset) {
  return Object.prototype.hasOwnProperty.call(VARIANT_QUADRANT_LABELS, preset.id);
}

/** 변형 사분할: easy 고정(부위 아이콘), hard 분기 없음 */
function withVariantQuadrantEasyPresets(presets: OfficialSpomovePreset[]): OfficialSpomovePreset[] {
  return presets.map((preset) => {
    if (!isVariantQuadrantPreset(preset)) return preset;
    const label = VARIANT_QUADRANT_LABELS[preset.id]!;
    return {
      ...preset,
      title: label,
      cueSeconds: 5,
      engine: {
        ...preset.engine,
        variantColorTheme: 'color' as SpomoveColorThemeId,
        hideBodyLabelModeControls: true,
        bodyLabelMode: 'easy' as const,
      },
      settingSummary: '5초 · 20회',
      settingChips: ['5초', '20회'],
    };
  });
}

function withSimonCatalogOrderAndTitles(presets: OfficialSpomovePreset[]): OfficialSpomovePreset[] {
  const simonPresets = presets
    .filter((preset) => preset.programGroup === 'simon')
    .map((preset) => ({
      ...preset,
      title: SIMON_CATALOG_TITLE_BY_ID[preset.id] ?? preset.title,
    }));
  const simonById = new Map(simonPresets.map((preset) => [preset.id, preset]));
  const orderedSimonPresets = [
    ...SIMON_CATALOG_ORDER.map((id) => simonById.get(id)).filter((preset): preset is OfficialSpomovePreset => Boolean(preset)),
    ...simonPresets.filter((preset) => !SIMON_CATALOG_TITLE_BY_ID[preset.id]),
  ];

  let simonIndex = 0;
  return presets.map((preset) => {
    if (preset.programGroup !== 'simon') return preset;
    return orderedSimonPresets[simonIndex++] ?? preset;
  });
}

function withSpokeduMasterCatalogHoldouts(presets: OfficialSpomovePreset[]): OfficialSpomovePreset[] {
  return presets.map((preset) => {
    if (!isSpokeduMasterCatalogHoldout(preset)) return preset;
    return {
      ...preset,
      catalogStatus: 'hold' as const,
      holdReason: 'SPOKEDU MASTER 카탈로그 제외: 3분할/랜덤분할/흰 공 찾기',
    };
  });
}

const OFFICIAL_SPOMOVE_LIBRARY_RAW: OfficialSpomovePreset[] = assignSequentialSortOrders([
  ...withSpokeduMasterCatalogHoldouts(
    withSimonCatalogOrderAndTitles([
      ...withVariantQuadrantEasyPresets(OFFICIAL_SPOMOVE_CORE_LIBRARY),
      ...buildOfficialSpomoveExpansionPresets(OFFICIAL_SPOMOVE_CORE_COUNT + 1),
    ]),
  ),
]);

const FLANKER_PUBLIC_CATALOG: Record<string, {
  order: number;
  title: string;
  level: number;
  theme?: SpomoveColorThemeId;
  extremeMode?: 'theme' | 'arrow';
  arrowMode?: 'lr' | 'udlr';
}> = {
  'flanker-uniform-07': { order: 1, title: '화살표 · 보통 (좌우)', level: 5, arrowMode: 'lr' },
  'flanker-arrow-udlr-exp': { order: 2, title: '화살표 · 어려움 (상하좌우)', level: 5, arrowMode: 'udlr' },
  'flanker-theme-color-skeleton': { order: 3, title: '랜덤 자극 · 색상', level: 2, theme: 'color' },
  'flanker-theme-06': { order: 4, title: '랜덤 자극 · 과일', level: 2, theme: 'fruit' },
  'flanker-theme-animal-skeleton': { order: 5, title: '랜덤 자극 · 동물', level: 2, theme: 'animal' },
  'flanker-theme-food-skeleton': { order: 6, title: '랜덤 자극 · 음식', level: 2, theme: 'food' },
  'flanker-theme-nature-skeleton': { order: 7, title: '랜덤 자극 · 자연', level: 2, theme: 'nature' },
  'flanker-theme-vehicle-skeleton': { order: 8, title: '랜덤 자극 · 탈 것', level: 2, theme: 'vehicle' },
  'flanker-theme-mix-skeleton': { order: 9, title: '랜덤 자극 · 믹스', level: 2, theme: 'mix' },
  'flanker-nested-circles-04': { order: 10, title: '극단 · 색상', level: 3, theme: 'color', extremeMode: 'theme' },
  'flanker-random-43': { order: 11, title: '극단 · 과일', level: 3, theme: 'fruit', extremeMode: 'theme' },
  'flanker-5circle-46': { order: 12, title: '극단 · 동물', level: 3, theme: 'animal', extremeMode: 'theme' },
  'flanker-arrow-05': { order: 13, title: '극단 · 음식', level: 3, theme: 'food', extremeMode: 'theme' },
  'flanker-uniform-number-exp': { order: 14, title: '극단 · 자연', level: 3, theme: 'nature', extremeMode: 'theme' },
  'flanker-random-number-exp': { order: 15, title: '극단 · 탈 것', level: 3, theme: 'vehicle', extremeMode: 'theme' },
  'flanker-5circle-number-exp': { order: 16, title: '극단 · 믹스', level: 3, theme: 'mix', extremeMode: 'theme' },
  'flanker-extreme-arrow-hard-skeleton': { order: 17, title: '극단 · 화살표 · 어려움', level: 3, extremeMode: 'arrow', arrowMode: 'udlr' },
};

function withCanonicalFlankerCatalog(presets: OfficialSpomovePreset[]): OfficialSpomovePreset[] {
  const normalized: OfficialSpomovePreset[] = presets.map((preset): OfficialSpomovePreset => {
    const mapping = FLANKER_PUBLIC_CATALOG[preset.id];
    if (!mapping) return preset;
    return {
      ...preset,
      title: mapping.title,
      engine: {
        ...preset.engine,
        level: mapping.level,
        variantColorTheme: mapping.theme,
        flankerStimulusType: 'color' as const,
        flankerNestedCircleCount: undefined,
        flankerExtremeMode: mapping.extremeMode,
        flankerArrowMode: mapping.arrowMode,
      },
    };
  });
  const firstFlankerIndex = normalized.findIndex((preset) => preset.programGroup === 'flanker');
  if (firstFlankerIndex < 0) return normalized;
  const orderedFlanker = normalized
    .filter((preset) => preset.programGroup === 'flanker')
    .sort((a, b) => (FLANKER_PUBLIC_CATALOG[a.id]?.order ?? 999) - (FLANKER_PUBLIC_CATALOG[b.id]?.order ?? 999));
  const withoutFlanker = normalized.filter((preset) => preset.programGroup !== 'flanker');
  withoutFlanker.splice(firstFlankerIndex, 0, ...orderedFlanker);
  return withoutFlanker;
}

function withCanonicalNamedCatalogs(presets: OfficialSpomovePreset[]): OfficialSpomovePreset[] {
  const titleById = { ...STROOP_CATALOG_TITLE_BY_ID, ...SEQUENTIAL_MEMORY_CATALOG_TITLE_BY_ID };
  const normalized = presets.map((preset) => titleById[preset.id] ? { ...preset, title: titleById[preset.id]! } : preset);
  const reorderGroup = (
    source: OfficialSpomovePreset[],
    group: OfficialSpomoveProgramGroup,
    orderedIds: string[],
  ) => {
    const firstIndex = source.findIndex((preset) => preset.programGroup === group);
    if (firstIndex < 0) return source;
    const groupPresets = source.filter((preset) => preset.programGroup === group);
    const byId = new Map(groupPresets.map((preset) => [preset.id, preset]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter((preset): preset is OfficialSpomovePreset => Boolean(preset));
    const unmatched = groupPresets.filter((preset) => !orderedIds.includes(preset.id));
    const rest = source.filter((preset) => preset.programGroup !== group);
    rest.splice(firstIndex, 0, ...ordered, ...unmatched);
    return rest;
  };
  return reorderGroup(
    reorderGroup(normalized, 'stroop', Object.keys(STROOP_CATALOG_TITLE_BY_ID)),
    'sequential-memory',
    Object.keys(SEQUENTIAL_MEMORY_CATALOG_TITLE_BY_ID),
  );
}

/** family/profile enrichment 완료본 — Hub·세션·테스트 SSOT */
export const OFFICIAL_SPOMOVE_LIBRARY: readonly OfficialSpomovePreset[] =
  applyFullThemeSeedsToLibrary(enrichOfficialSpomoveLibrary(assignSequentialSortOrders(
    withPublicCatalogOrder(
      withCanonicalNamedCatalogs(withCanonicalFlankerCatalog(OFFICIAL_SPOMOVE_LIBRARY_RAW)),
    ),
  )));

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
    autostart?: boolean;
    mode?: 'projector' | 'mobile';
    /** start | settings. 미지정 시 Session은 start로 해석 */
    entry?: 'start' | 'settings';
    /** 미지정 시 프리셋 기본값. Session이 URL cue를 읽음 */
    cueSeconds?: number;
    /** 난이도 오버라이드 (numberCart/colorTracker/mole/goalkeeper 값) */
    difficulty?: string;
    /** O3 Operation Layer — ActivityOperationConfig 전체 또는 Patch */
    operation?: ActivityOperationConfig | ActivityOperationPatch | null;
    /** 세션 종료 시 SPOMOVE 허브 복귀 맥락 */
    hubView?: 'favorites';
    hubReturn?: string;
  },
) {
  const params = new URLSearchParams({
    preset: preset.id,
    rounds: String(preset.rounds),
    sound: 'on',
    mode: options?.mode ?? 'projector',
  });
  if (options?.entry) params.set('entry', options.entry);
  if (options?.hubView === 'favorites') params.set('hubView', 'favorites');
  if (options?.hubReturn?.startsWith('/spokedu-master/spomove')) params.set('hubReturn', options.hubReturn);
  if (options?.cueSeconds != null) params.set('cueSeconds', String(options.cueSeconds));
  if (options?.bgmPath) params.set('bgm', options.bgmPath);
  if (options?.autostart) params.set('autostart', '1');
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

/** Public 생성기 — autostart·runtime movement를 절대 붙이지 않음 */
export function publicOfficialPresetSessionHref(
  preset: OfficialSpomovePreset,
  options?: Omit<NonNullable<Parameters<typeof officialPresetSessionHref>[1]>, 'autostart'>,
) {
  return officialPresetSessionHref(preset, {
    entry: options?.entry,
    mode: options?.mode,
    cueSeconds: options?.cueSeconds,
    difficulty: options?.difficulty,
    operation: options?.operation,
    hubView: options?.hubView,
    hubReturn: options?.hubReturn,
    bgmPath: options?.bgmPath,
    autostart: false,
  });
}

export function bgmDisplayName(path: string) {
  const fileName = path.split('/').pop() ?? path;
  return decodeURIComponent(fileName)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_+/g, ' ')
    .trim();
}
