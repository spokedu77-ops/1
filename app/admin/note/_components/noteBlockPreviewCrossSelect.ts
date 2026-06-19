function escapeAttr(value: string): string {
  if (typeof globalThis.CSS?.escape === 'function') {
    return globalThis.CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const PREVIEW_CROSS_OVERLAY = '[data-note-preview-cross-overlay]';

/** TipTap 미마운트 상태의 블록 미리보기 (목록·텍스트 공통) */
export function getBlockPreviewTextRoot(blockId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-note-block-row][data-block-id="${escapeAttr(blockId)}"] [data-note-preview-text]`,
  );
}

/** @deprecated noteListPreviewCrossSelect 호환 */
export const getListPreviewTextRoot = getBlockPreviewTextRoot;

export function blockPreviewPlainText(blockId: string): string {
  const root = getBlockPreviewTextRoot(blockId);
  if (!root) return '';
  const overlay = root.querySelector(PREVIEW_CROSS_OVERLAY);
  if (overlay) overlay.remove();
  const text = root.textContent ?? '';
  return text;
}

/** @deprecated noteListPreviewCrossSelect 호환 */
export const listPreviewPlainText = blockPreviewPlainText;

export function hoverBlockPreviewTextPos(blockId: string, clientX: number, clientY: number): number {
  const root = getBlockPreviewTextRoot(blockId);
  if (!root) return 0;
  const text = blockPreviewPlainText(blockId);
  if (!text.length) return 0;

  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(clientX, clientY);
    if (range && root.contains(range.startContainer)) {
      const pre = document.createRange();
      pre.selectNodeContents(root);
      pre.setEnd(range.startContainer, range.startOffset);
      return pre.toString().length;
    }
  }

  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (pos && root.contains(pos.offsetNode)) {
      const pre = document.createRange();
      pre.selectNodeContents(root);
      pre.setEnd(pos.offsetNode, pos.offset);
      return pre.toString().length;
    }
  }

  return text.length;
}

/** @deprecated noteListPreviewCrossSelect 호환 */
export const hoverListPreviewTextPos = hoverBlockPreviewTextPos;

function ensurePreviewCrossOverlay(root: HTMLElement): HTMLElement {
  let overlay = root.querySelector<HTMLElement>(PREVIEW_CROSS_OVERLAY);
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.dataset.notePreviewCrossOverlay = 'true';
  overlay.className = [
    'pointer-events-none absolute inset-0 z-[2]',
    'overflow-hidden whitespace-pre-wrap break-words',
    'text-[16px] leading-7 text-transparent',
  ].join(' ');
  if (getComputedStyle(root).position === 'static') {
    root.style.position = 'relative';
  }
  root.appendChild(overlay);
  return overlay;
}

/** React가 관리하는 html 레이어는 건드리지 않고 오버레이로만 선택 표시 */
export function applyBlockPreviewCrossHighlight(blockId: string, from: number, to: number) {
  const root = getBlockPreviewTextRoot(blockId);
  if (!root) return;
  const text = blockPreviewPlainText(blockId);
  const safeFrom = Math.max(0, Math.min(from, text.length));
  const safeTo = Math.max(safeFrom, Math.min(to, text.length));
  const before = escapeHtml(text.slice(0, safeFrom));
  const mid = escapeHtml(text.slice(safeFrom, safeTo));
  const after = escapeHtml(text.slice(safeTo));
  const overlay = ensurePreviewCrossOverlay(root);
  overlay.innerHTML = `${before}<mark class="note-list-cross-selected">${mid}</mark>${after}`;
  root.dataset.blockCrossActive = 'true';
}

/** @deprecated noteListPreviewCrossSelect 호환 */
export const applyListPreviewCrossHighlight = applyBlockPreviewCrossHighlight;

export function clearBlockPreviewCrossHighlight(blockId: string) {
  const root = getBlockPreviewTextRoot(blockId);
  if (!root) return;
  root.querySelector(PREVIEW_CROSS_OVERLAY)?.remove();
  if (root.dataset.blockCrossActive === 'true') {
    delete root.dataset.blockCrossActive;
  }
}

/** @deprecated noteListPreviewCrossSelect 호환 */
export const clearListPreviewCrossHighlight = clearBlockPreviewCrossHighlight;

export function extractBlockPreviewSlice(blockId: string, from: number, to: number): string {
  const text = blockPreviewPlainText(blockId);
  const safeFrom = Math.max(0, Math.min(from, text.length));
  const safeTo = Math.max(safeFrom, Math.min(to, text.length));
  return text.slice(safeFrom, safeTo);
}

/** @deprecated noteListPreviewCrossSelect 호환 */
export const extractListPreviewSlice = extractBlockPreviewSlice;
