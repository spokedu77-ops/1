'use client';

import dynamic from 'next/dynamic';
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

  return <MemoryGameApp initialMode={mode} initialLevel={level} />;
}
