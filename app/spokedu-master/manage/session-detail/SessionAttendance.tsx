import { ChevronDown } from 'lucide-react';

export function SessionAttendance({ attendance, attendanceOpen, roster, allStudentsPresent, setAttendanceOpen, toggleAllAttendance, updateAttendance }: {
  attendance: Record<string, 'present' | 'absent'>;
  attendanceOpen: boolean;
  roster: Array<{ id: string; name: string }>;
  allStudentsPresent: boolean;
  setAttendanceOpen: (open: boolean) => void;
  toggleAllAttendance: () => void;
  updateAttendance: (studentId: string, value: 'present' | 'absent') => void;
}) {
  const presentCount = roster.filter((student) => attendance[student.id] === 'present').length;

  return <section aria-labelledby="session-attendance-heading" className="mt-5 border-t border-slate-100 pt-4">
    <button type="button" onClick={() => setAttendanceOpen(!attendanceOpen)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left" aria-expanded={attendanceOpen}>
      <h3 id="session-attendance-heading" className="text-[18px] font-semibold text-slate-950">출석</h3>
      <span className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-slate-600">{presentCount} / {roster.length}</span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${attendanceOpen ? 'rotate-180' : ''}`} />
      </span>
    </button>
    {attendanceOpen ? <div className="mt-1">
      <div className="flex justify-end">
        <button type="button" onClick={toggleAllAttendance} disabled={!roster.length} aria-pressed={allStudentsPresent} className="h-8 rounded-[9px] px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">{allStudentsPresent ? '전체 해제' : '전체 출석'}</button>
      </div>
      <div className="divide-y divide-slate-100">
        {roster.map((student) => <div key={student.id} data-attendance-row className="flex h-10 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-800">{student.name}</span>
          <span className="inline-flex shrink-0 rounded-[9px] bg-slate-100 p-0.5">{(['present', 'absent'] as const).map((value) => {
            const selected = attendance[student.id] === value;
            const label = value === 'present' ? '출석' : '결석';
            return <button key={value} type="button" onClick={() => updateAttendance(student.id, value)} aria-pressed={selected} className={`inline-flex h-8 min-w-[54px] items-center justify-center rounded-[7px] px-2 text-xs font-semibold transition-colors ${selected ? value === 'present' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>;
          })}</span>
        </div>)}
      </div>
      {!roster.length ? <p className="py-4 text-sm text-slate-500">등록된 학생이 없습니다.</p> : null}
    </div> : null}
  </section>;
}
