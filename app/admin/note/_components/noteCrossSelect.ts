import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { getNoteEditor, collapseAllNoteEditorSelections } from './noteEditorRegistry';
import {
  applyListCrossHighlight,
  bindListCrossHighlightEditorLookup,
  clearListCrossHighlight,
  syncCrossClipboardSnapshot,
  syncCrossTextActiveBodyClass,
  extractActiveCrossSelectClipboardText,
  clearCrossClipboardSnapshot,
  type ListCrossRange,
} from './noteListCrossHighlight';
import {
  applyBlockPreviewCrossHighlight,
  applyBlockRowCrossHighlight,
  blockPreviewPlainText,
  clearAllDocumentPreviewCrossHighlights,
  clearBlockPreviewCrossHighlight,
  clearBlockRowCrossHighlight,
  getBlockPreviewTextRoot,
  hoverBlockPreviewTextPos,
} from './noteBlockPreviewCrossSelect';
import {
  applyToggleTitleCrossHighlight,
  blockHasCrossTextContent,
  blockPlainTextFromStore,
  clearAllToggleTitleCrossHighlights,
  clearToggleTitleCrossHighlight,
  getToggleTitleInput,
  hoverToggleTitlePos,
  isRowCrossTextSelectable,
  preferredCrossSurface,
  rowHasToggleTitle,
  type CrossTextSurface,
} from './noteToggleTitleCrossSelect';
import { noteBlockMarqueeGuard, setNoteTextDragGuardActive } from '../_lib/noteBlockMarqueeGuard';
import { clearActiveListCrossSelectState } from './noteListCrossSelect';
import {
  getOrderedBlockRowIds,
  getOrderedSelectableBlockIds,
  resolveNoteBlockIdFromPoint,
} from './noteBlockIdFromPoint';

export { getOrderedBlockRowIds, getOrderedSelectableBlockIds } from './noteBlockIdFromPoint';

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

let previewAnchor: Anchor | null = null;
let previewPointerDown = false;
let previewDragging = false;
let previewCrossActive = false;
let previewStartX = 0;
let previewStartY = 0;
let previewDragBound = false;

function commitCrossRanges(ranges: CrossSelectRange[]) {
  activeCrossRanges = ranges;
  if (ranges.length > 1) syncCrossClipboardSnapshot(ranges);
  syncCrossTextActiveBodyClass();
}

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
  return resolveNoteBlockIdFromPoint(x, y);
}

function blocksBetween(order: string[], anchorId: string, hoverId: string): string[] {
  const anchorIdx = order.indexOf(anchorId);
  const hoverIdx = order.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) return [];
  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);
  return order.slice(lo, hi + 1);
}

/** 교차 드래그 span — 시각 순서 전체 행 (중간 블록 누락 방지) */
function crossDragSpan(anchorId: string, hoverId: string): string[] {
  return blocksBetween(getOrderedBlockRowIds(), anchorId, hoverId);
}

export function hoverPos(editor: Editor, x: number, y: number): number {
  const coords = editor.view.posAtCoords({ left: x, top: y });
  return coords?.pos ?? editor.state.doc.content.size;
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
    const input = getToggleTitleInput(blockId);
    if (input && input.value.length > 0) return input.value.length;
    return blockPlainTextFromStore(blockId).length;
  }
  if (surface === 'preview') {
    const domLen = blockPreviewPlainText(blockId).length;
    if (domLen > 0) return domLen;
    return blockPlainTextFromStore(blockId).length;
  }
  const editor = getNoteEditor(blockId);
  if (editor) return editor.state.doc.content.size;
  return blockPlainTextFromStore(blockId).length;
}

function resolveBlockCrossSurface(blockId: string): CrossTextSurface | null {
  const hasEditor = !!getNoteEditor(blockId);
  const surface = preferredCrossSurface(blockId, hasEditor);
  if (surface) return surface;
  if (blockHasCrossTextContent(blockId)) return 'preview';
  return null;
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
    const surface = resolveBlockCrossSurface(blockId);
    if (!surface) continue;
    const docEnd = blockTextEnd(blockId, surface);
    if (docEnd <= 0 && surface !== 'toggle-title') {
      ranges.push({ blockId, from: 0, to: 0, surface });
      continue;
    }
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
  activeCrossRanges.forEach(({ blockId }) => touched.add(blockId));
  clearCrossHighlightsForBlocks([...touched]);
  clearAllToggleTitleCrossHighlights();
  clearAllDocumentPreviewCrossHighlights();
  activeCrossRanges = [];
  clearCrossClipboardSnapshot();
  syncCrossTextActiveBodyClass();
}

