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
