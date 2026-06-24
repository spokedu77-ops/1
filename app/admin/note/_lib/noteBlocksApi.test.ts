import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  NoteBlockVersionConflictError,
  parsePatchedBlocks,
  patchNoteBlocksResolvingConflicts,
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
