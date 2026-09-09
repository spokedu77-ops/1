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
    <section aria-label="월간 수업 일정" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><CalendarDays size={18} />{formatSeoulSessionDay(`${month}-01`, { year: 'numeric', month: 'long' })}</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onMonthChange(moveMonth(month, -1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="이전 달"><ChevronLeft size={19} /></button>
            <button type="button" onClick={() => { onMonthChange(today.slice(0, 7)); onDaySelect(today); }} className="h-11 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">오늘</button>
            <button type="button" onClick={() => onMonthChange(moveMonth(month, 1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="다음 달"><ChevronRight size={19} /></button>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      <div className="grid grid-cols-7 border-y border-slate-100 px-1 py-2 text-center text-xs font-semibold text-slate-500">
        {WEEKDAYS.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-100">
        {days.map((item) => {
          const selected = item.day === selectedDay;
          const isToday = item.day === today;
          return (
            <button key={item.day} type="button" onClick={() => { onDaySelect(item.day); if (!item.inMonth) onMonthChange(item.day.slice(0, 7)); }} className={`relative min-h-[76px] min-w-0 p-1.5 text-left outline-none transition-colors focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--spm-acc)] sm:min-h-[104px] sm:px-1.5 sm:py-2 ${!item.inMonth ? 'text-slate-300' : 'text-slate-700'} ${selected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'}`} aria-pressed={selected} aria-label={`${formatSeoulSessionDay(item.day, { month: 'long', day: 'numeric' })}, 수업 ${item.sessions.length}개`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[13px] font-bold ${isToday ? 'bg-[var(--spm-acc)] text-white' : selected ? 'text-[var(--spm-acc)]' : ''}`}>{Number(item.day.slice(8, 10))}</span>
              {item.sessions.length ? <div className="mt-0.5 space-y-0.5">{item.sessions.slice(0, 2).map((session) => <span key={session.id} className={`flex min-w-0 items-center gap-1 text-[12px] font-semibold leading-5 ${session.status === 'cancelled' ? 'text-rose-500 line-through' : session.status === 'completed' ? 'text-emerald-700' : 'text-slate-800'}`} title={`${formatSeoulSessionTime(session.startAt)} ${session.className}`}><i className={`h-1.5 w-1.5 shrink-0 rounded-full ${session.status === 'completed' ? 'bg-emerald-500' : session.status === 'cancelled' ? 'bg-rose-400' : 'bg-[var(--spm-cta)]'}`} /><span className="min-w-0 truncate sm:overflow-visible sm:text-clip sm:whitespace-nowrap">{formatSeoulSessionTime(session.startAt)} {session.className}</span></span>)}{item.sessions.length > 2 ? <span className="block pl-2.5 text-xs font-semibold text-slate-500">+{item.sessions.length - 2}</span> : null}</div> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
