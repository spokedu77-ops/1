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
import { collectBlockForestIds } from '@/app/lib/note/noteBlockTree';
import { useNoteBlockStore } from '../_store/noteBlockStore';
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
      const scopeIds = new Set([
        ...entry.before.map((block) => block.id),
        ...entry.after.map((block) => block.id),
      ]);
      const targetIds = new Set(entry.after.map((block) => block.id));
      const currentScoped = current.filter((block) => scopeIds.has(block.id));
      const deleteRootCandidates = currentScoped
        .filter((block) => !targetIds.has(block.id))
        .map((block) => block.id);
      const deleteIds = collectBlockForestIds(deleteRootCandidates, current)
        .filter((id) => scopeIds.has(id));
      const currentIds = new Set(current.map((block) => block.id));
      const missingIds = new Set(
        entry.after
          .filter((block) => !currentIds.has(block.id))
          .map((block) => block.id),
      );
      const restoreRoots = entry.after.filter((block) =>
        missingIds.has(block.id)
        && (!block.parent_block_id || !missingIds.has(block.parent_block_id)),
      );

      try {
        if (deleteIds.length > 0) {
          await documentEngine.persistSoftDelete({ ids: deleteIds });
        }

        const restoredById = new Map<string, NoteBlock>();
        for (const root of restoreRoots) {
          const restored = await documentEngine.persistRestoreBlock(root.id);
          restored.forEach((block) => restoredById.set(block.id, block));
        }

        const targetMap = new Map(entry.after.map((block) => {
          const restored = restoredById.get(block.id);
          return [block.id, restored ? { ...block, version: restored.version } : block];
        }));
        const next = current
          .filter((block) => !scopeIds.has(block.id) || targetIds.has(block.id))
          .map((block) => targetMap.get(block.id) ?? block);
        for (const snapshot of targetMap.values()) {
          if (!next.some((block) => block.id === snapshot.id)) next.push(snapshot);
        }
        documentEngine.replaceBlocks(next);

        if (entry.after.length > 0) {
          await documentEngine.persistFieldPatches(entry.after.map((snapshot) => ({
            id: snapshot.id,
            type: snapshot.type,
            content: snapshot.content,
            parent_block_id: snapshot.parent_block_id ?? null,
            order_index: snapshot.order_index,
          })));
        }
      } catch (e) {
        devLogger.error('[Note] history block-transaction', e);
        documentEngine.replaceBlocks(current);
        setError(e instanceof Error ? e.message : '실행 취소에 실패했습니다.');
      }
      return;
    }
    if (entry.kind === 'restore-blocks') {
      const next = applyRestoreBlockSnapshots(blocksRef.current, entry.snapshots);
      documentEngine.replaceBlocks(next);
      const active = useNoteBlockStore.getState().activeEditor;
      if (active && entry.snapshots.some((snapshot) => snapshot.id === active.blockId)) {
        const restore = active;
        useNoteBlockStore.getState().setActiveEditor(null);
        requestAnimationFrame(() => {
          useNoteBlockStore.getState().setActiveEditor(restore);
        });
      }
      try {
        await documentEngine.persistFieldPatches(entry.snapshots.map((snapshot) => ({
          id: snapshot.id,
          type: snapshot.type,
          content: snapshot.content,
          parent_block_id: snapshot.parent_block_id,
          order_index: snapshot.order_index,
          document_id: snapshot.document_id,
        })));
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
