'use client';
import dynamic from 'next/dynamic';
const Workspace = dynamic(() => import('./NoteStage4Workspace'), { ssr: false,
  loading: () => <div role="status" className="grid min-h-[80dvh] place-items-center text-sm text-neutral-500">노트 V2 불러오는 중…</div>,
});
export default function NoteStage4Loader() { return <Workspace />; }
