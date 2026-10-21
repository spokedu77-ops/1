import { Suspense } from 'react';
import NoteV2Loader from '../note/_v2/NoteV2Loader';

export const metadata = { title: 'SPOKEDU 노트 V2 — 전환 전 최종 검수' };

export default function NoteV2ReleasePage() {
  return <Suspense fallback={<div role="status" className="p-8 text-sm text-neutral-500">노트 준비 중…</div>}>
    <NoteV2Loader basePath="/admin/note-v2-release" />
  </Suspense>;
}
