import type { ListCrossRange } from './noteListCrossHighlight';

export type CrossTextSurface = 'editor' | 'toggle-title';

export type CrossTextRange = ListCrossRange & {
  surface?: CrossTextSurface;
};

function escapeAttr(value: string): string {
  if (typeof globalThis.CSS?.escape === 'function') {
    return globalThis.CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function getToggleTitleInput(blockId: string): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(
    `[data-note-block-row][data-block-id="${escapeAttr(blockId)}"] [data-toggle-title]`,
  );
}

export function rowHasToggleTitle(blockId: string): boolean {
  return !!getToggleTitleInput(blockId);
}

export function isRowCrossTextSelectable(blockId: string, hasEditor: boolean): boolean {
  return hasEditor || rowHasToggleTitle(blockId);
}

export function hoverToggleTitlePos(input: HTMLInputElement, clientX: number): number {
  const text = input.value;
  if (!text.length) return 0;
  const style = window.getComputedStyle(input);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length;
  ctx.font = style.font;
  const rect = input.getBoundingClientRect();
  const padL = Number.parseFloat(style.paddingLeft) || 0;
  const relX = Math.max(0, clientX - rect.left - padL);
  for (let i = 0; i <= text.length; i += 1) {
    const width = ctx.measureText(text.slice(0, i)).width;
    if (width > relX) return Math.max(0, i - 1);
  }
  return text.length;
}

export function applyToggleTitleCrossHighlight(
  input: HTMLInputElement,
  from: number,
  to: number,
) {
  const len = input.value.length;
  const safeFrom = Math.max(0, Math.min(from, len));
  const safeTo = Math.max(safeFrom, Math.min(to, len));
  input.dataset.crossFrom = String(safeFrom);
  input.dataset.crossTo = String(safeTo);
  input.classList.add('note-toggle-title-cross-active');
  if (safeFrom === 0 && safeTo >= len && len > 0) {
    input.classList.add('note-toggle-title-cross-full');
  }
}

export function clearToggleTitleCrossHighlight(blockId: string) {
  const input = getToggleTitleInput(blockId);
  if (!input) return;
  input.classList.remove('note-toggle-title-cross-active', 'note-toggle-title-cross-full');
  delete input.dataset.crossFrom;
  delete input.dataset.crossTo;
}

export function clearAllToggleTitleCrossHighlights() {
  document.querySelectorAll<HTMLInputElement>('[data-toggle-title].note-toggle-title-cross-active').forEach((input) => {
    input.classList.remove('note-toggle-title-cross-active', 'note-toggle-title-cross-full');
    delete input.dataset.crossFrom;
    delete input.dataset.crossTo;
  });
}

export function extractToggleTitleSlice(input: HTMLInputElement, from: number, to: number): string {
  const len = input.value.length;
  const safeFrom = Math.max(0, Math.min(from, len));
  const safeTo = Math.max(safeFrom, Math.min(to, len));
  return input.value.slice(safeFrom, safeTo);
}

export function preferredCrossSurface(blockId: string, hasEditor: boolean): CrossTextSurface | null {
  if (rowHasToggleTitle(blockId)) return 'toggle-title';
  if (hasEditor) return 'editor';
  return null;
}
