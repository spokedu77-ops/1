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

  it('keeps child parent links while changing every moved block document id', () => {
    const blocks = [
      block('root', null, 0),
      block('child-a', 'root', 0),
      block('child-b', 'root', 1),
      block('grandchild', 'child-b', 0),
      block('other', null, 1),
    ];

    const command = buildBlockForestTransferCommand(
      blocks,
      ['child-b', 'root'],
      'target',
    );

    expect(command.rootIds).toEqual(['root']);
    expect(command.movedIds).toEqual(['root', 'child-a', 'child-b', 'grandchild']);
    expect(command.patches).toEqual([
      { id: 'root', document_id: 'target', parent_block_id: null },
      { id: 'child-a', document_id: 'target' },
      { id: 'child-b', document_id: 'target' },
      { id: 'grandchild', document_id: 'target' },
    ]);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['other']);
  });

  it('moves collapsed toggle forest without orphaning children', () => {
    const toggle: NoteBlock = {
      ...block('toggle', null, 0),
      type: 'toggle',
      content: { title: 'Section', collapsed: true },
    };
    const child: NoteBlock = {
      ...block('toggle-child', 'toggle', 0),
      content: { text: 'inside', html: '<p>inside</p>' },
    };
    const sibling = block('other', null, 1);

    const command = buildBlockForestTransferCommand(
      [toggle, child, sibling],
      ['toggle'],
      'target',
    );

    expect(command.rootIds).toEqual(['toggle']);
    expect(command.movedIds).toEqual(['toggle', 'toggle-child']);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['other']);
    expect(command.patches).toEqual([
      { id: 'toggle', document_id: 'target', parent_block_id: null },
      { id: 'toggle-child', document_id: 'target' },
    ]);
  });

  it('refuses to transfer a page link into the document it points to', () => {
    const page: NoteBlock = {
      ...block('page-link', null, 0),
      type: 'page',
      content: { title: 'Child', page_document_id: 'child-doc' },
    };
    const other = block('other', null, 1);
    const command = buildBlockForestTransferCommand(
      [page, other],
      ['page-link'],
      'child-doc',
    );
    expect(command.movedIds).toEqual([]);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['page-link', 'other']);
  });
});
