import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { dayMapKey, toDate } from "./dateGrid";

/**
 * 캘린더 일자별 세션 버킷.
 * 동일 id 중복은 Set으로 제거하고, 시작 시각 오름차순 정렬.
 */
export function buildEventsByDayMap(events: SessionEvent[]): Map<string, SessionEvent[]> {
  const map = new Map<string, SessionEvent[]>();
  const seenByDay = new Map<string, Set<string>>();

  for (const ev of events) {
    const key = dayMapKey(toDate(ev.start));
    let arr = map.get(key);
    let seen = seenByDay.get(key);
    if (!arr || !seen) {
      arr = [];
      seen = new Set();
      map.set(key, arr);
      seenByDay.set(key, seen);
    }
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    arr.push(ev);
  }

  for (const arr of map.values()) {
    arr.sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());
  }
  return map;
}
