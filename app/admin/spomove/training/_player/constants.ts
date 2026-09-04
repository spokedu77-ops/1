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
  mapping: SpatialArrowColorMapping = 'compass',
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
      // id = engine level (불변). 화면 N번은 카탈로그 배열 순번.
      { id: 3, name: '풍선 터뜨리기', enName: 'Balloon Pop', desc: '난이도 쉬움. 풍선 색 패드로 이동하고, 풍선이 터질 때 박수로 반응합니다.' },
      { id: 1, name: '파도 피하기', enName: 'Wave Dodge', desc: '난이도 쉬움. 파도 색 패드로 이동하고, 파도가 터질 때 점프합니다.' },
      { id: 2, name: '떨어지는 벽돌', enName: 'Falling Bricks', desc: '난이도 보통. 색 벽돌 2개가 떨어지면 해당 색 패드 두 곳에 한 발씩 놓습니다.' },
      { id: 6, name: '두더지 잡기', enName: 'Mole', desc: '난이도 쉬움/보통. 쉬움은 1마리, 보통은 1마리 50%·2마리 50%로 등장합니다. 보너스타임 ON 시 본 활동 뒤 15초 동안 점점 빠르게 다중 등장합니다.' },
      { id: 10, name: '축구 : 골키퍼', enName: 'Soccer Goalkeeper', desc: '난이도 쉬움/보통. 쉬움은 공 1개, 보통은 공 1개 50%·2개 50%로 날아옵니다. 보너스타임 ON 시 본 활동 뒤 15초 동안 점점 빠르게 다중 슛이 날아옵니다.' },
      { id: 201, name: '손 따로, 발 따로', enName: 'Hand and Foot Separate', desc: '난이도 쉬움/보통/어려움. 기존 변형 4분할 프로그램을 시지각 반응으로 이관합니다.' },
      { id: 9, name: '흰 공 찾기', enName: 'Color Tracker', desc: '난이도 보통(1패널)/어려움(2패널)과 속도 느림(9개)/빠름(13개)을 고릅니다. 흰 공 1개를 검은 공들 속에서 추적합니다.' },
      { id: 8, name: '(보류) 숫자 연산 기차', enName: '(On Hold) Number Train', desc: '삭제하지 않고 보류합니다. 스포키듀 마스터에서는 숨길 예정입니다.' },
      { id: 13, name: '(보류) 바이러스 폭증', enName: '(On Hold) Virus Outbreak', desc: '삭제하지 않고 보류합니다. 스포키듀 마스터에서는 숨길 예정입니다.' },
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
      { id: 1, name: '공간방향 자극', enName: 'Arrow / Color Arrow', desc: '전체형 화면 중앙의 화살표 방향을 보고 해당 방향 패드로 이동합니다. 난이도: 화살표/색상 화살표.' },
      { id: 2, name: '4분할 자극', enName: '4-Quadrant Stimulus', desc: '2×2 그리드형 화면의 한 칸에 뜨는 색·테마 이미지 신호를 보고 해당 색 패드 위치로 이동합니다. 옵션: 7개 테마.' },
      { id: 3, name: '전면단일 자극', enName: 'Full-Screen Single Stimulus', desc: '전체형 화면 하나를 채우는 색·테마 이미지 신호를 보고 해당 색 패드 위치로 이동합니다. 옵션: 7개 테마.' },
      { id: 4, name: '2분할 자극', enName: '2-Split Stimulus', desc: '2분할 패널형 화면의 좌우 두 패널에 서로 다른 색·테마 이미지 신호가 나타납니다. 옵션: 7개 테마.' },
      { id: 5, name: '3분할 자극', enName: '3-Split Stimulus', desc: '3분할 패널형 화면의 세 패널에 서로 다른 색·테마 이미지 신호가 나타납니다. 옵션: 7개 테마.' },
      { id: 6, name: '랜덤분할 자극', enName: 'Random-Split Stimulus', desc: '전면 1개·2패널·3패널이 20%·30%·50% 확률로 랜덤 제시됩니다. 옵션: 7개 테마.' },
    ],
  },

  // ── 선택 반응 Choice Reaction ──────────────────────────────────────────────
  simon: {
    id: 'simon',
    title: '사이먼 이펙트',
    en: 'Simon Effect',
    icon: '◈',
    accent: '#EC4899',
    coreCode: 'IC',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    tag: '공간 위치 · 색 반응',
    desc: '원, 삼각형, 사각형이 화면 어디에나 하나씩 나타납니다. 채워진 색에 맞는 색 위치로 이동합니다.',
    levels: [
      { id: 2, name: '화살표', enName: 'Arrow', desc: '화살표가 가리키는 방향과 색 규칙을 구분합니다.' },
      { id: 1, name: '도형', enName: 'Shape', desc: '도형의 위치와 색을 분리해서 판단합니다.' },
      { id: 5, name: '풍선', enName: 'Balloon', desc: '화면 어디에나 나타나는 색 풍선이 터질 때 해당 색 위치로 이동합니다.' },
      { id: 3, name: '랜덤 테마', enName: 'Random Theme', desc: '과일·동물 등 변형 색상 이미지가 섞여 극단 위치에 나타납니다. 이미지 색(패드) 위치로 이동합니다.' },
      { id: 4, name: '카모플라쥬', enName: 'Camouflage', desc: '노이즈 속 위장 도형이 화면 극단에 드러날 때 해당 색을 찾습니다.' },
    ],
  },
  flanker: {
    id: 'flanker',
    title: '플랭커 이펙트',
    en: 'Flanker Effect',
    icon: '◎',
    accent: '#6366F1',
    coreCode: 'IC',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    tag: '방해 자극 · 목표 선택',
    desc: '가로로 나란히 다섯 개의 원이 보이거나, 동심 원·화살표 자극이 나타납니다. 가운데(또는 가장 안쪽) 목표만 보고 반응합니다.',
    levels: [
      { id: 1, name: '화살표', enName: 'Arrow', desc: '난이도 보통은 좌우 화살표, 어려움은 상하좌우 화살표입니다. 가운데 방향만 보고 이동합니다.' },
      { id: 2, name: '랜덤 자극', enName: 'Random Stimulus', desc: '색상이 기본이며, 반응 인지와 동일한 7가지 테마(색상·과일·동물·음식·자연·탈 것·믹스)를 고릅니다. 가운데 원 색에 반응합니다.' },
      { id: 3, name: '극단', enName: 'Extreme', desc: '난이도 보통은 7개 테마의 극단 크기 원, 어려움은 극단 크기 화살표입니다. 가운데 목표에 반응합니다.' },
      { id: 4, name: '(보류) 원 속의 원', enName: '(On Hold) Nested Circles', desc: '동심 원 플랭커는 현재 보류합니다. 삭제하지 않고 관리자에서만 확인합니다.' },
    ],
  },

  // ── 복합 반응 Complex Reaction ─────────────────────────────────────────────
  stroop: {
    id: 'stroop',
    title: '스트룹 이펙트',
    en: 'Stroop Effect',
    icon: '🧠',
    accent: '#A855F7',
    coreCode: 'IC',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    tag: '통제 제어 · 인지 지연',
    desc: '배경은 기본 검정입니다. 화살표와 글자 과제에서 규칙에 따라 방향, 색, 의미를 말합니다.',
    levels: [
      { id: 1, name: '색상화살표', enName: 'Color Arrow', desc: '화살표 방향과 랜덤 색상을 분리해 처리합니다. 반응인지 색상화살표처럼 방향별 고정색을 쓰지 않습니다.' },
      { id: 2, name: '단어', enName: 'Word', desc: '단어 의미와 글자색 규칙을 처리합니다.' },
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
      { id: 1, name: '순서 기억', enName: 'Order Memory', desc: '난이도 쉬움은 3개, 보통은 5개, 쉬움→보통→어려움은 3~7개 점증, 어려움은 직접 지정 10색으로 진행합니다.' },
      { id: 2, name: '랜덤 기억', enName: 'Random Memory', desc: '난이도 어려움에서 퀴즈 또는 전체 공개 방식으로 색과 번호를 기억합니다.' },
      { id: 7, name: '순간 기억', enName: 'Instant Memory', desc: '그리드 색을 잠깐 기억한 뒤, 바뀐 한 칸의 색을 찾아 패드로 반응합니다. 타일 수(3×3/4×4/5×5)와 깜빡이/원샷을 고릅니다.' },
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
      { id: 1, name: '액션 무브', enName: 'Action Move', desc: 'DIVE 전체 시퀀스를 진행합니다.' },
      { id: 2, name: '모션 게이트', enName: 'Motion Gate', desc: '브릿지 없이 공유 배경에서 색 포즈 관문만 진행합니다.' },
    ],
  },
};

