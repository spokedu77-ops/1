"use client";

import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { MonthExcelEventRow } from "./MonthExcelEventRow";
import { dayMapKey, isPastCalendarDay, startOfLocalDay } from "./lib/dateGrid";

type Props = {
  days: Date[];
  eventsByDay: Map<string, SessionEvent[]>;
  onOpen: (ev: SessionEvent) => void;
};

/** 모바일: 가운데 날짜 기준 전날·당일·다음날 */
export function MobileThreeDayView({ days, eventsByDay, onOpen }: Props) {
  return (
    <div className="md:hidden space-y-3">
      {days.map((cell) => {
        const key = dayMapKey(cell);
        const dayEvents = eventsByDay.get(key) || [];
        const t = new Date();
        const isToday = startOfLocalDay(t).getTime() === startOfLocalDay(cell).getTime();
        const isPastDay = isPastCalendarDay(cell);
        const headerLabel = cell.toLocaleDateString("ko-KR", {
          weekday: "short",
          month: "numeric",
          day: "numeric",
        });
        return (
          <div
            key={key}
            className={`rounded-2xl border overflow-hidden shadow-sm ${
              isToday
                ? "border-blue-600 ring-2 ring-blue-500/40 bg-blue-50/40"
                : "border-slate-300 bg-slate-200"
            }`}
          >
            <div
              className={`shrink-0 flex items-center justify-center gap-2 py-2 px-3 text-xs font-black text-white ${
                isToday ? "bg-blue-800" : "bg-blue-600"
              }`}
            >
              {isToday ? (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-white/25 text-white">
                  오늘
                </span>
              ) : null}
              <span>{headerLabel}</span>
            </div>
            <div className="flex flex-col min-h-0 min-w-0 bg-white">
              {dayEvents.length === 0 ? (
                <div
                  className={`min-h-[52px] flex items-center justify-center text-[11px] font-bold text-slate-400 ${
                    isToday ? "bg-blue-50/30" : ""
                  }`}
                >
                  일정 없음
                </div>
              ) : (
                dayEvents.map((ev) => (
                  <MonthExcelEventRow
                    key={ev.id}
                    ev={ev}
                    isPastDay={isPastDay}
                    onOpen={onOpen}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
