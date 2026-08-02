/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { undoDepth } from '@tiptap/pm/history';
import {
  clearTipTapHistory,
  resolveNoteUndoTarget,
  tipTapHasUndoDepth,
} from './noteEditorHistory';

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

describe('resolveNoteUndoTarget (C3)', () => {
  it('prefers TipTap undo when depth > 0 even if structural stack exists', () => {
    expect(resolveNoteUndoTarget({
      tipTapUndoDepth: 2,
      tipTapRedoDepth: 0,
      structuralPasteArmed: false,
      hasStructuralUndo: true,
      hasStructuralRedo: false,
      shiftKey: false,
    })).toBe('tiptap-undo');
  });

  it('uses structural undo when TipTap depth is 0', () => {
    expect(resolveNoteUndoTarget({
      tipTapUndoDepth: 0,
      tipTapRedoDepth: 0,
      structuralPasteArmed: false,
      hasStructuralUndo: true,
      hasStructuralRedo: false,
      shiftKey: false,
    })).toBe('structural-undo');
  });

  it('paste-arm forces structural undo over TipTap depth', () => {
    expect(resolveNoteUndoTarget({
      tipTapUndoDepth: 3,
      tipTapRedoDepth: 0,
      structuralPasteArmed: true,
      hasStructuralUndo: true,
      hasStructuralRedo: false,
      shiftKey: false,
    })).toBe('structural-undo');
  });

  it('prefers TipTap redo when redo depth > 0', () => {
    expect(resolveNoteUndoTarget({
      tipTapUndoDepth: 0,
      tipTapRedoDepth: 1,
      structuralPasteArmed: false,
      hasStructuralUndo: false,
      hasStructuralRedo: true,
      shiftKey: true,
    })).toBe('tiptap-redo');
  });
});
