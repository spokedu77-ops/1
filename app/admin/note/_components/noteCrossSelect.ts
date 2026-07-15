import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { crossDragSpanFromOrder } from '@/app/admin/note/_lib/noteCrossSelectSpan';
import {
  isMultiBlockCrossSelect,
  resolveCrossRanges as resolveCrossRangesCore,
  type CrossSelectAnchor,
  type CrossSelectRange,
} from '../_lib/noteCrossSelectCore';
import {
  buildDocumentCrossBlockMeta,
  hoverDocumentCaretPos,
} from '../_lib/noteCrossSelectBlockMeta';
import {
  commitCrossSelectRanges,
  clearUnifiedCrossSelectState,
  getUnifiedCrossSelectRanges,
  hasActiveMultiCrossSelect as hasUnifiedMultiCrossSelect,
  shouldSuppressCrossFormatToolbar as shouldSuppressUnifiedCrossFormatToolbar,
} from '../_lib/noteCrossSelectState';
import { startTextDragSession } from '../_lib/noteTextDragSession';
import { getNoteEditor, collapseAllNoteEditorSelections } from './noteEditorRegistry';
import {
  applyListCrossHighlight,
  bindListCrossHighlightEditorLookup,
  clearListCrossHighlight,
  extractActiveCrossSelectClipboardText,
} from './noteListCrossHighlight';
import {
  applyBlockPreviewCrossHighlight,
  applyBlockRowCrossHighlight,
  clearAllDocumentPreviewCrossHighlights,
  clearBlockPreviewCrossHighlight,
  getBlockPreviewTextRoot,
  hoverBlockPreviewTextPos,
} from './noteBlockPreviewCrossSelect';
import {
  applyToggleTitleCrossHighlight,
  clearAllToggleTitleCrossHighlights,
  clearToggleTitleCrossHighlight,
  getToggleTitleInput,
  hoverToggleTitlePos,
  isRowCrossTextSelectable,
  rowHasToggleTitle,
} from './noteToggleTitleCrossSelect';
import { noteBlockMarqueeGuard } from '../_lib/noteBlockMarqueeGuard';
import { clearActiveListCrossSelectState } from './noteListCrossSelect';
import {
  getOrderedBlockRowIds,
  resolveNoteBlockIdFromPoint,
} from './noteBlockIdFromPoint';

export { getOrderedBlockRowIds, getOrderedSelectableBlockIds } from './noteBlockIdFromPoint';

export type { CrossSelectRange };

type Anchor = CrossSelectAnchor;

let copyBound = false;
let toggleDragBound = false;
let previewDragBound = false;

function commitCrossRanges(ranges: CrossSelectRange[]) {
  commitCrossSelectRanges(ranges);
}

export function getActiveCrossRanges(): CrossSelectRange[] {
  return getUnifiedCrossSelectRanges();
}

export function hasActiveMultiCrossSelect(): boolean {
  return hasUnifiedMultiCrossSelect();
}

export function shouldSuppressCrossFormatToolbar(): boolean {
  return shouldSuppressUnifiedCrossFormatToolbar();
}

export function blockIdFromPoint(x: number, y: number): string | null {
  return resolveNoteBlockIdFromPoint(x, y);
}

function crossDragSpan(anchorId: string, hoverId: string): string[] {
  return crossDragSpanFromOrder(getOrderedBlockRowIds(), anchorId, hoverId);
}

export function hoverPos(editor: Editor, x: number, y: number): number {
  const coords = editor.view.posAtCoords({ left: x, top: y });
  return coords?.pos ?? editor.state.doc.content.size;
}

export function resolveCrossRanges(
  blockIds: string[],
  anchorState: Anchor,
  hoverId: string,
  hoverCaretPos: number,
): CrossSelectRange[] {
  return resolveCrossRangesCore(
    blockIds,
    anchorState,
    hoverId,
    hoverCaretPos,
    buildDocumentCrossBlockMeta,
  );
}

