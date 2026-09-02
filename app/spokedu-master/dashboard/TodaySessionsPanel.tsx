'use client';

import { ArrowRight, CalendarPlus, Clock3, MonitorPlay, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { SPM_PRIMARY_BTN } from '../lib/masterActionGrammar';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';
import { summarizePastOperationalDebt } from '../lib/masterTemporalContract';
import type { MasterClassDto, MasterSessionDto, MasterSessionStatus } from '../types/operational';
import { buildTodaySessionCards } from './todaySessionsModel';
import { SystemDecisionBanner } from '../components/information/SystemDecisionBanner';

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
  const now = useMemo(() => new Date(), []);
  const cards = buildTodaySessionCards(sessions, classes, seoulDay, now);

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
          <Link href={`/spokedu-master/activity?date=${seoulDay}&create=1`} className={SPM_PRIMARY_BTN}>
            <CalendarPlus size={16} aria-hidden="true" />수업 추가
          </Link>
        </div>
      ) : null}

      {!loading && !error && cards.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {cards.map(({ session, rosterCount, activityCount, completedActivityCount, hasSpomove, ctaLabel, href, workState }) => (
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
                    {hasSpomove ? <span className="inline-flex items-center gap-1 text-blue-700"><MonitorPlay size={12} aria-hidden="true" />SPOMOVE 포함</span> : null}
                  </p>
                  <p className={`mt-1 text-xs font-black ${workState.attention.overdue || workState.attention.attendanceMissing ? 'text-amber-700' : 'text-emerald-700'}`}>{workState.operationalLabel}</p>
                </div>
              </div>
              {ctaLabel ? (
                <Link href={href} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 focus-visible:outline-offset-2 ${session.status === 'scheduled' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
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

export function HomeFollowUpPanel({ sessions, classes, seoulDay }: {
  sessions: MasterSessionDto[];
  classes: MasterClassDto[];
  seoulDay: string;
}) {
  const now = useMemo(() => new Date(), []);
  const pastDebt = useMemo(() => summarizePastOperationalDebt({ sessions, classes, now }), [sessions, classes, now]);
  if (pastDebt.count === 0) return null;
  const href = pastDebt.leadSessionId
    ? `/spokedu-master/activity?session=${encodeURIComponent(pastDebt.leadSessionId)}`
    : pastDebt.leadClassId
      ? `/spokedu-master/classes/${encodeURIComponent(pastDebt.leadClassId)}`
      : `/spokedu-master/activity?date=${encodeURIComponent(seoulDay)}`;
  return (
    <div data-dashboard-section="follow-up">
      <SystemDecisionBanner
        eyebrow="Follow-up"
        title="지난 수업에서 이어 할 일이 있습니다"
        meta={`${pastDebt.count}건`}
        href={href}
        actionLabel="지난 수업 확인하기"
        tone="attention"
      />
    </div>
  );
}

export function UpcomingPreparationPanel({ sessions, classes }: { sessions: MasterSessionDto[]; classes: MasterClassDto[] }) {
  const now = useMemo(() => new Date(), []);
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const items = useMemo(() => sessions
    .filter((session) => session.status === 'scheduled' && new Date(session.startAt).getTime() > now.getTime())
    .map((session) => ({ session, state: deriveMasterSessionWorkState(session, classMap.get(session.classId), now) }))
    .filter(({ state }) => state.stage === 'needs-preparation')
    .sort((a, b) => a.session.startAt.localeCompare(b.session.startAt)).slice(0, 3), [classMap, now, sessions]);
  if (!items.length) return null;
  return <section data-dashboard-section="upcoming-prep" className="rounded-[16px] border border-slate-200 bg-white p-3.5 sm:p-4">
    <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Preparation</p><h2 className="mt-1 text-base font-black text-slate-950">다가오는 수업 준비</h2></div><Link href="/spokedu-master/activity" className="min-h-11 px-2 text-xs font-black text-slate-500">전체 일정</Link></div>
    <div className="mt-2 grid gap-2">{items.map(({ session, state }) => <Link key={session.id} href={state.href} className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3"><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{session.className}</strong><small className="text-slate-500">{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'long', day: 'numeric', weekday: 'short' })} · {formatSeoulSessionTime(session.startAt)}</small></span><span className="shrink-0 text-xs font-black text-blue-700">수업 준비</span></Link>)}</div>
  </section>;
}

export function HomeContinuityPanel({ sessions, classes, loading, error, onRetry }: {
  sessions: MasterSessionDto[];
  classes: MasterClassDto[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const item = useMemo(() => {
    const candidates = sessions
      .filter((session) => session.status === 'scheduled' && (Boolean(session.startedAt) || session.programs.some((program) => program.isCompleted)))
      .sort((left, right) => left.startAt.localeCompare(right.startAt));
    return candidates[0] ?? null;
  }, [sessions]);

  void classes; void loading; void error; void onRetry;
  if (!item) return null;

  const completed = item.programs.filter((program) => program.isCompleted).length;
  const action = item.programs.length > 0 && completed === item.programs.length ? '수업 마무리하기' : '수업 계속하기';

  return (
    <section
      data-dashboard-section="continuity"
      data-continuity-priority="resume"
      aria-labelledby="home-continuity-heading"
      className="flex flex-col gap-3 rounded-[16px] border border-indigo-200 bg-indigo-50/60 px-4 py-3 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-indigo-700">이어갈 수업</p>
        <h2 id="home-continuity-heading" className="mt-0.5 truncate text-[18px] font-semibold text-slate-950">{item.className}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {formatSeoulSessionDay(getSeoulSessionDay(item.startAt), { month: 'long', day: 'numeric', weekday: 'short' })} · {formatSeoulSessionTime(item.startAt)}
          {item.programs.length > 0 ? ` · 활동 ${completed}/${item.programs.length}` : ''}
        </p>
      </div>
      <Link href={`/spokedu-master/activity?session=${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-slate-950 px-4 text-sm font-semibold text-white">
        {action}<ArrowRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}

export function HomeNextSessionPanel({ sessions, classes }: { sessions: MasterSessionDto[]; classes: MasterClassDto[] }) {
  const now = useMemo(() => new Date(), []);
  const classIds = useMemo(() => new Set(classes.map((item) => item.id)), [classes]);
  const next = useMemo(() => sessions
    .filter((session) => session.status === 'scheduled' && !session.startedAt && !session.programs.some((program) => program.isCompleted) && classIds.has(session.classId) && new Date(session.startAt).getTime() > now.getTime())
    .sort((left, right) => left.startAt.localeCompare(right.startAt))[0] ?? null, [classIds, now, sessions]);
  if (!next) return null;
  return <section data-dashboard-section="next-session" className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
    <div className="min-w-0"><p className="text-[13px] font-medium text-slate-500">내 다음 수업</p><h2 className="mt-1 truncate text-[20px] font-semibold text-slate-950">{next.className}</h2><p className="mt-1 text-[13px] text-slate-500">{formatSeoulSessionDay(getSeoulSessionDay(next.startAt), { month: 'long', day: 'numeric', weekday: 'short' })} · {formatSeoulSessionTime(next.startAt)}</p></div>
    <Link href={`/spokedu-master/activity?session=${encodeURIComponent(next.id)}`} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-slate-700">수업 준비<ArrowRight size={15} /></Link>
  </section>;
}
