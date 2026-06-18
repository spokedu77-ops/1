import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { getNoteEditor, collapseAllNoteEditorSelections } from './noteEditorRegistry';
import {
  applyListCrossHighlight,
  bindListCrossHighlightEditorLookup,
  clearListCrossHighlight,
  extractListCrossText,
  type ListCrossRange,
} from './noteListCrossHighlight';
import {
  applyToggleTitleCrossHighlight,
  clearAllToggleTitleCrossHighlights,
  clearToggleTitleCrossHighlight,
  getToggleTitleInput,
  hoverToggleTitlePos,
  isRowCrossTextSelectable,
  preferredCrossSurface,
  rowHasToggleTitle,
  type CrossTextSurface,
} from './noteToggleTitleCrossSelect';
import {
  applyBlockPreviewCrossHighlight,
  blockPreviewPlainText,
  clearBlockPreviewCrossHighlight,
  hoverBlockPreviewTextPos,
} from './noteBlockPreviewCrossSelect';
import { noteBlockMarqueeGuard, noteTextDragGuard } from '../_lib/noteBlockMarqueeGuard';

export type CrossSelectRange = ListCrossRange;

type Anchor = {
  blockId: string;
  pos: number;
  surface: CrossTextSurface;
};

let activeCrossRanges: CrossSelectRange[] = [];
let copyBound = false;
let toggleDragBound = false;

const TOGGLE_DRAG_THRESHOLD = 3;

let toggleAnchor: Anchor | null = null;
let togglePointerDown = false;
let toggleDragging = false;
let toggleStartX = 0;
let toggleStartY = 0;

export function getActiveCrossRanges(): CrossSelectRange[] {
  return activeCrossRanges;
}

export function hasActiveMultiCrossSelect(): boolean {
  return activeCrossRanges.length > 1;
}

export function shouldSuppressCrossFormatToolbar(): boolean {
  return activeCrossRanges.length > 1;
}

export function blockIdFromPoint(x: number, y: number): string | null {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    const row = (el as HTMLElement).closest?.('[data-note-block-row]');
    if (!row) continue;
    const id = row.getAttribute('data-block-id');
    if (!id) continue;
    if (isRowCrossTextSelectable(id, !!getNoteEditor(id))) return id;
  }
  return null;
}

/** 화면에 보이는 텍스트/토글 제목 블록 id — 위→아래 문서 순 */
export function getOrderedSelectableBlockIds(): string[] {
  const rows = [...document.querySelectorAll<HTMLElement>('[data-note-block-row]')]
    .filter((row) => {
      const id = row.getAttribute('data-block-id');
      return !!id && isRowCrossTextSelectable(id, !!getNoteEditor(id));
    })
    .sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    });
  return rows
    .map((row) => row.getAttribute('data-block-id'))
    .filter((id): id is string => !!id);
}

function blocksBetween(order: string[], anchorId: string, hoverId: string): string[] {
  const anchorIdx = order.indexOf(anchorId);
  const hoverIdx = order.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) return [];
  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);
  return order.slice(lo, hi + 1);
}

export function hoverPos(editor: Editor, x: number, y: number): number {
  const coords = editor.view.posAtCoords({ left: x, top: y });
  return coords?.pos ?? editor.state.doc.content.size - 1;
}

function hoverBlockPos(blockId: string, clientX: number, clientY: number): number {
  const surface = preferredCrossSurface(blockId, !!getNoteEditor(blockId));
  if (surface === 'toggle-title') {
    const input = getToggleTitleInput(blockId);
    return input ? hoverToggleTitlePos(input, clientX) : 0;
  }
  if (surface === 'preview') {
    return hoverBlockPreviewTextPos(blockId, clientX, clientY);
  }
  const editor = getNoteEditor(blockId);
  if (!editor) return 0;
  return hoverPos(editor, clientX, clientY);
}

function blockTextEnd(blockId: string, surface: CrossTextSurface): number {
  if (surface === 'toggle-title') {
    return getToggleTitleInput(blockId)?.value.length ?? 0;
  }
  if (surface === 'preview') {
    return blockPreviewPlainText(blockId).length;
  }
  const editor = getNoteEditor(blockId);
  if (!editor) return 0;
  return editor.state.doc.content.size - 1;
}

