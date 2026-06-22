import { describe, expect, it } from 'vitest';
import { contentChangeNeedsReactBlocks, mergeBlockContentWithStore } from './noteContentPatch';

describe('mergeBlockContentWithStore', () => {
  it('keeps title from React while applying store text', () => {
    expect(mergeBlockContentWithStore(
      { title: '제목', text: 'old' },
      { title: '', text: 'typed' },
    )).toEqual({ title: '제목', text: 'typed' });
  });
});

describe('contentChangeNeedsReactBlocks', () => {
  it('returns false when only text/html fields change', () => {
    expect(contentChangeNeedsReactBlocks(
      { text: 'a', html: '<p>a</p>' },
      { text: 'ab', html: '<p>ab</p>' },
    )).toBe(false);
  });

  it('returns true when collapsed or depth changes', () => {
    expect(contentChangeNeedsReactBlocks(
      { text: 'a', collapsed: true },
      { text: 'a', collapsed: false },
    )).toBe(true);
    expect(contentChangeNeedsReactBlocks(
      { text: 'a', depth: 0 },
      { text: 'a', depth: 1 },
    )).toBe(true);
  });

  it('returns true when todo checked changes', () => {
    expect(contentChangeNeedsReactBlocks(
      { text: 'todo', checked: false },
      { text: 'todo', checked: true },
    )).toBe(true);
  });
});
