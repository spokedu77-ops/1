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
  return formatWeekLabelFromMonday(monday);
}

/**
 * 주간 수업 계획 등 localStorage 키용. 해당 주 월요일이 속한 ISO 연도·주차 (YYYY-Www).
 */
export function getWeekLabelForStorage(d: Date = new Date()): string {
  const monday = getMondayOfWeek(d);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();

  const jan4 = new Date(isoYear, 0, 4);
  const week1Monday = getMondayOfWeek(jan4);
  const diffMs = monday.getTime() - week1Monday.getTime();
  const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  const w = Math.max(1, Math.min(53, week));
  return `${isoYear}-W${String(w).padStart(2, '0')}`;
}

/** 월요일 기준 "Y년 M월 N주차" (대시보드·계획서 헤더 공용) */
export function formatWeekLabelFromMonday(monday: Date): string {
  const y = monday.getFullYear();
  const m = monday.getMonth() + 1;
  const weekOfMonth = Math.ceil(monday.getDate() / 7);
  return `${y}년 ${m}월 ${weekOfMonth}주차`;
}

/** 주간 오프셋(0=이번 주)에 해당하는 월요일 */
export function getMondayWithWeekOffset(weekOffset: number): Date {
  const base = getMondayOfWeek(new Date());
  const d = new Date(base);
  d.setDate(base.getDate() + weekOffset * 7);
  return d;
}
