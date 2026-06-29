import { describe, expect, it } from 'vitest';
import { planBlockDropAt } from '@/app/lib/note/noteBlockTree';
import {
  buildDeleteBlockForestCommand,
  buildInsertBlockCommand,
  buildMergeWithPreviousBlockCommand,
  buildMoveBlockGroupCommand,
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
    expect(command.fieldPatches).toEqual(expect.arrayContaining([
      {
        id: 'b',
        parent_block_id: 'a',
        order_index: 0,
      },
      {
        id: 'c',
        parent_block_id: null,
        order_index: 1,
      },
    ]));
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

  it('merges text and removes the current subtree as one command', () => {
    const blocks = [
      { ...block('a', 0), content: { text: 'hello ' } },
      { ...block('b', 1), content: { text: 'world' } },
      block('child', 0, 'b'),
    ];

    const command = buildMergeWithPreviousBlockCommand(blocks, 'b');

    expect(command?.nextBlocks.map((item) => item.id)).toEqual(['a']);
    expect(command?.nextBlocks[0].content.text).toBe('hello world');
    expect(command?.removedBlocks.map((item) => item.id)).toEqual(['b', 'child']);
    expect(command?.caretOffset).toBe(6);
    expect(blocks).toHaveLength(3);
  });

  it('keeps a runtime split hint when merging a list item into previous text', () => {
    const blocks = [
      { ...block('a', 0), content: { text: 'hello ' } },
      { ...block('b', 1), type: 'numberedList', content: { text: 'world' } },
    ];

    const command = buildMergeWithPreviousBlockCommand(blocks, 'b');

    expect(command?.nextBlocks[0].content.text).toBe('hello world');
    expect(command?.caretOffset).toBe(6);
    expect(command?.splitHint).toEqual({
      blockType: 'numberedList',
      offset: 6,
    });
  });

  it('moves a selected group inside one block with one persistence payload', () => {
    const blocks = [
      block('container', 0),
      block('a', 1),
      block('b', 2),
      block('other', 3),
    ];

    const command = buildMoveBlockGroupCommand(
      blocks,
      ['a', 'b'],
      'container',
      'inside',
    );

    expect(command.nextBlocks.find((item) => item.id === 'a')).toMatchObject({
      parent_block_id: 'container',
      order_index: 0,
    });
    expect(command.nextBlocks.find((item) => item.id === 'b')).toMatchObject({
      parent_block_id: 'container',
      order_index: 1,
    });
    expect(command.nextBlocks.find((item) => item.id === 'other')?.order_index).toBe(1);
    expect(new Set(command.fieldPatches.map((patch) => patch.id))).toEqual(
      new Set(['a', 'b', 'other']),
    );
  });

  it('reorders a root group while preserving its visual order', () => {
    const blocks = [
      block('a', 0),
      block('b', 1),
      block('c', 2),
      block('d', 3),
    ];

    const command = buildMoveBlockGroupCommand(
      blocks,
      ['b', 'c'],
      'd',
      'after',
    );

    const roots = [...command.nextBlocks].sort((x, y) => x.order_index - y.order_index);
    expect(roots.map((item) => item.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(command.fieldPatches).toHaveLength(3);
  });

  it('single block move persists sibling order changes in the command payload', () => {
    const blocks = [
      block('a', 0),
      block('b', 1),
      block('c', 2),
    ];
    const plan = planBlockDropAt(blocks, 'b', 'a', 'inside');
    const command = buildMoveBlockCommand(blocks, 'b', plan!);

    expect(command.fieldPatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'b', parent_block_id: 'a', order_index: 0 }),
      expect.objectContaining({ id: 'c', parent_block_id: null, order_index: 1 }),
    ]));
  });

  it('moves a parent block without reparenting its descendants locally', () => {
    const blocks = [
      block('a', 0),
      block('parent', 1),
      block('child', 0, 'parent'),
      block('grandchild', 0, 'child'),
      block('after', 2),
    ];
    const plan = planBlockDropAt(blocks, 'parent', 'a', 'inside');
    const command = buildMoveBlockCommand(blocks, 'parent', plan!);

    expect(command.nextBlocks.find((item) => item.id === 'parent')).toMatchObject({
      parent_block_id: 'a',
      order_index: 0,
    });
    expect(command.nextBlocks.find((item) => item.id === 'child')?.parent_block_id).toBe('parent');
    expect(command.nextBlocks.find((item) => item.id === 'grandchild')?.parent_block_id).toBe('child');
    expect(command.fieldPatches.map((patch) => patch.id)).not.toContain('child');
    expect(command.fieldPatches.map((patch) => patch.id)).not.toContain('grandchild');
  });
});
