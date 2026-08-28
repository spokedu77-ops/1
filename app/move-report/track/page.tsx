'use client';

import Link from 'next/link';

export default function MoveTrackDashboardPage() {
  return (
    <main className="mr-page mr-track-page">
      <div className="grain" aria-hidden />
      <div className="mr-page-inner mr-content-max">
        <header className="mr-track-header">
          <p className="mr-coach-kicker">MOVE TRACK</p>
          <h1 className="mr-track-title">오늘의 움직임 경험을 기록합니다.</h1>
          <p className="mr-track-sub">
            Participation before Performance — Typical Performance를 기록하고, Meaningful Change는 관찰 노트에
            남깁니다.
          </p>
        </header>

        <div className="mr-track-actions">
          <Link href="/move-report/track/sessions/new" className="btn-fire mr-track-primary">
            수업 기록 시작
          </Link>
          <Link href="/move-report/track/programs" className="btn-ghost mr-track-secondary">
            지난 기록 보기
          </Link>
          <Link href="/move-report/profile" className="btn-ghost mr-track-secondary">
            MOVE PROFILE
          </Link>
        </div>

        <p className="mr-track-foot">
          Scoring Manual v0.1 Field Pilot ·{' '}
          <Link href="/move-report" className="mr-track-link">
            MOVE REPORT 홈
          </Link>
        </p>
      </div>
    </main>
  );
}
