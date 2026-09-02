import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('MASTER favorite entry parity', () => {
  it('keeps favorites as a first-class surface without duplicate hub modes', () => {
    const library = read('app/spokedu-master/library/LibraryView.tsx');
    const spomove = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    const favorites = read('app/spokedu-master/favorites/FavoritesView.tsx');
    expect(library).not.toContain('aria-label="라이브러리 보기"');
    expect(spomove).not.toContain('aria-label="SPOMOVE 보기"');
    expect(favorites).toContain("ref.type === 'program'");
    expect(favorites).toContain("ref.type === 'spomove'");
    expect(favorites).toContain('favoriteContentRefsByOwner');
  });

  it('keeps card favorite targets at least 44px on mobile', () => {
    const lessonCard = read('app/spokedu-master/components/lesson/LessonCatalogCard.tsx');
    const spomove = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    expect(lessonCard).toMatch(/h-11 w-11|size-11|min-h-11/);
    expect(spomove).toContain('h-11 w-11');
  });
});
