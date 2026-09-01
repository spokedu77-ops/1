import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('MASTER favorite entry parity', () => {
  it('keeps an always-visible all/favorites switch in both content hubs', () => {
    const library = read('app/spokedu-master/library/LibraryView.tsx');
    const spomove = read('app/spokedu-master/spomove/SpomoveHubView.tsx');

    for (const source of [library, spomove]) {
      expect(source).toContain('aria-pressed');
      expect(source).toContain('전체');
      expect(source).toContain('즐겨찾기');
    }
    expect(library).toContain('validFavoriteCount');
    expect(spomove).toContain('favoriteSpomoveIds.size');
    expect(spomove).toContain('aria-label="SPOMOVE 보기"');
  });

  it('keeps card favorite targets at least 44px on mobile', () => {
    const lessonCard = read('app/spokedu-master/components/lesson/LessonCatalogCard.tsx');
    const spomove = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    expect(lessonCard).toMatch(/h-11 w-11|size-11|min-h-11/);
    expect(spomove).toContain('h-11 w-11');
  });
});
