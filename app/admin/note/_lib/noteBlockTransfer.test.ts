import { describe, expect, it } from 'vitest';
import {
  buildBlockForestTransferCommand,
} from './noteBlockTransfer';
import type { NoteBlock } from './types';

describe('buildBlockForestTransferCommand', () => {
  const block = (
    id: string,
    parent_block_id: string | null,
    order_index: number,
  ): NoteBlock => ({
    id,
    document_id: 'source',
    parent_block_id,
    type: 'text',
    order_index,
    content: { text: id },
    created_at: '',
    updated_at: '',
  });

  it('moves complete subtrees and removes nested duplicate selections', () => {
    const blocks = [
      block('root', null, 0),
      block('child', 'root', 0),
      block('grandchild', 'child', 0),
      block('other', null, 1),
    ];

    const command = buildBlockForestTransferCommand(
      blocks,
      ['root', 'child'],
      'target',
    );

    expect(command.rootIds).toEqual(['root']);
    expect(command.movedIds).toEqual(['root', 'child', 'grandchild']);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['other']);
    expect(command.patches).toEqual([
      { id: 'root', document_id: 'target', parent_block_id: null },
      { id: 'child', document_id: 'target' },
      { id: 'grandchild', document_id: 'target' },
    ]);
  });
});
