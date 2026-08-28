'use client';

import Link from 'next/link';
import { use } from 'react';

type Props = { params: Promise<{ id: string; childId: string }> };

/** Phase 1 — SM-02 band → structured fields 입력 UI (다음 구현) */
export default function MoveTrackChildRecordPage({ params }: Props) {
  const { id, childId } = use(params);

  return (
    <main className="mr-page mr-track-page">
      <div className="grain" aria-hidden />
      <div className="mr-page-inner mr-content-max">
        <Link href={`/move-report/track/sessions/${id}`} className="btn-ghost mr-coach-back" style={{ textDecoration: 'none', marginBottom: 20 }}>
          ← 아동 목록
        </Link>
        <h1 className="mr-track-title" style={{ fontSize: '1.35rem' }}>
          MOVE TRACK 입력
        </h1>
        <p className="mr-track-sub">
          출석 → 참여기회 band → Participation / Support / Independent Initiation / Self Re-engagement / FRW /
          Movement Domains / Observation Note (Scoring Manual v0.1 순서)
        </p>
        <p className="mr-track-sub" style={{ marginTop: 12, fontSize: '0.8rem' }}>
          session {id.slice(0, 8)}… · child {childId.slice(0, 8)}…
        </p>
      </div>
    </main>
  );
}
