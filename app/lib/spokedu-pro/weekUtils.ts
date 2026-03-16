/**
 * 주차 라벨 유틸. "이번 주" = 캘린더 주(월요일 시작).
 * 대시보드 "Y년 M월 N주차" 노출 및 주 단위 갱신 판단에 사용.
 */

/**
 * 오늘을 포함한 주의 월요일(00:00 UTC 기준 로컬)을 반환.
 * 일요일(getDay() === 0)은 전주 월요일로 간주.
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Sun -> -6 (prev Mon), Mon -> 0, Tue -> -1, ...
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * 현재 주의 "Y년 M월 N주차" 라벨 반환.
 * N = 해당 월에서의 주 번호(월요일 기준, 1~5).
 */
export function getCurrentWeekLabel(): string {
  const now = new Date();
  const monday = getMondayOfWeek(now);
  const y = monday.getFullYear();
  const m = monday.getMonth() + 1;
  const weekOfMonth = Math.ceil(monday.getDate() / 7);
  return `${y}년 ${m}월 ${weekOfMonth}주차`;
}
