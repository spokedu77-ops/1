'use client';

import { useCallback } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  filterSiblingBlocks,
  planMergeWithPreviousBlock,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';
import { buildDeleteBlockForestCommand } from '../_lib/noteBlockCommands';
import type { NoteBlockCommandResult } from '../_lib/noteBlockCommands';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import {
  commitActiveNoteEditorToStore,
  mergeBlocksWithStoreContent,
} from '../_lib/noteBlockStateMerge';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from '../_lib/types';

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
  loadTrashedBlocks: () => Promise<void>;
  focusBlockEditor: (blockId: string | null, part?: 'title' | 'editor', caretOffset?: number) => void;
  recordBlockUndo: (blockIds: string[]) => void;
  recordBlockCommandUndo: (
    previousBlocks: NoteBlock[],
    command: NoteBlockCommandResult,
  ) => void;
  ensureMinimumRootTextBlock: () => Promise<void>;
  onAfterBlocksRemoved?: (removed: NoteBlock[], nextBlocks: NoteBlock[]) => void;
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
    loadTrashedBlocks,
    focusBlockEditor,
    recordBlockUndo,
    recordBlockCommandUndo,
    ensureMinimumRootTextBlock,
    onAfterBlocksRemoved,
  } = options;

  const finalizeBlockDelete = useCallback(async (
    deleteOptions?: {
      skipDeleteUndo?: boolean;
      deletedBlock?: NoteBlock | null;
    },
  ) => {
    if (!deleteOptions?.skipDeleteUndo && deleteOptions?.deletedBlock) {
      setPendingDeleteUndo(deleteOptions.deletedBlock.id);
    }
    if (docTab === 'block-trash') {
      setMobileTab('list');
      await loadTrashedBlocks();
    }
    triggerSave();
  }, [docTab, loadTrashedBlocks, setMobileTab, setPendingDeleteUndo, triggerSave]);

  const handleDeleteBlock = useCallback(async (
    block: NoteBlock,
    focusPrevious = false,
    skipDeleteUndo = false,
  ) => {
    const prevBlocks = blocksRef.current;
    const command = buildDeleteBlockForestCommand(prevBlocks, [block.id]);
    if (command.affectedIds.length === 0) return;
    if (!skipDeleteUndo) recordBlockCommandUndo(prevBlocks, command);

    if (focusPrevious) {
      const siblings = filterSiblingBlocks(prevBlocks, block);
      const sibIdx = siblings.findIndex((b) => b.id === block.id);
      const nextFocus = siblings[sibIdx - 1]?.id ?? siblings[sibIdx + 1]?.id ?? null;
      if (nextFocus) focusBlockEditor(nextFocus);
    }

    documentEngine.replaceBlocks(command.nextBlocks);

    try {
      await documentEngine.persistSoftDelete({
        ids: command.affectedIds,
      });
      await finalizeBlockDelete({
        skipDeleteUndo,
        deletedBlock: prevBlocks.find((b) => b.id === block.id) ?? block,
      });
      onAfterBlocksRemoved?.(command.removedBlocks, command.nextBlocks);
      const rootsAfterDelete = sortRootBlocks(
        command.nextBlocks.filter(
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
    onAfterBlocksRemoved,
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
    const command = buildDeleteBlockForestCommand(
      prevBlocks,
      targets.map((item) => item.id),
    );
    if (command.affectedIds.length === 0) return;
    if (!deleteOptions?.skipDeleteUndo) recordBlockCommandUndo(prevBlocks, command);

    documentEngine.replaceBlocks(command.nextBlocks);

    try {
      await documentEngine.persistSoftDelete({
        ids: command.affectedIds,
      });
      await finalizeBlockDelete({
        skipDeleteUndo: deleteOptions?.skipDeleteUndo,
        deletedBlock: prevBlocks.find(
          (b) => b.id === command.affectedIds[command.affectedIds.length - 1],
        )
          ?? targets[targets.length - 1]
          ?? null,
      });
      onAfterBlocksRemoved?.(command.removedBlocks, command.nextBlocks);
      const rootsAfterDelete = sortRootBlocks(
        command.nextBlocks.filter(
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
    onAfterBlocksRemoved,
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
    } finally {
      window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
    }
  }, [
    blocksRef,
    documentEngine,
    focusBlockEditor,
    recordBlockUndo,
    recordBlockCommandUndo,
    setBlocks,
    setError,
    setMergeFocusCaretOffset,
  ]);

  const handleRestoreBlockFromTrash = useCallback(async (block: NoteBlock) => {
    try {
      setRestoringBlockId(block.id);
      await documentEngine.flushPersistQueue();
      const restoredBlocks = await documentEngine.persistRestoreBlock(block.id);
      const restoredIds = new Set(restoredBlocks.map((item) => item.id));
      const restoredBlock = restoredBlocks.find((item) => item.id === block.id) ?? restoredBlocks[0];
      if (!restoredBlock) throw new Error('복구된 블록을 찾지 못했습니다.');
      setTrashedBlocks((prev) => prev.filter((b) => !restoredIds.has(b.id)));
      if (lastDeletedBlockIdRef.current === block.id) setPendingDeleteUndo(null);
      setBlocks((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const additions = restoredBlocks.filter((item) => !existingIds.has(item.id));
        if (additions.length === 0) return prev;
        return [...prev, ...additions].sort((a, b) => a.order_index - b.order_index);
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
