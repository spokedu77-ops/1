import { describe, expect, it } from 'vitest';
import { getSpomoveHubHref, getSpomoveHubReturnHref, parseSpomoveHubReturnHref, parseSpomoveHubUrlState, parseSpomoveHubView, serializeSpomoveHubUrlState } from './spomoveHubNavigation';

describe('spomove hub navigation', () => {
  it('normalizes legacy favorites mode to the discovery hub', () => {
    expect(parseSpomoveHubView('favorites')).toBe('all');
    expect(getSpomoveHubHref('favorites')).toBe('/spokedu-master/spomove');
    expect(getSpomoveHubReturnHref('favorites')).toBe('/spokedu-master/spomove');
  });
  it('keeps exploration filters but drops legacy view serialization', () => {
    const state = parseSpomoveHubUrlState(new URLSearchParams('view=favorites&family=conflict-choice&group=stroop&difficulty=normal&movement=feet&q=화살표'), { families: ['all', 'conflict-choice'], groups: ['all', 'stroop'], difficulties: ['all', 'normal'], movements: ['all', 'feet'] });
    expect(state.view).toBe('all');
    expect(serializeSpomoveHubUrlState(state)).toBe('/spokedu-master/spomove?family=conflict-choice&group=stroop&difficulty=normal&movement=feet&q=%ED%99%94%EC%82%B4%ED%91%9C');
  });
  it('accepts only local Hub returns and otherwise normalizes', () => {
    expect(parseSpomoveHubReturnHref('/spokedu-master/spomove?group=stroop')).toBe('/spokedu-master/spomove?group=stroop');
    expect(parseSpomoveHubReturnHref('https://evil.example/path', 'favorites')).toBe('/spokedu-master/spomove');
  });
});
