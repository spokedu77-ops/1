'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const noteLoading = (
  <div className="flex h-[calc(var(--viewport-height-px,100dvh)-3rem-env(safe-area-inset-top,0px))] items-center justify-center bg-[#F8FAFC] text-sm font-bold text-slate-400 min-[1200px]:h-[var(--viewport-height-px,100dvh)]">
    노트 불러오는 중...
  </div>
);

const AdminNotePageContent = dynamic(
  () => import('./_lite/NoteLiteApp').then((m) => m.NoteLiteApp),
  {
    ssr: false,
    loading: () => noteLoading,
  },
);

export default function AdminNotePage() {
  return (
    <Suspense fallback={noteLoading}>
      <AdminNotePageContent />
    </Suspense>
  );
}
