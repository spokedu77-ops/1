/** TipTap·스토어 전용 — React blocks 재렌더 없이 patchContent로 처리 */
export const STORE_ONLY_CONTENT_KEYS = new Set([
  'text',
  'body',
  'html',
  'bodyHtml',
  'legacyText',
  'legacyBody',
]);

/** React·서버 content와 스토어(편집 중 text/html)를 병합 — title·checked 등은 React 우선 */
export function mergeBlockContentWithStore(
  base: Record<string, unknown> | null | undefined,
  fromStore: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (!fromStore) return base ?? undefined;
  if (!base) return fromStore;
  const merged = { ...base };
  for (const key of STORE_ONLY_CONTENT_KEYS) {
    if (key in fromStore) {
      merged[key] = fromStore[key];
    }
  }
  return merged;
}

function blockTextLength(content: Record<string, unknown> | null | undefined): number {
  const text = typeof content?.text === 'string' ? content.text : '';
  return text.length;
}

/** reconcile·캐시 병합 시 서버/스토어 중 더 긴 본문을 유지 (타이핑 유실 방지) */
export function mergeBlockContentPreferLongerText(
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const a = (primary ?? {}) as Record<string, unknown>;
  const b = (secondary ?? {}) as Record<string, unknown>;
  const merged = { ...a, ...b };
  const aLen = blockTextLength(a);
  const bLen = blockTextLength(b);
  if (bLen > aLen) {
    merged.text = b.text;
    if ('html' in b) merged.html = b.html;
    if ('body' in b) merged.body = b.body;
    if ('bodyHtml' in b) merged.bodyHtml = b.bodyHtml;
  } else if (aLen > 0) {
    merged.text = a.text;
    if ('html' in a) merged.html = a.html;
  }
  return merged;
}

/** undo 스냅샷이 필요한 content 변경인지 */
export function contentChangedForUndo(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>,
): boolean {
  const prevRec = prev ?? {};
  const keys = new Set([...Object.keys(prevRec), ...Object.keys(next)]);
  for (const key of keys) {
    if (prevRec[key] !== next[key]) return true;
  }
  return false;
}

/** content 변경이 React blocks(토글·todo·depth 등) 재렌더를 요구하는지 */
export function contentChangeNeedsReactBlocks(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>,
): boolean {
  const prevRec = prev ?? {};
  const keys = new Set([...Object.keys(prevRec), ...Object.keys(next)]);
  for (const key of keys) {
    if (prevRec[key] === next[key]) continue;
    if (!STORE_ONLY_CONTENT_KEYS.has(key)) return true;
  }
  return false;
}
