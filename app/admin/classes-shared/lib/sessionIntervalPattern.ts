const DAY_MS = 24 * 60 * 60 * 1000;

function uniqueLocalWeekdays(startAts: string[]): number[] {
  const days = new Set<number>();
  for (const iso of startAts) {
    const t = new Date(iso);
    if (Number.isFinite(t.getTime())) days.add(t.getDay());
  }
  return [...days].sort((a, b) => a - b);
}

function addLocalDaysKeepTime(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

/** 주 2회(서로 다른 요일 2개)면 그 요일만 돌아가게. 아니면 null → 기존 간격 로직. */
export function twoWeekdayPattern(startAts: string[]): number[] | null {
  const dows = uniqueLocalWeekdays(startAts);
  return dows.length === 2 ? dows : null;
}

export function nextStartAlongTwoWeekdays(fromIso: string, sortedDows: number[]): string {
  const from = new Date(fromIso);
  const lastDow = from.getDay();
  const nextDow = sortedDows.find((d) => d > lastDow) ?? sortedDows[0]!;
  let add = (nextDow - lastDow + 7) % 7;
  if (add === 0) add = 7;
  return addLocalDaysKeepTime(from, add).toISOString();
}

/**
 * 연기 마지막 칸·확장 다음 회차 시작 시각.
 * 월·수처럼 요일이 둘이면 그 패턴. 매주 하루면 fallbackGapMs (기존 lastGap/첫간격).
 */
export function nextSessionStartIso(
  lastStartIso: string,
  groupStartAts: string[],
  fallbackGapMs: number
): string {
  const pattern = twoWeekdayPattern(groupStartAts);
  if (pattern) return nextStartAlongTwoWeekdays(lastStartIso, pattern);
  const last = new Date(lastStartIso);
  const gap = Number.isFinite(fallbackGapMs) && fallbackGapMs > 0 ? fallbackGapMs : 7 * DAY_MS;
  return new Date(last.getTime() + gap).toISOString();
}

export function buildExtendedStartIsos(
  lastStartIso: string,
  groupStartAts: string[],
  addCount: number,
  fallbackGapMs: number
): string[] {
  const count = Math.max(0, Math.floor(addCount));
  const out: string[] = [];
  let cursor = lastStartIso;
  for (let i = 0; i < count; i++) {
    cursor = nextSessionStartIso(cursor, groupStartAts, fallbackGapMs);
    out.push(cursor);
  }
  return out;
}
