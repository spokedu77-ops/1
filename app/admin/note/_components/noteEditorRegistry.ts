import type { Editor } from '@tiptap/react';

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

export function focusNoteEditorAtClick(blockId: string, editor: Editor): boolean {
  const pending = pendingEditorClickRef.current;
  if (!pending || pending.blockId !== blockId) return false;
  pendingEditorClickRef.current = null;
  const coords = editor.view.posAtCoords({ left: pending.x, top: pending.y });
  if (!coords) return false;
  editor.chain().focus().setTextSelection(coords.pos).run();
  return true;
}
