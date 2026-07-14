'use client';

import { useCallback } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  filterSiblingBlocks,
  getBlocksInParent,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';
import {
  buildDeleteBlockForestCommand,
  buildMergeWithPreviousBlockCommand,
} from '../_lib/noteBlockCommands';
import { buildToggleLegacyCleanupPatches } from '../_lib/noteToggleContent';
import type { NoteBlockCommandResult } from '../_lib/noteBlockCommands';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import {
  commitActiveNoteEditorToStore,
  mergeBlocksWithStoreContent,
} from '../_lib/noteBlockStateMerge';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  rememberNoteDocumentBlocks,
} from '../_lib/noteDocumentBlocksCache';
import { invalidatePrefetchedNoteBlocks } from '../_lib/noteDocumentBlocksPrefetch';
import {
  markNoteLocalSave,
  markPendingBlockDeletes,
} from '../_lib/noteReconcileIdle';
import { removeStructuralExcludeIds } from '../_lib/noteStructuralExcludeRegistry';
import { setNoteMergeSplitHint } from '../_lib/noteMergeSplitHint';
import { readToggleTitleText } from '../_lib/noteNotionBlockBehavior';
import type { NoteBlock } from '../_lib/types';

type MergeWithPreviousCommand = NonNullable<ReturnType<typeof buildMergeWithPreviousBlockCommand>>;

