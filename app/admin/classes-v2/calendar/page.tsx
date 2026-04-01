"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import Sidebar from "@/app/components/Sidebar";
import { useClassManagement } from "../../classes/hooks/useClassManagement";
import type { SessionEvent } from "@/app/admin/classes/types";
import { resolveV2BundleFromSession } from "../lib/v2BundleResolve";
import ClassBundlePanelV2 from "../components/ClassBundlePanelV2";

const WEEK_ROW_PX = 60;
const MAX_CHIPS_IN_CELL = 2;

function toDate(v: Date | string) {
  return v instanceof Date ? v : new Date(v);
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function roundLabel(ev: SessionEvent) {
  if (ev.roundInfo) return ev.roundInfo;
  if (ev.roundIndex != null && ev.roundTotal != null) return `${ev.roundIndex}/${ev.roundTotal}`;
  return "";
}

function showFinBadge(ev: SessionEvent) {
  const ri = ev.roundIndex;
  const rt = ev.roundTotal;
  if (ri == null || rt == null || rt <= 0) return false;
  if (ri !== rt) return false;
  const st = ev.status;
  if (st === "postponed" || st === "cancelled" || st === "deleted") return false;
  return true;
}

function EventChip({
  ev,
  compact,
  onOpen,
}: {
  ev: SessionEvent;
  compact?: boolean;
  onOpen: (ev: SessionEvent) => void;
}) {
  const r = roundLabel(ev);
  const fin = showFinBadge(ev);
  const teacherNames = ev.teacher
    ? String(ev.teacher)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(ev);
      }}
      className={`w-full min-w-0 text-left rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-1.5 py-0.5 ${
        compact ? "shrink-0" : ""
      }`}
      title={`${ev.title} (${ev.teacher})`}
    >
      <div
        className={`text-[10px] font-black text-slate-900 leading-tight break-words ${
          compact ? "line-clamp-1" : "line-clamp-2"
        }`}
      >
        {ev.title}
      </div>
      <div className="mt-0.5 flex items-center gap-1 flex-wrap min-w-0">
        {r ? <span className="text-[9px] font-bold text-slate-500 shrink-0">{r}</span> : null}
        {fin ? (
          <span className="inline-flex px-1 py-px rounded text-[8px] font-black bg-amber-100 text-amber-800 shrink-0">
            FIN
          </span>
        ) : null}
        {teacherNames.slice(0, compact ? 1 : 2).map((name) => (
          <span
            key={name}
            className="inline-flex max-w-[4rem] truncate px-1 py-px rounded-full text-[9px] font-black bg-slate-100 text-slate-700"
          >
            {name}
          </span>
        ))}
      </div>
    </button>
  );
}

