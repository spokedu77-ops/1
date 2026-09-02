'use client';

import { CalendarDays, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SPM_PRIMARY_BTN_FULL, SPM_SECONDARY_BTN } from '../../lib/masterActionGrammar';
import { buildScheduleOccurrencePreview, occurrenceOverlaps, type MasterScheduleCadence, type MasterScheduleRule } from '../../lib/recurringSchedule';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulToday } from '../../lib/sessionDateTime';
import type { MasterSessionDto } from '../../types/operational';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function RegularSchedulePanel({ classId, sessions, onCreated }: { classId: string; sessions: MasterSessionDto[]; onCreated: () => Promise<void> }) {
  const [rules, setRules] = useState<MasterScheduleRule[]>([]);
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [cadence, setCadence] = useState<MasterScheduleCadence>('weekly'); const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState('16:00'); const [duration, setDuration] = useState(60); const [startsOn, setStartsOn] = useState(getSeoulToday());
  const load = useCallback(async () => { const response = await fetch(`/api/spokedu-master/classes/${classId}/schedule-rules`, { cache: 'no-store' }); const json = await response.json(); if (response.ok) setRules(json.data ?? []); }, [classId]);
  useEffect(() => { void load(); }, [load]);
  const preview = useMemo(() => buildScheduleOccurrencePreview({ cadence, weekday, startTime, startsOn, count: 4, durationMinutes: duration }), [cadence, duration, startTime, startsOn, weekday]);
  const rows = preview.map((item) => ({ ...item, conflict: occurrenceOverlaps(item.startAt, item.endAt, sessions.filter((session) => session.classId === classId)) }));
  const create = async () => {
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/spokedu-master/classes/${classId}/schedule-rules`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cadence, weekday, startTime, durationMinutes: duration, startsOn, occurrences: preview }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error || '정기 일정을 만들지 못했습니다.');
      await load(); await onCreated(); setOpen(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '정기 일정을 만들지 못했습니다.'); } finally { setSaving(false); }
  };
  const endRule = async (ruleId: string) => {
    setSaving(true); setError(null);
    try { const response = await fetch(`/api/spokedu-master/classes/${classId}/schedule-rules/${ruleId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: false }) }); if (!response.ok) throw new Error('정기 일정을 종료하지 못했습니다.'); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '정기 일정을 종료하지 못했습니다.'); } finally { setSaving(false); }
  };
  const activeRules = rules.filter((rule) => rule.active);
  return <details className="mt-5 rounded-xl border border-slate-200/70 bg-white/60">
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-slate-600"><span>반 설정과 정기 일정</span><span className="text-xs font-medium text-slate-400">선택</span></summary>
    <section className="pt-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">정기 수업 일정</p><h2 className="mt-1 text-base font-bold text-slate-800">{activeRules.length ? activeRules.map((rule) => `${rule.cadence === 'biweekly' ? '격주' : '매주'} ${WEEKDAYS[rule.weekday]} · ${rule.startTime}`).join(' / ') : '설정된 일정 없음'}</h2></div><button type="button" onClick={() => setOpen(true)} className={SPM_SECONDARY_BTN}><Plus size={16} />정기 일정 설정</button></div>
    <p className="mt-2 text-xs font-medium leading-5 text-slate-500">매주 같은 시간이라면 자동으로 다음 수업을 잡을 수 있습니다.</p>
    {activeRules.length ? <div className="mt-3 space-y-2">{activeRules.map((rule) => <div key={rule.id} className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3"><span className="text-xs font-medium text-slate-600">이미 만든 미래 수업은 유지됩니다.</span><button type="button" disabled={saving} onClick={() => void endRule(rule.id)} className="min-h-11 px-2 text-xs font-semibold text-rose-600">정기 일정 종료</button></div>)}</div> : null}
    {open ? <BottomSheet open title="앞으로 4주 수업 일정 만들기" onClose={() => setOpen(false)}><div className="space-y-4 pb-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><label className="text-xs font-black text-slate-600">주기<select value={cadence} onChange={(e) => setCadence(e.target.value as MasterScheduleCadence)} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="weekly">매주</option><option value="biweekly">격주</option></select></label><label className="text-xs font-black text-slate-600">요일<select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="mt-1 h-11 w-full rounded-xl border px-3">{WEEKDAYS.map((label, index) => <option key={label} value={index}>{label}요일</option>)}</select></label><label className="text-xs font-black text-slate-600">시작<input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="text-xs font-black text-slate-600">시간<select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 h-11 w-full rounded-xl border px-3"><option value={40}>40분</option><option value={50}>50분</option><option value={60}>60분</option><option value={90}>90분</option></select></label></div>
      <label className="block text-xs font-black text-slate-600">시작일<input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" /></label>
      <div><p className="text-sm font-black text-slate-800">생성 전 확인</p><div className="mt-2 space-y-2">{rows.map((row) => <div key={row.startAt} className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-bold ${row.conflict ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-700'}`}><span><CalendarDays size={14} className="mr-2 inline" />{formatSeoulSessionDay(row.day, { month: 'long', day: 'numeric', weekday: 'short' })} · {formatSeoulSessionTime(row.startAt)}</span><span className="text-xs">{row.conflict ? '기존 일정 있음 · 건너뜀' : '생성 예정'}</span></div>)}</div></div>
      {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}<button type="button" disabled={saving || !rows.some((row) => !row.conflict)} onClick={() => void create()} className={SPM_PRIMARY_BTN_FULL}>{saving ? '만드는 중…' : `앞으로 ${rows.filter((row) => !row.conflict).length}개 수업 만들기`}</button>
    </div></BottomSheet> : null}
    </section>
  </details>;
}
