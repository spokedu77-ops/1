export type LibraryViewMode = 'all' | 'favorites';

export function parseLibraryView(value: string | null): LibraryViewMode {
  return value === 'favorites' ? 'favorites' : 'all';
}

export function selectLibraryBasePrograms<T extends { id: string }>(
  programs: T[],
  favoriteProgramIds: string[],
  view: LibraryViewMode,
): T[] {
  if (view === 'all') return programs;
  const favoriteIds = new Set(favoriteProgramIds);
  return programs.filter((program) => favoriteIds.has(program.id));
}

export function countValidFavoritePrograms<T extends { id: string }>(
  programs: T[],
  favoriteProgramIds: string[],
): number {
  const programIds = new Set(programs.map((program) => program.id));
  return new Set(favoriteProgramIds.filter((id) => programIds.has(id))).size;
}

export function filterLibraryPrograms<T>(
  programs: T[],
  query: string,
  matchesQuery: (program: T, normalizedQuery: string) => boolean,
  matchesActiveFilter: (program: T) => boolean,
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  return programs.filter(
    (program) =>
      (normalizedQuery.length === 0 || matchesQuery(program, normalizedQuery)) &&
      matchesActiveFilter(program),
  );
}

export function getFavoritesEmptyState(
  view: LibraryViewMode,
  validFavoriteCount: number,
  hasQuery: boolean,
  hasFilter: boolean,
  resultCount: number,
): 'none' | 'no-favorites' | 'no-results' {
  if (view !== 'favorites' || resultCount > 0) return 'none';
  if (validFavoriteCount === 0 && !hasQuery && !hasFilter) return 'no-favorites';
  return 'no-results';
}
