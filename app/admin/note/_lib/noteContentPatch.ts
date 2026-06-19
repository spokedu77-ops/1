/** TipTap·스토어 전용 — React blocks 재렌더 없이 patchContent로 처리 */
export const STORE_ONLY_CONTENT_KEYS = new Set([
  'text',
  'body',
  'html',
  'bodyHtml',
  'legacyText',
  'legacyBody',
]);

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
