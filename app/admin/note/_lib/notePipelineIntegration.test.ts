import { describe, expect, it, beforeEach } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { applyNoteCommand } from './noteCommandReducer';
import { buildDeleteBlockForestCommand } from './noteBlockCommands';
import { NoteDocumentPipeline } from './noteDocumentPipeline';
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

describe('document switch store replace', () => {
  it('hydrate replaces parent blocks when opening child document', () => {
    const parent = block('p1', { document_id: 'parent-doc', content: { text: 'parent' } });
    const child = block('c1', { document_id: 'child-doc', content: { text: 'child' } });
    useNoteBlockStore.getState().setActiveDocumentId('parent-doc');
    useNoteBlockStore.getState().hydrate([parent]);

    const ctx = {
      documentId: 'child-doc',
      activeBlockId: null,
      storeContentById: {},
    };
    const { blocks } = applyNoteCommand(
      useNoteBlockStore.getState().getBlocksArray(),
      { type: 'hydrate', blocks: [child] },
      ctx,
    );
    useNoteBlockStore.getState().replaceBlocks(blocks);

    expect(useNoteBlockStore.getState().getBlock('p1')).toBeUndefined();
    expect(useNoteBlockStore.getState().getBlock('c1')?.document_id).toBe('child-doc');
  });
});

describe('double dispatch prevention', () => {
  it('hydrate replaces without requiring second replaceBlocks', () => {
    const previous = [block('old', { created_at: '2020-01-01T00:00:00Z' })];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'hydrate', blocks: [block('new')] },
      { documentId: 'doc-1', activeBlockId: null, storeContentById: {} },
    );
    expect(blocks.map((b) => b.id)).toEqual(['new']);
  });
});

describe('structure command atomicity', () => {
  beforeEach(() => {
    useNoteBlockStore.setState({
      byId: {},
      order: [],
      activeDocumentId: 'doc-1',
      activeEditor: null,
    });
  });

  it('rolls the screen back when structure persistence fails', async () => {
    const previous = [
      block('a', { order_index: 0 }),
      block('b', { order_index: 1 }),
    ];
    useNoteBlockStore.getState().hydrate(previous);
    const command = buildDeleteBlockForestCommand(previous, ['a']);
    const pipeline = new NoteDocumentPipeline('doc-1', { triggerSave: () => {} }, false);

    await expect(pipeline.applyStructureCommand(command)).rejects.toThrow();

    expect(useNoteBlockStore.getState().getBlocksArray().map((item) => item.id)).toEqual(['a', 'b']);
    await pipeline.dispose();
  });
});
