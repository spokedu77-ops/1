'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const noteLoading = (
  <div className="flex h-[var(--viewport-height-px,100dvh)] items-center justify-center bg-[#f7f7f5] text-sm text-neutral-500">
    노트 불러오는 중...
  </div>
);

const AdminNotePageContent = dynamic(
  () => import('./AdminNotePageContent'),
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
