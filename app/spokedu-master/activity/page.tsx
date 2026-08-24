'use client';

import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3,
  FileText, Plus, Save, Search, UsersRound, Wrench, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { LessonManagementTabs } from '../components/lesson/LessonManagementTabs';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore } from '../store';
import { buildSessionDraftDateTimes, formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay, getSeoulToday, seoulDateTimeInputToIso, seoulDayToDate } from '../lib/sessionDateTime';
import type { MasterSessionDto, MasterSessionStatus } from '../types/operational';
import { OFFICIAL_SPOMOVE_LIBRARY, findOfficialSpomovePreset, officialPresetSessionHref } from '../spomove/officialSpomovePresets';
import { isHubRunnablePreset } from '../spomove/movements/isHubVisiblePreset';
import { resolveActivityQuery } from './activityQuery';
import { buildNextSessionDateTimes, buildNextSessionDraft } from './nextSession';
import { getSessionActionPolicy } from './sessionActionPolicy';
import { MonthSessionCalendar } from './MonthSessionCalendar';
import { changeSessionEnd, changeSessionStart, createSessionTimeDraft, sessionTimeDraftToInputs } from './sessionDraftTime';
import { getMonthKey } from './monthCalendar';

function statusLabel(status: MasterSessionStatus) {
  return status === 'completed' ? '완료' : status === 'cancelled' ? '취소' : '예정';
}

function statusTone(status: MasterSessionStatus) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500 ring-slate-200';
  return 'bg-blue-50 text-blue-700 ring-blue-200';
}

type DraftProgram = MasterSessionDto['programs'][number];
type ProgramFilter = 'program' | 'spomove';

