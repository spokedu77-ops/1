import { describe, expect, it } from 'vitest';

import {
  countValidFavoritePrograms,
  countFacetedFilterOptions,
  filterLibraryPrograms,
  formatLibraryCardEquipmentName,
  formatRecentRecordSubtitle,
  getFavoritesEmptyState,
  matchesLibraryFilters,
  paginateLibraryPrograms,
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

describe('faceted filter counts', () => {
  const taggedPrograms = [
    { id: 'p1', target: 'child', space: 'gym' },
    { id: 'p2', target: 'child', space: 'classroom' },
    { id: 'p3', target: 'adult', space: 'gym' },
  ];

  it('narrows counts when another filter group is active', () => {
    const counts = countFacetedFilterOptions(
      taggedPrograms,
      [{ group: 'target', value: 'child' }],
      'space',
      (program, group) => (group === 'target' ? [program.target] : group === 'space' ? [program.space] : []),
    );
    expect(counts.get('gym')).toBe(1);
    expect(counts.get('classroom')).toBe(1);
    expect(counts.has('adult')).toBe(false);
  });

  it('matches filters with OR inside a group and AND across groups', () => {
    expect(
      matchesLibraryFilters(
        taggedPrograms[0],
        [
          { group: 'target', value: 'child' },
          { group: 'space', value: 'gym' },
        ],
        (program, group) => (group === 'target' ? [program.target] : group === 'space' ? [program.space] : []),
      ),
    ).toBe(true);
    expect(
      matchesLibraryFilters(
        taggedPrograms[1],
        [
          { group: 'target', value: 'child' },
          { group: 'space', value: 'gym' },
        ],
        (program, group) => (group === 'target' ? [program.target] : group === 'space' ? [program.space] : []),
      ),
    ).toBe(false);
  });
});

describe('library pagination and recent labels', () => {
  it('limits visible cards until more are requested', () => {
    const items = Array.from({ length: 30 }, (_, index) => ({ id: `p${index}` }));
    expect(paginateLibraryPrograms(items, 24)).toHaveLength(24);
    expect(paginateLibraryPrograms(items, 48)).toHaveLength(30);
  });

  it('formats recent record subtitles for quick and class labels', () => {
    expect(
      formatRecentRecordSubtitle({
        id: 'r1',
        lessonTitle: 'Lesson',
        classId: '3학년 2반',
        programId: 'p1',
        programTitle: 'Lesson',
        date: '2026-07-17',
        present: 0,
        absent: 0,
        focusCount: 0,
        skillCount: 0,
        kakaoSent: false,
        students: [],
        recordType: 'detailed',
      }),
    ).toContain('3학년 2반');
    expect(
      formatRecentRecordSubtitle({
        id: 'r2',
        lessonTitle: 'Lesson',
        classId: '수업',
        programId: 'p1',
        programTitle: 'Lesson',
        date: '2026-07-17',
        present: 0,
        absent: 0,
        focusCount: 0,
        skillCount: 0,
        kakaoSent: false,
        students: [],
        recordType: 'quick',
      }),
    ).toContain('빠른 기록');
  });
});

describe('formatLibraryCardEquipmentName', () => {
  it('keeps the equipment name and strips quantity suffixes', () => {
    expect(formatLibraryCardEquipmentName('원형면 4개')).toBe('원형면');
    expect(formatLibraryCardEquipmentName('마커콘 4개')).toBe('마커콘');
    expect(formatLibraryCardEquipmentName('접시콘 12~15개')).toBe('접시콘');
    expect(formatLibraryCardEquipmentName('바톤 2~4개')).toBe('바톤');
  });

  it('uses the first alternative and drops trailing notes', () => {
    expect(formatLibraryCardEquipmentName('색깔 원판 4~6개 또는 색 테이프')).toBe('색깔 원판');
    expect(formatLibraryCardEquipmentName('콩주머니 1개 (선택)')).toBe('콩주머니');
  });

  it('normalizes empty-equipment labels', () => {
    expect(formatLibraryCardEquipmentName('준비물 없음')).toBe('없음');
  });
});
