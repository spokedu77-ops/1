import { describe, expect, it, vi } from 'vitest';
import {
  createNotionEmptyBackspaceHandler,
  handleNotionChromeBlockKeyDown,
  handleNotionPageBlockKeyDown,
  resolveCalloutEnterAction,
  resolveChromeBlockKeyAction,
  resolveCodeEnterAction,
  resolveEditorShiftEnterAction,
  resolveEmptyBackspaceAction,
  readToggleTitleText,
  resolveHeadingEnterAction,
  resolveInlineBackspaceAtStartAction,
  resolveInlineBlockEnterAction,
  resolveListBackspaceAtStartAction,
  resolveListEmptyBackspaceAction,
  resolvePageBlockEnterAction,
  resolveTableCellEnterAction,
  resolveToggleChildBackspaceAtStartAction,
  resolveToggleChildEmptyBackspaceAction,
  resolveToggleTitleBackspaceAction,
  resolveToggleTitleEnterAction,
  shouldEditorShiftEnterHardBreak,
} from './noteNotionBlockBehavior';

describe('resolveInlineBlockEnterAction (todo·text)', () => {
  it('mid-line Enter splits into new block below with trailing content', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'todo',
      text: 'hello world',
      parentBlockId: null,
      enterCtx: {
        isEmpty: false,
        split: { beforeText: 'hello', beforeHtml: '<p>hello</p>', afterText: ' world', afterHtml: '<p> world</p>' },
      },
    })).toEqual({
      kind: 'add-below',
      followType: 'todo',
      content: { text: ' world', html: '<p> world</p>' },
    });
  });

  it('non-empty Enter adds same-type block below', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'todo',
      text: 'buy milk',
      parentBlockId: 'parent-1',
    })).toEqual({ kind: 'add-below', followType: 'todo' });
  });

  it('empty nested Enter outdents (Notion checklist exit)', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'todo',
      text: '',
      parentBlockId: 'parent-1',
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'outdent' });
  });

  it('empty root todo Enter converts to plain text', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'todo',
      text: '   ',
      parentBlockId: null,
    })).toEqual({ kind: 'convert-to-text' });
  });

  it('empty root text Enter adds another text block below', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'text',
      text: '',
      parentBlockId: null,
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'add-below', followType: 'text' });
  });
});

describe('resolveToggleTitleEnterAction', () => {
  it('collapsed toggle title Enter adds sibling toggle', () => {
    expect(resolveToggleTitleEnterAction(true)).toEqual({
      kind: 'add-sibling',
      blockType: 'toggle',
    });
  });

  it('expanded toggle title Enter adds child text block', () => {
    expect(resolveToggleTitleEnterAction(false)).toEqual({
      kind: 'add-child',
      blockType: 'text',
    });
  });
});

