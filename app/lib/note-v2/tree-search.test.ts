import { describe, expect, it } from 'vitest';
import { projectNoteV2Tree, type NoteV2TreeRow } from './tree-core';
import { searchVisibleNoteTitles } from './search-core';

const row = (id: string, parent_id: string | null, position: number, deleted_at: string | null = null): NoteV2TreeRow => ({
  id, parent_id, position, deleted_at, title: id,
  created_at: `2026-01-01T00:00:0${position}Z`, updated_at: '2026-01-01T00:00:00Z',
});
describe('Note v2 tree and search projection', () => {
  it('hides descendants of trashed parents without deleting them', () => {
    const rows = [row('parent', null, 0, '2026-01-02T00:00:00Z'), row('child', 'parent', 0)];
    const tree = projectNoteV2Tree(rows);
    expect(tree.visibleIds.size).toBe(0);
    expect(tree.hiddenByAncestorIds.has('child')).toBe(true);
    expect(tree.trash.map((item) => item.id)).toEqual(['parent']);
  });

  it('excludes hidden and deleted pages from title search', () => {
    const rows = [row('Visible Page', null, 0), row('Hidden Page', 'missing', 1)];
    const tree = projectNoteV2Tree(rows);
    expect(searchVisibleNoteTitles(rows, tree.visibleIds, 'page').map((item) => item.id)).toEqual(['Visible Page']);
  });
});
