'use client';

import { CalendarPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatSeoulSessionTime, getSeoulSessionDay, getSeoulToday } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { Program } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';

export function AssignProgramToSessionButton({ program, className }: { program: Program; className?: string }) {
  const data = useOperationalData();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(getSeoulToday());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sessions = useMemo(() => data.sessions.filter((session) => (
    session.status === 'scheduled' && getSeoulSessionDay(session.startAt) === date
  )), [data.sessions, date]);
  const numericProgramId = Number(program.id);

  const assign = async (sessionId: string) => {
    const session = data.sessions.find((item) => item.id === sessionId);
    if (!session || !Number.isInteger(numericProgramId)) return;
    if (session.programs.some((item) => item.sourceType === 'program' && item.programId === numericProgramId)) {
      setMessage('이미 이 수업에 배정된 프로그램입니다.');
      return;
    }
    setSavingId(sessionId);
    setMessage(null);
    try {
      await data.addSessionProgram(session.id, numericProgramId);
      setMessage(`${formatSeoulSessionTime(session.startAt)} ${session.className} 수업에 배정했습니다.`);
    } catch {
      setMessage('프로그램을 배정하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSavingId(null);
    }
  };

  return <>
    <button type="button" disabled={!Number.isInteger(numericProgramId)} onClick={() => setOpen(true)} className={className ?? 'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--spm-acc)] px-4 text-sm font-black text-white disabled:opacity-40'}>
      <CalendarPlus size={16} />수업에 배정
    </button>
    {open ? <BottomSheet open title="수업에 배정" onClose={() => setOpen(false)}>
      <div className="pb-4">
        <p className="text-sm font-black text-slate-800">{program.title}</p>
        <label className="mt-4 block text-xs font-black text-slate-600">날짜 선택
          <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setMessage(null); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" />
        </label>
        <div className="mt-4 space-y-2">
          {sessions.map((session) => <button key={session.id} type="button" disabled={savingId !== null} onClick={() => void assign(session.id)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left disabled:opacity-40">
            <span><strong className="block text-sm text-slate-800">{formatSeoulSessionTime(session.startAt)} {session.className}</strong><small className="text-slate-500">활동 {session.programs.length}개 · 예정</small></span>
            <span className="text-xs font-black text-emerald-700">선택</span>
          </button>)}
          {!sessions.length ? <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">이 날짜에 배정 가능한 예정 수업이 없습니다.</p> : null}
        </div>
        {message ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{message}</p> : null}
      </div>
    </BottomSheet> : null}
  </>;
}
