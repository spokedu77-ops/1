'use client';

import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { getSessionActionPolicy } from '../../activity/sessionActionPolicy';
import { SPM_PRIMARY_BTN } from '../../lib/masterActionGrammar';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay, getSeoulToday } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { Program } from '../../types';
import type { MasterSessionDto } from '../../types/operational';
import { BottomSheet } from '../ui/BottomSheet';

type AssignmentAvailability = {
  allowed: boolean;
  alreadyAssigned: boolean;
  reason: string | null;
};

export function getProgramAssignmentAvailability(
  session: MasterSessionDto,
  programId: number,
): AssignmentAvailability {
  const alreadyAssigned = session.programs.some(
    (item) => item.sourceType === 'program' && item.programId === programId,
  );
  if (alreadyAssigned) {
    return { allowed: false, alreadyAssigned: true, reason: '이미 추가된 활동입니다.' };
  }
  if (session.status === 'completed') {
    return { allowed: false, alreadyAssigned: false, reason: '완료된 수업에는 추가할 수 없습니다.' };
  }
  if (session.status === 'cancelled') {
    return { allowed: false, alreadyAssigned: false, reason: '취소된 수업에는 추가할 수 없습니다.' };
  }
  if (!getSessionActionPolicy(session.status, session.startedAt).addActivities) {
    return { allowed: false, alreadyAssigned: false, reason: '이미 시작한 수업에는 추가할 수 없습니다.' };
  }
  return { allowed: true, alreadyAssigned: false, reason: null };
}

function sessionLabel(session: MasterSessionDto) {
  return `${formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })} ${formatSeoulSessionTime(session.startAt)} · ${session.className}`;
}

