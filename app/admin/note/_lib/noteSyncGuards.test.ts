import { describe, expect, it } from 'vitest';
import { partitionOutboundForSafePush, newNoteBlockClientId } from './noteSyncGuards';
import { persistOpToPushItems } from './notePersistOpToBlockOps';

describe('noteSyncGuards', () => {
  it('newNoteBlockClientId returns a non-empty string', () => {
    expect(newNoteBlockClientId()).toMatch(/^[0-9a-f-]{36}$|block-/);
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

  it('allows patch_content when block already exists locally', () => {
    const patch = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'existing', content: { text: 'hi' } }],
    });
    const { ready, deferred } = partitionOutboundForSafePush(patch, new Set(['existing']));
    expect(ready).toHaveLength(1);
    expect(deferred).toHaveLength(0);
  });
});
