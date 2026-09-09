'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { MonthSessionCalendar } from '../activity/MonthSessionCalendar';
import { SPM_PRIMARY_BTN } from '../lib/masterActionGrammar';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

const sessionStatus = (status: MasterSessionDto['status']) => status === 'completed' ? '✓ 완료' : status === 'cancelled' ? '취소' : '예정';

export function ScheduleTab({
  month,
  selectedDay,
  sessions,
  hasClasses,
  onMonthChange,
  onDaySelect,
  onSessionSelect,
  onCreate,
}: {
  month: string;
  selectedDay: string;
  sessions: MasterSessionDto[];
  hasClasses: boolean;
  onMonthChange: (month: string) => void;
  onDaySelect: (day: string) => void;
  onSessionSelect: (session: MasterSessionDto) => void;
  onCreate: () => void;
}) {
  const daySessions = useMemo(() => sessions
    .filter((session) => getSeoulSessionDay(session.startAt) === selectedDay)
    .sort((a, b) => a.startAt.localeCompare(b.startAt)), [selectedDay, sessions]);

  return <section className="mt-7" aria-labelledby="manage-calendar-heading">
    <h2 id="manage-calendar-heading" className="sr-only">수업 캘린더</h2>
    <MonthSessionCalendar month={month} selectedDay={selectedDay} sessions={sessions} action={hasClasses ? <button type="button" onClick={onCreate} className={SPM_PRIMARY_BTN}><Plus size={16} />수업 추가</button> : <Link href="/spokedu-master/classes?create=1" className={SPM_PRIMARY_BTN}><Plus size={16} />수업반 만들기</Link>} onMonthChange={onMonthChange} onDaySelect={onDaySelect} />
    <div className="mt-6 flex items-center justify-between gap-4"><h3 className="text-lg font-semibold text-slate-950">{formatSeoulSessionDay(selectedDay, { month: 'long', day: 'numeric', weekday: 'long' })}</h3>{daySessions.length ? <span className="text-sm font-medium text-slate-500">수업 {daySessions.length}개</span> : null}</div>
    <div className="mt-3 space-y-2">
      {daySessions.map((session) => {
        const programCount = session.programs.filter((item) => item.sourceType === 'program').length;
        const spomoveCount = session.programs.filter((item) => item.sourceType === 'spomove').length;
        return <button key={session.id} type="button" onClick={() => onSessionSelect(session)} className={`grid min-h-20 w-full grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 border-l-2 bg-white px-3 py-3 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[120px_minmax(0,1fr)_72px_auto] sm:px-4 ${session.status === 'completed' ? 'border-l-emerald-500' : session.status === 'cancelled' ? 'border-l-rose-400' : 'border-l-blue-500'}`}><strong className="text-[15px] font-bold text-slate-950">{formatSeoulSessionTime(session.startAt)}–{formatSeoulSessionTime(session.endAt)}</strong><div className="min-w-0"><p className="truncate text-[16px] font-semibold text-slate-950 sm:text-[17px]">{session.className}</p><p className="mt-1 text-xs font-medium text-slate-500">{[programCount ? `놀이체육 ${programCount}` : '', spomoveCount ? `SPOMOVE ${spomoveCount}` : ''].filter(Boolean).join(' · ') || '활동 미정'}</p></div><span className={`hidden text-xs font-semibold sm:block ${session.status === 'completed' ? 'text-emerald-700' : session.status === 'cancelled' ? 'text-rose-600' : 'text-blue-700'}`}>{sessionStatus(session.status)}</span><ChevronRight size={18} className="shrink-0 text-slate-400" /></button>;
      })}
      {!daySessions.length ? <div className="flex min-h-14 items-center justify-between gap-4 py-2"><p className="text-sm text-slate-500">예정된 수업이 없습니다.</p>{hasClasses ? <button type="button" onClick={onCreate} className="min-h-11 shrink-0 px-1 text-sm font-semibold text-slate-600 hover:text-slate-950">수업 추가</button> : <Link href="/spokedu-master/classes?create=1" className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold text-slate-600 hover:text-slate-950">수업반 만들기</Link>}</div> : null}
    </div>
  </section>;
}
