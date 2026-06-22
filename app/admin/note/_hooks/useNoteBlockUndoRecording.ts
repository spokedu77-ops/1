'use client';

import { useCallback, useRef } from 'react';
import { mergeBlocksWithStoreContent } from '../_lib/noteBlockStateMerge';
import type { useNoteBlockUndo } from './useNoteBlockUndo';
import type { NoteBlock } from '../_lib/types';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

export function useNoteBlockUndoRecording(options: {
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  noteUndo: NoteUndo;
}) {
  const { blocksRef, noteUndo } = options;
  const contentUndoSessionRef = useRef<string | null>(null);

  const recordBlockUndo = useCallback((blockIds: string[]) => {
    noteUndo.pushRestoreBlocksUndo(mergeBlocksWithStoreContent(blocksRef.current), blockIds);
    contentUndoSessionRef.current = blockIds[0] ?? null;
  }, [blocksRef, noteUndo]);

  const recordContentUndoBeforeChange = useCallback((blockId: string) => {
    if (contentUndoSessionRef.current === blockId) return;
    noteUndo.pushRestoreBlocksUndo(mergeBlocksWithStoreContent(blocksRef.current), [blockId]);
    contentUndoSessionRef.current = blockId;
  }, [blocksRef, noteUndo]);

  const registerCreatedBlockUndo = useCallback((block: NoteBlock) => {
    noteUndo.pushDeleteBlockUndo(block);
  }, [noteUndo]);

  const clearContentUndoSession = useCallback(() => {
    contentUndoSessionRef.current = null;
  }, []);

  return {
    contentUndoSessionRef,
    recordBlockUndo,
    recordContentUndoBeforeChange,
    registerCreatedBlockUndo,
    clearContentUndoSession,
  };
}
