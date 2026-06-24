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
  resolveHeadingEnterAction,
  resolveInlineBlockEnterAction,
  resolvePageBlockEnterAction,
  resolveToggleBodyEnterAction,
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
      content: { text: ' world', html: '<p> world</p>', depth: 0 },
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

  it('empty root text Enter converts to text (no-op type)', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'text',
      text: '',
      parentBlockId: null,
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'convert-to-text' });
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

describe('resolveToggleBodyEnterAction', () => {
  it('Enter in toggle body adds child text block', () => {
    expect(resolveToggleBodyEnterAction()).toEqual({
      kind: 'add-child',
      blockType: 'text',
    });
  });

  it('mid-line Enter splits into child block content', () => {
    expect(resolveToggleBodyEnterAction({
      isEmpty: false,
      split: { beforeText: 'a', beforeHtml: '<p>a</p>', afterText: 'b', afterHtml: '<p>b</p>' },
    })).toEqual({
      kind: 'add-child',
      blockType: 'text',
      content: { text: 'b', html: '<p>b</p>', depth: 0 },
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
  it('empty block with previous merges', () => {
    expect(resolveEmptyBackspaceAction(true)).toEqual({ kind: 'merge-with-previous' });
  });

  it('empty first block deletes', () => {
    expect(resolveEmptyBackspaceAction(false)).toEqual({ kind: 'delete-block' });
  });
});

describe('createNotionEmptyBackspaceHandler', () => {
  it('merges when previous block exists', () => {
    const onMerge = vi.fn();
    const onDelete = vi.fn();
    const handler = createNotionEmptyBackspaceHandler({
      canMergeWithPrevious: () => true,
      onMergeWithPrevious: onMerge,
      onDeleteEmptyBlock: onDelete,
    });
    handler();
    expect(onMerge).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes when no previous block', () => {
    const onMerge = vi.fn();
    const onDelete = vi.fn();
    const handler = createNotionEmptyBackspaceHandler({
      canMergeWithPrevious: () => false,
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
    expect(resolveEditorShiftEnterAction(false)).toBeNull();
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
