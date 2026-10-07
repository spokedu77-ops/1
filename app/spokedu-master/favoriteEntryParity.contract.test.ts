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
    expect(favorites).toContain("ref.type === filter");
    expect(favorites).toContain('spomoveById.get(ref.id)');
    expect(favorites).toContain('favoriteContentRefsByOwner');
  });

  it('offers both content hubs from the empty state for Premium users', () => {
    const favorites = read('app/spokedu-master/favorites/FavoritesView.tsx');
    expect(favorites).toContain('href="/spokedu-lab/library"');
    expect(favorites).toContain('놀이체육 둘러보기');
    expect(favorites).toContain('{isPremium ? (');
    expect(favorites).toContain('href="/spokedu-lab/spomove"');
    expect(favorites).toContain('Spomove 둘러보기');
  });

  it('keeps card favorite targets at least 44px on mobile', () => {
    const lessonCard = read('app/spokedu-master/components/lesson/LessonCatalogCard.tsx');
    const spomove = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    expect(lessonCard).toMatch(/h-11 w-11|size-11|min-h-11/);
    expect(spomove).toContain('h-11 w-11');
  });

  it('uses one Favorites-only 4:3 cover presentation for both content families', () => {
    const favorites = read('app/spokedu-master/favorites/FavoritesView.tsx');
    expect(favorites.match(/presentation="favorites-cover-4-3"/g)).toHaveLength(2);
    expect(favorites).not.toContain('presentation="full-visible-4-3"');
  });

  it('keeps retrieval cards compact at three columns on regular desktop and four on wide screens', () => {
    const favorites = read('app/spokedu-master/favorites/FavoritesView.tsx');
    expect(favorites).toContain('sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4');
    expect(favorites.match(/\(min-width: 1024px\) 33vw/g)).toHaveLength(2);
    expect(favorites.match(/\(min-width: 1536px\) 280px/g)).toHaveLength(2);
  });
});
