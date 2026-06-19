import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  consumePrefetchedNoteBlocks,
  invalidatePrefetchedNoteBlocks,
  prefetchNoteDocumentBlocks,
} from './noteDocumentBlocksPrefetch';

describe('noteDocumentBlocksPrefetch', () => {
  beforeEach(() => {
    invalidatePrefetchedNoteBlocks();
    vi.restoreAllMocks();
  });

  it('returns prefetched blocks on consume', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ blocks: [{ id: 'b1' }] }),
    }));

    prefetchNoteDocumentBlocks('doc-1');
    await new Promise((r) => setTimeout(r, 0));
    const blocks = await consumePrefetchedNoteBlocks('doc-1');
    expect(blocks).toHaveLength(1);
    expect(blocks?.[0].id).toBe('b1');
  });

  it('returns null when no prefetch', async () => {
    await expect(consumePrefetchedNoteBlocks('missing')).resolves.toBeNull();
  });
});