/**
 * SPOMOVE 3대 축 × 2개 핵심 프로그램 카탈로그 (단순 → 선택 → 복합 반응 순)
 *
 * 단순 반응: 시지각 반응 / 반응 인지
 * 선택 반응: 사이먼 이펙트 / 플랭커
 * 복합 반응: 스트룹 이펙트 / 순차 기억
 */
export const SPOMOVE_CATALOG_SLOT_IDS = [
  'basic',      // 단순 1 — 반응 인지 / Reactive Cognition
  'reactTrain', // 단순 2 — 시지각 반응 / Visual Reaction
  'simon',      // 선택 1 — 사이먼 이펙트 / Simon Effect
  'flanker',    // 선택 2 — 플랭커 / Flanker
  'stroop',     // 복합 1 — 스트룹 이펙트 / Stroop Task
  'spatial',    // 복합 2 — 순차 기억 / Sequential Memory
] as const;

/** 3대 축 그리드 밖, 카탈로그 맨 하단에 단독 노출하는 프로그램 */
export const SPOMOVE_BOTTOM_CATALOG_SLOT_IDS = [
  'flow', // 다이브 / Dive Mode
] as const;

export type ReactTrainUiLevelDefaults = {
  engineLevel: number;
  engineMode?: string;
  moleLookMode?: 'classic' | 'variant';
  numberCartTier?: 1 | 2 | 3;
  colorTrackerTier?: 1 | 2 | 3;
  goalkeeperTier?: 1 | 2;
  camouflagePlacement?: 'center' | 'variant';
};

