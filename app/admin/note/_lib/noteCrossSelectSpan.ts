/**
 * 교차 드래그 span — DOM 없이 검증 가능한 순수 로직.
 * Playwright 불변식과 Vitest가 같은 규칙을 공유한다.
 */

export function blocksBetween(order: string[], anchorId: string, hoverId: string): string[] {
  const anchorIdx = order.indexOf(anchorId);
  const hoverIdx = order.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) return [];
  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);
  return order.slice(lo, hi + 1);
}

/** 시각 순서 전체 행 기준 span (중간 행 누락 방지) */
export function crossDragSpanFromOrder(visualOrder: string[], anchorId: string, hoverId: string): string[] {
  return blocksBetween(visualOrder, anchorId, hoverId);
}

export type CrossSpanGapReport = {
  span: string[];
  missingFromSpan: string[];
  /** span 안 텍스트 블록 중 하이라이트가 빠진 id */
  missingHighlights: string[];
};

/**
 * 연속 드래그 불변식: span에 포함된 모든 텍스트 선택 가능 행이 highlighted 집합에 있어야 한다.
 */
export function auditCrossDragContinuity(
  visualOrder: string[],
  anchorId: string,
  hoverId: string,
  isTextSelectable: (blockId: string) => boolean,
  isHighlighted: (blockId: string) => boolean,
): CrossSpanGapReport {
  const span = crossDragSpanFromOrder(visualOrder, anchorId, hoverId);
  const missingFromSpan: string[] = [];
  const missingHighlights: string[] = [];

  const anchorIdx = visualOrder.indexOf(anchorId);
  const hoverIdx = visualOrder.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) {
    return { span: [], missingFromSpan: [], missingHighlights: [] };
  }
  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);

  for (let i = lo; i <= hi; i += 1) {
    const id = visualOrder[i];
    if (!span.includes(id)) missingFromSpan.push(id);
    if (!isTextSelectable(id)) continue;
    if (!isHighlighted(id)) missingHighlights.push(id);
  }

  return { span, missingFromSpan, missingHighlights };
}

/** 조합 스캔용 드래그 쌍 생성 (사례 나열 대신 기계적 커버) */
export function buildCrossDragPairs(selectableCount: number, options?: {
  maxPairs?: number;
  windowSizes?: number[];
}): Array<[number, number]> {
  const maxPairs = options?.maxPairs ?? 40;
  const windowSizes = options?.windowSizes ?? [3, 5, 7, 11, 15];
  if (selectableCount < 2) return [];

  const pairs: Array<[number, number]> = [];
  const seen = new Set<string>();
  const add = (a: number, b: number) => {
    if (a < 0 || b < 0 || a >= selectableCount || b >= selectableCount) return;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi - lo < 1) return;
    const key = `${lo}:${hi}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push([lo, hi]);
  };

  add(0, selectableCount - 1);
  add(selectableCount - 1, 0);

  for (const w of windowSizes) {
    if (w < 2 || w > selectableCount) continue;
    for (let i = 0; i <= selectableCount - w; i += 1) {
      add(i, i + w - 1);
    }
  }

  for (let i = 0; i < selectableCount - 1; i += 1) {
    add(i, i + 1);
    if (i + 2 < selectableCount) add(i, i + 2);
  }

  const stride = Math.max(1, Math.floor(selectableCount / 8));
  for (let i = 0; i < selectableCount; i += stride) {
    add(i, selectableCount - 1);
    add(0, i);
  }

  return pairs.slice(0, maxPairs);
}
