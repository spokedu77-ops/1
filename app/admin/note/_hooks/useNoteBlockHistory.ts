'use client';

import { useCallback, useRef } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  buildNoteHistoryInverse,
  type NoteHistoryEntry,
  type useNoteBlockUndo,
} from './useNoteBlockUndo';
import {
  applyRestoreBlockSnapshots,
  commitNoteDocumentBeforeLeave,
  mergeBlocksWithStoreContent,
} from '../_lib/noteBlockStateMerge';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { patchNoteBlocks } from '../_lib/noteBlocksApi';
import type { NoteBlock } from '../_lib/types';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

type DeleteBlockHandler = (
  block: NoteBlock,
  focusPrevious?: boolean,
  skipDeleteUndo?: boolean,
) => Promise<void>;

type RestoreBlockHandler = (block: NoteBlock) => Promise<void>;

export function useNoteBlockHistory(options: {
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  noteUndo: NoteUndo;
  triggerSave: () => void;
  setError: (error: string | null) => void;
  setPendingDeleteUndo: (blockId: string | null) => void;
  clearContentUndoSession: () => void;
}) {
  const {
    blocksRef,
    setBlocks,
    noteUndo,
    triggerSave,
    setError,
    setPendingDeleteUndo,
    clearContentUndoSession,
  } = options;

  const deleteBlockRef = useRef<DeleteBlockHandler | null>(null);
  const restoreBlockRef = useRef<RestoreBlockHandler | null>(null);

  const bindHistoryHandlers = useCallback((handlers: {
    handleDeleteBlock: DeleteBlockHandler;
    handleRestoreBlockFromTrash: RestoreBlockHandler;
  }) => {
    deleteBlockRef.current = handlers.handleDeleteBlock;
    restoreBlockRef.current = handlers.handleRestoreBlockFromTrash;
  }, []);

  const applyNoteHistoryEntry = useCallback(async (entry: NoteHistoryEntry | null) => {
    if (!entry) return;
    if (entry.kind === 'restore-blocks') {
      const next = applyRestoreBlockSnapshots(blocksRef.current, entry.snapshots);
      blocksRef.current = next;
      useNoteBlockStore.getState().hydrate(next);
      setBlocks(next);
      const active = useNoteBlockStore.getState().activeEditor;
      if (active && entry.snapshots.some((snapshot) => snapshot.id === active.blockId)) {
        const restore = active;
        useNoteBlockStore.getState().setActiveEditor(null);
        requestAnimationFrame(() => {
          useNoteBlockStore.getState().setActiveEditor(restore);
        });
      }
      try {
        await patchNoteBlocks(entry.snapshots.map((snapshot) => ({
          id: snapshot.id,
          type: snapshot.type,
          content: snapshot.content,
          parent_block_id: snapshot.parent_block_id,
          order_index: snapshot.order_index,
        })));
        triggerSave();
      } catch (e) {
        devLogger.error('[Note] history restore-blocks', e);
        setError(e instanceof Error ? e.message : '실행 취소 실패');
      }
      return;
    }
    if (entry.kind === 'delete-block') {
      const live = blocksRef.current.find((b) => b.id === entry.snapshot.id);
      if (live && deleteBlockRef.current) {
        await deleteBlockRef.current(live, false, true);
      }
      return;
    }
    if (entry.kind === 'create-block') {
      setPendingDeleteUndo(null);
      if (restoreBlockRef.current) {
        await restoreBlockRef.current(entry.snapshot);
      }
    }
  }, [blocksRef, setBlocks, setError, setPendingDeleteUndo, triggerSave]);

  const runNoteUndo = useCallback(async () => {
    await commitNoteDocumentBeforeLeave();
    const entry = noteUndo.popUndo();
    if (!entry) return;
    clearContentUndoSession();
    const inverse = buildNoteHistoryInverse(entry, mergeBlocksWithStoreContent(blocksRef.current));
    await applyNoteHistoryEntry(entry);
    if (inverse) noteUndo.pushRedo(inverse);
  }, [applyNoteHistoryEntry, blocksRef, clearContentUndoSession, noteUndo]);

  const runNoteRedo = useCallback(async () => {
    await commitNoteDocumentBeforeLeave();
    const entry = noteUndo.popRedo();
    if (!entry) return;
    clearContentUndoSession();
    const inverse = buildNoteHistoryInverse(entry, mergeBlocksWithStoreContent(blocksRef.current));
    await applyNoteHistoryEntry(entry);
    if (inverse) noteUndo.pushUndoNoClear(inverse);
  }, [applyNoteHistoryEntry, blocksRef, clearContentUndoSession, noteUndo]);

  return {
    bindHistoryHandlers,
    applyNoteHistoryEntry,
    runNoteUndo,
    runNoteRedo,
  };
}