/**
 * 구(비연속) reactTrain level → 신(화면=level 1~10) 체계.
 * 1~10은 신 SSOT이므로 그대로 두고, 구 전용 id만 보정한다.
 *
 * 구 체계: 6 Rush · 1 FLOW · 2 FLASH · 3 Beat · 4 Camouflage · 7 Mole · 8 Wormhole · 9 Number · 10 Color · 11 Goalkeeper
 * 신 체계: 1 Rush · 2 FLOW · 3 FLASH · 4 Beat · 5 Camouflage · 6 Mole · 7 Wormhole · 8 Number · 9 Color · 10 Goalkeeper
 */
const LEGACY_REACT_TRAIN_LEVEL_REMAP: Record<number, number> = {
  11: 10, // 구 골키퍼
  41: 5, // 구 매직 아이 L2
  71: 6, // 구 두더지 L2
  91: 8,
  92: 8,
  93: 8,
  101: 9,
  102: 9,
  103: 9,
};

/**
 * reactTrain UI level id → engine level + tier/mode defaults.
 * 카탈로그는 1~10만 노출하고, 난이도는 설정 버튼으로 고른다.
 * 구 카탈로그 id(11/41/71/91~93/101~103)는 딥링크·복귀용으로만 매핑한다.
 */
export function resolveReactTrainUiLevel(level: number): ReactTrainUiLevelDefaults {
  switch (level) {
    case 201:
      return { engineMode: 'basic', engineLevel: 7 };
    case 41:
      return { engineLevel: 5, camouflagePlacement: 'variant' };
    case 5:
      // 레거시 reactTrain 매직 아이 — 카탈로그에서는 사이먼 4번으로 이동, 극단만
      return { engineLevel: 5, camouflagePlacement: 'variant' };
    case 71:
      return { engineLevel: 6, moleLookMode: 'variant' };
    case 6:
      return { engineLevel: 6, moleLookMode: 'classic' };
    case 91:
      return { engineLevel: 8, numberCartTier: 1 };
    case 92:
      return { engineLevel: 8, numberCartTier: 2 };
    case 93:
      return { engineLevel: 8, numberCartTier: 3 };
    case 8:
      return { engineLevel: 8, numberCartTier: 1 };
    case 101:
      return { engineLevel: 9, colorTrackerTier: 1 };
    case 102:
      return { engineLevel: 9, colorTrackerTier: 2 };
    case 103:
      return { engineLevel: 9, colorTrackerTier: 3 };
    case 9:
      return { engineLevel: 9, colorTrackerTier: 1 };
    case 11:
      return { engineLevel: 10, goalkeeperTier: 2 };
    case 10:
      return { engineLevel: 10, goalkeeperTier: 2 };
    default: {
      const remapped = LEGACY_REACT_TRAIN_LEVEL_REMAP[level];
      if (remapped != null) return { engineLevel: remapped };
      return { engineLevel: level };
    }
  }
}

/** 구 티어 전용 카탈로그 id → 기본 카탈로그 id */
export function catalogReactTrainUiLevel(level: number): number {
  return resolveReactTrainUiLevel(level).engineLevel;
}

export function isModifiedQuadrantLevel(level: number): boolean {
  // 10 = 레거시 4단계 → UI·신호는 3단계(level 9)와 동일 취급
  return level >= 7 && level <= 10;
}

export function isFront3PanelLevel(level: number): boolean {
  return level === 5 || level === 6;
}

/** basic 엔진 level → 카탈로그 대표 id (변형사분할=7) */
export function catalogBasicUiLevel(level: number): number {
  if (isModifiedQuadrantLevel(level)) return 7;
  return level;
}

export function modifiedQuadrantStage(level: number): 1 | 2 | 3 {
  if (level === 8) return 2;
  if (level === 9 || level === 10) return 3;
  return 1;
}

