'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { MasterPageShell } from '../../components/ui/MasterPrimitives';
import { SPM_PRIMARY_BTN_FULL, SPM_SECONDARY_BTN } from '../../lib/masterActionGrammar';
import { getSeoulToday } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { buildClassAttendanceView, resolveInitialAttendanceMonth, shiftAttendanceMonth } from '../classManagementModel';
import { ClassRosterSheet } from './ClassRosterSheet';
import { AttendanceProjectionTable } from '../../manage/AttendanceProjectionTable';

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const data = useOperationalData();
  const [rosterOpen, setRosterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [attendanceMonth, setAttendanceMonth] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const classItem = data.classes.find((item) => item.id === classId) ?? null;
  const initialAttendanceMonth = useMemo(() => resolveInitialAttendanceMonth(data.sessions, classId, getSeoulToday()), [classId, data.sessions]);
  const selectedAttendanceMonth = attendanceMonth ?? initialAttendanceMonth;
  const attendanceView = useMemo(() => classItem ? buildClassAttendanceView(classItem, data.sessions, data.students, selectedAttendanceMonth) : { sessions: [], rows: [] }, [classItem, data.sessions, data.students, selectedAttendanceMonth]);

  if (data.status === 'loading' || data.status === 'idle') return <main className="h-full bg-[var(--spm-bg)]"><MasterPageShell><p role="status" className="text-sm font-medium text-slate-500">수업반을 불러오는 중입니다.</p></MasterPageShell></main>;
  if (data.status === 'error') return <main className="h-full bg-[var(--spm-bg)]"><MasterPageShell><p role="alert" className="text-sm font-medium text-rose-700">수업반을 불러오지 못했습니다. <button type="button" onClick={() => void data.reload()} className="underline underline-offset-4">다시 시도</button></p></MasterPageShell></main>;
  if (!classItem) return <main className="h-full bg-[var(--spm-bg)]"><MasterPageShell><p className="text-sm font-medium text-slate-700">수업반을 찾을 수 없습니다.</p><Link href="/spokedu-master/classes" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700">수업반 목록으로</Link></MasterPageShell></main>;

  const updateName = async () => {
    if (!editName.trim() || saving) return;
    setSaving(true); setError(null);
    try { await data.updateClass(classItem.id, editName.trim()); setEditOpen(false); }
    catch { setError('수업반 이름을 수정하지 못했습니다.'); }
    finally { setSaving(false); }
  };

  const createSessionHref = `/spokedu-master/activity?date=${getSeoulToday()}&create=1&class=${encodeURIComponent(classItem.id)}`;
  const monthLabel = `${Number(selectedAttendanceMonth.slice(5, 7))}월`;

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <MasterPageShell variant="operational">
      <Link href="/spokedu-master/classes" className="mb-5 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-500"><ChevronLeft size={16} />수업반</Link>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold leading-tight text-slate-950 sm:text-[26px]">{classItem.name}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">학생 {classItem.studentIds.length}명</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setRosterOpen(true)} className={SPM_SECONDARY_BTN}>학생 관리</button>
          <details className="relative">
            <summary aria-label="수업반 설정" className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl text-slate-500 hover:bg-white"><MoreHorizontal size={20} /></summary>
            <div className="absolute right-0 z-30 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <button type="button" onClick={() => { setEditName(classItem.name); setEditOpen(true); }} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-slate-700">이름 수정</button>
            </div>
          </details>
        </div>
      </header>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p> : null}

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">출석부</h2>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="이전 달" onClick={() => setAttendanceMonth(shiftAttendanceMonth(selectedAttendanceMonth, -1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-white"><ChevronLeft size={18} /></button>
            <p className="min-w-[7.5rem] text-center text-sm font-semibold text-slate-800">{selectedAttendanceMonth.slice(0, 4)}년 {Number(selectedAttendanceMonth.slice(5, 7))}월</p>
            <button type="button" aria-label="다음 달" onClick={() => setAttendanceMonth(shiftAttendanceMonth(selectedAttendanceMonth, 1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-white"><ChevronRight size={18} /></button>
          </div>
        </div>
        <AttendanceProjectionTable
          sessions={attendanceView.sessions}
          rows={attendanceView.rows}
          emptyMonthLabel={monthLabel}
          emptyAction={<Link href={createSessionHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 hover:text-slate-950">수업 추가</Link>}
        />
      </section>
    </MasterPageShell>

    {rosterOpen ? <ClassRosterSheet classId={classItem.id} className={classItem.name} onClose={() => setRosterOpen(false)} /> : null}
    {editOpen ? <BottomSheet open title="수업반 이름 수정" onClose={() => setEditOpen(false)}><div className="space-y-4 pb-3"><input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium" />{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p> : null}<button type="button" disabled={!editName.trim() || saving} onClick={() => void updateName()} className={SPM_PRIMARY_BTN_FULL}>이름 저장</button></div></BottomSheet> : null}
  </main>;
}
