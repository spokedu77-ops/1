'use client';

import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, UserMinus, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LessonManagementTabs } from '../../components/lesson/LessonManagementTabs';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { StudentFieldSelect } from '../../components/ui/StudentFieldSelect';
import { studentMetaToDisplay } from '../../lib/operationalDataAdapter';
import { buildStudentAgeOptions } from '../../lib/studentAddPresets';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay, getSeoulToday } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { MasterStudentDto } from '../../types/operational';
import { buildClassAttendanceView, selectLatestCompletedClassSession, selectNextClassSession } from '../classManagementModel';

type DetailTab = 'roster' | 'attendance';

function SessionSummary({ label, session, empty, emptyHref }: { label: string; session: ReturnType<typeof selectNextClassSession>; empty: string; emptyHref?: string }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-black text-slate-500">{label}</p>
    {session ? <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-900">{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'long', day: 'numeric', weekday: 'short' })} {formatSeoulSessionTime(session.startAt)}</p><p className="mt-1 text-xs font-semibold text-slate-500">활동 {session.status === 'completed' ? session.programs.filter((item) => item.isCompleted).length : session.programs.length}개{session.status === 'completed' ? ` · 출석 기록 ${session.attendance.length}명` : ''}</p></div><Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="flex min-h-11 items-center gap-1 rounded-xl bg-slate-900 px-4 text-sm font-black text-white">{session.status === 'completed' ? '수업 보기' : '수업 열기'}<ChevronRight size={14} /></Link></div> : <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-slate-400">{empty}</p>{emptyHref ? <Link href={emptyHref} className="flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700">수업 추가</Link> : null}</div>}
  </section>;
}

