'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { MonthSessionCalendar } from '../activity/MonthSessionCalendar';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';
import { buildClassCreateFromSessionHref } from '../lib/masterNavigationContext';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

const sessionStatus = (status: MasterSessionDto['status']) => status === 'completed' ? '완료' : status === 'cancelled' ? '취소' : '예정';
const sessionStatusDot = (status: MasterSessionDto['status']) => status === 'completed' ? 'bg-emerald-500' : status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500';
const sessionStatusText = (status: MasterSessionDto['status']) => status === 'completed' ? 'text-emerald-700' : status === 'cancelled' ? 'text-rose-600' : 'text-slate-600';

export function ScheduleTab({
  month,
  selectedDay,
  sessions,
  hasClasses,
  detailOpen,
  onMonthChange,
  onDaySelect,
  onSessionSelect,
  canClonePrevious,
  onClonePrevious,
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
  canClonePrevious: boolean;
  onClonePrevious: () => void;
  onCreate: () => void;
}) {
  const daySessions = useMemo(() => sessions
    .filter((session) => getSeoulSessionDay(session.startAt) === selectedDay)
    .sort((a, b) => a.startAt.localeCompare(b.startAt)), [selectedDay, sessions]);

  const createAction = hasClasses
    ? <button type="button" onClick={onCreate} className={`${SPM_PRIMARY_BTN} px-3 text-[14px]`}><Plus size={16} />수업 추가</button>
    : <Link href={buildClassCreateFromSessionHref(selectedDay)} className={`${SPM_PRIMARY_BTN} px-3 text-[14px]`}><Plus size={16} />수업반 만들기</Link>;

  return <section className="mt-4 min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:flex-1 min-[1200px]:flex-col" aria-labelledby="manage-calendar-heading">
    <h2 id="manage-calendar-heading" className="sr-only">수업 캘린더</h2>
    <MonthSessionCalendar month={month} selectedDay={selectedDay} sessions={sessions} action={createAction} onMonthChange={onMonthChange} onDaySelect={onDaySelect} />
    <div className="mt-4 flex shrink-0 flex-col items-start gap-2 border-b border-slate-200 pb-2 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="flex min-w-0 items-baseline gap-3"><h3 className="truncate text-[18px] font-semibold text-slate-950">{formatSeoulSessionDay(selectedDay, { month: 'long', day: 'numeric', weekday: 'long' })}</h3>{daySessions.length ? <span className="shrink-0 text-sm font-medium text-slate-500">수업 {daySessions.length}개</span> : null}</div>
      {canClonePrevious ? <button type="button" onClick={onClonePrevious} className={`${SPM_SECONDARY_BTN} px-3`}>직전 수업으로 만들기</button> : null}
    </div>
    <div data-manage-agenda data-agenda-count={daySessions.length} className={`min-h-0 divide-y divide-slate-100 ${detailOpen && daySessions.length > 1 ? 'min-[1200px]:grid min-[1200px]:grid-cols-2 min-[1200px]:gap-x-3 min-[1200px]:divide-y-0' : ''} ${daySessions.length > 1 ? 'min-[1200px]:max-h-24 min-[1200px]:overflow-y-auto' : ''}`}>
      {daySessions.map((session) => {
        const programCount = session.programs.filter((item) => item.sourceType === 'program').length;
        const spomoveCount = session.programs.filter((item) => item.sourceType === 'spomove').length;
        const status = sessionStatus(session.status);
        return <button key={session.id} type="button" onClick={() => onSessionSelect(session)} className="grid min-h-[76px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-[10px] px-2 py-3 text-left transition-colors hover:bg-white md:min-h-[72px] md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-4">
          <div className="min-w-0 md:col-start-2 md:row-start-1"><p className="truncate text-[16px] font-semibold text-slate-950">{session.className}</p></div>
          <ChevronRight size={18} className="col-start-2 row-span-3 row-start-1 shrink-0 self-center text-slate-400 md:col-start-3 md:row-span-2" />
          <div className="flex min-w-0 items-center gap-2 md:col-start-1 md:row-span-2 md:row-start-1 md:flex-col md:items-start md:justify-center md:gap-1">
            <span className="shrink-0 text-[13px] font-medium tabular-nums text-slate-600">{formatSeoulSessionTime(session.startAt)}–{formatSeoulSessionTime(session.endAt)}</span>
            <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${sessionStatusText(session.status)}`}><i className={`h-1.5 w-1.5 rounded-full ${sessionStatusDot(session.status)}`} />{status}</span>
          </div>
          <p className="min-w-0 truncate text-[13px] font-normal text-slate-500 md:col-start-2">{[programCount ? `놀이체육 ${programCount}` : '', spomoveCount ? `SPOMOVE ${spomoveCount}` : ''].filter(Boolean).join(' · ') || '활동 미정'}</p>
        </button>;
      })}
      {!daySessions.length ? <div className="flex min-h-14 items-center py-2"><p className="text-sm text-slate-500">예정된 수업이 없습니다.</p></div> : null}
    </div>
  </section>;
}
