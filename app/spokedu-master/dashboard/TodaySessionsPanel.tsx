'use client';

import { ArrowRight, CalendarPlus, Clock3, MonitorPlay, UsersRound } from 'lucide-react';
import Link from 'next/link';

import { formatSeoulSessionTime } from '../lib/sessionDateTime';
import type { MasterClassDto, MasterSessionDto, MasterSessionStatus } from '../types/operational';
import { buildTodaySessionCards } from './todaySessionsModel';

const STATUS_LABEL: Record<MasterSessionStatus, string> = {
  scheduled: '예정',
  completed: '완료',
  cancelled: '취소',
};

export function TodaySessionsPanel({
  sessions,
  classes,
  seoulDay,
  loading,
  error,
  onRetry,
}: {
  sessions: MasterSessionDto[];
  classes: MasterClassDto[];
  seoulDay: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const cards = buildTodaySessionCards(sessions, classes, seoulDay);

  return (
    <section data-dashboard-section="today-sessions" aria-labelledby="today-sessions-heading" className="rounded-[16px] border border-slate-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Today operations</p>
          <h2 id="today-sessions-heading" className="mt-1 text-[20px] font-black tracking-[-0.02em] text-slate-900">오늘 수업</h2>
        </div>
        {!loading && cards.length > 0 ? <span className="text-xs font-bold text-slate-500">수업 {cards.length}개</span> : null}
      </div>

      {loading ? <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">오늘 수업을 불러오는 중입니다.</p> : null}
      {error ? <div role="alert" className="mt-3 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">오늘 수업을 불러오지 못했습니다.<button type="button" onClick={onRetry} className="ml-2 min-h-11 px-2 underline underline-offset-2">다시 시도</button></div> : null}
      {!loading && !error && cards.length === 0 ? (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm font-bold text-slate-600">오늘 예정된 수업이 없습니다.</p>
          <Link href={`/spokedu-master/activity?date=${seoulDay}&create=1`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
            <CalendarPlus size={16} aria-hidden="true" />수업 추가
          </Link>
        </div>
      ) : null}

      {!loading && !error && cards.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {cards.map(({ session, rosterCount, activityCount, completedActivityCount, hasAttendance, hasSpomove, ctaLabel, href }) => (
            <article key={session.id} className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${session.status === 'cancelled' ? 'border-slate-200 bg-slate-50 opacity-70' : session.status === 'completed' ? 'border-slate-200 bg-slate-50/70' : 'border-slate-200 bg-white'}`}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-sm font-black text-slate-800"><Clock3 size={14} aria-hidden="true" />{formatSeoulSessionTime(session.startAt)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="max-w-full truncate text-sm font-black text-slate-900" title={session.className}>{session.className}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{STATUS_LABEL[session.status]}</span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
                    <span>{activityCount ? `활동 ${activityCount}개 · 진행 ${completedActivityCount}/${activityCount}` : '활동 미지정'}</span>
                    <span className="inline-flex items-center gap-1"><UsersRound size={12} aria-hidden="true" />학생 {rosterCount}명</span>
                    {hasAttendance ? <span>출석 기록 있음</span> : null}
                    {hasSpomove ? <span className="inline-flex items-center gap-1 text-blue-700"><MonitorPlay size={12} aria-hidden="true" />SPOMOVE 포함</span> : null}
                  </p>
                </div>
              </div>
              {ctaLabel ? (
                <Link href={href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 focus-visible:outline-offset-2">
                  {ctaLabel}<ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : (
                <Link href={href} className="inline-flex min-h-11 shrink-0 items-center justify-center px-3 text-xs font-bold text-slate-500 underline underline-offset-2">수업 보기</Link>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
