import { SPOMOVE_AXIS_META } from '@/app/lib/spomove/spomoveAxisMeta';
import {
  SPOMOVE_COLOR_THEME_LABELS,
  type SpomoveColorThemeId,
} from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';

import type { OfficialSpomovePreset } from './officialSpomovePresets';

const THEMED_BASIC_LEVELS = [2, 3, 4, 5, 6] as const;
const ALL_THEMES: SpomoveColorThemeId[] = ['color', 'fruit', 'vehicle', 'emotion', 'animal', 'nature', 'food'];

const EXISTING_BASIC_THEME_KEYS = new Set([
  '2:color',
  '2:fruit',
  '3:color',
  '3:emotion',
  '3:animal',
  '3:nature',
  '4:color',
  '5:color',
  '6:color',
]);

type BasicLevelMeta = {
  signalLabel: string;
  titleStem: string;
  description: string;
  salesCopy: string;
  recommendedUse: string;
};

const BASIC_LEVEL_META: Record<(typeof THEMED_BASIC_LEVELS)[number], BasicLevelMeta> = {
  2: {
    signalLabel: '사분할 이미지',
    titleStem: '사분할',
    description: '네 영역에 제시되는 {theme} 이미지 신호를 보고 정해진 위치에 맞춰 반응하는 활동',
    salesCopy: '{theme} 이미지로 즐기는 사분할 반응',
    recommendedUse: '색상 인지, 위치 선택, 준비운동',
  },
  3: {
    signalLabel: '전면 이미지',
    titleStem: '전면',
    description: '전면에 제시되는 {theme} 이미지 신호를 보고 빠르게 판단하고 움직이는 활동',
    salesCopy: '{theme} 이미지로 즐기는 전면 반응',
    recommendedUse: '전신 반응, 이미지 판단, 집중 전환',
  },
  4: {
    signalLabel: '2분할 이미지',
    titleStem: '2분할',
    description: '좌우 또는 상하로 나뉜 두 영역의 {theme} 신호를 보고 빠르게 선택 반응하는 활동',
    salesCopy: '{theme} 이미지로 구분하는 2분할 반응',
    recommendedUse: '선택 반응, 양측 이동, 난이도 확장',
  },
  5: {
    signalLabel: '3패널 이미지',
    titleStem: '3패널',
    description: '세 패널에 제시되는 {theme} 신호를 보고 빠르게 선택 반응하는 활동',
    salesCopy: '{theme} 이미지 3패널 선택 반응',
    recommendedUse: '고급 선택 반응, 집중력 강화, 심화 훈련',
  },
  6: {
    signalLabel: '3패널 이미지',
    titleStem: '3패널 다른색',
    description: '세 패널에 서로 다른 {theme} 신호가 제시될 때 빠르게 선택 반응하는 활동',
    salesCopy: '{theme} 이미지 3패널 서로 다른 색 반응',
    recommendedUse: '심화 반응, 집중력, 선택 반응',
  },
};

function fillThemeCopy(template: string, themeLabel: string) {
  return template.replaceAll('{theme}', themeLabel);
}

function defaultExecutionFacts(signalLabel: string, themeLabel: string): OfficialSpomovePreset['executionFacts'] {
  return [
    { label: '신호 방식', value: signalLabel },
    { label: '테마', value: themeLabel },
    { label: '반복', value: '20회' },
    { label: 'BGM', value: '자동 재생' },
  ];
}

