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
  it('preserves protectable title and page link values over empty incoming content', () => {
    expect(mergeBlockContentWithStore(
      { title: '', page_document_id: '' },
      { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
    )).toEqual({
      title: '최지훈 업무노트 하위페이지',
      page_document_id: 'child-doc-1',
    });
  });

  it('does not overwrite a non-empty incoming title with store title', () => {
    expect(mergeBlockContentWithStore(
      { title: '서버 제목' },
      { title: '로컬 제목' },
    )).toEqual({ title: '서버 제목' });
  });
  it('does not resurrect legacy body fields from store during content merge', () => {
    expect(mergeBlockContentWithStore(
      { text: 'current', html: '<p>current</p>' },
      {
        text: 'current',
        html: '<p>current</p>',
        legacyText: 'old mixed body',
        placedInToggle: true,
        createdInsideToggle: true,
      },
    )).toEqual({ text: 'current', html: '<p>current</p>' });
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

  it('clears store text/html when slash type change sends empty body', () => {
    expect(mergeContentPatchWithActiveStore(
      { text: '', html: '' },
      { text: '/todo', html: '<p>/todo</p>' },
    )).toEqual({ text: '', html: '' });
  });
});
