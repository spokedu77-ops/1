/**
 * SPOMOVE Public 72 사용자 노출 네이밍 SSOT.
 * Preset title / engine / catalog order 를 덮어쓰지 않는다.
 */

export type SpomovePublicNamingStatus = 'applied' | 'runtime-deferred' | 'name-hold';

export type SpomovePublicNaming = {
  root: string;
  variant?: string;
  status: SpomovePublicNamingStatus;
  note?: string;
};

export const SPOMOVE_PUBLIC_NAMING_BY_ID: Record<string, SpomovePublicNaming> = {
  'reaction-cognition-space-direction-01': { root: '방향 따라가기', variant: '화살표', status: 'applied' },
  'reaction-cognition-space-direction-color-01b': {
    root: '방향 따라가기',
    variant: '색상 화살표',
    status: 'applied',
  },

  'reaction-cognition-quad-color-02': { root: '목표 찾아가기', variant: '색상', status: 'applied' },
  'reaction-cognition-quad-fruit-10': { root: '목표 찾아가기', variant: '과일', status: 'applied' },
  'reaction-cognition-l2-animal-exp': { root: '목표 찾아가기', variant: '동물', status: 'applied' },
  'reaction-cognition-l2-food-exp': { root: '목표 찾아가기', variant: '음식', status: 'applied' },
  'reaction-cognition-l2-nature-exp': { root: '목표 찾아가기', variant: '자연', status: 'applied' },
  'reaction-cognition-l2-vehicle-exp': { root: '목표 찾아가기', variant: '탈 것', status: 'applied' },
  'reaction-cognition-l2-mix-exp': { root: '목표 찾아가기', variant: '믹스', status: 'applied' },

  'reaction-cognition-full-color-03': { root: '한눈에 고르기', variant: '색상', status: 'applied' },
  'reaction-cognition-l3-fruit-exp': { root: '한눈에 고르기', variant: '과일', status: 'applied' },
  'reaction-cognition-full-animal-18': { root: '한눈에 고르기', variant: '동물', status: 'applied' },
  'reaction-cognition-l3-food-exp': { root: '한눈에 고르기', variant: '음식', status: 'applied' },
  'reaction-cognition-full-nature-19': { root: '한눈에 고르기', variant: '자연', status: 'applied' },
  'reaction-cognition-l3-vehicle-exp': { root: '한눈에 고르기', variant: '탈 것', status: 'applied' },
  'reaction-cognition-l3-mix-exp': { root: '한눈에 고르기', variant: '믹스', status: 'applied' },

  'reaction-cognition-split-color-04': { root: '양쪽 보고 고르기', variant: '색상', status: 'applied' },
  'reaction-cognition-l4-fruit-exp': { root: '양쪽 보고 고르기', variant: '과일', status: 'applied' },
  'reaction-cognition-l4-animal-exp': { root: '양쪽 보고 고르기', variant: '동물', status: 'applied' },
  'reaction-cognition-l4-food-exp': { root: '양쪽 보고 고르기', variant: '음식', status: 'applied' },
  'reaction-cognition-l4-nature-exp': { root: '양쪽 보고 고르기', variant: '자연', status: 'applied' },
  'reaction-cognition-l4-vehicle-exp': { root: '양쪽 보고 고르기', variant: '탈 것', status: 'applied' },
  'reaction-cognition-l4-mix-exp': { root: '양쪽 보고 고르기', variant: '믹스', status: 'applied' },

  'visual-reaction-flash-33': { root: '풍선 터뜨리기', status: 'applied' },
  'visual-reaction-rush-39': { root: '파도 피하기', status: 'applied' },
  'visual-reaction-flow-2x-31': { root: '벽돌 따라 밟기', status: 'applied' },
  'visual-reaction-mole-l1': { root: '두더지 잡기', variant: '쉬움', status: 'applied' },
  'visual-reaction-mole-normal-skeleton': { root: '두더지 잡기', variant: '보통', status: 'applied' },
  'visual-reaction-goalkeeper-easy-skeleton': { root: '골키퍼', variant: '쉬움', status: 'applied' },
  'visual-reaction-goalkeeper-42': { root: '골키퍼', variant: '보통', status: 'applied' },
  'visual-reaction-hand-foot-easy-skeleton': { root: '손발 맞춰 올리기', variant: '쉬움', status: 'applied' },
  'visual-reaction-hand-foot-normal-skeleton': { root: '손발 맞춰 올리기', variant: '보통', status: 'applied' },
  'visual-reaction-hand-foot-hard-skeleton': { root: '손발 맞춰 올리기', variant: '어려움', status: 'applied' },

  'simon-pole-arrows-41': { root: '화살표 따라가기', variant: '보통', status: 'applied' },
  'simon-arrow-hard-skeleton': { root: '화살표 따라가기', variant: '어려움', status: 'applied' },
  'simon-pole-shape-06': { root: '도형 색 따라가기', variant: '보통', status: 'applied' },
  'simon-shape-hard-skeleton': { root: '도형 색 따라가기', variant: '어려움', status: 'applied' },
  'simon-balloon-flash-05': { root: '풍선 색 따라가기', variant: '보통', status: 'applied' },
  'simon-balloon-hard-skeleton': { root: '풍선 색 따라가기', variant: '어려움', status: 'applied' },
  'simon-mixed-gallery-exp': { root: '그림 색 따라가기', variant: '보통', status: 'applied' },
  'simon-random-hard-skeleton': { root: '그림 색 따라가기', variant: '어려움', status: 'applied' },
  'simon-camouflage-center-skeleton': { root: '숨은 색 찾아가기', variant: '보통', status: 'applied' },
  'visual-reaction-blackout-37': { root: '숨은 색 찾아가기', variant: '어려움', status: 'applied' },

  'flanker-uniform-07': { root: '가운데 방향 따라가기', variant: '보통 · 좌우', status: 'applied' },
  'flanker-arrow-udlr-exp': { root: '가운데 방향 따라가기', variant: '어려움 · 상하좌우', status: 'applied' },
  'flanker-theme-color-skeleton': { root: '가운데 색 따라가기', variant: '색상', status: 'applied' },
  'flanker-theme-06': { root: '가운데 색 따라가기', variant: '과일', status: 'applied' },
  'flanker-theme-animal-skeleton': { root: '가운데 색 따라가기', variant: '동물', status: 'applied' },
  'flanker-theme-food-skeleton': { root: '가운데 색 따라가기', variant: '음식', status: 'applied' },
  'flanker-theme-nature-skeleton': { root: '가운데 색 따라가기', variant: '자연', status: 'applied' },
  'flanker-theme-vehicle-skeleton': { root: '가운데 색 따라가기', variant: '탈 것', status: 'applied' },
  'flanker-theme-mix-skeleton': { root: '가운데 색 따라가기', variant: '믹스', status: 'applied' },
  'flanker-nested-circles-04': { root: '가운데 목표 따라가기', variant: '색상', status: 'applied' },
  'flanker-random-43': { root: '가운데 목표 따라가기', variant: '과일', status: 'applied' },
  'flanker-5circle-46': { root: '가운데 목표 따라가기', variant: '동물', status: 'applied' },
  'flanker-arrow-05': { root: '가운데 목표 따라가기', variant: '음식', status: 'applied' },
  'flanker-uniform-number-exp': { root: '가운데 목표 따라가기', variant: '자연', status: 'applied' },
  'flanker-random-number-exp': { root: '가운데 목표 따라가기', variant: '탈 것', status: 'applied' },
  'flanker-5circle-number-exp': { root: '가운데 목표 따라가기', variant: '믹스', status: 'applied' },
  'flanker-extreme-arrow-hard-skeleton': {
    root: '가운데 목표 따라가기',
    variant: '화살표 · 어려움',
    status: 'applied',
  },

  'stroop-arrow-reverse-08': {
    root: '화살표 규칙 바꿔가기',
    status: 'runtime-deferred',
    note: '2A Public 교체 후 적용. 현재 UI에 신규 이름 노출 금지.',
  },
  'stroop-arrow-bg-47': {
    root: '단어 규칙 바꿔가기',
    variant: '그대로',
    status: 'runtime-deferred',
    note: '2B Public 교체 후 적용. 현재 UI에 신규 이름/Variant 노출 금지.',
  },
  'stroop-word-reverse-48': {
    root: '단어 규칙 바꿔가기',
    variant: '반대로',
    status: 'runtime-deferred',
    note: '2B Public 교체 후 적용. 현재 UI에 신규 이름/Variant 노출 금지.',
  },
  'stroop-word-bg-49': { root: '글자색 찾아가기', status: 'applied' },

  'sequential-memory-3color-09': { root: '색 순서 기억하기', variant: '3개', status: 'applied' },
  'sequential-memory-5color-51': { root: '색 순서 기억하기', variant: '5개', status: 'applied' },
  'sequential-memory-10color-52': { root: '색 순서 기억하기', variant: '점점 늘리기', status: 'applied' },
  'sequential-memory-custom-10color-exp': { root: '한눈에 기억하기', variant: '4×4', status: 'applied' },
  'sequential-memory-color-number-exp': {
    root: '번호 색 기억하기',
    variant: '퀴즈',
    status: 'applied',
    note: 'Public Runtime은 기존 verbal Q&A. Variant에 SPOMAT 이동 문구 금지.',
  },
  'sequential-memory-full-reveal-54': {
    root: '',
    status: 'name-hold',
    note: 'Runtime/CMS 정합성 수정 전까지 기존 노출명 유지.',
  },

  'dive-standard': { root: '액션 무브', status: 'applied' },
  'dive-color-gate-61': { root: '모션 게이트', status: 'applied' },
};

export function getSpomovePublicNaming(presetId: string): SpomovePublicNaming | undefined {
  return SPOMOVE_PUBLIC_NAMING_BY_ID[presetId];
}

export function getAppliedSpomovePublicNaming(presetId: string): SpomovePublicNaming | undefined {
  const naming = SPOMOVE_PUBLIC_NAMING_BY_ID[presetId];
  if (!naming || naming.status !== 'applied') return undefined;
  return naming;
}

export function composeOfficialDisplayTitle(root: string, variant?: string): string {
  const trimmedRoot = root.trim();
  const trimmedVariant = variant?.trim();
  if (!trimmedVariant) return trimmedRoot;
  return `${trimmedRoot} · ${trimmedVariant}`;
}
