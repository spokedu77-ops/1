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
    <div data-class-ops-view="three-day" className="space-y-3 min-[1024px]:hidden">
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
            className={`overflow-hidden rounded-2xl border ${
              isToday
                ? "border-blue-700 bg-blue-50/40 ring-1 ring-blue-700"
                : "border-slate-200 bg-slate-100"
            }`}
          >
            <div
              className={`flex shrink-0 items-center justify-between gap-2 px-3 py-2.5 text-xs font-bold ${
                isToday ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              {isToday ? (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white">
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
                  등록된 수업이 없습니다.
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
