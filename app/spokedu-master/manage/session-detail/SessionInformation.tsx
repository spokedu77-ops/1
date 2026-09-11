'use client';

import { CalendarDays, ChevronRight, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { getSessionActionPolicy } from '../../activity/sessionActionPolicy';
import { formatSeoulSessionDay, formatSeoulSessionTime, seoulDateTimeInputToIso } from '../../lib/sessionDateTime';
import type { MasterClassDto, MasterSessionDto, MasterSessionStatus } from '../../types/operational';
import { REPEAT_LABEL, type RepeatMode } from './useSessionSchedule';
import type { MasterScheduleRule } from '../../lib/recurringSchedule';

const statusLabel = (status: MasterSessionStatus) => status === 'completed' ? '완료' : status === 'cancelled' ? '취소' : '예정';

function ScheduleFields({ startAt, endAt, setStartAt, setEndAt, setDirty }: { startAt: string; endAt: string; setStartAt: (value: string) => void; setEndAt: (value: string) => void; setDirty: (dirty: boolean) => void }) {
  return <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border border-slate-200 lg:h-12 lg:grid-cols-[minmax(0,1fr)_80px_auto_80px]">
    <label className="relative col-span-3 min-h-12 border-b border-slate-200 lg:col-span-1 lg:border-b-0 lg:border-r">
      <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center truncate pr-8 text-sm font-medium text-slate-900">{formatSeoulSessionDay(startAt.slice(0, 10), { month: 'long', day: 'numeric', weekday: 'long' })}</span>
      <CalendarDays size={17} className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500" aria-hidden />
      <input aria-label="수업 날짜" type="date" value={startAt.slice(0, 10)} onChange={(event) => { const day = event.target.value; setStartAt(`${day}${startAt.slice(10)}`); setEndAt(`${day}${endAt.slice(10)}`); setDirty(true); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </label>
    <label className="relative min-h-12 min-w-0">
      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm font-medium tabular-nums text-slate-900">{startAt.slice(11, 16)}</span>
      <input aria-label="시작 시간" type="time" value={startAt.slice(11, 16)} onChange={(event) => { setStartAt(`${startAt.slice(0, 11)}${event.target.value}`); setDirty(true); }} className="h-12 w-full cursor-pointer bg-transparent text-center text-sm text-transparent [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-datetime-edit]:text-transparent" />
    </label>
    <span className="flex items-center justify-center px-3 text-sm text-slate-400" aria-hidden>–</span>
    <label className="relative min-h-12 min-w-0">
      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm font-medium tabular-nums text-slate-900">{endAt.slice(11, 16)}</span>
      <input aria-label="종료 시간" type="time" value={endAt.slice(11, 16)} onChange={(event) => { setEndAt(`${endAt.slice(0, 11)}${event.target.value}`); setDirty(true); }} className="h-12 w-full cursor-pointer bg-transparent text-center text-sm text-transparent [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-datetime-edit]:text-transparent" />
    </label>
  </div>;
}

export function SessionInformation({ isCreate, activeSession, selectedClass, classes, classId, startAt, endAt, status, actions, scheduleOpen, repeatMode, activeRules, saving, setClassId, setStartAt, setEndAt, setScheduleOpen, setRepeatMode, resetAttendance, setDirty, persist, deleteCancelledSession, endRule }: {
  isCreate: boolean; activeSession: MasterSessionDto | null; selectedClass: MasterClassDto | null; classes: MasterClassDto[]; classId: string; startAt: string; endAt: string; status: MasterSessionStatus; actions: ReturnType<typeof getSessionActionPolicy>; scheduleOpen: boolean; repeatMode: RepeatMode; activeRules: MasterScheduleRule[]; saving: boolean;
  setClassId: (value: string) => void; setStartAt: (value: string) => void; setEndAt: (value: string) => void; setScheduleOpen: (update: boolean | ((open: boolean) => boolean)) => void; setRepeatMode: (mode: RepeatMode) => void; resetAttendance: () => void; setDirty: (dirty: boolean) => void; persist: (status: MasterSessionStatus) => Promise<void>; deleteCancelledSession: () => void; endRule: (ruleId: string) => Promise<void>;
}) {
  const sessionMenuRef = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { const node = sessionMenuRef.current; if (!node?.open) return; if (event.target instanceof Node && node.contains(event.target)) return; node.removeAttribute('open'); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  if (isCreate) return <div data-session-create className="flex flex-col pt-3">
    <section><label className="block text-[13px] font-semibold text-slate-700">수업반<select value={classId} onChange={(event) => { setClassId(event.target.value); resetAttendance(); setDirty(true); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Link href="/spokedu-master/classes?create=1" className="mt-1.5 block text-[13px] font-medium leading-5 text-slate-500 hover:text-slate-950">+ 새 수업반 만들기</Link></section>
    <section className="mt-6"><h3 className="text-[13px] font-semibold text-slate-700">일정</h3><ScheduleFields startAt={startAt} endAt={endAt} setStartAt={setStartAt} setEndAt={setEndAt} setDirty={setDirty} /></section>
    <section className="mt-[22px]"><details className="relative border-b border-slate-100"><summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-950">반복</span><span className="inline-flex items-center gap-1 text-sm text-slate-500">{REPEAT_LABEL[repeatMode]}{repeatMode !== 'none' ? ' · 4회' : ''}<ChevronRight size={16} /></span></summary><div className="absolute right-0 z-20 mt-1 min-w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{(['none', 'weekly', 'biweekly'] as const).map((mode) => <button key={mode} type="button" onClick={(event) => { setRepeatMode(mode); event.currentTarget.closest('details')?.removeAttribute('open'); }} className={`min-h-11 w-full rounded-lg px-3 text-left text-sm font-medium ${repeatMode === mode ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`}>{REPEAT_LABEL[mode]}{mode !== 'none' ? ' · 4회 생성' : ''}</button>)}</div></details></section>
  </div>;

  return <section aria-labelledby="session-information-heading">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 id="session-information-heading" className="text-[20px] font-bold leading-6 text-slate-950">{selectedClass?.name ?? '수업 정보'}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-700'}`}>{statusLabel(status)}</span></div><p className="mt-1 text-[13px] text-slate-500">{formatSeoulSessionDay(startAt.slice(0, 10), { month: 'long', day: 'numeric', weekday: 'long' })} · {formatSeoulSessionTime(seoulDateTimeInputToIso(startAt))}–{formatSeoulSessionTime(seoulDateTimeInputToIso(endAt))}</p></div><details ref={sessionMenuRef} className="relative shrink-0"><summary className="grid h-11 w-11 shrink-0 cursor-pointer list-none place-items-center rounded-[10px] text-slate-400 hover:bg-slate-100" aria-label="수업 관리 메뉴"><MoreHorizontal size={18} /></summary><div className="absolute right-0 top-12 z-30 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" onClick={(event) => { setScheduleOpen((open) => !open); event.currentTarget.closest('details')?.removeAttribute('open'); }} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">{scheduleOpen ? '일정 접기' : '일정 변경'}</button>{activeSession && status === 'scheduled' ? <button type="button" disabled={saving} onClick={() => { if (window.confirm('이 수업을 취소할까요?')) void persist('cancelled'); }} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">수업 취소</button> : null}{activeSession && status === 'cancelled' ? <><button type="button" disabled={saving} onClick={() => void persist('scheduled')} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">취소 해제</button><button type="button" disabled={saving} onClick={() => { if (window.confirm('취소된 수업을 삭제할까요?')) deleteCancelledSession(); }} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">수업 삭제</button></> : null}</div></details></div>
    {scheduleOpen ? <div className="mt-5 space-y-5"><label className="block text-[13px] font-semibold text-slate-700">수업반<select value={classId} disabled={status !== 'scheduled'} onChange={(event) => { setClassId(event.target.value); resetAttendance(); setDirty(true); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><fieldset disabled={Boolean(activeSession && !actions.editSchedule)}><legend className="text-[13px] font-semibold text-slate-700">일정</legend><ScheduleFields startAt={startAt} endAt={endAt} setStartAt={setStartAt} setEndAt={setEndAt} setDirty={setDirty} /></fieldset></div> : null}
    {scheduleOpen && activeRules.length ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-slate-500">활성 반복 일정 {activeRules.length}개</summary><div className="space-y-2">{activeRules.map((rule) => <div key={rule.id} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 text-xs text-slate-600"><span>{rule.cadence === 'weekly' ? '매주' : '격주'} · {rule.startTime}</span><button type="button" disabled={saving} onClick={() => void endRule(rule.id)} className="min-h-11 px-2 font-semibold text-rose-600">반복 종료</button></div>)}</div></details> : null}
  </section>;
}