function AddStudentSheet({ classId, className, onClose }: { classId: string; className: string; onClose: () => void }) {
  const data = useOperationalData();
  const [query, setQuery] = useState('');
  const [newMode, setNewMode] = useState(false);
  const [name, setName] = useState('');
  const [meta, setMeta] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const classItem = data.classes.find((item) => item.id === classId);
  const ageOptions = buildStudentAgeOptions(data.students.map((student) => studentMetaToDisplay(student.meta)));
  const results = query.trim() ? data.students.filter((student) => !classItem?.studentIds.includes(student.id) && student.name.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko'))).slice(0, 8) : [];

  const addExisting = async (student: MasterStudentDto) => {
    setSavingId(student.id); setError(null);
    try { await data.addClassStudent(classId, student.id); }
    catch { setError('학생을 명단에 추가하지 못했습니다.'); }
    finally { setSavingId(null); }
  };
  const createStudent = async () => {
    if (!name.trim() || savingId) return;
    setSavingId('new'); setError(null);
    try {
      await data.createStudent({ legacyId: crypto.randomUUID(), name: name.trim(), meta, guidanceNote: null, classIds: [classId] });
      onClose();
    } catch { setError('학생을 등록하지 못했습니다.'); }
    finally { setSavingId(null); }
  };

  return <BottomSheet open title={`학생 추가 · ${className}`} onClose={onClose}><div className="space-y-4 pb-3">
    {!newMode ? <><div><label className="block text-xs font-black text-slate-600">기존 학생 검색<input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 검색" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" /></label><p className="mt-2 text-xs font-semibold text-slate-500">이미 등록된 학생이 있다면 이름으로 검색해 주세요.</p></div>
      {query.trim() ? <div className="space-y-2">{results.map((student) => <div key={student.id} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-800">{student.name}</p><p className="text-xs font-semibold text-slate-500">{studentMetaToDisplay(student.meta) || '학년·연령 미입력'}</p></div><button type="button" disabled={Boolean(savingId)} onClick={() => void addExisting(student)} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white disabled:opacity-40">추가</button></div>)}{!results.length ? <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">검색 결과가 없습니다.</p> : null}</div> : null}
      <button type="button" onClick={() => setNewMode(true)} className="min-h-11 w-full rounded-xl border border-slate-200 text-sm font-black text-slate-700">+ 새 학생 등록</button></> : <><label className="block text-xs font-black text-slate-600">이름 *<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" /></label><StudentFieldSelect label="학년·연령" value={meta} onChange={setMeta} options={ageOptions} /><button type="button" disabled={!name.trim() || Boolean(savingId)} onClick={() => void createStudent()} className="min-h-11 w-full rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40">등록하고 명단에 추가</button><button type="button" onClick={() => setNewMode(false)} className="min-h-11 w-full text-sm font-black text-slate-500">기존 학생 검색으로 돌아가기</button></>}
    {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
  </div></BottomSheet>;
}

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const data = useOperationalData();
  const [tab, setTab] = useState<DetailTab>('roster');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const classItem = data.classes.find((item) => item.id === classId) ?? null;
  const roster = useMemo(() => classItem ? data.students.filter((student) => classItem.studentIds.includes(student.id)) : [], [classItem, data.students]);
  const nextSession = useMemo(() => selectNextClassSession(data.sessions, classId, new Date()), [classId, data.sessions]);
  const recentSession = useMemo(() => selectLatestCompletedClassSession(data.sessions, classId), [classId, data.sessions]);
  const completedCount = data.sessions.filter((session) => session.classId === classId && session.status === 'completed').length;
  const attendanceView = useMemo(() => classItem ? buildClassAttendanceView(classItem, data.sessions, data.students) : { completedSessions: [], rows: [] }, [classItem, data.sessions, data.students]);

  if (data.status === 'loading' || data.status === 'idle') return <main className="p-6 text-sm font-bold text-slate-500">수업반을 불러오는 중입니다.</main>;
  if (data.status === 'error') return <main className="grid h-full place-items-center bg-[var(--spm-bg)] p-6"><div className="text-center"><p className="text-lg font-black text-rose-700">수업반을 불러오지 못했습니다.</p><button type="button" onClick={() => void data.reload()} className="mt-4 min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-black text-white">다시 시도</button></div></main>;
  if (!classItem) return <main className="grid h-full place-items-center bg-[var(--spm-bg)] p-6"><div className="text-center"><p className="text-lg font-black text-slate-800">수업반을 찾을 수 없습니다.</p><Link href="/spokedu-master/classes" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-black text-white">수업반 목록으로</Link></div></main>;

  const removeFromClass = async (student: MasterStudentDto) => {
    if (!window.confirm(`${student.name} 학생을 '${classItem.name}' 명단에서 제외할까요?\n과거 출석 및 수업 이력은 유지됩니다.`)) return;
    setSaving(true); setError(null);
    try { await data.removeClassStudent(classItem.id, student.id); }
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

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8"><div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
    <header><Link href="/spokedu-master/classes" className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-slate-500"><ChevronLeft size={16} />수업반</Link><div className="mt-2 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h1 className="truncate text-2xl font-black text-slate-900" title={classItem.name}>{classItem.name}</h1><p className="mt-2 text-sm font-bold text-slate-500">학생 {classItem.studentIds.length}명 · 완료 수업 {completedCount}회</p></div><button type="button" onClick={() => { setEditName(classItem.name); setEditOpen(true); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"><Pencil size={15} />이름 수정</button></div><div className="mt-4"><LessonManagementTabs /></div></header>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><SessionSummary label="다음 수업" session={nextSession} empty="다음 예정 수업이 없습니다." emptyHref={`/spokedu-master/activity?date=${getSeoulToday()}&create=1&class=${encodeURIComponent(classItem.id)}`} /><SessionSummary label="최근 수업" session={recentSession} empty="아직 완료된 수업이 없습니다." /></div>
    {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
    <div className="mt-5 flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="수업반 정보"><button type="button" role="tab" aria-selected={tab === 'roster'} onClick={() => setTab('roster')} className={`min-h-11 flex-1 rounded-lg text-sm font-black ${tab === 'roster' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>명단</button><button type="button" role="tab" aria-selected={tab === 'attendance'} onClick={() => setTab('attendance')} className={`min-h-11 flex-1 rounded-lg text-sm font-black ${tab === 'attendance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>출석부</button></div>
    {tab === 'roster' ? <section className="mt-4"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-900">명단 <span className="text-sm text-slate-400">학생 {roster.length}명</span></h2><button type="button" onClick={() => setAddOpen(true)} className="flex min-h-11 items-center gap-1 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white"><Plus size={15} />학생 추가</button></div><div className="mt-3 space-y-2">{roster.map((student) => <article key={student.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-900 font-black text-white">{student.name.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{student.name}</p><p className="mt-1 truncate text-xs font-semibold text-slate-500">{studentMetaToDisplay(student.meta) || '학년·연령 미입력'}{student.guidanceNote ? ' · 지도 참고 있음' : ''}</p></div><Link href={`/spokedu-master/students/${student.id}`} className="flex min-h-11 items-center rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700">이력 보기</Link><button type="button" disabled={saving} onClick={() => void removeFromClass(student)} className="flex min-h-11 items-center gap-1 rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-600 disabled:opacity-40"><UserMinus size={14} />반에서 제외</button></article>)}{!roster.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Users className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-500">이 수업반에 등록된 학생이 없습니다.</p></div> : null}</div></section> : null}
    {tab === 'attendance' ? <section className="mt-4"><h2 className="text-lg font-black text-slate-900">출석부</h2>{attendanceView.completedSessions.length ? <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-max border-separate border-spacing-0 text-sm"><thead><tr><th className="sticky left-0 z-20 min-w-36 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left font-black text-slate-700">학생</th>{attendanceView.completedSessions.map((session) => <th key={session.id} className="min-w-24 border-b border-slate-200 bg-slate-50 px-3 py-2 text-center"><Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="block min-h-11 font-black text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })}<small className="block text-[10px] font-bold text-slate-400">{formatSeoulSessionTime(session.startAt)}</small>{!session.attendance.length ? <small className="block text-[9px] font-bold text-amber-600">출석 미기록</small> : null}</Link></th>)}</tr></thead><tbody>{attendanceView.rows.map((row) => <tr key={row.studentId}><th className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-4 py-3 text-left"><span className="block max-w-32 truncate font-black text-slate-800" title={row.studentName}>{row.studentName}</span>{!row.current ? <small className="text-[10px] font-bold text-slate-400">과거 참여</small> : null}</th>{attendanceView.completedSessions.map((session) => { const status = row.attendanceBySessionId[session.id]; return <td key={session.id} className="border-b border-slate-100 px-3 py-3 text-center font-black"><span className={status === 'present' ? 'text-emerald-700' : status === 'absent' ? 'text-rose-600' : 'text-slate-300'}>{status === 'present' ? '✓ 출석' : status === 'absent' ? '결석' : '—'}</span></td>; })}</tr>)}</tbody></table></div> : <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><CalendarDays className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">아직 누적된 출석 기록이 없습니다.</p><p className="mt-2 text-xs font-semibold text-slate-500">수업을 완료하면 이곳에 출석 기록이 자동으로 쌓입니다.</p></div>}</section> : null}
  </div>
  {addOpen ? <AddStudentSheet classId={classItem.id} className={classItem.name} onClose={() => setAddOpen(false)} /> : null}
  {editOpen ? <BottomSheet open title="수업반 이름 수정" onClose={() => setEditOpen(false)}><div className="space-y-4 pb-3"><input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" />{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}<button type="button" disabled={!editName.trim() || saving} onClick={() => void updateName()} className="min-h-11 w-full rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40">이름 저장</button></div></BottomSheet> : null}
  </main>;
}
