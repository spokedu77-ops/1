"use client";

import type { Ref } from "react";
import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { MonthExcelEventRow } from "./MonthExcelEventRow";
import { dayMapKey, isPastCalendarDay, isSameLocalCalendarDay } from "./lib/dateGrid";

type Props = {
  weekRows: (Date | null)[][];
  eventsByDay: Map<string, SessionEvent[]>;
  todayWeekRowRef: Ref<HTMLDivElement | null>;
  onOpen: (event: SessionEvent) => void;
  onOpenDay: (day: Date, events: SessionEvent[]) => void;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_VISIBLE_EVENTS = 4;

export function MonthExcelGrid({ weekRows, eventsByDay, todayWeekRowRef, onOpen, onOpenDay }: Props) {
  return (
    <div data-class-ops-view="month" className="hidden min-[1024px]:block overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
      <div className="grid grid-cols-7 gap-px border-b border-slate-300 bg-slate-300">
        {WEEKDAYS.map((weekday, index) => (
          <div key={weekday} className={`bg-slate-100 px-2 py-2.5 text-center text-xs font-extrabold ${index === 0 ? "text-rose-600" : index === 6 ? "text-blue-600" : "text-slate-600"}`}>
            {weekday}
          </div>
        ))}
      </div>
      {weekRows.map((weekCells, weekIndex) => {
        const now = new Date();
        const weekHasToday = weekCells.some((cell) => cell && isSameLocalCalendarDay(cell, now));
        return (
          <div key={`week-${weekIndex}`} ref={weekHasToday ? todayWeekRowRef : undefined} className="grid grid-cols-7 items-stretch gap-px border-b border-slate-300 bg-slate-300 last:border-b-0">
            {weekCells.map((cell, dayIndex) => {
              if (!cell) return <div key={`pad-${weekIndex}-${dayIndex}`} className="min-h-[150px] min-w-0 bg-slate-50" />;
              const key = dayMapKey(cell);
              const dayEvents = eventsByDay.get(key) ?? [];
              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const remainingCount = dayEvents.length - visibleEvents.length;
              const isToday = isSameLocalCalendarDay(cell, now);
              return (
                <section key={key} className={`flex min-h-[150px] min-w-0 flex-col ${isToday ? "z-[1] bg-blue-50/60 ring-2 ring-inset ring-blue-600" : "bg-white"}`}>
                  <button type="button" onClick={() => onOpenDay(cell, dayEvents)} className="flex min-h-10 shrink-0 items-center justify-between gap-1 px-2.5 py-2 text-left text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                    <span>{cell.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</span>
                    <span className="flex items-center gap-1">{dayEvents.length > 0 ? <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{dayEvents.length}</span> : null}{isToday ? <span className="text-[10px] text-blue-700">오늘</span> : null}</span>
                  </button>
                  <div className="min-h-0 min-w-0 flex-1 pb-1">
                    {visibleEvents.map((event) => <MonthExcelEventRow key={event.id} ev={event} isPastDay={isPastCalendarDay(cell)} onOpen={onOpen} />)}
                    {remainingCount > 0 ? <button type="button" onClick={() => onOpenDay(cell, dayEvents)} className="mx-1.5 mb-1 min-h-9 w-[calc(100%-0.75rem)] rounded-lg border border-slate-300 bg-white px-2 text-xs font-extrabold text-blue-700 hover:bg-blue-50">+{remainingCount}개 전체 보기</button> : null}
                  </div>
                </section>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
