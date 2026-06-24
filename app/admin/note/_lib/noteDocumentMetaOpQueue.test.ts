import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueueDocumentPatch } from './noteDocumentMetaOpQueue';
import type { NoteDocument } from './types';

const sampleDoc = (id: string): NoteDocument => ({
  id,
  title: 'Test',
  is_archived: false,
  is_favorite: false,
  is_pinned: false,
  is_public: false,
  share_token: null,
  parent_id: null,
  slug: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('enqueueDocumentPatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('runs document PATCH requests sequentially', async () => {
    const order: string[] = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { id: string; is_pinned?: boolean };
      order.push(body.id);
      await new Promise((resolve) => { setTimeout(resolve, body.is_pinned ? 20 : 5); });
      return new Response(
        JSON.stringify({ document: sampleDoc(body.id) }),
        { status: 200 },
      );
    });

    const first = enqueueDocumentPatch({ id: 'doc-a', is_pinned: true });
    const second = enqueueDocumentPatch({ id: 'doc-b', is_pinned: false });

    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(order).toEqual(['doc-a', 'doc-b']);
  });
});
