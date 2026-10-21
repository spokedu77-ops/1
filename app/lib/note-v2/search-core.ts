/** Stage 5 title-only search. Pure and read-only; never searches drafts or hidden/deleted notes. */
import { compareTreeRows, getTreeAncestors, type NoteV2TreeRow } from './tree-core';

export type NoteV2SearchResult = {
  id: string;
  title: string;
  path: string[];
};

export function normalizeNoteQuery(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().trim().replace(/\s+/g, ' ');
}

export function getVisibleBreadcrumbs(
  id: string, rows: readonly NoteV2TreeRow[], visibleIds: ReadonlySet<string>,
): NoteV2TreeRow[] {
  if (!visibleIds.has(id)) return [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ids = [...getTreeAncestors(id, rows), id];
  if (ids.some((ancestor) => !visibleIds.has(ancestor))) return [];
  const path = ids.map((ancestor) => byId.get(ancestor)).filter((row): row is NoteV2TreeRow => Boolean(row));
  return path.length === ids.length ? path : [];
}

export function searchVisibleNoteTitles(
  rows: readonly NoteV2TreeRow[], visibleIds: ReadonlySet<string>, query: string, limit = 25,
): NoteV2SearchResult[] {
  const normalized = normalizeNoteQuery(query);
  if (!normalized || !Number.isSafeInteger(limit) || limit < 1) return [];
  const terms = normalized.split(' ');
  const candidates = rows.filter((row) => visibleIds.has(row.id) && row.deleted_at === null);
  return candidates
    .filter((row) => terms.every((term) => normalizeNoteQuery(row.title).includes(term)))
    .sort((a, b) => {
      const at = normalizeNoteQuery(a.title);
      const bt = normalizeNoteQuery(b.title);
      const score = (value: string) => value === normalized ? 0 : value.startsWith(normalized) ? 1 : 2;
      return score(at) - score(bt) || compareTreeRows(a, b);
    })
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      title: row.title,
      path: getVisibleBreadcrumbs(row.id, rows, visibleIds).map((ancestor) => ancestor.title),
    }))
    .filter((result) => result.path.length > 0);
}