describe('resolveHeadingEnterAction', () => {
  it('non-empty heading Enter adds text block below', () => {
    expect(resolveHeadingEnterAction({
      text: 'Chapter 1',
      parentBlockId: null,
    })).toEqual({ kind: 'add-below', followType: 'text' });
  });

  it('empty heading Enter converts to text paragraph', () => {
    expect(resolveHeadingEnterAction({
      text: '',
      parentBlockId: null,
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'convert-to-text' });
  });
});

describe('resolveEmptyBackspaceAction', () => {
  it('empty todo converts to text (step 1)', () => {
    expect(resolveEmptyBackspaceAction({
      blockType: 'todo',
      canMergeWithPrevious: true,
    })).toEqual({ kind: 'convert-to-text' });
  });

  it('empty text deletes block (step 2)', () => {
    expect(resolveEmptyBackspaceAction({
      blockType: 'text',
      canMergeWithPrevious: true,
    })).toEqual({ kind: 'delete-block' });
  });

  it('empty first text block deletes', () => {
    expect(resolveEmptyBackspaceAction({
      blockType: 'text',
      canMergeWithPrevious: false,
    })).toEqual({ kind: 'delete-block' });
  });
});

describe('toggle child keyboard parity', () => {
  it('empty toggle child text Enter adds sibling below (not outdent)', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'text',
      text: '',
      parentBlockId: 'toggle-1',
      parentBlockType: 'toggle',
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'add-below', followType: 'text' });
  });

  it('first toggle child empty backspace deletes and focuses title', () => {
    expect(resolveToggleChildEmptyBackspaceAction({
      parentBlockType: 'toggle',
      isFirstChildInToggle: true,
      canMergeWithPrevious: false,
    })).toEqual({ kind: 'delete-and-focus-toggle-title' });
  });

  it('second toggle child empty backspace merges with previous', () => {
    expect(resolveToggleChildEmptyBackspaceAction({
      parentBlockType: 'toggle',
      isFirstChildInToggle: false,
      canMergeWithPrevious: true,
    })).toEqual({ kind: 'merge-with-previous' });
  });

  it('first toggle child at start backspace focuses title', () => {
    expect(resolveToggleChildBackspaceAtStartAction({
      parentBlockType: 'toggle',
      isFirstChildInToggle: true,
    })).toEqual({ kind: 'focus-toggle-title' });
  });

  it('readToggleTitleText falls back to legacy text field', () => {
    expect(readToggleTitleText({ text: 'legacy title' })).toBe('legacy title');
    expect(readToggleTitleText({ title: 'new title' })).toBe('new title');
  });
});

describe('resolveToggleTitleBackspaceAction', () => {
  it('empty toggle title at start converts to text', () => {
    expect(resolveToggleTitleBackspaceAction({
      title: '',
      selectionStart: 0,
      selectionEnd: 0,
    })).toEqual({ kind: 'convert-to-text' });
  });

  it('non-empty toggle title at start navigates to previous block', () => {
    expect(resolveToggleTitleBackspaceAction({
      title: '78907890789',
      selectionStart: 0,
      selectionEnd: 0,
    })).toEqual({ kind: 'navigate-previous' });
  });

  it('keeps default behavior when caret is not at start', () => {
    expect(resolveToggleTitleBackspaceAction({
      title: 'Toggle',
      selectionStart: 1,
      selectionEnd: 1,
    })).toEqual({ kind: 'default' });
  });
});

describe('resolveInlineBackspaceAtStartAction', () => {
  it('decorated text blocks convert to paragraph before merging/deleting', () => {
    expect(resolveInlineBackspaceAtStartAction('heading')).toEqual({ kind: 'convert-to-text' });
    expect(resolveInlineBackspaceAtStartAction('heading2')).toEqual({ kind: 'convert-to-text' });
    expect(resolveInlineBackspaceAtStartAction('heading3')).toEqual({ kind: 'convert-to-text' });
    expect(resolveInlineBackspaceAtStartAction('todo')).toEqual({ kind: 'convert-to-text' });
    expect(resolveInlineBackspaceAtStartAction('callout')).toEqual({ kind: 'convert-to-text' });
    expect(resolveInlineBackspaceAtStartAction('quote')).toEqual({ kind: 'convert-to-text' });
    expect(resolveInlineBackspaceAtStartAction('code')).toEqual({ kind: 'convert-to-text' });
  });

  it('plain text and structural blocks use their own default behavior', () => {
    expect(resolveInlineBackspaceAtStartAction('text')).toEqual({ kind: 'default' });
    expect(resolveInlineBackspaceAtStartAction('bulletList')).toEqual({ kind: 'default' });
    expect(resolveInlineBackspaceAtStartAction('numberedList')).toEqual({ kind: 'default' });
    expect(resolveInlineBackspaceAtStartAction('toggle')).toEqual({ kind: 'default' });
    expect(resolveInlineBackspaceAtStartAction('page')).toEqual({ kind: 'default' });
  });
});

