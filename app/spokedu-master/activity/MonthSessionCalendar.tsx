'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulToday } from '../lib/sessionDateTime';
import { sessionHasCalendarDebtSignal } from '../lib/masterTemporalContract';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { buildMonthCalendar, moveMonth } from './monthCalendar';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

function sessionDotClass(session: MasterSessionDto, hasDebt: boolean) {
  if (hasDebt) return 'bg-amber-500';
  if (session.status === 'scheduled') return 'bg-emerald-500';
  if (session.status === 'completed') return 'bg-slate-400';
  return 'bg-slate-200';
}

export function MonthSessionCalendar({ month, selectedDay, sessions, classes = [], onMonthChange, onDaySelect }: {
  month: string;
  selectedDay: string;
  sessions: MasterSessionDto[];
  classes?: MasterClassDto[];
  onMonthChange: (month: string) => void;
  onDaySelect: (day: string) => void;
}) {
  const today = getSeoulToday();
  const days = buildMonthCalendar(month, sessions);
  const classesById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const now = useMemo(() => new Date(), []);

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
          const dayHasDebt = item.sessions.some((session) => sessionHasCalendarDebtSignal(session, classesById.get(session.classId), now));
          return (
            <button key={item.day} type="button" onClick={() => { onDaySelect(item.day); if (!item.inMonth) onMonthChange(item.day.slice(0, 7)); }} className={`relative min-h-[54px] min-w-0 bg-white p-1 text-left sm:min-h-[92px] sm:p-1.5 ${!item.inMonth ? 'text-slate-300' : 'text-slate-700'} ${selected ? 'z-10 ring-2 ring-inset ring-emerald-500' : ''}`} aria-pressed={selected} aria-label={`${formatSeoulSessionDay(item.day, { month: 'long', day: 'numeric' })}, 수업 ${item.sessions.length}개${dayHasDebt ? ', 정리 필요' : ''}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${isToday ? 'bg-emerald-600 text-white' : dayHasDebt ? 'text-amber-700' : ''}`}>{Number(item.day.slice(8, 10))}</span>
              {item.sessions.length ? <>
                <div className="mt-1 flex gap-0.5 sm:hidden" aria-hidden="true">{item.sessions.slice(0, 3).map((session) => <span key={session.id} className={`h-1.5 w-1.5 rounded-full ${sessionDotClass(session, sessionHasCalendarDebtSignal(session, classesById.get(session.classId), now))}`} />)}</div>
                <div className="mt-1 hidden space-y-0.5 sm:block">{item.sessions.slice(0, 2).map((session) => {
                  const debt = sessionHasCalendarDebtSignal(session, classesById.get(session.classId), now);
                  return <span key={session.id} className={`block truncate rounded px-1 py-0.5 text-[10px] font-bold ${debt ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`} title={`${formatSeoulSessionTime(session.startAt)} ${session.className}${debt ? ' · 정리 필요' : ''}`}>{formatSeoulSessionTime(session.startAt)} {session.className}</span>;
                })}{item.sessions.length > 2 ? <span className="block px-1 text-[9px] font-black text-slate-400">+{item.sessions.length - 2}</span> : null}</div>
              </> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] font-semibold text-slate-400">점 · 칩: 예정(초록) · 미정리(호박) · 완료(회색) · 취소(연회색)</p>
    </section>
  );
}
