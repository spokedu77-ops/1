'use client';

import dynamic from 'next/dynamic';
import NoteV2ViewportGate from './NoteV2ViewportGate';
import type { NoteV2BasePath } from './NoteV2Workspace';

const Workspace = dynamic(() => import('./NoteV2Workspace'), {
  ssr: false,
  loading: () => <div role="status" className="grid min-h-[80dvh] place-items-center text-sm text-neutral-500">노트 V2 불러오는 중…</div>,
});

export default function NoteV2Loader({ basePath }: { basePath: NoteV2BasePath }) {
  return <NoteV2ViewportGate><Workspace basePath={basePath} /></NoteV2ViewportGate>;
}
