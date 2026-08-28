'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus, UserMinus, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LessonManagementTabs } from '../../components/lesson/LessonManagementTabs';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SPM_DESTRUCTIVE_BTN, SPM_PRIMARY_BTN_FULL, MASTER_ACTION_COPY } from '../../lib/masterActionGrammar';
import { studentMetaToDisplay } from '../../lib/operationalDataAdapter';
import { buildClassPriorityWork } from '../../lib/masterTemporalContract';
import type { MasterSessionWorkState } from '../../lib/masterSessionWorkState';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay, getSeoulToday } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { MasterStudentDto } from '../../types/operational';
import type { MasterClassRecordDto } from '../../types/legacyOperational';
import { fetchSessionCaptures } from '../../lib/sessionCaptureClient';
import { resolvePreviousSessionMemory } from '../../lib/sessionMemory';
import { buildClassAttendanceView, buildIncompleteAttendanceSessions, resolveInitialAttendanceMonth, selectNextClassSession, selectRecentCompletedClassSessions, shiftAttendanceMonth } from '../classManagementModel';
import { ClassRosterSheet } from './ClassRosterSheet';
import { RegularSchedulePanel } from './RegularSchedulePanel';
import { ClassMemoryPanel } from '../../components/records/CaptureProjections';
import { resolveSessionContinuity } from '../../activity/masterSessionContinuity';

type DetailTab = 'roster' | 'attendance';

