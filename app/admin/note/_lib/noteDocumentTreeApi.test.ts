import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSubPageTree,
  reparentDocumentTree,
} from './noteDocumentTreeApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('note document tree api', () => {
  it('creates document, page block, and initial block through one action', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        document: { id: 'child', parent_id: 'parent', title: 'Child' },
        page_block: { id: 'page', document_id: 'parent', type: 'page' },
        initial_block: { id: 'text', document_id: 'child', type: 'text' },
      }),
      { status: 200 },
    ));

    const result = await createSubPageTree({
      parentDocumentId: 'parent',
      parentBlockId: null,
      orderIndex: 2,
      title: 'Child',
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body).toEqual({
      action: 'createSubPage',
      parentDocumentId: 'parent',
      parentBlockId: null,
      orderIndex: 2,
      title: 'Child',
    });
    expect(result.pageBlock.id).toBe('page');
    expect(result.initialBlock.id).toBe('text');
  });

  it('reparents a document and returns its single canonical page link', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({
        document: { id: 'child', parent_id: 'next', title: 'Child' },
        page_block: { id: 'page-next', document_id: 'next', type: 'page' },
      }),
      { status: 200 },
    ));

    const result = await reparentDocumentTree({
      documentId: 'child',
      newParentId: 'next',
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body).toEqual({
      action: 'reparentDocument',
      documentId: 'child',
      newParentId: 'next',
    });
    expect(result.pageBlock?.id).toBe('page-next');
  });
});
