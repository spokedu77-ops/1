'use client';

import { useEffect, useRef } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { NoteCollaborator, NoteDocument } from '../_lib/types';

const BACKLINKS_CACHE_MS = 30_000;

export function scheduleIdle(task: () => void, fallbackMs = 1200): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => task(), { timeout: fallbackMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, Math.min(fallbackMs, 600));
  return () => window.clearTimeout(id);
}

/** presence — 본문 블록 표시 후 지연 로드 */
export function useDeferredNoteMeta(
  selectedId: string | null,
  backlinksExpanded: boolean,
  setCollaborators: (value: NoteCollaborator[]) => void,
  setBacklinks: (value: NoteDocument[]) => void,
  setBacklinksLoading: (loading: boolean) => void,
) {
  const backlinksCacheRef = useRef(new Map<string, { docs: NoteDocument[]; fetchedAt: number }>());

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
      setBacklinksLoading(false);
      return;
    }
    if (!backlinksExpanded) return;

    const cached = backlinksCacheRef.current.get(selectedId);
    if (cached && Date.now() - cached.fetchedAt < BACKLINKS_CACHE_MS) {
      setBacklinks(cached.docs);
      setBacklinksLoading(false);
      return;
    }

    let alive = true;
    setBacklinksLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/note/documents?backlinksFor=${encodeURIComponent(selectedId)}&limit=50`,
          { credentials: 'include' },
        );
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { backlinks?: NoteDocument[] };
        const docs = json.backlinks ?? [];
        if (!alive) return;
        backlinksCacheRef.current.set(selectedId, { docs, fetchedAt: Date.now() });
        setBacklinks(docs);
      } catch (e) {
        devLogger.error('[Note] backlinks', e);
      } finally {
        if (alive) setBacklinksLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [backlinksExpanded, selectedId, setBacklinks, setBacklinksLoading]);
}