function collapseEditorSelection(editor: Editor, pos?: number) {
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
  const { state, view } = editor;
  const docSize = state.doc.content.size;
  const safe = Math.max(1, Math.min(pos ?? state.selection.from, docSize - 1));
  view.dispatch(
    state.tr
      .setSelection(TextSelection.create(state.doc, safe))
      .setMeta('addToHistory', false),
  );
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
  getUnifiedCrossSelectRanges().forEach(({ blockId }) => touched.add(blockId));
  clearCrossHighlightsForBlocks([...touched]);
  clearAllToggleTitleCrossHighlights();
  clearAllDocumentPreviewCrossHighlights();
  clearUnifiedCrossSelectState();
}

/** 싱글톤 에디터 전환 후에도 다중 교차 선택 하이라이트를 다시 그린다 */
export function reapplyActiveCrossSelectDecorations() {
  const ranges = getUnifiedCrossSelectRanges();
  if (ranges.length === 0) return;
  applyCrossDecorations(ranges);
}

/** 블록 간 교차 선택 + ProseMirror/브라우저 텍스트 드래그 선택 모두 해제 */
export function clearAllNoteTextSelections() {
  clearAllCrossSelectState();
  clearActiveListCrossSelectState();
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
      else applyBlockRowCrossHighlight(blockId);
      return;
    }
    if (surface === 'preview' || surface === 'list-preview') {
      if (to <= from) {
        applyBlockRowCrossHighlight(blockId);
        return;
      }
      applyBlockPreviewCrossHighlight(blockId, from, to);
      return;
    }
    const editor = getNoteEditor(blockId);
    if (editor) {
      applyListCrossHighlight(editor, from, to);
      return;
    }
    applyBlockRowCrossHighlight(blockId);
  });

  getOrderedBlockRowIds().forEach((id) => {
    if (touched.has(id)) return;
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
    if (rowHasToggleTitle(id)) clearToggleTitleCrossHighlight(id);
    clearBlockPreviewCrossHighlight(id);
  });

  if (typeof window !== 'undefined') {
    window.getSelection()?.removeAllRanges();
  }
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
  const span = crossDragSpan(anchor.blockId, hoverId);
  const selectableSpan = span.filter((id) => isRowCrossTextSelectable(id, !!getNoteEditor(id)));
  if (selectableSpan.length <= 1) return [];

  const ranges = resolveCrossRanges(
    span,
    anchor,
    hoverId,
    hoverDocumentCaretPos(hoverId, clientX, clientY),
  );

  if (!isMultiBlockCrossSelect(ranges)) return [];

  commitCrossRanges(ranges);
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
  if (getUnifiedCrossSelectRanges().length > 0) {
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
    const { state, view } = editor;
    view.dispatch(
      state.tr
        .setSelection(TextSelection.create(state.doc, from, to))
        .setMeta('addToHistory', false),
    );
    editor.commands.focus();
  }
}

export function finalizeCrossSelection(
  anchor: Anchor,
  clientX: number,
  clientY: number,
): CrossSelectRange[] {
  const hoverId = blockIdFromPoint(clientX, clientY) ?? anchor.blockId;
  const span = crossDragSpan(anchor.blockId, hoverId);
  const selectableSpan = span.filter((id) => isRowCrossTextSelectable(id, !!getNoteEditor(id)));
  if (selectableSpan.length <= 1) {
    clearAllCrossSelectState();
    return [];
  }

  const ranges = resolveCrossRanges(
    span,
    anchor,
    hoverId,
    hoverDocumentCaretPos(hoverId, clientX, clientY),
  );

  if (!isMultiBlockCrossSelect(ranges)) {
    clearAllCrossSelectState();
    return [];
  }

  commitCrossRanges(ranges);
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
  const text = extractActiveCrossSelectClipboardText();
  if (!text) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  e.clipboardData?.setData('text/plain', text);
}

