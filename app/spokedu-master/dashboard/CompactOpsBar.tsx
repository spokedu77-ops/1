'use client';

import { ArrowRight, MonitorPlay, X } from 'lucide-react';
import Link from 'next/link';

import {
  getHomeAnchorIntensity,
  type HomeAnchor,
} from './homeOpsModel';

/** 홈 상단의 다음 작업과 오늘 수업 목록을 간결하게 제공한다. */
export function CompactOpsBar({
  anchor,
  recordCount,
  reportCount,
  todayLessons = [],
  onRemoveTodayLesson,
}: {
  anchor: HomeAnchor;
  recordCount: number | null;
  reportCount: number | null;
  todayLessons?: Array<{ programId: string; programTitle: string }>;
  onRemoveTodayLesson?: (programId: string) => void;
}) {
  const intensity = getHomeAnchorIntensity(anchor.kind);
  const isSpomove = anchor.kind === 'spomove';
  const isEmpty = anchor.kind === 'empty';
  const countsLabel =
    recordCount === null
      ? '기록 확인 중'
      : reportCount === null
      ? `기록 ${recordCount}개`
      : `기록 ${recordCount}개 · 안내문 ${reportCount}개`;

  if (todayLessons.length > 0) {
    return (
      <section
        data-dashboard-section="compact-ops-bar"
        data-anchor-kind={anchor.kind}
        data-anchor-intensity={intensity}
        aria-label="오늘 수업"
        className="rounded-[14px] border border-slate-300 bg-white px-3 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.07)] sm:px-4"
      >
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">오늘 수업</p>
        <div className="grid gap-1.5">
          {todayLessons.map((lesson) => (
            <div key={lesson.programId} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <Link href={`/spokedu-master/library/${lesson.programId}`} className="min-w-0 flex-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <span className="block truncate text-[13px] font-black text-[color:var(--spm-t)]">{lesson.programTitle}</span>
                <span className="text-[11px] font-bold text-slate-500">준비 확인 →</span>
              </Link>
              <Link
                href={`/spokedu-master/class-record?program=${lesson.programId}`}
                className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                기록
              </Link>
              {onRemoveTodayLesson ? (
                <button type="button" onClick={() => onRemoveTodayLesson(lesson.programId)} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`${lesson.programTitle} 오늘 수업에서 제거`}>
                  <X size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isSpomove) {
    return (
      <section
        data-dashboard-section="compact-ops-bar"
        data-anchor-kind={anchor.kind}
        data-anchor-intensity={intensity}
        aria-label="오늘 이어갈 작업"
        className="flex min-h-14 max-h-[84px] items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-2 shadow-[0_6px_16px_rgba(15,23,42,0.05)] sm:px-4"
      >
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
          <MonitorPlay size={11} />
          화면 활동
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-[color:var(--spm-t)]">
          {anchor.title}
        </p>
        <Link
          href={anchor.primary.href}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-black text-slate-800 transition-colors hover:border-slate-300 hover:bg-white"
        >
          {anchor.primary.label}
          <ArrowRight size={13} />
        </Link>
      </section>
    );
  }

  if (isEmpty) {
    return (
      <section
        data-dashboard-section="compact-ops-bar"
        data-anchor-kind={anchor.kind}
        data-anchor-intensity={intensity}
        aria-label="오늘 이어갈 작업"
        className="flex min-h-14 max-h-[84px] flex-wrap items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3 py-2 shadow-[0_6px_16px_rgba(15,23,42,0.05)] sm:gap-3 sm:px-4"
      >
        <p className="min-w-0 flex-1 text-[13px] font-bold text-[color:var(--spm-t)]">
          {anchor.status}
        </p>
        <span className="hidden text-[11px] font-semibold text-slate-500 sm:inline">{countsLabel}</span>
        <Link
          href={anchor.primary.href}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-black text-slate-800 transition-colors hover:border-slate-300 hover:bg-white"
        >
          {anchor.primary.label}
          <ArrowRight size={13} />
        </Link>
      </section>
    );
  }

  return (
    <section
      data-dashboard-section="compact-ops-bar"
      data-anchor-kind={anchor.kind}
      data-anchor-intensity={intensity}
      aria-label="오늘 이어갈 작업"
      className="flex min-h-14 max-h-[84px] items-center gap-3 rounded-[14px] border border-slate-300 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.07)] sm:px-4"
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          <span>오늘 이어갈 작업</span>
          <span className="font-semibold normal-case tracking-normal text-slate-400">{countsLabel}</span>
        </p>
        <p className="mt-0.5 truncate text-[14px] font-black leading-tight text-[color:var(--spm-t)]">
          {anchor.title}
        </p>
      </div>
      <Link
        href={anchor.primary.href}
        className="spm-btn-primary inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[12px] font-black focus-visible:outline-none"
        title={anchor.status}
      >
        {anchor.primary.label}
        <ArrowRight size={13} />
      </Link>
    </section>
  );
}
