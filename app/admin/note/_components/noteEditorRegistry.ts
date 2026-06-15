import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';

const editors = new Map<string, Editor>();

export const pendingEditorClickRef = {
  current: null as { blockId: string; x: number; y: number } | null,
};

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
    return false;
  }
  if (!coords) return false;

  pendingEditorClickRef.current = null;
  editor.chain().focus().setTextSelection(coords.pos).run();
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
    view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, safe)));
  });
}