export function AssignProgramToSessionButton({
  program,
  className,
  targetSessionId,
  returnHref,
}: {
  program: Program;
  className?: string;
  targetSessionId?: string | null;
  returnHref?: string | null;
}) {
  const router = useRouter();
  const data = useOperationalData();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(getSeoulToday());
  const [showDateSearch, setShowDateSearch] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [assignedSessionId, setAssignedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const numericProgramId = Number(program.id);
  const validProgramId = Number.isInteger(numericProgramId);

  const dateSessions = useMemo(() => data.sessions
    .filter((session) => getSeoulSessionDay(session.startAt) === date)
    .sort((left, right) => left.startAt.localeCompare(right.startAt)), [data.sessions, date]);
  const upcomingSessions = useMemo(() => data.sessions
    .filter((session) => session.status === 'scheduled' && new Date(session.startAt).getTime() >= Date.now())
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .slice(0, 8), [data.sessions]);
  const sessions = showDateSearch ? dateSessions : upcomingSessions;
  const targetSession = targetSessionId ? data.sessions.find((session) => session.id === targetSessionId) : null;
  const targetAvailability = targetSession && validProgramId
    ? getProgramAssignmentAvailability(targetSession, numericProgramId)
    : null;
  const directLoading = Boolean(targetSessionId) && (data.status === 'idle' || data.status === 'loading');
  const directError = Boolean(targetSessionId) && data.status === 'error';
  const directMissing = Boolean(targetSessionId) && data.status === 'ready' && !targetSession;
  const directDisabled = !validProgramId || savingId !== null || directLoading || directError || directMissing
    || Boolean(targetAvailability && !targetAvailability.allowed);

  const assign = async (sessionId: string) => {
    if (!validProgramId) {
      setMessage({ tone: 'error', text: '프로그램 정보를 확인할 수 없습니다.' });
      return;
    }
    if (data.status === 'idle' || data.status === 'loading') {
      setMessage({ tone: 'error', text: '수업 목록을 불러오는 중입니다. 잠시만 기다려 주세요.' });
      return;
    }
    if (data.status === 'error') {
      setMessage({ tone: 'error', text: data.error || '수업 목록을 불러오지 못했습니다.' });
      return;
    }

    // Re-read the current Provider snapshot immediately before the request.
    const session = data.sessions.find((item) => item.id === sessionId);
    if (!session) {
      setMessage({ tone: 'error', text: '대상 수업을 찾을 수 없습니다.' });
      return;
    }
    const availability = getProgramAssignmentAvailability(session, numericProgramId);
    if (!availability.allowed) {
      setMessage({ tone: 'error', text: availability.reason || '이 수업에는 활동을 추가할 수 없습니다.' });
      return;
    }

    setSavingId(sessionId);
    setMessage(null);
    try {
      await data.addSessionProgram(session.id, numericProgramId);
      setAssignedSessionId(session.id);
      setMessage({ tone: 'success', text: `${sessionLabel(session)} 수업에 추가했습니다.` });
      if (targetSessionId && returnHref) router.push(returnHref);
    } catch {
      setAssignedSessionId(null);
      setMessage({ tone: 'error', text: '프로그램을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setSavingId(null);
    }
  };

  const directReason = directLoading
    ? '수업 정보를 확인하는 중입니다.'
    : directError
      ? data.error || '수업 정보를 불러오지 못했습니다.'
      : directMissing
        ? '대상 수업을 찾을 수 없습니다.'
        : targetAvailability?.reason ?? null;

  return <>
    <button
      type="button"
      disabled={targetSessionId ? directDisabled : !validProgramId || savingId !== null}
      onClick={() => {
        if (targetSessionId) void assign(targetSessionId);
        else {
          setOpen(true);
          setShowDateSearch(false);
          setAssignedSessionId(null);
          setMessage(null);
        }
      }}
      className={className ?? `${SPM_PRIMARY_BTN} h-12`}
    >
      <CalendarPlus size={16} />
      {targetAvailability?.alreadyAssigned ? '추가됨' : directLoading ? '수업 확인 중' : '수업에 추가'}
    </button>
    {targetSessionId && directReason && !message ? (
      <div className="mt-2 text-xs font-semibold text-slate-600">
        <p role="status">{directReason}</p>
        {directError ? (
          <button type="button" onClick={() => void data.reload('hard')} className="mt-1 min-h-11 font-bold text-blue-700 underline underline-offset-2">
            다시 시도
          </button>
        ) : null}
      </div>
    ) : null}
    {targetSessionId && message ? (
      <p role="status" className={`mt-2 text-xs font-bold ${message.tone === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p>
    ) : null}

    {open ? (
      <BottomSheet open title="수업에 추가" onClose={() => setOpen(false)}>
        <div className="pb-4">
          <p className="text-sm font-extrabold text-slate-800">{program.title}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-800">{showDateSearch ? '날짜별 수업' : '다가오는 예정 수업'}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">추가할 수업을 선택해 주세요.</p>
            </div>
            <button type="button" onClick={() => { setShowDateSearch((current) => !current); setMessage(null); }} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-extrabold text-slate-700">
              {showDateSearch ? '다가오는 수업 보기' : '다른 날짜 찾기'}
            </button>
          </div>
          {showDateSearch ? (
            <label className="mt-3 block text-xs font-extrabold text-slate-600">날짜 선택
              <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setMessage(null); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" />
            </label>
          ) : null}

          <div className="mt-4 space-y-2">
            {data.status === 'idle' || data.status === 'loading' ? (
              <p role="status" className="rounded-xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">수업 목록을 불러오는 중입니다.</p>
            ) : data.status === 'error' ? (
              <div className="rounded-xl bg-rose-50 p-4 text-center text-xs font-semibold text-rose-700">
                <p role="alert">{data.error || '수업 목록을 불러오지 못했습니다.'}</p>
                <button type="button" onClick={() => void data.reload('hard')} className="mt-2 min-h-11 font-bold underline underline-offset-2">다시 시도</button>
              </div>
            ) : (
              <>
                {sessions.map((session) => {
                  const availability = getProgramAssignmentAvailability(session, numericProgramId);
                  const assignedNow = assignedSessionId === session.id;
                  const disabled = savingId !== null || assignedNow || !availability.allowed;
                  return (
                    <button key={session.id} type="button" disabled={disabled} onClick={() => void assign(session.id)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left disabled:bg-slate-50 disabled:opacity-70">
                      <span>
                        <strong className="block text-sm text-slate-800">{sessionLabel(session)}</strong>
                        <small className="text-slate-500">
                          {assignedNow || availability.alreadyAssigned ? '이미 추가된 활동입니다.' : availability.reason ?? `활동 ${session.programs.length}개 · 예정`}
                        </small>
                      </span>
                      <span className="shrink-0 text-xs font-extrabold text-slate-700">{assignedNow || availability.alreadyAssigned ? '추가됨' : availability.allowed ? '선택' : '선택 불가'}</span>
                    </button>
                  );
                })}
                {!sessions.length ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">
                    {showDateSearch ? '이 날짜에는 추가 가능한 수업이 없습니다.' : '다가오는 추가 가능한 예정 수업이 없습니다. 다른 날짜를 찾아보세요.'}
                  </p>
                ) : null}
              </>
            )}
          </div>

          {message ? (
            <p role="status" className={`mt-3 rounded-xl p-3 text-xs font-bold ${message.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{message.text}</p>
          ) : null}
          {assignedSessionId && message?.tone === 'success' ? (
            <Link href={`/spokedu-lab/activity?session=${encodeURIComponent(assignedSessionId)}`} className={`mt-3 ${SPM_PRIMARY_BTN} w-full`}>
              수업 열기
            </Link>
          ) : null}
        </div>
      </BottomSheet>
    ) : null}
  </>;
}
