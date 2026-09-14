'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { MonthSessionCalendar } from '../activity/MonthSessionCalendar';
import { SPM_PRIMARY_BTN } from '../lib/masterActionGrammar';
import { buildClassCreateFromSessionHref } from '../lib/masterNavigationContext';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

const sessionStatus = (status: MasterSessionDto['status']) => status === 'completed' ? '완료' : status === 'cancelled' ? '취소' : '예정';
const sessionStatusDot = (status: MasterSessionDto['status']) => status === 'completed' ? 'bg-emerald-500' : status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500';
const sessionStatusText = (status: MasterSessionDto['status']) => status === 'completed' ? 'text-emerald-700' : status === 'cancelled' ? 'text-rose-600' : 'text-blue-700';

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
    <MonthSessionCalendar month={month} selectedDay={selectedDay} sessions={sessions} action={hasClasses ? <button type="button" onClick={onCreate} className={`${SPM_PRIMARY_BTN} px-4 text-[14px]`}><Plus size={16} />수업 추가</button> : <Link href={buildClassCreateFromSessionHref(selectedDay)} className={`${SPM_PRIMARY_BTN} px-4 text-[14px]`}><Plus size={16} />수업반 만들기</Link>} onMonthChange={onMonthChange} onDaySelect={onDaySelect} />
    <div className="mt-4 flex shrink-0 items-center justify-between gap-4"><h3 className="text-[18px] font-semibold text-slate-950">{formatSeoulSessionDay(selectedDay, { month: 'long', day: 'numeric', weekday: 'long' })}</h3>{daySessions.length ? <span className="text-sm font-medium text-slate-500">수업 {daySessions.length}개</span> : null}</div>
    <div data-manage-agenda data-agenda-count={daySessions.length} className={`mt-1 min-h-0 divide-y divide-slate-100 ${detailOpen && daySessions.length > 1 ? 'lg:grid lg:grid-cols-2 lg:gap-x-3 lg:divide-y-0' : ''} ${daySessions.length > (detailOpen ? 4 : 2) ? 'lg:overflow-y-auto' : ''}`}>
      {daySessions.map((session) => {
        const programCount = session.programs.filter((item) => item.sourceType === 'program').length;
        const spomoveCount = session.programs.filter((item) => item.sourceType === 'spomove').length;
        const status = sessionStatus(session.status);
        return <button key={session.id} type="button" onClick={() => onSessionSelect(session)} className={`grid w-full items-center rounded-[12px] text-left transition-colors hover:bg-slate-50 ${detailOpen ? 'min-h-[68px] grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 px-2 py-2.5' : 'min-h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] gap-4 px-2 py-3'}`}>{detailOpen ? <><p className="truncate text-[15px] font-semibold leading-5 text-slate-950">{session.className}</p><ChevronRight size={18} className="row-span-2 self-center text-slate-400" /><div className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">{formatSeoulSessionTime(session.startAt)}–{formatSeoulSessionTime(session.endAt)}</span><span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${sessionStatusText(session.status)}`}><i className={`h-1.5 w-1.5 rounded-full ${sessionStatusDot(session.status)}`} />{status}</span></div></> : <><div><p className="text-[15px] font-medium tabular-nums text-slate-700">{formatSeoulSessionTime(session.startAt)}–{formatSeoulSessionTime(session.endAt)}</p><span className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${sessionStatusText(session.status)}`}><i className={`h-1.5 w-1.5 rounded-full ${sessionStatusDot(session.status)}`} />{status}</span></div><div className="min-w-0"><p className="truncate text-[17px] font-semibold text-slate-950">{session.className}</p><p className="mt-1 text-sm font-normal text-slate-500">{[programCount ? `놀이체육 ${programCount}` : '', spomoveCount ? `SPOMOVE ${spomoveCount}` : ''].filter(Boolean).join(' · ') || '활동 미정'}</p></div><ChevronRight size={18} className="shrink-0 text-slate-400" /></>}</button>;
      })}
      {!daySessions.length ? <div className="flex min-h-14 items-center justify-between gap-4 py-2"><p className="text-sm text-slate-500">예정된 수업이 없습니다.</p>{hasClasses ? <button type="button" onClick={onCreate} className="min-h-11 shrink-0 px-1 text-sm font-semibold text-slate-600 hover:text-slate-950">수업 추가</button> : <Link href={buildClassCreateFromSessionHref(selectedDay)} className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold text-slate-600 hover:text-slate-950">수업반 만들기</Link>}</div> : null}
    </div>
  </section>;
}
