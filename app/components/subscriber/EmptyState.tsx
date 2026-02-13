'use client';

import { CalendarClock } from 'lucide-react';

export interface EmptyStateProps {
  /** 이번 주 표시용 (예: "2025년 2월 · 2주차") */
  weekLabel?: string;
}

export function EmptyState({ weekLabel }: EmptyStateProps) {
  return (
    <section
      className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center ring-1 ring-neutral-800/50 transition-colors duration-200"
      aria-label="프로그램 없음"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800/80">
        <CalendarClock size={28} className="text-neutral-500" strokeWidth={1.5} />
      </div>
      <p className="text-base font-medium text-neutral-300">
        이번 주에 배정된 프로그램이 없어요
      </p>
      {weekLabel && (
        <p className="mt-2 text-sm text-neutral-500">{weekLabel}</p>
      )}
      <p className="mt-4 text-sm text-neutral-400">
        다음 주를 기대해 주세요
      </p>
    </section>
  );
}
