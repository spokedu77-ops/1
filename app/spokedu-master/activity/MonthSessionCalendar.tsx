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

  return <section data-manage-calendar aria-label="월간 수업 일정" className="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
      <h2 className="flex min-w-0 items-center gap-2 text-[16px] font-bold text-slate-950">
        <label className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100">
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
      <div className="flex items-center justify-end gap-2"><div className="flex items-center gap-0.5">
        <button type="button" onClick={() => selectDay(addSeoulSessionDays(selectedDay, -1))} className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="이전 날"><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => selectDay(today)} className={`h-9 rounded-xl border px-2.5 text-[13px] font-semibold hover:bg-slate-100 ${selectedDay === today ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}>오늘</button>
        <button type="button" onClick={() => selectDay(addSeoulSessionDays(selectedDay, 1))} className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="다음 날"><ChevronRight size={18} /></button>
      </div>{action ? <div className="shrink-0">{action}</div> : null}</div>
    </div>
    <div className="grid h-8 shrink-0 grid-cols-7 border-y border-slate-100 px-1 text-center text-[12px] font-semibold text-slate-500">{WEEKDAYS.map((label, index) => <span key={label} className={`self-center ${index === selectedWeekday ? 'text-blue-700' : ''}`}>{label}</span>)}</div>
    <div data-manage-cal-grid className={`grid min-h-0 grid-cols-7 gap-px bg-slate-100 ${visibleDays.length === 35 ? 'grid-rows-5' : 'grid-rows-6'}`}>
      {visibleDays.map((item) => {
        const selected = item.day === selectedDay;
        const isToday = item.day === today;
        return <button key={item.day} type="button" onClick={() => { onDaySelect(item.day); if (!item.inMonth) onMonthChange(item.day.slice(0, 7)); }} className={`relative min-h-[88px] min-w-0 overflow-hidden bg-white p-1.5 text-left outline-none transition-colors focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--spm-acc)] ${!item.inMonth ? 'text-slate-300' : 'text-slate-700'} ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`} aria-pressed={selected} aria-label={`${formatSeoulSessionDay(item.day, { month: 'long', day: 'numeric' })}, 수업 ${item.sessions.length}개`}>
          <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${isToday ? 'bg-blue-600 text-white' : selected ? 'text-blue-700' : ''}`}>{Number(item.day.slice(8, 10))}</span>
          {item.sessions.length ? <div className="mt-0.5 space-y-0.5">{item.sessions.slice(0, 2).map((session) => <span key={session.id} className="flex min-w-0 items-start gap-1 text-[11px] font-semibold leading-[15px] text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} ${session.className}`}><i className={`mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full ${session.status === 'completed' ? 'bg-emerald-500' : session.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-600'}`} /><span className={`min-w-0 whitespace-normal break-keep ${session.status === 'cancelled' ? 'text-slate-400 line-through' : ''}`}>{formatSeoulSessionTime(session.startAt)} {session.className}</span></span>)}{item.sessions.length > 2 ? <span className="block pl-2.5 text-[10px] font-semibold text-slate-500">+{item.sessions.length - 2}</span> : null}</div> : null}
        </button>;
      })}
    </div>
    <div className="flex h-9 shrink-0 items-center gap-5 border-t border-slate-100 px-4 text-xs font-medium text-slate-500"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" />예정</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />완료</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-red-500" />취소</span></div>
  </section>;
}
