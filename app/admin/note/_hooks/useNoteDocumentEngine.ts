'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  applyNoteDocumentOp,
  applyServerBlockVersions,
  createNoteDocumentEngineState,
} from '../_lib/noteDocumentEngine';
import type { NoteDocumentOp } from '../_lib/noteDocumentOps';
import {
  NoteDocumentOpQueue,
  type CreateBlockPersistArgs,
  type ReorderPersistArgs,
  type SoftDeletePersistArgs,
} from '../_lib/noteDocumentOpQueue';
import { setNoteContentSavePending } from '../_lib/notePendingSave';
import type { NoteBlockFieldPatch, PatchedNoteBlock } from '../_lib/noteBlocksApi';
import { purgeNoteBlockFromTrash, restoreNoteBlockFromTrash } from '../_lib/noteBlocksApi';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from '../_lib/types';

export type NoteDocumentEngineApi = {
  replaceBlocks: (blocks: NoteBlock[]) => void;
  updateContent: (blockId: string, content: Record<string, unknown>) => void;
  scheduleContentPatch: (blockId: string, content: Record<string, unknown>) => void;
  clearContentPatch: (blockId: string) => void;
  flushContentPatches: () => Promise<void>;
  flushPersistQueue: () => Promise<void>;
  persistSoftDelete: (args: SoftDeletePersistArgs) => Promise<void>;
  persistFieldPatches: (patches: NoteBlockFieldPatch[]) => Promise<void>;
  persistReorder: (args: ReorderPersistArgs) => Promise<void>;
  persistCreateBlock: (args: CreateBlockPersistArgs) => Promise<NoteBlock>;
  persistTransferBlocks: (patches: NoteBlockFieldPatch[]) => Promise<void>;
  persistRestoreBlock: (blockId: string) => Promise<NoteBlock[]>;
  persistPurgeBlock: (blockId: string) => Promise<void>;
  getBlocks: () => NoteBlock[];
  hasPendingContent: () => boolean;
  hasPendingPersist: () => boolean;
};

