'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay, getSeoulToday } from '../lib/sessionDateTime';
import type { ClassAttendanceRow } from '../classes/classManagementModel';
import type { MasterSessionAttendanceStatus, MasterSessionDto } from '../types/operational';

type AttendanceProjectionTableProps = {
  sessions: MasterSessionDto[];
  rows: ClassAttendanceRow[];
  emptyMonthLabel?: string;
  emptyAction?: ReactNode;
  onSessionSelect?: (session: MasterSessionDto) => void;
  presentation?: 'default' | 'manage-responsive';
};

type AttendanceDisplayStatus = MasterSessionAttendanceStatus | 'pending';

function sessionHeader(session: MasterSessionDto) {
  const completed = session.status === 'completed';
  return <>
    {formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })}
    <small className={`mt-0.5 block text-xs font-medium ${completed ? 'text-emerald-600' : 'text-blue-600'}`}>{completed ? '완료' : '예정'}</small>
  </>;
}

function attendanceStatus(session: MasterSessionDto, row: ClassAttendanceRow): AttendanceDisplayStatus {
  if (session.status !== 'completed') return 'pending';
  return row.attendanceBySessionId[session.id] ?? 'pending';
}

function attendanceMark(session: MasterSessionDto, row: ClassAttendanceRow) {
  const status = attendanceStatus(session, row);
  if (status === 'present') return <span className="inline-flex min-w-10 justify-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" aria-label="출석">출석</span>;
  if (status === 'absent') return <span className="inline-flex min-w-10 justify-center rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600" aria-label="결석">결석</span>;
  return <span className="inline-flex min-w-10 justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500" aria-label={session.status === 'completed' ? '완료 수업 미확인' : '예정 수업 미확인'}>미확인</span>;
}

function compactAttendanceMark(status: AttendanceDisplayStatus) {
  const config = status === 'present'
    ? { symbol: '●', label: '출석', className: 'text-emerald-700' }
    : status === 'absent'
      ? { symbol: '×', label: '결석', className: 'text-rose-600' }
      : { symbol: '○', label: '미확인', className: 'text-slate-500' };
  return <span aria-label={config.label} title={config.label} className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold ${config.className}`}>
    <span aria-hidden className="text-[12px] leading-none">{config.symbol}</span>
    <span>{config.label}</span>
  </span>;
}

function compactSessionDay(session: MasterSessionDto) {
  const day = getSeoulSessionDay(session.startAt);
  return {
    date: formatSeoulSessionDay(day, { month: 'numeric', day: 'numeric' }),
    weekday: formatSeoulSessionDay(day, { weekday: 'short' }).replace('요일', ''),
    full: formatSeoulSessionDay(day, { month: 'long', day: 'numeric', weekday: 'long' }),
  };
}

function defaultMobileSessionId(sessions: MasterSessionDto[]) {
  const today = getSeoulToday();
  const elapsed = sessions.filter((session) => getSeoulSessionDay(session.startAt) <= today);
  return elapsed[elapsed.length - 1]?.id ?? sessions[0]?.id ?? '';
}

function AttendanceLegend() {
  return <div aria-label="출결 상태 안내" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
    {compactAttendanceMark('present')}
    {compactAttendanceMark('absent')}
    {compactAttendanceMark('pending')}
  </div>;
}

function ManageAttendanceProjection({ sessions, rows, emptyAction, onSessionSelect }: AttendanceProjectionTableProps) {
  const [selectedSessionId, setSelectedSessionId] = useState(() => defaultMobileSessionId(sessions));

  if (!sessions.length) {
    return <div className="min-h-[120px] py-8 text-left">
      <p className="text-sm font-medium text-slate-600">이 달에는 등록된 수업이 없습니다.</p>
      {emptyAction}
    </div>;
  }

  if (!rows.length) {
    return <div className="min-h-[120px] py-8 text-left">
      <p className="text-sm font-medium text-slate-600">출석부에 등록된 학생이 없습니다.</p>
    </div>;
  }

  const selectedSession = sessions.find((session) => session.id === selectedSessionId)
    ?? sessions.find((session) => session.id === defaultMobileSessionId(sessions))
    ?? sessions[0]!;
  const selectedDay = compactSessionDay(selectedSession);
  const summary = rows.reduce((counts, row) => {
    counts[attendanceStatus(selectedSession, row)] += 1;
    return counts;
  }, { present: 0, absent: 0, pending: 0 });

  return <div className="mt-5">
    <div className="hidden md:block">
      <div data-attendance-scrollport className="block max-w-full overflow-x-auto border-y border-slate-200 bg-white">
        <table data-attendance-table className="w-max table-fixed border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th data-attendance-student-column className="sticky left-0 z-20 w-44 min-w-44 max-w-44 border-b border-r border-slate-200 bg-white px-4 py-2 text-left text-xs font-semibold text-slate-500">학생</th>
              {sessions.map((session) => {
                const day = compactSessionDay(session);
                return <th key={session.id} className="w-28 min-w-28 max-w-28 border-b border-slate-200 bg-white px-2 py-1 text-center">
                  {onSessionSelect ? <button type="button" onClick={() => onSessionSelect(session)} className="min-h-11 w-full text-slate-700 transition-colors hover:text-slate-950" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>
                    <span className="block text-sm font-semibold tabular-nums">{day.date}</span>
                    <span className="mt-0.5 block text-[12px] font-medium text-slate-400">{day.weekday}</span>
                  </button> : <Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="flex min-h-11 flex-col items-center justify-center text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>
                    <span className="block text-sm font-semibold tabular-nums">{day.date}</span>
                    <span className="mt-0.5 block text-[12px] font-medium text-slate-400">{day.weekday}</span>
                  </Link>}
                </th>;
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => <tr key={row.studentId}>
              <th className="sticky left-0 z-10 w-44 min-w-44 max-w-44 border-b border-r border-slate-100 bg-white px-4 py-3 text-left font-medium">
                {row.current ? <Link href={`/spokedu-master/students/${row.studentId}`} className="block max-w-36 truncate text-[15px] font-medium text-slate-800" title={row.studentName}>{row.studentName}</Link>
                  : <><span className="block max-w-36 truncate text-[15px] font-medium text-slate-700" title={row.studentName}>{row.studentName}</span><small className="text-[12px] font-medium text-slate-400">과거 참여</small></>}
              </th>
              {sessions.map((session) => <td key={session.id} className="w-28 min-w-28 max-w-28 border-b border-slate-100 px-2 py-3 text-center">{compactAttendanceMark(attendanceStatus(session, row))}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
      <AttendanceLegend />
    </div>

    <div className="md:hidden">
      <div data-attendance-session-selector className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-full w-max gap-1 pb-2">
          {sessions.map((session) => {
            const active = session.id === selectedSession.id;
            return <button key={session.id} type="button" onClick={() => setSelectedSessionId(session.id)} aria-pressed={active} className={`min-h-11 min-w-14 flex-1 px-2 text-center text-sm font-semibold tabular-nums transition-colors ${active ? 'border-b-2 border-slate-900 text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}>
              {compactSessionDay(session).date}
            </button>;
          })}
        </div>
      </div>

      <button type="button" onClick={() => onSessionSelect?.(selectedSession)} className="flex min-h-[76px] w-full items-center justify-between gap-4 border-b border-slate-200 py-3 text-left" title={`${formatSeoulSessionTime(selectedSession.startAt)} 수업 열기`}>
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold text-slate-950">{selectedDay.full}</span>
          <span className="mt-1 block text-sm font-medium text-slate-500">출석 {summary.present} · 결석 {summary.absent} · 미확인 {summary.pending}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-slate-500">수업 상세 →</span>
      </button>

      <div aria-label={`${selectedDay.full} 출석 명단`}>
        {rows.map((row) => <div key={row.studentId} className="flex min-h-[52px] items-center justify-between gap-3 border-b border-slate-100 py-2">
          <span className="min-w-0">
            {row.current ? <Link href={`/spokedu-master/students/${row.studentId}`} className="block truncate text-[15px] font-medium text-slate-800" title={row.studentName}>{row.studentName}</Link>
              : <><span className="block truncate text-[15px] font-medium text-slate-700" title={row.studentName}>{row.studentName}</span><span className="block text-[12px] font-medium text-slate-400">과거 참여</span></>}
          </span>
          {compactAttendanceMark(attendanceStatus(selectedSession, row))}
        </div>)}
      </div>
    </div>
  </div>;
}

