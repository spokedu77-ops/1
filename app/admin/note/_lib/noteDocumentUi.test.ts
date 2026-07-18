import { describe, expect, it } from 'vitest';
import {
  filterDocumentsOutsideFeaturedAncestors,
  findDefaultNoteEntryDocument,
} from './noteDocumentUi';
import type { NoteDocument } from './types';

function doc(id: string, title: string, deleted = false): NoteDocument {
  return {
    id,
    title,
    is_archived: false,
    is_favorite: false,
    is_pinned: false,
    is_public: false,
    share_token: null,
    parent_id: null,
    slug: null,
    properties: {},
    created_at: '',
    updated_at: '',
    deleted_at: deleted ? '2026-01-01' : null,
  };
}

function childDoc(id: string, title: string, parentId: string): NoteDocument {
  return {
    ...doc(id, title),
    parent_id: parentId,
  };
}

describe('findDefaultNoteEntryDocument', () => {
  it('matches 공통 보드 by title (ignores extra spaces)', () => {
    const found = findDefaultNoteEntryDocument([
      doc('other', '회의록'),
      doc('board', '  공통  보드  '),
    ]);
    expect(found?.id).toBe('board');
  });

  it('matches 공통보드 without space', () => {
    const found = findDefaultNoteEntryDocument([doc('board', '공통보드')]);
    expect(found?.id).toBe('board');
  });

  it('ignores deleted documents', () => {
    expect(findDefaultNoteEntryDocument([doc('board', '공통 보드', true)])).toBeNull();
  });
});

describe('filterDocumentsOutsideFeaturedAncestors', () => {
  it('does not promote children of favorite parents into the personal root list', () => {
    const favorite = { ...doc('favorite', 'Favorite'), is_favorite: true };
    const child = childDoc('child', 'Child', 'favorite');
    const standalone = doc('standalone', 'Standalone');

    expect(filterDocumentsOutsideFeaturedAncestors(
      [child, standalone],
      new Set(['favorite']),
      [favorite, child, standalone],
    ).map((item) => item.id)).toEqual(['standalone']);
  });

  it('excludes deep descendants under featured ancestors', () => {
    const favorite = { ...doc('favorite', 'Favorite'), is_favorite: true };
    const child = childDoc('child', 'Child', 'favorite');
    const grandchild = childDoc('grandchild', 'Grandchild', 'child');

    expect(filterDocumentsOutsideFeaturedAncestors(
      [child, grandchild],
      new Set(['favorite']),
      [favorite, child, grandchild],
    )).toEqual([]);
  });

  it('uses the full document set for ancestor checks even when the visible list is filtered', () => {
    const favorite = { ...doc('favorite', 'Favorite'), is_favorite: true };
    const child = childDoc('child', 'Visible Child', 'favorite');

    expect(filterDocumentsOutsideFeaturedAncestors(
      [child],
      new Set(['favorite']),
      [favorite, child],
    )).toEqual([]);
  });
});