export function resolveCrossRanges(
  blockIds: string[],
  anchorState: Anchor,
  hoverId: string,
  hoverCaretPos: number,
): CrossSelectRange[] {
  const anchorIdx = blockIds.indexOf(anchorState.blockId);
  const hoverIdx = blockIds.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) return [];

  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);
  const ranges: CrossSelectRange[] = [];

  for (let i = lo; i <= hi; i += 1) {
    const blockId = blockIds[i];
    const surface = preferredCrossSurface(blockId, !!getNoteEditor(blockId));
    if (!surface) continue;
    const docEnd = blockTextEnd(blockId, surface);
    let from = surface === 'editor' ? 1 : 0;
    let to = docEnd;

    if (lo === hi) {
      from = Math.min(anchorState.pos, hoverCaretPos);
      to = Math.max(anchorState.pos, hoverCaretPos);
    } else if (i === anchorIdx && i === lo) {
      if (anchorIdx < hoverIdx) {
        from = anchorState.pos;
        to = docEnd;
      } else {
        from = hoverCaretPos;
        to = docEnd;
      }
    } else if (i === anchorIdx && i === hi) {
      if (anchorIdx < hoverIdx) {
        from = surface === 'editor' ? 1 : 0;
        to = hoverCaretPos;
      } else {
        from = surface === 'editor' ? 1 : 0;
        to = anchorState.pos;
      }
    } else if (i === hoverIdx && i === lo) {
      if (hoverIdx < anchorIdx) {
        from = hoverCaretPos;
        to = docEnd;
      } else {
        from = anchorState.pos;
        to = docEnd;
      }
    } else if (i === hoverIdx && i === hi) {
      if (hoverIdx < anchorIdx) {
        from = surface === 'editor' ? 1 : 0;
        to = anchorState.pos;
      } else {
        from = surface === 'editor' ? 1 : 0;
        to = hoverCaretPos;
      }
    }

    ranges.push({ blockId, from, to, surface });
  }

  return ranges;
}

function collapseEditorSelection(editor: Editor, pos?: number) {
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
  const { state, view } = editor;
  const docSize = state.doc.content.size;
  const safe = Math.max(1, Math.min(pos ?? state.selection.from, docSize - 1));
  view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, safe)));
}

export function clearCrossHighlightsForBlocks(blockIds: string[]) {
  blockIds.forEach((id) => {
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
    if (rowHasToggleTitle(id)) clearToggleTitleCrossHighlight(id);
    clearBlockPreviewCrossHighlight(id);
  });
}

export function clearAllCrossSelectState() {
  const touched = new Set<string>();
  activeCrossRanges.forEach(({ blockId }) => touched.add(blockId));
  clearCrossHighlightsForBlocks([...touched]);
  clearAllToggleTitleCrossHighlights();
  activeCrossRanges = [];
}

/** 블록 간 교차 선택 + ProseMirror/브라우저 텍스트 드래그 선택 모두 해제 */
export function clearAllNoteTextSelections() {
  clearAllCrossSelectState();
  collapseAllNoteEditorSelections();
  document.querySelectorAll<HTMLInputElement>('[data-toggle-title]').forEach((input) => {
    input.setSelectionRange(0, 0);
  });
  if (typeof window !== 'undefined') {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) sel.removeAllRanges();
  }
}

function applyCrossDecorations(ranges: CrossSelectRange[]) {
  const touched = new Set<string>();
  ranges.forEach(({ blockId, from, to, surface }) => {
    touched.add(blockId);
    if (surface === 'toggle-title') {
      const input = getToggleTitleInput(blockId);
      if (input) applyToggleTitleCrossHighlight(input, from, to);
      return;
    }
    if (surface === 'preview' || surface === 'list-preview') {
      applyBlockPreviewCrossHighlight(blockId, from, to);
      return;
    }
    const editor = getNoteEditor(blockId);
    if (editor) applyListCrossHighlight(editor, from, to);
  });

  const order = getOrderedSelectableBlockIds();
  order.forEach((id) => {
    if (touched.has(id)) return;
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
    if (rowHasToggleTitle(id)) clearToggleTitleCrossHighlight(id);
    clearBlockPreviewCrossHighlight(id);
  });
}

function suppressNativeSelections(blockIds: string[], activeBlockId?: string) {
  blockIds.forEach((id) => {
    if (id === activeBlockId) return;
    const editor = getNoteEditor(id);
    if (editor) collapseEditorSelection(editor, 1);
    const input = getToggleTitleInput(id);
    if (input) input.setSelectionRange(0, 0);
  });
}

