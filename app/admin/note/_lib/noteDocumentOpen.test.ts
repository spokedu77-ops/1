import { describe, expect, it, vi } from 'vitest';
import {
  applyOpenServerSnapshot,
  fetchServerBlocksForOpen,
  prepareNoteDocumentOpenSync,
} from './noteDocumentOpen';
import type { NoteBlock } from './types';

function block(id: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: 'hello', html: '<p>hello</p>' },
    created_at: '2026-07-09T00:00:00Z',
    updated_at: '2026-07-09T00:00:00Z',
    version: 1,
    ...overrides,
  };
}

describe('noteDocumentOpen', () => {
  it('prepareNoteDocumentOpenSync does not mutate store — hint only', () => {
    const result = prepareNoteDocumentOpenSync('doc-1');
    expect(result).toEqual({ hasLocalHint: false });
  });

  it('fetchServerBlocksForOpen prefers bootstrap over network', async () => {
    const bootstrap = [block('from-bootstrap')];
    const result = await fetchServerBlocksForOpen('doc-1', {
      bootstrapBlocks: bootstrap,
    });
    expect(result).toEqual(bootstrap);
  });

  it('applyOpenServerSnapshot dispatches via syncWithServer when oplog enabled', async () => {
    const server = [block('server')];
    const syncWithServer = vi.fn().mockResolvedValue(undefined);
    const engine = {
      isOplogSyncEnabled: () => true,
      syncWithServer,
      replaceBlocks: vi.fn(),
      getBlocks: () => server,
    };

    const result = await applyOpenServerSnapshot('doc-1', server, engine);
    expect(syncWithServer).toHaveBeenCalledTimes(1);
    expect(syncWithServer.mock.calls[0][1]).toEqual({ emptyConfirmed: false });
    expect(result.blocks).toEqual(server);
    expect(result.emptyConfirmed).toBe(false);
  });

  it('applyOpenServerSnapshot uses replaceBlocks when oplog disabled', async () => {
    const server = [block('server')];
    const replaceBlocks = vi.fn();
    const engine = {
      isOplogSyncEnabled: () => false,
      syncWithServer: vi.fn(),
      replaceBlocks,
      getBlocks: () => server,
    };

    await applyOpenServerSnapshot('doc-1', server, engine);
    expect(replaceBlocks).toHaveBeenCalledTimes(1);
  });

  it('applyOpenServerSnapshot keeps local when store text is ahead of stale server', async () => {
    const server = [block('server', { content: { text: '', html: '<p></p>' } })];
    const local = [block('server', { content: { text: '하위타이핑유지', html: '<p>하위타이핑유지</p>' } })];
    const syncWithServer = vi.fn();
    const engine = {
      isOplogSyncEnabled: () => true,
      syncWithServer,
      replaceBlocks: vi.fn(),
      getBlocks: () => local,
    };

    const { useNoteBlockStore } = await import('../_store/noteBlockStore');
    useNoteBlockStore.getState().setActiveDocumentId('doc-1');
    useNoteBlockStore.getState().hydrate(local);

    const result = await applyOpenServerSnapshot('doc-1', server, engine);
    expect(syncWithServer).not.toHaveBeenCalled();
    expect(result.blocks[0]?.content?.text).toBe('하위타이핑유지');
  });
});
