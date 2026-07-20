'use client';

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import {
  disposeNoteDocumentPipeline,
  getNoteDocumentPipeline,
  unmapNoteDocumentPipeline,
  type NoteDocumentPipeline,
} from '../_lib/noteDocumentPipeline';
import { commitActiveNoteEditorToStore } from '../_lib/noteBlockStateMerge';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type {
  CreateBlockPersistArgs,
  SoftDeletePersistArgs,
} from '../_lib/noteDocumentOpQueue';
import type { NoteBlockFieldPatch } from '../_lib/noteBlocksApi';
import type { NoteBlock } from '../_lib/types';
import type { NoteCommand } from '../_lib/noteCommand';

export type NoteDocumentEngineApi = {
  dispatch: (command: NoteCommand) => NoteBlock[];
  replaceBlocks: (blocks: NoteBlock[]) => void;
  updateContent: (blockId: string, content: Record<string, unknown>) => void;
  scheduleContentPatch: (
    blockId: string,
    content: Record<string, unknown>,
    baseContent?: Record<string, unknown>,
  ) => void;
  clearContentPatch: (blockId: string) => void;
  flushContentPatches: () => Promise<void>;
  flushPersistQueue: () => Promise<void>;
  hydrateFromLocal: () => Promise<NoteBlock[] | null>;
  syncWithServer: (
    initialBlocks: NoteBlock[],
    options?: { skipDispatch?: boolean; emptyConfirmed?: boolean },
  ) => Promise<void>;
  scheduleOplogPull: () => void;
  persistSoftDelete: (args: SoftDeletePersistArgs) => Promise<void>;
  persistFieldPatches: (patches: NoteBlockFieldPatch[]) => Promise<void>;
  persistCreateBlock: (args: CreateBlockPersistArgs) => Promise<NoteBlock>;
  persistBlockTransaction: (
    patches: NoteBlockFieldPatch[],
    deleteIds?: string[],
    deletedBlocks?: NoteBlock[],
  ) => Promise<void>;
  persistRestoreBlock: (blockId: string) => Promise<NoteBlock[]>;
  persistPurgeBlock: (blockId: string) => Promise<void>;
  getBlocks: () => NoteBlock[];
  getCoordinatorBlocks: () => NoteBlock[];
  hasPendingContent: () => boolean;
  hasPendingPersist: () => boolean;
  hasPendingOutbound: () => Promise<boolean>;
  hasUnpublishedTopologySync: () => boolean;
  isOplogSyncEnabled: () => boolean;
};

