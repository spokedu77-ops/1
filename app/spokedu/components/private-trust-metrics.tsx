'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PRIVATE_COUNTER_BASE_DATE,
  PRIVATE_COUNTER_BASE_SESSIONS,
  PRIVATE_COUNTER_BASE_STUDENTS,
  PRIVATE_COUNTER_DAILY_SESSIONS,
  PRIVATE_COUNTER_DAILY_STUDENTS,
  privatePage,
} from '../data/private-page';
import { koreanLineBreak } from '../lib/ui-classes';

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

function useCountUp(target: number, active: boolean, durationMs = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 2;
      setValue(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, active, durationMs]);

  return value;
}

export function PrivateTrustMetrics() {
  const { students, sessions } = getCounterTargets();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setActive(true);
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const sessionCount = useCountUp(sessions, active);
  const studentCount = useCountUp(students, active);

  return (
    <div ref={ref}>
      <span className="inline-flex items-center rounded-full bg-teal-600/10 px-3.5 py-1.5 text-xs font-semibold text-teal-900">
        {privatePage.hero.trustBadge}
      </span>
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
        {privatePage.trustMetrics.eyebrow}
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8" aria-live="polite">
        {privatePage.trustMetrics.items.map((item) => {
          const value =
            item.kind === 'sessions'
              ? (active ? sessionCount : sessions).toLocaleString()
              : item.kind === 'students'
                ? (active ? studentCount : students).toLocaleString()
                : item.value;
          return (
            <div key={item.id}>
              <dt className="text-2xl font-bold tracking-tight text-stone-950 sm:text-[1.75rem]">{value}</dt>
              <dd className={`mt-1 text-sm text-stone-600 ${koreanLineBreak}`}>{item.label}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
