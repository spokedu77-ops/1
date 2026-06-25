import type { LibraryViewMode } from './libraryViewModel';

export function getLibraryProgramDetailHref(
  programId: string,
  sourceLibraryView?: LibraryViewMode,
): string {
  const baseHref = `/spokedu-master/library/${programId}`;
  return sourceLibraryView === 'favorites'
    ? `${baseHref}?libraryView=favorites`
    : baseHref;
}

export function getLibraryReturnHref(libraryView: string | null): string {
  return libraryView === 'favorites'
    ? '/spokedu-master/library?view=favorites'
    : '/spokedu-master/library';
}
