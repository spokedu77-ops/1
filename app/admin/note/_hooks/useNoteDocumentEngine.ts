'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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

  const getPipeline = useCallback(() => {
    if (!pipelineRef.current) {
      throw new Error('문서 파이프라인이 준비되지 않았습니다');
    }
    return pipelineRef.current;
  }, []);

  const dispatch = useCallback((command: NoteCommand) => {
    return getPipeline().dispatch(command);
  }, [getPipeline]);

  const replaceBlocks = useCallback((blocks: NoteBlock[]) => {
    const pipeline = pipelineRef.current;
    if (!pipeline) {
      useNoteBlockStore.getState().replaceBlocks(blocks);
      return;
    }
    pipeline.dispatch({ type: 'replaceBlocks', blocks });
  }, []);

  const updateContent = useCallback((blockId: string, content: Record<string, unknown>) => {
    getPipeline().dispatch({ type: 'patchContent', blockId, content });
  }, [getPipeline]);

  const scheduleContentPatch = useCallback((
    blockId: string,
    content: Record<string, unknown>,
    baseContent?: Record<string, unknown>,
  ) => {
    getPipeline().scheduleContentPatch(blockId, content, baseContent);
  }, [getPipeline]);

  const clearContentPatch = useCallback((blockId: string) => {
    getPipeline().clearContentPatch(blockId);
  }, [getPipeline]);

  const flushContentPatches = useCallback(async () => {
    await getPipeline().flushContentPatches();
  }, [getPipeline]);

  const flushPersistQueue = useCallback(async () => {
    await getPipeline().flushPersistQueue();
  }, [getPipeline]);

  const hydrateFromLocal = useCallback(async () => {
    if (!pipelineRef.current) return null;
    return pipelineRef.current.hydrateFromLocal();
  }, []);

  const syncWithServer = useCallback(async (
    initialBlocks: NoteBlock[],
    options?: { skipDispatch?: boolean; emptyConfirmed?: boolean },
  ) => {
    if (!pipelineRef.current) {
      if (!options?.skipDispatch) {
        useNoteBlockStore.getState().hydrate(initialBlocks);
      }
      return;
    }
    await pipelineRef.current.syncWithServer(initialBlocks, options);
  }, []);

  const scheduleOplogPull = useCallback(() => {
    pipelineRef.current?.schedulePull();
  }, []);

  const persistSoftDelete = useCallback(async (args: SoftDeletePersistArgs) => {
    await getPipeline().persistSoftDelete(args);
  }, [getPipeline]);

  const persistFieldPatches = useCallback(async (patches: NoteBlockFieldPatch[]) => {
    await getPipeline().persistFieldPatches(patches);
  }, [getPipeline]);

  const persistCreateBlock = useCallback(async (args: CreateBlockPersistArgs) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const pipeline = pipelineRef.current;
      if (pipeline && !pipeline.isDisposed()) {
        return pipeline.persistCreateBlock(args);
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 16);
      });
    }
    throw new Error('문서 파이프라인이 준비되지 않았습니다');
  }, []);

  const persistBlockTransaction = useCallback(async (
    patches: NoteBlockFieldPatch[],
    deleteIds: string[] = [],
  ) => {
    await getPipeline().persistBlockTransaction(patches, deleteIds);
  }, [getPipeline]);

  const persistRestoreBlock = useCallback(async (blockId: string) => {
    if (!pipelineRef.current) {
      throw new Error('문서 파이프라인이 준비되지 않았습니다');
    }
    return pipelineRef.current.persistRestoreBlock(blockId);
  }, []);

  const persistPurgeBlock = useCallback(async (blockId: string) => {
    if (!pipelineRef.current) return;
    await pipelineRef.current.persistPurgeBlock(blockId);
  }, []);

  const getBlocks = useCallback(() => {
    return pipelineRef.current?.getBlocks() ?? [];
  }, []);

  const getCoordinatorBlocks = useCallback(() => {
    return pipelineRef.current?.getCoordinatorBlocks() ?? [];
  }, []);

  const hasPendingContent = useCallback(() => {
    return pipelineRef.current?.hasPendingContent() ?? false;
  }, []);

  const hasPendingPersist = useCallback(() => {
    return pipelineRef.current?.hasPendingPersist() ?? false;
  }, []);

  const hasPendingOutbound = useCallback(async () => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return false;
    return pipeline.hasPendingOutbound();
  }, []);

  const hasUnpublishedTopologySync = useCallback(() => {
    return pipelineRef.current?.hasUnpublishedTopologySync() ?? false;
  }, []);

  const isOplogSyncEnabledFn = useCallback(
    () => pipelineRef.current?.isOplogEnabled() ?? false,
    [],
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
