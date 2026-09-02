import { describe, expect, it } from 'vitest';
import { getLibraryProgramDetailHref, getLibraryReturnHref } from './libraryNavigation';

describe('library navigation', () => {
  it('normalizes legacy favorites mode to Library discovery', () => {
    expect(getLibraryReturnHref('favorites')).toBe('/spokedu-master/library');
    expect(getLibraryProgramDetailHref('p1', 'favorites')).toBe('/spokedu-master/library/p1');
  });
  it('preserves safe session context without view mode', () => {
    const href = getLibraryProgramDetailHref('p1', 'all', 'session=s1&returnTo=%2Fspokedu-master%2Factivity%3Fsession%3Ds1&source=session');
    expect(href).toContain('session=s1');
    expect(href).not.toContain('libraryView=favorites');
  });
});
