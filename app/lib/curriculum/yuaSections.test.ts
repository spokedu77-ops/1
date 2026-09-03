import { describe, expect, it } from 'vitest';

import {
  YUA_LIBRARY_SUB_TAB,
  buildYuaFixedSessionSlots,
  getYuaLibraryItems,
} from './yuaSections';

describe('yuaSections', () => {
  const items = [
    { id: 286, category: '유아체육', sub_tab: YUA_LIBRARY_SUB_TAB, title: '자유 프로그램' },
    { id: 208, category: '유아체육', sub_tab: '1차시', title: '고정 1차시' },
    { id: 229, category: '유아체육', sub_tab: '2차시', title: '고정 2차시' },
    { id: 1, category: '축구', sub_tab: YUA_LIBRARY_SUB_TAB, title: '다른 카테고리' },
  ];

  it('builds the six-session area only from fixed session labels', () => {
    const slots = buildYuaFixedSessionSlots(items, ['1차시', '2차시', '3차시']);

    expect(slots.map(({ label, item }) => [label, item?.id ?? null])).toEqual([
      ['1차시', 208],
      ['2차시', 229],
      ['3차시', null],
    ]);
  });

  it('keeps freely added programs in the library area', () => {
    expect(getYuaLibraryItems(items).map((item) => item.id)).toEqual([286]);
  });
});
