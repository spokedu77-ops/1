import { describe, expect, it } from 'vitest';
import {
  filterTransactionPatchesByExistingIds,
  shouldIgnoreRegressiveContentPatch,
} from './noteOpLogService';

describe('noteOpLogService transaction patch filtering', () => {
  it('drops stale transaction updates for blocks that no longer exist', () => {
    const patches = [
      { id: 'alive', order_index: 0 },
      { id: 'missing', order_index: 1 },
    ];

    expect(
      filterTransactionPatchesByExistingIds(patches, new Set(['alive'])),
    ).toEqual([{ id: 'alive', order_index: 0 }]);
  });

  it('ignores stale prefix patches that would truncate saved text', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7.20' },
      { text: '7.20 월요일 12시 송예원T OT' },
    )).toBe(false);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7.20 월요일 13시 송예원T OT' },
    )).toBe(false);
  });

  it('treats toggle titles and page links as protectable content', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { title: 'P0 핵심 과제', collapsed: true },
      { text: '', html: '<p></p>' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      { title: '' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      { title: '', page_document_id: '' },
      { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
    )).toBe(false);
  });

  it('treats html-only and structured content as protectable content', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { html: '<p>saved callout body</p>', icon: 'i' },
      { text: '', html: '<p></p>' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { rows: [['a1', 'b1']], caption: '' },
      { text: '', html: '<p></p>' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { rows: [['a1', 'b1']] },
      { rows: [] },
      { rows: [['a1', 'b1']] },
    )).toBe(false);
  });
});
