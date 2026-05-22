'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const MemoryGameApp = dynamic(
  () => import('./MemoryGameApp').then((m) => m.default),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">SPOMOVE 트레이닝 로딩 중…</div> }
);

function MemoryGamePageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') ?? undefined;
  const embed = searchParams.get('embed') === '1';
  const levelRaw = Number(searchParams.get('level') ?? '');
  const level = Number.isFinite(levelRaw) && levelRaw > 0 ? levelRaw : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      {!embed ? (
        <div className="shrink-0 border-b border-slate-700 bg-slate-950 px-4 py-2">
          <Link
            href="/admin/spomove/training"
            className="text-sm font-semibold text-blue-400 hover:underline"
          >
            ← SPOMOVE 트레이닝
          </Link>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <MemoryGameApp initialMode={mode} initialLevel={level} embed={embed} />
      </div>
    </div>
  );
}

export default function MemoryGamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-slate-900">
          <div className="flex min-h-0 flex-1 items-center justify-center text-white">로딩 중…</div>
        </div>
      }
    >
      <MemoryGamePageContent />
    </Suspense>
  );
}
