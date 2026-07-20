/**
 * SPOKEDU SPOMOVE training constants.
 * This file is shared by the admin trainer and SPOKEDU MASTER iframe player.
 */

import {
  SPOMOVE_AXIS_META,
  SPOMOVE_AXIS_ORDER,
  type SpomoveAxis,
} from '@/app/lib/spomove/spomoveAxisMeta';

export { SPOMOVE_AXIS_META, SPOMOVE_AXIS_ORDER, type SpomoveAxis };

export const COLORS = [
  { id: 'red', name: '빨강', bg: '#EF4444', text: '#fff', symbol: '🔴' },
  { id: 'blue', name: '파랑', bg: '#3B82F6', text: '#fff', symbol: '🔵' },
  { id: 'green', name: '초록', bg: '#22C55E', text: '#fff', symbol: '🟢' },
  { id: 'yellow', name: '노랑', bg: '#FACC15', text: '#111', symbol: '🟡' },
];

export const ARROWS = [
  { id: 'up', label: '위', icon: '↑', voice: '위로' },
  { id: 'down', label: '아래', icon: '↓', voice: '아래로' },
  { id: 'left', label: '왼쪽', icon: '←', voice: '왼쪽으로' },
  { id: 'right', label: '오른쪽', icon: '→', voice: '오른쪽으로' },
];

/** 공간 방향(compass): 화살표 방향 → 패드 색 (위 빨 / 좌 초 / 우 노 / 아래 파) */
export const SPATIAL_ARROW_COLOR_BY_DIRECTION = {
  up: 'red',
  left: 'green',
  right: 'yellow',
  down: 'blue',
} as const;

export type SpatialArrowColorMapping = 'random' | 'compass';

export function spatialArrowFillForDirection(
  _arrowId: string,
  colors: typeof COLORS = COLORS,
  mapping: SpatialArrowColorMapping = 'random',
): string {
  if (mapping === 'compass') {
    const colorId = SPATIAL_ARROW_COLOR_BY_DIRECTION[_arrowId as keyof typeof SPATIAL_ARROW_COLOR_BY_DIRECTION];
    return colors.find((c) => c.id === colorId)?.bg ?? '#FFFFFF';
  }
  const pool = colors.length > 0 ? colors : COLORS;
  return pool[Math.floor(Math.random() * pool.length)]?.bg ?? '#FFFFFF';
}

export const DUAL_TWO_COLORS = COLORS.filter((c) => c.id === 'red' || c.id === 'blue');
export const DUAL_LR_ARROWS = ARROWS.filter((a) => a.id === 'left' || a.id === 'right');

export const NUMBERS = Array.from({ length: 9 }, (_, i) => ({
  label: String(i + 1),
  voice: ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'][i],
}));

export const MEMORY_ROUNDS = 10;

type SpomoveMode = {
  id: string;
  title: string;
  en: string;
  icon: string;
  accent: string;
  tag: string;
  desc: string;
  /** @legacy Use axis / axisTitle for new display logic */
  coreCode?: string;
  /** 3대 축 분류 */
  axis?: SpomoveAxis;
  /** 한글 축 이름 (단순 반응 / 선택 반응 / 복합 반응) */
  axisTitle?: string;
  /** 카탈로그 비노출 모드 */
  isHidden?: boolean;
  levels: Array<{ id: number; name: string; enName: string; desc: string }>;
};