function focusWithoutScroll(el: HTMLElement) {
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

export function applyCrossBlockSelection(
  anchor: Anchor,
  hoverId: string,
  clientX: number,
  clientY: number,
): CrossSelectRange[] {
  const order = getOrderedSelectableBlockIds();
  const span = blocksBetween(order, anchor.blockId, hoverId);
  if (span.length <= 1) return [];

  const ranges = resolveCrossRanges(
    span,
    anchor,
    hoverId,
    hoverBlockPos(hoverId, clientX, clientY),
  );

  if (ranges.length <= 1) return [];

  activeCrossRanges = ranges;
  suppressNativeSelections(span, hoverId);
  applyCrossDecorations(ranges);

  const focusRange = ranges.find((r) => r.blockId === hoverId) ?? ranges[ranges.length - 1];
  if (focusRange.surface === 'toggle-title') {
    const input = getToggleTitleInput(focusRange.blockId);
    if (input) {
      focusWithoutScroll(input);
      const len = input.value.length;
      const from = Math.max(0, Math.min(focusRange.from, len));
      const to = Math.max(from, Math.min(focusRange.to, len));
      if (to > from) input.setSelectionRange(from, to);
      else input.setSelectionRange(to, to);
    }
  } else {
    const focusEditor = getNoteEditor(focusRange.blockId);
    if (focusEditor) {
      focusEditor.commands.focus();
      const { from, to } = focusRange;
      if (to > from) {
        focusEditor.chain().setTextSelection({ from, to }).run();
      } else {
        collapseEditorSelection(focusEditor, focusRange.to);
      }
    }
  }

  document.dispatchEvent(new CustomEvent('note-hide-format-toolbar'));
  return ranges;
}

export function restoreIntraBlockSelection(
  anchor: Anchor,
  clientX: number,
  clientY: number,
): void {
  if (activeCrossRanges.length > 0) {
    clearAllCrossSelectState();
  }
  if (anchor.surface === 'toggle-title') {
    const input = getToggleTitleInput(anchor.blockId);
    if (!input) return;
    const caretPos = hoverToggleTitlePos(input, clientX);
    const from = Math.min(anchor.pos, caretPos);
    const to = Math.max(anchor.pos, caretPos);
    focusWithoutScroll(input);
    input.setSelectionRange(from, to);
    return;
  }
  const editor = getNoteEditor(anchor.blockId);
  if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return;
  const caretPos = hoverPos(editor, clientX, clientY);
  const from = Math.min(anchor.pos, caretPos);
  const to = Math.max(anchor.pos, caretPos);
  if (to > from) {
    editor.chain().focus().setTextSelection({ from, to }).run();
  }
}

export function finalizeCrossSelection(
  anchor: Anchor,
  clientX: number,
  clientY: number,
): CrossSelectRange[] {
  const hoverId = blockIdFromPoint(clientX, clientY) ?? anchor.blockId;
  const order = getOrderedSelectableBlockIds();
  const span = blocksBetween(order, anchor.blockId, hoverId);
  if (span.length <= 1) {
    clearAllCrossSelectState();
    return [];
  }

  const ranges = resolveCrossRanges(
    span,
    anchor,
    hoverId,
    hoverBlockPos(hoverId, clientX, clientY),
  );

  if (ranges.length <= 1) {
    clearAllCrossSelectState();
    return [];
  }

  activeCrossRanges = ranges;
  applyCrossDecorations(ranges);
  const focusRange = ranges.find((r) => r.blockId === hoverId) ?? ranges[ranges.length - 1];
  if (focusRange.surface === 'toggle-title') {
    const input = getToggleTitleInput(focusRange.blockId);
    if (input) {
      focusWithoutScroll(input);
      const len = input.value.length;
      const caret = Math.max(0, Math.min(focusRange.to, len));
      input.setSelectionRange(caret, caret);
    }
  } else {
    const focusEditor = getNoteEditor(focusRange.blockId);
    if (focusEditor) {
      focusEditor.commands.focus();
      collapseEditorSelection(focusEditor, focusRange.to);
    }
  }

  document.dispatchEvent(new CustomEvent('note-hide-format-toolbar'));
  return ranges;
}

function onCopy(e: ClipboardEvent) {
  if (activeCrossRanges.length <= 1) return;
  const text = extractListCrossText(activeCrossRanges);
  if (!text) return;
  e.preventDefault();
  e.clipboardData?.setData('text/plain', text);
}

function onToggleTitlePointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  if (e.shiftKey || e.ctrlKey || e.metaKey) return;
  if (noteBlockMarqueeGuard.active) return;

  const target = e.target as HTMLElement | null;
  if (!target?.closest?.('[data-toggle-title]')) return;

  const row = target.closest('[data-note-block-row]');
  const blockId = row?.getAttribute('data-block-id');
  const input = blockId ? getToggleTitleInput(blockId) : null;
  if (!blockId || !input) return;

  if (activeCrossRanges.length > 0) {
    clearAllCrossSelectState();
  }

  toggleAnchor = {
    blockId,
    pos: hoverToggleTitlePos(input, e.clientX),
    surface: 'toggle-title',
  };
  togglePointerDown = true;
  toggleDragging = false;
  toggleStartX = e.clientX;
  toggleStartY = e.clientY;
}