function beginDocumentTextDragSession(anchor: Anchor, startX: number, startY: number) {
  return startTextDragSession({
    anchor,
    startX,
    startY,
    getSpanBlockIds: (hoverId) => crossDragSpan(anchor.blockId, hoverId),
    resolveHoverBlockId: (x, y) => blockIdFromPoint(x, y),
    hoverCaretPos: (blockId, x, y) => hoverDocumentCaretPos(blockId, x, y),
    getBlockMeta: buildDocumentCrossBlockMeta,
    filterSelectableSpan: (span) => span.filter((id) => isRowCrossTextSelectable(id, !!getNoteEditor(id))),
    onDragStart: () => {
      clearAllCrossSelectState();
      clearActiveListCrossSelectState();
    },
    onIntraBlock: (x, y) => {
      if (anchor.surface === 'toggle-title') {
        const input = getToggleTitleInput(anchor.blockId);
        if (!input) return;
        const caret = hoverToggleTitlePos(input, x);
        const from = Math.min(anchor.pos, caret);
        const to = Math.max(anchor.pos, caret);
        focusWithoutScroll(input);
        input.setSelectionRange(from, to);
        return;
      }
      if (anchor.surface === 'preview') {
        const caret = hoverBlockPreviewTextPos(anchor.blockId, x, y);
        const from = Math.min(anchor.pos, caret);
        const to = Math.max(anchor.pos, caret);
        if (to > from) {
          commitCrossRanges([{ blockId: anchor.blockId, from, to, surface: 'preview' }]);
          applyBlockPreviewCrossHighlight(anchor.blockId, from, to);
        } else {
          clearAllCrossSelectState();
        }
      }
    },
    onCrossBlock: (_ranges, x, y) => {
      const hoverId = blockIdFromPoint(x, y);
      if (!hoverId) return;
      applyCrossBlockSelection(anchor, hoverId, x, y);
    },
    onFinalize: (_ranges, x, y) => {
      finalizeCrossSelection(anchor, x, y);
    },
    onAbort: () => clearAllCrossSelectState(),
  });
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

  beginDocumentTextDragSession(
    {
      blockId,
      pos: hoverToggleTitlePos(input, e.clientX),
      surface: 'toggle-title',
    },
    e.clientX,
    e.clientY,
  );
}

function onPreviewTextPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  if (e.shiftKey || e.ctrlKey || e.metaKey) return;
  if (noteBlockMarqueeGuard.active) return;
  if (!isInactivePreviewTextTarget(e.target)) return;
  if (previewTextTargetElement(e.target)?.closest('a, button, img')) return;

  const blockId = blockIdFromPoint(e.clientX, e.clientY);
  if (!blockId || !getBlockPreviewTextRoot(blockId)) return;

  beginDocumentTextDragSession(
    {
      blockId,
      pos: hoverBlockPreviewTextPos(blockId, e.clientX, e.clientY),
      surface: 'preview',
    },
    e.clientX,
    e.clientY,
  );
}

function previewTextTargetElement(target: EventTarget | null): HTMLElement | null {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isInactivePreviewTextTarget(target: EventTarget | null): boolean {
  const el = previewTextTargetElement(target);
  if (!el?.closest('[data-note-preview-text]')) return false;
  const row = el.closest('[data-note-block-row]');
  const blockId = row?.getAttribute('data-block-id');
  if (!blockId) return false;
  return !getNoteEditor(blockId);
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
  }

  if (!previewDragBound) {
    previewDragBound = true;
    document.addEventListener('pointerdown', onPreviewTextPointerDown, true);
  }

  return () => {
    copyBound = false;
    toggleDragBound = false;
    previewDragBound = false;
    document.removeEventListener('copy', onCopy, true);
    document.removeEventListener('pointerdown', onToggleTitlePointerDown, true);
    document.removeEventListener('pointerdown', onPreviewTextPointerDown, true);
  };
}