export const MODES: Record<string, SpomoveMode> = {
  // ── 단순 반응 Simple Reaction ──────────────────────────────────────────────
  reactTrain: {
    id: 'reactTrain',
    title: '시지각 반응',
    en: 'Visual Reaction',
    icon: '◆',
    accent: '#E11D48',
    coreCode: 'VM',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    tag: '색 자극 · 반응 훈련',
    desc: '색 자극이 떨어질 때 해당 색 위치를 밟는 시지각 및 반응 훈련입니다.',
    levels: [
      { id: 1, name: '떨어지는 벽돌', enName: 'FLOW', desc: '색 자극이 자연스럽게 흘러내립니다.' },
      { id: 2, name: '풍선 터뜨리기', enName: 'FLASH', desc: '짧게 나타나는 색 자극에 빠르게 반응합니다.' },
      { id: 3, name: '동그라미 파동', enName: 'Beat Wave', desc: '중앙에서 퍼지는 색 링이 목표 원에 닿는 박자에 맞춰 해당 색 위치를 반응합니다.' },
      { id: 4, name: '매직 아이', enName: 'Camouflage', desc: '노이즈 속 위장 도형이 드러날 때 해당 색을 찾습니다. 난이도(1/2)는 아래에서 고릅니다.' },
      { id: 6, name: '파도타기', enName: 'Rush', desc: '파도처럼 빠르게 쏟아지는 자극에 연속으로 반응합니다.' },
      { id: 7, name: '두더지 잡기', enName: 'Mole', desc: '구멍에서 튀어나오는 두더지에 반응합니다. 난이도(1/2)는 아래에서 고릅니다.' },
      { id: 8, name: '소행성을 피해라', enName: 'Wormhole', desc: '무한 가속하는 웜홀 속에서 운석이 없는 안전한 색 구역으로 회피합니다.' },
      { id: 9, name: '숫자 기차', enName: 'Number Cart', desc: '목표 숫자(또는 식)를 보고 같은 답이 붙은 색 문으로 수레가 들어갑니다. 난이도(1/2/3)는 아래에서 고릅니다.' },
      { id: 10, name: '흰 공 찾기', enName: 'Color Tracker', desc: '흰 공을 끝까지 추적한 뒤 멈춘 구역을 맞춥니다. 난이도(1/2/3)는 아래에서 고릅니다.' },
    ],
  },
  basic: {
    id: 'basic',
    title: '반응 인지',
    en: 'Reactive Cognition',
    icon: '⚡',
    accent: '#3B82F6',
    coreCode: 'VM',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    tag: '화면 신호 · 지각 훈련',
    desc: '화면 신호를 보는 순간 판단하고 즉시 움직이는 기본 반응 훈련입니다.',
    levels: [
      { id: 1, name: '공간방향 자극', enName: 'Spatial Orientation', desc: '화면 극단의 기둥+화살표 방향을 보고 해당 방향 패드로 이동합니다. 옵션: 기본/색상.' },
      { id: 2, name: '사분할 자극', enName: 'Quad Color', desc: '4분할 색·이미지 신호를 보고 해당 위치로 이동합니다. 옵션: 이미지 테마.' },
      { id: 7, name: '변형 사분할 자극', enName: 'Modified Quadrant', desc: '색과 신체 부위가 함께 나타납니다. 옵션: 쉬움/어려움 · 1~4단계.' },
      { id: 3, name: '전면 자극', enName: 'Full-Screen Color', desc: '화면 전체 색 신호를 보고 해당 위치로 이동합니다. 옵션: 이미지 테마.' },
      { id: 4, name: '전면 2패널 자극', enName: 'Variant Color 1', desc: '전면 2패널에 서로 다른 색 신호가 나타납니다. 옵션: 이미지 테마.' },
      { id: 5, name: '전면 3패널 자극', enName: 'Variant Color 2/3', desc: '전면 3패널 자극입니다. 옵션: 이미지 테마 · 같은 색/서로 다른 색.' },
    ],
  },

  // ── 선택 반응 Choice Reaction ──────────────────────────────────────────────
  simon: {
    id: 'simon',
    title: '사이먼 효과',
    en: 'Simon Effect',
    icon: '◈',
    accent: '#EC4899',
    coreCode: 'IC',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    tag: '공간 위치 · 색 반응',
    desc: '원, 삼각형, 사각형이 화면 어디에나 하나씩 나타납니다. 채워진 색에 맞는 색 위치로 이동합니다.',
    levels: [
      { id: 1, name: '1단계', enName: 'Pole Shape', desc: '도형의 위치와 색을 분리해서 판단합니다.' },
      { id: 2, name: '2단계', enName: 'Pole Arrows', desc: '화살표가 가리키는 방향과 색 규칙을 구분합니다.' },
      { id: 3, name: '믹스 갤러리', enName: 'Mixed Gallery', desc: '과일·동물 등 변형 색상 이미지가 섞여 극단 위치에 나타납니다. 이미지 색(패드) 위치로 이동합니다.' },
    ],
  },
  flanker: {
    id: 'flanker',
    title: '플랭커',
    en: 'Flanker',
    icon: '◎',
    accent: '#6366F1',
    coreCode: 'IC',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    tag: '방해 자극 · 목표 선택',
    desc: '가로로 나란히 다섯 개의 원이 보입니다. 가운데 원의 색에 맞는 색 위치로만 이동합니다.',
    levels: [
      { id: 1, name: '동일 플랭커', enName: 'Uniform Flankers', desc: '다섯 원이 같은 색입니다. 가운데 색에 반응합니다.' },
      { id: 3, name: '랜덤 플랭커', enName: 'Random Flankers', desc: '무작위 색 원 중 가운데 색만 보고 판단합니다.' },
      { id: 4, name: '크기/색 혼합', enName: 'Mixed Size & Color', desc: '크기와 색이 섞인 자극에서 목표 원을 찾습니다.' },
      { id: 6, name: '5원 극단 크기', enName: '5-Circle Extreme Sizes', desc: '다섯 개의 원이 서로 다른 크기로 나타납니다.' },
    ],
  },

  // ── 복합 반응 Complex Reaction ─────────────────────────────────────────────
  stroop: {
    id: 'stroop',
    title: '스트룹 과제',
    en: 'Stroop Task',
    icon: '🧠',
    accent: '#A855F7',
    coreCode: 'IC',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    tag: '통제 제어 · 인지 지연',
    desc: '배경은 기본 흰색입니다. 화살표와 글자 과제에서 규칙에 따라 방향, 색, 의미를 말합니다.',
    levels: [
      { id: 1, name: '1단계', enName: 'Spatial Orientation (Color)', desc: '방향별 색이 채워진 화살표를 보고 해당 방향 패드로 이동합니다.' },
      { id: 2, name: '2단계', enName: 'Arrow + BG Interference', desc: '화살표와 배경 간섭을 함께 처리합니다.' },
      { id: 3, name: '3단계', enName: 'Word Stroop / Reverse', desc: '글자 의미와 반대 규칙을 처리합니다.' },
      { id: 4, name: '4단계', enName: 'Word + BG', desc: '글자와 배경색 간섭을 함께 처리합니다.' },
      { id: 5, name: '5단계', enName: 'Missing Color', desc: '나오지 않은 색을 찾아 말합니다.' },
    ],
  },
  spatial: {
    id: 'spatial',
    title: '순차 기억',
    en: 'Sequential Memory',
    icon: '🎨',
    accent: '#22C55E',
    coreCode: 'EWM',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    tag: '작업기억 · 순서 재생',
    desc: '색깔이 하나씩 차례로 나타납니다. 머릿속에 순서를 담아 재현하세요.',
    levels: [
      { id: 1, name: '색 순서 기억', enName: 'Color Sequence', desc: '색이 순서대로 나타납니다. 항 수(3/5/10)는 아래에서 고릅니다.' },
      { id: 4, name: '색·번호 기억', enName: 'Color-Number', desc: '번호에 매칭된 색을 기억합니다. 퀴즈/전체 공개는 아래에서 고릅니다.' },
      { id: 6, name: '직접 지정 10색', enName: 'Custom 10-Color Sequence', desc: '1~10번 슬롯에 빨·노·초·파를 직접 지정해 순서를 기억합니다.' },
    ],
  },

  // ── Legacy / Hidden (removed from catalog — engine code retained in signals.ts for core5) ──
  flow: {
    id: 'flow',
    title: '다이브',
    en: 'Dive Mode',
    icon: '🌀',
    accent: '#06B6D4',
    coreCode: 'VM',
    tag: '몰입 러닝 · 반응 전환',
    desc: '3D 몰입 환경에서 달리고, 점프하고, 동작을 수행하는 DIVE 트레이닝입니다.',
    levels: [
      { id: 1, name: '1단계', enName: 'Dive Program', desc: 'DIVE 전체 시퀀스를 진행합니다.' },
      { id: 2, name: '2단계', enName: 'Color Gate', desc: '브릿지 없이 공유 배경에서 색 포즈 관문만 진행합니다.' },
    ],
  },
};

