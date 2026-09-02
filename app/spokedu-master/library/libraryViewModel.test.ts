import { describe, expect, it } from 'vitest';

import {
  countValidFavoritePrograms,
  countFacetedFilterOptions,
  filterLibraryPrograms,
  formatLibraryCardEquipmentName,
  formatRecentRecordSubtitle,
  matchesLibraryFilters,
  paginateLibraryPrograms,
  rankLibraryPrograms,
} from './libraryViewModel';

describe('library relevance ranking', () => {
  const searchable = [
    { id: 'body', title: '공 활용 놀이', category: '협동', structured: ['좁은 공간'], body: ['피구 수업에서 응용'] },
    { id: 'title', title: '변형 피구', category: '경쟁', structured: ['공'], body: ['팀 활동'] },
    { id: 'tag', title: '함께 옮기기', category: '협동', structured: ['피구', '2인 1조'], body: ['공을 옮깁니다'] },
  ];
  const fields = (program: typeof searchable[number]) => program;

  it('ranks title matches ahead of structured and body-only matches', () => {
    expect(rankLibraryPrograms(searchable, '피구', fields).map((item) => item.id))
      .toEqual(['title', 'tag', 'body']);
  });

  it('matches multi-word intent across structured fields', () => {
    expect(rankLibraryPrograms(searchable, '협동 좁은 공간 공', fields).map((item) => item.id))
      .toEqual(['body']);
  });
});

const programs = [
  { id: 'p1', title: 'Balance', target: 'child' },
  { id: 'p2', title: 'Reaction', target: 'adult' },
  { id: 'p3', title: 'Rhythm', target: 'child' },
];

describe('library favorite identity helpers', () => {
  it('excludes stale IDs from the favorite count', () => {
    expect(countValidFavoritePrograms(programs, ['p2', 'stale', 'p2'])).toBe(1);
  });

});

describe('library existing search and filter pipeline', () => {
  it('applies search to the discovery pool', () => {
    const base = programs;
    expect(
      filterLibraryPrograms(
        base,
        'reaction',
        (program, query) => program.title.toLowerCase().includes(query),
        () => true,
      ),
    ).toEqual([programs[1]]);
  });

  it('applies the active filter to the discovery pool', () => {
    const base = programs;
    expect(
      filterLibraryPrograms(
        base,
        '',
        () => true,
        (program) => program.target === 'child',
      ),
    ).toEqual([programs[0], programs[2]]);
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
    expect(formatLibraryCardEquipmentName('라바콘 4색 각')).toBe('라바콘');
    expect(formatLibraryCardEquipmentName('라바콘 4색 각 1개')).toBe('라바콘');
    expect(formatLibraryCardEquipmentName('스포츠스태킹컵 인당')).toBe('스포츠스태킹컵');
    expect(formatLibraryCardEquipmentName('스포츠스태킹컵 1인당')).toBe('스포츠스태킹컵');
    expect(formatLibraryCardEquipmentName('스포츠스태킹컵 1인 당')).toBe('스포츠스태킹컵');
    expect(formatLibraryCardEquipmentName('스포츠스태킹컵 개인당')).toBe('스포츠스태킹컵');
    expect(formatLibraryCardEquipmentName('스포츠스태킹컵 인당 1세트')).toBe('스포츠스태킹컵');
    expect(formatLibraryCardEquipmentName('스포츠스태킹컵 개인당 1개')).toBe('스포츠스태킹컵');
  });

  it('uses the first alternative and drops trailing notes', () => {
    expect(formatLibraryCardEquipmentName('색깔 원판 4~6개 또는 색 테이프')).toBe('색깔 원판');
    expect(formatLibraryCardEquipmentName('콩주머니 1개 (선택)')).toBe('콩주머니');
  });

  it('normalizes empty-equipment labels', () => {
    expect(formatLibraryCardEquipmentName('준비물 없음')).toBe('없음');
  });
});
