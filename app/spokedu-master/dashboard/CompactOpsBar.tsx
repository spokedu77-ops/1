'use client';

import { ArrowRight, MonitorPlay, X } from 'lucide-react';
import Link from 'next/link';

import {
  getHomeAnchorIntensity,
  type HomeAnchor,
} from './homeOpsModel';

/**
 * 홈 상단 운영 바 — 콘텐츠(사진) 주인공을 이기면 안 됨.
 * 높이 체감 56~84px (max-h-[84px]). 140px+ 히어로 금지.
 * P0 계약: 확대 금지. P2는 내용 슬롯(today_lesson)만 교체.
 *
 * today_lesson 위계 (문서화 — 캡처 QA 전 UI 예감 수정 금지):
 * 1행: 오늘 + 수업명 1줄 truncate
 * 2행: 준비(강) / 기록(약) / X 아이콘(해제)
 * @see .cursor/rules/spokedu-master-home-freeze.mdc
 */
export function CompactOpsBar({
  anchor,
  recordCount,
  reportCount,
  onClearTodayLesson,
}: {
  anchor: HomeAnchor;
  recordCount: number;
  reportCount: number | null;
  onClearTodayLesson?: () => void;
}) {
  const intensity = getHomeAnchorIntensity(anchor.kind);
  const isSpomove = anchor.kind === 'spomove';
  const isEmpty = anchor.kind === 'empty';
  const isTodayLesson = anchor.kind === 'today_lesson';
  const countsLabel =
    reportCount === null
      ? `기록 ${recordCount}개`
      : `기록 ${recordCount}개 · 안내문 ${reportCount}개`;

  if (isTodayLesson) {
    return (
      <section
        data-dashboard-section="compact-ops-bar"
        data-anchor-kind={anchor.kind}
        data-anchor-intensity={intensity}
        aria-label="오늘 수업"
        className="flex min-h-14 max-h-[84px] items-center gap-2 rounded-[14px] border border-slate-300 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.07)] sm:gap-3 sm:px-4"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            오늘
          </p>
          <p className="mt-0.5 truncate text-[14px] font-black leading-tight text-[color:var(--spm-t)]">
            {anchor.title}
          </p>
        </div>
        <Link
          href={anchor.primary.href}
          className="spm-btn-primary inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-[12px] font-black focus-visible:outline-none"
        >
          {anchor.primary.label}
          <ArrowRight size={13} />
        </Link>
        <Link
          href={anchor.secondary.href}
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] font-black text-slate-700 hover:bg-white"
        >
          {anchor.secondary.label}
        </Link>
        {onClearTodayLesson ? (
          <button
            type="button"
            onClick={onClearTodayLesson}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800"
            aria-label="오늘 수업 해제"
            title="오늘 수업 해제"
          >
            <X size={14} />
          </button>
        ) : null}
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