function SessionSheet({
  session,
  initialDate,
  initialClassId,
  onClose,
}: {
  session: MasterSessionDto | null;
  initialDate: Date;
  initialClassId?: string | null;
  onClose: () => void;
}) {
  const data = useOperationalData();
  const router = useRouter();
  const [activeSession, setActiveSession] = useState(session);
  const libraryPrograms = useMasterStore((state) => state.programs);
  const programsLoaded = useMasterStore((state) => state.programsLoaded);
  const programsError = useMasterStore((state) => state.programsError);
  const reloadPrograms = useMasterStore((state) => state.reloadPrograms);
  const initialDateTimes = buildSessionDraftDateTimes(initialDate, session ?? undefined);
  const [timeDraft, setTimeDraft] = useState(() => createSessionTimeDraft(getSeoulSessionDay(initialDate), initialDateTimes.startAt.slice(11, 16), 60));
  const [classId, setClassId] = useState(session?.classId ?? data.classes.find((item) => item.id === initialClassId)?.id ?? data.classes[0]?.id ?? '');
  const [startAt, setStartAt] = useState(initialDateTimes.startAt);
  const [endAt, setEndAt] = useState(initialDateTimes.endAt);
  const [status, setStatus] = useState<MasterSessionStatus>(session?.status ?? 'scheduled');
  const [memo, setMemo] = useState(session?.memo ?? '');
  const [programs, setPrograms] = useState<DraftProgram[]>(
    session?.programs.map((item) => ({
      id: item.id, programId: item.programId, programTitle: item.programTitle,
      sourceType: item.sourceType, spomovePresetId: item.spomovePresetId,
      sortOrder: item.sortOrder, isCompleted: item.isCompleted,
    })) ?? [],
  );
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(
    Object.fromEntries(session?.attendance.map((item) => [item.studentId, item.status]) ?? []),
  );
  const [attendanceDirty, setAttendanceDirty] = useState(false);
  const [programPickerOpen, setProgramPickerOpen] = useState(false);
  const [programSearch, setProgramSearch] = useState('');
  const [programFilter, setProgramFilter] = useState<ProgramFilter>('program');
  const [selectedActivityKeys, setSelectedActivityKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextSessionOpen, setNextSessionOpen] = useState(false);
  const [nextDraft, setNextDraft] = useState(() => session ? buildNextSessionDraft(session) : null);
  const [copyPrograms, setCopyPrograms] = useState(false);
  const selectedClass = data.classes.find((item) => item.id === classId);
  const currentRoster = data.students.filter((student) => selectedClass?.studentIds.includes(student.id));
  const historicalRoster = status === 'completed'
    ? (activeSession?.attendance ?? []).filter((entry) => !currentRoster.some((student) => student.id === entry.studentId))
      .map((entry) => ({ id: entry.studentId, name: entry.studentName, historical: true }))
    : [];
  const roster = [...currentRoster.map((student) => ({ id: student.id, name: student.name, historical: false })), ...historicalRoster];
  const availablePrograms = libraryPrograms.filter((program) => !programs.some((item) => item.sourceType === 'program' && String(item.programId) === program.id));
  const availableSpomove = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubRunnablePreset)
    .filter((preset) => !programs.some((item) => item.sourceType === 'spomove' && item.spomovePresetId === preset.id));
  const query = programSearch.trim().toLowerCase();
  const visibleActivities = programFilter === 'program'
    ? availablePrograms.filter((program) => !query || [program.title, program.category, program.grade, program.space].join(' ').toLowerCase().includes(query))
      .map((program) => ({ key: `program:${program.id}`, title: program.title, description: [program.category, program.grade, program.space].filter(Boolean).join(' · ') }))
    : availableSpomove.filter((preset) => !query || [preset.title, preset.programGroup, preset.description].join(' ').toLowerCase().includes(query))
      .map((preset) => ({ key: `spomove:${preset.id}`, title: preset.title, description: preset.description || preset.recommendedUse }));
  const completedPrograms = programs.filter((item) => item.isCompleted).length;
  const presentRosterCount = currentRoster.filter((student) => attendance[student.id] === 'present').length;
  const uncheckedRosterCount = currentRoster.filter((student) => !attendance[student.id]).length;
  const actions = getSessionActionPolicy(status);
  const formDirty = Boolean(activeSession) && (
    classId !== activeSession!.classId
    || startAt !== buildSessionDraftDateTimes(initialDate, activeSession!).startAt
    || endAt !== buildSessionDraftDateTimes(initialDate, activeSession!).endAt
    || memo !== (activeSession!.memo ?? '')
    || attendanceDirty
  );

  const markAllPresent = () => {
    if (!actions.markAllPresent) return;
    setAttendance((current) => ({
      ...current,
      ...Object.fromEntries(currentRoster.map((student) => [student.id, 'present' as const])),
    }));
    setAttendanceDirty(true);
  };

  const createNextSession = async () => {
    if (!activeSession || activeSession.status !== 'completed' || !nextDraft) return;
    setSaving(true);
    setError(null);
    try {
      const values = buildNextSessionDateTimes(nextDraft);
      const nextSession = await data.createNextSession(activeSession.id, {
        startAt: seoulDateTimeInputToIso(values.startAt),
        endAt: seoulDateTimeInputToIso(values.endAt),
        copyPrograms,
      });
      router.push(`/spokedu-master/activity?session=${encodeURIComponent(nextSession.id)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '다음 수업을 만들지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const addSelectedPrograms = async () => {
    if (!actions.addActivities || !selectedActivityKeys.length) return;
    if (!activeSession) {
      const draftItems: DraftProgram[] = [];
      selectedActivityKeys.forEach((key, index) => {
        const [sourceType, sourceId] = key.split(':', 2) as [ProgramFilter, string];
        if (sourceType === 'program') {
          const program = libraryPrograms.find((item) => item.id === sourceId);
          if (program) draftItems.push({ id: `draft:${key}`, sourceType, programId: Number(program.id), spomovePresetId: null, programTitle: program.title, sortOrder: programs.length + index, isCompleted: false });
          return;
        }
        const preset = findOfficialSpomovePreset(sourceId);
        if (preset) draftItems.push({ id: `draft:${key}`, sourceType, programId: null, spomovePresetId: preset.id, programTitle: preset.title, sortOrder: programs.length + index, isCompleted: false });
      });
      setPrograms((current) => [...current, ...draftItems].map((item, sortOrder) => ({ ...item, sortOrder })));
      setSelectedActivityKeys([]);
      setProgramPickerOpen(false);
      setProgramSearch('');
      return;
    }
    setSaving(true);
    setError(null);
    let addedCount = 0;
    try {
      for (const key of selectedActivityKeys) {
        const [sourceType, sourceId] = key.split(':', 2) as [ProgramFilter, string];
        const program = sourceType === 'program' ? libraryPrograms.find((item) => item.id === sourceId) : null;
        const numericId = Number(program?.id);
        const added = sourceType === 'spomove'
          ? await data.addSessionSpomove(activeSession.id, sourceId)
          : program && Number.isInteger(numericId)
            ? await data.addSessionProgram(activeSession.id, numericId)
            : null;
        if (!added) continue;
        addedCount += 1;
        setPrograms((current) => current.some((item) => item.id === added.id) ? current : [...current, added]);
        setSelectedActivityKeys((current) => current.filter((item) => item !== key));
      }
      setProgramPickerOpen(false);
      setProgramSearch('');
    } catch {
      const failedCount = selectedActivityKeys.length - addedCount;
      setError(addedCount > 0
        ? `${addedCount}개 활동은 추가됐고 ${failedCount}개는 추가하지 못했습니다. 남은 항목을 다시 시도해 주세요.`
        : '활동을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const moveProgram = async (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= programs.length) return;
    const next = [...programs];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const ordered = next.map((item, sortOrder) => ({ ...item, sortOrder }));
    if (!activeSession) {
      setPrograms(ordered);
      return;
    }
    if (programs.some((item) => !item.id)) return;
    try {
      const savedPrograms = await data.reorderSessionPrograms(activeSession.id, ordered.map((item) => item.id!));
      setPrograms(savedPrograms);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '프로그램 순서를 저장하지 못했습니다.');
    }
  };

  const toggleProgram = async (program: DraftProgram) => {
    if (!activeSession || !program.id || !actions.toggleActivityCompletion) return;
    setError(null);
    try {
      const isCompleted = !program.isCompleted;
      await data.updateSessionProgram(activeSession.id, program.id, isCompleted);
      setPrograms((current) => current.map((item) => item.id === program.id ? { ...item, isCompleted } : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '프로그램 진행 상태를 저장하지 못했습니다.');
    }
  };

  const removeProgram = async (program: DraftProgram) => {
    if (!program.id || !actions.removeActivities) return;
    if (!activeSession) {
      setPrograms((current) => current.filter((item) => item.id !== program.id).map((item, sortOrder) => ({ ...item, sortOrder })));
      return;
    }
    setError(null);
    try {
      await data.removeSessionProgram(activeSession.id, program.id);
      setPrograms((current) => current.filter((item) => item.id !== program.id).map((item, sortOrder) => ({ ...item, sortOrder })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '프로그램을 삭제하지 못했습니다.');
    }
  };

  const persist = async (nextStatus = status) => {
    setSaving(true);
    setError(null);
    try {
      const sessionInput = (inputStatus: MasterSessionStatus) => ({
        classId,
        startAt: seoulDateTimeInputToIso(activeSession ? startAt : sessionTimeDraftToInputs(timeDraft).startAt),
        endAt: seoulDateTimeInputToIso(activeSession ? endAt : sessionTimeDraftToInputs(timeDraft).endAt),
        status: inputStatus,
        memo: memo.trim() || null,
        programs: activeSession ? undefined : programs.map((item) => ({ sourceType: item.sourceType, programId: item.programId, spomovePresetId: item.spomovePresetId })),
      });
      const attendanceInput = () => Object.entries(attendance)
        .filter(([studentId]) => roster.some((student) => student.id === studentId))
        .map(([studentId, value]) => ({ studentId, status: value }));
      const wasNew = !activeSession;
      let saved: MasterSessionDto;

      if (activeSession && status === 'scheduled' && nextStatus === 'completed') {
        saved = await data.completeSession(activeSession.id, sessionInput('completed'), attendanceInput());
      } else {
        if (activeSession && status === 'completed' && attendanceDirty) {
          await data.saveSessionAttendance(activeSession.id, attendanceInput());
        }
        saved = await data.saveSession(sessionInput(nextStatus), activeSession?.id);
        if (status !== 'completed' && nextStatus !== 'cancelled' && attendanceDirty) {
          await data.saveSessionAttendance(saved.id, attendanceInput());
        }
      }
      setActiveSession(saved);
      setStatus(saved.status);
      setAttendanceDirty(false);
      if (wasNew) {
        setPrograms(saved.programs);
        setError(null);
        return;
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '수업을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (nextSessionOpen && activeSession?.status === 'completed' && nextDraft) return (
    <BottomSheet open title="다음 수업 만들기" onClose={() => setNextSessionOpen(false)}>
      <div className="space-y-4 pb-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">수업반</p>
          <p className="mt-1 truncate text-sm font-black text-slate-900" title={activeSession.className}>{activeSession.className}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-black text-slate-600">날짜
            <input type="date" value={nextDraft.day} onChange={(event) => setNextDraft((current) => current ? { ...current, day: event.target.value } : current)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" />
          </label>
          <label className="text-xs font-black text-slate-600">시작
            <input type="time" value={nextDraft.startTime} onChange={(event) => setNextDraft((current) => current ? { ...current, startTime: event.target.value } : current)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" />
          </label>
          <label className="text-xs font-black text-slate-600">종료
            <input type="time" value={nextDraft.endTime} onChange={(event) => setNextDraft((current) => current ? { ...current, endTime: event.target.value, endDayOffset: event.target.value <= current.startTime ? 1 : 0 } : current)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" />
          </label>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={copyPrograms} onChange={(event) => setCopyPrograms(event.target.checked)} className="h-5 w-5 accent-emerald-600" />
          이번 수업 활동 그대로 가져오기
        </label>
        {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
        <button type="button" disabled={saving || !nextDraft.day || !nextDraft.startTime || !nextDraft.endTime} onClick={() => void createNextSession()} className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40">{saving ? '만드는 중…' : '다음 수업 생성'}</button>
      </div>
    </BottomSheet>
  );

  if (programPickerOpen) return (
    <BottomSheet open title="프로그램 추가" onClose={() => setProgramPickerOpen(false)}>
      <div className="space-y-4 pb-3">
        <button type="button" onClick={() => setProgramPickerOpen(false)} className="flex items-center gap-1 text-xs font-black text-slate-500"><ArrowLeft size={15} />수업 상세로</button>
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={programSearch} onChange={(event) => setProgramSearch(event.target.value)} placeholder="프로그램명, 연령, 공간 검색" className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-semibold outline-none focus:border-emerald-500" autoFocus />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {([['program', '수업 프로그램'], ['spomove', 'SPOMOVE']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setProgramFilter(value); setSelectedActivityKeys([]); }} className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black ${programFilter === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <div className="max-h-[48dvh] space-y-2 overflow-y-auto pr-1">
          {programFilter === 'program' && !programsLoaded ? <p className="rounded-xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-500">프로그램을 불러오는 중입니다.</p> : null}
          {programFilter === 'program' && programsLoaded && programsError ? <div className="rounded-xl bg-rose-50 p-4 text-center text-xs font-bold text-rose-700"><p>프로그램을 불러오지 못했습니다.</p><button type="button" onClick={() => void reloadPrograms()} className="mt-2 underline">다시 시도</button></div> : null}
          {visibleActivities.map((activity) => {
            const selected = selectedActivityKeys.includes(activity.key);
            return (
              <button key={activity.key} type="button" onClick={() => setSelectedActivityKeys((current) => selected ? current.filter((item) => item !== activity.key) : [...current, activity.key])} className={`w-full rounded-xl border p-3 text-left ${selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3"><strong className="text-sm text-slate-900">{activity.title}</strong>{selected ? <span className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black text-white">선택</span> : null}</div>
                {activity.description ? <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{activity.description}</p> : null}
              </button>
            );
          })}
          {(programFilter === 'spomove' || (programsLoaded && !programsError)) && !visibleActivities.length ? <p className="rounded-xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-500">조건에 맞는 활동이 없습니다.</p> : null}
        </div>
        {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
        <button type="button" disabled={!selectedActivityKeys.length || saving} onClick={() => void addSelectedPrograms()} className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40">선택한 활동 {selectedActivityKeys.length}개 추가</button>
      </div>
    </BottomSheet>
  );

  return (
    <BottomSheet open title={activeSession ? '수업 상세' : '수업 추가'} onClose={onClose}>
      <div className="space-y-5 pb-4">
        {activeSession ? <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0"><h3 className="truncate text-base font-black text-slate-900" title={activeSession.className}>{activeSession.className}</h3><p className="mt-1 text-xs font-bold text-slate-500">{formatSeoulSessionDay(getSeoulSessionDay(activeSession.startAt), { month: 'long', day: 'numeric', weekday: 'short' })} · {formatSeoulSessionTime(activeSession.startAt)}–{formatSeoulSessionTime(activeSession.endAt)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${statusTone(status)}`}>{statusLabel(status)}</span></div> : null}
        <section className={`grid gap-3 ${activeSession ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <label className="text-xs font-black text-slate-600">수업반
            <select value={classId} disabled={Boolean(activeSession) && !actions.editSchedule} onChange={(event) => { setClassId(event.target.value); setAttendance({}); setAttendanceDirty(true); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold disabled:bg-slate-50">
              {data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {!activeSession && selectedClass ? <span className="mt-1 block text-[11px] font-semibold text-slate-400">학생 {selectedClass.studentIds.length}명</span> : null}
          </label>
          {!activeSession ? <>
            <label className="text-xs font-black text-slate-600">날짜<input type="date" value={timeDraft.day} onChange={(event) => setTimeDraft((current) => ({ ...current, day: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" /></label>
            <div className="grid grid-cols-2 gap-2"><label className="text-xs font-black text-slate-600">시작<input type="time" value={timeDraft.startTime} onChange={(event) => setTimeDraft((current) => changeSessionStart(current, event.target.value))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-2 text-sm font-bold" /></label><label className="text-xs font-black text-slate-600">종료<input type="time" value={timeDraft.endTime} onChange={(event) => setTimeDraft((current) => changeSessionEnd(current, event.target.value))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-2 text-sm font-bold" /></label></div>
          </> : <>
            <label className="text-xs font-black text-slate-600">시작<input type="datetime-local" disabled={!actions.editSchedule} value={startAt} onChange={(event) => setStartAt(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:bg-slate-50" /></label>
            <label className="text-xs font-black text-slate-600">종료<input type="datetime-local" disabled={!actions.editSchedule} value={endAt} onChange={(event) => setEndAt(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:bg-slate-50" /></label>
          </>}
        </section>

        {activeSession ? <section>
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-black text-slate-800">출석 <span className="text-xs text-emerald-700">{presentRosterCount} / {currentRoster.length}</span></h3>{uncheckedRosterCount ? <p className="mt-1 text-[11px] font-bold text-amber-600">미체크 {uncheckedRosterCount}명</p> : null}</div>{actions.markAllPresent && currentRoster.length ? <button type="button" onClick={markAllPresent} className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-700">전체 출석</button> : null}</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {roster.map((student) => (
              <div key={student.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-sm font-bold text-slate-700">{student.name}{student.historical ? <small className="ml-1 text-[10px] text-slate-400">과거 참여</small> : null}</span>
                <div className="flex gap-1">
                  {(['present', 'absent'] as const).map((value) => (
                    <button key={value} type="button" disabled={!actions.editAttendance} onClick={() => { setAttendance((current) => ({ ...current, [student.id]: value })); setAttendanceDirty(true); }} className={`min-h-11 rounded-lg px-3 text-xs font-black disabled:opacity-40 ${attendance[student.id] === value ? (value === 'present' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-slate-100 text-slate-500'}`}>{value === 'present' ? '출석' : '결석'}</button>
                  ))}
                </div>
              </div>
            ))}
            {!roster.length ? <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500"><p>이 수업반에 등록된 학생이 없습니다.</p><Link href={`/spokedu-master/classes/${encodeURIComponent(classId)}`} className="mt-2 inline-block font-black text-emerald-700">이 수업반 명단 관리하기 →</Link></div> : null}
          </div>
        </section> : null}

        <section>
          <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-800">수업 구성</h3><span className="text-xs font-black text-emerald-700">진행 {completedPrograms} / 전체 {programs.length}</span></div>
          <div className="mt-2 space-y-2">
            {programs.map((program, index) => (
              <div key={program.id} className="rounded-xl border border-slate-200 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500" aria-label={`${index + 1}번째 활동`}>{index + 1}</span>
                  <button type="button" disabled={!activeSession || !actions.toggleActivityCompletion} onClick={() => void toggleProgram(program)} className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${program.isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`} aria-label={`${program.programTitle ?? '활동'} 진행 여부`}><Check size={18} /></button>
                  <span className={`min-w-0 flex-1 text-sm font-bold ${program.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}><span className="block truncate" title={program.programTitle ?? '이름 없는 활동'}>{program.programTitle ?? '이름 없는 활동'}</span>{program.sourceType === 'spomove' ? <span className="text-[10px] font-black text-blue-600">SPOMOVE</span> : null}</span>
                  {program.sourceType === 'program' && program.programId ? <Link target="_blank" rel="noreferrer" href={`/spokedu-master/library/${program.programId}`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-3 text-[11px] font-black text-slate-700" aria-label={`${program.programTitle ?? '프로그램'} 새 탭에서 보기`}>보기</Link> : null}
                  {program.sourceType === 'spomove' && program.spomovePresetId && findOfficialSpomovePreset(program.spomovePresetId) ? <Link target="_blank" rel="noreferrer" href={officialPresetSessionHref(findOfficialSpomovePreset(program.spomovePresetId)!)} className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-3 text-[11px] font-black text-white" aria-label={`${program.programTitle ?? 'SPOMOVE'} 새 탭에서 실행`}>실행</Link> : null}
                </div>
                {actions.reorderActivities || actions.removeActivities ? <div className="mt-2 flex justify-end gap-1 border-t border-slate-100 pt-2">
                  <button type="button" onClick={() => moveProgram(index, -1)} disabled={index === 0 || saving} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs font-bold text-slate-500 disabled:opacity-30" aria-label={`${program.programTitle ?? '활동'} 순서 위로`}><ChevronUp size={16} />위로</button>
                  <button type="button" onClick={() => moveProgram(index, 1)} disabled={index === programs.length - 1 || saving} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs font-bold text-slate-500 disabled:opacity-30" aria-label={`${program.programTitle ?? '활동'} 순서 아래로`}><ChevronDown size={16} />아래로</button>
                  <button type="button" disabled={saving} onClick={() => void removeProgram(program)} className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold text-rose-600 disabled:opacity-30" aria-label={`${program.programTitle ?? '활동'} 삭제`}>삭제</button>
                </div> : null}
              </div>
            ))}
            {!programs.length ? <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">아직 추가한 활동이 없습니다.</p> : null}
          </div>
          <button type="button" onClick={() => { setError(null); setSelectedActivityKeys([]); setProgramPickerOpen(true); }} disabled={!actions.addActivities || saving} className={`mt-2 h-11 w-full rounded-xl text-sm font-black disabled:opacity-40 ${!programs.length ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>+ 수업 활동 추가</button>
        </section>

        <label className="block text-sm font-black text-slate-800">수업 메모
          <textarea value={memo} disabled={!actions.editMemo} onChange={(event) => setMemo(event.target.value)} placeholder="수업 전체 메모" className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none disabled:bg-slate-50" />
        </label>
        {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
        {!activeSession ? <div><p className="mb-2 text-center text-[11px] font-semibold text-slate-400">활동은 나중에도 추가할 수 있습니다.</p><button type="button" disabled={saving || !classId} onClick={() => void persist()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40"><Save size={15} />수업 만들기</button></div> : null}
        {activeSession && status === 'scheduled' ? <div className="space-y-2">
          <button type="button" disabled={saving || !classId} onClick={() => void persist('completed')} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40"><CheckCircle2 size={16} />수업 완료</button>
          {formDirty ? <button type="button" disabled={saving || !classId} onClick={() => void persist()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-40"><Save size={15} />변경사항 저장</button> : null}
          <div className="flex items-center justify-between gap-2"><Link target="_blank" rel="noreferrer" href={`/spokedu-master/class-tools?session=${encodeURIComponent(activeSession.id)}`} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-black text-slate-600"><Wrench size={15} />수업도구</Link><button type="button" disabled={saving || !classId} onClick={() => void persist('cancelled')} className="inline-flex min-h-11 items-center gap-1 px-2 text-xs font-bold text-rose-600 disabled:opacity-40"><XCircle size={14} />수업 취소</button></div>
        </div> : null}
        {activeSession && status === 'completed' && formDirty ? <button type="button" disabled={saving || !classId} onClick={() => void persist()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 disabled:opacity-40"><Save size={15} />변경사항 저장</button> : null}
        {status === 'cancelled' ? <div className="rounded-xl bg-slate-100 p-3 text-center text-xs font-bold text-slate-500"><p>취소 기록은 보존되며 다시 예정으로 되돌릴 수 없습니다.</p><Link href={`/spokedu-master/activity?date=${encodeURIComponent(startAt.slice(0, 10))}&create=1&class=${encodeURIComponent(classId)}`} className="mt-2 inline-flex min-h-11 items-center justify-center px-3 font-black text-slate-700 underline underline-offset-2">대체 수업 만들기</Link></div> : null}
        {activeSession && status === 'completed' ? <Link href={`/spokedu-master/report?session=${encodeURIComponent(activeSession.id)}`} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700"><FileText size={15} />수업 안내문</Link> : null}
        {activeSession && status === 'completed' ? <button type="button" disabled={saving} onClick={() => { setError(null); setNextDraft(buildNextSessionDraft(activeSession)); setCopyPrograms(false); setNextSessionOpen(true); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40"><CalendarDays size={17} />다음 수업 만들기</button> : null}
      </div>
    </BottomSheet>
  );
}

export default function ActivityPage() {
  const data = useOperationalData();
  const searchParams = useSearchParams();
  const [selectedDay, setSelectedDay] = useState(getSeoulToday());
  const [editing, setEditing] = useState<MasterSessionDto | null | undefined>(undefined);
  const [createClassId, setCreateClassId] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const handledQuery = useRef<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthKey(selectedDay));
  const daySessions = useMemo(() => data.sessions
    .filter((session) => getSeoulSessionDay(session.startAt) === selectedDay)
    .sort((a, b) => {
      const priority = { scheduled: 0, completed: 1, cancelled: 2 } as const;
      return priority[a.status] - priority[b.status] || a.startAt.localeCompare(b.startAt);
    }), [data.sessions, selectedDay]);

  useEffect(() => {
    if (data.status !== 'ready') return;
    const queryKey = searchParams.toString();
    if (!queryKey || handledQuery.current === queryKey) return;
    handledQuery.current = queryKey;
    const resolution = resolveActivityQuery(searchParams, data.sessions, data.classes);
    if (resolution.kind === 'session') {
      setRouteError(null);
      setSelectedDay(getSeoulSessionDay(resolution.session.startAt));
      setVisibleMonth(getMonthKey(getSeoulSessionDay(resolution.session.startAt)));
      setEditing(resolution.session);
    } else if (resolution.kind === 'missing-session') {
      setEditing(undefined);
      setRouteError('수업을 찾을 수 없습니다.');
    } else if (resolution.kind === 'create') {
      setRouteError(null);
      setSelectedDay(resolution.day);
      setVisibleMonth(getMonthKey(resolution.day));
      setCreateClassId(resolution.classId);
      setEditing(null);
    } else if (resolution.kind === 'missing-class') {
      setEditing(undefined);
      setCreateClassId(null);
      setRouteError('잘못된 수업반입니다.');
    }
  }, [data.classes, data.sessions, data.status, searchParams]);

  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <header>
          <p className="text-xs font-black text-emerald-700">수업 관리</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-900">일정</h1><p className="mt-1 text-sm font-semibold text-slate-500">언제 어떤 수업이 있는지 관리합니다.</p></div><button type="button" onClick={() => { setCreateClassId(null); setEditing(null); }} disabled={!data.classes.length} className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-40"><Plus size={17} />수업 추가</button></div>
          <div className="mt-4"><LessonManagementTabs /></div>
        </header>

        {data.status === 'loading' || data.status === 'idle' ? <p className="mt-5 rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">수업 데이터를 불러오는 중입니다.</p> : null}
        {data.status === 'error' ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-sm font-bold text-rose-700">수업 데이터를 불러오지 못했습니다.</p><button type="button" onClick={() => void data.reload()} className="mt-3 text-sm font-black text-rose-700">다시 시도</button></div> : null}
        {routeError ? <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{routeError}</div> : null}

        {!data.classes.length && data.status === 'ready' ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800"><p>수업을 만들기 전에 수업반을 먼저 만들어 주세요.</p><Link href="/spokedu-master/classes?create=1" className="mt-2 inline-flex min-h-11 items-center text-sm font-black underline">수업반 만들기</Link></div> : null}

        <section className="mt-5">
          <MonthSessionCalendar
            month={visibleMonth}
            selectedDay={selectedDay}
            sessions={data.sessions}
            onMonthChange={setVisibleMonth}
            onDaySelect={(day) => {
              setSelectedDay(day);
              setVisibleMonth(getMonthKey(day));
            }}
          />
        </section>

        <section className="mt-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-900">{formatSeoulSessionDay(selectedDay, { month: 'long', day: 'numeric', weekday: 'long' })}</h2><span className="text-xs font-bold text-slate-400">수업 {daySessions.length}개</span></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {daySessions.map((session) => (
              <button key={session.id} type="button" onClick={() => setEditing(session)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md">
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-sm font-black text-slate-800"><Clock3 size={15} />{formatSeoulSessionTime(session.startAt)}–{formatSeoulSessionTime(session.endAt)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${statusTone(session.status)}`}>{statusLabel(session.status)}</span></div>
                <h3 className="mt-2 text-base font-black text-slate-900">{session.className}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{session.programs.length ? `활동 ${session.programs.length}개 · 진행 ${session.programs.filter((item) => item.isCompleted).length}/${session.programs.length}` : '활동 미지정'} · {statusLabel(session.status)}</p>
              </button>
            ))}
            {!daySessions.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><UsersRound className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-500">이 날짜에 예정된 수업이 없습니다.</p></div> : null}
          </div>
        </section>
      </div>
      {editing !== undefined ? <SessionSheet key={editing?.id ?? `new-${selectedDay}-${createClassId ?? 'default'}`} session={editing} initialDate={seoulDayToDate(selectedDay)} initialClassId={createClassId} onClose={() => setEditing(undefined)} /> : null}
    </main>
  );
}
