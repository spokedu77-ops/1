'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  disposeNoteDocumentPipeline,
  getNoteDocumentPipeline,
  type NoteDocumentPipeline,
} from '../_lib/noteDocumentPipeline';
import { subscribeNoteCrossTabBlockSync } from '../_lib/noteCrossTabBlockSync';
import { applyServerBlockVersions } from '../_lib/noteDocumentEngine';
import { isNoteOplogSyncEnabled } from '../_lib/noteOplogSync';
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
  syncWithServer: (initialBlocks: NoteBlock[]) => Promise<void>;
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
  hasPendingContent: () => boolean;
  hasPendingPersist: () => boolean;
  isOplogSyncEnabled: () => boolean;
};

export function useNoteDocumentEngine(options: {
  documentId: string | null;
  onBlocksChanged: (blocks: NoteBlock[]) => void;
  triggerSave: () => void;
  onError?: (error: Error) => void;
}): NoteDocumentEngineApi {
  const { documentId, onBlocksChanged, triggerSave, onError } = options;
  const pipelineRef = useRef<NoteDocumentPipeline | null>(null);
  const onBlocksChangedRef = useRef(onBlocksChanged);
  const triggerSaveRef = useRef(triggerSave);
  const onErrorRef = useRef(onError);

  useLayoutEffect(() => {
    onBlocksChangedRef.current = onBlocksChanged;
    triggerSaveRef.current = triggerSave;
    onErrorRef.current = onError;
  }, [onBlocksChanged, triggerSave, onError]);

  useLayoutEffect(() => {
    if (!documentId) {
      pipelineRef.current = null;
      return undefined;
    }

    const pipeline = getNoteDocumentPipeline(documentId, {
      onBlocksChanged: (blocks) => onBlocksChangedRef.current(blocks),
      triggerSave: () => triggerSaveRef.current(),
      onError: (error) => onErrorRef.current?.(error),
    });
    pipelineRef.current = pipeline;

    return () => {
      const leavingId = documentId;
      void disposeNoteDocumentPipeline(leavingId);
      pipelineRef.current = null;
    };
  }, [documentId]);

  useEffect(() => {
    if (!documentId || isNoteOplogSyncEnabled()) return undefined;
    return subscribeNoteCrossTabBlockSync((message) => {
      if (message.documentId !== documentId || !pipelineRef.current) return;
      const next = applyServerBlockVersions(
        useNoteBlockStore.getState().getBlocksArray(),
        message.blocks,
      );
      pipelineRef.current.dispatch({ type: 'replaceBlocks', blocks: next });
    });
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
      useNoteBlockStore.getState().applyBlocks(() => blocks);
      onBlocksChangedRef.current(blocks);
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

  const syncWithServer = useCallback(async (initialBlocks: NoteBlock[]) => {
    if (!pipelineRef.current) return;
    await pipelineRef.current.syncWithServer(initialBlocks);
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
    return getPipeline().persistCreateBlock(args);
  }, [getPipeline]);

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

  const hasPendingContent = useCallback(() => {
    return pipelineRef.current?.hasPendingContent() ?? false;
  }, []);

  const hasPendingPersist = useCallback(() => {
    return pipelineRef.current?.hasPendingPersist() ?? false;
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
    hasPendingContent,
    hasPendingPersist,
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
    hasPendingContent,
    hasPendingPersist,
    isOplogSyncEnabledFn,
  ]);
}
