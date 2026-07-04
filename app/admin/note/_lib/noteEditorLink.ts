import type { Editor } from '@tiptap/react';

export type NoteLinkEditorSession = {
  anchor: { top: number; left: number };
  initialUrl: string;
  applyUrl: (url: string) => void;
  cancel: () => void;
};

let linkSession: NoteLinkEditorSession | null = null;
const linkListeners = new Set<() => void>();

function emitLinkEditor() {
  linkListeners.forEach((listener) => listener());
}

export function subscribeNoteLinkEditor(listener: () => void) {
  linkListeners.add(listener);
  return () => {
    linkListeners.delete(listener);
  };
}

export function getNoteLinkEditorSession(): NoteLinkEditorSession | null {
  return linkSession;
}

export function openNoteLinkEditor(session: NoteLinkEditorSession) {
  document.dispatchEvent(new CustomEvent('note-hide-format-toolbar'));
  linkSession = session;
  emitLinkEditor();
}

export function closeNoteLinkEditor() {
  if (!linkSession) return;
  linkSession = null;
  emitLinkEditor();
}

export function resolveLinkEditorAnchor(editor: Editor): { top: number; left: number } {
  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);
  return { left: coords.left, top: coords.top - 8 };
}

/** url 빈 문자열이면 링크 제거 */
export function applyLinkUrlToEditor(editor: Editor, url: string) {
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
  const trimmed = url.trim();
  if (!trimmed) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  const { empty, from } = editor.state.selection;
  if (empty) {
    editor.chain().focus().insertContent(trimmed).setTextSelection({
      from,
      to: from + trimmed.length,
    }).setLink({ href: trimmed }).run();
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
}

export function beginNoteLinkEdit(options: {
  editor: Editor;
  flush: () => void;
}) {
  const { editor, flush } = options;
  if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
  const previousUrl = String(editor.getAttributes('link').href ?? '');
  openNoteLinkEditor({
    anchor: resolveLinkEditorAnchor(editor),
    initialUrl: previousUrl || 'https://',
    applyUrl: (url) => {
      applyLinkUrlToEditor(editor, url);
      flush();
      closeNoteLinkEditor();
    },
    cancel: () => {
      closeNoteLinkEditor();
    },
  });
}
