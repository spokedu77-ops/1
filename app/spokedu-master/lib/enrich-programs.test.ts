import { describe, expect, it } from 'vitest';
import { PROGRAMS } from './data';
import { enrichProgramsWithStaticVisuals } from './enrich-programs';

describe('enrichProgramsWithStaticVisuals', () => {
  it('does not restore static recommendation metadata over public API values', () => {
    const source = PROGRAMS.find((program) => program.isHot || program.homeSortOrder != null);
    expect(source).toBeTruthy();
    if (!source) return;

    const [result] = enrichProgramsWithStaticVisuals([
      {
        ...source,
        id: 'api-program',
        isHot: false,
        homeSortOrder: 999,
      },
    ]);

    expect(result.isHot).toBe(false);
    expect(result.homeSortOrder).toBe(999);
  });

  it('does not replace administrator content with static program content', () => {
    const source = PROGRAMS[0];
    const [result] = enrichProgramsWithStaticVisuals([{
      ...source,
      title: source.title,
      category: '관리자 테마',
      grade: '관리자 대상',
      space: '관리자 공간',
      tags: ['관리자 태그'],
      equipment: ['관리자 준비물'],
      steps: ['관리자 활동 방법'],
      thumbnailUrl: '/admin-thumbnail.jpg',
      lessonDetail: {
        ...source.lessonDetail!,
        coachScript: '관리자 스크립트',
        variations: ['관리자 변형 방법'],
        parentNote: '관리자 학부모 문구',
        heroImageUrl: '/admin-hero.jpg',
      },
    }]);

    expect(result.category).toBe('관리자 테마');
    expect(result.grade).toBe('관리자 대상');
    expect(result.space).toBe('관리자 공간');
    expect(result.tags).toEqual(['관리자 태그']);
    expect(result.equipment).toEqual(['관리자 준비물']);
    expect(result.steps).toEqual(['관리자 활동 방법']);
    expect(result.thumbnailUrl).toBe('/admin-thumbnail.jpg');
    expect(result.lessonDetail?.heroImageUrl).toBe('/admin-hero.jpg');
    expect(result.lessonDetail?.coachScript).toBe('관리자 스크립트');
    expect(result.lessonDetail?.variations).toEqual(['관리자 변형 방법']);
    expect(result.lessonDetail?.parentNote).toBe('관리자 학부모 문구');
  });
});
