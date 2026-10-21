import { Suspense } from 'react';
import NoteV2Loader from './_v2/NoteV2Loader';

export default function AdminNotePage() {
  return <Suspense fallback={<div role="status" className="p-8 text-sm text-neutral-500">노트 불러오는 중…</div>}>
    <NoteV2Loader basePath="/admin/note" />
  </Suspense>;
}
