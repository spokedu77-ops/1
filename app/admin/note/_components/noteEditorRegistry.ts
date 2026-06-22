import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { hoverBlockPreviewTextPos } from './noteBlockPreviewCrossSelect';

const editors = new Map<string, Editor>();

export const pendingEditorClickRef = {
  current: null as { blockId: string; x: number; y: number } | null,
};

export const pendingSelectAllBlockIdRef = {
  current: null as string | null,
};

export function setPendingSelectAllBlock(blockId: string): void {
  pendingSelectAllBlockIdRef.current = blockId;
}

export function consumePendingSelectAllBlock(blockId: string | undefined): boolean {
  if (!blockId || pendingSelectAllBlockIdRef.current !== blockId) return false;
  pendingSelectAllBlockIdRef.current = null;
  return true;
}

export function selectAllNoteEditorText(editor: Editor): void {
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
  const from = 1;
  const to = Math.max(from, editor.state.doc.content.size - 1);
  if (to <= from) {
    editor.commands.focus();
    return;
  }
  editor.chain().focus().setTextSelection({ from, to }).run();
}

export function registerNoteEditor(blockId: string, editor: Editor) {
  editors.set(blockId, editor);
}

export function unregisterNoteEditor(blockId: string) {
  editors.delete(blockId);
}

export function getNoteEditor(blockId: string): Editor | null {
  const editor = editors.get(blockId);
  if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return null;
  return editor;
}

/** 싱글톤 에디터 — 포커스 블록 id가 어긋나도 활성 TipTap 인스턴스 조회 */
export function getActiveNoteEditor(focusedBlockId?: string | null): Editor | null {
  if (focusedBlockId) {
    const focused = getNoteEditor(focusedBlockId);
    if (focused) return focused;
  }
  for (const editor of editors.values()) {
    if (!(editor as { isDestroyed?: boolean }).isDestroyed) return editor;
  }
  return null;
}

export function setPendingEditorClick(blockId: string, x: number, y: number): void {
  pendingEditorClickRef.current = { blockId, x, y };
}

export function focusNoteEditorAtClick(blockId: string, editor: Editor): boolean {
  const pending = pendingEditorClickRef.current;
  if (!pending || pending.blockId !== blockId) return false;
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return false;

  let coords: { pos: number } | null = null;
  try {
    coords = editor.view.posAtCoords({ left: pending.x, top: pending.y });
  } catch {
    coords = null;
  }

  const docSize = editor.state.doc.content.size;
  let pos: number;
  if (coords) {
    pos = coords.pos;
  } else {
    const previewOffset = hoverBlockPreviewTextPos(blockId, pending.x, pending.y);
    pos = Math.max(1, Math.min(previewOffset + 1, docSize));
  }

  pendingEditorClickRef.current = null;
  editor.chain().focus().setTextSelection(pos).run();
  return true;
}

/** ProseMirror 레이아웃 직후 posAtCoords가 실패할 수 있어 몇 프레임 재시도 */
export function scheduleFocusNoteEditorAtClick(blockId: string | undefined, editor: Editor): void {
  if (!blockId) return;
  const pending = pendingEditorClickRef.current;
  if (!pending || pending.blockId !== blockId) return;

  const attempt = (framesLeft: number) => {
    if (focusNoteEditorAtClick(blockId, editor)) return;
    if (framesLeft <= 0) {
      if (pendingEditorClickRef.current?.blockId === blockId) {
        pendingEditorClickRef.current = null;
        editor.commands.focus();
      }
      return;
    }
    requestAnimationFrame(() => attempt(framesLeft - 1));
  };

  requestAnimationFrame(() => attempt(6));
}

export function collapseAllNoteEditorSelections() {
  editors.forEach((editor) => {
    if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
    const { state, view } = editor;
    const pos = Math.min(state.selection.from, state.doc.content.size - 1);
    const safe = Math.max(1, pos);
    view.dispatch(
      state.tr
        .setSelection(TextSelection.create(state.doc, safe))
        .setMeta('addToHistory', false),
    );
  });
}
