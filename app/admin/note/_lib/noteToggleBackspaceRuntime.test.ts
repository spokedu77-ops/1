import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from './types';
import {
  invokeToggleChildBackspaceAtStart,
  invokeToggleChildEmptyBackspace,
  setNoteToggleBackspaceRuntime,
} from './noteToggleBackspaceRuntime';

const TEST_TS = '2026-01-01T00:00:00.000Z';

function makeBlocks(): NoteBlock[] {
  const toggle: NoteBlock = {
    id: 'toggle-1',
    document_id: 'doc-1',
    type: 'toggle',
    content: { title: 'Toggle Title', collapsed: false },
    order_index: 0,
    parent_block_id: null,
    created_at: TEST_TS,
    updated_at: TEST_TS,
  };
  const child: NoteBlock = {
    id: 'child-1',
    document_id: 'doc-1',
    type: 'text',
    content: { text: '', html: '<p></p>' },
    order_index: 0,
    parent_block_id: 'toggle-1',
    created_at: TEST_TS,
    updated_at: TEST_TS,
  };
  return [toggle, child];
}

describe('noteToggleBackspaceRuntime', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setNoteToggleBackspaceRuntime(null);
  });
  it('empty backspace on first toggle child deletes and focuses title', async () => {
    const blocksRef = { current: makeBlocks() };
    const focusBlockEditor = vi.fn();
    const handleDeleteBlock = vi.fn().mockResolvedValue(undefined);
    const handleMergeWithPreviousBlock = vi.fn();

    setNoteToggleBackspaceRuntime({
      blocksRef,
      focusBlockEditor,
      handleDeleteBlock,
      handleMergeWithPreviousBlock,
    });

    invokeToggleChildEmptyBackspace('child-1');
    await Promise.resolve();
    await Promise.resolve();

    expect(handleDeleteBlock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'child-1' }),
      false,
    );
    expect(handleMergeWithPreviousBlock).not.toHaveBeenCalled();
  });

  it('backspace at start on first toggle child focuses title', () => {
    const blocks = makeBlocks();
    blocks[1] = { ...blocks[1], content: { text: 'x', html: '<p>x</p>' } };
    const blocksRef = { current: blocks };
    const focusBlockEditor = vi.fn();

    setNoteToggleBackspaceRuntime({
      blocksRef,
      focusBlockEditor,
      handleDeleteBlock: vi.fn(),
      handleMergeWithPreviousBlock: vi.fn(),
    });

    const handled = invokeToggleChildBackspaceAtStart('child-1');
    expect(handled).toBe(true);
  });
});