/** 싱글톤 에디터 전환 후에도 다중 교차 선택 하이라이트를 다시 그린다 */
export function reapplyActiveCrossSelectDecorations() {
  if (activeCrossRanges.length === 0) return;
  applyCrossDecorations(activeCrossRanges);
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
    hoverBlockPos(hoverId, clientX, clientY),
  );

  if (ranges.length <= 1) return [];

  activeCrossRanges = ranges;
  if (ranges.length > 1) syncCrossClipboardSnapshot(ranges);
  syncCrossTextActiveBodyClass();
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
    hoverBlockPos(hoverId, clientX, clientY),
  );

  if (ranges.length <= 1) {
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
  clearActiveListCrossSelectState();

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

  const span = crossDragSpan(toggleAnchor.blockId, hoverId);
  const selectableSpan = span.filter((id) => isRowCrossTextSelectable(id, !!getNoteEditor(id)));
  if (selectableSpan.length <= 1) {
    if (toggleDragging) {
      clearAllCrossSelectState();
      toggleDragging = false;
    }
    return;
  }

  // 같은 블록 안 세로·가로 드래그 모두 처리 (비활성 블록은 preview·list 핸들러)
  if (hoverId === toggleAnchor.blockId) {
    if (toggleDragging) {
      toggleDragging = false;
      setNoteTextDragGuardActive(false);
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

  toggleDragging = true;
  setNoteTextDragGuardActive(true);
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
  setNoteTextDragGuardActive(false);

  if (!currentAnchor) return;

  if (wasDragging) {
    finalizeCrossSelection(currentAnchor, e.clientX, e.clientY);
  }
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

function onPreviewTextPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  if (e.shiftKey || e.ctrlKey || e.metaKey) return;
  if (noteBlockMarqueeGuard.active) return;
  if (!isInactivePreviewTextTarget(e.target)) return;
  if (previewTextTargetElement(e.target)?.closest('a, button, img')) return;

  const blockId = blockIdFromPoint(e.clientX, e.clientY);
  if (!blockId || !getBlockPreviewTextRoot(blockId)) return;

  if (activeCrossRanges.length > 0) {
    clearAllCrossSelectState();
  }

  previewAnchor = {
    blockId,
    pos: hoverBlockPreviewTextPos(blockId, e.clientX, e.clientY),
    surface: 'preview',
  };
  previewPointerDown = true;
  previewDragging = false;
  previewCrossActive = false;
  previewStartX = e.clientX;
  previewStartY = e.clientY;
}

function onPreviewTextPointerMove(e: PointerEvent) {
  if (!previewPointerDown || !previewAnchor || e.buttons !== 1) return;
  if (noteBlockMarqueeGuard.active) {
    onPreviewTextPointerUp(e);
    return;
  }

  const dx = Math.abs(e.clientX - previewStartX);
  const dy = Math.abs(e.clientY - previewStartY);
  if (dx < TOGGLE_DRAG_THRESHOLD && dy < TOGGLE_DRAG_THRESHOLD) return;

  previewDragging = true;
  e.preventDefault();

  const hoverId = blockIdFromPoint(e.clientX, e.clientY);
  if (!hoverId) return;

  if (hoverId === previewAnchor.blockId) {
    if (previewCrossActive) {
      previewCrossActive = false;
      setNoteTextDragGuardActive(false);
      clearAllCrossSelectState();
    }
    const caret = hoverBlockPreviewTextPos(hoverId, e.clientX, e.clientY);
    const from = Math.min(previewAnchor.pos, caret);
    const to = Math.max(previewAnchor.pos, caret);
    if (to > from) {
      activeCrossRanges = [{ blockId: hoverId, from, to, surface: 'preview' }];
      syncCrossTextActiveBodyClass();
      applyBlockPreviewCrossHighlight(hoverId, from, to);
    }
    return;
  }

  previewCrossActive = true;
  setNoteTextDragGuardActive(true);
  applyCrossBlockSelection(previewAnchor, hoverId, e.clientX, e.clientY);
}

function onPreviewTextPointerUp(e: PointerEvent) {
  if (!previewPointerDown) return;

  const currentAnchor = previewAnchor;
  const wasDragging = previewDragging;
  const wasCross = previewCrossActive;

  previewPointerDown = false;
  previewDragging = false;
  previewAnchor = null;
  previewCrossActive = false;
  setNoteTextDragGuardActive(false);

  if (!currentAnchor) return;

  if (wasCross && wasDragging) {
    e.preventDefault();
    finalizeCrossSelection(currentAnchor, e.clientX, e.clientY);
    return;
  }

  if (!wasDragging) return;

  const hoverId = blockIdFromPoint(e.clientX, e.clientY) ?? currentAnchor.blockId;
  if (hoverId !== currentAnchor.blockId) {
    clearAllCrossSelectState();
    return;
  }

  const caret = hoverBlockPreviewTextPos(hoverId, e.clientX, e.clientY);
  const from = Math.min(currentAnchor.pos, caret);
  const to = Math.max(currentAnchor.pos, caret);
  if (to > from) {
    e.preventDefault();
    activeCrossRanges = [{ blockId: hoverId, from, to, surface: 'preview' }];
    syncCrossTextActiveBodyClass();
    applyBlockPreviewCrossHighlight(hoverId, from, to);
  } else {
    clearAllCrossSelectState();
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

  if (!previewDragBound) {
    previewDragBound = true;
    document.addEventListener('pointerdown', onPreviewTextPointerDown, true);
    document.addEventListener('pointermove', onPreviewTextPointerMove, true);
    document.addEventListener('pointerup', onPreviewTextPointerUp, true);
    document.addEventListener('pointercancel', onPreviewTextPointerUp, true);
  }

  return () => {
    copyBound = false;
    toggleDragBound = false;
    previewDragBound = false;
    document.removeEventListener('copy', onCopy, true);
    document.removeEventListener('pointerdown', onToggleTitlePointerDown, true);
    document.removeEventListener('pointermove', onToggleTitlePointerMove, true);
    document.removeEventListener('pointerup', onToggleTitlePointerUp, true);
    document.removeEventListener('pointercancel', onToggleTitlePointerUp, true);
    document.removeEventListener('pointerdown', onPreviewTextPointerDown, true);
    document.removeEventListener('pointermove', onPreviewTextPointerMove, true);
    document.removeEventListener('pointerup', onPreviewTextPointerUp, true);
    document.removeEventListener('pointercancel', onPreviewTextPointerUp, true);
    previewPointerDown = false;
    previewDragging = false;
    previewAnchor = null;
    previewCrossActive = false;
  };
}
