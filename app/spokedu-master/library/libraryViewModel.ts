import type { ClassRecord } from '../types';

export type LibraryViewMode = 'all' | 'favorites';

export type LibraryFilterGroupKey = 'target' | 'space' | 'function' | 'movement' | 'theme';

export type LibraryActiveFilter = {
  group: LibraryFilterGroupKey;
  value: string;
};

export const LIBRARY_PAGE_SIZE = 12;

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

function filtersByGroup(filters: LibraryActiveFilter[]) {
  const grouped = new Map<LibraryFilterGroupKey, string[]>();
  for (const filter of filters) {
    grouped.set(filter.group, [...(grouped.get(filter.group) ?? []), filter.value]);
  }
  return grouped;
}

export function matchesLibraryFilters<T>(
  program: T,
  filters: LibraryActiveFilter[],
  getStructuredValues: (program: T, group: LibraryFilterGroupKey) => string[],
) {
  if (filters.length === 0) return true;
  for (const [group, values] of filtersByGroup(filters)) {
    const programValues = getStructuredValues(program, group);
    if (!values.some((value) => programValues.includes(value))) return false;
  }
  return true;
}

export function countFacetedFilterOptions<T>(
  programs: T[],
  filters: LibraryActiveFilter[],
  targetGroup: LibraryFilterGroupKey,
  getStructuredValues: (program: T, group: LibraryFilterGroupKey) => string[],
): Map<string, number> {
  const otherFilters = filters.filter((filter) => filter.group !== targetGroup);
  const counts = new Map<string, number>();
  for (const program of programs) {
    if (!matchesLibraryFilters(program, otherFilters, getStructuredValues)) continue;
    for (const value of getStructuredValues(program, targetGroup)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

export function buildLibraryFilterGroups<T>(
  programs: T[],
  filters: LibraryActiveFilter[],
  definitions: Array<{ key: LibraryFilterGroupKey; label: string }>,
  getStructuredValues: (program: T, group: LibraryFilterGroupKey) => string[],
) {
  return definitions.flatMap((definition) => {
    const counts = countFacetedFilterOptions(programs, filters, definition.key, getStructuredValues);
    const options = Array.from(counts, ([value, count]) => ({ value, count })).sort(
      (a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ko'),
    );
    return options.length > 0 ? [{ ...definition, options }] : [];
  });
}

export function paginateLibraryPrograms<T>(programs: T[], visibleCount: number) {
  return programs.slice(0, visibleCount);
}

export function formatRecentRecordSubtitle(record: ClassRecord) {
  const date = new Date(record.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  if (record.recordType === 'quick') return `${date} · 빠른 기록`;
  const classLabel = record.classId.trim();
  if (classLabel && classLabel !== '수업') return `${date} · ${classLabel}`;
  return date;
}

/** Card footer prep label: name only, strip counts like "4개" / "12~15개". */
export function formatLibraryCardEquipmentName(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  if (/^준비물\s*없음$/i.test(text) || /^no\s*equipment$/i.test(text)) return '없음';
  const primary = text.split(/\s*또는\s*/)[0]!.trim();
  const stripped = primary
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+(?:\d+\s*)?인\s*당.*$/g, '')
    .replace(/\s+(?:\d+\s*)?인당.*$/g, '')
    .replace(/\s+개인\s*당.*$/g, '')
    .replace(/\s+개인당.*$/g, '')
    .replace(/\s+개인\s*당\s*$/g, '')
    .replace(/\s*(?:\d+\s*)?인\s*당\s*$/g, '')
    .replace(/\s*(?:\d+\s*)?인당\s*$/g, '')
    .replace(/\s*\d+\s*색(?:\s*각(?:\s*\d+(?:\s*[~～\-]\s*\d+)?\s*개?)?)?\s*$/g, '')
    .replace(/\s*\d+(?:\s*[~～\-]\s*\d+)?\s*개(?:\s*이상)?\s*$/g, '')
    .replace(/\s+\d+(?:\s*[~～\-]\s*\d+)?\s*$/g, '')
    .trim();
  return stripped || primary;
}