function onToggleTitlePointerMove(e: PointerEvent) {
  if (!togglePointerDown || !toggleAnchor || e.buttons !== 1) return;
  if (noteBlockMarqueeGuard.active) {
    onToggleTitlePointerUp(e);
    return;
  }

  const dx = Math.abs(e.clientX - toggleStartX);
  const dy = Math.abs(e.clientY - toggleStartY);
  if (dx < TOGGLE_DRAG_THRESHOLD && dy < TOGGLE_DRAG_THRESHOLD) return;

  const hoverId = blockIdFromPoint(e.clientX, e.clientY);
  if (!hoverId) return;

  const order = getOrderedSelectableBlockIds();
  const span = blocksBetween(order, toggleAnchor.blockId, hoverId);
  if (span.length <= 1) {
    if (toggleDragging) {
      clearAllCrossSelectState();
      toggleDragging = false;
    }
    return;
  }

  if (hoverId === toggleAnchor.blockId) {
    if (toggleDragging) {
      toggleDragging = false;
      noteTextDragGuard.active = false;
      clearAllCrossSelectState();
      const input = getToggleTitleInput(hoverId);
      if (!input) return;
      const caret = hoverToggleTitlePos(input, e.clientX);
      const from = Math.min(toggleAnchor.pos, caret);
      const to = Math.max(toggleAnchor.pos, caret);
      focusWithoutScroll(input);
      input.setSelectionRange(from, to);
    }
    return;
  }

  if (dx >= dy) return;

  toggleDragging = true;
  noteTextDragGuard.active = true;
  e.preventDefault();

  applyCrossBlockSelection(toggleAnchor, hoverId, e.clientX, e.clientY);
}

function onToggleTitlePointerUp(e: PointerEvent) {
  if (!togglePointerDown) return;
  const currentAnchor = toggleAnchor;
  const wasDragging = toggleDragging;

  togglePointerDown = false;
  toggleDragging = false;
  toggleAnchor = null;
  noteTextDragGuard.active = false;

  if (!currentAnchor) return;

  if (wasDragging) {
    finalizeCrossSelection(currentAnchor, e.clientX, e.clientY);
  }
}

export function bindNoteCrossSelectCopy() {
  bindListCrossHighlightEditorLookup(getNoteEditor, getToggleTitleInput);

  if (!copyBound) {
    copyBound = true;
    document.addEventListener('copy', onCopy, true);
  }

  if (!toggleDragBound) {
    toggleDragBound = true;
    document.addEventListener('pointerdown', onToggleTitlePointerDown, true);
    document.addEventListener('pointermove', onToggleTitlePointerMove, true);
    document.addEventListener('pointerup', onToggleTitlePointerUp, true);
    document.addEventListener('pointercancel', onToggleTitlePointerUp, true);
  }

  return () => {
    copyBound = false;
    toggleDragBound = false;
    document.removeEventListener('copy', onCopy, true);
    document.removeEventListener('pointerdown', onToggleTitlePointerDown, true);
    document.removeEventListener('pointermove', onToggleTitlePointerMove, true);
    document.removeEventListener('pointerup', onToggleTitlePointerUp, true);
    document.removeEventListener('pointercancel', onToggleTitlePointerUp, true);
  };
}
