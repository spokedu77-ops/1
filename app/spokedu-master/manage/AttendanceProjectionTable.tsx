'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import type { ClassAttendanceRow } from '../classes/classManagementModel';
import type { MasterSessionDto } from '../types/operational';

function sessionHeader(session: MasterSessionDto) {
  const completed = session.status === 'completed';
  return <>
    {formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })}
    <small className={`mt-0.5 block text-xs font-medium ${completed ? 'text-emerald-600' : 'text-blue-600'}`}>{completed ? '완료' : '예정'}</small>
  </>;
}

function attendanceMark(session: MasterSessionDto, row: ClassAttendanceRow) {
  if (session.status !== 'completed') {
    return <span className="inline-flex min-w-10 justify-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600" aria-label="예정 수업 미확인">미확인</span>;
  }

  const status = row.attendanceBySessionId[session.id];
  if (status === 'present') return <span className="inline-flex min-w-10 justify-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" aria-label="출석">출석</span>;
  if (status === 'absent') return <span className="inline-flex min-w-10 justify-center rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600" aria-label="결석">결석</span>;
  return <span className="inline-flex min-w-10 justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500" aria-label="완료 수업 미확인">미확인</span>;
}

export function AttendanceProjectionTable({
  sessions,
  rows,
  emptyMonthLabel,
  emptyAction,
  onSessionSelect,
}: {
  sessions: MasterSessionDto[];
  rows: ClassAttendanceRow[];
  emptyMonthLabel?: string;
  emptyAction?: ReactNode;
  onSessionSelect?: (session: MasterSessionDto) => void;
}) {
  if (!sessions.length && !rows.length) {
    return <div className="min-h-[120px] py-6 text-left"><p className="text-sm font-medium text-slate-700">{emptyMonthLabel ?? '이번 달'}에 표시할 학생이나 수업이 없습니다.</p>{emptyAction}</div>;
  }

  return (
    <div className="mt-3">
      {!sessions.length ? <div className="mb-3 flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-slate-600">{emptyMonthLabel ?? '이번 달'}에 등록된 수업이 없습니다.</p>{emptyAction}</div> : null}
      <div data-attendance-scrollport className="inline-block max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white align-top">
        <table data-attendance-table className="w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th data-attendance-student-column className="sticky left-0 z-20 w-36 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-700">학생</th>
              {sessions.map((session) => (
                <th key={session.id} className="w-24 border-b border-slate-200 bg-slate-50 px-3 py-2 text-center">
                  {onSessionSelect ? <button type="button" onClick={() => onSessionSelect(session)} className="block min-h-11 w-full font-medium text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>{sessionHeader(session)}</button>
                    : <Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="block min-h-11 font-medium text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>{sessionHeader(session)}</Link>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId}>
                <th className="sticky left-0 z-10 w-36 border-b border-r border-slate-100 bg-white px-3 py-3 text-left font-medium">
                  {row.current ? (
                    <Link href={`/spokedu-master/students/${row.studentId}`} className="block max-w-32 truncate font-medium text-slate-700" title={row.studentName}>{row.studentName}</Link>
                  ) : (
                    <><span className="block max-w-32 truncate font-medium text-slate-700" title={row.studentName}>{row.studentName}</span><small className="text-xs font-medium text-slate-400">과거 참여</small></>
                  )}
                </th>
                {sessions.map((session) => <td key={session.id} className="w-24 border-b border-slate-100 px-3 py-3 text-center">{attendanceMark(session, row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
