'use client';

import dynamic from 'next/dynamic';

const Workspace = dynamic(() => import('./NoteStage3Workspace'), {
  ssr: false,
  loading: () => <div role="status" className="grid min-h-[75dvh] place-items-center text-sm text-neutral-500">노트 불러오는 중…</div>,
});

export default function NoteStage3Loader() { return <Workspace />; }
