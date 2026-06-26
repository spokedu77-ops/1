import { describe, expect, it } from 'vitest';

import {
  countValidFavoritePrograms,
  filterLibraryPrograms,
  getFavoritesEmptyState,
  parseLibraryView,
  selectLibraryBasePrograms,
} from './libraryViewModel';

const programs = [
  { id: 'p1', title: 'Balance', target: 'child' },
  { id: 'p2', title: 'Reaction', target: 'adult' },
  { id: 'p3', title: 'Rhythm', target: 'child' },
];

describe('library view query', () => {
  it('defaults to all', () => {
    expect(parseLibraryView(null)).toBe('all');
  });

  it('accepts favorites', () => {
    expect(parseLibraryView('favorites')).toBe('favorites');
  });

  it('falls back to all for an invalid value', () => {
    expect(parseLibraryView('saved')).toBe('all');
  });
});

describe('library favorite program pool', () => {
  it('uses all valid programs in all view', () => {
    expect(selectLibraryBasePrograms(programs, ['p2'], 'all')).toBe(programs);
  });

  it('intersects favorites with valid programs', () => {
    expect(selectLibraryBasePrograms(programs, ['p2', 'stale'], 'favorites'))
      .toEqual([programs[1]]);
  });

  it('excludes stale IDs from the favorite count', () => {
    expect(countValidFavoritePrograms(programs, ['p2', 'stale', 'p2'])).toBe(1);
  });

  it('does not expose another owner when the current owner has no IDs', () => {
    expect(selectLibraryBasePrograms(programs, [], 'favorites')).toEqual([]);
  });

  it('keeps a card in all view after it is removed from favorites', () => {
    expect(selectLibraryBasePrograms(programs, [], 'all')).toEqual(programs);
  });

  it('removes a card immediately from the favorites base pool', () => {
    expect(selectLibraryBasePrograms(programs, ['p1'], 'favorites')).toEqual([programs[0]]);
    expect(selectLibraryBasePrograms(programs, [], 'favorites')).toEqual([]);
  });
});

describe('library existing search and filter pipeline', () => {
  it('applies search after selecting the favorites base pool', () => {
    const base = selectLibraryBasePrograms(programs, ['p1', 'p2'], 'favorites');
    expect(
      filterLibraryPrograms(
        base,
        'reaction',
        (program, query) => program.title.toLowerCase().includes(query),
        () => true,
      ),
    ).toEqual([programs[1]]);
  });

  it('applies the active filter after selecting the favorites base pool', () => {
    const base = selectLibraryBasePrograms(programs, ['p1', 'p2'], 'favorites');
    expect(
      filterLibraryPrograms(
        base,
        '',
        () => true,
        (program) => program.target === 'child',
      ),
    ).toEqual([programs[0]]);
  });
});

describe('favorites empty state', () => {
  it('shows no-favorites only for an empty unfiltered favorites view', () => {
    expect(getFavoritesEmptyState('favorites', 0, false, false, 0))
      .toBe('no-favorites');
  });

  it('shows no-results when favorites exist but conditions remove them', () => {
    expect(getFavoritesEmptyState('favorites', 2, false, true, 0))
      .toBe('no-results');
  });

  it('does not show a favorites empty state with results or in all view', () => {
    expect(getFavoritesEmptyState('favorites', 1, false, false, 1)).toBe('none');
    expect(getFavoritesEmptyState('all', 0, false, false, 0)).toBe('none');
  });
});
