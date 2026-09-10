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

  return <section aria-label="월간 수업 일정" className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5 lg:h-[72px]">
      <h2 className="flex items-center gap-3 text-[17px] font-bold text-slate-950"><CalendarDays size={20} />{formatSeoulSessionDay(`${month}-01`, { year: 'numeric', month: 'long' })}</h2>
      <div className="flex flex-wrap items-center justify-end gap-2"><div className="flex items-center gap-1">
        <button type="button" onClick={() => onMonthChange(moveMonth(month, -1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="이전 달"><ChevronLeft size={19} /></button>
        <button type="button" onClick={() => { onMonthChange(today.slice(0, 7)); onDaySelect(today); }} className="h-11 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">오늘</button>
        <button type="button" onClick={() => onMonthChange(moveMonth(month, 1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="다음 달"><ChevronRight size={19} /></button>
      </div>{action ? <div className="shrink-0">{action}</div> : null}</div>
    </div>
    <div className="grid h-11 grid-cols-7 border-y border-slate-100 px-1 text-center text-xs font-semibold text-slate-500">{WEEKDAYS.map((label) => <span key={label} className="self-center">{label}</span>)}</div>
    <div className="grid grid-cols-7 gap-px bg-slate-100">
      {days.map((item) => {
        const selected = item.day === selectedDay;
        const isToday = item.day === today;
        return <button key={item.day} type="button" onClick={() => { onDaySelect(item.day); if (!item.inMonth) onMonthChange(item.day.slice(0, 7)); }} className={`relative min-h-[60px] min-w-0 overflow-hidden p-2 text-left outline-none transition-colors focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--spm-acc)] lg:min-h-[clamp(60px,7vh,78px)] ${!item.inMonth ? 'text-slate-300' : 'text-slate-700'} ${selected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'bg-white hover:bg-slate-50'}`} aria-pressed={selected} aria-label={`${formatSeoulSessionDay(item.day, { month: 'long', day: 'numeric' })}, 수업 ${item.sessions.length}개`}>
          <span className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold ${isToday ? 'bg-blue-600 text-white' : selected ? 'text-blue-700' : ''}`}>{Number(item.day.slice(8, 10))}</span>
          {item.sessions.length ? <div className="mt-1 space-y-0.5">{item.sessions.slice(0, 2).map((session) => <span key={session.id} className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold leading-5 text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} ${session.className}`}><i className={`h-2 w-2 shrink-0 rounded-full ${session.status === 'completed' ? 'bg-emerald-500' : session.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-600'}`} /><span className={`min-w-0 truncate ${session.status === 'cancelled' ? 'text-slate-400 line-through' : ''}`}>{formatSeoulSessionTime(session.startAt)} {session.className}</span></span>)}{item.sessions.length > 2 ? <span className="block pl-3.5 text-xs font-semibold text-slate-500">+{item.sessions.length - 2}</span> : null}</div> : null}
        </button>;
      })}
    </div>
    <div className="hidden h-11 items-center gap-5 border-t border-slate-100 px-5 text-xs font-medium text-slate-500 lg:flex"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" />예정</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />완료</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-red-500" />취소</span></div>
  </section>;
}
