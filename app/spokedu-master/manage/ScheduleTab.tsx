'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { MonthSessionCalendar } from '../activity/MonthSessionCalendar';
import { SPM_PRIMARY_BTN } from '../lib/masterActionGrammar';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

const sessionStatus = (status: MasterSessionDto['status']) => status === 'completed' ? '완료' : status === 'cancelled' ? '취소' : '예정';

export function ScheduleTab({
  month,
  selectedDay,
  sessions,
  hasClasses,
  detailOpen,
  onMonthChange,
  onDaySelect,
  onSessionSelect,
  onCreate,
}: {
  month: string;
  selectedDay: string;
  sessions: MasterSessionDto[];
  hasClasses: boolean;
  detailOpen: boolean;
  onMonthChange: (month: string) => void;
  onDaySelect: (day: string) => void;
  onSessionSelect: (session: MasterSessionDto) => void;
  onCreate: () => void;
}) {
  const daySessions = useMemo(() => sessions
    .filter((session) => getSeoulSessionDay(session.startAt) === selectedDay)
    .sort((a, b) => a.startAt.localeCompare(b.startAt)), [selectedDay, sessions]);

  return <section className="mt-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col" aria-labelledby="manage-calendar-heading">
    <h2 id="manage-calendar-heading" className="sr-only">수업 캘린더</h2>
    <MonthSessionCalendar month={month} selectedDay={selectedDay} sessions={sessions} action={hasClasses ? <button type="button" onClick={onCreate} className={`${SPM_PRIMARY_BTN} px-4 text-[14px]`}><Plus size={16} />수업 추가</button> : <Link href="/spokedu-master/classes?create=1" className={`${SPM_PRIMARY_BTN} px-4 text-[14px]`}><Plus size={16} />수업반 만들기</Link>} onMonthChange={onMonthChange} onDaySelect={onDaySelect} />
    <div className="mt-4 flex shrink-0 items-center justify-between gap-4"><h3 className="text-[18px] font-bold text-slate-950">{formatSeoulSessionDay(selectedDay, { month: 'long', day: 'numeric', weekday: 'long' })}</h3>{daySessions.length ? <span className="text-sm font-semibold text-slate-500">수업 {daySessions.length}개</span> : null}</div>
    <div data-manage-agenda data-agenda-count={daySessions.length} className={`mt-3 min-h-0 space-y-2.5 ${detailOpen && daySessions.length > 1 ? 'lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0' : ''} ${daySessions.length > (detailOpen ? 4 : 2) ? 'lg:overflow-y-auto' : ''}`}>
      {daySessions.map((session) => {
        const programCount = session.programs.filter((item) => item.sourceType === 'program').length;
        const spomoveCount = session.programs.filter((item) => item.sourceType === 'spomove').length;
        return <button key={session.id} type="button" onClick={() => onSessionSelect(session)} className={`grid w-full items-center rounded-[12px] border border-slate-200 border-l-[3px] bg-white text-left transition-colors hover:bg-slate-50 ${detailOpen ? 'min-h-[68px] grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 px-3 py-2' : 'min-h-[88px] grid-cols-[132px_minmax(0,1fr)_auto] gap-4 px-4 py-3'} ${session.status === 'completed' ? 'border-l-emerald-500' : session.status === 'cancelled' ? 'border-l-rose-400' : 'border-l-blue-500'}`}>{detailOpen ? <><p className="text-[15px] font-bold leading-5 text-slate-950">{session.className}</p><ChevronRight size={18} className="row-span-2 self-center text-slate-400" /><div className="flex min-w-0 items-center gap-2"><strong className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">{formatSeoulSessionTime(session.startAt)}–{formatSeoulSessionTime(session.endAt)}</strong><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${session.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : session.status === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-700'}`}>{sessionStatus(session.status)}</span></div></> : <><div><strong className="text-[16px] font-bold text-slate-950">{formatSeoulSessionTime(session.startAt)}–{formatSeoulSessionTime(session.endAt)}</strong><span className={`mt-2 block w-fit rounded-full px-3 py-1 text-xs font-semibold ${session.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : session.status === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-700'}`}>{sessionStatus(session.status)}</span></div><div className="min-w-0"><p className="truncate text-[17px] font-bold text-slate-950">{session.className}</p><p className="mt-2 text-sm font-medium text-slate-500">{[programCount ? `놀이체육 ${programCount}` : '', spomoveCount ? `SPOMOVE ${spomoveCount}` : ''].filter(Boolean).join(' · ') || '활동 미정'}</p></div><ChevronRight size={20} className="shrink-0 text-slate-400" /></>}</button>;
      })}
      {!daySessions.length ? <div className="flex min-h-14 items-center justify-between gap-4 py-2"><p className="text-sm text-slate-500">예정된 수업이 없습니다.</p>{hasClasses ? <button type="button" onClick={onCreate} className="min-h-11 shrink-0 px-1 text-sm font-semibold text-slate-600 hover:text-slate-950">수업 추가</button> : <Link href="/spokedu-master/classes?create=1" className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold text-slate-600 hover:text-slate-950">수업반 만들기</Link>}</div> : null}
    </div>
  </section>;
}
