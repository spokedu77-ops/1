import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { getNoteEditor } from './noteEditorRegistry';
import {
  applyListCrossHighlight,
  bindListCrossHighlightEditorLookup,
  clearListCrossHighlight,
  extractListCrossText,
  type ListCrossRange,
} from './noteListCrossHighlight';

const DRAG_THRESHOLD = 4;
const BODY_CROSS_CLASS = 'note-list-cross-active';

type Anchor = {
  blockId: string;
  pos: number;
};

let anchor: Anchor | null = null;
let pointerDown = false;
let dragging = false;
let listCrossDragActive = false;
let startX = 0;
let startY = 0;
let bound = false;
let activeCrossRanges: ListCrossRange[] = [];

export function getActiveListCrossRanges(): ListCrossRange[] {
  return activeCrossRanges;
}

export function hasActiveMultiListCrossSelect(): boolean {
  return activeCrossRanges.length > 1;
}

export function shouldSuppressListFormatToolbar(): boolean {
  return listCrossDragActive || activeCrossRanges.length > 1;
}

function syncBodyCrossClass() {
  document.body.classList.toggle(BODY_CROSS_CLASS, listCrossDragActive);
}

function blockIdFromPoint(x: number, y: number): string | null {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    const row = (el as HTMLElement).closest?.('[data-note-block-row]');
    if (!row) continue;
    const id = row.getAttribute('data-block-id');
    if (id) return id;
  }
  return null;
}

function listTextTargetElement(target: EventTarget | null): HTMLElement | null {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isListTextTarget(target: EventTarget | null): boolean {
  return !!listTextTargetElement(target)?.closest('[data-note-list-text] .ProseMirror');
}

function listRow(blockId: string): HTMLElement | null {
  return document.querySelector(`[data-note-block-row][data-block-id="${blockId}"]`);
}

function getListSiblingIds(blockId: string): string[] {
  const row = listRow(blockId);
  if (!row) return [blockId];
  const parentId = row.getAttribute('data-parent-block-id');
  const selector = parentId
    ? `[data-note-block-row][data-parent-block-id="${parentId}"][data-list-sibling="true"]`
    : `[data-note-block-row][data-parent-block-id=""][data-list-sibling="true"], [data-note-block-row]:not([data-parent-block-id])[data-list-sibling="true"]`;
  const rows = [...document.querySelectorAll<HTMLElement>(selector)]
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  const ids = rows.map((r) => r.getAttribute('data-block-id')).filter((id): id is string => !!id);
  return ids.length > 0 ? ids : [blockId];
}

function hoverPos(editor: Editor, x: number, y: number): number {
  const coords = editor.view.posAtCoords({ left: x, top: y });
  return coords?.pos ?? editor.state.doc.content.size - 1;
}

function resolveCrossRanges(
  siblings: string[],
  anchorState: Anchor,
  hoverId: string,
  hoverCaretPos: number,
): ListCrossRange[] {
  const anchorIdx = siblings.indexOf(anchorState.blockId);
  const hoverIdx = siblings.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) return [];

  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);
  const ranges: ListCrossRange[] = [];

  for (let i = lo; i <= hi; i += 1) {
    const blockId = siblings[i];
    const editor = getNoteEditor(blockId);
    if (!editor) continue;
    const docEnd = editor.state.doc.content.size - 1;
    let from = 1;
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
        from = 1;
        to = hoverCaretPos;
      } else {
        from = 1;
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
        from = 1;
        to = anchorState.pos;
      } else {
        from = 1;
        to = hoverCaretPos;
      }
    }

    ranges.push({ blockId, from, to });
  }

  return ranges;
}

function clearAllCrossHighlights(siblings: string[]) {
  siblings.forEach((id) => {
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
  });
}

function collapseEditorSelection(editor: Editor, pos?: number) {
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
  const { state, view } = editor;
  const docSize = state.doc.content.size;
  const safe = Math.max(1, Math.min(pos ?? state.selection.from, docSize - 1));
  view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, safe)));
}

function suppressNativeSelections(siblings: string[], activeBlockId?: string) {
  siblings.forEach((id) => {
    if (id === activeBlockId) return;
    const editor = getNoteEditor(id);
    if (editor) collapseEditorSelection(editor, 1);
  });
}

function applyCrossDecorations(ranges: ListCrossRange[]) {
  const touched = new Set<string>();
  ranges.forEach(({ blockId, from, to }) => {
    const editor = getNoteEditor(blockId);
    if (!editor) return;
    touched.add(blockId);
    applyListCrossHighlight(editor, from, to);
  });

  const siblingIds = ranges.length > 0 ? getListSiblingIds(ranges[0].blockId) : [];
  siblingIds.forEach((id) => {
    if (touched.has(id)) return;
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
  });
}

