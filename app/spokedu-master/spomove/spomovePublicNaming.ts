/**
 * SPOMOVE Public 72 사용자 노출 네이밍 SSOT.
 * Preset title / engine / catalog order 를 덮어쓰지 않는다.
 */

export type SpomovePublicNamingStatus = 'applied' | 'runtime-deferred' | 'name-hold';

export type SpomovePublicNaming = {
  root: string;
  variant?: string;
  cardCore: string;
  status: SpomovePublicNamingStatus;
  note?: string;
};

export type SpomovePublicCardMeta = {
  core: string;
  variant?: string;
  difficulty: string;
};

const CORE = {
  direction: '방향 반응',
  quad: '4분할',
  full: '전면',
  split: '2분할',
  visual: '시각 반응',
  simon: '사이먼 이펙트',
  flanker: '플랭커 이펙트',
  stroop: '스트룹 이펙트',
  sequence: '순서 기억',
  instant: '순간 기억',
  associate: '연합 기억',
  memoryTask: '기억 과제',
  dive: 'DIVE',
} as const;

function entry(
  root: string,
  cardCore: string,
  status: SpomovePublicNamingStatus,
  extra?: Pick<SpomovePublicNaming, 'variant' | 'note'>,
): SpomovePublicNaming {
  return { root, cardCore, status, ...extra };
}

