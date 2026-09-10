'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { resolveActivityQuery } from '../activity/activityQuery';
import { getMonthKey } from '../activity/monthCalendar';
import { MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';
import { MasterState } from '../components/ui/MasterStatePanel';
import { SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';
import { getSeoulSessionDay, getSeoulToday } from '../lib/sessionDateTime';
import { useOperationalData } from '../operational/OperationalDataProvider';
import type { MasterSessionDto } from '../types/operational';
import { AttendanceTab } from './AttendanceTab';
import { ScheduleTab } from './ScheduleTab';
import { SessionDetailSheet } from './SessionDetailSheet';

type ManageTab = 'schedule' | 'attendance';

/** Canonical owner for Schedule, Session detail, and attendance projection. */
export default function ManageView() {
  const data = useOperationalData();
  const searchParams = useSearchParams();
  const handledQuery = useRef<string | null>(null);
  const [tab, setTab] = useState<ManageTab>('schedule');
  const [selectedDay, setSelectedDay] = useState(getSeoulToday());
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthKey(getSeoulToday()));
  const [editing, setEditing] = useState<MasterSessionDto | null | undefined>(undefined);
  const [createClassId, setCreateClassId] = useState<string | null>(null);
  const [legacyCapture, setLegacyCapture] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (data.status !== 'ready') return;
    const queryKey = searchParams.toString();
    if (!queryKey || handledQuery.current === queryKey) return;
    handledQuery.current = queryKey;
    setLegacyCapture(searchParams.get('capture') === '1');
    const resolution = resolveActivityQuery(searchParams, data.sessions, data.classes);
    if (resolution.kind === 'session') {
      const day = getSeoulSessionDay(resolution.session.startAt);
      setRouteError(null); setTab('schedule'); setSelectedDay(day); setVisibleMonth(getMonthKey(day)); setEditing(resolution.session);
    } else if (resolution.kind === 'create') {
      setRouteError(null); setTab('schedule'); setSelectedDay(resolution.day); setVisibleMonth(getMonthKey(resolution.day)); setCreateClassId(resolution.classId); setEditing(null);
    } else if (resolution.kind === 'date') {
      setRouteError(null); setTab('schedule'); setSelectedDay(resolution.day); setVisibleMonth(getMonthKey(resolution.day)); setEditing(undefined);
    } else if (resolution.kind === 'missing-session') {
      setEditing(undefined); setRouteError('수업을 찾을 수 없습니다.');
    } else if (resolution.kind === 'missing-class') {
      setEditing(undefined); setRouteError('유효하지 않은 수업반입니다.');
    }
  }, [data.classes, data.sessions, data.status, searchParams]);

  const openCreate = () => { setCreateClassId(null); setLegacyCapture(false); setEditing(null); };
  const selectTab = (nextTab: ManageTab) => { setEditing(undefined); setTab(nextTab); };

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:overflow-hidden lg:pb-0">
    <MasterPageShell variant="wide" className={editing !== undefined ? 'lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_410px] lg:items-stretch lg:gap-0 lg:!py-0 lg:pr-0' : ''}>
      <div className="min-w-0 lg:overflow-hidden lg:pr-6 lg:pt-4">
      <MasterPageHeader title="수업 관리" />
      <div className="mt-6 flex items-center justify-between gap-6">
      <div className="grid h-[52px] w-full max-w-[352px] grid-cols-2 rounded-[14px] border border-slate-200 bg-white p-1" role="tablist" aria-label="수업 관리 보기">
        <button type="button" role="tab" aria-selected={tab === 'schedule'} onClick={() => selectTab('schedule')} className={`rounded-[11px] px-6 text-sm font-semibold transition-colors ${tab === 'schedule' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>일정</button>
        <button type="button" role="tab" aria-selected={tab === 'attendance'} onClick={() => selectTab('attendance')} className={`rounded-[11px] px-6 text-sm font-semibold transition-colors ${tab === 'attendance' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>출석부</button>
      </div>
      <Link href="/spokedu-master/classes" className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold text-slate-500 hover:text-slate-950">수업반 관리 →</Link>
      </div>
      {data.status === 'loading' || data.status === 'idle' ? <MasterState kind="loading" title="수업 데이터를 불러오는 중입니다." className="mt-6" /> : null}
      {data.status === 'error' ? <MasterState kind="error" title="수업 데이터를 불러오지 못했습니다." action={<button type="button" onClick={() => void data.reload()} className={SPM_SECONDARY_BTN}>다시 시도</button>} className="mt-6" /> : null}
      {routeError ? <MasterState kind="attention" title={routeError} className="mt-6" /> : null}
      {data.status === 'ready' && tab === 'schedule' ? <ScheduleTab month={visibleMonth} selectedDay={selectedDay} sessions={data.sessions} hasClasses={data.classes.length > 0} onMonthChange={setVisibleMonth} onDaySelect={(day) => { setSelectedDay(day); setVisibleMonth(getMonthKey(day)); }} onSessionSelect={(session) => { setLegacyCapture(false); setEditing(session); }} onCreate={openCreate} /> : null}
      {data.status === 'ready' && tab === 'attendance' ? <AttendanceTab onShowSchedule={() => selectTab('schedule')} onSessionSelect={(session) => { setLegacyCapture(false); setEditing(session); }} /> : null}
      </div>
      {editing !== undefined ? <SessionDetailSheet key={editing?.id ?? `new-${selectedDay}-${createClassId ?? 'default'}`} session={editing === null ? null : data.sessions.find((item) => item.id === editing.id) ?? editing} initialDay={selectedDay} initialClassId={createClassId} legacyCapture={legacyCapture} onClose={() => setEditing(undefined)} /> : null}
    </MasterPageShell>
  </main>;
}
