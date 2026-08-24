import type { LibraryViewMode } from './libraryViewModel';

export function getLibraryProgramDetailHref(
  programId: string,
  sourceLibraryView?: LibraryViewMode,
  sourceLibrarySearch?: string,
): string {
  const baseHref = `/spokedu-master/library/${programId}`;
  const params = new URLSearchParams();
  if (sourceLibraryView === 'favorites') params.set('libraryView', 'favorites');
  if (sourceLibrarySearch?.trim()) params.set('libraryReturn', sourceLibrarySearch);
  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}

export function getLibraryReturnHref(libraryView: string | null, libraryReturn?: string | null): string {
  if (libraryReturn && libraryReturn.length <= 2000) {
    const requested = new URLSearchParams(libraryReturn);
    const allowed = new URLSearchParams();
    for (const key of ['q', 'filters', 'view', 'shelf', 'reason', 'filterGroup', 'filter']) {
      for (const value of requested.getAll(key)) {
        if (value.trim()) allowed.append(key, value);
      }
    }
    const query = allowed.toString();
    if (query) return `/spokedu-master/library?${query}`;
  }
  return libraryView === 'favorites'
    ? '/spokedu-master/library?view=favorites'
    : '/spokedu-master/library';
}
