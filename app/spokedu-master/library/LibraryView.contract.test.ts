import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/spokedu-master/library/LibraryView.tsx'),
  'utf8',
);

describe('LibraryView favorites contract', () => {
  it('uses the owner-scoped canonical selectors and action', () => {
    expect(source).toContain('state.getFavoriteProgramIds');
    expect(source).toContain('state.isFavoriteProgram');
    expect(source).toContain('state.toggleFavoriteProgram');
    expect(source).not.toContain("ownerId = 'local'");
  });

  it('keeps one ProgramCard implementation for both views', () => {
    expect(source.match(/function ProgramCard\(/g)).toHaveLength(1);
    expect(source.match(/<ProgramGrid/g)).toHaveLength(1);
  });

  it('provides an accessible bookmark button without opening preview', () => {
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain('aria-pressed={favorite}');
    expect(source).toContain("favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'");
  });

  it('returns the existing loading skeleton before rendering favorites empty states', () => {
    const loadingIndex = source.indexOf('if (!programsLoaded) return <LibrarySkeleton />');
    const emptyStateIndex = source.indexOf("favoritesEmptyState === 'no-favorites'");
    expect(loadingIndex).toBeGreaterThan(-1);
    expect(emptyStateIndex).toBeGreaterThan(loadingIndex);
  });
});
