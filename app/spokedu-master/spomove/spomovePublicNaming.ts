/**
 * SPOMOVE Public 72 사용자 노출 카드 제목 SSOT.
 * Preset title / engine / catalog order 를 덮어쓰지 않는다.
 */

export type SpomovePublicNamingStatus = 'applied' | 'runtime-deferred' | 'name-hold';

export type SpomovePublicNaming = {
  cardTitle: string;
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
  cardTitle: string,
  cardCore: string,
  status: SpomovePublicNamingStatus,
  extra?: Pick<SpomovePublicNaming, 'variant' | 'note'>,
): SpomovePublicNaming {
  return { cardTitle, cardCore, status, ...extra };
}

export const SPOMOVE_PUBLIC_NAMING_BY_ID: Record<string, SpomovePublicNaming> = {
  'reaction-cognition-space-direction-01': entry('화살표 방향 따라가기', CORE.direction, 'applied', { variant: '화살표' }),
  'reaction-cognition-space-direction-color-01b': entry('색깔 화살표 따라가기', CORE.direction, 'applied', {
    variant: '색상 화살표',
  }),

  'reaction-cognition-quad-color-02': entry('네 칸 색 따라가기', CORE.quad, 'applied', { variant: '색상' }),
  'reaction-cognition-quad-fruit-10': entry('네 칸 과일 색 따라가기', CORE.quad, 'applied', { variant: '과일' }),
  'reaction-cognition-l2-animal-exp': entry('네 칸 동물 색 따라가기', CORE.quad, 'applied', { variant: '동물' }),
  'reaction-cognition-l2-food-exp': entry('네 칸 음식 색 따라가기', CORE.quad, 'applied', { variant: '음식' }),
  'reaction-cognition-l2-nature-exp': entry('네 칸 자연 색 따라가기', CORE.quad, 'applied', { variant: '자연' }),
  'reaction-cognition-l2-vehicle-exp': entry('네 칸 탈것 색 따라가기', CORE.quad, 'applied', { variant: '탈 것' }),
  'reaction-cognition-l2-mix-exp': entry('네 칸 믹스 색 따라가기', CORE.quad, 'applied', { variant: '믹스' }),

  'reaction-cognition-full-color-03': entry('화면 가득 색 따라가기', CORE.full, 'applied', { variant: '색상' }),
  'reaction-cognition-l3-fruit-exp': entry('화면 가득 과일 색 따라가기', CORE.full, 'applied', { variant: '과일' }),
  'reaction-cognition-full-animal-18': entry('화면 가득 동물 색 따라가기', CORE.full, 'applied', { variant: '동물' }),
  'reaction-cognition-l3-food-exp': entry('화면 가득 음식 색 따라가기', CORE.full, 'applied', { variant: '음식' }),
  'reaction-cognition-full-nature-19': entry('화면 가득 자연 색 따라가기', CORE.full, 'applied', { variant: '자연' }),
  'reaction-cognition-l3-vehicle-exp': entry('화면 가득 탈것 색 따라가기', CORE.full, 'applied', { variant: '탈 것' }),
  'reaction-cognition-l3-mix-exp': entry('화면 가득 믹스 색 따라가기', CORE.full, 'applied', { variant: '믹스' }),

  'reaction-cognition-split-color-04': entry('양쪽 색 따라가기', CORE.split, 'applied', { variant: '색상' }),
  'reaction-cognition-l4-fruit-exp': entry('양쪽 과일 색 따라가기', CORE.split, 'applied', { variant: '과일' }),
  'reaction-cognition-l4-animal-exp': entry('양쪽 동물 색 따라가기', CORE.split, 'applied', { variant: '동물' }),
  'reaction-cognition-l4-food-exp': entry('양쪽 음식 색 따라가기', CORE.split, 'applied', { variant: '음식' }),
  'reaction-cognition-l4-nature-exp': entry('양쪽 자연 색 따라가기', CORE.split, 'applied', { variant: '자연' }),
  'reaction-cognition-l4-vehicle-exp': entry('양쪽 탈것 색 따라가기', CORE.split, 'applied', { variant: '탈 것' }),
  'reaction-cognition-l4-mix-exp': entry('양쪽 믹스 색 따라가기', CORE.split, 'applied', { variant: '믹스' }),

  'visual-reaction-flash-33': entry('풍선 터뜨리기', CORE.visual, 'applied'),
  'visual-reaction-rush-39': entry('파도 피하기', CORE.visual, 'applied'),
  'visual-reaction-flow-2x-31': entry('벽돌 따라 밟기', CORE.visual, 'applied'),
  'visual-reaction-mole-l1': entry('두더지 잡기', CORE.visual, 'applied'),
  'visual-reaction-mole-normal-skeleton': entry('두더지 잡기', CORE.visual, 'applied'),
  'visual-reaction-goalkeeper-easy-skeleton': entry('골키퍼 막기', CORE.visual, 'applied'),
  'visual-reaction-goalkeeper-42': entry('골키퍼 막기', CORE.visual, 'applied'),
  'visual-reaction-hand-foot-easy-skeleton': entry('발 맞춰 움직이기', CORE.visual, 'applied'),
  'visual-reaction-hand-foot-normal-skeleton': entry('손발 나눠 움직이기', CORE.visual, 'applied'),
  'visual-reaction-hand-foot-hard-skeleton': entry('손발 동시 움직이기', CORE.visual, 'applied'),

  'simon-pole-arrows-41': entry('화살표 방향 따라가기', CORE.simon, 'applied'),
  'simon-arrow-hard-skeleton': entry('두 화살표 방향 따라가기', CORE.simon, 'applied'),
  'simon-pole-shape-06': entry('도형 색 따라가기', CORE.simon, 'applied'),
  'simon-shape-hard-skeleton': entry('두 도형 색 따라가기', CORE.simon, 'applied'),
  'simon-balloon-flash-05': entry('풍선 색 따라가기', CORE.simon, 'applied'),
  'simon-balloon-hard-skeleton': entry('두 풍선 색 따라가기', CORE.simon, 'applied'),
  'simon-mixed-gallery-exp': entry('그림 색 따라가기', CORE.simon, 'applied'),
  'simon-random-hard-skeleton': entry('두 그림 색 따라가기', CORE.simon, 'applied'),
  'simon-camouflage-center-skeleton': entry('가운데 숨은 색 찾아가기', CORE.simon, 'runtime-deferred', {
    note: '현재 UI에 신규 제목 노출 금지.',
  }),
  'visual-reaction-blackout-37': entry('가장자리 숨은 색 찾아가기', CORE.simon, 'applied'),

  'flanker-uniform-07': entry('가운데 좌우 화살표 따라가기', CORE.flanker, 'applied', { variant: '좌우' }),
  'flanker-arrow-udlr-exp': entry('가운데 사방 화살표 따라가기', CORE.flanker, 'applied', { variant: '상하좌우' }),
  'flanker-theme-color-skeleton': entry('가운데 색 따라가기', CORE.flanker, 'applied', { variant: '색상' }),
  'flanker-theme-06': entry('가운데 과일 색 따라가기', CORE.flanker, 'applied', { variant: '과일' }),
  'flanker-theme-animal-skeleton': entry('가운데 동물 색 따라가기', CORE.flanker, 'applied', { variant: '동물' }),
  'flanker-theme-food-skeleton': entry('가운데 음식 색 따라가기', CORE.flanker, 'applied', { variant: '음식' }),
  'flanker-theme-nature-skeleton': entry('가운데 자연 색 따라가기', CORE.flanker, 'applied', { variant: '자연' }),
  'flanker-theme-vehicle-skeleton': entry('가운데 탈것 색 따라가기', CORE.flanker, 'applied', { variant: '탈 것' }),
  'flanker-theme-mix-skeleton': entry('가운데 믹스 색 따라가기', CORE.flanker, 'applied', { variant: '믹스' }),
  'flanker-nested-circles-04': entry('크기 다른 색 따라가기', CORE.flanker, 'applied', { variant: '색상' }),
  'flanker-random-43': entry('크기 다른 과일 색 따라가기', CORE.flanker, 'applied', { variant: '과일' }),
  'flanker-5circle-46': entry('크기 다른 동물 색 따라가기', CORE.flanker, 'applied', { variant: '동물' }),
  'flanker-arrow-05': entry('크기 다른 음식 색 따라가기', CORE.flanker, 'applied', { variant: '음식' }),
  'flanker-uniform-number-exp': entry('크기 다른 자연 색 따라가기', CORE.flanker, 'applied', { variant: '자연' }),
  'flanker-random-number-exp': entry('크기 다른 탈것 색 따라가기', CORE.flanker, 'applied', { variant: '탈 것' }),
  'flanker-5circle-number-exp': entry('크기 다른 믹스 색 따라가기', CORE.flanker, 'applied', { variant: '믹스' }),
  'flanker-extreme-arrow-hard-skeleton': entry('크기 다른 화살표 따라가기', CORE.flanker, 'applied', { variant: '화살표' }),

  'stroop-arrow-reverse-08': entry('화살표 방향·색 따라가기', CORE.stroop, 'runtime-deferred', {
    note: '현재 UI에 신규 제목 노출 금지.',
  }),
  'stroop-arrow-bg-47': entry('색 이름·글자색 따라가기', CORE.stroop, 'runtime-deferred', {
    variant: '그대로',
    note: '현재 UI에 신규 제목/Variant 노출 금지.',
  }),
  'stroop-word-reverse-48': entry('반대로 색 이름·글자색 따라가기', CORE.stroop, 'runtime-deferred', {
    variant: '반대로',
    note: '현재 UI에 신규 제목/Variant 노출 금지.',
  }),
  'stroop-word-bg-49': entry('글자색 찾아가기', CORE.stroop, 'applied'),

  'sequential-memory-3color-09': entry('세 가지 색 순서 기억하기', CORE.sequence, 'applied', { variant: '3개' }),
  'sequential-memory-5color-51': entry('다섯 가지 색 순서 기억하기', CORE.sequence, 'applied', { variant: '5개' }),
  'sequential-memory-10color-52': entry('늘어나는 색 순서 기억하기', CORE.sequence, 'applied', { variant: '점점 늘리기' }),
  'sequential-memory-custom-10color-exp': entry('한눈에 색 배치 기억하기', CORE.instant, 'applied', { variant: '4×4' }),
  'sequential-memory-color-number-exp': entry('색깔과 번호 기억하기', CORE.associate, 'applied', {
    variant: '퀴즈',
    note: 'Public Runtime은 기존 verbal Q&A. Variant에 SPOMAT 이동 문구 금지.',
  }),
  'sequential-memory-full-reveal-54': entry('순간 기억 3X3 그리드 (원샷)', CORE.memoryTask, 'name-hold', {
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

export function resolveSpomovePublicDisplayTitle(
  presetId: string | null | undefined,
  fallbackTitle?: string | null,
): string {
  const naming = presetId ? SPOMOVE_PUBLIC_NAMING_BY_ID[presetId] : undefined;
  if (naming?.status === 'applied') return naming.cardTitle;
  return fallbackTitle?.trim() || 'SPOMOVE';
}

export function getPublicCardVariant(naming: SpomovePublicNaming | undefined): string {
  if (!naming || naming.status !== 'applied') return '';
  return naming.variant?.trim() ?? '';
}

export function composeSpomovePublicCardMetaParts(meta: SpomovePublicCardMeta): string[] {
  return [meta.core, meta.variant, meta.difficulty]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
}
