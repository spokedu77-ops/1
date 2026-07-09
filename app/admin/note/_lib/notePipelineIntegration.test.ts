import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { applyNoteCommand } from './noteCommandReducer';
import { partitionOutboundForSafePush } from './noteSyncGuards';
import { coalescePushItems, persistOpToPushItems } from './notePersistOpToBlockOps';
import type { NoteBlock } from './types';

function block(id: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: '', html: '<p></p>' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

describe('create → patch push ordering', () => {
  it('keeps create_block before patch_content in the same push batch', () => {
    const create = persistOpToPushItems({
      type: 'createBlock',
      id: 'new-block',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '' },
      parent_block_id: null,
    });
    const patch = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'new-block', content: { text: 'hello' } }],
    });
    const coalesced = coalescePushItems([...create, ...patch]);
    const { ready } = partitionOutboundForSafePush(coalesced, new Set());
    expect(ready.map((item) => item.payload.opType)).toEqual(['create_block', 'patch_content']);
  });

  it('defers patch when create for same id comes later in queue', () => {
    const patch = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'new-block', content: { text: 'hello' } }],
    });
    const create = persistOpToPushItems({
      type: 'createBlock',
      id: 'new-block',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '' },
      parent_block_id: null,
    });
    const coalesced = coalescePushItems([...patch, ...create]);
    const { ready, deferred } = partitionOutboundForSafePush(coalesced, new Set());
    expect(ready.map((item) => item.payload.opType)).toEqual(['create_block']);
    expect(deferred.map((item) => item.payload.opType)).toEqual(['patch_content']);
  });

  it('pushes patch after create when block exists in known set', () => {
    const patch = persistOpToPushItems({
      type: 'patchContent',
      updates: [{ id: 'new-block', content: { text: 'hello' } }],
    });
    const coalesced = coalescePushItems(patch);
    const { ready } = partitionOutboundForSafePush(coalesced, new Set(['new-block']));
    expect(ready).toHaveLength(1);
    expect(ready[0]?.payload.opType).toBe('patch_content');
  });
});

describe('syncSnapshot during active typing', () => {
  beforeEach(() => {
    useNoteBlockStore.setState({
      byId: {},
      order: [],
      activeDocumentId: 'doc-1',
      activeEditor: { blockId: 'a', field: 'text' },
    });
    useNoteBlockStore.getState().hydrate([block('a', { content: { text: 'typing' } })]);
  });

  it('does not overwrite active editor content from stale server snapshot', () => {
    const previous = useNoteBlockStore.getState().getBlocksArray();
    const ctx = {
      documentId: 'doc-1',
      activeBlockId: 'a',
      storeContentById: { a: { text: 'typing' } },
    };
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: [block('a', { content: { text: 'server' } })] },
      ctx,
    );
    expect((blocks[0].content as { text: string }).text).toBe('typing');
  });
});

describe('double dispatch prevention', () => {
  it('hydrate replaces without requiring second replaceBlocks', () => {
    const previous = [block('old')];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'hydrate', blocks: [block('new')] },
      { documentId: 'doc-1', activeBlockId: null, storeContentById: {} },
    );
    expect(blocks.map((b) => b.id)).toEqual(['new']);
  });
});
