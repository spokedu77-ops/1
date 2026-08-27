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
    <div className="hidden md:block rounded-2xl border border-slate-300 bg-slate-200 overflow-hidden shadow-sm">
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
                    className="bg-slate-100/80 min-h-[100px] min-w-0"
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
                  className={`flex flex-col min-w-0 min-h-0 border border-slate-200/80 ${
                    isToday
                      ? "z-[1] bg-blue-50/60 shadow-md ring-[3px] ring-blue-600 ring-inset"
                      : "bg-white"
                  }`}
                >
                  <div
                    className={`shrink-0 flex items-center justify-center gap-1 flex-wrap py-1.5 px-1 text-[10px] font-black text-white ${
                      isToday ? "bg-blue-800" : "bg-blue-600"
                    }`}
                  >
                    {isToday ? (
                      <span className="rounded px-1 py-px text-[8px] font-black uppercase tracking-wide bg-white/25 text-white">
                        오늘
                      </span>
                    ) : null}
                    <span>{headerLabel}</span>
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