export const SPOMOVE_PUBLIC_NAMING_BY_ID: Record<string, SpomovePublicNaming> = {
  'reaction-cognition-space-direction-01': entry('방향 따라가기', CORE.direction, 'applied', { variant: '화살표' }),
  'reaction-cognition-space-direction-color-01b': entry('방향 따라가기', CORE.direction, 'applied', {
    variant: '색상 화살표',
  }),

  'reaction-cognition-quad-color-02': entry('목표 찾아가기', CORE.quad, 'applied', { variant: '색상' }),
  'reaction-cognition-quad-fruit-10': entry('목표 찾아가기', CORE.quad, 'applied', { variant: '과일' }),
  'reaction-cognition-l2-animal-exp': entry('목표 찾아가기', CORE.quad, 'applied', { variant: '동물' }),
  'reaction-cognition-l2-food-exp': entry('목표 찾아가기', CORE.quad, 'applied', { variant: '음식' }),
  'reaction-cognition-l2-nature-exp': entry('목표 찾아가기', CORE.quad, 'applied', { variant: '자연' }),
  'reaction-cognition-l2-vehicle-exp': entry('목표 찾아가기', CORE.quad, 'applied', { variant: '탈 것' }),
  'reaction-cognition-l2-mix-exp': entry('목표 찾아가기', CORE.quad, 'applied', { variant: '믹스' }),

  'reaction-cognition-full-color-03': entry('한눈에 고르기', CORE.full, 'applied', { variant: '색상' }),
  'reaction-cognition-l3-fruit-exp': entry('한눈에 고르기', CORE.full, 'applied', { variant: '과일' }),
  'reaction-cognition-full-animal-18': entry('한눈에 고르기', CORE.full, 'applied', { variant: '동물' }),
  'reaction-cognition-l3-food-exp': entry('한눈에 고르기', CORE.full, 'applied', { variant: '음식' }),
  'reaction-cognition-full-nature-19': entry('한눈에 고르기', CORE.full, 'applied', { variant: '자연' }),
  'reaction-cognition-l3-vehicle-exp': entry('한눈에 고르기', CORE.full, 'applied', { variant: '탈 것' }),
  'reaction-cognition-l3-mix-exp': entry('한눈에 고르기', CORE.full, 'applied', { variant: '믹스' }),

  'reaction-cognition-split-color-04': entry('양쪽 보고 고르기', CORE.split, 'applied', { variant: '색상' }),
  'reaction-cognition-l4-fruit-exp': entry('양쪽 보고 고르기', CORE.split, 'applied', { variant: '과일' }),
  'reaction-cognition-l4-animal-exp': entry('양쪽 보고 고르기', CORE.split, 'applied', { variant: '동물' }),
  'reaction-cognition-l4-food-exp': entry('양쪽 보고 고르기', CORE.split, 'applied', { variant: '음식' }),
  'reaction-cognition-l4-nature-exp': entry('양쪽 보고 고르기', CORE.split, 'applied', { variant: '자연' }),
  'reaction-cognition-l4-vehicle-exp': entry('양쪽 보고 고르기', CORE.split, 'applied', { variant: '탈 것' }),
  'reaction-cognition-l4-mix-exp': entry('양쪽 보고 고르기', CORE.split, 'applied', { variant: '믹스' }),

  'visual-reaction-flash-33': entry('풍선 터뜨리기', CORE.visual, 'applied'),
  'visual-reaction-rush-39': entry('파도 피하기', CORE.visual, 'applied'),
  'visual-reaction-flow-2x-31': entry('벽돌 따라 밟기', CORE.visual, 'applied'),
  'visual-reaction-mole-l1': entry('두더지 잡기', CORE.visual, 'applied'),
  'visual-reaction-mole-normal-skeleton': entry('두더지 잡기', CORE.visual, 'applied'),
  'visual-reaction-goalkeeper-easy-skeleton': entry('골키퍼', CORE.visual, 'applied'),
  'visual-reaction-goalkeeper-42': entry('골키퍼', CORE.visual, 'applied'),
  'visual-reaction-hand-foot-easy-skeleton': entry('손발 맞춰 올리기', CORE.visual, 'applied'),
  'visual-reaction-hand-foot-normal-skeleton': entry('손발 맞춰 올리기', CORE.visual, 'applied'),
  'visual-reaction-hand-foot-hard-skeleton': entry('손발 맞춰 올리기', CORE.visual, 'applied'),

  'simon-pole-arrows-41': entry('화살표 따라가기', CORE.simon, 'applied'),
  'simon-arrow-hard-skeleton': entry('화살표 따라가기', CORE.simon, 'applied'),
  'simon-pole-shape-06': entry('도형 색 따라가기', CORE.simon, 'applied'),
  'simon-shape-hard-skeleton': entry('도형 색 따라가기', CORE.simon, 'applied'),
  'simon-balloon-flash-05': entry('풍선 색 따라가기', CORE.simon, 'applied'),
  'simon-balloon-hard-skeleton': entry('풍선 색 따라가기', CORE.simon, 'applied'),
  'simon-mixed-gallery-exp': entry('그림 색 따라가기', CORE.simon, 'applied'),
  'simon-random-hard-skeleton': entry('그림 색 따라가기', CORE.simon, 'applied'),
  'simon-camouflage-center-skeleton': entry('숨은 색 찾아가기', CORE.simon, 'applied'),
  'visual-reaction-blackout-37': entry('숨은 색 찾아가기', CORE.simon, 'applied'),

  'flanker-uniform-07': entry('가운데 방향 따라가기', CORE.flanker, 'applied', { variant: '좌우' }),
  'flanker-arrow-udlr-exp': entry('가운데 방향 따라가기', CORE.flanker, 'applied', { variant: '상하좌우' }),
  'flanker-theme-color-skeleton': entry('가운데 색 따라가기', CORE.flanker, 'applied', { variant: '색상' }),
  'flanker-theme-06': entry('가운데 색 따라가기', CORE.flanker, 'applied', { variant: '과일' }),
  'flanker-theme-animal-skeleton': entry('가운데 색 따라가기', CORE.flanker, 'applied', { variant: '동물' }),
  'flanker-theme-food-skeleton': entry('가운데 색 따라가기', CORE.flanker, 'applied', { variant: '음식' }),
  'flanker-theme-nature-skeleton': entry('가운데 색 따라가기', CORE.flanker, 'applied', { variant: '자연' }),
  'flanker-theme-vehicle-skeleton': entry('가운데 색 따라가기', CORE.flanker, 'applied', { variant: '탈 것' }),
  'flanker-theme-mix-skeleton': entry('가운데 색 따라가기', CORE.flanker, 'applied', { variant: '믹스' }),
  'flanker-nested-circles-04': entry('가운데 목표 따라가기', CORE.flanker, 'applied', { variant: '색상' }),
  'flanker-random-43': entry('가운데 목표 따라가기', CORE.flanker, 'applied', { variant: '과일' }),
  'flanker-5circle-46': entry('가운데 목표 따라가기', CORE.flanker, 'applied', { variant: '동물' }),
  'flanker-arrow-05': entry('가운데 목표 따라가기', CORE.flanker, 'applied', { variant: '음식' }),
  'flanker-uniform-number-exp': entry('가운데 목표 따라가기', CORE.flanker, 'applied', { variant: '자연' }),
  'flanker-random-number-exp': entry('가운데 목표 따라가기', CORE.flanker, 'applied', { variant: '탈 것' }),
  'flanker-5circle-number-exp': entry('가운데 목표 따라가기', CORE.flanker, 'applied', { variant: '믹스' }),
  'flanker-extreme-arrow-hard-skeleton': entry('가운데 목표 따라가기', CORE.flanker, 'applied', { variant: '화살표' }),

  'stroop-arrow-reverse-08': entry('화살표 규칙 바꿔가기', CORE.stroop, 'runtime-deferred', {
    note: '2A Public 교체 후 적용. 현재 UI에 신규 이름 노출 금지.',
  }),
  'stroop-arrow-bg-47': entry('단어 규칙 바꿔가기', CORE.stroop, 'runtime-deferred', {
    variant: '그대로',
    note: '2B Public 교체 후 적용. 현재 UI에 신규 이름/Variant 노출 금지.',
  }),
  'stroop-word-reverse-48': entry('단어 규칙 바꿔가기', CORE.stroop, 'runtime-deferred', {
    variant: '반대로',
    note: '2B Public 교체 후 적용. 현재 UI에 신규 이름/Variant 노출 금지.',
  }),
  'stroop-word-bg-49': entry('글자색 찾아가기', CORE.stroop, 'applied'),

  'sequential-memory-3color-09': entry('색 순서 기억하기', CORE.sequence, 'applied', { variant: '3개' }),
  'sequential-memory-5color-51': entry('색 순서 기억하기', CORE.sequence, 'applied', { variant: '5개' }),
  'sequential-memory-10color-52': entry('색 순서 기억하기', CORE.sequence, 'applied', { variant: '점점 늘리기' }),
  'sequential-memory-custom-10color-exp': entry('한눈에 기억하기', CORE.instant, 'applied', { variant: '4×4' }),
  'sequential-memory-color-number-exp': entry('번호 색 기억하기', CORE.associate, 'applied', {
    variant: '퀴즈',
    note: 'Public Runtime은 기존 verbal Q&A. Variant에 SPOMAT 이동 문구 금지.',
  }),
  'sequential-memory-full-reveal-54': entry('', CORE.memoryTask, 'name-hold', {
    note: 'Runtime/CMS 정합성 수정 전까지 기존 노출명 유지. cardCore·difficulty는 표시.',
  }),

  'dive-standard': entry('액션 무브', CORE.dive, 'applied'),
  'dive-color-gate-61': entry('모션 게이트', CORE.dive, 'applied'),
};

export function getSpomovePublicNaming(presetId: string): SpomovePublicNaming | undefined {
  return SPOMOVE_PUBLIC_NAMING_BY_ID[presetId];
}

export function getAppliedSpomovePublicNaming(presetId: string): SpomovePublicNaming | undefined {
  const naming = SPOMOVE_PUBLIC_NAMING_BY_ID[presetId];
  if (!naming || naming.status !== 'applied') return undefined;
  return naming;
}

export function getPublicCardVariant(naming: SpomovePublicNaming | undefined): string {
  if (!naming || naming.status !== 'applied') return '';
  return naming.variant?.trim() ?? '';
}

export function composeOfficialDisplayTitle(root: string, variant?: string): string {
  const trimmedRoot = root.trim();
  const trimmedVariant = variant?.trim();
  if (!trimmedVariant) return trimmedRoot;
  return `${trimmedRoot} · ${trimmedVariant}`;
}

export function composeSpomovePublicCardMetaParts(meta: SpomovePublicCardMeta): string[] {
  return [meta.core, meta.variant, meta.difficulty]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
}