/**
 * SPOMOVE 3대 축 × 2개 핵심 프로그램 카탈로그 (단순 → 선택 → 복합 반응 순)
 *
 * 단순 반응: 시지각 반응 / 반응 인지
 * 선택 반응: 사이먼 효과 / 플랭커
 * 복합 반응: 스트룹 과제 / 순차 기억
 */
export const SPOMOVE_CATALOG_SLOT_IDS = [
  'reactTrain', // 단순 1 — 시지각 반응 / Visual Reaction
  'basic',      // 단순 2 — 반응 인지 / Reactive Cognition
  'simon',      // 선택 1 — 사이먼 효과 / Simon Effect
  'flanker',    // 선택 2 — 플랭커 / Flanker
  'stroop',     // 복합 1 — 스트룹 과제 / Stroop Task
  'spatial',    // 복합 2 — 순차 기억 / Sequential Memory
] as const;

/** 3대 축 그리드 밖, 카탈로그 맨 하단에 단독 노출하는 프로그램 */
export const SPOMOVE_BOTTOM_CATALOG_SLOT_IDS = [
  'flow', // 다이브 / Dive Mode
] as const;

export type ReactTrainUiLevelDefaults = {
  engineLevel: number;
  moleLookMode?: 'classic' | 'variant';
  numberCartTier?: 1 | 2 | 3;
  colorTrackerTier?: 1 | 2 | 3;
  camouflagePlacement?: 'center' | 'variant';
};

