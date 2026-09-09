'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { buildClassAttendanceView, resolveInitialAttendanceMonth, shiftAttendanceMonth } from '../classes/classManagementModel';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { getSeoulToday } from '../lib/sessionDateTime';
import { AttendanceProjectionTable } from './AttendanceProjectionTable';

export function AttendanceTab({ onShowSchedule }: { onShowSchedule: () => void }) {
  const data = useOperationalData();
  const [classId, setClassId] = useState(() => data.classes[0]?.id ?? '');
  const selectedClass = data.classes.find((item) => item.id === classId) ?? data.classes[0] ?? null;
  const [month, setMonth] = useState(() => selectedClass ? resolveInitialAttendanceMonth(data.sessions, selectedClass.id, getSeoulToday()) : getSeoulToday().slice(0, 7));

  useEffect(() => {
    if (!classId && data.classes[0]) setClassId(data.classes[0].id);
  }, [classId, data.classes]);

  useEffect(() => {
    if (selectedClass) setMonth(resolveInitialAttendanceMonth(data.sessions, selectedClass.id, getSeoulToday()));
  }, [selectedClass?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const view = useMemo(
    () => selectedClass ? buildClassAttendanceView(selectedClass, data.sessions, data.students, month) : { completedSessions: [], rows: [] },
    [data.sessions, data.students, month, selectedClass],
  );

  if (!selectedClass) return <p className="py-10 text-center text-sm text-slate-500">출석부를 보려면 먼저 수업반을 만들어 주세요.</p>;

  return (
    <section aria-labelledby="manage-attendance-heading" className="mt-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="text-xs font-semibold text-slate-500">수업반
          <select value={selectedClass.id} onChange={(event) => setClassId(event.target.value)} className="mt-1 block h-11 min-w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
            {data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth((current) => shiftAttendanceMonth(current, -1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="이전 달"><ChevronLeft size={18} /></button>
          <h2 id="manage-attendance-heading" className="min-w-28 text-center text-base font-semibold text-slate-900">{Number(month.slice(0, 4))}년 {Number(month.slice(5, 7))}월</h2>
          <button type="button" onClick={() => setMonth((current) => shiftAttendanceMonth(current, 1))} className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="다음 달"><ChevronRight size={18} /></button>
        </div>
      </div>
      <AttendanceProjectionTable sessions={view.completedSessions} rows={view.rows} emptyMonthLabel={`${Number(month.slice(5, 7))}월`} emptyAction={<button type="button" onClick={onShowSchedule} className="mt-4 min-h-11 px-2 text-sm font-semibold text-slate-700 hover:text-slate-950">일정 보기</button>} />
    </section>
  );
}
