'use client';

import { useCallback, useEffect } from 'react';
import { registerNoteContentFlush } from '../_lib/noteBlockStateMerge';
import type { NoteDocumentEngineApi } from './useNoteDocumentEngine';

export function useNoteBlockContentSave(options: {
  documentEngine: NoteDocumentEngineApi;
}) {
  const { documentEngine } = options;

  const scheduleBlockContentSave = useCallback((
    blockId: string,
    content: unknown,
    baseContent?: Record<string, unknown>,
  ) => {
    documentEngine.scheduleContentPatch(
      blockId,
      (content ?? {}) as Record<string, unknown>,
      baseContent,
    );
  }, [documentEngine]);

  const flushPersistQueue = useCallback(async () => {
    if (documentEngine.hasPendingContent()) {
      await documentEngine.flushContentPatches();
    }
    if (documentEngine.hasPendingPersist()) {
      await documentEngine.flushPersistQueue();
    }
  }, [documentEngine]);

  const clearPendingContentPatch = useCallback((blockId: string) => {
    documentEngine.clearContentPatch(blockId);
  }, [documentEngine]);

  useEffect(() => {
    registerNoteContentFlush(flushPersistQueue);
    return () => registerNoteContentFlush(null);
  }, [flushPersistQueue]);

  return {
    scheduleBlockContentSave,
    clearPendingContentPatch,
    flushPersistQueue,
  };
}
