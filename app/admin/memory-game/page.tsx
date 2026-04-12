'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const MemoryGameApp = dynamic(
  () => import('./MemoryGameApp').then((m) => m.default),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">SPOMOVE 로딩 중...</div> }
);

export default function MemoryGamePage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') ?? undefined;
  const levelRaw = Number(searchParams.get('level') ?? '');
  const level = Number.isFinite(levelRaw) && levelRaw > 0 ? levelRaw : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="shrink-0 border-b border-slate-700 bg-slate-950 px-4 py-2">
        <Link
          href="/admin/iiwarmup/spomove"
          className="text-sm font-semibold text-blue-400 hover:underline"
        >
          ← SPOMOVE 허브
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <MemoryGameApp initialMode={mode} initialLevel={level} />
      </div>
    </div>
  );
}
