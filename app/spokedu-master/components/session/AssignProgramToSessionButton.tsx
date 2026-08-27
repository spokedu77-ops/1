'use client';

import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SPM_PRIMARY_BTN } from '../../lib/masterActionGrammar';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay, getSeoulToday } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { Program } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';

export function AssignProgramToSessionButton({ program, className, targetSessionId, returnHref }: { program: Program; className?: string; targetSessionId?: string | null; returnHref?: string | null }) {
  const router = useRouter();
  const data = useOperationalData();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(getSeoulToday());
  const [showDateSearch, setShowDateSearch] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [assignedSessionId, setAssignedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const dateSessions = useMemo(() => data.sessions.filter((session) => (
    session.status === 'scheduled' && getSeoulSessionDay(session.startAt) === date
  )).sort((left, right) => left.startAt.localeCompare(right.startAt)), [data.sessions, date]);
  const upcomingSessions = useMemo(() => data.sessions
    .filter((session) => session.status === 'scheduled' && new Date(session.startAt).getTime() >= Date.now())
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .slice(0, 8), [data.sessions]);
  const sessions = showDateSearch ? dateSessions : upcomingSessions;
  const numericProgramId = Number(program.id);
  const targetSession = targetSessionId ? data.sessions.find((session) => session.id === targetSessionId) : null;
  const alreadyAssigned = Boolean(targetSession?.programs.some((item) => item.sourceType === 'program' && item.programId === numericProgramId));

  const assign = async (sessionId: string) => {
    const session = data.sessions.find((item) => item.id === sessionId);
    if (!session || !Number.isInteger(numericProgramId)) return;
    if (session.programs.some((item) => item.sourceType === 'program' && item.programId === numericProgramId)) {
      setMessage({ tone: 'error', text: '이미 이 수업에 포함되어 있습니다.' });
      return;
    }
    setSavingId(sessionId);
    setMessage(null);
    try {
      await data.addSessionProgram(session.id, numericProgramId);
      setAssignedSessionId(session.id);
      setMessage({
        tone: 'success',
        text: `${formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })} ${formatSeoulSessionTime(session.startAt)} · ${session.className} 수업에 추가했습니다.`,
      });
      if (targetSessionId && returnHref) router.push(returnHref);
    } catch {
      setAssignedSessionId(null);
      setMessage({ tone: 'error', text: '프로그램을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setSavingId(null);
    }
  };

  return <>
    <button type="button" disabled={!Number.isInteger(numericProgramId) || savingId !== null || alreadyAssigned} onClick={() => {
      if (targetSessionId) void assign(targetSessionId);
      else { setOpen(true); setShowDateSearch(false); setAssignedSessionId(null); setMessage(null); }
    }} className={className ?? `${SPM_PRIMARY_BTN} h-12`}>
      <CalendarPlus size={16} />{alreadyAssigned ? '추가됨' : '수업에 추가'}
    </button>
    {targetSessionId && message ? <p role="status" className={`mt-2 text-xs font-bold ${message.tone === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p> : null}
    {open ? <BottomSheet open title="수업에 추가" onClose={() => setOpen(false)}>
      <div className="pb-4">
        <p className="text-sm font-black text-slate-800">{program.title}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div><p className="text-sm font-black text-slate-800">{showDateSearch ? '날짜의 예정 수업' : '다가오는 예정 수업'}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">정확한 수업을 선택해 주세요.</p></div>
          <button type="button" onClick={() => { setShowDateSearch((current) => !current); setMessage(null); }} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700">{showDateSearch ? '다가오는 수업 보기' : '다른 날짜 찾기'}</button>
        </div>
        {showDateSearch ? <label className="mt-3 block text-xs font-black text-slate-600">날짜 선택
          <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setMessage(null); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" />
        </label> : null}
        <div className="mt-4 space-y-2">
          {sessions.map((session) => <button key={session.id} type="button" disabled={savingId !== null} onClick={() => void assign(session.id)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left disabled:opacity-40">
            <span><strong className="block text-sm text-slate-800">{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })} {formatSeoulSessionTime(session.startAt)} · {session.className}</strong><small className="text-slate-500">활동 {session.programs.length}개 · 예정</small></span>
            <span className="text-xs font-black text-slate-700">선택</span>
          </button>)}
          {!sessions.length ? <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">{showDateSearch ? '이 날짜에 추가 가능한 예정 수업이 없습니다.' : '다가오는 예정 수업이 없습니다. 다른 날짜를 찾아보세요.'}</p> : null}
        </div>
        {message ? <p role="status" className={`mt-3 rounded-xl p-3 text-xs font-bold ${message.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{message.text}</p> : null}
        {assignedSessionId && message?.tone === 'success' ? (
          <Link href={`/spokedu-master/activity?session=${encodeURIComponent(assignedSessionId)}`} className={`mt-3 ${SPM_PRIMARY_BTN} w-full`}>
            수업 열기
          </Link>
        ) : null}
      </div>
    </BottomSheet> : null}
  </>;
}