export function modifiedQuadrantLevelFromStage(stage: 1 | 2 | 3): number {
  return ([7, 8, 9] as const)[stage - 1]!;
}

export function isColorSequenceLevel(level: number): boolean {
  return level === 1 || level === 2 || level === 3 || level === 6;
}

export function isColorNumberLevel(level: number): boolean {
  return level === 4 || level === 5;
}

/** spatial 엔진 level 7 — 순간 기억(색 기억 그리드) */
export function isInstantMemoryLevel(level: number): boolean {
  return level === 7;
}

/** stroop 4단계 하위 옵션 — 기본(단어+배경) / 누락 색상 */
export type StroopWordMode = 'bg' | 'missing';

export function normalizeStroopWordMode(
  level: number,
  wordMode?: StroopWordMode | null,
): StroopWordMode {
  if (level === 5) return 'missing';
  return wordMode === 'missing' ? 'missing' : 'bg';
}

/** stroop 카탈로그 대표 id (레거시 5 → 4) */
export function catalogStroopUiLevel(level: number): number {
  return level === 5 ? 4 : level;
}

/** spatial 엔진 level → 카탈로그 대표 id (순서 기억=1, 랜덤 기억=2, 순간 기억=7) */
export function catalogSpatialUiLevel(level: number): number {
  if (isColorSequenceLevel(level)) return 1;
  if (isColorNumberLevel(level)) return 2;
  if (isInstantMemoryLevel(level)) return 7;
  return level;
}

export type ColorSequenceOption = 3 | 5 | 'ramp' | 'custom10';

export function colorSequenceOption(level: number): ColorSequenceOption {
  if (level === 2) return 5;
  if (level === 3) return 'ramp';
  if (level === 6) return 'custom10';
  return 3;
}

/** 순서 기억 「어려움」: 5라운드 · 항 수 3→7 점증 */
export const COLOR_SEQUENCE_RAMP_LENGTHS = [3, 4, 5, 6, 7] as const;
export const COLOR_SEQUENCE_RAMP_ROUNDS = COLOR_SEQUENCE_RAMP_LENGTHS.length;

export function colorSequenceLevelFromOption(option: ColorSequenceOption): number {
  if (option === 5) return 2;
  if (option === 'ramp') return 3;
  if (option === 'custom10') return 6;
  return 1;
}

/** @deprecated colorSequenceOption 사용 — 레거시 10은 ramp와 동일 취급 */
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
  if (mode === 'stroop' && level === 5) {
    // 레거시 5단계 → 4단계 + 누락 모드
    return { engineMode: 'stroop', engineLevel: 4 };
  }
  if (mode === 'flanker' && level === 1) {
    return { engineMode: 'flanker', engineLevel: 5 };
  }
  if (mode === 'reactTrain') {
    const resolved = resolveReactTrainUiLevel(level);
    return { engineMode: resolved.engineMode ?? 'reactTrain', engineLevel: resolved.engineLevel };
  }
  return { engineMode: mode, engineLevel: level };
}

export function normalizeLegacyTrainingMode(mode: string | undefined, level: number): { mode: string; level: number } {
  if (!mode) return { mode: 'basic', level: 1 };
  // 구 시지각 반응 · 색 기억 그리드(12) → 순차 기억 · 순간 기억(7)
  if (mode === 'reactTrain' && level === 12) return { mode: 'spatial', level: 7 };
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

/**
 * 카탈로그 대표 id뿐 아니라 엔진 서브레벨도 허용한다.
 * basic: 변형사분할 8·9(·레거시10), 랜덤분할 서로다른색 6
 * spatial: 색순서 2·3·6, 색·번호 4·5, 순간 기억 7
 */
export function isKnownTrainingLevel(mode: string, level: number): boolean {
  const modeDef = MODES[mode];
  if (!modeDef) return false;
  if (modeDef.levels.some((lv) => lv.id === level)) return true;
  if (mode === 'basic') {
    return isModifiedQuadrantLevel(level) || isFront3PanelLevel(level) || (level >= 1 && level <= 10);
  }
  if (mode === 'stroop') {
    // 1~4 + 레거시 5(누락 → 4단계 옵션)
    return level >= 1 && level <= 5;
  }
  if (mode === 'flanker') {
    // 1~5 + 레거시 6(극단 크기)
    return level >= 1 && level <= 6;
  }
  if (mode === 'spatial') {
    return isColorSequenceLevel(level) || isColorNumberLevel(level) || isInstantMemoryLevel(level);
  }
  if (mode === 'reactTrain') {
    if (level >= 1 && level <= 10) return true;
    // 구 딥링크·티어 전용 id
    return level === 11 || level === 41 || level === 71
      || level === 91 || level === 92 || level === 93
      || level === 101 || level === 102 || level === 103;
  }
  return false;
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
