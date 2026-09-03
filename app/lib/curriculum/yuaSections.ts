export const YUA_CATEGORY = '유아체육';
export const YUA_LIBRARY_SUB_TAB = '라이브러리';

export interface YuaFixedSessionSlot<T> {
  label: string;
  item: T | null;
}

export function buildYuaFixedSessionSlots<T extends { id: number; category: string; sub_tab: string }>(
  items: T[],
  labels: string[],
): YuaFixedSessionSlot<T>[] {
  return labels.map((label) => {
    const item = items
      .filter((candidate) => candidate.category === YUA_CATEGORY && candidate.sub_tab === label)
      .sort((left, right) => left.id - right.id)[0] ?? null;

    return { label, item };
  });
}

export function getYuaLibraryItems<T extends { category: string; sub_tab: string }>(items: T[]): T[] {
  return items.filter(
    (item) => item.category === YUA_CATEGORY && item.sub_tab === YUA_LIBRARY_SUB_TAB,
  );
}
