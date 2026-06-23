/**
 * 조합 스캔용 드래그 쌍 — noteCrossSelectSpan.ts 와 동일 규칙 (Playwright용 ESM)
 */
export function buildCrossDragPairs(selectableCount, options = {}) {
  const maxPairs = options.maxPairs ?? 40;
  const windowSizes = options.windowSizes ?? [3, 5, 7, 11, 15];
  if (selectableCount < 2) return [];

  const pairs = [];
  const seen = new Set();
  const add = (a, b) => {
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

export function blocksBetween(order, anchorId, hoverId) {
  const anchorIdx = order.indexOf(anchorId);
  const hoverIdx = order.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) return [];
  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);
  return order.slice(lo, hi + 1);
}

export function auditContinuity(visualOrder, anchorId, hoverId, isTextSelectable, isHighlighted) {
  const span = blocksBetween(visualOrder, anchorId, hoverId);
  const missingHighlights = [];
  const anchorIdx = visualOrder.indexOf(anchorId);
  const hoverIdx = visualOrder.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) return { span, missingHighlights };
  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);
  for (let i = lo; i <= hi; i += 1) {
    const id = visualOrder[i];
    if (!isTextSelectable(id)) continue;
    if (!isHighlighted(id)) missingHighlights.push(id);
  }
  return { span, missingHighlights };
}