function buildReactionCognitionThemePresets(startSortOrder: number): OfficialSpomovePreset[] {
  const presets: OfficialSpomovePreset[] = [];
  let sortOrder = startSortOrder;

  for (const level of THEMED_BASIC_LEVELS) {
    const meta = BASIC_LEVEL_META[level];
    for (const theme of ALL_THEMES) {
      const key = `${level}:${theme}`;
      if (EXISTING_BASIC_THEME_KEYS.has(key)) continue;

      const themeLabel = SPOMOVE_COLOR_THEME_LABELS[theme];
      const title =
        level === 6
          ? `반응인지 · ${meta.titleStem} · ${themeLabel}`
          : `반응인지 · ${meta.titleStem} · ${themeLabel}`;

      presets.push({
        id: `reaction-cognition-l${level}-${theme}-exp`,
        sortOrder: sortOrder++,
        title,
        axis: 'response',
        axisTitle: SPOMOVE_AXIS_META.response.title,
        programGroup: 'reaction-cognition',
        programTitle: '반응 인지',
        engine: { mode: 'basic', level, variantColorTheme: theme },
        description: fillThemeCopy(meta.description, themeLabel),
        salesCopy: fillThemeCopy(meta.salesCopy, themeLabel),
        cueSeconds: 3,
        rounds: 20,
        bgmAutoPlay: true,
        bgmCategory: 'spomove-training',
        recommendedUse: meta.recommendedUse,
        isReady: true,
        settingSummary: `3초 · 20회 · ${themeLabel} 테마 · BGM 자동`,
        settingChips: ['3초', '20회', `${themeLabel} 테마`, 'BGM 자동'],
        executionFacts: defaultExecutionFacts(meta.signalLabel, themeLabel),
      });
    }
  }

  return presets;
}

