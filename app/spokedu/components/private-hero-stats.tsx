'use client';

import { useEffect, useState } from 'react';
import {
  PRIVATE_COUNTER_BASE_DATE,
  PRIVATE_COUNTER_BASE_SESSIONS,
  PRIVATE_COUNTER_BASE_STUDENTS,
  PRIVATE_COUNTER_DAILY_SESSIONS,
  PRIVATE_COUNTER_DAILY_STUDENTS,
} from '../data/private-page';

function getCounterTargets() {
  const base = new Date(`${PRIVATE_COUNTER_BASE_DATE}T00:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.max(0, Math.floor((today - base) / (24 * 60 * 60 * 1000)));
  return {
    students: PRIVATE_COUNTER_BASE_STUDENTS + days * PRIVATE_COUNTER_DAILY_STUDENTS,
    sessions: PRIVATE_COUNTER_BASE_SESSIONS + days * PRIVATE_COUNTER_DAILY_SESSIONS,
  };
}

function useCountUp(target: number, durationMs = 1400): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const easeOut = 1 - (1 - t) ** 2;
      setValue(Math.round(target * easeOut));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, durationMs]);

  return value;
}

type PrivateHeroStatsProps = {
  compact?: boolean;
};

export function PrivateHeroStats({ compact = false }: PrivateHeroStatsProps) {
  const { students, sessions } = getCounterTargets();
  const displayStudents = useCountUp(students);
  const displaySessions = useCountUp(sessions);

  return (
    <div
      className={`grid grid-cols-2 gap-2.5 ${compact ? 'w-full sm:w-auto sm:min-w-[14rem]' : 'mt-5 sm:max-w-sm'}`}
      aria-live="polite"
      aria-label="누적 운영 지표"
    >
      <div className="rounded-xl border border-violet-100 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3">
        <p className="text-base font-bold tabular-nums text-slate-950 sm:text-lg">
          {displaySessions.toLocaleString()}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-600 sm:text-xs">누적 수업 (회)</p>
      </div>
      <div className="rounded-xl border border-violet-100 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3">
        <p className="text-base font-bold tabular-nums text-slate-950 sm:text-lg">
          {displayStudents.toLocaleString()}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-600 sm:text-xs">수업 받은 아이 (명)</p>
      </div>
    </div>
  );
}

export function PrivateHeroTrustBand({ trustBadge }: { trustBadge: string }) {
  return (
    <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/60 via-white to-white px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-4">
      <p className="inline-flex items-center gap-2 text-xs font-semibold leading-snug text-violet-900 sm:max-w-[55%] sm:text-sm">
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] text-violet-700"
        >
          ✓
        </span>
        {trustBadge}
      </p>
      <PrivateHeroStats compact />
    </div>
  );
}
