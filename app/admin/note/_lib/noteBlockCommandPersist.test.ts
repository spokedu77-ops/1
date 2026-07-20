import { describe, expect, it } from 'vitest';
import {
  buildDeleteBlockForestCommand,
  buildMergeWithPreviousBlockCommand,
  buildMoveBlockCommand,
} from './noteBlockCommands';
import {
  deletedIdsForBlockCommand,
  persistOpForBlockCommand,
} from './noteBlockCommandPersist';
import { planBlockDropAt } from '@/app/lib/note/noteBlockTree';
import type { NoteBlock } from './types';

function block(id: string, order_index: number, parent_block_id: string | null = null): NoteBlock {
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

describe('noteBlockCommandPersist', () => {
  it('converts delete commands to one block transaction', () => {
    const command = buildDeleteBlockForestCommand([
      block('a', 0),
      block('child', 0, 'a'),
      block('b', 1),
    ], ['a']);

    expect(deletedIdsForBlockCommand(command)).toEqual(['a', 'child']);
    expect(persistOpForBlockCommand(command)).toEqual({
      type: 'blockTransaction',
      patches: [],
      deleteIds: ['a', 'child'],
      deletedBlocks: [
        expect.objectContaining({ id: 'a' }),
        expect.objectContaining({ id: 'child' }),
      ],
    });
  });

  it('converts merge commands to patches plus deletes', () => {
    const command = buildMergeWithPreviousBlockCommand([
      { ...block('a', 0), content: { text: 'hello ' } },
      { ...block('b', 1), content: { text: 'world' } },
    ], 'b');

    expect(command).not.toBeNull();
    expect(persistOpForBlockCommand(command!)).toMatchObject({
      type: 'blockTransaction',
      deleteIds: ['b'],
      deletedBlocks: [expect.objectContaining({ id: 'b' })],
      patches: [{ id: 'a', content: { text: 'hello world' } }],
    });
  });

  it('converts move commands to patch transactions without deletes', () => {
    const blocks = [block('a', 0), block('b', 1), block('c', 2)];
    const plan = planBlockDropAt(blocks, 'c', 'a', 'before');
    const command = buildMoveBlockCommand(blocks, 'c', plan!);

    expect(persistOpForBlockCommand(command)).toMatchObject({
      type: 'blockTransaction',
      deleteIds: [],
    });
    expect(persistOpForBlockCommand(command)).not.toHaveProperty('deletedBlocks');
    expect(command.fieldPatches.map((patch) => patch.id)).toContain('c');
  });
});
