import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { getNoteEditor } from './noteEditorRegistry';
import {
  applyListCrossHighlight,
  clearListCrossHighlight,
  extractListCrossText,
  type ListCrossRange,
} from './noteListCrossHighlight';

export type CrossSelectRange = ListCrossRange;

type Anchor = {
  blockId: string;
  pos: number;
};

let activeCrossRanges: CrossSelectRange[] = [];
let copyBound = false;

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
    if (id && getNoteEditor(id)) return id;
  }
  return null;
}

/** 화면에 보이는 텍스트 에디터 블록 id — 위→아래 문서 순 */
export function getOrderedSelectableBlockIds(): string[] {
  const rows = [...document.querySelectorAll<HTMLElement>('[data-note-block-row]')]
    .filter((row) => {
      const id = row.getAttribute('data-block-id');
      return !!id && !!getNoteEditor(id);
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
  });
}

export function clearAllCrossSelectState() {
  const touched = new Set<string>();
  activeCrossRanges.forEach(({ blockId }) => touched.add(blockId));
  clearCrossHighlightsForBlocks([...touched]);
  activeCrossRanges = [];
}

function applyCrossDecorations(ranges: CrossSelectRange[]) {
  const touched = new Set<string>();
  ranges.forEach(({ blockId, from, to }) => {
    const editor = getNoteEditor(blockId);
    if (!editor) return;
    touched.add(blockId);
    applyListCrossHighlight(editor, from, to);
  });

  const order = getOrderedSelectableBlockIds();
  order.forEach((id) => {
    if (touched.has(id)) return;
    const editor = getNoteEditor(id);
    if (editor) clearListCrossHighlight(editor);
  });
}

function suppressNativeSelections(blockIds: string[], activeBlockId?: string) {
  blockIds.forEach((id) => {
    if (id === activeBlockId) return;
    const editor = getNoteEditor(id);
    if (editor) collapseEditorSelection(editor, 1);
  });
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

  const hoverEditor = getNoteEditor(hoverId);
  if (!hoverEditor) return [];

  const ranges = resolveCrossRanges(
    span,
    anchor,
    hoverId,
    hoverPos(hoverEditor, clientX, clientY),
  );

  if (ranges.length <= 1) return [];

  activeCrossRanges = ranges;
  suppressNativeSelections(span, hoverId);
  applyCrossDecorations(ranges);

  const focusRange = ranges.find((r) => r.blockId === hoverId) ?? ranges[ranges.length - 1];
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
  const endEditor = getNoteEditor(hoverId);
  if (!endEditor || span.length <= 1) {
    clearAllCrossSelectState();
    return [];
  }

  const ranges = resolveCrossRanges(
    span,
    anchor,
    hoverId,
    hoverPos(endEditor, clientX, clientY),
  );

  if (ranges.length <= 1) {
    clearAllCrossSelectState();
    return [];
  }

  activeCrossRanges = ranges;
  applyCrossDecorations(ranges);
  const focusRange = ranges.find((r) => r.blockId === hoverId) ?? ranges[ranges.length - 1];
  const focusEditor = getNoteEditor(focusRange.blockId);
  if (focusEditor) {
    focusEditor.commands.focus();
    collapseEditorSelection(focusEditor, focusRange.to);
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

export function bindNoteCrossSelectCopy() {
  if (copyBound) return () => {};
  copyBound = true;
  document.addEventListener('copy', onCopy, true);
  return () => {
    copyBound = false;
    document.removeEventListener('copy', onCopy, true);
  };
}