export function AttendanceProjectionTable(props: AttendanceProjectionTableProps) {
  if (props.presentation === 'manage-responsive') return <ManageAttendanceProjection {...props} />;

  const { sessions, rows, emptyMonthLabel, emptyAction, onSessionSelect } = props;
  if (!sessions.length && !rows.length) {
    return <div className="min-h-[120px] py-6 text-left"><p className="text-sm font-medium text-slate-700">{emptyMonthLabel ?? '이번 달'}에 표시할 학생이나 수업이 없습니다.</p>{emptyAction}</div>;
  }

  return <div className="mt-3">
    {!sessions.length ? <div className="mb-3 flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-slate-600">{emptyMonthLabel ?? '이번 달'}에 등록된 수업이 없습니다.</p>{emptyAction}</div> : null}
    <div data-attendance-scrollport className="inline-block max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white align-top">
      <table data-attendance-table className="w-max border-separate border-spacing-0 text-sm">
        <thead><tr>
          <th data-attendance-student-column className="sticky left-0 z-20 w-36 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-700">학생</th>
          {sessions.map((session) => <th key={session.id} className="w-24 border-b border-slate-200 bg-slate-50 px-3 py-2 text-center">
            {onSessionSelect ? <button type="button" onClick={() => onSessionSelect(session)} className="block min-h-11 w-full font-medium text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>{sessionHeader(session)}</button>
              : <Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="block min-h-11 font-medium text-slate-700" title={`${formatSeoulSessionTime(session.startAt)} 수업 열기`}>{sessionHeader(session)}</Link>}
          </th>)}
        </tr></thead>
        <tbody>{rows.map((row) => <tr key={row.studentId}>
          <th className="sticky left-0 z-10 w-36 border-b border-r border-slate-100 bg-white px-3 py-3 text-left font-medium">
            {row.current ? <Link href={`/spokedu-master/students/${row.studentId}`} className="block max-w-32 truncate font-medium text-slate-700" title={row.studentName}>{row.studentName}</Link>
              : <><span className="block max-w-32 truncate font-medium text-slate-700" title={row.studentName}>{row.studentName}</span><small className="text-xs font-medium text-slate-400">과거 참여</small></>}
          </th>
          {sessions.map((session) => <td key={session.id} className="w-24 border-b border-slate-100 px-3 py-3 text-center">{attendanceMark(session, row)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
