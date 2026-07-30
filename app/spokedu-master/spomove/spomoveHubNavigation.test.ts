import { describe, expect, it } from 'vitest';

import {
  getSpomoveHubHref,
  getSpomoveHubReturnHref,
  parseSpomoveHubView,
} from './spomoveHubNavigation';

describe('spomove hub navigation', () => {
  it('parses favorites view', () => {
    expect(parseSpomoveHubView('favorites')).toBe('favorites');
    expect(parseSpomoveHubView(null)).toBe('all');
  });

  it('builds favorites hub href', () => {
    expect(getSpomoveHubHref('favorites')).toBe('/spokedu-master/spomove?view=favorites');
    expect(getSpomoveHubHref('all')).toBe('/spokedu-master/spomove');
  });

  it('returns to favorites view for the allowed favorites value', () => {
    expect(getSpomoveHubReturnHref('favorites')).toBe('/spokedu-master/spomove?view=favorites');
    expect(getSpomoveHubReturnHref(null)).toBe('/spokedu-master/spomove');
  });
});
