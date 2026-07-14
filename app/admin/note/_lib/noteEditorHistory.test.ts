/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { undoDepth } from '@tiptap/pm/history';
import { clearTipTapHistory, tipTapHasUndoDepth } from './noteEditorHistory';

describe('noteEditorHistory', () => {
  it('clearTipTapHistory resets undoDepth after block remap setContent', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          undoRedo: { depth: 100, newGroupDelay: 300 },
        }),
      ],
      content: '<p>hello</p>',
    });

    editor.commands.insertContent(' world');
    expect(undoDepth(editor.state)).toBeGreaterThan(0);

    editor
      .chain()
      .command(({ tr }) => {
        tr.setMeta('addToHistory', false);
        return true;
      })
      .setContent('<p>other</p>', { emitUpdate: false })
      .run();

    clearTipTapHistory(editor);
    expect(undoDepth(editor.state)).toBe(0);
    expect(tipTapHasUndoDepth(editor)).toBe(false);

    editor.destroy();
    element.remove();
  });
});
