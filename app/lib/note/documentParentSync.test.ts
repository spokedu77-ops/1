import { describe, expect, it } from 'vitest';
import {
  applyDocumentParentPatchesInMemory,
  planDocumentParentPatches,
} from './documentParentSync';

describe('planDocumentParentPatches', () => {
  it('sets parent_id from page block document_id', () => {
    const docs = [
      { id: 'child', parent_id: null },
      { id: 'parent', parent_id: null },
    ];
    const patches = planDocumentParentPatches(docs, [
      { document_id: 'parent', content: { page_document_id: 'child', title: 'Child' } },
    ]);
    expect(patches).toEqual([{ id: 'child', parent_id: 'parent' }]);
  });

  it('clears stale parent_id when page link is missing', () => {
    const docs = [
      { id: 'child', parent_id: 'old-parent' },
      { id: 'old-parent', parent_id: null },
    ];
    const patches = planDocumentParentPatches(docs, []);
    expect(patches).toEqual([{ id: 'child', parent_id: null }]);
  });

  it('corrects wrong parent_id to canonical page block host', () => {
    const docs = [{ id: 'child', parent_id: 'wrong' }];
    const patches = planDocumentParentPatches(docs, [
      { document_id: 'right', content: { page_document_id: 'child' } },
    ]);
    expect(patches).toEqual([{ id: 'child', parent_id: 'right' }]);
  });

  it('applyDocumentParentPatchesInMemory merges patches', () => {
    const docs = [
      { id: 'a', parent_id: null },
      { id: 'b', parent_id: 'x' },
    ];
    const next = applyDocumentParentPatchesInMemory(docs, [
      { id: 'a', parent_id: 'root' },
      { id: 'b', parent_id: null },
    ]);
    expect(next).toEqual([
      { id: 'a', parent_id: 'root' },
      { id: 'b', parent_id: null },
    ]);
  });
});
