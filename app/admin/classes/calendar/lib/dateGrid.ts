/** 캘린더 월/일 그리드용 순수 날짜 유틸 (동작 변경 없이 page에서 분리) */

export function toDate(v: Date | string) {
  return v instanceof Date ? v : new Date(v);
}

export function getMonthGrid(anchor: Date) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const first = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0).getDate();
  const pad = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  const monthLabel = first.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
  return { cells, monthLabel, y, m };
}

export function dayMapKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function chunkWeeks(cells: (Date | null)[]) {
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function formatTimeShort(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** 로컬 자정 기준 캘린더 날짜만 비교 */
export function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 같은 로컬 달력 날짜인지 (오늘 칸 / 오늘이 속한 주 찾기) */
export function isSameLocalCalendarDay(a: Date, b: Date) {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

export function isPastCalendarDay(cell: Date, now: Date = new Date()) {
  return startOfLocalDay(cell).getTime() < startOfLocalDay(now).getTime();
}

export function addLocalDays(d: Date, delta: number) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + delta);
  return x;
}
