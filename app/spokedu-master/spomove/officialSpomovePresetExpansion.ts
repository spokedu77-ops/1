import { SPOMOVE_AXIS_META } from '@/app/lib/spomove/spomoveAxisMeta';
import {
  SPOMOVE_COLOR_THEME_LABELS,
  type SpomoveColorThemeId,
} from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';

import type { OfficialSpomovePreset } from './officialSpomovePresets';

const THEMED_BASIC_LEVELS = [2, 3, 4, 5, 6] as const;
const ALL_THEMES: SpomoveColorThemeId[] = ['fruit', 'animal', 'color', 'food', 'nature', 'vehicle', 'mix'];

const EXISTING_BASIC_THEME_KEYS = new Set([
  '2:color',
  '2:fruit',
  '3:color',
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
    signalLabel: '4분할 그리드형',
    titleStem: '4분할 자극',
    description: '2×2 그리드형 화면에서 한 칸에 표시되는 {theme} 신호를 보고 해당 색 패드 위치로 즉시 이동하는 활동',
    salesCopy: '{theme} 테마로 색·위치 지각을 연결하는 4분할 반응',
    recommendedUse: '색상 지각, 위치 선택, 반응-실행 연결',
  },
  3: {
    signalLabel: '전면단일 전체형',
    titleStem: '전면단일 자극',
    description: '전체형 화면 하나에 크게 표시되는 {theme} 신호를 보고 해당 색 패드 위치로 즉시 이동하는 전면단일 자극 활동',
    salesCopy: '{theme} 테마로 색·이미지 지각을 연결하는 전면단일 반응',
    recommendedUse: '전신 반응, 색·이미지 판단, 반응-실행 연결',
  },
  4: {
    signalLabel: '2분할 패널형',
    titleStem: '2분할 자극',
    description: '2분할 패널형 화면의 좌우 두 패널에 표시되는 {theme} 신호를 보고 해당 색 패드 위치로 즉시 이동하는 활동',
    salesCopy: '{theme} 테마로 두 패널의 색·이미지 지각을 연결하는 2분할 반응',
    recommendedUse: '선택 반응, 양측 이동, 색·이미지 판단, 반응-실행 연결',
  },
  5: {
    signalLabel: '3분할 패널형',
    titleStem: '3분할 자극',
    description: '3분할 패널형 화면의 세 패널에 표시되는 서로 다른 {theme} 신호 중 목표 색을 골라 해당 색 패드 위치로 즉시 이동하는 활동',
    salesCopy: '{theme} 테마로 서로 다른 세 신호를 빠르게 고르는 3분할 반응',
    recommendedUse: '선택 반응, 시선 분산, 색·이미지 판단, 반응-실행 연결',
  },
  6: {
    signalLabel: '랜덤분할 전체/패널형',
    titleStem: '랜덤분할 자극',
    description: '전면 1개·2분할·3분할이 20%·30%·50% 확률로 바뀌며 제시되는 {theme} 신호를 보고 해당 색 패드 위치로 즉시 이동하는 활동',
    salesCopy: '{theme} 테마로 전체형과 패널형 전환에 반응하는 랜덤분할 반응',
    recommendedUse: '심화 선택 반응, 시선 분산, 색·이미지 판단, 반응-실행 연결',
  },
};

function fillThemeCopy(template: string, themeLabel: string) {
  return template.replaceAll('{theme}', themeLabel);
}

