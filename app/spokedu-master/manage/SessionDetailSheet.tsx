'use client';

import { Check, ChevronDown, ChevronUp, MoreHorizontal, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMasterCanUseRecords, useMasterCanUseSpomove } from '../access/MasterAccessProvider';
import { SessionCapturePanel, type SessionCaptureHandle } from '../activity/SessionCapturePanel';
import { getSessionActionPolicy } from '../activity/sessionActionPolicy';
import { buildSessionProgramDetailHref, resolveSessionProgramAvailability } from '../activity/sessionProgramAvailability';
import { BottomSheet } from '../components/ui/BottomSheet';
import { MASTER_ACTION_COPY, SPM_PRIMARY_BTN_FULL, SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';
import { buildActivitySessionHref } from '../lib/masterNavigationContext';
import { getMasterRequestErrorMessage } from '../lib/masterRequestError';
import { splitLessonTitle } from '../lib/lessonDisplay';
import { buildScheduleOccurrencePreview, occurrenceOverlaps, type MasterScheduleCadence, type MasterScheduleRule } from '../lib/recurringSchedule';
import { buildSessionDraftDateTimes, formatSeoulSessionDay, formatSeoulSessionTime, seoulDateTimeInputToIso } from '../lib/sessionDateTime';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { OFFICIAL_SPOMOVE_LIBRARY, findOfficialSpomovePreset, officialPresetSessionHref } from '../spomove/officialSpomovePresets';
import { isHubRunnablePreset } from '../spomove/movements/isHubVisiblePreset';
import { useMasterStore } from '../store';
import type { MasterSessionDto, MasterSessionProgramDto, MasterSessionStatus, SaveSessionInput } from '../types/operational';
import { SessionActivityPicker, type ActivityPickerItem } from './SessionActivityPicker';

type RepeatMode = 'none' | MasterScheduleCadence;

const statusLabel = (status: MasterSessionStatus) => status === 'completed' ? '✓ 완료' : status === 'cancelled' ? '취소' : '예정';

export function SessionDetailSheet({
  session,
  initialDay,
  initialClassId,
  legacyCapture,
  onClose,
}: {
  session: MasterSessionDto | null;
  initialDay: string;
  initialClassId?: string | null;
  legacyCapture: boolean;
  onClose: () => void;
}) {
  const data = useOperationalData();
  const canUseRecords = useMasterCanUseRecords();
  const canUseSpomove = useMasterCanUseSpomove();
  const libraryPrograms = useMasterStore((state) => state.programs);
  const programsLoaded = useMasterStore((state) => state.programsLoaded);
  const reloadPrograms = useMasterStore((state) => state.reloadPrograms);
  const initialTimes = buildSessionDraftDateTimes(new Date(`${initialDay}T12:00:00+09:00`), session ?? undefined);
  const [activeSession, setActiveSession] = useState(session);
  const [classId, setClassId] = useState(session?.classId ?? data.classes.find((item) => item.id === initialClassId)?.id ?? data.classes[0]?.id ?? '');
  const [startAt, setStartAt] = useState(initialTimes.startAt);
  const [endAt, setEndAt] = useState(initialTimes.endAt);
  const [status, setStatus] = useState<MasterSessionStatus>(session?.status ?? 'scheduled');
  const [memo, setMemo] = useState(session?.memo ?? '');
  const [programs, setPrograms] = useState<MasterSessionProgramDto[]>(session?.programs ?? []);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(Object.fromEntries(session?.attendance.map((item) => [item.studentId, item.status]) ?? []));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(!session);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [rules, setRules] = useState<MasterScheduleRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<SessionCaptureHandle | null>(null);
  const selectedClass = data.classes.find((item) => item.id === classId) ?? null;
  const actions = getSessionActionPolicy(status);
  const currentRoster = data.students.filter((student) => selectedClass?.studentIds.includes(student.id));
  const historicalRoster = status === 'completed' ? (activeSession?.attendance ?? [])
    .filter((entry) => !currentRoster.some((student) => student.id === entry.studentId))
    .map((entry) => ({ id: entry.studentId, name: entry.studentName })) : [];
  const roster = [...currentRoster, ...historicalRoster];
  const catalogIds = useMemo(() => new Set(libraryPrograms.map((item) => Number(item.id))), [libraryPrograms]);

  useEffect(() => {
    if (!programsLoaded) void reloadPrograms();
  }, [programsLoaded, reloadPrograms]);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    void fetch(`/api/spokedu-master/classes/${classId}/schedule-rules`, { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : { data: [] })
      .then((json) => { if (!cancelled) setRules(json.data ?? []); })
      .catch(() => { if (!cancelled) setRules([]); });
    return () => { cancelled = true; };
  }, [classId]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!session || saving || dirty) return;
    const times = buildSessionDraftDateTimes(new Date(`${initialDay}T12:00:00+09:00`), session);
    setActiveSession(session);
    setStatus(session.status);
    setPrograms(session.programs);
    setAttendance(Object.fromEntries(session.attendance.map((item) => [item.studentId, item.status])));
    setMemo(session.memo ?? '');
    setStartAt(times.startAt);
    setEndAt(times.endAt);
  }, [dirty, initialDay, saving, session]);

  const availablePrograms: ActivityPickerItem[] = libraryPrograms
    .filter((item) => !programs.some((program) => program.sourceType === 'program' && program.programId === Number(item.id)))
    .map((item) => ({ key: `program:${item.id}`, title: item.title, description: [item.category, item.grade, item.space].filter(Boolean).join(' · ') }));
  const availableSpomove: ActivityPickerItem[] = canUseSpomove ? OFFICIAL_SPOMOVE_LIBRARY.filter(isHubRunnablePreset)
    .filter((item) => !programs.some((program) => program.sourceType === 'spomove' && program.spomovePresetId === item.id))
    .map((item) => ({ key: `spomove:${item.id}`, title: item.title, description: item.description || item.recommendedUse })) : [];

  const input = (nextStatus = status): SaveSessionInput => ({
    classId,
    startAt: seoulDateTimeInputToIso(startAt),
    endAt: seoulDateTimeInputToIso(endAt),
    status: nextStatus,
    memo: canUseRecords ? memo.trim() || null : null,
    programs: activeSession ? undefined : programs.map((item) => ({ sourceType: item.sourceType, programId: item.programId, spomovePresetId: item.spomovePresetId })),
  });
  const attendanceInput = () => Object.entries(attendance).map(([studentId, attendanceStatus]) => ({ studentId, status: attendanceStatus }));

  async function addActivities(keys: string[]) {
    if (!keys.length) return;
    if (!activeSession) {
      setPrograms((current) => [...current, ...keys.flatMap<MasterSessionProgramDto>((key, index) => {
        const [source, id] = key.split(':', 2);
        if (source === 'program') {
          const item = libraryPrograms.find((program) => program.id === id);
          return item ? [{ id: `draft:${key}`, sourceType: 'program' as const, programId: Number(id), spomovePresetId: null, programTitle: item.title, sortOrder: current.length + index, isCompleted: false }] : [];
        }
        const item = findOfficialSpomovePreset(id);
        return item ? [{ id: `draft:${key}`, sourceType: 'spomove' as const, programId: null, spomovePresetId: id, programTitle: item.title, sortOrder: current.length + index, isCompleted: false }] : [];
      })]);
      setDirty(true);
      setPickerOpen(false);
      return;
    }
    setSaving(true); setError(null);
    try {
      for (const key of keys) {
        const [source, id] = key.split(':', 2);
        const added = source === 'spomove' ? await data.addSessionSpomove(activeSession.id, id) : await data.addSessionProgram(activeSession.id, Number(id));
        setPrograms((current) => current.some((item) => item.id === added.id) ? current : [...current, added]);
      }
      setPickerOpen(false);
    } catch (caught) { setError(getMasterRequestErrorMessage(caught) || '활동을 추가하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  async function createRecurringSession() {
    const startDay = startAt.slice(0, 10);
    const startTime = startAt.slice(11, 16);
    const durationMinutes = Math.max(15, Math.round((new Date(seoulDateTimeInputToIso(endAt)).getTime() - new Date(seoulDateTimeInputToIso(startAt)).getTime()) / 60_000));
    const weekday = new Date(`${startDay}T12:00:00+09:00`).getDay();
    const occurrences = buildScheduleOccurrencePreview({ cadence: repeatMode as MasterScheduleCadence, weekday, startTime, startsOn: startDay, count: 4, durationMinutes });
    const conflicts = occurrences.filter((item) => occurrenceOverlaps(item.startAt, item.endAt, data.sessions.filter((candidate) => candidate.classId === classId)));
    if (conflicts.length && !window.confirm(`${conflicts.length}개 회차는 기존 일정과 겹쳐 생성되지 않습니다. 계속할까요?`)) return;
    const availableOccurrences = occurrences.filter((item) => !conflicts.includes(item));
    if (!availableOccurrences.length) throw new Error('생성할 수 있는 반복 일정이 없습니다.');
    const response = await fetch(`/api/spokedu-master/classes/${classId}/schedule-rules`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cadence: repeatMode, weekday, startTime, durationMinutes, startsOn: startDay, occurrences: availableOccurrences }) });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || '반복 일정을 만들지 못했습니다.');
    const first = (json.data?.occurrences ?? []).find((item: { created?: boolean }) => item.created) ?? json.data?.occurrences?.[0];
    const firstSessionId = first?.session_id ?? first?.sessionId;
    if (firstSessionId) {
      const saved = await data.saveSession({ ...input('scheduled'), programs: undefined }, firstSessionId);
      for (const program of programs) {
        if (program.sourceType === 'spomove' && program.spomovePresetId) await data.addSessionSpomove(saved.id, program.spomovePresetId);
        if (program.sourceType === 'program' && program.programId != null) await data.addSessionProgram(saved.id, program.programId);
      }
    }
    await data.reload('soft');
  }

  async function persist(nextStatus = status) {
    if (!classId || saving) return;
    setSaving(true); setError(null);
    try {
      if (nextStatus === 'completed' && legacyCapture) {
        const captureSaved = await captureRef.current?.save() ?? true;
        if (!captureSaved) throw new Error('수업 기록을 저장하지 못했습니다.');
      }
      if (!activeSession && repeatMode !== 'none') {
        await createRecurringSession();
        onClose();
        return;
      }
      const saved = nextStatus === 'completed' && activeSession
        ? await data.completeSession(activeSession.id, input('completed'), attendanceInput())
        : await data.saveSession(input(nextStatus), activeSession?.id);
      if (activeSession && nextStatus === 'scheduled') await data.saveSessionAttendance(saved.id, attendanceInput());
      setActiveSession(saved); setStatus(saved.status);
      setDirty(false);
      if (nextStatus === 'completed' || !activeSession) onClose();
    } catch (caught) { setError(getMasterRequestErrorMessage(caught) || '수업을 저장하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  async function toggleProgram(program: MasterSessionProgramDto) {
    if (!activeSession || !actions.toggleActivityCompletion || saving) return;
    setSaving(true); setError(null);
    try { await data.updateSessionProgram(activeSession.id, program.id, !program.isCompleted); setPrograms((current) => current.map((item) => item.id === program.id ? { ...item, isCompleted: !item.isCompleted } : item)); }
    catch (caught) { setError(getMasterRequestErrorMessage(caught) || '활동 상태를 저장하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  async function moveProgram(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= programs.length || saving) return;
    const next = [...programs]; [next[index], next[target]] = [next[target]!, next[index]!];
    const ordered = next.map((item, sortOrder) => ({ ...item, sortOrder }));
    if (!activeSession) { setPrograms(ordered); setDirty(true); return; }
    setSaving(true);
    try { setPrograms(await data.reorderSessionPrograms(activeSession.id, ordered.map((item) => item.id))); }
    catch (caught) { setError(getMasterRequestErrorMessage(caught) || '활동 순서를 저장하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  async function removeProgram(program: MasterSessionProgramDto) {
    if (!actions.removeActivities || saving) return;
    if (!activeSession) { setPrograms((current) => current.filter((item) => item.id !== program.id).map((item, sortOrder) => ({ ...item, sortOrder }))); setDirty(true); return; }
    setSaving(true);
    try { await data.removeSessionProgram(activeSession.id, program.id); setPrograms((current) => current.filter((item) => item.id !== program.id)); }
    catch (caught) { setError(getMasterRequestErrorMessage(caught) || '활동을 삭제하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  async function endRule(ruleId: string) {
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/spokedu-master/classes/${classId}/schedule-rules/${ruleId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: false }) });
      if (!response.ok) throw new Error('반복 일정을 종료하지 못했습니다.');
      setRules((current) => current.map((rule) => rule.id === ruleId ? { ...rule, active: false } : rule));
    } catch (caught) { setError(getMasterRequestErrorMessage(caught) || '반복 일정을 종료하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  const title = activeSession ? '수업 상세' : '수업 추가';
  const activeRules = rules.filter((rule) => rule.active);
  const requestClose = () => {
    if (saving) return false;
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 나가면 사라집니다.')) return false;
    onClose();
    return true;
  };

  return <>
    <BottomSheet open title={title} size="session" onClose={requestClose} footer={
      status === 'scheduled' ? <div className="border-t border-slate-200 bg-white px-1 pb-[max(12px,env(safe-area-inset-bottom))] pt-3"><button type="button" disabled={saving || !classId} onClick={() => void persist(activeSession ? 'completed' : 'scheduled')} className={SPM_PRIMARY_BTN_FULL}>{saving ? '저장 중…' : activeSession ? MASTER_ACTION_COPY.completeSession : MASTER_ACTION_COPY.createSession}</button></div> : undefined
    }>
      <div className="space-y-7 pb-3">
        <section aria-labelledby="session-information-heading">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 id="session-information-heading" className="text-[20px] font-semibold leading-7 text-slate-950">{selectedClass?.name ?? '수업 정보'}</h3><span className={`rounded-full px-2 py-1 text-xs font-semibold ${status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{statusLabel(status)}</span></div><p className="mt-1 text-sm text-slate-500">{formatSeoulSessionDay(startAt.slice(0, 10), { month: 'long', day: 'numeric', weekday: 'long' })} · {formatSeoulSessionTime(seoulDateTimeInputToIso(startAt))}–{formatSeoulSessionTime(seoulDateTimeInputToIso(endAt))}</p></div><details className="relative shrink-0"><summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label="수업 관리 메뉴"><MoreHorizontal size={19} /></summary><div className="absolute right-0 top-11 z-30 min-w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" onClick={() => setScheduleOpen((open) => !open)} className="min-h-11 w-full rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">{scheduleOpen ? '일정 접기' : '일정 변경'}</button></div></details></div>
          {scheduleOpen ? <div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-500">수업반<select value={classId} disabled={status !== 'scheduled'} onChange={(event) => { setClassId(event.target.value); setAttendance({}); setDirty(true); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><fieldset disabled={Boolean(activeSession && !actions.editSchedule)}><legend className="text-xs font-semibold text-slate-500">일정</legend><div className="mt-1 grid grid-cols-[minmax(0,1fr)_88px_12px_88px] items-center gap-2"><input aria-label="수업 날짜" type="date" value={startAt.slice(0, 10)} onChange={(event) => { const day = event.target.value; setStartAt(`${day}${startAt.slice(10)}`); setEndAt(`${day}${endAt.slice(10)}`); setDirty(true); }} className="h-11 min-w-0 rounded-xl border border-slate-200 px-2 text-sm" /><input aria-label="시작 시간" type="time" value={startAt.slice(11, 16)} onChange={(event) => { setStartAt(`${startAt.slice(0, 11)}${event.target.value}`); setDirty(true); }} className="h-11 min-w-0 rounded-xl border border-slate-200 px-2 text-sm" /><span className="text-center text-slate-400">–</span><input aria-label="종료 시간" type="time" value={endAt.slice(11, 16)} onChange={(event) => { setEndAt(`${endAt.slice(0, 11)}${event.target.value}`); setDirty(true); }} className="h-11 min-w-0 rounded-xl border border-slate-200 px-2 text-sm" /></div></fieldset>{!activeSession ? <label className="block text-xs font-semibold text-slate-500">반복<select value={repeatMode} onChange={(event) => { setRepeatMode(event.target.value as RepeatMode); setDirty(true); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="none">없음</option><option value="weekly">매주</option><option value="biweekly">격주</option></select></label> : null}</div> : null}
          {scheduleOpen && activeRules.length ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-slate-500">활성 반복 일정 {activeRules.length}개</summary><div className="space-y-2">{activeRules.map((rule) => <div key={rule.id} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 text-xs text-slate-600"><span>{rule.cadence === 'weekly' ? '매주' : '격주'} · {rule.startTime}</span><button type="button" disabled={saving} onClick={() => void endRule(rule.id)} className="min-h-11 px-2 font-semibold text-rose-600">반복 종료</button></div>)}</div></details> : null}
        </section>

        <section aria-labelledby="session-activities-heading"><div className="flex items-center justify-between gap-3"><h3 id="session-activities-heading" className="text-base font-semibold text-slate-950">수업 활동</h3>{activeSession && programs.length ? <span className="text-xs text-slate-400">진행 {programs.filter((item) => item.isCompleted).length}/{programs.length}</span> : null}</div><div className="mt-2 divide-y divide-slate-100">{programs.map((program, index) => {
          const availability = resolveSessionProgramAvailability(program, catalogIds, programsLoaded);
          const programHref = activeSession && availability.kind === 'available' ? buildSessionProgramDetailHref({ programId: availability.programId, sessionId: activeSession.id, sessionProgramId: program.id, returnTo: buildActivitySessionHref(activeSession.id) }) : null;
          const preset = program.spomovePresetId ? findOfficialSpomovePreset(program.spomovePresetId) : null;
          const spomoveHref = activeSession && preset ? officialPresetSessionHref(preset, { entry: 'start', session: activeSession.id, sessionProgram: program.id, returnTo: buildActivitySessionHref(activeSession.id) }) : null;
          const detailHref = programHref ?? spomoveHref;
          const officialProgram = program.programId == null ? null : libraryPrograms.find((item) => Number(item.id) === program.programId);
          const displayTitle = program.sourceType === 'program' && officialProgram ? splitLessonTitle(officialProgram.title).koreanTitle : preset?.title ?? program.programTitle ?? '이름 없는 활동';
          const content = <span className="min-w-0 flex-1"><span className="line-clamp-2 text-[16px] font-semibold leading-[22px] text-slate-950 sm:text-[17px]">{displayTitle}</span><span className="mt-0.5 block text-xs font-medium text-slate-500">{program.sourceType === 'spomove' ? 'SPOMOVE' : '놀이체육'}</span></span>;
          return <div key={program.id} className="flex min-h-[68px] items-center gap-2 py-2"><button type="button" disabled={!activeSession || !actions.toggleActivityCompletion} onClick={() => void toggleProgram(program)} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-white ${program.isCompleted ? 'border-emerald-500 text-emerald-700' : 'border-slate-300 text-slate-300'}`} aria-label={`${displayTitle} ${program.isCompleted ? '실제 진행' : '미진행'}`}><Check size={17} /></button>{detailHref ? <Link href={detailHref} target={spomoveHref ? '_blank' : undefined} rel={spomoveHref ? 'noreferrer' : undefined} className="flex min-w-0 flex-1">{content}</Link> : content}{actions.reorderActivities ? <details className="group relative shrink-0"><summary className="grid h-11 w-9 cursor-pointer list-none place-items-center rounded-xl text-slate-300 hover:bg-slate-100 hover:text-slate-600" aria-label="활동 관리"><MoreHorizontal size={17} /></summary><div className="absolute right-0 top-11 z-20 flex min-w-36 flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" disabled={index === 0 || saving} onClick={() => void moveProgram(index, -1)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"><ChevronUp size={15} />위로 이동</button><button type="button" disabled={index === programs.length - 1 || saving} onClick={() => void moveProgram(index, 1)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"><ChevronDown size={15} />아래로 이동</button><button type="button" disabled={saving} onClick={() => void removeProgram(program)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={14} />활동 삭제</button></div></details> : null}</div>;
        })}{!programs.length ? <p className="py-4 text-sm text-slate-500">아직 담은 활동이 없습니다.</p> : null}</div>{actions.addActivities ? <button type="button" onClick={() => setPickerOpen(true)} className={`${programs.length ? 'mt-2 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-slate-600' : `${SPM_SECONDARY_BTN} mt-1`}`}><Plus size={16} />활동 추가</button> : null}</section>

        {activeSession && actions.editAttendance ? <section aria-labelledby="session-attendance-heading"><div className="flex items-center justify-between"><h3 id="session-attendance-heading" className="text-base font-semibold text-slate-950">출석 <span className="ml-2 text-sm font-normal text-slate-500">{roster.filter((student) => attendance[student.id] === 'present').length} / {roster.length}</span></h3><button type="button" onClick={() => { setAttendance(Object.fromEntries(roster.map((student) => [student.id, 'present' as const]))); setDirty(true); }} className="min-h-11 px-2 text-xs font-semibold text-slate-700">전체 출석</button></div><div className="divide-y divide-slate-100">{roster.map((student) => <div key={student.id} className="flex min-h-14 items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{student.name}</span>{(['present', 'absent'] as const).map((value) => <button key={value} type="button" onClick={() => { setAttendance((current) => current[student.id] === value ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== student.id)) : { ...current, [student.id]: value }); setDirty(true); }} className={`min-h-11 min-w-12 rounded-xl border px-3 text-xs font-semibold ${attendance[student.id] === value ? value === 'present' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{value === 'present' ? '출석' : '결석'}</button>)}</div>)}{!roster.length ? <p className="py-4 text-sm text-slate-500">등록된 학생이 없습니다.</p> : null}</div></section> : null}

        {canUseRecords && status !== 'cancelled' ? <section><div className="flex min-h-11 items-center justify-between text-sm font-semibold text-slate-700"><span>메모</span><span className="text-xs font-normal text-slate-400">선택사항</span></div><textarea value={memo} onChange={(event) => { setMemo(event.target.value); setDirty(true); }} placeholder="수업에 대한 메모를 남겨보세요." className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm" /></section> : null}
        {legacyCapture && activeSession ? <SessionCapturePanel ref={captureRef} session={activeSession} sessions={data.sessions} students={data.students} classStudentIds={selectedClass?.studentIds ?? []} canUseRecords={canUseRecords} captureMode="emphasized" showInlinePremiumUpsell={false} order={6} memo={memo} onMemoChange={setMemo} /> : null}
        {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p> : null}

        {activeSession ? <details><summary className="flex min-h-11 cursor-pointer items-center gap-1 text-xs font-semibold text-slate-500">수업 관리 <ChevronDown size={15} /></summary><div className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">{status === 'scheduled' ? <><button type="button" disabled={saving} onClick={() => void persist('scheduled')} className={SPM_SECONDARY_BTN}><Save size={14} />변경사항 저장</button><button type="button" disabled={saving} onClick={() => { if (window.confirm('이 수업을 취소할까요?')) void persist('cancelled'); }} className="min-h-11 text-xs font-semibold text-rose-600">수업 취소</button></> : null}{status === 'completed' ? <><button type="button" disabled={saving || !dirty} onClick={() => void persist('completed')} className={SPM_SECONDARY_BTN}><Save size={14} />변경사항 저장</button><button type="button" disabled={saving} onClick={() => { if (window.confirm('완료를 취소하고 예정 상태로 되돌릴까요?')) void persist('scheduled'); }} className={SPM_SECONDARY_BTN}>완료 취소</button></> : null}{status === 'cancelled' ? <><button type="button" disabled={saving} onClick={() => void persist('scheduled')} className={SPM_SECONDARY_BTN}>취소 해제</button><button type="button" disabled={saving} onClick={() => { if (!window.confirm('취소된 수업을 삭제할까요?')) return; setSaving(true); void data.deleteCancelledSession(activeSession.id).then(onClose).catch((caught) => setError(getMasterRequestErrorMessage(caught) || '수업을 삭제하지 못했습니다.')).finally(() => setSaving(false)); }} className="min-h-11 text-xs font-semibold text-rose-600">수업 삭제</button></> : null}</div></details> : null}
      </div>
    </BottomSheet>
    <SessionActivityPicker open={pickerOpen} programs={availablePrograms} spomove={availableSpomove} saving={saving} onAdd={addActivities} onClose={() => setPickerOpen(false)} />
  </>;
}
