'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { withNoteV2InteractiveViewport } from '@/app/lib/note-v2/viewport-core';

// The existing root layout is a Client Component with a hard-coded viewport <meta>.
// Scope the BlockNote mobile-keyboard change to the release/canonical note routes.
// The child BlockNote editor mounts only after the viewport is updated.
export default function NoteV2ViewportGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const metas = Array.from(document.head.querySelectorAll<HTMLMetaElement>('meta[name="viewport"]'));
    const created = metas.length === 0 ? document.createElement('meta') : null;
    if (created) {
      created.name = 'viewport';
      created.content = 'width=device-width, initial-scale=1';
      document.head.appendChild(created);
      metas.push(created);
    }
    const originals = metas.map((meta) => meta.getAttribute('content') ?? '');
    const updated = metas.map((meta, index) => {
      const content = withNoteV2InteractiveViewport(originals[index]);
      meta.setAttribute('content', content);
      return content;
    });
    setReady(true);
    return () => {
      metas.forEach((meta, index) => {
        if (created === meta) { if (meta.isConnected) meta.remove(); return; }
        // Avoid overwriting another route's viewport mutation on navigation.
        if (meta.isConnected && meta.getAttribute('content') === updated[index]) {
          meta.setAttribute('content', originals[index]);
        }
      });
    };
  }, []);
  if (!ready) return <div role="status" className="grid min-h-[60dvh] place-items-center text-sm text-neutral-500">노트 화면 준비 중…</div>;
  return <>{children}</>;
}
