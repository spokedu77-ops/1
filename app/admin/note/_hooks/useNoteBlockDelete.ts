'use client';

import { useCallback } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  filterSiblingBlocks,
  planBatchDeleteBlocks,
  planMergeWithPreviousBlock,
  planPromoteChildrenOnDelete,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import {
  commitActiveNoteEditorToStore,
  mergeBlocksWithStoreContent,
} from '../_lib/noteBlockStateMerge';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { useNoteBlockUndo } from './useNoteBlockUndo';
import type { NoteBlock } from '../_lib/types';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

export function useNoteBlockDelete(options: {
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  documentEngine: NoteDocumentEngineApi;
  setTrashedBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  selectedId: string | null;
  docTab: 'active' | 'trash' | 'block-trash';
  setError: (error: string | null) => void;
  setMobileTab: (tab: 'list' | 'editor') => void;
  setRestoringBlockId: (id: string | null) => void;
  setPurgingBlockId: (id: string | null) => void;
  setMergeFocusCaretOffset: (offset: number | undefined) => void;
  lastDeletedBlockIdRef: React.MutableRefObject<string | null>;
  setPendingDeleteUndo: (blockId: string | null) => void;
  triggerSave: () => void;
  noteUndo: NoteUndo;
  loadTrashedBlocks: () => Promise<void>;
  focusBlockEditor: (blockId: string | null, part?: 'title' | 'editor', caretOffset?: number) => void;
  recordBlockUndo: (blockIds: string[]) => void;
  ensureMinimumRootTextBlock: () => Promise<void>;
}) {
  const {
    blocksRef,
    setBlocks,
    documentEngine,
    setTrashedBlocks,
    selectedId,
    docTab,
    setError,
    setMobileTab,
    setRestoringBlockId,
    setPurgingBlockId,
    setMergeFocusCaretOffset,
    lastDeletedBlockIdRef,
    setPendingDeleteUndo,
    triggerSave,
    noteUndo,
    loadTrashedBlocks,
    focusBlockEditor,
    recordBlockUndo,
    ensureMinimumRootTextBlock,
  } = options;

  const finalizeBlockDelete = useCallback(async (
    prevBlocks: NoteBlock[],
    deleteOptions?: {
      skipDeleteUndo?: boolean;
      deletedBlock?: NoteBlock | null;
      deletedIds?: string[];
    },
  ) => {
    if (!deleteOptions?.skipDeleteUndo) {
      if (deleteOptions?.deletedIds && deleteOptions.deletedIds.length > 1) {
        noteUndo.pushRestoreBlocksUndo(
          mergeBlocksWithStoreContent(prevBlocks),
          deleteOptions.deletedIds,
        );
      } else if (deleteOptions?.deletedBlock) {
        noteUndo.pushCreateBlockUndo(deleteOptions.deletedBlock);
        setPendingDeleteUndo(deleteOptions.deletedBlock.id);
      }
    }
    if (docTab === 'block-trash') {
      setMobileTab('list');
      await loadTrashedBlocks();
    }
    triggerSave();
  }, [docTab, loadTrashedBlocks, noteUndo, setMobileTab, setPendingDeleteUndo, triggerSave]);

  const handleDeleteBlock = useCallback(async (
    block: NoteBlock,
    focusPrevious = false,
    skipDeleteUndo = false,
  ) => {
    const prevBlocks = blocksRef.current;
    const promotionPlan = planPromoteChildrenOnDelete(prevBlocks, block.id);
    const patchMap = promotionPlan
      ? new Map(promotionPlan.patches.map((patch) => [patch.id, patch]))
      : null;

    const computeNextBlocks = (prev: NoteBlock[]) => {
      const plan = planPromoteChildrenOnDelete(prev, block.id);
      if (!plan) return prev.filter((b) => b.id !== block.id);
      const patches = new Map(plan.patches.map((patch) => [patch.id, patch]));
      return prev
        .filter((b) => b.id !== block.id)
        .map((b) => {
          const patch = patches.get(b.id);
          if (!patch) return b;
          return {
            ...b,
            parent_block_id: patch.parent_block_id,
            order_index: patch.order_index,
            ...(patch.content ? { content: patch.content } : {}),
          };
        });
    };

    const nextBlocks = computeNextBlocks(prevBlocks);

    if (focusPrevious) {
      const siblings = filterSiblingBlocks(prevBlocks, block);
      const sibIdx = siblings.findIndex((b) => b.id === block.id);
      const nextFocus = siblings[sibIdx - 1]?.id ?? siblings[sibIdx + 1]?.id ?? null;
      if (nextFocus) focusBlockEditor(nextFocus);
    }

    documentEngine.replaceBlocks(nextBlocks);

    try {
      await documentEngine.persistSoftDelete({
        ids: [block.id],
        promotionPatches: patchMap && patchMap.size > 0
          ? [...patchMap.values()].map((patch) => ({
            id: patch.id,
            parent_block_id: patch.parent_block_id,
            order_index: patch.order_index,
            ...(patch.content ? { content: patch.content } : {}),
          }))
          : undefined,
      });
      await finalizeBlockDelete(prevBlocks, {
        skipDeleteUndo,
        deletedBlock: prevBlocks.find((b) => b.id === block.id) ?? block,
      });
      const rootsAfterDelete = sortRootBlocks(
        nextBlocks.filter(
          (b) => b.document_id === block.document_id && (b.parent_block_id ?? null) === null,
        ),
      );
      if (rootsAfterDelete.length === 0) {
        await ensureMinimumRootTextBlock();
      }
    } catch (e) {
      devLogger.error('[Note] deleteBlock', e);
      setError(e instanceof Error ? e.message : '블록 삭제 실패');
      documentEngine.replaceBlocks(prevBlocks);
    }
  }, [
    blocksRef,
    documentEngine,
    ensureMinimumRootTextBlock,
    finalizeBlockDelete,
    focusBlockEditor,
    setError,
  ]);

  const handleDeleteBlocks = useCallback(async (
    blocksToDelete: NoteBlock[],
    deleteOptions?: { skipDeleteUndo?: boolean; focusPrevious?: boolean },
  ) => {
    const targets = blocksToDelete.filter((block) =>
      blocksRef.current.some((item) => item.id === block.id),
    );
    if (targets.length === 0) return;

    if (targets.length === 1) {
      await handleDeleteBlock(
        targets[0],
        deleteOptions?.focusPrevious ?? false,
        deleteOptions?.skipDeleteUndo ?? false,
      );
      return;
    }

    const prevBlocks = blocksRef.current;
    const plan = planBatchDeleteBlocks(prevBlocks, targets.map((item) => item.id));
    if (!plan || plan.deletedIds.length === 0) return;

    documentEngine.replaceBlocks(plan.nextBlocks);

    try {
      await documentEngine.persistSoftDelete({
        ids: plan.deletedIds,
        promotionPatches: plan.patches.map((patch) => ({
          id: patch.id,
          parent_block_id: patch.parent_block_id,
          order_index: patch.order_index,
          ...(patch.content ? { content: patch.content } : {}),
        })),
      });
      await finalizeBlockDelete(prevBlocks, {
        skipDeleteUndo: deleteOptions?.skipDeleteUndo,
        deletedIds: plan.deletedIds,
        deletedBlock: prevBlocks.find((b) => b.id === plan.deletedIds[plan.deletedIds.length - 1])
          ?? targets[targets.length - 1]
          ?? null,
      });
      const rootsAfterDelete = sortRootBlocks(
        plan.nextBlocks.filter(
          (b) => selectedId && b.document_id === selectedId && (b.parent_block_id ?? null) === null,
        ),
      );
      if (rootsAfterDelete.length === 0) {
        await ensureMinimumRootTextBlock();
      }
    } catch (e) {
      devLogger.error('[Note] deleteBlocks', e);
      setError(e instanceof Error ? e.message : '블록 삭제 실패');
      documentEngine.replaceBlocks(prevBlocks);
    }
  }, [
    blocksRef,
    documentEngine,
    ensureMinimumRootTextBlock,
    finalizeBlockDelete,
    handleDeleteBlock,
    selectedId,
    setError,
  ]);

  const handleMergeWithPreviousBlock = useCallback(async (block: NoteBlock) => {
    commitActiveNoteEditorToStore();
    const prevBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    const plan = planMergeWithPreviousBlock(prevBlocks, block.id);
    if (!plan) return;

    recordBlockUndo([plan.previousId, plan.deleteId]);

    const store = useNoteBlockStore.getState();
    store.patchContent(plan.previousId, plan.mergedContent);
    store.removeBlock(plan.deleteId);

    const nextBlocks = prevBlocks
      .filter((b) => b.id !== plan.deleteId)
      .map((b) => (b.id === plan.previousId ? { ...b, content: plan.mergedContent } : b));
    documentEngine.replaceBlocks(nextBlocks);

    focusBlockEditor(plan.previousId, 'editor', plan.caretOffset);

    try {
      await documentEngine.persistFieldPatches([{ id: plan.previousId, content: plan.mergedContent }]);
      await documentEngine.persistSoftDelete({ ids: [plan.deleteId] });
    } catch (e) {
      devLogger.error('[Note] mergeWithPrevious', e);
      setError(e instanceof Error ? e.message : '블록 병합 실패');
      documentEngine.replaceBlocks(prevBlocks);
      store.hydrate(prevBlocks);
    } finally {
      window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
    }
  }, [
    blocksRef,
    documentEngine,
    focusBlockEditor,
    recordBlockUndo,
    setBlocks,
    setError,
    setMergeFocusCaretOffset,
  ]);

  const handleRestoreBlockFromTrash = useCallback(async (block: NoteBlock) => {
    try {
      setRestoringBlockId(block.id);
      await documentEngine.flushPersistQueue();
      const restoredBlock = await documentEngine.persistRestoreBlock(block.id);
      setTrashedBlocks((prev) => prev.filter((b) => b.id !== block.id));
      if (lastDeletedBlockIdRef.current === block.id) setPendingDeleteUndo(null);
      setBlocks((prev) => {
        if (prev.some((b) => b.id === restoredBlock.id)) return prev;
        return [...prev, restoredBlock].sort((a, b) => a.order_index - b.order_index);
      });
      focusBlockEditor(restoredBlock.id);
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] restoreBlockFromTrash', e);
      setError(e instanceof Error ? e.message : '블록 복구 실패');
    } finally {
      setRestoringBlockId(null);
    }
  }, [
    documentEngine,
    focusBlockEditor,
    lastDeletedBlockIdRef,
    setBlocks,
    setError,
    setPendingDeleteUndo,
    setRestoringBlockId,
    setTrashedBlocks,
    triggerSave,
  ]);

  const handlePurgeBlockFromTrash = useCallback(async (block: NoteBlock) => {
    if (!confirm('이 블록을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      setPurgingBlockId(block.id);
      await documentEngine.flushPersistQueue();
      await documentEngine.persistPurgeBlock(block.id);
      if (lastDeletedBlockIdRef.current === block.id) setPendingDeleteUndo(null);
      setTrashedBlocks((prev) => prev.filter((b) => b.id !== block.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] purgeBlockFromTrash', e);
      setError(e instanceof Error ? e.message : '블록 영구 삭제 실패');
    } finally {
      setPurgingBlockId(null);
    }
  }, [
    documentEngine,
    lastDeletedBlockIdRef,
    setPendingDeleteUndo,
    setPurgingBlockId,
    setTrashedBlocks,
    setError,
    triggerSave,
  ]);

  return {
    handleDeleteBlock,
    handleDeleteBlocks,
    handleMergeWithPreviousBlock,
    handleRestoreBlockFromTrash,
    handlePurgeBlockFromTrash,
  };
}
