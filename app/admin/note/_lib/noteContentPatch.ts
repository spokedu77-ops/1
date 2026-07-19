import { TOGGLE_LEGACY_CONTENT_KEYS } from './noteBlockTypes';

/** TipTap·스토어 전용 — React blocks 재렌더 없이 patchContent로 처리 */
export const DECORATION_CONTENT_KEYS = new Set([
  'icon',
  'blockColor',
]);

export const STORE_ONLY_CONTENT_KEYS = new Set([
  'text',
  'html',
  ...DECORATION_CONTENT_KEYS,
  ...TOGGLE_LEGACY_CONTENT_KEYS,
]);

const PROTECTABLE_STRING_CONTENT_KEYS = new Set([
  'title',
  'page_document_id',
  'url',
  'caption',
]);

const VOLATILE_LEGACY_CONTENT_KEYS = [
  'legacyText',
  'placedInToggle',
  'createdInsideToggle',
] as const;

function stripVolatileLegacyContent(
  content: Record<string, unknown>,
): Record<string, unknown> {
  if (!VOLATILE_LEGACY_CONTENT_KEYS.some((key) => key in content)) return content;
  const next = { ...content };
  for (const key of VOLATILE_LEGACY_CONTENT_KEYS) delete next[key];
  return next;
}

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
  for (const key of PROTECTABLE_STRING_CONTENT_KEYS) {
    const baseValue = merged[key];
    const storeValue = fromStore[key];
    if (
      typeof storeValue === 'string'
      && storeValue.trim().length > 0
      && (typeof baseValue !== 'string' || baseValue.trim().length === 0)
    ) {
      merged[key] = storeValue;
    }
  }
  return stripVolatileLegacyContent(merged);
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

/**
 * onUpdate 메타 패치(checked·url 등) 시 React prop의 stale text/html이 스토어 본문을 덮지 않게 한다.
 * 편집기 동기화(incoming이 더 긴 본문)는 incoming을 유지한다.
 */
export function mergeContentPatchWithActiveStore(
  incoming: Record<string, unknown>,
  store: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!store) return incoming;
  const merged = { ...store, ...incoming };
  for (const key of DECORATION_CONTENT_KEYS) {
    if (!(key in incoming) && key in store) {
      merged[key] = store[key];
    }
  }
  const incomingClearsBody = 'text' in incoming
    && incoming.text === ''
    && 'html' in incoming
    && (incoming.html === ''
      || incoming.html === '<p></p>'
      || incoming.html === '<p><br></p>'
      || incoming.html === '<p><br class="ProseMirror-trailingBreak"></p>');
  for (const key of STORE_ONLY_CONTENT_KEYS) {
    const inVal = incoming[key];
    const storeVal = store[key];
    if (typeof inVal === 'string' && typeof storeVal === 'string') {
      if (inVal === '' && storeVal !== '') {
        const incomingHtml = incoming.html;
        const editorSignaledEmpty = key === 'text'
          && 'html' in incoming
          && (incomingHtml === ''
            || incomingHtml === '<p></p>'
            || incomingHtml === '<p><br></p>'
            || incomingHtml === '<p><br class="ProseMirror-trailingBreak"></p>');
        const authoritativeBodyClear = incomingClearsBody
          && (key === 'text' || key === 'html');
        merged[key] = (editorSignaledEmpty || authoritativeBodyClear) ? inVal : storeVal;
      } else if (inVal !== storeVal) {
        merged[key] = inVal;
      } else {
        merged[key] = storeVal;
      }
    } else if (storeVal !== undefined && (inVal === undefined || inVal === '')) {
      merged[key] = storeVal;
    }
  }
  return stripVolatileLegacyContent(merged);
}
