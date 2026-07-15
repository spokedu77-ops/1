import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NoteBlockVersionConflictError,
} from './noteBlocksApi';
import { NoteDocumentOpQueue } from './noteDocumentOpQueue';
import type { NoteBlock } from './types';

const baseBlock = (id: string, text: string, version = 1): NoteBlock => ({
  id,
  document_id: 'doc-1',
  type: 'text',
  content: { text },
  order_index: 0,
  parent_block_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  version,
});

describe('NoteDocumentOpQueue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('routes content patch through op-log persist', async () => {
    const blocks = new Map([['a', baseBlock('a', 'hello', 3)]]);
    const persistViaOpLog = vi.fn().mockResolvedValue(undefined);
    const triggerSave = vi.fn();

    const queue = new NoteDocumentOpQueue({
      getBlock: (id) => blocks.get(id),
      getActiveBlockId: () => null,
      triggerSave,
      persistViaOpLog,
    });

    await queue.enqueue({
      type: 'patchContent',
      updates: [{ id: 'a', content: { text: 'hello world' } }],
    });

    expect(persistViaOpLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'patchContent',
        updates: [{ id: 'a', content: { text: 'hello world' } }],
      }),
      { immediate: false },
    );
    expect(triggerSave).toHaveBeenCalled();
  });

  it('routes createBlock through op-log persist with immediate flush', async () => {
    const blocks = new Map<string, NoteBlock>();
    const persistViaOpLog = vi.fn().mockResolvedValue(undefined);
    const triggerSave = vi.fn();

    const queue = new NoteDocumentOpQueue({
      getBlock: (id) => blocks.get(id),
      getActiveBlockId: () => null,
      triggerSave,
      persistViaOpLog,
    });

    const result = await queue.enqueueCreateBlock({
      type: 'createBlock',
      id: 'client-new-1',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '' },
      order_index: 1,
      parent_block_id: null,
      normalizeOrders: [{ id: 'a', order_index: 0 }],
      transactionUpdates: [
        { id: 'child', parent_block_id: 'client-new-1', order_index: 0 },
      ],
    });

    expect(result.id).toBe('client-new-1');
    expect(persistViaOpLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'createBlock', id: 'client-new-1' }),
      { immediate: true },
    );
    expect(triggerSave).toHaveBeenCalled();
  });

  it('routes blockTransaction through op-log persist', async () => {
    const blocks = new Map([
      ['root', { ...baseBlock('root', 'a', 2), parent_block_id: null }],
      ['child', { ...baseBlock('child', 'b', 5), parent_block_id: 'root' }],
    ]);
    const persistViaOpLog = vi.fn().mockResolvedValue(undefined);

    const queue = new NoteDocumentOpQueue({
      getBlock: (id) => blocks.get(id),
      getActiveBlockId: () => null,
      triggerSave: vi.fn(),
      persistViaOpLog,
    });

    await queue.enqueue({
      type: 'blockTransaction',
      patches: [
        { id: 'root', document_id: 'doc-2', parent_block_id: null },
        { id: 'child', document_id: 'doc-2' },
      ],
      deleteIds: [],
    });

    expect(persistViaOpLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'blockTransaction',
        patches: expect.arrayContaining([
          expect.objectContaining({ id: 'root', document_id: 'doc-2' }),
        ]),
      }),
      { immediate: true },
    );
  });

  it('throws when op-log persist is unavailable', async () => {
    const queue = new NoteDocumentOpQueue({
      getBlock: () => undefined,
      getActiveBlockId: () => null,
      triggerSave: vi.fn(),
    });

    await expect(queue.enqueue({
      type: 'softDelete',
      ids: ['root'],
    })).rejects.toThrow('op-log persist is required');
  });

  it('surfaces NoteBlockVersionConflictError shape from API helper', () => {
    const error = new NoteBlockVersionConflictError([{
      id: 'a',
      version: 2,
      updated_at: '2026-01-02T00:00:00Z',
      type: 'text',
      content: { text: '' },
      order_index: 0,
    }]);
    expect(error.conflicts[0].version).toBe(2);
  });

  it('restores block from trash via POST', async () => {
    const restored: NoteBlock = {
      ...baseBlock('trash-1', 'restored', 1),
      deleted_at: null,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ ok: true, block: restored }),
      { status: 200 },
    ));

    const triggerSave = vi.fn();
    const queue = new NoteDocumentOpQueue({
      getBlock: () => undefined,
      getActiveBlockId: () => null,
      triggerSave,
      persistViaOpLog: vi.fn(),
    });

    const result = await queue.enqueueRestoreBlock({ id: 'trash-1' });

    expect(result[0].id).toBe('trash-1');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain('/trash/restore');
    expect(triggerSave).toHaveBeenCalledOnce();
  });

  it('purges block from trash via op-log', async () => {
    const persistViaOpLog = vi.fn().mockResolvedValue(undefined);
    const triggerSave = vi.fn();
    const queue = new NoteDocumentOpQueue({
      getBlock: () => undefined,
      getActiveBlockId: () => null,
      triggerSave,
      persistViaOpLog,
    });

    await queue.enqueue({ type: 'purgeBlock', id: 'trash-2' });

    expect(persistViaOpLog).toHaveBeenCalledWith(
      { type: 'purgeBlock', id: 'trash-2' },
      { immediate: true },
    );
    expect(triggerSave).toHaveBeenCalledOnce();
  });
});
