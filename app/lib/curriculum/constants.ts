/** 개인 수업 커리큘럼: 1행. 1번: 신체 기능향상 8회기(공지), 2번~: 기존 5개 */
export const PERSONAL_CATEGORIES_ROW1 = [
  '신체 기능향상 8회기',
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
  '신체 기능향상 8회기': ['공지'],
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

/** 센터 수업 탭에서 월/주차 위에 노출할 고정 섹션 (교구 가이드 등) */
export const CENTER_SECTIONS = [
  { id: 'sports-equipment-guide', label: '센터 스포츠 교구 가이드라인' },
] as const;

/** 신체 기능향상 8회기: 1~8회기 슬롯 라벨 (카드 8개) */
export const EIGHTH_SESSION_LABELS = ['1회기', '2회기', '3회기', '4회기', '5회기', '6회기', '7회기', '8회기'] as const;

/** 센터 스포츠 교구 가이드라인: 번호 1~12, 단계 1~4 */
export const EQUIPMENT_GUIDE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const EQUIPMENT_GUIDE_STEPS = [
  { value: 1, label: '단계 1' },
  { value: 2, label: '단계 2' },
  { value: 3, label: '단계 3' },
  { value: 4, label: '단계 4' },
] as const;
