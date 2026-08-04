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
  buildHistoryTransactionPlan,
  buildRestoreBlocksFieldPatches,
} from './noteHistoryTransactionPlan';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import type { NoteBlockCommandResult } from '../_lib/noteBlockCommands';
import type { NoteBlock } from '../_lib/types';
import { markPendingBlockDeletes } from '../_lib/noteReconcileIdle';
import { removeStructuralExcludeIds } from '../_lib/noteStructuralExcludeRegistry';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

type DeleteBlockHandler = (
  block: NoteBlock,
  focusPrevious?: boolean,
  skipDeleteUndo?: boolean,
) => Promise<boolean>;

type RestoreBlockHandler = (block: NoteBlock) => Promise<boolean>;

function historyCommandFromSnapshots(input: {
  next: NoteBlock[];
  patches: ReturnType<typeof buildRestoreBlocksFieldPatches>;
  removedBlocks?: NoteBlock[];
  affectedIds?: string[];
}): NoteBlockCommandResult {
  const removedBlocks = input.removedBlocks ?? [];
  const affectedIds = input.affectedIds ?? [
    ...new Set([
      ...input.patches.map((patch) => patch.id),
      ...removedBlocks.map((block) => block.id),
    ]),
  ];
  return {
    nextBlocks: input.next,
    affectedIds,
    orders: input.patches.map((patch) => ({
      id: patch.id,
      order_index: patch.order_index ?? 0,
    })),
    fieldPatches: input.patches,
    createdBlocks: [],
    removedBlocks,
  };
}

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

  const applyNoteHistoryEntry = useCallback(async (entry: NoteHistoryEntry | null): Promise<boolean> => {
    if (!entry) return false;
    if (entry.kind === 'block-transaction') {
      const current = mergeBlocksWithStoreContent(blocksRef.current);
      const plan = buildHistoryTransactionPlan(current, entry.after);

      try {
        const restoredById = new Map<string, NoteBlock>();
        for (const root of plan.restoreRoots) {
          const restored = await documentEngine.persistRestoreBlock(root.id);
          restored.forEach((block) => restoredById.set(block.id, block));
        }

        const next = buildHistoryTransactionNextBlocks({
          current,
          target: entry.after,
          plan,
          restoredById,
        });
        const currentById = new Map(current.map((block) => [block.id, block]));
        const removedBlocks = plan.deleteIds
          .map((id) => currentById.get(id))
          .filter((block): block is NoteBlock => Boolean(block));
        // product delete와 동일: apply 전 leave-exclude — enqueue 전 pull 부활 차단
        if (removedBlocks.length > 0 && current[0]?.document_id) {
          markPendingBlockDeletes(
            current[0].document_id,
            removedBlocks.map((block) => block.id),
          );
        }
        await documentEngine.applyStructureCommand(historyCommandFromSnapshots({
          next,
          patches: plan.fieldPatches,
          removedBlocks,
          affectedIds: [...plan.scopeIds],
        }));
        return true;
      } catch (e) {
        devLogger.error('[Note] history block-transaction', e);
        setError(e instanceof Error ? e.message : '실행 취소에 실패했습니다.');
        return false;
      }
    }
    if (entry.kind === 'restore-blocks') {
      const current = mergeBlocksWithStoreContent(blocksRef.current);
      const activeDocumentId = current[0]?.document_id
        ?? useNoteBlockStore.getState().activeDocumentId
        ?? null;
      const restoreIds = entry.snapshots.map((snapshot) => snapshot.id);
      const isLeave = Boolean(
        activeDocumentId
        && entry.snapshots.some(
          (snapshot) => snapshot.document_id !== activeDocumentId,
        ),
      );
      const next = isLeave
        ? current.filter((block) => !restoreIds.includes(block.id))
        : applyRestoreBlockSnapshots(current, entry.snapshots);
      try {
        if (isLeave) {
          if (activeDocumentId) markPendingBlockDeletes(activeDocumentId, restoreIds);
        } else if (activeDocumentId) {
          // reclaim: 미ack leave에서 해당 id만 strip — 형제 leave outbound 통삭제 금지
          await documentEngine.cancelPendingOutboundLeavesForBlockIds(restoreIds);
          removeStructuralExcludeIds(activeDocumentId, restoreIds);
        }
        const leaveCompanionPatches = isLeave ? (entry.companionPatches ?? []) : [];
        await documentEngine.applyStructureCommand(historyCommandFromSnapshots({
          next,
          patches: [
            ...buildRestoreBlocksFieldPatches(entry.snapshots),
            ...leaveCompanionPatches,
          ],
          affectedIds: [
            ...restoreIds,
            ...leaveCompanionPatches.map((patch) => patch.id),
          ],
        }));
        if (!isLeave) {
          const active = useNoteBlockStore.getState().activeEditor;
          if (active && entry.snapshots.some((snapshot) => snapshot.id === active.blockId)) {
            const restore = active;
            useNoteBlockStore.getState().setActiveEditor(null);
            requestAnimationFrame(() => {
              useNoteBlockStore.getState().setActiveEditor(restore);
            });
          }
        }
        return true;
      } catch (e) {
        if (activeDocumentId) {
          if (isLeave) removeStructuralExcludeIds(activeDocumentId, restoreIds);
          else markPendingBlockDeletes(activeDocumentId, restoreIds);
        }
        devLogger.error('[Note] history restore-blocks', e);
        setError(e instanceof Error ? e.message : '실행 취소 실패');
        return false;
      }
    }
    if (entry.kind === 'delete-block') {
      const live = blocksRef.current.find((b) => b.id === entry.snapshot.id);
      if (live && deleteBlockRef.current) {
        return deleteBlockRef.current(live, false, true);
      }
      return false;
    }
    if (entry.kind === 'create-block') {
      setPendingDeleteUndo(null);
      if (restoreBlockRef.current) {
        return restoreBlockRef.current(entry.snapshot);
      }
      return false;
    }
    return false;
  }, [blocksRef, documentEngine, setError, setPendingDeleteUndo]);

  const runNoteUndo = useCallback(async () => {
    await commitNoteDocumentBeforeLeave();
    const entry = noteUndo.popUndo();
    if (!entry) return;
    clearContentUndoSession();
    const inverse = buildNoteHistoryInverse(entry, mergeBlocksWithStoreContent(blocksRef.current));
    const ok = await applyNoteHistoryEntry(entry);
    if (!ok) {
      noteUndo.pushUndoNoClear(entry);
      return;
    }
    if (inverse) noteUndo.pushRedo(inverse);
  }, [applyNoteHistoryEntry, blocksRef, clearContentUndoSession, noteUndo]);

  const runNoteRedo = useCallback(async () => {
    await commitNoteDocumentBeforeLeave();
    const entry = noteUndo.popRedo();
    if (!entry) return;
    clearContentUndoSession();
    const inverse = buildNoteHistoryInverse(entry, mergeBlocksWithStoreContent(blocksRef.current));
    const ok = await applyNoteHistoryEntry(entry);
    if (!ok) {
      noteUndo.pushRedo(entry);
      return;
    }
    if (inverse) noteUndo.pushUndoNoClear(inverse);
  }, [applyNoteHistoryEntry, blocksRef, clearContentUndoSession, noteUndo]);

  return {
    bindHistoryHandlers,
    applyNoteHistoryEntry,
    runNoteUndo,
    runNoteRedo,
  };
}
