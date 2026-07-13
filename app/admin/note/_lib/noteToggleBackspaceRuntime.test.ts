import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from './types';
import { useNoteBlockStore } from '../_store/noteBlockStore';
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
    useNoteBlockStore.getState().replaceBlocks([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setNoteToggleBackspaceRuntime(null);
    useNoteBlockStore.getState().replaceBlocks([]);
  });

  it('empty backspace on first toggle child deletes and focuses title', async () => {
    const blocks = makeBlocks();
    useNoteBlockStore.getState().replaceBlocks(blocks);
    const blocksRef = { current: blocks };
    const focusBlockEditor = vi.fn();
    const handleDeleteBlock = vi.fn().mockResolvedValue(undefined);
    const handleMergeWithPreviousBlock = vi.fn();

    setNoteToggleBackspaceRuntime({
      blocksRef,
      focusBlockEditor,
      handleDeleteBlock,
      handleMergeWithPreviousBlock,
      handleChangeBlockType: vi.fn(),
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

  it('empty todo converts to text; after type=text deletes block', () => {
    const prev: NoteBlock = {
      id: 'prev-1',
      document_id: 'doc-1',
      type: 'text',
      content: { text: 'prev' },
      order_index: 0,
      parent_block_id: null,
      created_at: TEST_TS,
      updated_at: TEST_TS,
    };
    const todo: NoteBlock = {
      id: 'todo-1',
      document_id: 'doc-1',
      type: 'todo',
      content: { text: '', checked: false },
      order_index: 1,
      parent_block_id: null,
      created_at: TEST_TS,
      updated_at: TEST_TS,
    };
    useNoteBlockStore.getState().replaceBlocks([prev, todo]);
    const handleChangeBlockType = vi.fn(async (block: NoteBlock, type: NoteBlock['type']) => {
      useNoteBlockStore.getState().replaceBlocks([
        prev,
        { ...block, type, content: { text: '', html: '<p></p>' } },
      ]);
    });
    const handleDeleteBlock = vi.fn();
    const handleMergeWithPreviousBlock = vi.fn();

    setNoteToggleBackspaceRuntime({
      blocksRef: { current: [prev, todo] },
      focusBlockEditor: vi.fn(),
      handleDeleteBlock,
      handleMergeWithPreviousBlock,
      handleChangeBlockType,
    });

    invokeToggleChildEmptyBackspace('todo-1');
    expect(handleChangeBlockType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'todo-1' }),
      'text',
      { contentOverride: { text: '', html: '<p></p>' } },
    );
    expect(useNoteBlockStore.getState().getBlock('todo-1')?.type).toBe('text');
    expect(useNoteBlockStore.getState().getBlock('todo-1')?.content).toEqual({
      text: '',
      html: '<p></p>',
    });
    expect(handleDeleteBlock).not.toHaveBeenCalled();

    invokeToggleChildEmptyBackspace('todo-1');
    expect(handleDeleteBlock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'todo-1', type: 'text' }),
      true,
    );
    expect(handleMergeWithPreviousBlock).not.toHaveBeenCalled();
  });

  it('backspace at start on first toggle child focuses title', () => {
    const blocks = makeBlocks();
    blocks[1] = { ...blocks[1], content: { text: 'x', html: '<p>x</p>' } };
    useNoteBlockStore.getState().replaceBlocks(blocks);
    const blocksRef = { current: blocks };
    const focusBlockEditor = vi.fn();

    setNoteToggleBackspaceRuntime({
      blocksRef,
      focusBlockEditor,
      handleDeleteBlock: vi.fn(),
      handleMergeWithPreviousBlock: vi.fn(),
      handleChangeBlockType: vi.fn(),
    });

    const handled = invokeToggleChildBackspaceAtStart('child-1');
    expect(handled).toBe(true);
  });

  it('backspace at start on todo converts to text', () => {
    const todo: NoteBlock = {
      id: 'todo-1',
      document_id: 'doc-1',
      type: 'todo',
      parent_block_id: null,
      content: { text: 'item', checked: false },
      order_index: 0,
      created_at: TEST_TS,
      updated_at: TEST_TS,
    };
    useNoteBlockStore.getState().replaceBlocks([todo]);
    const handleChangeBlockType = vi.fn();
    setNoteToggleBackspaceRuntime({
      blocksRef: { current: [todo] },
      focusBlockEditor: vi.fn(),
      handleDeleteBlock: vi.fn(),
      handleMergeWithPreviousBlock: vi.fn(),
      handleChangeBlockType,
    });

    const handled = invokeToggleChildBackspaceAtStart('todo-1');
    expect(handled).toBe(true);
    expect(handleChangeBlockType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'todo-1' }),
      'text',
    );
  });
});
