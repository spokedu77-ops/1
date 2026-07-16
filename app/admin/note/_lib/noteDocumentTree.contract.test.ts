import { describe, expect, it } from 'vitest';
import { deriveDocumentTreeState } from './noteDocumentUi';
import type { NoteDocument } from './types';

function doc(
  id: string,
  parent_id: string | null,
  updated_at: string,
  title = id,
): NoteDocument {
  return {
    id,
    title,
    parent_id,
    updated_at,
    created_at: updated_at,
    is_archived: false,
    is_favorite: false,
    is_pinned: false,
    is_public: false,
    share_token: null,
    slug: null,
    properties: {},
    deleted_at: null,
  };
}

describe('deriveDocumentTreeState', () => {
  it('builds children from projected parent_id after page-block reconcile', () => {
    const { childrenByParent, rootDocuments } = deriveDocumentTreeState([
      doc('parent', null, '2026-07-01T00:00:00.000Z'),
      doc('child', 'parent', '2026-07-02T00:00:00.000Z'),
    ]);

    expect(rootDocuments.map((item) => item.id)).toEqual(['parent']);
    expect(childrenByParent.get('parent')?.map((item) => item.id)).toEqual(['child']);
  });

  it('promotes documents with missing parents to roots instead of hiding them', () => {
    const { childrenByParent, rootDocuments } = deriveDocumentTreeState([
      doc('orphan', 'missing-parent', '2026-07-01T00:00:00.000Z'),
    ]);

    expect(childrenByParent.size).toBe(0);
    expect(rootDocuments.map((item) => item.id)).toEqual(['orphan']);
  });

  it('promotes self-parented documents to roots to break cycles', () => {
    const { rootDocuments } = deriveDocumentTreeState([
      doc('self', 'self', '2026-07-01T00:00:00.000Z'),
    ]);

    expect(rootDocuments.map((item) => item.id)).toEqual(['self']);
  });

  it('sorts roots and siblings by recent update with deterministic tie breakers', () => {
    const { childrenByParent, rootDocuments } = deriveDocumentTreeState([
      doc('root-b', null, '2026-07-01T00:00:00.000Z', 'B'),
      doc('root-a', null, '2026-07-02T00:00:00.000Z', 'A'),
      doc('parent', null, '2026-07-03T00:00:00.000Z', 'Parent'),
      doc('child-b', 'parent', '2026-07-04T00:00:00.000Z', 'B'),
      doc('child-a', 'parent', '2026-07-04T00:00:00.000Z', 'A'),
    ]);

    expect(rootDocuments.map((item) => item.id)).toEqual(['parent', 'root-a', 'root-b']);
    expect(childrenByParent.get('parent')?.map((item) => item.id)).toEqual(['child-a', 'child-b']);
  });
});
