import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import {
  isMultiBlockCrossSelect,
  resolveCrossRanges as resolveCrossRangesCore,
  type CrossSelectAnchor,
  type CrossSelectRange,
  type CrossTextSurface,
} from '../_lib/noteCrossSelectCore';
import {
  buildDocumentCrossBlockMeta,
  buildListCrossBlockMeta,
  hoverDocumentCaretPos,
  hoverListCaretPos,
} from '../_lib/noteCrossSelectBlockMeta';
import {
  commitCrossSelectRanges,
  clearUnifiedCrossSelectState,
  getUnifiedCrossSelectRanges,
  hasActiveMultiCrossSelect,
  isListCrossDragActive,
  shouldSuppressCrossFormatToolbar,
} from '../_lib/noteCrossSelectState';
import { startTextDragSession } from '../_lib/noteTextDragSession';
import { getNoteEditor } from './noteEditorRegistry';
import {
  applyBlockPreviewCrossHighlight,
  applyBlockRowCrossHighlight,
  clearBlockPreviewCrossHighlight,
  getBlockPreviewTextRoot,
  hoverBlockPreviewTextPos,
} from './noteBlockPreviewCrossSelect';
import {
  applyToggleTitleCrossHighlight,
  clearToggleTitleCrossHighlight,
  getToggleTitleInput,
  rowHasToggleTitle,
} from './noteToggleTitleCrossSelect';
import {
  applyListCrossHighlight,
  bindListCrossHighlightEditorLookup,
  clearListCrossHighlight,
  type ListCrossRange,
} from './noteListCrossHighlight';
import { resolveNoteBlockIdFromPoint } from './noteBlockIdFromPoint';

export function getActiveListCrossRanges(): ListCrossRange[] {
  return getUnifiedCrossSelectRanges();
}

export function hasActiveMultiListCrossSelect(): boolean {
  return hasActiveMultiCrossSelect();
}

export function shouldSuppressListFormatToolbar(): boolean {
  return shouldSuppressCrossFormatToolbar();
}

function blockIdFromPoint(x: number, y: number, restrictToIds?: readonly string[]): string | null {
  return resolveNoteBlockIdFromPoint(x, y, restrictToIds ? { restrictToIds } : undefined);
}

function listTextTargetElement(target: EventTarget | null): HTMLElement | null {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isListTextTarget(target: EventTarget | null): boolean {
  const el = listTextTargetElement(target);
  if (!el) return false;
  return !!el.closest(
    '[data-note-list-text], [data-note-list-text] .ProseMirror, [data-note-list-text] [data-note-preview-text]',
  );
}

function blockIdFromPointerTarget(target: EventTarget | null): string | null {
  const el = listTextTargetElement(target);
  const row = el?.closest('[data-note-block-row]');
  const id = row?.getAttribute('data-block-id');
  return id && id.length > 0 ? id : null;
}

function getListSiblingIds(blockId: string): string[] {
  const allRows = [...document.querySelectorAll<HTMLElement>('[data-note-block-row]')]
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  const runs: string[][] = [];
  let current: string[] = [];
  for (const row of allRows) {
    const id = row.getAttribute('data-block-id');
    if (!id) continue;
    if (row.getAttribute('data-list-sibling') === 'true') {
      current.push(id);
      continue;
    }
    if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);
  for (const run of runs) {
    if (run.includes(blockId)) return run;
  }
  return [blockId];
}

function getOrderedBlockRowIds(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[data-note-block-row]')]
    .sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    })
    .map((row) => row.getAttribute('data-block-id'))
    .filter((id): id is string => !!id);
}

/** 비활성 목록 블록은 preview DOM — editor fallback 시 from=1 오프셋 버그 */
export function resolveListCrossSurface(
  hasEditor: boolean,
  hasPreviewRoot: boolean,
): CrossTextSurface {
  if (hasEditor) return 'editor';
  if (hasPreviewRoot) return 'preview';
  return 'preview';
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
    if (surface === 'list-preview' || surface === 'preview') {
      if (to <= from) applyBlockRowCrossHighlight(blockId);
      else applyBlockPreviewCrossHighlight(blockId, from, to);
      return;
    }
    const editor = getNoteEditor(blockId);
    if (editor) applyListCrossHighlight(editor, from, to);
    else applyBlockRowCrossHighlight(blockId);
  });

  getOrderedBlockRowIds().forEach((id) => {
    if (touched.has(id)) return;
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
    if (rowHasToggleTitle(id)) clearToggleTitleCrossHighlight(id);
    clearBlockPreviewCrossHighlight(id);
  });
}

function suppressNativeSelections(siblings: string[], activeBlockId?: string) {
  siblings.forEach((id) => {
    if (id === activeBlockId) return;
    const editor = getNoteEditor(id);
    if (editor) collapseEditorSelection(editor, 1);
  });
}

function clearAllCrossHighlights(siblings: string[]) {
  siblings.forEach((id) => {
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
    if (rowHasToggleTitle(id)) clearToggleTitleCrossHighlight(id);
    clearBlockPreviewCrossHighlight(id);
  });
}

function clearCrossSelectState() {
  clearUnifiedCrossSelectState();
}

export function reapplyActiveListCrossDecorations() {
  const ranges = getUnifiedCrossSelectRanges();
  if (ranges.length === 0) return;
  applyCrossDecorations(ranges);
  suppressNativeSelections(ranges.map((range) => range.blockId));
}