describe('createNotionEmptyBackspaceHandler', () => {
  it('converts decorated todo before merge', () => {
    const onConvert = vi.fn();
    const onMerge = vi.fn();
    const onDelete = vi.fn();
    const handler = createNotionEmptyBackspaceHandler({
      getBlockType: () => 'todo',
      canMergeWithPrevious: () => true,
      onConvertToText: onConvert,
      onMergeWithPrevious: onMerge,
      onDeleteEmptyBlock: onDelete,
    });
    handler();
    expect(onConvert).toHaveBeenCalledOnce();
    expect(onMerge).not.toHaveBeenCalled();
  });

  it('merges empty text when previous block exists', () => {
    const onMerge = vi.fn();
    const onDelete = vi.fn();
    const handler = createNotionEmptyBackspaceHandler({
      getBlockType: () => 'text',
      canMergeWithPrevious: () => true,
      onConvertToText: vi.fn(),
      onMergeWithPrevious: onMerge,
      onDeleteEmptyBlock: onDelete,
    });
    handler();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onMerge).not.toHaveBeenCalled();
  });

  it('deletes when no previous block', () => {
    const onMerge = vi.fn();
    const onDelete = vi.fn();
    const handler = createNotionEmptyBackspaceHandler({
      getBlockType: () => 'text',
      canMergeWithPrevious: () => false,
      onConvertToText: vi.fn(),
      onMergeWithPrevious: onMerge,
      onDeleteEmptyBlock: onDelete,
    });
    handler();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onMerge).not.toHaveBeenCalled();
  });
});

describe('resolveEditorShiftEnterAction', () => {
  it('Shift+Enter inserts hard break in same block', () => {
    expect(shouldEditorShiftEnterHardBreak(true)).toBe(true);
    expect(resolveEditorShiftEnterAction(true)).toEqual({ kind: 'hard-break' });
    expect(resolveEditorShiftEnterAction(true, { tabBehavior: 'table-cell-nav' })).toEqual({ kind: 'hard-break' });
    expect(resolveEditorShiftEnterAction(false)).toBeNull();
  });
});

describe('resolveTableCellEnterAction', () => {
  it('Shift+Enter hard-breaks inside cell', () => {
    expect(resolveTableCellEnterAction(true)).toEqual({ kind: 'hard-break' });
  });

  it('Enter defers to in-cell newline (Notion parity)', () => {
    expect(resolveTableCellEnterAction(false)).toEqual({ kind: 'defer' });
  });
});

describe('handleNotionPageBlockKeyDown', () => {
  it('Enter opens page', () => {
    const openPage = vi.fn();
    expect(handleNotionPageBlockKeyDown(
      { key: 'Enter', shiftKey: false },
      { isFocused: false, openPage },
    )).toBe(true);
    expect(openPage).toHaveBeenCalledOnce();
  });

  it('Shift+Enter does not open page', () => {
    const openPage = vi.fn();
    expect(handleNotionPageBlockKeyDown(
      { key: 'Enter', shiftKey: true },
      { isFocused: true, openPage },
    )).toBe(false);
    expect(openPage).not.toHaveBeenCalled();
  });

  it('Space opens page when focused', () => {
    const openPage = vi.fn();
    expect(handleNotionPageBlockKeyDown(
      { key: ' ', shiftKey: false },
      { isFocused: true, openPage },
    )).toBe(true);
    expect(openPage).toHaveBeenCalledOnce();
  });
});

describe('resolvePageBlockEnterAction', () => {
  it('page Enter opens linked document', () => {
    expect(resolvePageBlockEnterAction()).toEqual({ kind: 'open-page' });
  });
});

