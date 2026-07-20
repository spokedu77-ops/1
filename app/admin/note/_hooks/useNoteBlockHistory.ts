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
import {
  buildHistoryTransactionNextBlocks,
  buildHistoryPersistSteps,
  buildHistoryTransactionPlan,
  buildRestoreBlocksFieldPatches,
} from './noteHistoryTransactionPlan';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
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
  documentEngine: NoteDocumentEngineApi;
  noteUndo: NoteUndo;
  setError: (error: string | null) => void;
  setPendingDeleteUndo: (blockId: string | null) => void;
  clearContentUndoSession: () => void;
}) {
  const {
    blocksRef,
    documentEngine,
    noteUndo,
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
    if (entry.kind === 'block-transaction') {
      const current = mergeBlocksWithStoreContent(blocksRef.current);
      const plan = buildHistoryTransactionPlan(current, entry.after);

      try {
        const restoredById = new Map<string, NoteBlock>();
        for (const step of buildHistoryPersistSteps(plan)) {
          if (step.type === 'softDelete') {
            await documentEngine.persistSoftDelete({
              ids: step.ids,
              blocks: step.blocks,
            });
            continue;
          }
          if (step.type === 'restoreRoots') {
            for (const root of step.roots) {
              const restored = await documentEngine.persistRestoreBlock(root.id);
              restored.forEach((block) => restoredById.set(block.id, block));
            }
            continue;
          }
          if (step.type === 'patchFields') {
            await documentEngine.persistFieldPatches(step.patches);
          }
        }

        const next = buildHistoryTransactionNextBlocks({
          current,
          target: entry.after,
          plan,
          restoredById,
        });
        documentEngine.replaceBlocks(next);
      } catch (e) {
        devLogger.error('[Note] history block-transaction', e);
        documentEngine.replaceBlocks(current);
        setError(e instanceof Error ? e.message : '실행 취소에 실패했습니다.');
      }
      return;
    }
    if (entry.kind === 'restore-blocks') {
      const current = mergeBlocksWithStoreContent(blocksRef.current);
      const next = applyRestoreBlockSnapshots(current, entry.snapshots);
      try {
        await documentEngine.persistFieldPatches(buildRestoreBlocksFieldPatches(entry.snapshots));
        documentEngine.replaceBlocks(next);
        const active = useNoteBlockStore.getState().activeEditor;
        if (active && entry.snapshots.some((snapshot) => snapshot.id === active.blockId)) {
          const restore = active;
          useNoteBlockStore.getState().setActiveEditor(null);
          requestAnimationFrame(() => {
            useNoteBlockStore.getState().setActiveEditor(restore);
          });
        }
      } catch (e) {
        devLogger.error('[Note] history restore-blocks', e);
        documentEngine.replaceBlocks(current);
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
  }, [blocksRef, documentEngine, setError, setPendingDeleteUndo]);

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
