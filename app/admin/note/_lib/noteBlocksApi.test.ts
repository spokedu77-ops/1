import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  NoteBlockVersionConflictError,
  parsePatchedBlocks,
  patchNoteBlocks,
  patchNoteBlocksResolvingConflicts,
  postNoteBlockTransaction,
  postNoteBlockCreateTransaction,
  postNoteBlock,
} from './noteBlocksApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('parsePatchedBlocks', () => {
  it('reads conflicts from 409 payload', () => {
    const blocks = parsePatchedBlocks({
      error: 'version_conflict',
      conflicts: [{
        id: 'block-a',
        version: 4,
        updated_at: '2026-01-02T00:00:00Z',
        content: { text: 'server' },
      }],
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe('block-a');
    expect(blocks[0].version).toBe(4);
  });

  it('reads blocks from success payload', () => {
    const blocks = parsePatchedBlocks({
      ok: true,
      blocks: [{ id: 'b', version: 2, updated_at: '2026-01-01T00:00:00Z' }],
    });
    expect(blocks[0].version).toBe(2);
  });
});

describe('NoteBlockVersionConflictError', () => {
  it('carries conflicts array', () => {
    const error = new NoteBlockVersionConflictError([
      {
        id: 'x',
        version: 3,
        updated_at: '2026-01-01T00:00:00Z',
        type: 'text',
        content: { text: '' },
        order_index: 0,
      },
    ]);
    expect(error).toBeInstanceOf(NoteBlockVersionConflictError);
    expect(error.conflicts[0].version).toBe(3);
  });

  it('can represent an empty server conflict payload without becoming a plain error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        error: 'version_conflict',
        conflicts: [],
      }),
      { status: 409 },
    ));

    await expect(patchNoteBlocks(
      [{ id: 'a', content: { text: 'x' } }],
    )).rejects.toMatchObject({
      name: 'NoteBlockVersionConflictError',
      conflicts: [],
    });
  });
});

describe('patchNoteBlocksResolvingConflicts', () => {
  it('retries once with server version after 409', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          error: 'version_conflict',
          conflicts: [{
            id: 'a',
            version: 4,
            updated_at: '2026-02-01T00:00:00Z',
          }],
        }),
        { status: 409 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          ok: true,
          blocks: [{ id: 'a', version: 5, updated_at: '2026-02-02T00:00:00Z' }],
        }),
        { status: 200 },
      ));

    const result = await patchNoteBlocksResolvingConflicts(
      [{ id: 'a', content: { text: 'moved' } }],
      () => ({ id: 'a', version: 3 }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    expect(retryBody.expected_version).toBe(4);
    expect(result[0].version).toBe(5);
  });

  it('keeps absorbing newer server versions across repeated conflicts', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          error: 'version_conflict',
          conflicts: [{ id: 'a', version: 4, updated_at: '2026-02-01T00:00:00Z' }],
        }),
        { status: 409 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          error: 'version_conflict',
          conflicts: [{ id: 'a', version: 5, updated_at: '2026-02-01T00:00:01Z' }],
        }),
        { status: 409 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          ok: true,
          blocks: [{ id: 'a', version: 6, updated_at: '2026-02-02T00:00:00Z' }],
        }),
        { status: 200 },
      ));

    await patchNoteBlocksResolvingConflicts(
      [{ id: 'a', content: { text: 'local intent' } }],
      () => ({ id: 'a', version: 3 }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const thirdBody = JSON.parse(String((fetchMock.mock.calls[2][1] as RequestInit).body));
    expect(thirdBody.expected_version).toBe(5);
  });

  it('merges only locally changed content fields on conflict retry', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          error: 'version_conflict',
          conflicts: [{
            id: 'todo',
            version: 4,
            updated_at: '2026-02-01T00:00:00Z',
            content: { text: 'server edited text', checked: false },
          }],
        }),
        { status: 409 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          ok: true,
          blocks: [{ id: 'todo', version: 5, updated_at: '2026-02-02T00:00:00Z' }],
        }),
        { status: 200 },
      ));

    await patchNoteBlocksResolvingConflicts(
      [{
        id: 'todo',
        content: { text: 'old text', checked: true },
        baseContent: { text: 'old text', checked: false },
      }],
      () => ({ id: 'todo', version: 3, content: { text: 'old text', checked: true } }),
    );

    const initialBody = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    const retryBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    expect(initialBody.baseContent).toBeUndefined();
    expect(retryBody.content).toEqual({
      text: 'server edited text',
      checked: true,
    });
    expect(retryBody.baseContent).toBeUndefined();
  });

  it('retries only the conflicting chunk when updates exceed the server limit', async () => {
    const updates = Array.from({ length: 201 }, (_, index) => ({
      id: `block-${index}`,
      content: { text: `text-${index}` },
    }));
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          ok: true,
          blocks: updates.slice(0, 200).map((update) => ({
            id: update.id,
            version: 2,
            updated_at: '2026-02-01T00:00:00Z',
          })),
        }),
        { status: 200 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          error: 'version_conflict',
          conflicts: [{
            id: 'block-200',
            version: 4,
            updated_at: '2026-02-01T00:00:00Z',
          }],
        }),
        { status: 409 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          ok: true,
          blocks: [{
            id: 'block-200',
            version: 5,
            updated_at: '2026-02-02T00:00:00Z',
          }],
        }),
        { status: 200 },
      ));

    const result = await patchNoteBlocksResolvingConflicts(
      updates,
      (id) => ({ id, version: 1 }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstBody = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    const retryBody = JSON.parse(String((fetchMock.mock.calls[2][1] as RequestInit).body));
    expect(firstBody.updates).toHaveLength(200);
    expect(secondBody.id).toBe('block-200');
    expect(retryBody).toEqual(expect.objectContaining({
      id: 'block-200',
      expected_version: 4,
    }));
    expect(result).toHaveLength(201);
  });
});

