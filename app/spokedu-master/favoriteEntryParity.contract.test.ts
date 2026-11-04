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
});