export function clearActiveListCrossSelectState() {
  const ranges = getUnifiedCrossSelectRanges();
  if (ranges.length > 0) {
    clearAllCrossHighlights(ranges.map((range) => range.blockId));
  }
  clearCrossSelectState();
}

function beginListTextDragSession(anchor: CrossSelectAnchor, startX: number, startY: number) {
  const siblings = getListSiblingIds(anchor.blockId);
  startTextDragSession({
    anchor,
    startX,
    startY,
    getSpanBlockIds: (hoverId) => {
      if (siblings.includes(hoverId)) return siblings;
      const order = getOrderedBlockRowIds();
      const anchorIdx = order.indexOf(anchor.blockId);
      const hoverIdx = order.indexOf(hoverId);
      if (anchorIdx < 0 || hoverIdx < 0) return siblings;
      const lo = Math.min(anchorIdx, hoverIdx);
      const hi = Math.max(anchorIdx, hoverIdx);
      return order.slice(lo, hi + 1);
    },
    resolveHoverBlockId: (x, y) => blockIdFromPoint(x, y),
    hoverCaretPos: (blockId, x, y) =>
      (siblings.includes(blockId) ? hoverListCaretPos(blockId, x, y) : hoverDocumentCaretPos(blockId, x, y)),
    getBlockMeta: (blockId) =>
      (siblings.includes(blockId) ? buildListCrossBlockMeta(blockId) : buildDocumentCrossBlockMeta(blockId)),
    onDragStart: () => clearActiveListCrossSelectState(),
    onIntraBlock: (x, y) => {
      if (anchor.surface === 'editor') {
        const editor = getNoteEditor(anchor.blockId);
        if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return;
        const coords = editor.view.posAtCoords({ left: x, top: y });
        const caretPos = coords?.pos ?? editor.state.doc.content.size;
        const from = Math.min(anchor.pos, caretPos);
        const to = Math.max(anchor.pos, caretPos);
        if (to > from) {
          editor.chain().focus().setTextSelection({ from, to }).run();
        }
        return;
      }
      const caret = hoverBlockPreviewTextPos(anchor.blockId, x, y);
      const from = Math.min(anchor.pos, caret);
      const to = Math.max(anchor.pos, caret);
      if (to > from) {
        const ranges = [{ blockId: anchor.blockId, from, to, surface: anchor.surface }];
        commitCrossSelectRanges(ranges, { listDrag: false });
        applyBlockPreviewCrossHighlight(anchor.blockId, from, to);
      } else {
        clearActiveListCrossSelectState();
      }
    },
    onCrossBlock: (ranges, x, y) => {
      if (!isMultiBlockCrossSelect(ranges)) return;
      commitCrossSelectRanges(ranges, { listDrag: true });
      suppressNativeSelections(siblings, blockIdFromPoint(x, y) ?? undefined);
      applyCrossDecorations(ranges);
      document.dispatchEvent(new CustomEvent('note-hide-format-toolbar'));
    },
    onFinalize: (ranges, x, y) => {
      if (!isMultiBlockCrossSelect(ranges)) {
        clearActiveListCrossSelectState();
        return;
      }
      commitCrossSelectRanges(ranges, { listDrag: false });
      const hoverId = blockIdFromPoint(x, y) ?? anchor.blockId;
      const focusRange = ranges.find((range) => range.blockId === hoverId) ?? ranges[ranges.length - 1];
      suppressNativeSelections(siblings, focusRange.blockId);
      applyCrossDecorations(ranges);
      const focusEditor = getNoteEditor(focusRange.blockId);
      if (focusEditor) {
        focusEditor.commands.focus();
        collapseEditorSelection(focusEditor, focusRange.to);
      }
      document.dispatchEvent(new CustomEvent('note-hide-format-toolbar'));
    },
    onAbort: () => {
      if (isListCrossDragActive()) clearActiveListCrossSelectState();
    },
  });
}

let bound = false;

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  if (isListTextTarget(e.target)) {
    document.body.style.userSelect = '';
  }
  if (!isListTextTarget(e.target)) {
    if (getUnifiedCrossSelectRanges().length > 0) {
      clearActiveListCrossSelectState();
    }
    return;
  }

  const blockId = blockIdFromPointerTarget(e.target) ?? blockIdFromPoint(e.clientX, e.clientY);
  if (!blockId) return;

  const editor = getNoteEditor(blockId);
  const previewRoot = getBlockPreviewTextRoot(blockId);
  if (!editor && !previewRoot) return;

  if (editor) {
    const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    beginListTextDragSession(
      { blockId, pos: coords?.pos ?? 1, surface: 'editor' },
      e.clientX,
      e.clientY,
    );
    return;
  }

  beginListTextDragSession(
    {
      blockId,
      pos: hoverBlockPreviewTextPos(blockId, e.clientX, e.clientY),
      surface: 'preview',
    },
    e.clientX,
    e.clientY,
  );
}

export function bindNoteListCrossTextSelect() {
  if (bound) return () => {};
  bound = true;
  bindListCrossHighlightEditorLookup(getNoteEditor);
  document.addEventListener('pointerdown', onPointerDown, true);
  return () => {
    bound = false;
    document.removeEventListener('pointerdown', onPointerDown, true);
    clearActiveListCrossSelectState();
  };
}

export function resolveListCrossRanges(
  siblings: string[],
  anchor: CrossSelectAnchor,
  hoverId: string,
  hoverCaretPos: number,
): CrossSelectRange[] {
  return resolveCrossRangesCore(siblings, anchor, hoverId, hoverCaretPos, buildListCrossBlockMeta);
}
