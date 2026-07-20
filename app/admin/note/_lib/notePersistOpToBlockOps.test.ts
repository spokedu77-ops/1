import { describe, expect, it } from 'vitest';
import {
  coalescePushItems,
  collectPendingSoftDeleteIds,
  collectPendingOutboundExcludedIds,
  collectPendingTransferAwayIds,
  excludeBlocksPendingSoftDelete,
  filterStalePendingSoftDeletes,
  findOutboundOpsSupersededByServerRestore,
  mergeServerBlocksIntoLocalSnapshot,
  persistOpToPushItems,
  serverSnapshotHasBlocksMissingFrom,
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

  it('carries baseContent so the server can distinguish user deletion from stale truncation', () => {
    const [item] = persistOpToPushItems({
      type: 'patchContent',
      updates: [{
        id: 'a',
        content: { text: 'short' },
        baseContent: { text: 'shortened from this text' },
      }],
    });

    expect(item?.payload).toMatchObject({
      opType: 'patch_content',
      blockId: 'a',
      content: { text: 'short' },
      baseContent: { text: 'shortened from this text' },
    });
  });

  it('keeps structural transactions in order and only coalesces content patches', () => {
    const firstContent = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'child', content: { text: 'old' } }],
    });
    const move = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [
        { id: 'child', parent_block_id: 'toggle', order_index: 0 },
        { id: 'sibling', parent_block_id: null, order_index: 1 },
      ],
      deleteIds: [],
    });
    const latestContent = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'child', content: { text: 'new' } }],
    });

    const coalesced = coalescePushItems([
      ...firstContent,
      ...move,
      ...latestContent,
    ]);

    expect(coalesced.map((item) => item.payload.opType)).toEqual([
      'block_transaction',
      'patch_content',
    ]);
    expect(coalesced[0]?.payload).toMatchObject({
      opType: 'block_transaction',
      patches: [
        { id: 'child', parent_block_id: 'toggle', order_index: 0 },
        { id: 'sibling', parent_block_id: null, order_index: 1 },
      ],
    });
    expect(coalesced[1]?.payload).toMatchObject({
      opType: 'patch_content',
      blockId: 'child',
      content: { text: 'new' },
    });
  });
});

describe('persistOpToPushItems structural contracts', () => {
  it('preserves explicit null parent_block_id in patch_fields', () => {
    const [item] = persistOpToPushItems({
      type: 'patchFields',
      patches: [{ id: 'child', parent_block_id: null, order_index: 2 }],
    });

    expect(item.payload).toEqual({
      opType: 'patch_fields',
      patches: [{ id: 'child', parent_block_id: null, order_index: 2 }],
    });
  });

  it('preserves full block_transaction structure patches for document transfer', () => {
    const [item] = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [
        { id: 'root', document_id: 'target-doc', parent_block_id: null, order_index: 0 },
        { id: 'child', document_id: 'target-doc' },
      ],
      deleteIds: ['deleted'],
    });

    expect(item.payload).toEqual({
      opType: 'block_transaction',
      patches: [
        { id: 'root', document_id: 'target-doc', parent_block_id: null, order_index: 0 },
        { id: 'child', document_id: 'target-doc' },
      ],
      deleteIds: ['deleted'],
      deleteMeta: [{ id: 'deleted', updated_at: null }],
    });
  });

  it('preserves block_transaction creates for atomic structural edits', () => {
    const [item] = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [{ id: 'existing', order_index: 1 }],
      deleteIds: ['deleted'],
      creates: [{
        id: 'new-todo',
        document_id: 'doc-1',
        parent_block_id: 'toggle-1',
        type: 'todo',
        order_index: 0,
        content: { text: '7.20 interview OT', checked: false },
      }],
    });

    expect(item.payload).toEqual({
      opType: 'block_transaction',
      patches: [{ id: 'existing', order_index: 1 }],
      deleteIds: ['deleted'],
      deleteMeta: [{ id: 'deleted', updated_at: null }],
      creates: [{
        id: 'new-todo',
        document_id: 'doc-1',
        parent_block_id: 'toggle-1',
        type: 'todo',
        order_index: 0,
        content: { text: '7.20 interview OT', checked: false },
      }],
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

describe('mergeServerBlocksIntoLocalSnapshot', () => {
  const serverBlock = (id: string, text: string): NoteBlock => ({
    id,
    document_id: 'doc-1',
    type: 'text',
    content: { text },
    order_index: 0,
    parent_block_id: 'toggle-1',
    created_at: '',
    updated_at: '',
  });

  it('adds server-only blocks missing from stale local IDB', () => {
    const local: NoteBlock[] = [{
      id: 'toggle-1',
      document_id: 'doc-1',
      type: 'toggle',
      content: { title: '체육관' },
      order_index: 0,
      parent_block_id: null,
      created_at: '',
      updated_at: '',
    }];
    const server = [
      ...local,
      serverBlock('child-1', '복구 본문'),
    ];
    const merged = mergeServerBlocksIntoLocalSnapshot(local, server, new Set());
    expect(merged.map((block) => block.id)).toEqual(['toggle-1', 'child-1']);
  });

  it('replaces empty local text with server content for same id', () => {
    const local: NoteBlock[] = [serverBlock('child-1', '')];
    const server = [serverBlock('child-1', '복구 본문')];
    const merged = mergeServerBlocksIntoLocalSnapshot(local, server, new Set());
    expect(merged[0].content?.text).toBe('복구 본문');
  });

  it('replaces stale local callout content with the newer server snapshot', () => {
    const local: NoteBlock[] = [{
      ...serverBlock('callout-1', ''),
      type: 'callout',
      content: { icon: 'i', text: '', html: '<p></p>' },
      version: 1,
      updated_at: '2026-07-18T06:31:05.000Z',
    }];
    const server: NoteBlock[] = [{
      ...serverBlock('callout-1', 'server callout line 1\nserver callout line 2'),
      type: 'callout',
      content: {
        icon: 'i',
        text: 'server callout line 1\nserver callout line 2',
        html: '<p>server callout line 1<br>server callout line 2</p>',
      },
      version: 2,
      updated_at: '2026-07-18T06:32:11.000Z',
    }];
    const merged = mergeServerBlocksIntoLocalSnapshot(local, server, new Set());
    expect(merged[0].content?.text).toBe('server callout line 1\nserver callout line 2');
    expect(merged[0].version).toBe(2);
  });

  it('keeps longer local callout text over an older server snapshot', () => {
    const local: NoteBlock[] = [{
      ...serverBlock('callout-1', 'longer local unsaved callout body'),
      type: 'callout',
      content: { icon: 'i', text: 'longer local unsaved callout body' },
      version: 3,
      updated_at: '2026-07-18T06:33:00.000Z',
    }];
    const server: NoteBlock[] = [{
      ...serverBlock('callout-1', 'short server body'),
      type: 'callout',
      content: { icon: 'i', text: 'short server body' },
      version: 2,
      updated_at: '2026-07-18T06:32:00.000Z',
    }];
    const merged = mergeServerBlocksIntoLocalSnapshot(local, server, new Set());
    expect(merged[0].content?.text).toBe('longer local unsaved callout body');
    expect(merged[0].version).toBe(3);
  });

  it('skips ids pending soft delete', () => {
    const local: NoteBlock[] = [];
    const server = [serverBlock('child-1', 'gone')];
    const merged = mergeServerBlocksIntoLocalSnapshot(local, server, new Set(['child-1']));
    expect(merged).toHaveLength(0);
  });

  it('filterStalePendingSoftDeletes keeps pending ids while server still has blocks (pre-push)', () => {
    const server = [serverBlock('child-1', '복구 본문')];
    const pending = new Set(['child-1', 'gone-forever']);
    const effective = filterStalePendingSoftDeletes(server, pending);
    expect([...effective].sort()).toEqual(['child-1', 'gone-forever']);
  });

  it('findOutboundOpsSupersededByServerRestore never drops outbound before push ack', () => {
    const items = persistOpToPushItems({ type: 'softDelete', ids: ['child-1'] });
    const outbound = items.map((item, index) => ({
      ...item,
      documentId: 'doc-1',
      createdAt: index,
    }));
    const superseded = findOutboundOpsSupersededByServerRestore(
      outbound,
      [serverBlock('child-1', 'still on server')],
    );
    expect(superseded).toEqual([]);
  });

  it('collectPendingTransferAwayIds excludes moved blocks from source doc merge', () => {
    const items = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [{ id: 'todo-1', document_id: 'doc-target' }],
      deleteIds: [],
    });
    const outbound = items.map((item, index) => ({
      ...item,
      documentId: 'doc-source',
      createdAt: index,
    }));
    expect([...collectPendingTransferAwayIds(outbound, 'doc-source')]).toEqual(['todo-1']);
    expect([...collectPendingOutboundExcludedIds(outbound, 'doc-source')]).toEqual(['todo-1']);
  });
});

