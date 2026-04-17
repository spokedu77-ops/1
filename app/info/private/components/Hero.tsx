'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  COUNTER_BASE_DATE,
  COUNTER_BASE_STUDENTS,
  COUNTER_BASE_SESSIONS,
  COUNTER_DAILY_STUDENTS,
  COUNTER_DAILY_SESSIONS,
} from '../data/config';

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function getCounterTargets(): { students: number; sessions: number } {
  const base = new Date(COUNTER_BASE_DATE + 'T00:00:00').getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.max(0, Math.floor((today - base) / (24 * 60 * 60 * 1000)));
  return {
    students: COUNTER_BASE_STUDENTS + days * COUNTER_DAILY_STUDENTS,
    sessions: COUNTER_BASE_SESSIONS + days * COUNTER_DAILY_SESSIONS,
  };
}

function useCountUp(target: number, durationMs = 1800, startOnMount = true): number {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!startOnMount || started) return;
    setStarted(true);
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const easeOut = 1 - Math.pow(1 - t, 2);
      setValue(Math.round(target * easeOut));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, durationMs, startOnMount, started]);

  return value;
}

function HeroStats() {
  const { students, sessions } = getCounterTargets();
  const displayStudents = useCountUp(students);
  const displaySessions = useCountUp(sessions);

  return (
    <div className="pl-hero-stats" aria-live="polite">
      <div className="pl-hero-stat">
        <span className="pl-hero-stat-value">{displaySessions.toLocaleString()}</span>
        <span className="pl-hero-stat-label">누적 수업 (회)</span>
      </div>
      <div className="pl-hero-stat">
        <span className="pl-hero-stat-value">{displayStudents.toLocaleString()}</span>
        <span className="pl-hero-stat-label">수업 받은 아이 (명)</span>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="pl-hero">
      <div className="pl-container">
        <div className="pl-hero-content">
          <div className="pl-trust-badge">
            <ShieldIcon />
            연세대학교 체육교육 전문가 그룹
          </div>
          <HeroStats />
          <h1>
            <span className="pl-hero-title-line">즐거운 신체활동으로</span>
            <span className="pl-hero-title-line">
              <span className="pl-text-gradient">평생체육의 경험</span>을 선물합니다.
            </span>
          </h1>
          <div className="pl-hero-cta">
            <Link className="pl-btn pl-btn-outline" href="#diagnosis">
              우리 아이 성향 진단
            </Link>
            <Link className="pl-btn pl-btn-primary" href="#apply" style={{ color: '#09090b' }}>
              전문 상담 접수하기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
