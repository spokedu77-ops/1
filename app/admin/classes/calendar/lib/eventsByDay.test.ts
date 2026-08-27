import { describe, expect, it } from "vitest";
import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { buildEventsByDayMap } from "./eventsByDay";
import { dayMapKey, toDate } from "./dateGrid";

/** 이전 page 로직(arr.some dedup + 월 필터 맵) — 회귀 비교용 */
function legacyBuildBoth(
  events: SessionEvent[],
  y: number,
  m: number
): { byDay: Map<string, string[]>; byMonth: Map<string, string[]> } {
  const pushDedup = (arr: SessionEvent[], ev: SessionEvent) => {
    if (arr.some((e) => e.id === ev.id)) return;
    arr.push(ev);
  };

  const byDay = new Map<string, SessionEvent[]>();
  for (const ev of events) {
    const key = dayMapKey(toDate(ev.start));
    if (!byDay.has(key)) byDay.set(key, []);
    pushDedup(byDay.get(key)!, ev);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());
  }

  const byMonth = new Map<string, SessionEvent[]>();
  for (const ev of events) {
    const s = toDate(ev.start);
    if (s.getFullYear() !== y || s.getMonth() !== m) continue;
    const key = `${y}-${m}-${s.getDate()}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    pushDedup(byMonth.get(key)!, ev);
  }
  for (const arr of byMonth.values()) {
    arr.sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());
  }

  const ids = (m: Map<string, SessionEvent[]>) => {
    const out = new Map<string, string[]>();
    for (const [k, v] of m) out.set(k, v.map((e) => e.id));
    return out;
  };
  return { byDay: ids(byDay), byMonth: ids(byMonth) };
}

function mapIds(m: Map<string, SessionEvent[]>) {
  const out = new Map<string, string[]>();
  for (const [k, v] of m) out.set(k, v.map((e) => e.id));
  return out;
}

function sameMaps(a: Map<string, string[]>, b: Map<string, string[]>) {
  if (a.size !== b.size) return false;
  for (const [k, ids] of a) {
    const other = b.get(k);
    if (!other || other.length !== ids.length) return false;
    for (let i = 0; i < ids.length; i++) if (ids[i] !== other[i]) return false;
  }
  return true;
}

describe("buildEventsByDayMap", () => {
  const base = (partial: Partial<SessionEvent> & { id: string; start: string }): SessionEvent =>
    ({
      title: "t",
      end: partial.start,
      ...partial,
    }) as SessionEvent;

  it("레거시 byDay와 동일 id·순서 (중복 제거 포함)", () => {
    const events = [
      base({ id: "a", start: "2026-08-28T09:00:00+09:00" }),
      base({ id: "b", start: "2026-08-28T06:30:00+09:00" }),
      base({ id: "a", start: "2026-08-28T09:00:00+09:00" }), // dup
      base({ id: "c", start: "2026-09-01T10:00:00+09:00" }),
    ];
    const legacy = legacyBuildBoth(events, 2026, 7);
    const next = mapIds(buildEventsByDayMap(events));
    expect(sameMaps(next, legacy.byDay)).toBe(true);
  });

  it("월 그리드 칸 키는 byDay에서 그대로 조회 가능 (레거시 byMonth와 동일)", () => {
    const events = [
      base({ id: "a", start: "2026-08-28T09:00:00+09:00" }),
      base({ id: "b", start: "2026-07-31T09:00:00+09:00" }),
      base({ id: "c", start: "2026-09-01T10:00:00+09:00" }),
    ];
    const y = 2026;
    const m = 7; // August
    const legacy = legacyBuildBoth(events, y, m);
    const byDay = buildEventsByDayMap(events);
    const monthView = new Map<string, string[]>();
    for (const [k, arr] of byDay) {
      const d = toDate(arr[0]!.start);
      if (d.getFullYear() === y && d.getMonth() === m) {
        monthView.set(k, arr.map((e) => e.id));
      }
    }
    expect(sameMaps(monthView, legacy.byMonth)).toBe(true);
  });
});
