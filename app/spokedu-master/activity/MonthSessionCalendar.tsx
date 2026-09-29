'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { addSeoulSessionDays, formatSeoulSessionDay, formatSeoulSessionTime, getSeoulToday } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';
import { buildMonthCalendar, clampDayToMonth, seoulWeekdayMondayIndex } from './monthCalendar';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export function MonthSessionCalendar({ month, selectedDay, sessions, action, onMonthChange, onDaySelect }: {
  month: string;
  selectedDay: string;
  sessions: MasterSessionDto[];
  action?: ReactNode;
  onMonthChange: (month: string) => void;
  onDaySelect: (day: string) => void;
}) {
  const today = getSeoulToday();
  const days = buildMonthCalendar(month, sessions);
  const trailingEmptyWeek = days.slice(-7).every((item) => !item.inMonth);
  const visibleDays = trailingEmptyWeek ? days.slice(0, 35) : days;
  const selectedWeekday = seoulWeekdayMondayIndex(selectedDay);

  const selectDay = (day: string) => {
    onDaySelect(day);
    onMonthChange(day.slice(0, 7));
  };

  return <section data-manage-calendar aria-label="월간 수업 일정" className="overflow-hidden rounded-[16px] border border-slate-200 bg-white min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:flex-1 min-[1200px]:flex-col">
    <div data-calendar-header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2 sm:px-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-3 md:py-1.5">
      <h2 className="flex min-w-0 items-center gap-1.5 text-[16px] font-semibold text-slate-950">
        <label className="relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[12px] text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <CalendarDays size={18} aria-hidden />
          <input
            type="month"
            value={month}
            aria-label="연월 선택"
            onChange={(event) => {
              const nextMonth = event.target.value;
              if (!/^\d{4}-\d{2}$/.test(nextMonth)) return;
              selectDay(clampDayToMonth(selectedDay, nextMonth));
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        {formatSeoulSessionDay(`${month}-01`, { year: 'numeric', month: 'long' })}
      </h2>
      <div data-calendar-day-navigation className="col-span-2 row-start-2 flex items-center justify-center md:col-span-1 md:col-start-2 md:row-start-1"><div className="flex items-center">
        <button type="button" onClick={() => selectDay(addSeoulSessionDays(selectedDay, -1))} className="grid h-11 w-11 place-items-center rounded-[12px] text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="이전 날"><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => selectDay(today)} className={`h-11 rounded-[12px] px-2.5 text-[13px] font-medium hover:bg-slate-100 ${selectedDay === today ? 'text-blue-700' : 'text-slate-600'}`}>오늘</button>
        <button type="button" onClick={() => selectDay(addSeoulSessionDays(selectedDay, 1))} className="grid h-11 w-11 place-items-center rounded-[12px] text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="다음 날"><ChevronRight size={18} /></button>
      </div></div>{action ? <div className="col-start-2 row-start-1 shrink-0 md:col-start-3">{action}</div> : null}
    </div>
    <div className="grid h-8 shrink-0 grid-cols-7 border-t border-slate-100 px-1 text-center text-[12px] font-medium text-slate-400">{WEEKDAYS.map((label, index) => <span key={label} className={`self-center ${index === selectedWeekday ? 'text-slate-700' : ''}`}>{label}</span>)}</div>
    <div data-manage-cal-grid className={`grid min-h-0 grid-cols-7 border-t border-slate-100 min-[1200px]:flex-1 ${visibleDays.length === 35 ? 'grid-rows-5' : 'grid-rows-6'}`}>
      {visibleDays.map((item) => {
        const selected = item.day === selectedDay;
        const isToday = item.day === today;
        return <button key={item.day} type="button" onClick={() => { onDaySelect(item.day); if (!item.inMonth) onMonthChange(item.day.slice(0, 7)); }} className={`relative flex min-h-12 min-w-0 flex-col items-center justify-between overflow-hidden px-1 py-1.5 text-left outline-none transition-colors focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--spm-acc)] md:min-h-24 md:items-stretch md:justify-start md:p-1.5 min-[1200px]:!min-h-0 min-[1200px]:px-1.5 min-[1200px]:py-1 ${!item.inMonth ? 'text-slate-300' : 'text-slate-700'} ${selected ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50/80'}`} aria-pressed={selected} aria-label={`${formatSeoulSessionDay(item.day, { month: 'long', day: 'numeric' })}, 수업 ${item.sessions.length}개`}>
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-semibold min-[1200px]:h-5 min-[1200px]:w-5 ${isToday ? 'bg-blue-600 text-white' : selected ? 'text-blue-700' : ''}`}>{Number(item.day.slice(8, 10))}</span>
          {item.sessions.length ? <div data-mobile-session-indicator className="flex h-3 items-center justify-center gap-1 md:hidden" aria-hidden="true">{item.sessions.length <= 2 ? item.sessions.map((session) => <i key={session.id} className={`h-1.5 w-1.5 rounded-full ${session.status === 'completed' ? 'bg-emerald-500' : session.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-600'}`} />) : <span className="text-[11px] font-semibold leading-none text-blue-700">+{item.sessions.length}</span>}</div> : <span className="h-3 md:hidden" aria-hidden="true" />}
          {item.sessions.length ? <div data-calendar-event-list className="mt-0.5 hidden min-w-0 space-y-0.5 md:block min-[1200px]:space-y-0">{item.sessions.slice(0, 2).map((session) => <span data-calendar-event-line key={session.id} className="flex min-w-0 items-center gap-1 text-[12px] font-medium leading-4 text-slate-600 min-[1200px]:leading-[14px]" title={`${formatSeoulSessionTime(session.startAt)} ${session.className}`}><i className={`h-1.5 w-1.5 shrink-0 rounded-full ${session.status === 'completed' ? 'bg-emerald-500' : session.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-600'}`} /><span data-calendar-event-text className={`min-w-0 truncate ${session.status === 'cancelled' ? 'text-slate-400 line-through' : ''}`}>{formatSeoulSessionTime(session.startAt)} {session.className}</span></span>)}{item.sessions.length > 2 ? <span className="block pl-2.5 text-[12px] font-medium text-slate-400 min-[1200px]:absolute min-[1200px]:right-1.5 min-[1200px]:top-1">+{item.sessions.length - 2}</span> : null}</div> : null}
        </button>;
      })}
    </div>
    <div className="flex h-9 shrink-0 items-center gap-4 border-t border-slate-100 px-4 text-xs font-normal text-slate-400"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-600" />예정</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />완료</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />취소</span></div>
  </section>;
}
