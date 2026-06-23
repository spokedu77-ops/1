'use client';

import { useCallback, useEffect, useRef } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import { normalizeListBlockContentRecord } from '../_components/noteBulletInput';
import { registerNoteContentFlush } from '../_lib/noteBlockStateMerge';
import { patchNoteBlocks } from '../_lib/noteBlocksApi';
import type { NoteBlock } from '../_lib/types';

const CONTENT_BATCH_TIMER_KEY = '__content_batch__';

export function useNoteBlockContentSave(options: {
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  saveTimersRef: React.MutableRefObject<Record<string, number | undefined>>;
  triggerSave: () => void;
}) {
  const { blocksRef, saveTimersRef, triggerSave } = options;
  const pendingContentPatchesRef = useRef<Map<string, unknown>>(new Map());

  const flushContentPatches = useCallback(async () => {
    const pending = pendingContentPatchesRef.current;
    if (pending.size === 0) return;
    const snapshot = new Map(pending);
    const updates = [...snapshot.entries()].map(([id, content]) => {
      const block = blocksRef.current.find((b) => b.id === id);
      let record = (content ?? {}) as Record<string, unknown>;
      if (block && (block.type === 'bulletList' || block.type === 'numberedList')) {
        record = normalizeListBlockContentRecord(record);
      }
      return { id, content: record };
    });
    pending.clear();
    try {
      await patchNoteBlocks(updates);
      triggerSave();
    } catch (e) {
      snapshot.forEach((content, id) => {
        pendingContentPatchesRef.current.set(id, content);
      });
      devLogger.error('[Note] batch updateBlock', e);
    }
  }, [blocksRef, triggerSave]);

  const scheduleBlockContentSave = useCallback((blockId: string, content: unknown) => {
    pendingContentPatchesRef.current.set(blockId, content);
    const timers = saveTimersRef.current;
    if (timers[CONTENT_BATCH_TIMER_KEY]) clearTimeout(timers[CONTENT_BATCH_TIMER_KEY]);
    timers[CONTENT_BATCH_TIMER_KEY] = window.setTimeout(() => {
      delete timers[CONTENT_BATCH_TIMER_KEY];
      void flushContentPatches();
    }, 600);
  }, [flushContentPatches, saveTimersRef]);

  const clearPendingContentPatch = useCallback((blockId: string) => {
    pendingContentPatchesRef.current.delete(blockId);
  }, []);

  useEffect(() => {
    registerNoteContentFlush(flushContentPatches);
    return () => registerNoteContentFlush(null);
  }, [flushContentPatches]);

  return {
    scheduleBlockContentSave,
    clearPendingContentPatch,
    flushContentPatches,
  };
}
