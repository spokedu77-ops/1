import { describe, expect, it } from 'vitest';
import { findDefaultNoteEntryDocument } from './noteDocumentUi';
import type { NoteDocument } from './types';

function doc(id: string, title: string, deleted = false): NoteDocument {
  return {
    id,
    title,
    is_archived: false,
    is_favorite: false,
    is_pinned: false,
    is_public: false,
    parent_id: null,
    slug: null,
    properties: {},
    created_at: '',
    updated_at: '',
    deleted_at: deleted ? '2026-01-01' : null,
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
