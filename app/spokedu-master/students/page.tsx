'use client';

import { ChevronRight, Pencil, Plus, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { StudentFieldSelect } from '../components/ui/StudentFieldSelect';
import { buildStudentAgeOptions } from '../lib/studentAddPresets';
import { studentMetaToDisplay } from '../lib/operationalDataAdapter';
import { useOperationalData } from '../operational/OperationalDataProvider';
import type { MasterStudentDto } from '../types/operational';

type StudentDraft = {
  name: string;
  meta: string;
  guidanceNote: string;
  classIds: string[];
};

const EMPTY_DRAFT: StudentDraft = { name: '', meta: '', guidanceNote: '', classIds: [] };

function MembershipPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const data = useOperationalData();
  if (!data.classes.length) return <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">수업 캘린더에서 수업반을 먼저 만들어 주세요.</p>;
  return <fieldset><legend className="mb-2 text-xs font-bold text-slate-500">수업반 <span className="font-semibold">(여러 개 선택 가능)</span></legend><div className="grid gap-2 sm:grid-cols-2">{data.classes.map((item) => <label key={item.id} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${value.includes(item.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}><input type="checkbox" checked={value.includes(item.id)} onChange={() => onChange(value.includes(item.id) ? value.filter((id) => id !== item.id) : [...value, item.id])} />{item.name}</label>)}</div></fieldset>;
}

export default function StudentsPage() {
  const data = useOperationalData();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<MasterStudentDto | null>(null);
  const [draft, setDraft] = useState<StudentDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ageOptions = buildStudentAgeOptions(data.students.map((student) => studentMetaToDisplay(student.meta)));

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('add') !== '1') return;
    setDraft(EMPTY_DRAFT);
    setAddOpen(true);
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  const classNames = (studentId: string) => data.classes.filter((item) => item.studentIds.includes(studentId)).map((item) => item.name);
  const sessionCount = (studentId: string) => data.sessions.filter((session) => session.attendance.some((item) => item.studentId === studentId)).length;

  const openEdit = (student: MasterStudentDto) => {
    setEditing(student);
    setDraft({
      name: student.name,
      meta: studentMetaToDisplay(student.meta),
      guidanceNote: student.guidanceNote ?? '',
      classIds: data.classes.filter((item) => item.studentIds.includes(student.id)).map((item) => item.id),
    });
    setError(null);
  };

  const syncMemberships = async (studentId: string, nextClassIds: string[]) => {
    const previous = data.classes.filter((item) => item.studentIds.includes(studentId)).map((item) => item.id);
    for (const classId of previous.filter((id) => !nextClassIds.includes(id))) await data.removeClassStudent(classId, studentId);
    for (const classId of nextClassIds.filter((id) => !previous.includes(id))) await data.addClassStudent(classId, studentId);
  };

  const saveNew = async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true); setError(null);
    try {
      const student = await data.createStudent({ legacyId: crypto.randomUUID(), name: draft.name.trim(), group: null, meta: draft.meta, guidanceNote: draft.guidanceNote.trim() || null });
      await syncMemberships(student.id, draft.classIds);
      setDraft(EMPTY_DRAFT); setAddOpen(false);
    } catch { setError('학생을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editing || !draft.name.trim() || saving) return;
    setSaving(true); setError(null);
    try {
      await data.updateStudent(editing.id, { name: draft.name.trim(), group: editing.group, meta: draft.meta, guidanceNote: draft.guidanceNote.trim() || null });
      await syncMemberships(editing.id, draft.classIds);
      setEditing(null); setDraft(EMPTY_DRAFT);
    } catch { setError('학생 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  };

  const removeStudent = async (student: MasterStudentDto) => {
    if (!window.confirm(`${student.name} 학생을 현재 명단에서 삭제할까요?\n과거 수업 이력은 보존됩니다.`)) return;
    setDeletingId(student.id); setError(null);
    try { await data.deleteStudent(student.id); }
    catch { setError('학생을 삭제하지 못했습니다.'); }
    finally { setDeletingId(null); }
  };

  const form = (submit: () => Promise<void>) => <div className="space-y-4">
    <label className="block"><span className="mb-2 block text-xs font-bold text-slate-500">이름 *</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" /></label>
    <StudentFieldSelect label="학년·연령" value={draft.meta} onChange={(meta) => setDraft((current) => ({ ...current, meta }))} options={ageOptions} />
    <MembershipPicker value={draft.classIds} onChange={(classIds) => setDraft((current) => ({ ...current, classIds }))} />
    <label className="block"><span className="mb-2 block text-xs font-bold text-slate-500">반복 지도 참고 <span className="font-semibold">(선택)</span></span><textarea value={draft.guidanceNote} onChange={(event) => setDraft((current) => ({ ...current, guidanceNote: event.target.value }))} className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none" placeholder="다음 수업에서도 참고할 지도 방식" /></label>
    {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
    <button type="button" onClick={() => void submit()} disabled={!draft.name.trim() || saving} className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40">{saving ? '저장 중…' : '저장'}</button>
  </div>;

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8"><div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black text-emerald-700">명단 관리</p><h1 className="mt-1 text-2xl font-black text-slate-900">학생</h1><p className="mt-2 text-sm font-semibold text-slate-500">학생을 수업반에 등록하면 수업의 출석 명단으로 자동 연결됩니다.</p></div><button type="button" onClick={() => { setDraft(EMPTY_DRAFT); setError(null); setAddOpen(true); }} className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white"><Plus size={16} />학생 추가</button></header>
    {data.status === 'loading' || data.status === 'idle' ? <p className="mt-5 rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">학생 명단을 불러오는 중입니다.</p> : null}
    {data.status === 'error' ? <div className="mt-5 rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-700">학생 명단을 불러오지 못했습니다.<button type="button" onClick={() => void data.reload()} className="ml-2 underline">다시 시도</button></div> : null}
    {error && !addOpen && !editing ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
    <section className="mt-5 grid gap-3 sm:grid-cols-2">{data.students.map((student) => <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-900 font-black text-white">{student.name.slice(0, 1)}</span><div className="min-w-0 flex-1"><h2 className="truncate text-base font-black text-slate-900">{student.name}</h2><p className="mt-1 truncate text-xs font-semibold text-slate-500">{[classNames(student.id).join(', '), studentMetaToDisplay(student.meta)].filter(Boolean).join(' · ') || '수업반 미지정'}</p></div><span className="text-xs font-black text-slate-400">수업 {sessionCount(student.id)}건</span></div><div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2"><Link href={`/spokedu-master/students/${student.id}`} className="flex h-10 items-center justify-center gap-1 rounded-xl bg-blue-600 text-xs font-black text-white">이력 보기<ChevronRight size={14} /></Link><button type="button" onClick={() => openEdit(student)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600" aria-label={`${student.name} 수정`}><Pencil size={15} /></button><button type="button" onClick={() => void removeStudent(student)} disabled={deletingId === student.id} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-rose-500 disabled:opacity-40" aria-label={`${student.name} 삭제`}><Trash2 size={15} /></button></div></article>)}</section>
    {data.status === 'ready' && !data.students.length ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Users size={24} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">아직 등록된 학생이 없습니다.</p><p className="mt-2 text-xs font-semibold text-slate-500">학생을 추가하고 수업반을 선택해 주세요.</p></div> : null}
  </div>
  {addOpen ? <BottomSheet open title="학생 추가" onClose={() => setAddOpen(false)}>{form(saveNew)}</BottomSheet> : null}
  {editing ? <BottomSheet open title="학생 정보 수정" onClose={() => setEditing(null)}>{form(saveEdit)}</BottomSheet> : null}
  </main>;
}
