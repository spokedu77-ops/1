import { describe, expect, it } from 'vitest';
import {
  coalescePushItems,
  collectPendingSoftDeleteIds,
  excludeBlocksPendingSoftDelete,
  persistOpToPushItems,
  shouldTrustEmptyLocalWithOutbound,
} from './notePersistOpToBlockOps';
import type { NoteBlockOpPushItem } from '@/app/lib/note/noteBlockOpTypes';
import type { NoteLocalOutboundOp } from './noteLocalDb';
import type { NoteBlock } from './types';

describe('coalescePushItems', () => {
  it('keeps create_block before later patch_content for the same block', () => {
    const create = persistOpToPushItems({
      type: 'createBlock',
      id: 'block-1',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '', html: '<p></p>' },
      order_index: 0,
      parent_block_id: null,
    });
    const patch = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'block-1', content: { text: 'hi', html: '<p>hi</p>' } }],
    });
    const coalesced = coalescePushItems([...create, ...patch]);
    expect(coalesced.map((item) => item.payload.opType)).toEqual([
      'create_block',
      'patch_content',
    ]);
  });

  it('dedupes patch_content per block while preserving relative order', () => {
    const items: NoteBlockOpPushItem[] = [
      ...persistOpToPushItems({
        type: 'createBlock',
        id: 'a',
        documentId: 'doc-1',
        blockType: 'text',
        content: { text: '' },
        parent_block_id: null,
      }),
      ...persistOpToPushItems({
        type: 'patchContent',
        updates: [{ id: 'a', content: { text: '1' } }],
      }),
      ...persistOpToPushItems({
        type: 'patchFields',
        patches: [{ id: 'b', order_index: 1 }],
      }),
      ...persistOpToPushItems({
        type: 'patchContent',
        updates: [{ id: 'a', content: { text: '2' } }],
      }),
    ];
    const coalesced = coalescePushItems(items);
    expect(coalesced.map((item) => item.payload.opType)).toEqual([
      'create_block',
      'patch_fields',
      'patch_content',
    ]);
    const content = coalesced.find((item) => item.payload.opType === 'patch_content');
    expect(content?.payload).toMatchObject({
      opType: 'patch_content',
      blockId: 'a',
      content: { text: '2' },
    });
  });
});

describe('collectPendingSoftDeleteIds', () => {
  const outbound = (
    items: NoteBlockOpPushItem[],
  ): NoteLocalOutboundOp[] => items.map((item, index) => ({
    ...item,
    documentId: 'doc-1',
    createdAt: index,
  }));

  it('collects soft_delete ids from outbound queue', () => {
    const items = persistOpToPushItems({ type: 'softDelete', ids: ['a', 'b'] });
    const pending = collectPendingSoftDeleteIds(outbound(items));
    expect([...pending]).toEqual(['a', 'b']);
  });

  it('collects deleteIds from block_transaction outbound', () => {
    const items = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [],
      deleteIds: ['child-1'],
    });
    const pending = collectPendingSoftDeleteIds(outbound(items));
    expect([...pending]).toEqual(['child-1']);
  });

  it('excludeBlocksPendingSoftDelete removes pending ids', () => {
    const blocks: NoteBlock[] = [
      {
        id: 'a',
        document_id: 'doc-1',
        type: 'text',
        content: { text: 'a' },
        order_index: 0,
        parent_block_id: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'b',
        document_id: 'doc-1',
        type: 'text',
        content: { text: 'b' },
        order_index: 1,
        parent_block_id: null,
        created_at: '',
        updated_at: '',
      },
    ];
    const next = excludeBlocksPendingSoftDelete(blocks, new Set(['b']));
    expect(next.map((block) => block.id)).toEqual(['a']);
  });
});

describe('shouldTrustEmptyLocalWithOutbound', () => {
  const serverBlock = (id: string): NoteBlock => ({
    id,
    document_id: 'doc-1',
    type: 'text',
    content: { text: id },
    order_index: 0,
    parent_block_id: null,
    created_at: '',
    updated_at: '',
  });

  const outbound = (
    items: NoteBlockOpPushItem[],
  ): NoteLocalOutboundOp[] => items.map((item, index) => ({
    ...item,
    documentId: 'doc-1',
    createdAt: index,
  }));

  it('trusts empty local when all server blocks are pending soft delete', () => {
    const items = persistOpToPushItems({ type: 'softDelete', ids: ['a', 'b'] });
    expect(shouldTrustEmptyLocalWithOutbound(
      outbound(items),
      [serverBlock('a'), serverBlock('b')],
    )).toBe(true);
  });

  it('does not trust empty local when outbound cannot explain server blocks', () => {
    const items = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'a', content: { text: 'x' } }],
    });
    expect(shouldTrustEmptyLocalWithOutbound(
      outbound(items),
      [serverBlock('a')],
    )).toBe(false);
  });
});
