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

  it('preserves the complete allowed Library exploration query', () => {
    const href = getLibraryProgramDetailHref('p1', 'all', 'q=피구&filters=space:교실&shelf=quick');
    const detail = new URL(href, 'https://example.test');
    expect(getLibraryReturnHref(detail.searchParams.get('libraryView'), detail.searchParams.get('libraryReturn')))
      .toBe('/spokedu-master/library?q=%ED%94%BC%EA%B5%AC&filters=space%3A%EA%B5%90%EC%8B%A4&shelf=quick');
  });

  it('drops unrelated return parameters instead of accepting a return route', () => {
    expect(getLibraryReturnHref(null, 'next=https://evil.test&q=균형'))
      .toBe('/spokedu-master/library?q=%EA%B7%A0%ED%98%95');
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
