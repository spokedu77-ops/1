'use client';

import { CalendarDays, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { getSessionActionPolicy } from '../../activity/sessionActionPolicy';
import { formatSeoulSessionDay, formatSeoulSessionTime, seoulDateTimeInputToIso } from '../../lib/sessionDateTime';
import type { MasterClassDto, MasterSessionDto, MasterSessionStatus } from '../../types/operational';

const statusLabel = (status: MasterSessionStatus) => status === 'completed' ? '완료' : status === 'cancelled' ? '취소' : '예정';

function ScheduleFields({ startAt, endAt, setStartAt, setEndAt, setDirty }: { startAt: string; endAt: string; setStartAt: (value: string) => void; setEndAt: (value: string) => void; setDirty: (dirty: boolean) => void }) {
  return <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border border-slate-200 lg:h-11 lg:grid-cols-[minmax(0,1fr)_80px_auto_80px]">
    <label className="relative col-span-3 min-h-11 border-b border-slate-200 lg:col-span-1 lg:border-b-0 lg:border-r">
      <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center truncate pr-8 text-sm font-medium text-slate-900">{formatSeoulSessionDay(startAt.slice(0, 10), { month: 'long', day: 'numeric', weekday: 'long' })}</span>
      <CalendarDays size={17} className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500" aria-hidden />
      <input aria-label="수업 날짜" type="date" value={startAt.slice(0, 10)} onChange={(event) => { const day = event.target.value; setStartAt(`${day}${startAt.slice(10)}`); setEndAt(`${day}${endAt.slice(10)}`); setDirty(true); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </label>
    <label className="relative min-h-11 min-w-0">
      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm font-medium tabular-nums text-slate-900">{startAt.slice(11, 16)}</span>
      <input aria-label="시작 시간" type="time" value={startAt.slice(11, 16)} onChange={(event) => { setStartAt(`${startAt.slice(0, 11)}${event.target.value}`); setDirty(true); }} className="h-11 w-full cursor-pointer bg-transparent text-center text-sm text-transparent [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-datetime-edit]:text-transparent" />
    </label>
    <span className="flex items-center justify-center px-3 text-sm text-slate-400" aria-hidden>–</span>
    <label className="relative min-h-11 min-w-0">
      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm font-medium tabular-nums text-slate-900">{endAt.slice(11, 16)}</span>
      <input aria-label="종료 시간" type="time" value={endAt.slice(11, 16)} onChange={(event) => { setEndAt(`${endAt.slice(0, 11)}${event.target.value}`); setDirty(true); }} className="h-11 w-full cursor-pointer bg-transparent text-center text-sm text-transparent [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-datetime-edit]:text-transparent" />
    </label>
  </div>;
}

export function SessionInformation({ isCreate, activeSession, selectedClass, classes, classId, startAt, endAt, status, actions, scheduleOpen, saving, setClassId, setStartAt, setEndAt, setScheduleOpen, resetAttendance, setDirty, persist, deleteCancelledSession, onCreateClass }: {
  isCreate: boolean; activeSession: MasterSessionDto | null; selectedClass: MasterClassDto | null; classes: MasterClassDto[]; classId: string; startAt: string; endAt: string; status: MasterSessionStatus; actions: ReturnType<typeof getSessionActionPolicy>; scheduleOpen: boolean; saving: boolean;
  setClassId: (value: string) => void; setStartAt: (value: string) => void; setEndAt: (value: string) => void; setScheduleOpen: (update: boolean | ((open: boolean) => boolean)) => void; resetAttendance: () => void; setDirty: (dirty: boolean) => void; persist: (status: MasterSessionStatus) => Promise<void>; deleteCancelledSession: () => void; onCreateClass: () => void;
}) {
  const sessionMenuRef = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { const node = sessionMenuRef.current; if (!node?.open) return; if (event.target instanceof Node && node.contains(event.target)) return; node.removeAttribute('open'); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  if (isCreate) return <div data-session-create className="flex flex-col pt-3">
    <section><label className="block text-[13px] font-semibold text-slate-700">수업반<select value={classId} onChange={(event) => { setClassId(event.target.value); resetAttendance(); setDirty(true); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" onClick={onCreateClass} className="mt-1.5 block text-[13px] font-medium leading-5 text-slate-500 hover:text-slate-950">+ 새 수업반 만들기</button></section>
    <section className="mt-5"><h3 className="text-[13px] font-semibold text-slate-700">일정</h3><ScheduleFields startAt={startAt} endAt={endAt} setStartAt={setStartAt} setEndAt={setEndAt} setDirty={setDirty} /></section>
  </div>;

  return <section aria-labelledby="session-information-heading">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 id="session-information-heading" className="text-[17px] font-semibold leading-6 text-slate-950">{selectedClass?.name ?? '수업 정보'}</h3><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status === 'completed' ? 'text-emerald-700' : status === 'cancelled' ? 'text-rose-600' : 'text-slate-600'}`}><i className={`h-1.5 w-1.5 rounded-full ${status === 'completed' ? 'bg-emerald-500' : status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500'}`} />{statusLabel(status)}</span></div><p className="mt-1 text-[13px] font-normal text-slate-500">{formatSeoulSessionDay(startAt.slice(0, 10), { month: 'long', day: 'numeric', weekday: 'long' })} · {formatSeoulSessionTime(seoulDateTimeInputToIso(startAt))}–{formatSeoulSessionTime(seoulDateTimeInputToIso(endAt))}</p></div><details ref={sessionMenuRef} className="relative shrink-0"><summary className="grid h-11 w-11 shrink-0 cursor-pointer list-none place-items-center rounded-[12px] text-slate-400 hover:bg-slate-100" aria-label="수업 관리 메뉴"><MoreHorizontal size={18} /></summary><div className="absolute right-0 top-12 z-30 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" onClick={(event) => { setScheduleOpen((open) => !open); event.currentTarget.closest('details')?.removeAttribute('open'); }} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">{scheduleOpen ? '일정 접기' : '일정 변경'}</button>{activeSession && status === 'scheduled' ? <button type="button" disabled={saving} onClick={() => { if (window.confirm('이 수업을 취소할까요?')) void persist('cancelled'); }} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">수업 취소</button> : null}{activeSession && status === 'cancelled' ? <><button type="button" disabled={saving} onClick={() => void persist('scheduled')} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">취소 해제</button><button type="button" disabled={saving} onClick={() => { if (window.confirm('취소된 수업을 삭제할까요?')) deleteCancelledSession(); }} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">수업 삭제</button></> : null}</div></details></div>
    {scheduleOpen ? <div className="mt-5 space-y-5"><label className="block text-[13px] font-semibold text-slate-700">수업반<select value={classId} disabled={status !== 'scheduled' || Boolean(activeSession?.rosterLockedAt)} onChange={(event) => { setClassId(event.target.value); resetAttendance(); setDirty(true); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><fieldset disabled={Boolean(activeSession && !actions.editSchedule)}><legend className="text-[13px] font-semibold text-slate-700">일정</legend><ScheduleFields startAt={startAt} endAt={endAt} setStartAt={setStartAt} setEndAt={setEndAt} setDirty={setDirty} /></fieldset></div> : null}
  </section>;
}
