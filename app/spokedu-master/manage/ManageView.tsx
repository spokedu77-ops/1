'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { resolveActivityQuery } from '../activity/activityQuery';
import { getMonthKey } from '../activity/monthCalendar';
import { MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';
import { MasterState } from '../components/ui/MasterStatePanel';
import { SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';
import { MV_QUIET_ACTION } from '../lib/masterUiClasses';
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

  return <main data-manage-workspace className={`h-full min-h-0 bg-[var(--spm-bg)] pb-28 ${tab === 'attendance' ? 'overflow-y-auto' : 'overflow-y-auto lg:overflow-hidden lg:pb-0'}`}>
    <MasterPageShell variant="wide" className={editing !== undefined ? 'lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(400px,31%)] lg:items-stretch lg:gap-0 lg:!px-0 lg:!py-0' : tab === 'attendance' ? 'lg:px-8' : 'lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden lg:px-8'}>
      <div className={editing !== undefined ? 'min-w-0 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden lg:px-8 lg:pb-4 lg:pt-4' : tab === 'attendance' ? 'min-w-0' : 'min-w-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden'}>
      <div className="shrink-0">
      <MasterPageHeader title="수업 관리" />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex h-11 items-center gap-0.5" role="tablist" aria-label="수업 관리 보기">
        <button type="button" role="tab" aria-selected={tab === 'schedule'} onClick={() => selectTab('schedule')} className={`relative h-11 px-3 text-[14px] font-semibold transition-colors ${tab === 'schedule' ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}>일정{tab === 'schedule' ? <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[var(--spm-acc)]" aria-hidden /> : null}</button>
        <button type="button" role="tab" aria-selected={tab === 'attendance'} onClick={() => selectTab('attendance')} className={`relative h-11 px-3 text-[14px] font-semibold transition-colors ${tab === 'attendance' ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}>출석부{tab === 'attendance' ? <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[var(--spm-acc)]" aria-hidden /> : null}</button>
      </div>
      <Link href="/spokedu-master/classes" className={`${MV_QUIET_ACTION} px-1 text-[14px] font-medium`}>수업반 관리 →</Link>
      </div>
      </div>
      {data.status === 'loading' || data.status === 'idle' ? <MasterState kind="loading" title="수업 데이터를 불러오는 중입니다." className="mt-6" /> : null}
      {data.status === 'error' ? <MasterState kind="error" title="수업 데이터를 불러오지 못했습니다." action={<button type="button" onClick={() => void data.reload()} className={SPM_SECONDARY_BTN}>다시 시도</button>} className="mt-6" /> : null}
      {routeError ? <MasterState kind="attention" title={routeError} className="mt-6" /> : null}
      {data.status === 'ready' && tab === 'schedule' ? <ScheduleTab month={visibleMonth} selectedDay={selectedDay} sessions={data.sessions} hasClasses={data.classes.length > 0} detailOpen={editing !== undefined} onMonthChange={setVisibleMonth} onDaySelect={(day) => { setSelectedDay(day); setVisibleMonth(getMonthKey(day)); }} onSessionSelect={(session) => { setLegacyCapture(false); setEditing(session); }} onCreate={openCreate} /> : null}
      {data.status === 'ready' && tab === 'attendance' ? <AttendanceTab onShowSchedule={() => selectTab('schedule')} onSessionSelect={(session) => { setLegacyCapture(false); setEditing(session); }} /> : null}
      </div>
      {editing !== undefined ? <SessionDetailSheet key={editing?.id ?? `new-${selectedDay}-${createClassId ?? 'default'}`} session={editing === null ? null : data.sessions.find((item) => item.id === editing.id) ?? editing} initialDay={selectedDay} initialClassId={createClassId} legacyCapture={legacyCapture} onClose={() => setEditing(undefined)} /> : null}
    </MasterPageShell>
  </main>;
}
