'use client';

import { Suspense } from 'react';
import SessionNewClient from '../../components/SessionNewClient';

export default function MoveTrackSessionNewPage() {
  return (
    <main className="mr-page mr-track-page">
      <div className="grain" aria-hidden />
      <div className="mr-page-inner mr-content-max">
        <Suspense fallback={<p className="mr-track-sub">로딩 중…</p>}>
          <SessionNewClient />
        </Suspense>
      </div>
    </main>
  );
}
