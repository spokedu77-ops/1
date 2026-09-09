'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulToday } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';
import { buildMonthCalendar, moveMonth } from './monthCalendar';

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

  return (
    <section aria-label="월간 수업 일정" className="border-y border-slate-200 bg-white py-3 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><CalendarDays size={18} />{formatSeoulSessionDay(`${month}-01`, { year: 'numeric', month: 'long' })}</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onMonthChange(moveMonth(month, -1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="이전 달"><ChevronLeft size={19} /></button>
            <button type="button" onClick={() => { onMonthChange(today.slice(0, 7)); onDaySelect(today); }} className="h-11 rounded-xl px-3 text-xs font-black text-slate-700 hover:bg-slate-100">오늘</button>
            <button type="button" onClick={() => onMonthChange(moveMonth(month, 1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="다음 달"><ChevronRight size={19} /></button>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 border-b border-slate-100 pb-1 text-center text-[11px] font-black text-slate-400">
        {WEEKDAYS.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-px overflow-hidden bg-slate-100 ring-1 ring-slate-100">
        {days.map((item) => {
          const selected = item.day === selectedDay;
          const isToday = item.day === today;
          return (
            <button key={item.day} type="button" onClick={() => { onDaySelect(item.day); if (!item.inMonth) onMonthChange(item.day.slice(0, 7)); }} className={`relative min-h-[72px] min-w-0 bg-white p-1 text-left sm:min-h-[96px] sm:p-1.5 ${!item.inMonth ? 'text-slate-300' : 'text-slate-700'} ${selected ? 'z-10 ring-2 ring-inset ring-emerald-500' : ''}`} aria-pressed={selected} aria-label={`${formatSeoulSessionDay(item.day, { month: 'long', day: 'numeric' })}, 수업 ${item.sessions.length}개`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${isToday ? 'bg-emerald-600 text-white' : ''}`}>{Number(item.day.slice(8, 10))}</span>
              {item.sessions.length ? <div className="mt-1 space-y-0.5">{item.sessions.slice(0, 2).map((session) => <span key={session.id} className={`block truncate px-0.5 py-0.5 text-[8px] font-semibold sm:px-1 sm:text-[10px] ${session.status === 'cancelled' ? 'text-slate-300 line-through' : session.status === 'completed' ? 'text-slate-500' : 'text-emerald-700'}`} title={`${formatSeoulSessionTime(session.startAt)} ${session.className}`}>{session.status === 'completed' ? '✓ ' : ''}{formatSeoulSessionTime(session.startAt)} {session.className}</span>)}{item.sessions.length > 2 ? <span className="block px-1 text-[9px] font-semibold text-slate-400">+{item.sessions.length - 2}</span> : null}</div> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