function defaultExecutionFacts(signalLabel: string, themeLabel: string): OfficialSpomovePreset['executionFacts'] {
  return [
    { label: '화면 형태', value: signalLabel },
    { label: '신호 방식', value: themeLabel === '색상' ? '색상 신호' : '테마 이미지' },
    { label: '테마', value: themeLabel },
    { label: '반복', value: '20회' },
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
        level === 2
          ? themeLabel
          : level === 3
            ? `전면단일 · ${themeLabel}`
            : level === 4
              ? `2분할 · ${themeLabel}`
              : level === 5
              ? `3분할 · ${themeLabel}`
              : level === 6
                ? `랜덤분할 · ${themeLabel}`
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
        settingSummary:
          level === 2
            ? `4분할 그리드형 · ${themeLabel} · 3초 · 20회`
            : level === 3
              ? `전면단일 전체형 · ${themeLabel} · 3초 · 20회`
              : level === 4
                ? `2분할 패널형 · ${themeLabel} · 3초 · 20회`
                : level === 5
                  ? `3분할 패널형 · ${themeLabel} · 3초 · 20회`
                  : level === 6
                    ? `랜덤분할 전체/패널형 · ${themeLabel} · 3초 · 20회`
              : `3초 · 20회 · ${themeLabel} 테마 · BGM 자동`,
        settingChips:
          level === 2
            ? ['4분할', '그리드형', themeLabel, '3초', '20회']
            : level === 3
              ? ['전면단일', '전체형', themeLabel, '3초', '20회']
              : level === 4
                ? ['2분할', '패널형', themeLabel, '3초', '20회']
                : level === 5
                  ? ['3분할', '패널형', themeLabel, '3초', '20회']
                  : level === 6
                    ? ['랜덤분할', '패널형', themeLabel, '3초', '20회']
              : ['3초', '20회', `${themeLabel} 테마`, 'BGM 자동'],
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
      id: 'simon-mixed-gallery-exp',
      title: '사이먼 효과 · 믹스 갤러리',
      en: 'Simon Effect',
      axis: 'attention',
      axisTitle: SPOMOVE_AXIS_META.attention.title,
      programGroup: 'simon',
      programTitle: '사이먼 효과',
      salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
      engine: { mode: 'simon', level: 3 },
      description: '과일·동물 등 변형 색상 이미지가 섞여 극단 위치에 나타날 때 이미지 색(패드) 위치로 반응하는 활동',
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
      id: 'flanker-arrow-udlr-exp',
      title: '플랭커 · 화살표 · 상하좌우',
      en: 'Flanker',
      axis: 'attention',
      axisTitle: SPOMOVE_AXIS_META.attention.title,
      programGroup: 'flanker',
      programTitle: '플랭커',
      salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
      engine: { mode: 'flanker', level: 5, flankerArrowMode: 'udlr' },
      description: '상하좌우 화살표 방해 자극 속에서 가운데 방향만 보고 반응하는 응용 화살표 플랭커 활동',
      cueSeconds: 3,
      rounds: 20,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '방향 방해 억제, 상하좌우 반응, 선택주의',
      isReady: true,
      settingSummary: '3초 · 20회 · 상하좌우 · BGM 자동',
      settingChips: ['화살표', '상하좌우', '20회', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: 'Arrow Flanker · UDLR' },
        { label: '반복', value: '20회' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
    next({
      id: 'flanker-uniform-number-exp',
      title: '플랭커 · Uniform · 숫자',
      en: 'Flanker',
      axis: 'attention',
      axisTitle: SPOMOVE_AXIS_META.attention.title,
      programGroup: 'flanker',
      programTitle: '플랭커',
      salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
      engine: { mode: 'flanker', level: 1, flankerStimulusType: 'number' },
      description: '다섯 원이 같은 색일 때 가운데 숫자에 맞는 색 위치로 반응하는 숫자 플랭커 활동',
      cueSeconds: 3,
      rounds: 20,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '숫자·색 매칭, 선택주의, 방해 억제',
      isReady: true,
      settingSummary: '3초 · Uniform · 숫자 · 20회',
      settingChips: ['Uniform', '숫자', '20회', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: 'Uniform · 숫자' },
        { label: '반복', value: '20회' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
    next({
      id: 'flanker-random-number-exp',
      title: '플랭커 · Random · 숫자',
      en: 'Flanker',
      axis: 'attention',
      axisTitle: SPOMOVE_AXIS_META.attention.title,
      programGroup: 'flanker',
      programTitle: '플랭커',
      salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
      engine: { mode: 'flanker', level: 2, flankerStimulusType: 'number' },
      description: '무작위 색 원 중 가운데 숫자에 맞는 색 위치로 반응하는 숫자 플랭커 활동',
      cueSeconds: 3,
      rounds: 20,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '숫자·색 매칭, 무작위 방해 억제, 선택주의',
      isReady: true,
      settingSummary: '3초 · Random · 숫자 · 20회',
      settingChips: ['Random', '숫자', '20회', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: 'Random · 숫자' },
        { label: '반복', value: '20회' },
        { label: 'BGM', value: '자동 재생' },
        { label: '효과음', value: '자동' },
      ],
    }),
    next({
      id: 'flanker-5circle-number-exp',
      title: '플랭커 · 5원 극단 · 숫자',
      en: 'Flanker',
      axis: 'attention',
      axisTitle: SPOMOVE_AXIS_META.attention.title,
      programGroup: 'flanker',
      programTitle: '플랭커',
      salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
      engine: { mode: 'flanker', level: 3, flankerStimulusType: 'number' },
      description: '극단적 크기 대비 다섯 원에서 가운데 숫자에 맞는 색 위치로 반응하는 숫자 플랭커 활동',
      cueSeconds: 3,
      rounds: 20,
      bgmAutoPlay: true,
      bgmCategory: 'spomove-training',
      recommendedUse: '숫자·색 매칭, 크기 극단 비교, 선택주의',
      isReady: true,
      settingSummary: '3초 · 극단 크기 · 숫자 · 20회',
      settingChips: ['극단 크기', '숫자', '20회', 'BGM 자동'],
      executionFacts: [
        { label: '자극 방식', value: '5 Circle Extreme · 숫자' },
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
  ];
}

export function buildOfficialSpomoveExpansionPresets(startSortOrder: number): OfficialSpomovePreset[] {
  const themePresets = buildReactionCognitionThemePresets(startSortOrder);
  const engineGapPresets = buildEngineGapPresets(startSortOrder + themePresets.length);
  return [...themePresets, ...engineGapPresets];
}

export const OFFICIAL_SPOMOVE_EXPANSION_COUNT = 34;
