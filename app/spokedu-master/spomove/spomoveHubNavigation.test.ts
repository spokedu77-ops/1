import { describe, expect, it } from 'vitest';

import {
  getSpomoveHubHref,
  getSpomoveHubReturnHref,
  parseSpomoveHubUrlState,
  parseSpomoveHubView,
  serializeSpomoveHubUrlState,
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

  it('parses and validates the complete exploration state', () => {
    const params = new URLSearchParams('view=favorites&group=stroop&difficulty=normal&movement=feet&q=%ED%99%94%EC%82%B4%ED%91%9C');
    expect(parseSpomoveHubUrlState(params, {
      groups: ['all', 'stroop'], difficulties: ['all', 'normal'], movements: ['all', 'feet'],
    })).toEqual({ view: 'favorites', group: 'stroop', difficulty: 'normal', movement: 'feet', q: '화살표' });
  });

  it('serializes defaults away and preserves non-default filters', () => {
    expect(serializeSpomoveHubUrlState({ view: 'all', group: 'all', difficulty: 'all', movement: 'all', q: '' }))
      .toBe('/spokedu-master/spomove');
    expect(serializeSpomoveHubUrlState({ view: 'favorites', group: 'stroop', difficulty: 'normal', movement: 'feet', q: ' 화살표 ' }))
      .toBe('/spokedu-master/spomove?view=favorites&group=stroop&difficulty=normal&movement=feet&q=%ED%99%94%EC%82%B4%ED%91%9C');
  });
});