function buildEngineGapPresets(startSortOrder: number): OfficialSpomovePreset[] {
  let sortOrder = startSortOrder;

  const next = (preset: Omit<OfficialSpomovePreset, 'sortOrder'>): OfficialSpomovePreset => ({
    ...preset,
    sortOrder: sortOrder++,
  });

  return [
    next({
      id: 'visual-reaction-number-cart-tier1-exp',
      title: '시지각 반응 · 숫자 기차 L1',
      axis: 'response',
      axisTitle: SPOMOVE_AXIS_META.response.title,
      programGroup: 'visual-reaction',
      programTitle: '시지각 반응',
      salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
      engine: { mode: 'reactTrain', level: 9, numberCartTier: 1 },
      description: '숫자 기차 L1 난이도. 목표 숫자를 보고 같은 답이 붙은 색 문으로 기차가 들어가는 시지각 반응 활동',
      cueSeconds: 3,
      rounds: 5,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '숫자·색 매칭, 기초 사전 판단, 선택 반응',
      isReady: true,
      settingSummary: '3초 · 5라운드 · L1 · BGM 자동',
      settingChips: ['숫자 기차 L1', '5라운드', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: '숫자 기차 L1' },
        { label: '진행 방식', value: '라운드 · 숫자·색 매칭' },
        { label: '라운드', value: '5라운드' },
        { label: 'BGM', value: '자동 재생' },
      ],
    }),
    next({
      id: 'visual-reaction-number-cart-tier3-exp',
      title: '시지각 반응 · 숫자 기차 L3',
      axis: 'response',
      axisTitle: SPOMOVE_AXIS_META.response.title,
      programGroup: 'visual-reaction',
      programTitle: '시지각 반응',
      salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
      engine: { mode: 'reactTrain', level: 9, numberCartTier: 3 },
      description: '숫자 기차 L3 난이도. +-×÷ 식을 보고 같은 답이 붙은 색 문으로 기차가 들어가는 고급 시지각 반응 활동',
      cueSeconds: 3,
      rounds: 5,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '연산·색 매칭, 고급 사전 판단, 선택 반응',
      isReady: true,
      settingSummary: '3초 · 5라운드 · L3 · BGM 자동',
      settingChips: ['숫자 기차 L3', '5라운드', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: '숫자 기차 L3' },
        { label: '진행 방식', value: '라운드 · 연산·색 매칭' },
        { label: '라운드', value: '5라운드' },
        { label: 'BGM', value: '자동 재생' },
      ],
    }),
    next({
      id: 'visual-reaction-color-tracker-tier1-exp',
      title: '시지각 반응 · 흰 공 L1',
      axis: 'response',
      axisTitle: SPOMOVE_AXIS_META.response.title,
      programGroup: 'visual-reaction',
      programTitle: '시지각 반응',
      salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
      engine: { mode: 'reactTrain', level: 10, colorTrackerTier: 1 },
      description: '흰 공 추적 L1 난이도(9개 공). 흰 공을 끝까지 추적한 뒤 멈춘 구역을 맞추는 시지각 반응 활동',
      cueSeconds: 3,
      rounds: 5,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '시각 추적, 기초 지속 주의, 단일 물체 추적',
      isReady: true,
      settingSummary: '흰 공 L1 · 5라운드 · BGM 자동',
      settingChips: ['흰 공 L1', '5라운드', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: '흰 공 L1' },
        { label: '진행 방식', value: '라운드 · 정답 수동 공개' },
        { label: '라운드', value: '5라운드' },
        { label: 'BGM', value: '자동 재생' },
      ],
    }),
    next({
      id: 'visual-reaction-color-tracker-tier3-exp',
      title: '시지각 반응 · 흰 공 L3',
      axis: 'response',
      axisTitle: SPOMOVE_AXIS_META.response.title,
      programGroup: 'visual-reaction',
      programTitle: '시지각 반응',
      salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
      engine: { mode: 'reactTrain', level: 10, colorTrackerTier: 3 },
      description: '흰 공 추적 L3 난이도(13개 공·화면 간헐 플래시). 여러 물체 속 흰 공을 추적해 멈춘 구역을 맞추는 고급 시지각 반응 활동',
      cueSeconds: 3,
      rounds: 5,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '시각 추적, 고급 지속 주의, 다중 물체 추적',
      isReady: true,
      settingSummary: '흰 공 L3 · 5라운드 · BGM 자동',
      settingChips: ['흰 공 L3', '5라운드', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: '흰 공 L3' },
        { label: '진행 방식', value: '라운드 · 정답 수동 공개' },
        { label: '라운드', value: '5라운드' },
        { label: 'BGM', value: '자동 재생' },
      ],
    }),
    next({
      id: 'simon-mixed-gallery-exp',
      title: '사이먼 효과 · 믹스 갤러리',
      en: 'Simon Effect',
      axis: 'attention',
      axisTitle: SPOMOVE_AXIS_META.attention.title,
      programGroup: 'simon',
      programTitle: '사이먼 효과',
      salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
      engine: { mode: 'simon', level: 3 },
      description: '과일·동물·감정 등 변형 색상 이미지가 섞여 극단 위치에 나타날 때 이미지 색(패드) 위치로 반응하는 활동',
      cueSeconds: 3,
      rounds: 20,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '혼합 자극 처리, 선택주의 심화, 이미지 색 반응',
      isReady: true,
      settingSummary: '3초 · 20회 · 믹스 갤러리 · BGM 자동',
      settingChips: ['믹스 갤러리', '20회', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: 'Mixed Gallery' },
        { label: '반복', value: '20회' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
    next({
      id: 'flanker-mixed-size-exp',
      title: '플랭커 · Mixed Size & Color',
      en: 'Flanker',
      axis: 'attention',
      axisTitle: SPOMOVE_AXIS_META.attention.title,
      programGroup: 'flanker',
      programTitle: '플랭커',
      salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
      engine: { mode: 'flanker', level: 4 },
      description: '크기와 색이 섞인 원 자극에서 가운데 목표 원만 골라 반응하는 선택 반응 활동',
      cueSeconds: 3,
      rounds: 20,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '크기·색 혼합 처리, 선택주의, 방해 억제',
      isReady: true,
      settingSummary: '3초 · 20회 · BGM 자동',
      settingChips: ['Mixed Size', '20회', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: 'Mixed Size & Color' },
        { label: '반복', value: '20회' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
    next({
      id: 'flanker-3circle-exp',
      title: '플랭커 · 3 Circle Extreme Sizes',
      en: 'Flanker',
      axis: 'attention',
      axisTitle: SPOMOVE_AXIS_META.attention.title,
      programGroup: 'flanker',
      programTitle: '플랭커',
      salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
      engine: { mode: 'flanker', level: 5 },
      description: '세 개의 원이 극단적인 크기로 나타날 때 목표 원을 선택하는 고급 플랭커 활동',
      cueSeconds: 3,
      rounds: 20,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '크기 극단 비교, 선택주의 심화, 집중 반응',
      isReady: true,
      settingSummary: '3초 · 20회 · BGM 자동',
      settingChips: ['3 Circle', '20회', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: '3 Circle Extreme Sizes' },
        { label: '반복', value: '20회' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
    next({
      id: 'sequential-memory-color-number-exp',
      title: '순차 기억 · Color-Number Quiz',
      en: 'Sequential Memory',
      axis: 'executive',
      axisTitle: SPOMOVE_AXIS_META.executive.title,
      programGroup: 'sequential-memory',
      programTitle: '순차 기억',
      salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
      engine: { mode: 'spatial', level: 4 },
      description: '번호 1~10에 매칭된 색을 기억하고 질문에 답하는 색·번호 연합 기억 활동',
      cueSeconds: 3,
      rounds: 10,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '색·번호 연합 기억, 작업기억, 퀴즈형 마무리',
      isReady: true,
      settingSummary: '색·번호 퀴즈 · 10라운드 · BGM 자동',
      settingChips: ['색·번호 퀴즈', '10라운드', 'BGM 자동'],
      executionFacts: [
        { label: '기억 방식', value: '색·번호 매칭' },
        { label: '라운드', value: '10라운드' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
    next({
      id: 'sequential-memory-custom-10color-exp',
      title: '순차 기억 · Custom 10-Color',
      en: 'Sequential Memory',
      axis: 'executive',
      axisTitle: SPOMOVE_AXIS_META.executive.title,
      programGroup: 'sequential-memory',
      programTitle: '순차 기억',
      salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
      engine: { mode: 'spatial', level: 6 },
      description: '1~10번 슬롯에 빨·노·초·파를 직접 지정해 순서를 기억하고 재현하는 고급 기억 활동',
      cueSeconds: 3,
      rounds: 10,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '직접 지정 순서 기억, 작업기억 극한, 심화 마무리',
      isReady: true,
      settingSummary: '10색 직접 지정 · 10라운드 · BGM 자동',
      settingChips: ['10색 직접 지정', '10라운드', 'BGM 자동'],
      executionFacts: [
        { label: '기억 방식', value: '10색 직접 지정' },
        { label: '라운드', value: '10라운드' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
    next({
      id: 'dive-jump-60sec-exp',
      title: '다이브 · 기본 점프 60초',
      en: 'Dive',
      axis: 'response',
      axisTitle: SPOMOVE_AXIS_META.response.title,
      programGroup: 'dive',
      programTitle: '다이브',
      engine: { mode: 'flow', level: 1, flowFeatures: [], flowDuration: 60 },
      description: '60초 동안 점프 동작으로 장애물을 넘으며 몸 전체로 반응하는 FLOW 기반 운동 활동',
      salesCopy: '1분 동안 이어가는 전신 점프 다이브',
      cueSeconds: 3,
      rounds: 1,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '전신 반응, 지구력형 도입, 60초 점프 훈련',
      isReady: true,
      settingSummary: 'FLOW · 60초 · 기본 점프 · BGM 자동',
      settingChips: ['60초', '기본 점프', 'FLOW', 'BGM 자동'],
      executionFacts: [
        { label: '동작', value: '기본 점프' },
        { label: '진행 방식', value: 'FLOW 60초' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
  ];
}

export function buildOfficialSpomoveExpansionPresets(startSortOrder: number): OfficialSpomovePreset[] {
  const themePresets = buildReactionCognitionThemePresets(startSortOrder);
  const engineGapPresets = buildEngineGapPresets(startSortOrder + themePresets.length);
  return [...themePresets, ...engineGapPresets];
}

export const OFFICIAL_SPOMOVE_EXPANSION_COUNT = 36;
