'use client';

import Link from 'next/link';
import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';

function MoveTrackSessionNewInner() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  return (
    <>
      <Link href={programId ? `/move-report/track/programs/${programId}` : '/move-report/track'} className="btn-ghost mr-coach-back" style={{ textDecoration: 'none', marginBottom: 20 }}>
        ← 돌아가기
      </Link>
      <h1 className="mr-track-title" style={{ fontSize: '1.35rem' }}>
        회기 기록 시작
      </h1>
      <p className="mr-track-sub">
        Phase 1 — 프로그램 선택 · 회기 번호 · 수업일 · 주요 활동 입력 UI는 Scoring Manual 필드 순서(SM-02 참여기회 band
        우선)로 연결됩니다.
      </p>
      {programId && (
        <p className="mr-track-sub">
          programId: <code>{programId}</code>
        </p>
      )}
    </>
  );
}

export default function MoveTrackSessionNewPage() {
  return (
    <main className="mr-page mr-track-page">
      <div className="grain" aria-hidden />
      <div className="mr-page-inner mr-content-max">
        <Suspense fallback={<p className="mr-track-sub">로딩 중…</p>}>
          <MoveTrackSessionNewInner />
        </Suspense>
      </div>
    </main>
  );
}