function getMonthGrid(anchor: Date) {
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

function dayMapKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function chunkWeeks(cells: (Date | null)[]) {
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

/** 엑셀형 월간 한 줄: 시간 + 제목(말줄임) + 회차 + FIN */
function formatTimeShort(d: Date) {
  const h = d.getHours();
  const min = d.getMinutes();
  if (min === 0) return `${h}시`;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function monthRowTone(ev: SessionEvent): string {
  if (ev.status === "cancelled" || ev.status === "deleted") return "bg-rose-50 border-rose-100";
  if (ev.status === "postponed") return "bg-violet-50 border-violet-100";
  const t = ev.type || "";
  if (t.includes("center")) return "bg-sky-50 border-sky-100";
  if (t.includes("one_day")) return "bg-amber-50 border-amber-100";
  return "bg-emerald-50/90 border-emerald-100";
}

function MonthExcelEventRow({
  ev,
  onOpen,
}: {
  ev: SessionEvent;
  onOpen: (ev: SessionEvent) => void;
}) {
  const start = toDate(ev.start);
  const r = roundLabel(ev);
  const fin = showFinBadge(ev);
  const struck = ev.status === "cancelled" || ev.status === "deleted";
  const teacherShort = ev.teacher
    ? String(ev.teacher)
        .split(",")[0]!
        .trim()
        .slice(0, 8)
    : "";

  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      className={`w-full text-left border-b border-slate-200/80 last:border-b-0 px-0.5 py-1 min-w-0 flex flex-col gap-0.5 ${monthRowTone(ev)} hover:brightness-95`}
    >
      <div className="flex items-start gap-1 min-w-0">
        <span className="shrink-0 text-[9px] font-black text-slate-600 tabular-nums w-9">
          {formatTimeShort(start)}
        </span>
        <span
          className={`min-w-0 flex-1 text-[10px] font-bold text-slate-900 leading-snug line-clamp-2 break-words ${
            struck ? "line-through text-slate-500" : ""
          }`}
        >
          {ev.title}
        </span>
        <span className="shrink-0 flex flex-col items-end gap-0.5">
          {r ? (
            <span className="text-[9px] font-black text-slate-600 tabular-nums whitespace-nowrap">{r}</span>
          ) : null}
          {fin ? (
            <span className="text-[8px] font-black px-1 rounded bg-amber-200 text-amber-900">FIN</span>
          ) : null}
        </span>
      </div>
      {teacherShort ? (
        <div className="pl-9 text-[8px] font-bold text-slate-500 truncate">{teacherShort}</div>
      ) : null}
    </button>
  );
}

export default function ClassManagementCalendarV2() {
  const {
    allEvents,
    filteredEvents,
    teacherList,
    fetchSessions,
    filterTeacher,
    setFilterTeacher,
  } = useClassManagement();

  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => new Date());

  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleGroupIds, setBundleGroupIds] = useState<string[]>([]);

  const [weekSlotOverlay, setWeekSlotOverlay] = useState<{ slotKey: string; events: SessionEvent[] } | null>(null);

  const openBundleForEvent = useCallback(
    (ev: SessionEvent) => {
      const { bundleTitle: title, groupIds } = resolveV2BundleFromSession(ev, allEvents);
      setBundleTitle(title);
      setBundleGroupIds(groupIds);
      setBundleOpen(true);
    },
    [allEvents]
  );

  const weekStart = useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const a = weekDays[0]!;
    const b = weekDays[6]!;
    const fmt = (d: Date) =>
      d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
    return `${fmt(a)} ~ ${fmt(b)}`;
  }, [weekDays]);

  const eventsInWeek = useMemo(() => {
    const startMs = weekStart.getTime();
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    const endMs = end.getTime();
    return filteredEvents
      .map((e) => ({ e, start: toDate(e.start) }))
      .filter(({ start }) => {
        const ms = start.getTime();
        return Number.isFinite(ms) && startMs <= ms && ms < endMs;
      });
  }, [filteredEvents, weekStart]);

  const weekCellMap = useMemo(() => {
    const map = new Map<string, SessionEvent[]>();
    for (const item of eventsInWeek) {
      const d = item.start;
      const dayDiff = Math.floor(
        (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - weekStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const hour = d.getHours();
      if (dayDiff < 0 || dayDiff > 6) continue;
      const key = `${dayDiff}-${hour}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item.e);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());
    }
    return map;
  }, [eventsInWeek, weekStart]);

  const monthInfo = useMemo(() => getMonthGrid(monthAnchor), [monthAnchor]);

  const eventsByMonthDay = useMemo(() => {
    const map = new Map<string, SessionEvent[]>();
    const { y, m } = monthInfo;
    for (const ev of filteredEvents) {
      const s = toDate(ev.start);
      if (s.getFullYear() !== y || s.getMonth() !== m) continue;
      const key = `${y}-${m}-${s.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());
    }
    return map;
  }, [filteredEvents, monthInfo]);

  const monthWeekRows = useMemo(() => chunkWeeks(monthInfo.cells), [monthInfo.cells]);

  return (
    <div className="flex min-h-screen bg-white text-slate-900 w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <nav className="border-b px-2 sm:px-4 py-2 sm:py-3 bg-white flex flex-wrap justify-between items-center gap-2 z-50">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <h1 className="text-base sm:text-lg font-black italic uppercase text-slate-950 flex items-center gap-2">
              <CalendarIcon size={18} className="text-blue-600" /> SPOKEDU (V2)
            </h1>

            <div className="flex bg-slate-200/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setCalendarView("week")}
                className={`px-3 py-1 text-xs font-black rounded-md ${
                  calendarView === "week" ? "bg-white shadow-sm text-slate-900" : "text-slate-600"
                }`}
              >
                주간
              </button>
              <button
                type="button"
                onClick={() => setCalendarView("month")}
                className={`px-3 py-1 text-xs font-black rounded-md ${
                  calendarView === "month" ? "bg-white shadow-sm text-slate-900" : "text-slate-600"
                }`}
              >
                월간
              </button>
            </div>

            {calendarView === "week" ? (
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setWeekAnchor((prev) => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() - 7);
                      return d;
                    })
                  }
                  className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekAnchor(new Date())}
                  className="px-2 sm:px-3 py-1 text-xs font-black rounded-md hover:bg-white transition-all"
                >
                  TODAY
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setWeekAnchor((prev) => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() + 7);
                      return d;
                    })
                  }
                  className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <div className="flex bg-slate-100 rounded-lg p-0.5 items-center">
                <button
                  type="button"
                  onClick={() =>
                    setMonthAnchor((prev) => {
                      const d = new Date(prev);
                      d.setMonth(d.getMonth() - 1);
                      return d;
                    })
                  }
                  className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setMonthAnchor(new Date())}
                  className="px-2 sm:px-3 py-1 text-xs font-black rounded-md hover:bg-white transition-all"
                >
                  이번 달
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonthAnchor((prev) => {
                      const d = new Date(prev);
                      d.setMonth(d.getMonth() + 1);
                      return d;
                    })
                  }
                  className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            <div className="text-xs font-black text-slate-600 hidden sm:block">
              {calendarView === "week" ? weekLabel : monthInfo.monthLabel}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 max-w-[160px]"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
            >
              <option value="ALL">전체 선생님</option>
              {teacherList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Link
              href="/admin/classes-v2/list"
              className="px-4 py-2 rounded-full text-xs font-black bg-slate-900 text-white hover:bg-slate-800"
            >
              리스트로 이동 (V2)
            </Link>
          </div>
        </nav>

        <div className="flex-1 min-h-0 overflow-auto bg-slate-50">
          {calendarView === "week" ? (
            <div className="min-w-[980px] p-3">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="grid min-w-0" style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}>
                  <div className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-black text-slate-500 shrink-0">
                    시간
                  </div>
                  {weekDays.map((d, idx) => {
                    const label = d.toLocaleDateString("ko-KR", {
                      weekday: "short",
                      month: "2-digit",
                      day: "2-digit",
                    });
                    const t = new Date();
                    const isToday = t.toDateString() === d.toDateString();
                    return (
                      <div
                        key={idx}
                        className={`border-b border-slate-200 px-2 py-2 text-[11px] font-black min-w-0 ${
                          isToday ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700"
                        }`}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>

                {Array.from({ length: 24 }, (_, hour) => {
                  const hourLabel = `${String(hour).padStart(2, "0")}:00`;
                  return (
                    <div
                      key={hour}
                      className="grid min-w-0"
                      style={{
                        gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))",
                        minHeight: WEEK_ROW_PX,
                      }}
                    >
                      <div
                        className="border-b border-slate-100 bg-white px-2 py-1 text-[11px] font-black text-slate-500 flex items-start shrink-0"
                        style={{ minHeight: WEEK_ROW_PX }}
                      >
                        {hourLabel}
                      </div>
                      {weekDays.map((_d, dayIdx) => {
                        const key = `${dayIdx}-${hour}`;
                        const events = weekCellMap.get(key) || [];
                        const visible = events.slice(0, MAX_CHIPS_IN_CELL);
                        const rest = events.slice(MAX_CHIPS_IN_CELL);
                        const hasMore = rest.length > 0;

                        return (
                          <div
                            key={key}
                            className="border-b border-slate-100 border-l border-slate-100 p-1 min-w-0 overflow-hidden flex flex-col"
                            style={{ minHeight: WEEK_ROW_PX, maxHeight: WEEK_ROW_PX }}
                          >
                            <div className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden">
                              {visible.map((ev) => (
                                <div key={ev.id} className="min-h-0 min-w-0 shrink">
                                  <EventChip ev={ev} compact onOpen={openBundleForEvent} />
                                </div>
                              ))}
                            </div>
                            {hasMore ? (
                              <button
                                type="button"
                                onClick={() => setWeekSlotOverlay({ slotKey: key, events })}
                                className="mt-0.5 text-[9px] font-black text-blue-600 hover:underline shrink-0 text-left"
                              >
                                더보기 +{rest.length}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-[11px] font-bold text-slate-500">
                같은 요일·시간 칸은 고정 높이이며, 미리보기는 최대 {MAX_CHIPS_IN_CELL}개까지 표시 후{" "}
                <span className="font-black">더보기</span>로 전체를 확인할 수 있습니다. 수업을 누르면 V2 번들
                모달이 열립니다.
              </div>
            </div>
          ) : (
            <div className="p-3 w-full max-w-[1600px] mx-auto min-w-0">
              <div className="rounded-2xl border border-slate-300 bg-slate-200 overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 gap-px bg-slate-300 border-b border-slate-300">
                  {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
                    <div
                      key={w}
                      className="bg-slate-100 px-2 py-2 text-center text-[11px] font-black text-slate-600"
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {monthWeekRows.map((weekCells, wIdx) => (
                  <div
                    key={`week-${wIdx}`}
                    className="grid grid-cols-7 gap-px bg-slate-300 border-b border-slate-300 last:border-b-0 items-stretch"
                  >
                    {weekCells.map((cell, dIdx) => {
                      if (!cell) {
                        return (
                          <div
                            key={`pad-${wIdx}-${dIdx}`}
                            className="bg-slate-100/80 min-h-[100px] min-w-0"
                          />
                        );
                      }
                      const key = dayMapKey(cell);
                      const dayEvents = eventsByMonthDay.get(key) || [];
                      const t = new Date();
                      const isToday = t.toDateString() === cell.toDateString();
                      const headerLabel = cell.toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                      });

                      return (
                        <div
                          key={key}
                          className={`flex flex-col min-w-0 min-h-0 bg-white border border-slate-200/80 ${
                            isToday ? "ring-2 ring-blue-400 ring-inset z-[1]" : ""
                          }`}
                        >
                          <div
                            className={`shrink-0 text-center py-1.5 px-1 text-[10px] font-black text-white ${
                              isToday ? "bg-blue-700" : "bg-blue-600"
                            }`}
                          >
                            {headerLabel}
                          </div>
                          <div className="flex flex-col flex-1 min-h-0 min-w-0 p-0">
                            {dayEvents.length === 0 ? (
                              <div className="flex-1 min-h-[48px] bg-white" />
                            ) : (
                              dayEvents.map((ev) => (
                                <MonthExcelEventRow key={ev.id} ev={ev} onOpen={openBundleForEvent} />
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] font-bold text-slate-500">
                월간(엑셀형): 같은 주의 행 높이는 가장 많은 일정이 있는 요일에 맞춰 늘어나며, 각 칸에는 일정을
                모두 나열합니다. 셀을 누르면 V2 번들 모달이 열립니다. 색은 센터/개인/연기/취소 등 상태를
                구분합니다.
              </div>
            </div>
          )}
        </div>
      </div>

      <ClassBundlePanelV2
        visible={bundleOpen}
        bundleTitle={bundleTitle}
        groupIds={bundleGroupIds}
        onClose={() => setBundleOpen(false)}
        onChanged={() => void fetchSessions()}
      />

      {weekSlotOverlay ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setWeekSlotOverlay(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-black text-slate-800">이 시간대 수업 ({weekSlotOverlay.events.length})</div>
              <button
                type="button"
                onClick={() => setWeekSlotOverlay(null)}
                className="text-xs font-black text-slate-500 hover:text-slate-800"
              >
                닫기
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {weekSlotOverlay.events.map((ev) => (
                <EventChip key={ev.id} ev={ev} onOpen={openBundleForEvent} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
