/** 개인 수업 커리큘럼: 1행 (5개) */
export const PERSONAL_CATEGORIES_ROW1 = [
  '신체 기능향상',
  '달리기(육상)',
  '줄넘기',
  '인라인',
  '자전거',
] as const;

/** 개인 수업 커리큘럼: 2행 (5개) */
export const PERSONAL_CATEGORIES_ROW2 = [
  '축구',
  '농구',
  '배드민턴',
  '수행평가',
  '유아체육',
] as const;

/** 개인 수업 초기 선택 카테고리 */
export const DEFAULT_PERSONAL_CATEGORY = '신체 기능향상';

/** 카테고리별 하위 탭 라벨 (개인 수업은 월/주차가 아니라 카테고리·하위탭 기준) */
export const PERSONAL_SUB_TABS: Record<string, string[]> = {
  '신체 기능향상': ['민첩성, 순발력', '협응력', '심폐지구력, 근지구력', '평형성, 리듬감, 유연성'],
  '달리기(육상)': ['달리기(육상)'],
  줄넘기: ['스탭 1', '스탭 2', '스탭 3', '스탭 4', '스탭 5', '음악줄넘기'],
  인라인: ['스탭 1', '스탭 2', '스탭 3', '스탭 4', '스탭 5'],
  자전거: ['자전거'],
  축구: ['축구'],
  농구: ['농구'],
  배드민턴: ['배드민턴'],
  수행평가: ['수행평가'],
  유아체육: ['1차시', '2차시', '3차시', '4차시', '5차시', '6차시'],
};

export type PersonalCategoryRow1 = (typeof PERSONAL_CATEGORIES_ROW1)[number];
export type PersonalCategoryRow2 = (typeof PERSONAL_CATEGORIES_ROW2)[number];
export type PersonalCategory = PersonalCategoryRow1 | PersonalCategoryRow2;

/** 하위 탭 목록 가져오기 (없으면 빈 배열) */
export function getSubTabsForCategory(category: string): string[] {
  return PERSONAL_SUB_TABS[category] ?? [];
}