function clearCrossSelectState() {
  activeCrossRanges = [];
  listCrossDragActive = false;
  syncBodyCrossClass();
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  if (isListTextTarget(e.target)) {
    document.body.style.userSelect = '';
  }
  if (!isListTextTarget(e.target)) {
    if (activeCrossRanges.length > 0) {
      const siblings = getListSiblingIds(activeCrossRanges[0].blockId);
      clearAllCrossHighlights(siblings);
      clearCrossSelectState();
    }
    return;
  }

  const blockId = blockIdFromPoint(e.clientX, e.clientY);
  if (!blockId) return;
  const editor = getNoteEditor(blockId);
  if (!editor) return;

  const siblings = getListSiblingIds(blockId);
  if (activeCrossRanges.length > 0) {
    clearAllCrossHighlights(siblings);
    clearCrossSelectState();
  }

  const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
  anchor = { blockId, pos: coords?.pos ?? 1 };
  pointerDown = true;
  dragging = false;
  startX = e.clientX;
  startY = e.clientY;
}

function onPointerMove(e: PointerEvent) {
  if (!pointerDown || !anchor || e.buttons !== 1) return;

  const dx = Math.abs(e.clientX - startX);
  const dy = Math.abs(e.clientY - startY);
  if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;

  const hoverId = blockIdFromPoint(e.clientX, e.clientY);
  if (!hoverId) return;

  const siblings = getListSiblingIds(anchor.blockId);
  if (!siblings.includes(hoverId)) return;

  // 같은 블록 안 드래그는 TipTap 기본 텍스트 선택에 맡김
  if (hoverId === anchor.blockId) {
    if (listCrossDragActive) {
      listCrossDragActive = false;
      syncBodyCrossClass();
      clearAllCrossHighlights(siblings);
      // 잠시 형제 블록으로 이탈했다 돌아온 경우 — anchor 블록 선택 복원
      const anchorEditor = getNoteEditor(anchor.blockId);
      if (anchorEditor && !(anchorEditor as { isDestroyed?: boolean }).isDestroyed) {
        const caretPos = hoverPos(anchorEditor, e.clientX, e.clientY);
        const from = Math.min(anchor.pos, caretPos);
        const to = Math.max(anchor.pos, caretPos);
        if (to > from) {
          anchorEditor.chain().focus().setTextSelection({ from, to }).run();
        }
      }
    }
    return;
  }

  // 가로 드래그(단어 선택)는 브라우저·TipTap 기본 선택에 맡김
  if (dx >= dy) return;

  dragging = true;

  const hoverEditor = getNoteEditor(hoverId);
  if (!hoverEditor) return;

  const ranges = resolveCrossRanges(
    siblings,
    anchor,
    hoverId,
    hoverPos(hoverEditor, e.clientX, e.clientY),
  );

  if (ranges.length > 1) {
    e.preventDefault();
    listCrossDragActive = true;
    syncBodyCrossClass();
    suppressNativeSelections(siblings, hoverId);
    applyCrossDecorations(ranges);
    document.dispatchEvent(new CustomEvent('note-hide-format-toolbar'));
  }
}

function onPointerUp(e: PointerEvent) {
  if (!pointerDown) return;

  const wasDragging = dragging;
  const currentAnchor = anchor;

  pointerDown = false;
  dragging = false;
  anchor = null;

  if (!wasDragging || !currentAnchor) {
    listCrossDragActive = false;
    syncBodyCrossClass();
    return;
  }

  const hoverId = blockIdFromPoint(e.clientX, e.clientY) ?? currentAnchor.blockId;
  const siblings = getListSiblingIds(currentAnchor.blockId);
  const endEditor = getNoteEditor(hoverId);
  if (!endEditor) {
    listCrossDragActive = false;
    syncBodyCrossClass();
    return;
  }

  const ranges = resolveCrossRanges(
    siblings,
    currentAnchor,
    hoverId,
    hoverPos(endEditor, e.clientX, e.clientY),
  );

  listCrossDragActive = false;

  if (ranges.length <= 1) {
    clearCrossSelectState();
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const focusRange = ranges.find((range) => range.blockId === hoverId) ?? ranges[ranges.length - 1];

  activeCrossRanges = ranges;
  syncBodyCrossClass();
  suppressNativeSelections(siblings, focusRange.blockId);
  applyCrossDecorations(ranges);
  const focusEditor = getNoteEditor(focusRange.blockId);
  if (focusEditor) {
    focusEditor.commands.focus();
    collapseEditorSelection(focusEditor, focusRange.to);
  }

  document.dispatchEvent(new CustomEvent('note-hide-format-toolbar'));
}

function onCopy(e: ClipboardEvent) {
  if (activeCrossRanges.length <= 1) return;
  const text = extractListCrossText(activeCrossRanges);
  if (!text) return;
  e.preventDefault();
  e.clipboardData?.setData('text/plain', text);
}

export function bindNoteListCrossTextSelect() {
  if (bound) return () => {};
  bound = true;
  bindListCrossHighlightEditorLookup(getNoteEditor);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerUp, true);
  document.addEventListener('copy', onCopy, true);
  return () => {
    bound = false;
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
    document.removeEventListener('copy', onCopy, true);
    pointerDown = false;
    dragging = false;
    anchor = null;
    clearCrossSelectState();
    const siblings = activeCrossRanges[0]
      ? getListSiblingIds(activeCrossRanges[0].blockId)
      : [];
    clearAllCrossHighlights(siblings);
    activeCrossRanges = [];
  };
}
