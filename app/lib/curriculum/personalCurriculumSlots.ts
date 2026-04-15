import { getSubTabsForCategory } from '@/app/lib/curriculum/constants';

export interface PersonalCurriculumSlotRow<T> {
  label: string;
  item: T | null;
}

/**
 * 카테고리별 고정 하위탭 슬롯마다 최대 1행을 표시합니다.
 * 동일 (category, sub_tab) 다중 행이 있으면 id가 작은 쪽(선 insert)이 아닌 배열 순서상 먼저 매칭되는 행만 사용됩니다 — 운영상 중복 없음을 권장합니다.
 */
export function buildPersonalCurriculumSlots<T extends { category: string; sub_tab: string }>(
  category: string,
  personalItems: T[]
): PersonalCurriculumSlotRow<T>[] {
  const labels = getSubTabsForCategory(category);
  return labels.map((label) => ({
    label,
    item: personalItems.find((p) => p.category === category && p.sub_tab === label) ?? null,
  }));
}