function SessionSummary({ session, workState, emptyHref, nextSessionNote }: { session: ReturnType<typeof selectNextClassSession>; workState?: MasterSessionWorkState | null; emptyHref: string; nextSessionNote?: string | null }) {
  const needsPastWrap = Boolean(workState?.attention.overdue || workState?.stage === 'ready-to-wrap' || workState?.attention.attendanceMissing);
  const actionLabel = needsPastWrap ? '지난 수업 마무리하기' : session ? '수업 준비 이어가기' : '다음 수업 만들기';
  return <section className="rounded-xl bg-slate-900 p-5 text-white">
    <p className="text-xs font-medium text-slate-400">지금 해야 할 일</p>
    <h2 className="mt-2 text-xl font-semibold">{actionLabel}</h2>
    {session ? <p className="mt-2 text-sm font-medium text-slate-300">{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'long', day: 'numeric', weekday: 'short' })} {formatSeoulSessionTime(session.startAt)} · 활동 {workState?.progress.total ?? session.programs.length}개</p> : <p className="mt-2 text-sm font-medium text-slate-300">이어갈 수업이 아직 없습니다.</p>}
    {session && nextSessionNote ? <p className="mt-3 line-clamp-2 border-l border-slate-600 pl-3 text-sm font-normal leading-5 text-slate-300">지난 수업에서 이어갈 점 · {nextSessionNote}</p> : null}
    <Link href={session ? workState?.href ?? `/spokedu-master/activity?session=${encodeURIComponent(session.id)}` : emptyHref} className="mt-5 flex min-h-12 w-full items-center justify-center gap-1 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-slate-950">{actionLabel}<ChevronRight size={16} /></Link>
  </section>;
}

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const data = useOperationalData();
  const [tab, setTab] = useState<DetailTab>('roster');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [attendanceMonth, setAttendanceMonth] = useState<string | null>(null);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<MasterStudentDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captures, setCaptures] = useState<MasterClassRecordDto[]>([]);
  const classItem = data.classes.find((item) => item.id === classId) ?? null;
  const roster = useMemo(() => classItem ? data.students.filter((student) => classItem.studentIds.includes(student.id)) : [], [classItem, data.students]);
  const priorityWork = useMemo(() => classItem ? buildClassPriorityWork({ sessions: data.sessions, classItem, now: new Date() }) : null, [classItem, data.sessions]);
  const recentSessions = useMemo(() => selectRecentCompletedClassSessions(data.sessions, classId), [classId, data.sessions]);
  const classContinuity = useMemo(() => recentSessions[0] ? resolveSessionContinuity({ sourceSession: recentSessions[0], classSessions: data.sessions, classItem, now: new Date() }) : null, [classItem, data.sessions, recentSessions]);
  const nextSession = useMemo(() => classContinuity && 'targetSession' in classContinuity && classContinuity.targetSession.status === 'scheduled' ? classContinuity.targetSession : selectNextClassSession(data.sessions, classId, new Date()), [classContinuity, classId, data.sessions]);
  const nextSessionMemory = useMemo(() => nextSession ? resolvePreviousSessionMemory({ currentSession: nextSession, classSessions: data.sessions, captures }) : null, [captures, data.sessions, nextSession]);
  const incompleteSessions = useMemo(() => classItem ? buildIncompleteAttendanceSessions(data.sessions, classItem) : [], [classItem, data.sessions]);
  const initialAttendanceMonth = useMemo(() => resolveInitialAttendanceMonth(data.sessions, classId, getSeoulToday()), [classId, data.sessions]);
  const selectedAttendanceMonth = attendanceMonth ?? initialAttendanceMonth;
  const attendanceView = useMemo(() => classItem ? buildClassAttendanceView(classItem, data.sessions, data.students, selectedAttendanceMonth) : { completedSessions: [], rows: [] }, [classItem, data.sessions, data.students, selectedAttendanceMonth]);
  const attendanceMonthIsLatestCompleted = selectedAttendanceMonth === initialAttendanceMonth && initialAttendanceMonth !== getSeoulToday().slice(0, 7);
  const prioritySession = priorityWork && (priorityWork.session.status === 'scheduled' || priorityWork.workState.attention.attendanceMissing) ? priorityWork.session : null;
  const heroSession = prioritySession ?? nextSession;
  const heroWorkState = prioritySession ? priorityWork?.workState : null;

  useEffect(() => {
    if (!nextSession) { setCaptures([]); return; }
    void fetchSessionCaptures(`class=${encodeURIComponent(classId)}&limit=8`).then((result) => {
      if (result.status === 'loaded') setCaptures(result.data);
    });
  }, [classId, nextSession]);

  if (data.status === 'loading' || data.status === 'idle') return <main className="p-6 text-sm font-bold text-slate-500">수업반을 불러오는 중입니다.</main>;
  if (data.status === 'error') return <main className="grid h-full place-items-center bg-[var(--spm-bg)] p-6"><div className="text-center"><p className="text-lg font-black text-rose-700">수업반을 불러오지 못했습니다.</p><button type="button" onClick={() => void data.reload()} className="mt-4 min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-black text-white">다시 시도</button></div></main>;
  if (!classItem) return <main className="grid h-full place-items-center bg-[var(--spm-bg)] p-6"><div className="text-center"><p className="text-lg font-black text-slate-800">수업반을 찾을 수 없습니다.</p><Link href="/spokedu-master/classes" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-black text-white">수업반 목록으로</Link></div></main>;

  const removeFromClass = async (student: MasterStudentDto) => {
    setSaving(true); setError(null);
    try { await data.removeClassStudent(classItem.id, student.id); setPendingRemove(null); }
    catch { setError('학생을 반에서 제외하지 못했습니다.'); }
    finally { setSaving(false); }
  };
  const updateName = async () => {
    if (!editName.trim() || saving) return;
    setSaving(true); setError(null);
    try { await data.updateClass(classItem.id, editName.trim()); setEditOpen(false); }
    catch { setError('수업반 이름을 수정하지 못했습니다.'); }
    finally { setSaving(false); }
  };

  const createSessionHref = `/spokedu-master/activity?date=${getSeoulToday()}&create=1&class=${encodeURIComponent(classItem.id)}`;

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
      <header>
        <Link href="/spokedu-master/classes" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-500"><ChevronLeft size={16} />수업반</Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0"><h1 className="truncate text-2xl font-bold text-slate-900" title={classItem.name}>{classItem.name}</h1><p className="mt-2 text-sm font-normal text-slate-500">학생 {classItem.studentIds.length}명</p></div>
          <button type="button" aria-label="수업반 이름 수정" title="수업반 이름 수정" onClick={() => { setEditName(classItem.name); setEditOpen(true); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white"><Pencil size={17} /></button>
        </div>
        <div className="mt-4"><LessonManagementTabs /></div>
      </header>
      <div className="mt-5"><SessionSummary session={heroSession} workState={heroWorkState} emptyHref={createSessionHref} nextSessionNote={heroSession?.id === nextSession?.id ? nextSessionMemory?.capture?.applicationIdea?.trim() : null} /></div>

      {incompleteSessions.length ? <section className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
        <div><p className="text-sm font-black text-amber-900">출석 미기록 {incompleteSessions.length}건</p>{incompleteSessions.length === 1 ? <p className="mt-1 text-xs font-semibold text-amber-700">{formatSeoulSessionDay(getSeoulSessionDay(incompleteSessions[0]!.startAt), { month: 'long', day: 'numeric' })} {formatSeoulSessionTime(incompleteSessions[0]!.startAt)}</p> : null}</div>
        {incompleteSessions.length === 1 ? <Link href={`/spokedu-master/activity?session=${encodeURIComponent(incompleteSessions[0]!.id)}`} className="flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-black text-amber-800">출석 기록하기</Link> : <button type="button" onClick={() => setIncompleteOpen(true)} className="min-h-11 rounded-xl bg-white px-4 text-sm font-black text-amber-800">미기록 수업 선택</button>}
      </section> : null}

      {!roster.length ? <section className="mt-6 border-t border-slate-200 pt-5">
        <Users className="text-slate-400" size={24} /><h2 className="mt-3 text-lg font-semibold text-slate-900">아직 등록된 학생이 없습니다.</h2><p className="mt-1 text-sm font-normal leading-6 text-slate-500">학생을 추가하면 수업 출석 명단으로 자동 연결됩니다.</p>
        <button type="button" onClick={() => setAddOpen(true)} className={`mt-4 ${SPM_PRIMARY_BTN_FULL}`}><Plus size={16} />{MASTER_ACTION_COPY.addStudent}</button>
      </section> : null}

      {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
      <div className="mt-8 flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">학생</p><h2 className="mt-1 text-lg font-semibold text-slate-900">함께하는 학생 {roster.length}명</h2></div>{roster.length ? <button type="button" onClick={() => setAddOpen(true)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600"><Plus size={15} className="mr-1 inline" />학생 추가</button> : null}</div>
      <div className="mt-3 flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="수업반 정보"><button type="button" role="tab" aria-selected={tab === 'roster'} onClick={() => setTab('roster')} className={`min-h-11 flex-1 rounded-lg text-sm font-bold ${tab === 'roster' ? 'bg-white text-slate-900' : 'text-slate-500'}`}>학생 명단</button><button type="button" role="tab" aria-selected={tab === 'attendance'} onClick={() => setTab('attendance')} className={`min-h-11 flex-1 rounded-lg text-sm font-bold ${tab === 'attendance' ? 'bg-white text-slate-900' : 'text-slate-500'}`}>지난 출석</button></div>

      {tab === 'roster' ? <section className="mt-4">
        {roster.length ? <div className="mt-3 divide-y divide-slate-200 overflow-visible border-y border-slate-200">{roster.map((student) => <article key={student.id} className="flex min-h-16 items-center gap-3 py-2">
          <Link href={`/spokedu-master/students/${student.id}`} className="min-w-0 flex-1 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"><strong className="block truncate text-sm text-slate-900">{student.name}</strong><small className="mt-1 block truncate font-semibold text-slate-500">{studentMetaToDisplay(student.meta) || '학년·연령 미입력'}{student.guidanceNote ? ' · 지도 참고 있음' : ''}</small></Link>
          <Link href={`/spokedu-master/students/${student.id}`} className="hidden min-h-11 items-center px-3 text-xs font-black text-slate-600 sm:flex">{MASTER_ACTION_COPY.history}</Link>
          <details className="relative"><summary aria-label={`${student.name} 학생 메뉴`} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><MoreHorizontal size={20} /></summary><div className="absolute right-0 z-30 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" disabled={saving} onClick={() => setPendingRemove(student)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-black text-rose-600 disabled:opacity-40"><UserMinus size={14} />{MASTER_ACTION_COPY.removeFromClass}</button></div></details>
        </article>)}</div> : null}
      </section> : null}

      {tab === 'attendance' ? <section className="mt-4">
        <div className="flex items-center justify-between gap-3"><button type="button" aria-label="이전 달" onClick={() => setAttendanceMonth(shiftAttendanceMonth(selectedAttendanceMonth, -1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-white"><ChevronLeft size={19} /></button><div className="text-center"><h2 className="text-lg font-black text-slate-900">{selectedAttendanceMonth.slice(0, 4)}년 {Number(selectedAttendanceMonth.slice(5))}월 출석</h2>{attendanceMonthIsLatestCompleted ? <p className="mt-1 text-[11px] font-bold text-slate-400">최근 완료 수업이 있는 달입니다</p> : null}</div><button type="button" aria-label="다음 달" onClick={() => setAttendanceMonth(shiftAttendanceMonth(selectedAttendanceMonth, 1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-white"><ChevronRight size={19} /></button></div>
        {attendanceView.completedSessions.length ? <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-max border-separate border-spacing-0 text-sm"><thead><tr><th className="sticky left-0 z-20 min-w-32 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left font-black text-slate-700">학생</th>{attendanceView.completedSessions.map((session) => <th key={session.id} className="min-w-24 border-b border-slate-200 bg-slate-50 px-3 py-2 text-center"><Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="block min-h-11 font-black text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })}<small className="block text-[10px] font-bold text-slate-400">{formatSeoulSessionTime(session.startAt)}</small>{!session.attendance.length ? <small className="block text-[9px] font-bold text-amber-600">미기록</small> : null}</Link></th>)}</tr></thead><tbody>{attendanceView.rows.map((row) => <tr key={row.studentId}><th className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-3 text-left">{row.current ? <Link href={`/spokedu-master/students/${row.studentId}`} className="block max-w-28 truncate font-black text-slate-800" title={row.studentName}>{row.studentName}</Link> : <><span className="block max-w-28 truncate font-black text-slate-800" title={row.studentName}>{row.studentName}</span><small className="text-[10px] font-bold text-slate-400">과거 참여</small></>}</th>{attendanceView.completedSessions.map((session) => { const status = row.attendanceBySessionId[session.id]; return <td key={session.id} className="border-b border-slate-100 px-3 py-3 text-center font-black"><span className={status === 'present' ? 'text-emerald-700' : status === 'absent' ? 'text-rose-600' : 'text-slate-300'}>{status === 'present' ? '✓ 출석' : status === 'absent' ? '결석' : '—'}</span></td>; })}</tr>)}</tbody></table></div> : <p className="mt-4 text-center text-sm font-medium text-slate-400">이 달에 완료된 수업이 없습니다.</p>}
      </section> : null}

      {recentSessions.length ? <section className="mt-7"><div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-800">지난 수업</h2><Link href="/spokedu-master/activity" className="flex min-h-11 items-center text-xs font-bold text-slate-500">전체 일정</Link></div><div className="divide-y divide-slate-100 rounded-2xl bg-white px-4">{recentSessions.map((session) => <Link key={session.id} href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="flex min-h-16 items-center gap-3 py-2"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800">{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'long', day: 'numeric' })} {formatSeoulSessionTime(session.startAt)}</p><p className="mt-1 text-xs font-medium text-slate-500">완료 활동 {session.programs.filter((item) => item.isCompleted).length}개 · {session.attendance.length ? `출석 ${session.attendance.length}명` : '출석 미기록'}</p></div><ChevronRight size={17} className="text-slate-400" /></Link>)}</div></section> : <p className="mt-7 text-sm font-medium text-slate-400">아직 지난 수업이 없습니다.</p>}
      <ClassMemoryPanel classId={classId} />
      <RegularSchedulePanel classId={classItem.id} sessions={data.sessions} onCreated={() => data.reload('soft')} />
    </div>

    {addOpen ? <ClassRosterSheet classId={classItem.id} className={classItem.name} onClose={() => setAddOpen(false)} /> : null}
    {incompleteOpen ? <BottomSheet open title={`출석 미기록 ${incompleteSessions.length}건`} onClose={() => setIncompleteOpen(false)}><div className="space-y-2 pb-3">{incompleteSessions.map((session) => <div key={session.id} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-800">{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'long', day: 'numeric' })}</p><p className="text-xs font-semibold text-slate-500">{formatSeoulSessionTime(session.startAt)}</p></div><Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="flex min-h-11 items-center rounded-xl bg-amber-100 px-4 text-xs font-black text-amber-900">기록</Link></div>)}</div></BottomSheet> : null}
    {editOpen ? <BottomSheet open title="수업반 이름 수정" onClose={() => setEditOpen(false)}><div className="space-y-4 pb-3"><input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" />{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}<button type="button" disabled={!editName.trim() || saving} onClick={() => void updateName()} className={SPM_PRIMARY_BTN_FULL}>이름 저장</button></div></BottomSheet> : null}
    {pendingRemove ? <BottomSheet open title={MASTER_ACTION_COPY.removeFromClass} onClose={() => setPendingRemove(null)}><div className="space-y-4 pb-3"><p className="text-sm font-semibold leading-6 text-slate-600"><strong className="text-slate-900">{pendingRemove.name}</strong> 학생을 <strong className="text-slate-900">{classItem.name}</strong> 명단에서 제외합니다. 학생과 과거 출석 및 수업 이력은 유지됩니다.</p>{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}<button type="button" disabled={saving} onClick={() => void removeFromClass(pendingRemove)} className={SPM_DESTRUCTIVE_BTN}>{saving ? '제외 중…' : MASTER_ACTION_COPY.removeFromClass}</button><button type="button" disabled={saving} onClick={() => setPendingRemove(null)} className="min-h-11 w-full text-sm font-black text-slate-600">돌아가기</button></div></BottomSheet> : null}
  </main>;
}
