import { describe, expect, it } from 'vitest';
import { LESSON_CATALOG_NEW_WINDOW_MS, isLessonCatalogNew } from './lessonCatalogNew';

describe('lesson catalog NEW window', () => {
  it('marks only newly listed activities inside 14 days', () => {
    const now = Date.parse('2026-09-11T00:00:00.000Z');
    expect(isLessonCatalogNew('2026-09-11T00:00:00.000Z', now)).toBe(true);
    expect(isLessonCatalogNew(new Date(now - LESSON_CATALOG_NEW_WINDOW_MS + 1).toISOString(), now)).toBe(true);
    expect(isLessonCatalogNew(new Date(now - LESSON_CATALOG_NEW_WINDOW_MS).toISOString(), now)).toBe(false);
    expect(isLessonCatalogNew('2026-08-01T00:00:00.000Z', now)).toBe(false);
    expect(isLessonCatalogNew(null, now)).toBe(false);
    expect(isLessonCatalogNew('not-a-date', now)).toBe(false);
  });
});
