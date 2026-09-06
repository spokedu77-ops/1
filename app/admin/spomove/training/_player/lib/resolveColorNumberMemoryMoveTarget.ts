export const LEVEL4_TOTAL = 10;
export const LEVEL4_QA_COUNT = 5;

export const COLOR_NUMBER_MEMORY_QUESTION_GUIDANCE_VOICE =
  '학생이 먼저 말하면 정답을 확인하세요';

export const COLOR_NUMBER_MEMORY_QUESTION_GUIDANCE_MOVEMENT =
  '기억한 색 패드로 이동하세요';

export type ColorNumberMemoryMoveTarget = 'red' | 'yellow' | 'green' | 'blue';

const SPOMAT_COLOR_IDS = new Set<ColorNumberMemoryMoveTarget>([
  'red',
  'yellow',
  'green',
  'blue',
]);

/**
 * 번호-색 연합 기억의 이동 정답은 제시 순서가 아니라 기억된 색 ID다.
 * SPOMAT 4색 밖이거나 입력이 불완전하면 fallback 없이 null.
 */
export function resolveColorNumberMemoryMoveTarget(item: {
  number?: unknown;
  num?: unknown;
  color?: unknown;
} | null | undefined): ColorNumberMemoryMoveTarget | null {
  if (!item || typeof item !== 'object') return null;
  const color = item.color;
  if (color == null) return null;

  let colorId: unknown;
  if (typeof color === 'string') {
    colorId = color;
  } else if (typeof color === 'object' && color !== null && 'id' in color) {
    colorId = (color as { id: unknown }).id;
  } else {
    return null;
  }

  if (typeof colorId !== 'string') return null;
  const normalized = colorId.trim().toLowerCase();
  if (!SPOMAT_COLOR_IDS.has(normalized as ColorNumberMemoryMoveTarget)) return null;
  return normalized as ColorNumberMemoryMoveTarget;
}

/** 10개 중 5개 질문 인덱스. Fisher–Yates, 입력 만남 순서 유지. */
export function pickLevel4QaIndices(
  total = LEVEL4_TOTAL,
  qaCount = LEVEL4_QA_COUNT,
  random: () => number = Math.random,
): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const current = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = current;
  }
  return indices.slice(0, qaCount);
}
