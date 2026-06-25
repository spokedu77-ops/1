import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NoteBlockVersionConflictError,
  type PatchedNoteBlock,
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

  it('sends expected_version on content patch', async () => {
    const blocks = new Map([['a', baseBlock('a', 'hello', 3)]]);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        ok: true,
        blocks: [{ id: 'a', version: 4, updated_at: '2026-02-01T00:00:00Z' }],
      }),
      { status: 200 },
    ));

    const onServerPatches = vi.fn();
    const queue = new NoteDocumentOpQueue({
      getBlock: (id) => blocks.get(id),
      getActiveBlockId: () => null,
      triggerSave: vi.fn(),
      onServerPatches,
    });

    await queue.enqueue({
      type: 'patchContent',
      updates: [{ id: 'a', content: { text: 'hello world' } }],
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.expected_version).toBe(3);
    expect(onServerPatches).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'a', version: 4 }),
    ]);
  });

  it('retries content patch after version conflict when local changed', async () => {
    const blocks = new Map([['a', baseBlock('a', 'local newer', 3)]]);
    const conflictBlock: PatchedNoteBlock = {
      id: 'a',
      version: 4,
      updated_at: '2026-02-01T00:00:00Z',
      type: 'text',
      content: { text: 'server' },
      order_index: 0,
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: 'version_conflict', conflicts: [conflictBlock] }),
        { status: 409 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          ok: true,
          blocks: [{ id: 'a', version: 5, updated_at: '2026-02-02T00:00:00Z' }],
        }),
        { status: 200 },
      ));

    const onServerConflicts = vi.fn();
    const queue = new NoteDocumentOpQueue({
      getBlock: (id) => blocks.get(id),
      getActiveBlockId: () => 'a',
      triggerSave: vi.fn(),
      onServerConflicts,
    });

    await queue.enqueue({
      type: 'patchContent',
      updates: [{ id: 'a', content: { text: 'stale sent' } }],
    });

    expect(onServerConflicts).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    expect(retryBody.expected_version).toBe(4);
    expect(retryBody.content).toEqual({ text: 'local newer' });
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

  it('creates block and normalizes sibling orders in one transaction', async () => {
    const blocks = new Map<string, NoteBlock>([
      ['a', { ...baseBlock('a', 'a', 2), order_index: 0 }],
    ]);
    const created: NoteBlock = {
      ...baseBlock('new-1', '', 1),
      order_index: 1,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        ok: true,
        blocks: [{ id: 'a', version: 3, updated_at: '2026-06-25T00:00:00Z' }],
        createdBlocks: [created],
      }),
      { status: 200 },
    ));

    const triggerSave = vi.fn();
    const queue = new NoteDocumentOpQueue({
      getBlock: (id) => blocks.get(id),
      getActiveBlockId: () => null,
      triggerSave,
    });

    const result = await queue.enqueueCreateBlock({
      type: 'createBlock',
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '' },
      order_index: 1,
      parent_block_id: null,
      normalizeOrders: [
        { id: 'a', order_index: 0 },
      ],
    });

    expect(result.id).toBe('new-1');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/note/blocks/transaction');
    expect(String((fetchMock.mock.calls[0][1] as RequestInit).method)).toBe('POST');
    expect(triggerSave).toHaveBeenCalledOnce();
  });

  it('transfers blocks to another document with version', async () => {
    const blocks = new Map([
      ['root', { ...baseBlock('root', 'a', 2), parent_block_id: null }],
      ['child', { ...baseBlock('child', 'b', 5), parent_block_id: 'root' }],
    ]);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        ok: true,
        blocks: [
          { id: 'root', version: 3, updated_at: '2026-02-01T00:00:00Z' },
          { id: 'child', version: 6, updated_at: '2026-02-01T00:00:00Z' },
        ],
      }),
      { status: 200 },
    ));

    const queue = new NoteDocumentOpQueue({
      getBlock: (id) => blocks.get(id),
      getActiveBlockId: () => null,
      triggerSave: vi.fn(),
    });

    await queue.enqueue({
      type: 'blockTransaction',
      patches: [
        { id: 'root', document_id: 'doc-2', parent_block_id: null },
        { id: 'child', document_id: 'doc-2' },
      ],
      deleteIds: [],
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.updates).toEqual([
      expect.objectContaining({ id: 'root', document_id: 'doc-2', expected_version: 2 }),
      expect.objectContaining({ id: 'child', document_id: 'doc-2', expected_version: 5 }),
    ]);
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
    });

    const result = await queue.enqueueRestoreBlock({ id: 'trash-1' });

    expect(result[0].id).toBe('trash-1');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain('/trash/restore');
    expect(triggerSave).toHaveBeenCalledOnce();
  });

  it('purges block from trash via DELETE', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ ok: true }),
      { status: 200 },
    ));

    const triggerSave = vi.fn();
    const queue = new NoteDocumentOpQueue({
      getBlock: () => undefined,
      getActiveBlockId: () => null,
      triggerSave,
    });

    await queue.enqueue({ type: 'purgeBlock', id: 'trash-2' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain('/trash/purge');
    expect(String((fetchMock.mock.calls[0][1] as RequestInit).method)).toBe('DELETE');
    expect(triggerSave).toHaveBeenCalledOnce();
  });

  it('rejects a failed delete while keeping the queue usable', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: 'delete failed' }),
        { status: 500 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ ok: true }),
        { status: 200 },
      ));
    const onError = vi.fn();
    const queue = new NoteDocumentOpQueue({
      getBlock: () => undefined,
      getActiveBlockId: () => null,
      triggerSave: vi.fn(),
      onError,
    });

    await expect(queue.enqueue({
      type: 'softDelete',
      ids: ['root', 'child'],
    })).rejects.toThrow('delete failed');
    await queue.enqueue({ type: 'purgeBlock', id: 'trash-2' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'delete failed',
    }));
  });
});
