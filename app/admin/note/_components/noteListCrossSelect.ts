import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { getNoteEditor } from './noteEditorRegistry';
import {
  applyBlockPreviewCrossHighlight,
  clearBlockPreviewCrossHighlight,
  getBlockPreviewTextRoot,
  hoverBlockPreviewTextPos,
  listPreviewPlainText,
} from './noteBlockPreviewCrossSelect';
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
  surface: 'editor' | 'list-preview' | 'preview';
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
  const el = listTextTargetElement(target);
  if (!el) return false;
  return !!el.closest('[data-note-list-text] .ProseMirror, [data-note-list-text] [data-note-preview-text]');
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

function hoverPos(editor: Editor, x: number, y: number): number {
  const coords = editor.view.posAtCoords({ left: x, top: y });
  return coords?.pos ?? editor.state.doc.content.size - 1;
}

function listCaretPos(blockId: string, clientX: number, clientY: number): number {
  const editor = getNoteEditor(blockId);
  if (editor) return hoverPos(editor, clientX, clientY);
  if (getBlockPreviewTextRoot(blockId)) {
    return hoverBlockPreviewTextPos(blockId, clientX, clientY);
  }
  return 0;
}

function listTextEnd(blockId: string): number {
  const editor = getNoteEditor(blockId);
  if (editor) return editor.state.doc.content.size - 1;
  return listPreviewPlainText(blockId).length;
}

function listCrossSurface(blockId: string): ListCrossRange['surface'] {
  if (getNoteEditor(blockId)) return 'editor';
  if (getBlockPreviewTextRoot(blockId)) return 'preview';
  return 'editor';
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
    const surface = listCrossSurface(blockId);
    const docEnd = listTextEnd(blockId);
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

function clearAllCrossHighlights(siblings: string[]) {
  siblings.forEach((id) => {
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
    clearBlockPreviewCrossHighlight(id);
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
  ranges.forEach(({ blockId, from, to, surface }) => {
    if (surface === 'list-preview' || surface === 'preview') {
      touched.add(blockId);
      applyBlockPreviewCrossHighlight(blockId, from, to);
      return;
    }
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
    clearBlockPreviewCrossHighlight(id);
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
  const previewRoot = getBlockPreviewTextRoot(blockId);
  if (!editor && !previewRoot) return;

  const siblings = getListSiblingIds(blockId);
  if (activeCrossRanges.length > 0) {
    clearAllCrossHighlights(siblings);
    clearCrossSelectState();
  }

  if (editor) {
    const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    anchor = { blockId, pos: coords?.pos ?? 1, surface: 'editor' };
  } else {
    anchor = {
      blockId,
      pos: hoverBlockPreviewTextPos(blockId, e.clientX, e.clientY),
      surface: 'preview',
    };
  }
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

  const hoverCaret = listCaretPos(hoverId, e.clientX, e.clientY);

  const ranges = resolveCrossRanges(
    siblings,
    anchor,
    hoverId,
    hoverCaret,
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

  const ranges = resolveCrossRanges(
    siblings,
    currentAnchor,
    hoverId,
    listCaretPos(hoverId, e.clientX, e.clientY),
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
