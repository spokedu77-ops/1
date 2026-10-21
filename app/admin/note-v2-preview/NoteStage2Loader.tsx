'use client';

import dynamic from 'next/dynamic';

// BlockNote needs a browser DOM. Never server-side render the editor.
const NoteStage2Editor = dynamic(() => import('./NoteStage2Editor'), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[65dvh] place-items-center bg-white text-sm text-neutral-500" role="status">
      새 노트 편집기 불러오는 중…
    </div>
  ),
});

export default function NoteStage2Loader() {
  return <NoteStage2Editor />;
}
