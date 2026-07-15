import { describe, expect, it, beforeEach } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { applyNoteCommand } from './noteCommandReducer';
import { mergeReconciledBlocks } from './noteBlockStateMerge';
import type { NoteBlock } from './types';

function block(id: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: '', html: '<p></p>' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

/**
 * syncWithServer / dispatchSnapshotIfChanged는 coordinator 구조를 authority로 쓴다.
 * 단, 미ack topology가 있으면 reducer가 local order를 보호한다.
 */
describe('coordinator structure authority on reconcile', () => {
  beforeEach(() => {
    useNoteBlockStore.setState({
      byId: {},
      order: [],
      activeDocumentId: 'doc-1',
      activeEditor: null,
    });
  });

  it('mergeReconciledBlocks keeps incoming order_index when no unpublished topology', () => {
    const staleStore = [
      block('a', { order_index: 0 }),
      block('b', { order_index: 1 }),
    ];
    const coordinatorIncoming = [
      block('b', { order_index: 0 }),
      block('a', { order_index: 1 }),
    ];
    useNoteBlockStore.getState().hydrate(staleStore);

    const merged = mergeReconciledBlocks(staleStore, coordinatorIncoming);

    expect(merged.map((item) => item.id)).toEqual(['b', 'a']);
    expect(merged.find((item) => item.id === 'b')?.order_index).toBe(0);
    expect(merged.find((item) => item.id === 'a')?.order_index).toBe(1);
  });

  it('syncSnapshot preserves local reorder when hasUnpublishedTopology', () => {
    const local = [
      block('todo-a', { type: 'todo', order_index: 0, content: { text: 'A', checked: false } }),
      block('todo-b', { type: 'todo', order_index: 1, content: { text: 'B', checked: false } }),
      block('todo-c', { type: 'todo', order_index: 2, content: { text: 'C', checked: false } }),
    ];
    const server = [
      block('todo-c', { type: 'todo', order_index: 0, content: { text: 'C', checked: false } }),
      block('todo-a', { type: 'todo', order_index: 1, content: { text: 'A', checked: false } }),
      block('todo-b', { type: 'todo', order_index: 2, content: { text: 'B', checked: false } }),
    ];
    useNoteBlockStore.getState().hydrate(local);

    const { blocks } = applyNoteCommand(
      local,
      { type: 'syncSnapshot', blocks: server },
      {
        documentId: 'doc-1',
        activeBlockId: null,
        storeContentById: {},
        hasUnpublishedTopology: true,
      },
    );

    expect(blocks.map((item) => item.id)).toEqual(['todo-a', 'todo-b', 'todo-c']);
    expect(blocks.map((item) => item.order_index)).toEqual([0, 1, 2]);
  });

  it('mergeReconciledBlocks keeps incoming parent_block_id when store is stale', () => {
    const staleStore = [
      block('parent', { order_index: 0 }),
      block('child', { order_index: 1, parent_block_id: null }),
    ];
    const coordinatorIncoming = [
      block('parent', { order_index: 0 }),
      block('child', { order_index: 0, parent_block_id: 'parent' }),
    ];
    useNoteBlockStore.getState().hydrate(staleStore);

    const merged = mergeReconciledBlocks(staleStore, coordinatorIncoming);

    expect(merged.find((item) => item.id === 'child')?.parent_block_id).toBe('parent');
  });
});
