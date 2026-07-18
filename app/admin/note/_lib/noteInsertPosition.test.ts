import { describe, expect, it } from 'vitest';
import {
  resolveFocusedInsertTarget,
  resolveInsertIndexAfterBlock,
} from './noteInsertPosition';
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

describe('note insert position', () => {
  it('inserts immediately after the focused root block', () => {
    const blocks = [
      block('a', 0),
      block('focused', 1),
      block('next', 2),
    ];

    expect(resolveFocusedInsertTarget(blocks, 'focused')).toEqual({
      parentId: null,
      insertIndex: 2,
    });
  });

  it('does not skip over a sibling when inserting after a block', () => {
    const blocks = [
      block('a', 0),
      block('focused', 1),
      block('next', 2),
      block('after-next', 3),
    ];

    expect(resolveInsertIndexAfterBlock(blocks, blocks[1])).toEqual({
      parentId: null,
      insertIndex: 2,
    });
  });

  it('uses visual sibling position even when order indexes have gaps', () => {
    const blocks = [
      block('a', 10),
      block('focused', 30),
      block('next', 50),
    ];

    expect(resolveInsertIndexAfterBlock(blocks, blocks[1])).toEqual({
      parentId: null,
      insertIndex: 2,
    });
  });

  it('inserts inside the same parent when the focused block is nested', () => {
    const blocks = [
      block('toggle', 0),
      block('child-a', 0, 'toggle'),
      block('focused-child', 1, 'toggle'),
      block('child-next', 2, 'toggle'),
      block('root-next', 1),
    ];

    expect(resolveFocusedInsertTarget(blocks, 'focused-child')).toEqual({
      parentId: 'toggle',
      insertIndex: 2,
    });
  });
});
