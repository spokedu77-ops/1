'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ProgramRow = {
  id: string;
  program_name: string;
  status: string;
  total_sessions: number;
};

export default function MoveTrackProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/move-report/track/programs', { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '불러오기 실패');
        if (!cancelled) setPrograms(json.data ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mr-page mr-track-page">
      <div className="grain" aria-hidden />
      <div className="mr-page-inner mr-content-max">
        <Link href="/move-report/track" className="btn-ghost mr-coach-back" style={{ textDecoration: 'none', marginBottom: 20 }}>
          ← MOVE TRACK
        </Link>
        <h1 className="mr-track-title" style={{ fontSize: '1.35rem' }}>
          사업 · 회기
        </h1>
        {loading && <p className="mr-track-sub">불러오는 중…</p>}
        {error && <p className="mr-track-error">{error}</p>}
        {!loading && !error && programs.length === 0 && (
          <p className="mr-track-sub">배정된 사업이 없습니다.</p>
        )}
        <ul className="mr-track-program-list">
          {programs.map((p) => (
            <li key={p.id}>
              <Link href={`/move-report/track/programs/${p.id}`} className="mr-track-program-card">
                <span className="mr-track-program-name">{p.program_name}</span>
                <span className="mr-track-program-meta">
                  {p.status} · {p.total_sessions}회
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
