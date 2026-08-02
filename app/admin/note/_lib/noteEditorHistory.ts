import { history, redoDepth, undoDepth } from '@tiptap/pm/history';
import { EditorState } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';

const HISTORY_OPTIONS = { depth: 100, newGroupDelay: 300 } as const;

function isHistoryPlugin(plugin: { key?: string }): boolean {
  const key = plugin.key;
  return typeof key === 'string' && key.startsWith('history');
}

/**
 * 싱글톤 TipTap이 블록 전환 시 setContent(addToHistory:false)만 하면
 * history는 remap만 되어 ghost undo가 Ctrl+Z를 가로챈다. history plugin을 교체해 비운다.
 */
export function clearTipTapHistory(editor: Editor): void {
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
  const { state, view } = editor;
  const plugins = state.plugins.map((plugin) => (
    isHistoryPlugin(plugin as { key?: string })
      ? history(HISTORY_OPTIONS)
      : plugin
  ));
  view.updateState(
    EditorState.create({
      schema: state.schema,
      doc: state.doc,
      selection: state.selection,
      plugins,
    }),
  );
}

/** ghost history와 구분 — depth가 있을 때만 TipTap undo/redo 우선 */
export function tipTapHasUndoDepth(editor: Editor): boolean {
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return false;
  return undoDepth(editor.state) > 0;
}

export function tipTapHasRedoDepth(editor: Editor): boolean {
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return false;
  return redoDepth(editor.state) > 0;
}

export function readTipTapUndoDepth(editor: Editor | null | undefined): number {
  if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return 0;
  return undoDepth(editor.state);
}

export function readTipTapRedoDepth(editor: Editor | null | undefined): number {
  if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return 0;
  return redoDepth(editor.state);
}

/** C3 — 구조 붙여넣기 직후 첫 Ctrl+Z는 structural (TipTap history 비움과 짝) */
let structuralPasteUndoArmed = false;

export function armStructuralPasteUndo(): void {
  structuralPasteUndoArmed = true;
}

export function isStructuralPasteUndoArmed(): boolean {
  return structuralPasteUndoArmed;
}

export function consumeStructuralPasteUndoArmed(): boolean {
  if (!structuralPasteUndoArmed) return false;
  structuralPasteUndoArmed = false;
  return true;
}

/** C3 Ctrl+Z 단일 해석 — Keyboard·NoteEditor 동일 */
export type NoteUndoTarget =
  | 'tiptap-undo'
  | 'tiptap-redo'
  | 'structural-undo'
  | 'structural-redo'
  | 'none';

export function resolveNoteUndoTarget(options: {
  tipTapUndoDepth: number;
  tipTapRedoDepth: number;
  structuralPasteArmed: boolean;
  hasStructuralUndo: boolean;
  hasStructuralRedo: boolean;
  shiftKey: boolean;
}): NoteUndoTarget {
  if (!options.shiftKey) {
    if (options.structuralPasteArmed && options.hasStructuralUndo) return 'structural-undo';
    if (options.tipTapUndoDepth > 0) return 'tiptap-undo';
    if (options.hasStructuralUndo) return 'structural-undo';
    return 'none';
  }
  if (options.tipTapRedoDepth > 0) return 'tiptap-redo';
  if (options.hasStructuralRedo) return 'structural-redo';
  return 'none';
}
