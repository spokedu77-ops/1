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

function previewContentElement(root: HTMLElement): HTMLElement | null {
  const direct = root.querySelector<HTMLElement>(':scope > div, :scope > p');
  return direct;
}

/** 문단 단위 줄바꿈을 유지한 plain text — 좌표·하이라이트와 동일 기준 */
export function extractPreviewPlainText(root: HTMLElement): string {
  const contentEl = previewContentElement(root);
  if (!contentEl) return '';
  if (contentEl.classList.contains('is-editor-empty')) return '';

  const blocks = contentEl.querySelectorAll('p, h1, h2, h3, h4, li');
  if (blocks.length > 0) {
    return [...blocks]
      .map((el) => el.textContent ?? '')
      .join('\n');
  }
  return contentEl.textContent ?? '';
}

export function blockPreviewPlainText(blockId: string): string {
  const root = getBlockPreviewTextRoot(blockId);
  if (!root) return '';
  root.querySelector(PREVIEW_CROSS_OVERLAY)?.remove();
  return extractPreviewPlainText(root);
}

/** @deprecated noteListPreviewCrossSelect 호환 */
export const listPreviewPlainText = blockPreviewPlainText;

function previewCaretOffsetInRoot(root: HTMLElement, clientX: number, clientY: number): number {
  const contentEl = previewContentElement(root);
  if (!contentEl) return 0;

  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  let range: Range | null = null;
  if (typeof doc.caretRangeFromPoint === 'function') {
    range = doc.caretRangeFromPoint(clientX, clientY);
  } else if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }
  if (!range || !contentEl.contains(range.startContainer)) return 0;

  const blocks = contentEl.querySelectorAll('p, h1, h2, h3, h4, li');
  if (blocks.length > 0) {
    let offset = 0;
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i] as HTMLElement;
      const blockText = block.textContent ?? '';
      const rect = block.getBoundingClientRect();
      const onThisLine = clientY >= rect.top - 2 && clientY <= rect.bottom + 2;
      if (block.contains(range.startContainer)) {
        if (onThisLine && clientX >= rect.right - 6) {
          return offset + blockText.length;
        }
        const pre = document.createRange();
        pre.selectNodeContents(block);
        pre.setEnd(range.startContainer, range.startOffset);
        const within = Math.min(pre.toString().length, blockText.length);
        return offset + within;
      }
      offset += blockText.length + 1;
    }
    return offset;
  }

  const fullText = contentEl.textContent ?? '';
  const rect = contentEl.getBoundingClientRect();
  if (clientX >= rect.right - 6) return fullText.length;
  const pre = document.createRange();
  pre.selectNodeContents(contentEl);
  pre.setEnd(range.startContainer, range.startOffset);
  return Math.min(pre.toString().length, fullText.length);
}

export function hoverBlockPreviewTextPos(blockId: string, clientX: number, clientY: number): number {
  const root = getBlockPreviewTextRoot(blockId);
  if (!root) return 0;
  const text = blockPreviewPlainText(blockId);
  if (!text.length) return 0;
  return Math.min(previewCaretOffsetInRoot(root, clientX, clientY), text.length);
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
    'text-[16px] leading-7 text-neutral-800',
  ].join(' ');
  if (getComputedStyle(root).position === 'static') {
    root.style.position = 'relative';
  }
  root.appendChild(overlay);
  return overlay;
}

/** React html 레이어는 숨기고 오버레이만 표시 — 이중 렌더·색 흐림 방지 */
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
  root.classList.add('note-preview-cross-active');
  if (typeof window !== 'undefined') {
    window.getSelection()?.removeAllRanges();
  }
}

/** @deprecated noteListPreviewCrossSelect 호환 */
export const applyListPreviewCrossHighlight = applyBlockPreviewCrossHighlight;

export function clearBlockPreviewCrossHighlight(blockId: string) {
  const root = getBlockPreviewTextRoot(blockId);
  if (!root) return;
  root.classList.remove('note-preview-cross-active');
  root.querySelector(PREVIEW_CROSS_OVERLAY)?.remove();
}

/** document 전체 — 토글·목록 등에 남은 미리보기 교차선택 UI 일괄 해제 */
export function clearAllDocumentPreviewCrossHighlights() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll<HTMLElement>('[data-note-preview-text]').forEach((root) => {
    root.classList.remove('note-preview-cross-active');
    root.querySelector(PREVIEW_CROSS_OVERLAY)?.remove();
  });
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
