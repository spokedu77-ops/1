"use client";

import type { Ref } from "react";
import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { MonthExcelEventRow } from "./MonthExcelEventRow";
import { dayMapKey, isPastCalendarDay, isSameLocalCalendarDay } from "./lib/dateGrid";

type Props = {
  weekRows: (Date | null)[][];
  eventsByDay: Map<string, SessionEvent[]>;
  todayWeekRowRef: Ref<HTMLDivElement | null>;
  onOpen: (ev: SessionEvent) => void;
};

/** 데스크톱: 월간 엑셀형 그리드 */
export function MonthExcelGrid({ weekRows, eventsByDay, todayWeekRowRef, onOpen }: Props) {
  return (
    <div data-class-ops-view="month" className="hidden min-[801px]:block overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
      <div className="grid grid-cols-7 gap-px bg-slate-300 border-b border-slate-300">
        {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
          <div
            key={w}
            className="bg-slate-100 px-2 py-2 text-center text-[11px] font-bold text-slate-600"
          >
            {w}
          </div>
        ))}
      </div>

      {weekRows.map((weekCells, wIdx) => {
        const now = new Date();
        const weekHasToday = weekCells.some((c) => c && isSameLocalCalendarDay(c, now));
        return (
          <div
            key={`week-${wIdx}`}
            ref={weekHasToday ? todayWeekRowRef : undefined}
            className="scroll-mt-2 grid grid-cols-7 gap-px bg-slate-300 border-b border-slate-300 last:border-b-0 items-stretch"
          >
            {weekCells.map((cell, dIdx) => {
              if (!cell) {
                return (
                  <div
                    key={`pad-${wIdx}-${dIdx}`}
                    className="min-h-[112px] min-w-0 bg-slate-50"
                  />
                );
              }
              const key = dayMapKey(cell);
              const dayEvents = eventsByDay.get(key) || [];
              const t = new Date();
              const isToday = isSameLocalCalendarDay(cell, t);
              const isPastDay = isPastCalendarDay(cell);
              const headerLabel = cell.toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
              });

              return (
                <div
                  key={key}
                  className={`flex min-h-[112px] min-w-0 flex-col ${
                    isToday
                      ? "z-[1] bg-blue-50/60 ring-2 ring-blue-600 ring-inset"
                      : "bg-white"
                  }`}
                >
                  <div
                    className="flex shrink-0 items-center justify-between gap-1 px-2 py-2 text-[11px] font-bold text-slate-600"
                  >
                    <span>{headerLabel}</span>
                    {isToday ? (
                      <span className="text-[10px] font-bold text-blue-700">
                        오늘
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col flex-1 min-h-0 min-w-0 p-0">
                    {dayEvents.length === 0 ? (
                      <div
                        className={`flex-1 min-h-[48px] ${isToday ? "bg-blue-50/30" : "bg-white"}`}
                      />
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
      })}
    </div>
  );
}
