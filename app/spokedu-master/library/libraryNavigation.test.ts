import { describe, expect, it } from 'vitest';

import {
  getLibraryProgramDetailHref,
  getLibraryReturnHref,
} from './libraryNavigation';

describe('library detail navigation context', () => {
  it('includes favorites context for a detail opened from favorites', () => {
    expect(getLibraryProgramDetailHref('p1', 'favorites'))
      .toBe('/spokedu-master/library/p1?libraryView=favorites');
  });

  it('does not add an unnecessary query for all view', () => {
    expect(getLibraryProgramDetailHref('p1', 'all'))
      .toBe('/spokedu-master/library/p1');
  });

  it('returns to favorites view for the allowed favorites value', () => {
    expect(getLibraryReturnHref('favorites'))
      .toBe('/spokedu-master/library?view=favorites');
  });

  it('returns to the default library when query is missing or invalid', () => {
    expect(getLibraryReturnHref(null)).toBe('/spokedu-master/library');
    expect(getLibraryReturnHref('saved')).toBe('/spokedu-master/library');
  });
});