export function useNoteDocumentEngine(options: {
  documentId: string | null;
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  triggerSave: () => void;
  onError?: (error: Error) => void;
}): NoteDocumentEngineApi {
  const { documentId, blocksRef, setBlocks, triggerSave, onError } = options;
  const queueRef = useRef<NoteDocumentOpQueue | null>(null);
  const triggerSaveRef = useRef(triggerSave);
  const onErrorRef = useRef(onError);

  triggerSaveRef.current = triggerSave;
  onErrorRef.current = onError;

  const syncPendingFlag = useCallback(() => {
    setNoteContentSavePending(queueRef.current?.hasPendingContent ?? false);
  }, []);

  const applyLocal = useCallback((op: NoteDocumentOp) => {
    if (!documentId) return;
    const store = useNoteBlockStore.getState();
    const activeBlockId = useNoteBlockStore.getState().activeEditor?.blockId ?? null;
    const current = createNoteDocumentEngineState(documentId, store.getBlocksArray());
    const next = applyNoteDocumentOp(current, op, { activeBlockId }).blocks;
    setBlocks(next);
  }, [blocksRef, documentId, setBlocks]);

  const applyLocalRef = useRef(applyLocal);
  applyLocalRef.current = applyLocal;

  const applyServerVersions = useCallback((patched: PatchedNoteBlock[]) => {
    if (!documentId || patched.length === 0) return;
    const nextFromRef = applyServerBlockVersions(blocksRef.current, patched);
    blocksRef.current = nextFromRef;
    useNoteBlockStore.getState().replaceBlocks(nextFromRef);
    // version만 갱신 — 본문 타이핑 경로와 같이 React 전체 리렌더 생략
  }, [blocksRef, documentId]);

  const applyServerVersionsRef = useRef(applyServerVersions);
  applyServerVersionsRef.current = applyServerVersions;

  useEffect(() => {
    queueRef.current?.dispose();
    queueRef.current = null;
    if (!documentId) {
      setNoteContentSavePending(false);
      return;
    }

    queueRef.current = new NoteDocumentOpQueue({
      getBlock: (blockId) => useNoteBlockStore.getState().getBlock(blockId),
      getActiveBlockId: () => useNoteBlockStore.getState().activeEditor?.blockId ?? null,
      triggerSave: () => triggerSaveRef.current(),
      onError: (error) => onErrorRef.current?.(error),
      onServerPatches: (patched) => applyServerVersionsRef.current(patched),
      onServerConflicts: (conflicts) => {
        applyLocalRef.current({ type: 'syncFromServer', blocks: conflicts });
      },
    });

    return () => {
      queueRef.current?.dispose();
      queueRef.current = null;
      setNoteContentSavePending(false);
    };
  }, [documentId, blocksRef]);

  const replaceBlocks = useCallback((blocks: NoteBlock[]) => {
    applyLocal({ type: 'replaceBlocks', blocks });
  }, [applyLocal]);

  const updateContent = useCallback((blockId: string, content: Record<string, unknown>) => {
    applyLocal({ type: 'updateContent', blockId, content });
  }, [applyLocal]);

  const scheduleContentPatch = useCallback((blockId: string, content: Record<string, unknown>) => {
    useNoteBlockStore.getState().patchContent(blockId, content);
    queueRef.current?.scheduleContentPatch(blockId, content);
    syncPendingFlag();
  }, [syncPendingFlag]);

  const clearContentPatch = useCallback((blockId: string) => {
    queueRef.current?.clearContentPatch(blockId);
    syncPendingFlag();
  }, [syncPendingFlag]);

  const flushContentPatches = useCallback(async () => {
    await queueRef.current?.flushContentPatches();
    syncPendingFlag();
  }, [syncPendingFlag]);

  const flushPersistQueue = useCallback(async () => {
    await queueRef.current?.drain();
    syncPendingFlag();
  }, [syncPendingFlag]);

  const hasPendingPersist = useCallback(
    () => queueRef.current?.hasPendingPersist() ?? false,
    [],
  );

  const persistSoftDelete = useCallback(async (args: SoftDeletePersistArgs) => {
    await queueRef.current?.enqueue({
      type: 'softDelete',
      ids: args.ids,
    });
  }, []);

  const persistFieldPatches = useCallback(async (patches: NoteBlockFieldPatch[]) => {
    applyLocal({ type: 'applyPatches', patches });
    await queueRef.current?.enqueue({ type: 'patchFields', patches });
  }, [applyLocal]);

  const persistReorder = useCallback(async (args: ReorderPersistArgs) => {
    if (args.fieldPatches && args.fieldPatches.length > 0) {
      applyLocal({ type: 'applyPatches', patches: args.fieldPatches });
    }
    await queueRef.current?.enqueue({
      type: 'reorderBlocks',
      orders: args.orders,
      fieldPatches: args.fieldPatches,
    });
  }, [applyLocal]);

  const persistCreateBlock = useCallback(async (args: CreateBlockPersistArgs) => {
    if (!documentId) {
      throw new Error('문서가 선택되지 않았습니다');
    }
    return queueRef.current?.enqueueCreateBlock({
      type: 'createBlock',
      documentId: args.documentId,
      blockType: args.blockType,
      content: args.content,
      order_index: args.order_index,
      parent_block_id: args.parent_block_id,
      normalizeOrders: args.normalizeOrders,
    }) ?? Promise.reject(new Error('문서 엔진이 준비되지 않았습니다'));
  }, [documentId]);

  const persistTransferBlocks = useCallback(async (patches: NoteBlockFieldPatch[]) => {
    if (patches.length === 0) return;
    // 문서 밖으로 나가는 블록 — 로컬 reducer는 건드리지 않는다(호출 측이 UI에서 제거).
    await queueRef.current?.enqueue({ type: 'transferBlocks', patches });
  }, []);

  const persistRestoreBlock = useCallback(async (blockId: string) => {
    if (queueRef.current) {
      return queueRef.current.enqueueRestoreBlock({ id: blockId });
    }
    const block = await restoreNoteBlockFromTrash(blockId);
    triggerSaveRef.current();
    return block;
  }, []);

  const persistPurgeBlock = useCallback(async (blockId: string) => {
    if (queueRef.current) {
      await queueRef.current.enqueue({ type: 'purgeBlock', id: blockId });
      return;
    }
    await purgeNoteBlockFromTrash(blockId);
    triggerSaveRef.current();
  }, []);

  const getBlocks = useCallback(
    () => useNoteBlockStore.getState().getBlocksArray(),
    [],
  );

  const hasPendingContent = useCallback(
    () => queueRef.current?.hasPendingContent ?? false,
    [],
  );

  return useMemo(() => ({
    replaceBlocks,
    updateContent,
    scheduleContentPatch,
    clearContentPatch,
    flushContentPatches,
    flushPersistQueue,
    persistSoftDelete,
    persistFieldPatches,
    persistReorder,
    persistCreateBlock,
    persistTransferBlocks,
    persistRestoreBlock,
    persistPurgeBlock,
    getBlocks,
    hasPendingContent,
    hasPendingPersist,
  }), [
    replaceBlocks,
    updateContent,
    scheduleContentPatch,
    clearContentPatch,
    flushContentPatches,
    flushPersistQueue,
    persistSoftDelete,
    persistFieldPatches,
    persistReorder,
    persistCreateBlock,
    persistTransferBlocks,
    persistRestoreBlock,
    persistPurgeBlock,
    getBlocks,
    hasPendingContent,
    hasPendingPersist,
  ]);
}
