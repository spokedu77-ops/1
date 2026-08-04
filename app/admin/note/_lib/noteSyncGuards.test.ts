import { describe, expect, it } from 'vitest';
import {
  buildKnownBlockIdsForPush,
  classifyPushItem,
  collectLeaveIdsFromPushItems,
  isPureIdentityLeaveOrRelocationPush,
  newNoteBlockClientId,
  outboundHasIdentityLeaveOrRelocation,
  outboundHasUnpublishedTopology,
  partitionOutboundForSafePush,
  shouldAllowRemotePullBeforePush,
} from './noteSyncGuards';
import { persistOpToPushItems } from './notePersistOpToBlockOps';

describe('noteSyncGuards', () => {
  it('newNoteBlockClientId returns a non-empty string', () => {
    expect(newNoteBlockClientId()).toMatch(/^[0-9a-f-]{36}$|block-/);
  });

  it('classifies soft_delete as identityLeave and same-doc fields as topology', () => {
    const softDelete = persistOpToPushItems({ type: 'softDelete', ids: ['a'] })[0]!;
    const topology = persistOpToPushItems({
      type: 'patchFields',
      patches: [{ id: 'a', parent_block_id: null, order_index: 0 }],
    })[0]!;
    const relocation = persistOpToPushItems({
      type: 'patchFields',
      patches: [{ id: 'a', document_id: 'target' }],
    })[0]!;
    expect(classifyPushItem(softDelete)).toBe('identityLeave');
    expect(classifyPushItem(topology)).toBe('topology');
    expect(classifyPushItem(relocation)).toBe('relocation');
    expect(outboundHasIdentityLeaveOrRelocation([relocation, topology])).toBe(true);
    expect(outboundHasUnpublishedTopology([topology])).toBe(true);
    expect(outboundHasUnpublishedTopology([relocation])).toBe(true);
    expect(outboundHasUnpublishedTopology([softDelete])).toBe(false);
  });

  it('collectLeaveIdsFromPushItems keeps outbound leave but skips reclaim to this stream', () => {
    const outboundLeave = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [
        { id: 'moving', document_id: 'doc-2', parent_block_id: null, order_index: 0 },
        { id: 'target-root', order_index: 1 },
      ],
      deleteIds: [],
    })[0]!;
    const reclaim = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [
        { id: 'returning', document_id: 'doc-1', parent_block_id: null, order_index: 0 },
      ],
      deleteIds: [],
    })[0]!;
    const softDelete = persistOpToPushItems({ type: 'softDelete', ids: ['gone'] })[0]!;

    expect(collectLeaveIdsFromPushItems([outboundLeave], 'doc-1')).toEqual(['moving']);
    expect(collectLeaveIdsFromPushItems([reclaim], 'doc-1')).toEqual([]);
    expect(collectLeaveIdsFromPushItems([softDelete], 'doc-1')).toEqual(['gone']);
  });

  it('blocks remote pull before pushing pending same-document order changes', () => {
    const reorder = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [
        { id: 'todo-c', parent_block_id: null, order_index: 0 },
        { id: 'todo-a', parent_block_id: null, order_index: 1 },
        { id: 'todo-b', parent_block_id: null, order_index: 2 },
      ],
      deleteIds: [],
    });
    const softDelete = persistOpToPushItems({ type: 'softDelete', ids: ['gone'] });

    expect(shouldAllowRemotePullBeforePush(reorder)).toBe(false);
    expect(shouldAllowRemotePullBeforePush(softDelete)).toBe(true);
  });

  it('marks only pure leave for inactive drain (not mixed)', () => {
    const softDelete = persistOpToPushItems({ type: 'softDelete', ids: ['a'] })[0]!;
    const mixed = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [{ id: 'a', parent_block_id: null, order_index: 0 }],
      deleteIds: ['b'],
    })[0]!;
    expect(isPureIdentityLeaveOrRelocationPush(softDelete)).toBe(true);
    expect(isPureIdentityLeaveOrRelocationPush(mixed)).toBe(false);
    expect(classifyPushItem(mixed)).toBe('mixed');
  });

  it('defers patch_content until create_block for the same id is ready', () => {
    const patchFirst = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'block-1', content: { text: 'hi' } }],
    });
    const create = persistOpToPushItems({
      type: 'createBlock',
      id: 'block-1',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '' },
      parent_block_id: null,
    });
    const { ready, deferred } = partitionOutboundForSafePush(
      [...patchFirst, ...create],
      new Set(),
    );
    expect(ready.map((item) => item.payload.opType)).toEqual(['create_block']);
    expect(deferred.map((item) => item.payload.opType)).toEqual(['patch_content']);
  });

  it('allows patch_content after create in the same partition pass', () => {
    const create = persistOpToPushItems({
      type: 'createBlock',
      id: 'block-1',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '' },
      parent_block_id: null,
    });
    const patch = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'block-1', content: { text: 'hi' } }],
    });
    const outbound = [...create, ...patch];
    const known = buildKnownBlockIdsForPush([], outbound);
    const { ready, deferred } = partitionOutboundForSafePush(outbound, known);
    expect(ready.map((item) => item.payload.opType)).toEqual(['create_block', 'patch_content']);
    expect(deferred).toHaveLength(0);
  });

  it('identityLeave soft_delete is ready after optimistic local remove (empty known)', () => {
    const softDelete = persistOpToPushItems({
      type: 'softDelete',
      ids: ['gone-1', 'gone-2'],
    });
    const { ready, deferred } = partitionOutboundForSafePush(softDelete, new Set());
    expect(deferred).toHaveLength(0);
    expect(ready.map((item) => item.payload.opType)).toEqual(['soft_delete']);
  });

  it('defers soft_delete until unacked create for the same id is ready', () => {
    const softDelete = persistOpToPushItems({
      type: 'softDelete',
      ids: ['block-1'],
    });
    const create = persistOpToPushItems({
      type: 'createBlock',
      id: 'block-1',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '' },
      parent_block_id: null,
    });
    const first = partitionOutboundForSafePush([...softDelete, ...create], new Set());
    expect(first.ready.map((item) => item.payload.opType)).toEqual(['create_block']);
    expect(first.deferred.map((item) => item.payload.opType)).toEqual(['soft_delete']);

    const second = partitionOutboundForSafePush([...create, ...softDelete], new Set());
    expect(second.ready.map((item) => item.payload.opType)).toEqual(['create_block', 'soft_delete']);
    expect(second.deferred).toHaveLength(0);
  });

  it('relocation document_id patches do not require store presence', () => {
    const relocation = persistOpToPushItems({
      type: 'patchFields',
      patches: [
        { id: 'root', document_id: 'target', parent_block_id: null },
        { id: 'child', document_id: 'target' },
      ],
    });
    const { ready, deferred } = partitionOutboundForSafePush(relocation, new Set());
    expect(deferred).toHaveLength(0);
    expect(ready).toHaveLength(1);
  });

  it('C5 transfer companion order patches do not defer the relocation transaction', () => {
    const transfer = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [
        { id: 'moving', document_id: 'doc-2', parent_block_id: null, order_index: 0 },
        { id: 'target-root', order_index: 1 },
      ],
      deleteIds: [],
    });
    const { ready, deferred } = partitionOutboundForSafePush(
      transfer,
      new Set(['moving', 'source-sibling']),
    );
    expect(deferred).toHaveLength(0);
    expect(ready).toHaveLength(1);
  });

  it('same-doc topology without relocation still requires known ids', () => {
    const reorder = persistOpToPushItems({
      type: 'blockTransaction',
      patches: [
        { id: 'a', order_index: 0 },
        { id: 'ghost', order_index: 1 },
      ],
      deleteIds: [],
    });
    const { ready, deferred } = partitionOutboundForSafePush(reorder, new Set(['a']));
    expect(ready).toHaveLength(0);
    expect(deferred).toHaveLength(1);
  });
});