/**
 * reactTrain UI level id → engine level + tier/mode defaults.
 * 카탈로그는 기본(4/7/9/10)만 노출하고, 난이도는 설정 버튼으로 고른다.
 * 구 카탈로그 id(41/71/91~93/101~103)는 딥링크·복귀용으로만 매핑한다.
 */
export function resolveReactTrainUiLevel(level: number): ReactTrainUiLevelDefaults {
  switch (level) {
    case 5:
      // 삭제된 Sweep/Pulse 자리 — FLOW로 폴백
      return { engineLevel: 1 };
    case 41:
      return { engineLevel: 4, camouflagePlacement: 'variant' };
    case 4:
      return { engineLevel: 4, camouflagePlacement: 'center' };
    case 71:
      return { engineLevel: 7, moleLookMode: 'variant' };
    case 7:
      return { engineLevel: 7, moleLookMode: 'classic' };
    case 91:
      return { engineLevel: 9, numberCartTier: 1 };
    case 92:
      return { engineLevel: 9, numberCartTier: 2 };
    case 93:
      return { engineLevel: 9, numberCartTier: 3 };
    case 9:
      return { engineLevel: 9, numberCartTier: 1 };
    case 101:
      return { engineLevel: 10, colorTrackerTier: 1 };
    case 102:
      return { engineLevel: 10, colorTrackerTier: 2 };
    case 103:
      return { engineLevel: 10, colorTrackerTier: 3 };
    case 10:
      return { engineLevel: 10, colorTrackerTier: 1 };
    default:
      return { engineLevel: level };
  }
}

/** 구 티어 전용 카탈로그 id → 기본 카탈로그 id */
export function catalogReactTrainUiLevel(level: number): number {
  return resolveReactTrainUiLevel(level).engineLevel;
}

export function isModifiedQuadrantLevel(level: number): boolean {
  return level >= 7 && level <= 10;
}

export function isFront3PanelLevel(level: number): boolean {
  return level === 5 || level === 6;
}

/** basic 엔진 level → 카탈로그 대표 id (변형사분할=7, 전면3패널=5) */
export function catalogBasicUiLevel(level: number): number {
  if (isModifiedQuadrantLevel(level)) return 7;
  if (level === 6) return 5;
  return level;
}

