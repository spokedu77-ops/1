import { Suspense } from 'react';
import NoteStage4Loader from './NoteStage4Loader';
export const metadata = { title: 'SPOKEDU NOTE V2 — 페이지 관리 실험실' };
export default function NoteStage4Page() {
  return <Suspense fallback={<div role="status" className="p-8 text-sm text-neutral-500">노트 불러오는 중…</div>}><NoteStage4Loader/></Suspense>;
}
