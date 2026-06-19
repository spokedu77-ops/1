import { describe, expect, it } from 'vitest';
import { contentChangeNeedsReactBlocks } from './noteContentPatch';

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
