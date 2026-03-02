'use client';

import dynamic from 'next/dynamic';

const MemoryGameApp = dynamic(
  () => import('./MemoryGameApp').then((m) => m.default),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">메모리게임 로딩 중...</div> }
);

export default function MemoryGamePage() {
  return <MemoryGameApp />;
}