function applyPostBlockRemovalCache(
  documentId: string | null | undefined,
  nextBlocks: NoteBlock[],
  removedIds: string[],
): void {
  if (!documentId) return;
  markNoteLocalSave(documentId);
  markPendingBlockDeletes(documentId, removedIds);
  invalidatePrefetchedNoteBlocks(documentId);
  rememberNoteDocumentBlocks(
    documentId,
    mergeBlocksWithStoreContent(
      nextBlocks.filter((block) => block.document_id === documentId),
    ),
    { trustServer: true },
  );
}

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

  const focusToggleTitleIfChildForestEmptied = useCallback((
    prevBlocks: NoteBlock[],
    nextBlocks: NoteBlock[],
    removed: NoteBlock[],
  ) => {
    for (const block of removed) {
      const parentId = block.parent_block_id ?? null;
      if (!parentId) continue;
      const parent = prevBlocks.find((item) => item.id === parentId);
      if (!parent || parent.type !== 'toggle') continue;
      const remaining = getBlocksInParent(nextBlocks, parentId);
      if (remaining.length > 0) continue;
      const title = readToggleTitleText(parent.content as Record<string, unknown>);
      requestAnimationFrame(() => {
        focusBlockEditor(parent.id, 'title', title.length);
      });
      return;
    }
  }, [focusBlockEditor]);

  const runDeleteForestCommand = useCallback(async (params: {
    prevBlocks: NoteBlock[];
    command: NoteBlockCommandResult;
    skipDeleteUndo?: boolean;
    deletedBlock?: NoteBlock | null;
    emptyRootDocumentId?: string | null;
    logLabel: string;
  }) => {
    const {
      prevBlocks,
      command,
      skipDeleteUndo = false,
      deletedBlock = null,
      emptyRootDocumentId = null,
      logLabel,
    } = params;

    if (!skipDeleteUndo) recordBlockCommandUndo(prevBlocks, command);
    const toggleCleanupPatches = buildToggleLegacyCleanupPatches(
      command.removedBlocks,
      command.nextBlocks,
    );
    let nextBlocks = command.nextBlocks;
    if (toggleCleanupPatches.length > 0) {
      const patchById = new Map(toggleCleanupPatches.map((patch) => [patch.id, patch.content]));
      nextBlocks = nextBlocks.map((block) => {
        const patch = patchById.get(block.id);
        return patch ? { ...block, content: patch } : block;
      });
    }
    const documentId = command.removedBlocks[0]?.document_id
      ?? deletedBlock?.document_id
      ?? nextBlocks.find((block) => block.document_id)?.document_id
      ?? null;
    // replace 전에 pending mark — 직후 patchFields/reconcile 레이스가 되살리지 않게
    applyPostBlockRemovalCache(documentId, nextBlocks, command.affectedIds);
    documentEngine.replaceBlocks(nextBlocks);

    try {
      await documentEngine.persistSoftDelete({
        ids: command.affectedIds,
      });
      if (toggleCleanupPatches.length > 0) {
        await documentEngine.persistFieldPatches(toggleCleanupPatches);
      }
      await finalizeBlockDelete({
        skipDeleteUndo,
        deletedBlock,
      });
      focusToggleTitleIfChildForestEmptied(prevBlocks, nextBlocks, command.removedBlocks);
      onAfterBlocksRemoved?.(command.removedBlocks, nextBlocks);

      if (emptyRootDocumentId) {
        const rootsAfterDelete = sortRootBlocks(
          nextBlocks.filter(
            (b) => b.document_id === emptyRootDocumentId && (b.parent_block_id ?? null) === null,
          ),
        );
        if (rootsAfterDelete.length === 0) {
          await ensureMinimumRootTextBlock();
        }
      }
    } catch (e) {
      devLogger.error(logLabel, e);
      setError(e instanceof Error ? e.message : '블록 삭제 실패');
      if (documentId) removeStructuralExcludeIds(documentId, command.affectedIds);
      documentEngine.replaceBlocks(prevBlocks);
    }
  }, [
    documentEngine,
    ensureMinimumRootTextBlock,
    finalizeBlockDelete,
    focusToggleTitleIfChildForestEmptied,
    onAfterBlocksRemoved,
    recordBlockCommandUndo,
    setError,
  ]);

  const runMergeWithPreviousCommand = useCallback(async (
    prevBlocks: NoteBlock[],
    command: MergeWithPreviousCommand,
  ) => {
    recordBlockCommandUndo(prevBlocks, command);
    documentEngine.replaceBlocks(command.nextBlocks);
    const removedIds = command.removedBlocks.map((removed) => removed.id);
    const documentId = command.removedBlocks[0]?.document_id
      ?? command.nextBlocks.find((block) => block.document_id)?.document_id
      ?? null;
    if (removedIds.length > 0) {
      applyPostBlockRemovalCache(documentId, command.nextBlocks, removedIds);
    }
    if (command.splitHint) {
      setNoteMergeSplitHint({
        blockId: command.focusBlockId,
        offset: command.splitHint.offset,
        blockType: command.splitHint.blockType,
      });
    }
    focusBlockEditor(command.focusBlockId, 'editor', command.caretOffset);

    try {
      await documentEngine.persistBlockTransaction(
        command.fieldPatches,
        command.removedBlocks.map((removed) => removed.id),
      );
    } catch (e) {
      devLogger.error('[Note] mergeWithPrevious', e);
      setError(e instanceof Error ? e.message : '블록 병합 실패');
      if (documentId) removeStructuralExcludeIds(documentId, removedIds);
      documentEngine.replaceBlocks(prevBlocks);
    } finally {
      window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
    }
  }, [
    documentEngine,
    focusBlockEditor,
    recordBlockCommandUndo,
    setError,
    setMergeFocusCaretOffset,
  ]);

  const handleDeleteBlock = useCallback(async (
    block: NoteBlock,
    focusPrevious = false,
    skipDeleteUndo = false,
  ) => {
    const storeBlocks = useNoteBlockStore.getState().getBlocksArray()
      .filter((item) => item.document_id === block.document_id);
    const prevBlocks = mergeBlocksWithStoreContent(
      storeBlocks.length > 0 ? storeBlocks : blocksRef.current,
    );
    const command = buildDeleteBlockForestCommand(prevBlocks, [block.id]);
    if (command.affectedIds.length === 0) return;
    if (focusPrevious) {
      const siblings = filterSiblingBlocks(prevBlocks, block);
      const sibIdx = siblings.findIndex((b) => b.id === block.id);
      const nextFocus = siblings[sibIdx - 1]?.id ?? siblings[sibIdx + 1]?.id ?? null;
      if (nextFocus) focusBlockEditor(nextFocus);
    }

    await runDeleteForestCommand({
      prevBlocks,
      command,
      skipDeleteUndo,
      deletedBlock: prevBlocks.find((b) => b.id === block.id) ?? block,
      emptyRootDocumentId: block.document_id,
      logLabel: '[Note] deleteBlock',
    });
  }, [
    blocksRef,
    focusBlockEditor,
    runDeleteForestCommand,
  ]);

  const handleDeleteBlocks = useCallback(async (
    blocksToDelete: NoteBlock[],
    deleteOptions?: { skipDeleteUndo?: boolean; focusPrevious?: boolean },
  ) => {
    const targets = blocksToDelete.filter((block) =>
      blocksRef.current.some((item) => item.id === block.id),
    );
    if (targets.length === 0) return;

    const prevBlocks = blocksRef.current;
    const command = buildDeleteBlockForestCommand(
      prevBlocks,
      targets.map((item) => item.id),
    );
    if (command.affectedIds.length === 0) return;

    if (deleteOptions?.focusPrevious && targets.length === 1) {
      const [block] = targets;
      const siblings = filterSiblingBlocks(prevBlocks, block);
      const sibIdx = siblings.findIndex((b) => b.id === block.id);
      const nextFocus = siblings[sibIdx - 1]?.id ?? siblings[sibIdx + 1]?.id ?? null;
      if (nextFocus) {
        focusBlockEditor(nextFocus);
      }
    }

    await runDeleteForestCommand({
      prevBlocks,
      command,
      skipDeleteUndo: deleteOptions?.skipDeleteUndo,
      deletedBlock: prevBlocks.find(
        (b) => b.id === command.affectedIds[command.affectedIds.length - 1],
      )
        ?? targets[targets.length - 1]
        ?? null,
      emptyRootDocumentId: targets[targets.length - 1]?.document_id ?? selectedId,
      logLabel: '[Note] deleteBlocks',
    });
  }, [
    blocksRef,
    focusBlockEditor,
    runDeleteForestCommand,
    selectedId,
  ]);

  const handleMergeWithPreviousBlock = useCallback(async (block: NoteBlock) => {
    commitActiveNoteEditorToStore();
    const prevBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    const command = buildMergeWithPreviousBlockCommand(prevBlocks, block.id);
    if (!command) return;

    await runMergeWithPreviousCommand(prevBlocks, command);
  }, [
    blocksRef,
    runMergeWithPreviousCommand,
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
