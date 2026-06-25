import { describe, expect, it } from 'vitest';
import { planBlockDropAt } from '@/app/lib/note/noteBlockTree';
import {
  buildDeleteBlockForestCommand,
  buildInsertBlockCommand,
  buildMoveBlockCommand,
  collectBlockTransactionIds,
} from './noteBlockCommands';
import type { NoteBlock } from './types';

function block(
  id: string,
  order_index: number,
  parent_block_id: string | null = null,
): NoteBlock {
  return {
    id,
    document_id: 'doc',
    parent_block_id,
    type: 'text',
    order_index,
    content: { text: id },
    created_at: '',
    updated_at: '',
  };
}

describe('note block commands', () => {
  it('moves a regular block inside another regular block with one persistence payload', () => {
    const blocks = [block('a', 0), block('b', 1), block('c', 2)];
    const plan = planBlockDropAt(blocks, 'b', 'a', 'inside');
    expect(plan).not.toBeNull();

    const command = buildMoveBlockCommand(blocks, 'b', plan!);

    expect(command.nextBlocks.find((item) => item.id === 'b')).toMatchObject({
      parent_block_id: 'a',
      order_index: 0,
    });
    expect(command.nextBlocks.find((item) => item.id === 'c')?.order_index).toBe(1);
    expect(command.fieldPatches).toEqual([{
      id: 'b',
      parent_block_id: 'a',
      order_index: 0,
    }]);
    expect(new Set(command.orders.map((item) => item.id))).toEqual(new Set(['b', 'c']));
    expect(blocks[1].parent_block_id).toBeNull();
    expect(blocks[2].order_index).toBe(2);
  });

  it('removes complete subtrees while preserving unrelated blocks', () => {
    const blocks = [
      block('root', 0),
      block('child', 0, 'root'),
      block('grandchild', 0, 'child'),
      block('other', 1),
    ];

    const command = buildDeleteBlockForestCommand(blocks, ['root', 'child']);

    expect(command.affectedIds).toEqual(['root', 'child', 'grandchild']);
    expect(command.removedBlocks.map((item) => item.id)).toEqual([
      'root',
      'child',
      'grandchild',
    ]);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['other']);
    expect(blocks).toHaveLength(4);
  });

  it('inserts a block among siblings and normalizes only that sibling list', () => {
    const blocks = [
      block('a', 0),
      block('b', 1),
      block('child', 0, 'a'),
    ];
    const created = block('new', 99);

    const command = buildInsertBlockCommand(blocks, created, null, 1);

    expect(command.nextBlocks.find((item) => item.id === 'a')?.order_index).toBe(0);
    expect(command.nextBlocks.find((item) => item.id === 'new')?.order_index).toBe(1);
    expect(command.nextBlocks.find((item) => item.id === 'b')?.order_index).toBe(2);
    expect(command.nextBlocks.find((item) => item.id === 'child')?.order_index).toBe(0);
    expect(command.orders).toEqual([
      { id: 'a', order_index: 0 },
      { id: 'new', order_index: 1 },
      { id: 'b', order_index: 2 },
    ]);
    expect(blocks).toHaveLength(3);
  });

  it('collects created, removed, and structurally changed blocks for one transaction', () => {
    const before = [block('a', 0), block('removed', 1)];
    const after = [block('a', 1), block('created', 0)];

    expect(new Set(collectBlockTransactionIds(before, after))).toEqual(
      new Set(['a', 'created', 'removed']),
    );
  });
});