describe('resolveCalloutEnterAction', () => {
  it('non-empty callout Enter adds callout below', () => {
    expect(resolveCalloutEnterAction({
      text: 'Important',
      parentBlockId: null,
    })).toEqual({ kind: 'add-below', followType: 'callout' });
  });

  it('empty nested callout Enter outdents', () => {
    expect(resolveCalloutEnterAction({
      text: '',
      parentBlockId: 'toggle-1',
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'outdent' });
  });

  it('empty callout Enter converts to text', () => {
    expect(resolveCalloutEnterAction({
      text: '',
      parentBlockId: null,
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'convert-to-text' });
  });
});

describe('resolveCodeEnterAction', () => {
  it('non-empty code Enter adds code below', () => {
    expect(resolveCodeEnterAction({
      text: 'const x = 1',
      parentBlockId: null,
    })).toEqual({ kind: 'add-below', followType: 'code' });
  });

  it('empty nested code Enter outdents', () => {
    expect(resolveCodeEnterAction({
      text: '',
      parentBlockId: 'toggle-1',
    })).toEqual({ kind: 'outdent' });
  });

  it('empty code Enter converts to text', () => {
    expect(resolveCodeEnterAction({
      text: '',
      parentBlockId: null,
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'convert-to-text' });
  });
});

describe('resolveChromeBlockKeyAction', () => {
  it('Enter adds text below', () => {
    expect(resolveChromeBlockKeyAction('Enter', false)).toEqual({ kind: 'add-text-below' });
  });

  it('Shift+Enter is ignored', () => {
    expect(resolveChromeBlockKeyAction('Enter', true)).toBeNull();
  });

  it('Backspace deletes block', () => {
    expect(resolveChromeBlockKeyAction('Backspace', false)).toEqual({ kind: 'delete-block' });
  });
});

describe('handleNotionChromeBlockKeyDown', () => {
  it('Enter calls onAddBelow', () => {
    const onAddBelow = vi.fn();
    const onDelete = vi.fn();
    expect(handleNotionChromeBlockKeyDown(
      { key: 'Enter', shiftKey: false },
      { onAddBelow, onDelete },
    )).toBe(true);
    expect(onAddBelow).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('Backspace calls onDelete', () => {
    const onAddBelow = vi.fn();
    const onDelete = vi.fn();
    expect(handleNotionChromeBlockKeyDown(
      { key: 'Backspace', shiftKey: false },
      { onAddBelow, onDelete },
    )).toBe(true);
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onAddBelow).not.toHaveBeenCalled();
  });
});

describe('resolveInlineBlockEnterAction (lists)', () => {
  it('empty nested bullet Enter outdents', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'bulletList',
      text: '',
      parentBlockId: 'list-parent',
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'outdent' });
  });

  it('empty root bullet Enter converts to text', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'bulletList',
      text: '',
      parentBlockId: null,
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'convert-to-text' });
  });

  it('empty nested numbered Enter outdents', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'numberedList',
      text: '',
      parentBlockId: 'list-parent',
    })).toEqual({ kind: 'outdent' });
  });
});

describe('resolveListBackspaceAtStartAction', () => {
  it('empty nested item outdents', () => {
    expect(resolveListBackspaceAtStartAction({
      itemText: '',
      parentBlockId: 'parent',
      canMergeWithPrevious: false,
    })).toEqual({ kind: 'outdent' });
  });

  it('empty root item converts to text', () => {
    expect(resolveListBackspaceAtStartAction({
      itemText: '',
      parentBlockId: null,
      canMergeWithPrevious: false,
    })).toEqual({ kind: 'convert-to-text' });
  });

  it('non-empty at start merges when previous exists', () => {
    expect(resolveListBackspaceAtStartAction({
      itemText: 'item',
      parentBlockId: null,
      canMergeWithPrevious: true,
    })).toEqual({ kind: 'merge-with-previous' });
  });

  it('non-empty nested at start outdents when merge unavailable', () => {
    expect(resolveListBackspaceAtStartAction({
      itemText: 'nested',
      parentBlockId: 'parent',
      canMergeWithPrevious: false,
    })).toEqual({ kind: 'outdent' });
  });

  it('non-empty root at start converts to text when merge unavailable', () => {
    expect(resolveListBackspaceAtStartAction({
      itemText: 'solo',
      parentBlockId: null,
      canMergeWithPrevious: false,
    })).toEqual({ kind: 'convert-to-text' });
  });
});

describe('resolveListEmptyBackspaceAction', () => {
  it('nested outdents, root converts', () => {
    expect(resolveListEmptyBackspaceAction('parent')).toEqual({ kind: 'outdent' });
    expect(resolveListEmptyBackspaceAction(null)).toEqual({ kind: 'convert-to-text' });
  });
});