export function useNoteDocumentEngine(options: {
  documentId: string | null;
  triggerSave: () => void;
  onError?: (error: Error) => void;
}): NoteDocumentEngineApi {
  const { documentId, triggerSave, onError } = options;
  const pipelineRef = useRef<NoteDocumentPipeline | null>(null);
  const triggerSaveRef = useRef(triggerSave);
  const onErrorRef = useRef(onError);

  useLayoutEffect(() => {
    triggerSaveRef.current = triggerSave;
    onErrorRef.current = onError;
  }, [triggerSave, onError]);

  useLayoutEffect(() => {
    if (!documentId) {
      pipelineRef.current = null;
      return undefined;
    }

    const pipeline = getNoteDocumentPipeline(documentId, {
      triggerSave: () => triggerSaveRef.current(),
      onError: (error) => onErrorRef.current?.(error),
    });
    pipelineRef.current = pipeline;

    return () => {
      const leavingId = documentId;
      const leaving = pipeline;
      pipelineRef.current = null;
      // Strict Mode: remount 전에 맵에서 제거해 stale 파이프라인 재사용을 막는다
      unmapNoteDocumentPipeline(leavingId, leaving);
      void (async () => {
        try {
          if (!leaving.isDisposed()) {
            commitActiveNoteEditorToStore();
            if (leaving.hasPendingContent()) {
              await leaving.flushContentPatches();
            }
            if (leaving.hasPendingPersist()) {
              await leaving.flushPersistQueue();
            }
          }
        } catch (error) {
          onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
        }
        await disposeNoteDocumentPipeline(leavingId, leaving);
      })();
    };
  }, [documentId]);

  const getLivePipeline = useCallback(() => {
    const pipeline = pipelineRef.current;
    return pipeline && !pipeline.isDisposed() ? pipeline : null;
  }, []);

  const waitForLivePipeline = useCallback(async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const pipeline = pipelineRef.current;
      if (pipeline && !pipeline.isDisposed()) return pipeline;
      await new Promise((resolve) => {
        setTimeout(resolve, 16);
      });
    }
    throw new Error('문서 파이프라인이 준비되지 않았습니다');
  }, []);

  const dispatch = useCallback((command: NoteCommand) => {
    const pipeline = getLivePipeline();
    if (!pipeline) return useNoteBlockStore.getState().getBlocksArray();
    return pipeline.dispatch(command);
  }, [getLivePipeline]);

  const replaceBlocks = useCallback((blocks: NoteBlock[]) => {
    const pipeline = getLivePipeline();
    if (!pipeline) {
      useNoteBlockStore.getState().replaceBlocks(blocks);
      return;
    }
    pipeline.dispatch({ type: 'replaceBlocks', blocks });
  }, [getLivePipeline]);

  const updateContent = useCallback((blockId: string, content: Record<string, unknown>) => {
    const pipeline = getLivePipeline();
    if (!pipeline) {
      useNoteBlockStore.getState().patchContent(blockId, content);
      return;
    }
    pipeline.dispatch({ type: 'patchContent', blockId, content });
  }, [getLivePipeline]);

  const scheduleContentPatch = useCallback((
    blockId: string,
    content: Record<string, unknown>,
    baseContent?: Record<string, unknown>,
  ) => {
    const pipeline = getLivePipeline();
    if (!pipeline) {
      useNoteBlockStore.getState().patchContent(blockId, content);
      return;
    }
    pipeline.scheduleContentPatch(blockId, content, baseContent);
  }, [getLivePipeline]);

  const clearContentPatch = useCallback((blockId: string) => {
    const pipeline = getLivePipeline();
    if (!pipeline) return;
    pipeline.clearContentPatch(blockId);
  }, [getLivePipeline]);

  const flushContentPatches = useCallback(async () => {
    const pipeline = getLivePipeline();
    if (!pipeline) return;
    await pipeline.flushContentPatches();
  }, [getLivePipeline]);

  const flushPersistQueue = useCallback(async () => {
    const pipeline = getLivePipeline();
    if (!pipeline) return;
    await pipeline.flushPersistQueue();
  }, [getLivePipeline]);

  const hydrateFromLocal = useCallback(async () => {
    const pipeline = getLivePipeline();
    if (!pipeline) return null;
    return pipeline.hydrateFromLocal();
  }, [getLivePipeline]);

  const syncWithServer = useCallback(async (
    initialBlocks: NoteBlock[],
    options?: { skipDispatch?: boolean; emptyConfirmed?: boolean },
  ) => {
    const pipeline = getLivePipeline();
    if (!pipeline) {
      if (!options?.skipDispatch) {
        useNoteBlockStore.getState().hydrate(initialBlocks);
      }
      return;
    }
    await pipeline.syncWithServer(initialBlocks, options);
  }, [getLivePipeline]);

  const scheduleOplogPull = useCallback(() => {
    getLivePipeline()?.schedulePull();
  }, [getLivePipeline]);

  const persistSoftDelete = useCallback(async (args: SoftDeletePersistArgs) => {
    const pipeline = await waitForLivePipeline();
    await pipeline.persistSoftDelete(args);
  }, [waitForLivePipeline]);

  const persistFieldPatches = useCallback(async (patches: NoteBlockFieldPatch[]) => {
    if (patches.length === 0) return;
    const pipeline = await waitForLivePipeline();
    await pipeline.persistFieldPatches(patches);
  }, [waitForLivePipeline]);

  const persistCreateBlock = useCallback(async (args: CreateBlockPersistArgs) => {
    const pipeline = await waitForLivePipeline();
    return pipeline.persistCreateBlock(args);
  }, [waitForLivePipeline]);

  const persistBlockTransaction = useCallback(async (
    patches: NoteBlockFieldPatch[],
    deleteIds: string[] = [],
    deletedBlocks: NoteBlock[] = [],
  ) => {
    if (patches.length === 0 && deleteIds.length === 0) return;
    const pipeline = await waitForLivePipeline();
    await pipeline.persistBlockTransaction(patches, deleteIds, deletedBlocks);
  }, [waitForLivePipeline]);

  const persistRestoreBlock = useCallback(async (blockId: string) => {
    const pipeline = await waitForLivePipeline();
    return pipeline.persistRestoreBlock(blockId);
  }, [waitForLivePipeline]);

  const persistPurgeBlock = useCallback(async (blockId: string) => {
    const pipeline = await waitForLivePipeline();
    await pipeline.persistPurgeBlock(blockId);
  }, [waitForLivePipeline]);

  const getBlocks = useCallback(() => {
    return getLivePipeline()?.getBlocks() ?? [];
  }, [getLivePipeline]);

  const getCoordinatorBlocks = useCallback(() => {
    return getLivePipeline()?.getCoordinatorBlocks() ?? [];
  }, [getLivePipeline]);

  const hasPendingContent = useCallback(() => {
    return getLivePipeline()?.hasPendingContent() ?? false;
  }, [getLivePipeline]);

  const hasPendingPersist = useCallback(() => {
    return getLivePipeline()?.hasPendingPersist() ?? false;
  }, [getLivePipeline]);

  const hasPendingOutbound = useCallback(async () => {
    const pipeline = getLivePipeline();
    if (!pipeline) return false;
    return pipeline.hasPendingOutbound();
  }, [getLivePipeline]);

  const hasUnpublishedTopologySync = useCallback(() => {
    return getLivePipeline()?.hasUnpublishedTopologySync() ?? false;
  }, [getLivePipeline]);

  const isOplogSyncEnabledFn = useCallback(
    () => getLivePipeline()?.isOplogEnabled() ?? false,
    [getLivePipeline],
  );

  return useMemo(() => ({
    dispatch,
    replaceBlocks,
    updateContent,
    scheduleContentPatch,
    clearContentPatch,
    flushContentPatches,
    flushPersistQueue,
    hydrateFromLocal,
    syncWithServer,
    scheduleOplogPull,
    persistSoftDelete,
    persistFieldPatches,
    persistCreateBlock,
    persistBlockTransaction,
    persistRestoreBlock,
    persistPurgeBlock,
    getBlocks,
    getCoordinatorBlocks,
    hasPendingContent,
    hasPendingPersist,
    hasPendingOutbound,
    hasUnpublishedTopologySync,
    isOplogSyncEnabled: isOplogSyncEnabledFn,
  }), [
    dispatch,
    replaceBlocks,
    updateContent,
    scheduleContentPatch,
    clearContentPatch,
    flushContentPatches,
    flushPersistQueue,
    hydrateFromLocal,
    syncWithServer,
    scheduleOplogPull,
    persistSoftDelete,
    persistFieldPatches,
    persistCreateBlock,
    persistBlockTransaction,
    persistRestoreBlock,
    persistPurgeBlock,
    getBlocks,
    getCoordinatorBlocks,
    hasPendingContent,
    hasPendingPersist,
    hasPendingOutbound,
    hasUnpublishedTopologySync,
    isOplogSyncEnabledFn,
  ]);
}
