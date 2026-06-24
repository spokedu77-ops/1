import { describe, expect, it } from 'vitest';
import {
  contentChangeNeedsReactBlocks,
  mergeBlockContentWithStore,
  mergeContentPatchWithActiveStore,
} from './noteContentPatch';

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

describe('mergeContentPatchWithActiveStore', () => {
  it('applies shorter editor text when user deletes lines', () => {
    expect(mergeContentPatchWithActiveStore(
      { text: '6.25 schedule only', html: '<p>6.25 schedule only</p>' },
      { text: '6.25 schedule only\n6.24 delete me', html: '<p>old</p>' },
    )).toMatchObject({ text: '6.25 schedule only' });
  });

  it('keeps store text when incoming only patches checked', () => {
    expect(mergeContentPatchWithActiveStore(
      { checked: true },
      { text: 'keep me', checked: false },
    )).toEqual({ text: 'keep me', checked: true });
  });
});
