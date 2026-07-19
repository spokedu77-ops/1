import { describe, expect, it } from 'vitest';
import { isCanonicalLessonTheme, normalizeLessonTheme } from './lessonTheme';

describe('normalizeLessonTheme', () => {
  it('keeps canonical themes', () => {
    expect(normalizeLessonTheme('조절형')).toBe('조절형');
    expect(normalizeLessonTheme('술래형(대결)')).toBe('술래형');
  });

  it('strips freeform prefixes from CSV themes', () => {
    expect(normalizeLessonTheme('민첩성 발동작, 도전형')).toBe('도전형');
    expect(normalizeLessonTheme('육상놀이체육, 조절형')).toBe('조절형');
    expect(normalizeLessonTheme('태그형, 술래형')).toBe('술래형');
    expect(normalizeLessonTheme('방향 전환 러닝, 육상 놀이체육, 협동형')).toBe('협동형');
  });

  it('drops freeform-only values', () => {
    expect(normalizeLessonTheme('민첩성 발동작')).toBe('');
    expect(normalizeLessonTheme('태그형')).toBe('');
  });

  it('maps legacy standalone labels', () => {
    expect(normalizeLessonTheme('육상 놀이체육')).toBe('조절형');
    expect(normalizeLessonTheme('육상놀이체육')).toBe('조절형');
  });
});

describe('isCanonicalLessonTheme', () => {
  it('accepts only official themes', () => {
    expect(isCanonicalLessonTheme('도전형')).toBe(true);
    expect(isCanonicalLessonTheme('민첩성 발동작')).toBe(false);
  });
});
