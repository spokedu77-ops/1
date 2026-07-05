import { describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from './types';
import { insertPastedBlockSpecsAfterBlock } from './notePasteInsert';

function block(
  id: string,
  type: NoteBlock['type'],
  order: number,
  parentId: string | null = null,
): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    type,
    order_index: order,
    parent_block_id: parentId,
    content: { text: id },
    created_at: '',
    updated_at: '',
  };
}

describe('insertPastedBlockSpecsAfterBlock nested lists', () => {
  it('inserts nested siblings under separate parents with correct order', async () => {
    const blocks: NoteBlock[] = [block('anchor', 'text', 0)];
    const blocksRef = { current: blocks };
    const created: Array<{ parentId: string | null; type: string; index: number; id: string }> = [];
    let seq = 0;

    const ctx = {
      blocksRef,
      insertBlockAmongSiblings: vi.fn(async (
        parentId: string | null,
        type: NoteBlock['type'],
        insertIndex: number,
      ) => {
        seq += 1;
        const id = `n${seq}`;
        created.push({ parentId, type, index: insertIndex, id });
        const next = {
          ...block(id, type, insertIndex, parentId),
          order_index: insertIndex,
        };
        blocksRef.current = [...blocksRef.current, next];
        return next;
      }),
      changeBlockType: vi.fn(async () => {}),
      syncBlockContent: vi.fn(),
    };

    await insertPastedBlockSpecsAfterBlock(
      ctx,
      blocksRef.current[0],
      [
        { type: 'bulletList', text: 'Root A', listNestLevel: 0 },
        { type: 'bulletList', text: 'Child A1', listNestLevel: 1 },
        { type: 'bulletList', text: 'Child A2', listNestLevel: 1 },
        { type: 'bulletList', text: 'Root B', listNestLevel: 0 },
      ],
      {},
    );

    expect(created).toEqual([
      { parentId: null, type: 'bulletList', index: 1, id: 'n1' },
      { parentId: 'n1', type: 'bulletList', index: 0, id: 'n2' },
      { parentId: 'n1', type: 'bulletList', index: 1, id: 'n3' },
      { parentId: null, type: 'bulletList', index: 2, id: 'n4' },
    ]);
  });
});