describe('patchNoteBlocks', () => {
  it('splits more than 200 updates into sequential requests', async () => {
    const updates = Array.from({ length: 401 }, (_, index) => ({
      id: `block-${index}`,
      content: { text: `text-${index}` },
    }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      const requestUpdates = Array.isArray(body.updates) ? body.updates : [body];
      return new Response(JSON.stringify({
        ok: true,
        blocks: requestUpdates.map((update: { id: string }) => ({
          id: update.id,
          version: 2,
          updated_at: '2026-02-01T00:00:00Z',
        })),
      }), { status: 200 });
    });

    const result = await patchNoteBlocks(updates);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const requestSizes = fetchMock.mock.calls.map((call) => {
      const body = JSON.parse(String((call[1] as RequestInit).body));
      return Array.isArray(body.updates) ? body.updates.length : 1;
    });
    expect(requestSizes).toEqual([200, 200, 1]);
    expect(result).toHaveLength(401);
  });
});

describe('postNoteBlock', () => {
  it('returns block with normalized version', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        block: {
          id: 'b-new',
          document_id: 'doc-1',
          type: 'text',
          content: { text: '' },
          order_index: 0,
          parent_block_id: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          version: 1,
        },
      }),
      { status: 200 },
    ));

    const block = await postNoteBlock({
      documentId: 'doc-1',
      blockType: 'text',
      content: { text: '' },
      parent_block_id: null,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(block.id).toBe('b-new');
    expect(block.version).toBe(1);
  });
});

describe('postNoteBlockTransaction', () => {
  it('merges duplicate block patches and sends deletes in one request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        ok: true,
        blocks: [{
          id: 'a',
          version: 4,
          updated_at: '2026-06-25T00:00:00Z',
        }],
      }),
      { status: 200 },
    ));

    await postNoteBlockTransaction(
      [
        { id: 'a', order_index: 2 },
        { id: 'a', parent_block_id: 'parent', content: { text: 'moved' } },
      ],
      ['deleted'],
      () => ({ id: 'a', version: 3 }),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/note/blocks/transaction');
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body).toEqual({
      updates: [{
        id: 'a',
        order_index: 2,
        parent_block_id: 'parent',
        content: { text: 'moved' },
        expected_version: 3,
      }],
      deleteIds: ['deleted'],
    });
  });

  it('retries transaction updates with the server conflict version', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          error: 'version_conflict',
          conflicts: [{ id: 'a', version: 4, updated_at: '2026-06-25T00:00:00Z' }],
        }),
        { status: 409 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          ok: true,
          blocks: [{ id: 'a', version: 5, updated_at: '2026-06-25T00:00:01Z' }],
        }),
        { status: 200 },
      ));

    await postNoteBlockTransaction(
      [{ id: 'a', order_index: 2 }],
      [],
      () => ({ id: 'a', version: 3 }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    expect(retryBody.updates[0]).toEqual(expect.objectContaining({
      id: 'a',
      order_index: 2,
      expected_version: 4,
    }));
  });
});

describe('postNoteBlockCreateTransaction', () => {
  it('sends create and sibling order updates in one request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        ok: true,
        blocks: [{ id: 'a', version: 3, updated_at: '2026-06-25T00:00:00Z' }],
        createdBlocks: [{
          id: 'new',
          document_id: 'doc',
          parent_block_id: null,
          type: 'text',
          order_index: 0,
          content: { text: '' },
          created_at: '2026-06-25T00:00:00Z',
          updated_at: '2026-06-25T00:00:00Z',
          version: 1,
        }],
      }),
      { status: 200 },
    ));

    const result = await postNoteBlockCreateTransaction(
      {
        id: 'client-new',
        documentId: 'doc',
        blockType: 'text',
        content: { text: '' },
        order_index: 0,
        parent_block_id: null,
      },
      [{ id: 'a', order_index: 1 }],
      () => ({ id: 'a', version: 2 }),
    );

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.updates[0]).toEqual({
      id: 'a',
      order_index: 1,
      expected_version: 2,
    });
    expect(body.creates[0]).toEqual({
      id: 'client-new',
      document_id: 'doc',
      parent_block_id: null,
      type: 'text',
      order_index: 0,
      content: { text: '' },
    });
    expect(result.createdBlock.id).toBe('new');
  });

  it('retries create transaction before creating when sibling order version conflicts', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          error: 'version_conflict',
          conflicts: [{ id: 'a', version: 4, updated_at: '2026-06-25T00:00:00Z' }],
        }),
        { status: 409 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          ok: true,
          blocks: [{ id: 'a', version: 5, updated_at: '2026-06-25T00:00:01Z' }],
          createdBlocks: [{
            id: 'new',
            document_id: 'doc',
            parent_block_id: null,
            type: 'text',
            order_index: 0,
            content: { text: '' },
            created_at: '2026-06-25T00:00:01Z',
            updated_at: '2026-06-25T00:00:01Z',
            version: 1,
          }],
        }),
        { status: 200 },
      ));

    const result = await postNoteBlockCreateTransaction(
      {
        documentId: 'doc',
        blockType: 'text',
        content: { text: '' },
        order_index: 0,
        parent_block_id: null,
      },
      [{ id: 'a', order_index: 1 }],
      () => ({ id: 'a', version: 3 }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    expect(retryBody.updates[0]).toEqual(expect.objectContaining({
      id: 'a',
      order_index: 1,
      expected_version: 4,
    }));
    expect(retryBody.creates).toHaveLength(1);
    expect(result.createdBlock.id).toBe('new');
  });
});
