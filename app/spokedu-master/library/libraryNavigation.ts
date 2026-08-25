import type { LibraryViewMode } from './libraryViewModel';

export function getLibraryProgramDetailHref(
  programId: string,
  sourceLibraryView?: LibraryViewMode,
  sourceLibrarySearch?: string,
): string {
  const baseHref = `/spokedu-master/library/${programId}`;
  const params = new URLSearchParams();
  if (sourceLibraryView === 'favorites') params.set('libraryView', 'favorites');
  if (sourceLibrarySearch?.trim()) {
    params.set('libraryReturn', sourceLibrarySearch);
    const source = new URLSearchParams(sourceLibrarySearch);
    for (const key of ['session', 'returnTo', 'source'] as const) {
      const value = source.get(key);
      if (value?.trim()) params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}

export function getLibraryReturnHref(libraryView: string | null, libraryReturn?: string | null): string {
  if (libraryReturn && libraryReturn.length <= 2000) {
    const requested = new URLSearchParams(libraryReturn);
    const allowed = new URLSearchParams();
    for (const key of ['q', 'filters', 'view', 'shelf', 'reason', 'filterGroup', 'filter', 'session', 'returnTo', 'source']) {
      for (const value of requested.getAll(key)) {
        if (!value.trim()) continue;
        if (key === 'returnTo' && !(value === '/spokedu-master/activity' || value.startsWith('/spokedu-master/activity?'))) continue;
        if (key === 'source' && value !== 'session') continue;
        allowed.append(key, value);
      }
    }
    const query = allowed.toString();
    if (query) return `/spokedu-master/library?${query}`;
  }
  return libraryView === 'favorites'
    ? '/spokedu-master/library?view=favorites'
    : '/spokedu-master/library';
}