describe('persistOpToPushItems delete authority', () => {
  it('attaches updated_at metadata to soft_delete ops', () => {
    const [item] = persistOpToPushItems({
      type: 'softDelete',
      ids: ['block-1'],
      blocks: [{
        id: 'block-1',
        document_id: 'doc-1',
        type: 'bulletList',
        content: { text: 'keep authority' },
        order_index: 0,
        parent_block_id: null,
        created_at: '2026-07-20T00:00:00.000Z',
        updated_at: '2026-07-20T01:00:00.000Z',
        version: 1,
      }],
    });

    expect(item?.payload).toMatchObject({
      opType: 'soft_delete',
      ids: ['block-1'],
      deleteMeta: [{
        id: 'block-1',
        updated_at: '2026-07-20T01:00:00.000Z',
      }],
    });
  });

  it('attaches updated_at metadata to block_transaction deletes', () => {
    const [item] = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [{ id: 'survivor', order_index: 0 }],
      deleteIds: ['deleted'],
      deletedBlocks: [{
        id: 'deleted',
        document_id: 'doc-1',
        type: 'todo',
        content: { text: 'old checklist', checked: false },
        order_index: 1,
        parent_block_id: null,
        created_at: '2026-07-20T00:00:00.000Z',
        updated_at: '2026-07-20T01:00:00.000Z',
        version: 1,
      }],
    });

    expect(item?.payload).toMatchObject({
      opType: 'block_transaction',
      deleteIds: ['deleted'],
      deleteMeta: [{
        id: 'deleted',
        updated_at: '2026-07-20T01:00:00.000Z',
      }],
    });
  });
});

describe('serverSnapshotHasBlocksMissingFrom', () => {
  const block = (id: string, text: string): NoteBlock => ({
    id,
    document_id: 'd',
    type: 'text',
    content: { text },
    order_index: 0,
    parent_block_id: null,
    created_at: '',
    updated_at: '',
  });

  it('detects server-only block ids', () => {
    expect(serverSnapshotHasBlocksMissingFrom([block('a', '')], [block('a', ''), block('b', '')])).toBe(true);
  });

  it('detects empty local placeholder replaced on server', () => {
    expect(serverSnapshotHasBlocksMissingFrom([block('a', '')], [block('a', '복구')])).toBe(true);
  });
});
