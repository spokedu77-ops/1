'use client';

import { ClipboardCopy, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { SPM_PRIMARY_BTN } from '../lib/masterActionGrammar';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import { resolveReportSession } from '../lib/sessionContext';

export default function ReportPage() {
  const data = useOperationalData();
  const searchParams = useSearchParams();
  const sessions = useMemo(() => [...data.sessions]
    .filter((session) => session.status === 'completed')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()), [data.sessions]);
  const requestedSessionId = searchParams.get('session');
  const [selectedId, setSelectedId] = useState('');
  const selected = resolveReportSession(sessions, requestedSessionId, selectedId);
  const invalidRequestedSession = Boolean(requestedSessionId) && data.status === 'ready' && !selected;
  const present = selected?.attendance.filter((item) => item.status === 'present').length ?? 0;
  const absent = selected?.attendance.filter((item) => item.status === 'absent').length ?? 0;
  const presentNames = selected?.attendance.filter((item) => item.status === 'present').map((item) => item.studentName) ?? [];
  const absentNames = selected?.attendance.filter((item) => item.status === 'absent').map((item) => item.studentName) ?? [];
  const completedPrograms = selected?.programs.filter((item) => item.isCompleted) ?? [];
  const report = selected ? [
    `${formatSeoulSessionDay(getSeoulSessionDay(selected.startAt), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} ${selected.className} 수업 안내`,
    completedPrograms.length ? `오늘은 ${completedPrograms.map((item) => item.programTitle ?? '이름 없는 활동').join(', ')} 활동을 진행했습니다.` : '오늘 수업은 활동 기록 없이 진행되었습니다.',
    `출석 ${present}명, 결석 ${absent}명입니다.`,
    presentNames.length ? `출석: ${presentNames.join(', ')}` : '',
    absentNames.length ? `결석: ${absentNames.join(', ')}` : '',
    selected.memo?.trim() ? `수업 메모: ${selected.memo.trim()}` : '',
  ].filter(Boolean).join('\n') : '';

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] p-5 pb-28 lg:p-8">
    <div className="mx-auto max-w-3xl">
      <header><h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><FileText size={22} />수업 안내문</h1><p className="mt-2 text-sm font-semibold text-slate-500">완료된 수업의 출석, 진행 프로그램, 수업 메모를 바탕으로 간단한 안내문을 확인합니다.</p></header>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!requestedSessionId ? <label className="text-xs font-black text-slate-600">완료된 수업
          <select value={selected?.id ?? ''} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold">
            {sessions.map((session) => <option key={session.id} value={session.id}>{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'long', day: 'numeric' })} {formatSeoulSessionTime(session.startAt)} · {session.className}</option>)}
          </select>
        </label> : null}
        {selected ? <><pre className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm font-semibold leading-7 text-slate-700">{report}</pre><button type="button" onClick={() => void navigator.clipboard.writeText(report)} className={`mt-3 ${SPM_PRIMARY_BTN}`}><ClipboardCopy size={15} />안내문 복사</button></> : invalidRequestedSession ? <p className="mt-5 rounded-xl bg-rose-50 p-5 text-center text-sm font-bold text-rose-700">완료된 수업을 찾을 수 없습니다.</p> : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">완료된 수업이 없습니다.</p>}
      </section>
    </div>
  </main>;
}