export function modifiedQuadrantStage(level: number): 1 | 2 | 3 | 4 {
  if (level === 8) return 2;
  if (level === 9) return 3;
  if (level === 10) return 4;
  return 1;
}

export function modifiedQuadrantLevelFromStage(stage: 1 | 2 | 3 | 4): number {
  return ([7, 8, 9, 10] as const)[stage - 1]!;
}

export function isColorSequenceLevel(level: number): boolean {
  return level === 1 || level === 2 || level === 3;
}

export function isColorNumberLevel(level: number): boolean {
  return level === 4 || level === 5;
}

/** spatial 엔진 level → 카탈로그 대표 id (색순서=1, 색·번호=4) */
export function catalogSpatialUiLevel(level: number): number {
  if (isColorSequenceLevel(level)) return 1;
  if (isColorNumberLevel(level)) return 4;
  return level;
}

export function colorSequenceLength(level: number): 3 | 5 | 10 {
  if (level === 2) return 5;
  if (level === 3) return 10;
  return 3;
}

export function colorSequenceLevelFromLength(length: 3 | 5 | 10): number {
  if (length === 5) return 2;
  if (length === 10) return 3;
  return 1;
}

export function reactTrainEngineLevelForUi(uiLevel: number): number {
  return resolveReactTrainUiLevel(uiLevel).engineLevel;
}

export function resolveTrainingEngine(mode: string, level: number): { engineMode: string; engineLevel: number } {
  if (mode === 'executive') {
    const lv = Math.min(7, Math.max(1, Math.floor(level)));
    if (lv <= 4) return { engineMode: 'gonogo', engineLevel: lv };
    return { engineMode: 'taskswitch', engineLevel: lv - 4 };
  }
  if (mode === 'gonogo') {
    const lv = Math.min(4, Math.max(1, Math.floor(level)));
    return { engineMode: 'gonogo', engineLevel: lv };
  }
  if (mode === 'taskswitch') {
    const lv = Math.min(3, Math.max(1, Math.floor(level)));
    return { engineMode: 'taskswitch', engineLevel: lv };
  }
  if (mode === 'stroop' && level === 1) {
    return { engineMode: 'basic', engineLevel: 1 };
  }
  if (mode === 'reactTrain') {
    return { engineMode: 'reactTrain', engineLevel: resolveReactTrainUiLevel(level).engineLevel };
  }
  return { engineMode: mode, engineLevel: level };
}

export function normalizeLegacyTrainingMode(mode: string | undefined, level: number): { mode: string; level: number } {
  if (!mode) return { mode: 'basic', level: 1 };
  if (mode === 'gonogo') return { mode: 'gonogo', level: Math.min(4, Math.max(1, level)) };
  if (mode === 'taskswitch') return { mode: 'taskswitch', level: Math.min(3, Math.max(1, level)) };
  if (mode === 'executive') {
    const lv = Math.min(7, Math.max(1, Math.floor(level)));
    if (lv <= 4) return { mode: 'gonogo', level: lv };
    return { mode: 'taskswitch', level: lv - 4 };
  }
  if (mode === 'dual') return { mode: 'gonogo', level: 1 };
  return { mode, level };
}

export const STUDENTS_KEY = 'spokedu_students_v1';
export const STUDENT_COLORS = ['#F97316', '#3B82F6', '#22C55E', '#A855F7', '#EF4444', '#FACC15', '#06B6D4', '#EC4899'];

export const SPEED_PRESETS = [
  { label: '유아', sub: '5~7세', value: 5.0, emoji: '🧒', color: '#F59E0B' },
  { label: '초등 저학년', sub: '8~10세', value: 4.0, emoji: '🏃', color: '#10B981' },
  { label: '초등 고학년', sub: '11~13세', value: 3.0, emoji: '⚡', color: '#3B82F6' },
  { label: '중고등·성인', sub: '14~40세', value: 2.0, emoji: '🔥', color: '#8B5CF6' },
  { label: '시니어', sub: '60세 이상', value: 4.5, emoji: '🌿', color: '#EC4899' },
];
