import { Suspense } from 'react';
import NoteStage5Loader from './NoteStage5Loader';
export const metadata = { title: 'SPOKEDU NOTE V2 — 빠른 탐색 실험실' };
export default function NoteStage5Page() {
  return <Suspense fallback={<div role="status" className="p-8 text-sm text-neutral-500">노트 불러오는 중…</div>}><NoteStage5Loader/></Suspense>;
}
