'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const AdminNotePageContent = dynamic(
  () => import('./AdminNotePageContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] text-sm text-neutral-500">
        노트 불러오는 중…
      </div>
    ),
  },
);

export default function AdminNotePage() {
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] text-sm text-neutral-500">
          노트 불러오는 중…
        </div>
      )}
    >
      <AdminNotePageContent />
    </Suspense>
  );
}
