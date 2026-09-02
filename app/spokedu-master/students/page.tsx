'use client';

import { ChevronRight, MoreHorizontal, Pencil, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { MasterStatePanel } from '../components/ui/MasterStatePanel';
import { MasterCollectionRow, MasterPageHeader, MasterPageShell, MasterSection } from '../components/ui/MasterPrimitives';
import { StudentFieldSelect } from '../components/ui/StudentFieldSelect';
import { SPM_DESTRUCTIVE_BTN, SPM_PRIMARY_BTN, SPM_PRIMARY_BTN_FULL, SPM_SECONDARY_BTN, MASTER_ACTION_COPY } from '../lib/masterActionGrammar';
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
  if (!data.classes.length) return <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">수업 관리에서 수업반을 먼저 만들어 주세요.</p>;
  return <fieldset><legend className="mb-2 text-xs font-bold text-slate-500">수업반 <span className="font-semibold">(여러 개 선택 가능)</span></legend><div className="grid gap-2 sm:grid-cols-2">{data.classes.map((item) => <label key={item.id} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${value.includes(item.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}><input type="checkbox" checked={value.includes(item.id)} onChange={() => onChange(value.includes(item.id) ? value.filter((id) => id !== item.id) : [...value, item.id])} />{item.name}</label>)}</div></fieldset>;
}

export default function StudentsPage() {
  const data = useOperationalData();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<MasterStudentDto | null>(null);
  const [draft, setDraft] = useState<StudentDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<MasterStudentDto | null>(null);
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

  const saveNew = async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true); setError(null);
    try {
      await data.createStudent({ legacyId: crypto.randomUUID(), name: draft.name.trim(), meta: draft.meta, guidanceNote: draft.guidanceNote.trim() || null, classIds: draft.classIds });
      setDraft(EMPTY_DRAFT); setAddOpen(false);
    } catch { setError('학생을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editing || !draft.name.trim() || saving) return;
    setSaving(true); setError(null);
    try {
      await data.updateStudent(editing.id, { name: draft.name.trim(), meta: draft.meta, guidanceNote: draft.guidanceNote.trim() || null, classIds: draft.classIds });
      setEditing(null); setDraft(EMPTY_DRAFT);
    } catch { setError('학생 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  };

  const removeStudent = async (student: MasterStudentDto) => {
    setDeletingId(student.id); setError(null);
    try { await data.deleteStudent(student.id); setPendingArchive(null); }
    catch { setError('학생을 명단에서 보관 처리하지 못했습니다.'); }
    finally { setDeletingId(null); }
  };

  const form = (submit: () => Promise<void>) => <div className="space-y-4">
    <label className="block"><span className="mb-2 block text-xs font-bold text-slate-500">이름 *</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" /></label>
    <StudentFieldSelect label="학년·연령" value={draft.meta} onChange={(meta) => setDraft((current) => ({ ...current, meta }))} options={ageOptions} />
    <MembershipPicker value={draft.classIds} onChange={(classIds) => setDraft((current) => ({ ...current, classIds }))} />
    <label className="block"><span className="mb-2 block text-xs font-bold text-slate-500">반복 지도 참고 <span className="font-semibold">(선택)</span></span><textarea value={draft.guidanceNote} onChange={(event) => setDraft((current) => ({ ...current, guidanceNote: event.target.value }))} className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none" placeholder="다음 수업에서도 참고할 지도 방식" /></label>
    {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
    <button type="button" onClick={() => void submit()} disabled={!draft.name.trim() || saving} className={SPM_PRIMARY_BTN_FULL}>{saving ? '저장 중…' : '저장'}</button>
  </div>;

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8"><MasterPageShell variant="operational">
    <MasterPageHeader title="학생" description="학생을 수업반에 등록하면 수업의 출석 명단으로 자동 연결됩니다." action={<button type="button" onClick={() => { setDraft(EMPTY_DRAFT); setError(null); setAddOpen(true); }} className={SPM_PRIMARY_BTN}><Plus size={16} />{MASTER_ACTION_COPY.addStudent}</button>} />
    {data.status === 'loading' || data.status === 'idle' ? <MasterStatePanel kind="loading" title="학생 명단을 불러오는 중입니다." className="mt-5" /> : null}
    {data.status === 'error' ? <MasterStatePanel kind="error" title="학생 명단을 불러오지 못했습니다." description="현재 화면을 유지한 채 다시 불러올 수 있습니다." action={<button type="button" onClick={() => void data.reload()} className={SPM_SECONDARY_BTN}>다시 시도</button>} className="mt-5" /> : null}
    {error && !addOpen && !editing ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
    <MasterSection title="학생 명단" className="mt-7"><div className="border-y border-slate-200 bg-white">{data.students.map((student) => <MasterCollectionRow key={student.id} className="relative"><Link href={`/spokedu-master/students/${student.id}`} className="flex min-w-0 flex-1 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{student.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-[16px] font-semibold text-slate-950">{student.name}</strong><small className="mt-1 block truncate text-[12px] font-medium text-slate-500">{[classNames(student.id).join(', '), studentMetaToDisplay(student.meta), `수업 ${sessionCount(student.id)}건`].filter(Boolean).join(' · ')}</small></span><ChevronRight size={16} className="text-slate-400" /></Link><button type="button" onClick={() => openEdit(student)} aria-label={`${student.name} 정보 수정`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button><details className="relative"><summary aria-label={`${student.name} 학생 메뉴`} className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full text-slate-500 hover:bg-slate-100"><MoreHorizontal size={18} /></summary><div className="absolute right-0 z-30 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" onClick={() => setPendingArchive(student)} disabled={deletingId === student.id} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-xs font-semibold text-rose-600 disabled:opacity-40">{MASTER_ACTION_COPY.archiveStudent}</button></div></details></MasterCollectionRow>)}</div></MasterSection>
    {data.status === 'ready' && !data.students.length ? <MasterStatePanel kind="empty" title="아직 등록된 학생이 없습니다." description="상단의 학생 추가에서 첫 학생을 등록할 수 있습니다." icon={<Users size={24} />} className="mt-5" /> : null}
  </MasterPageShell>
  {addOpen ? <BottomSheet open title="학생 추가" onClose={() => setAddOpen(false)}>{form(saveNew)}</BottomSheet> : null}
  {editing ? <BottomSheet open title="학생 정보 수정" onClose={() => setEditing(null)}>{form(saveEdit)}</BottomSheet> : null}
  {pendingArchive ? <BottomSheet open title={MASTER_ACTION_COPY.archiveStudent} onClose={() => setPendingArchive(null)}><div className="space-y-4 pb-3"><p className="text-sm font-medium leading-6 text-slate-600"><strong className="font-semibold text-slate-900">{pendingArchive.name}</strong> 학생을 현재 명단에서 숨깁니다. 과거 수업과 출석 이력은 그대로 보존됩니다.</p>{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p> : null}<button type="button" disabled={Boolean(deletingId)} onClick={() => void removeStudent(pendingArchive)} className={SPM_DESTRUCTIVE_BTN}>{deletingId ? '보관 중…' : MASTER_ACTION_COPY.archiveStudent}</button><button type="button" disabled={Boolean(deletingId)} onClick={() => setPendingArchive(null)} className="min-h-11 w-full text-sm font-semibold text-slate-600">돌아가기</button></div></BottomSheet> : null}
  </main>;
}
