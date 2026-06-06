'use client';

import { useEffect } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { NoteCollaborator, NoteDocument } from '../_lib/types';

function scheduleIdle(task: () => void, fallbackMs = 1200): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => task(), { timeout: fallbackMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, Math.min(fallbackMs, 600));
  return () => window.clearTimeout(id);
}

/** presence·backlinks — 본문 블록 표시 후 지연 로드 */
export function useDeferredNoteMeta(
  selectedId: string | null,
  setCollaborators: (value: NoteCollaborator[]) => void,
  setBacklinks: (value: NoteDocument[]) => void,
) {
  useEffect(() => {
    if (!selectedId) {
      setCollaborators([]);
      return;
    }
    let alive = true;
    const cancel = scheduleIdle(() => {
      void (async () => {
        try {
          const res = await fetch('/api/admin/note/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ documentId: selectedId }),
          });
          if (!res.ok || !alive) return;
          const json = (await res.json()) as { collaborators?: NoteCollaborator[] };
          if (alive) setCollaborators(json.collaborators ?? []);
        } catch (e) {
          devLogger.error('[Note] presence POST', e);
        }
      })();
    }, 1500);
    return () => {
      alive = false;
      cancel();
    };
  }, [selectedId, setCollaborators]);

  useEffect(() => {
    if (!selectedId) {
      setBacklinks([]);
      return;
    }
    let alive = true;
    const cancel = scheduleIdle(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/admin/note/documents?backlinksFor=${encodeURIComponent(selectedId)}&limit=50`,
            { credentials: 'include' },
          );
          if (!res.ok || !alive) return;
          const json = (await res.json()) as { backlinks?: NoteDocument[] };
          if (alive) setBacklinks(json.backlinks ?? []);
        } catch (e) {
          devLogger.error('[Note] backlinks', e);
        }
      })();
    }, 2000);
    return () => {
      alive = false;
      cancel();
    };
  }, [selectedId, setBacklinks]);
}
