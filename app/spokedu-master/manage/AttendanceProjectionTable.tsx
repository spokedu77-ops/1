'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import type { ClassAttendanceRow } from '../classes/classManagementModel';
import type { MasterSessionDto } from '../types/operational';

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
    return <div className="min-h-[170px] py-8 text-left"><p className="text-sm font-semibold text-slate-700">{emptyMonthLabel ?? '이 달'}에 표시할 학생이나 수업이 없습니다.</p><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">학생을 수업반에 추가하거나 일정을 만들면 이곳에 바로 표시됩니다.</p>{emptyAction}</div>;
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 min-w-32 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-700">학생</th>
            {sessions.map((session) => (
              <th key={session.id} className="min-w-20 border-b border-slate-200 bg-slate-50 px-3 py-2 text-center">
                {onSessionSelect ? <button type="button" onClick={() => onSessionSelect(session)} className="block min-h-11 w-full font-semibold text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>
                  {formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })}
                  <small className={`mt-0.5 block text-xs font-medium ${session.status === 'completed' ? 'text-emerald-600' : 'text-blue-600'}`}>{session.status === 'completed' ? '완료' : '예정'}</small>
                </button> : <Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="block min-h-11 font-semibold text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })}<small className="mt-0.5 block text-xs font-medium text-slate-400">{formatSeoulSessionTime(session.startAt)}</small></Link>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId}>
              <th className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-3 text-left">
                {row.current ? (
                  <Link href={`/spokedu-master/students/${row.studentId}`} className="block max-w-28 truncate font-semibold text-slate-800" title={row.studentName}>{row.studentName}</Link>
                ) : (
                  <><span className="block max-w-28 truncate font-semibold text-slate-800" title={row.studentName}>{row.studentName}</span><small className="text-xs font-medium text-slate-400">과거 참여</small></>
                )}
              </th>
              {sessions.map((session) => {
                const status = session.status === 'completed' ? row.attendanceBySessionId[session.id] : undefined;
                return <td key={session.id} className="border-b border-slate-100 px-3 py-3 text-center font-semibold"><span className={status === 'present' ? 'text-emerald-700' : status === 'absent' ? 'text-rose-600' : 'text-slate-300'} aria-label={status === 'present' ? '출석' : status === 'absent' ? '결석' : '미확인'}>{status === 'present' ? '✓' : status === 'absent' ? '✕' : '—'}</span></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
