'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulToday } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';
import { buildMonthCalendar, moveMonth } from './monthCalendar';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export function MonthSessionCalendar({ month, selectedDay, sessions, onMonthChange, onDaySelect }: {
  month: string;
  selectedDay: string;
  sessions: MasterSessionDto[];
  onMonthChange: (month: string) => void;
  onDaySelect: (day: string) => void;
}) {
  const today = getSeoulToday();
  const days = buildMonthCalendar(month, sessions);
  return (
    <section aria-label="월간 수업 일정" className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><CalendarDays size={18} />{formatSeoulSessionDay(`${month}-01`, { year: 'numeric', month: 'long' })}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMonthChange(moveMonth(month, -1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="이전 달"><ChevronLeft size={19} /></button>
          <button type="button" onClick={() => { onMonthChange(today.slice(0, 7)); onDaySelect(today); }} className="h-11 rounded-xl px-3 text-xs font-black text-slate-700 hover:bg-slate-100">오늘</button>
          <button type="button" onClick={() => onMonthChange(moveMonth(month, 1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="다음 달"><ChevronRight size={19} /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 border-b border-slate-100 pb-1 text-center text-[11px] font-black text-slate-400">
        {WEEKDAYS.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
        {days.map((item) => {
          const selected = item.day === selectedDay;
          const isToday = item.day === today;
          return (
            <button key={item.day} type="button" onClick={() => { onDaySelect(item.day); if (!item.inMonth) onMonthChange(item.day.slice(0, 7)); }} className={`relative min-h-[54px] min-w-0 bg-white p-1 text-left sm:min-h-[92px] sm:p-1.5 ${!item.inMonth ? 'text-slate-300' : 'text-slate-700'} ${selected ? 'z-10 ring-2 ring-inset ring-emerald-500' : ''}`} aria-pressed={selected} aria-label={`${formatSeoulSessionDay(item.day, { month: 'long', day: 'numeric' })}, 수업 ${item.sessions.length}개`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${isToday ? 'bg-emerald-600 text-white' : ''}`}>{Number(item.day.slice(8, 10))}</span>
              {item.sessions.length ? <>
                <div className="mt-1 flex gap-0.5 sm:hidden" aria-hidden="true">{item.sessions.slice(0, 3).map((session) => <span key={session.id} className={`h-1.5 w-1.5 rounded-full ${session.status === 'scheduled' ? 'bg-emerald-500' : session.status === 'completed' ? 'bg-slate-400' : 'bg-slate-200'}`} />)}</div>
                <div className="mt-1 hidden space-y-0.5 sm:block">{item.sessions.slice(0, 2).map((session) => <span key={session.id} className="block truncate rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold text-slate-600" title={`${formatSeoulSessionTime(session.startAt)} ${session.className}`}>{formatSeoulSessionTime(session.startAt)} {session.className}</span>)}{item.sessions.length > 2 ? <span className="block px-1 text-[9px] font-black text-slate-400">+{item.sessions.length - 2}</span> : null}</div>
              </> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
