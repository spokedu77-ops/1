import { describe, expect, it } from 'vitest';
import { joinCatalogMeta, splitLessonCardTitle } from './LessonCatalogCard';

describe('splitLessonCardTitle', () => {
  it('splits korean title and english parenthetical subtitle', () => {
    expect(splitLessonCardTitle('육상 스트레칭 드릴 (Track & Field Dynamic Warm-up)')).toEqual({
      title: '육상 스트레칭 드릴',
      subtitle: 'Track & Field Dynamic Warm-up',
    });
  });

  it('keeps plain titles intact', () => {
    expect(splitLessonCardTitle('접시콘 빙고')).toEqual({
      title: '접시콘 빙고',
      subtitle: '',
    });
  });
});

describe('joinCatalogMeta', () => {
  it('joins non-empty parts', () => {
    expect(joinCatalogMeta(['조절형', '', '초등학생'])).toBe('조절형 · 초등학생');
  });
});
