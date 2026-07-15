import { describe, expect, it } from 'vitest';
import {
  buildKnownBlockIdsForPush,
  classifyPushItem,
  isPureIdentityLeaveOrRelocationPush,
  newNoteBlockClientId,
  outboundHasIdentityLeaveOrRelocation,
  outboundHasUnpublishedTopology,
  partitionOutboundForSafePush,
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
    expect(outboundHasUnpublishedTopology([relocation])).toBe(false);
    expect(outboundHasUnpublishedTopology([softDelete])).toBe(false);
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
});
