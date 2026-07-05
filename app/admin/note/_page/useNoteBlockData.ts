'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  buildChildrenByParentBlock,
  dedupeNoteBlocksById,
  flattenVisualBlockIds,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  commitAndResetNoteDocumentBeforeSwitch,
  commitNoteDocumentBeforeLeave,
  isActiveNoteEditorFocused,
  mergeBlocksWithStoreContent,
  resetNoteDocumentEditorState,
  unionReconciledWithLocalBlocks,
  wouldReconcileRegressLocalStructure,
  wouldReconcileRegressActiveText,
} from '../_lib/noteBlockStateMerge';
import {
  cancelNoteReconcileIdle,
  registerNoteReconcileIdleHandler,
  scheduleNoteReconcileIdle,
  scheduleNoteReconcileRemote,
} from '../_lib/noteReconcileIdle';
import { consumePrefetchedNoteBlocks } from '../_lib/noteDocumentBlocksPrefetch';
import {
  readRememberedNoteDocumentBlocks,
  rememberNoteDocumentBlocks,
} from '../_lib/noteDocumentBlocksCache';
import { prepareLoadedNoteBlocks } from '../_components/noteBulletInput';
import { stripToggleLegacyContentFields } from '../_lib/noteToggleContent';
import { useNoteDocumentEngine } from '../_hooks/useNoteDocumentEngine';
import { useNoteBlocksRealtimeInvalidation } from '../_hooks/useNoteBlocksRealtimeInvalidation';
import type { NoteBlock } from '../_lib/types';
import type { DocTab } from './NotePageContext';

function noteBlocksStructureChanged(prev: NoteBlock[], next: NoteBlock[]): boolean {
  if (prev.length !== next.length) return true;
  const prevById = new Map(prev.map((block) => [block.id, block]));
  return next.some((block) => {
    const previous = prevById.get(block.id);
    if (!previous) return true;
    return previous.parent_block_id !== block.parent_block_id
      || previous.order_index !== block.order_index
      || previous.type !== block.type;
  });
}

function noteBlocksServerStateChanged(prev: NoteBlock[], next: NoteBlock[]): boolean {
  if (noteBlocksStructureChanged(prev, next)) return true;
  const prevById = new Map(prev.map((block) => [block.id, block]));
  return next.some((block) => {
    const previous = prevById.get(block.id);
    if (!previous) return true;
    return previous.version !== block.version
      || previous.updated_at !== block.updated_at
      || previous.deleted_at !== block.deleted_at
      || previous.deleted_by !== block.deleted_by;
  });
}

export function useNoteBlockData(options: {
  selectedId: string | null;
  docTab: DocTab;
  setError: (error: string | null) => void;
  setPendingDeleteUndo: (blockId: string | null) => void;
  bootstrapBlocks?: { documentId: string; blocks: NoteBlock[] } | null;
  triggerSaveRef: React.MutableRefObject<() => void>;
  onAfterIdleReconcile?: () => void;
}) {
  const { selectedId, docTab, setError, setPendingDeleteUndo, bootstrapBlocks, triggerSaveRef, onAfterIdleReconcile } = options;

  const [blocks, _setBlocks] = useState<NoteBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [blocksSyncing, setBlocksSyncing] = useState(false);
  const [trashedBlocks, setTrashedBlocks] = useState<NoteBlock[]>([]);
  const [loadingTrashedBlocks, setLoadingTrashedBlocks] = useState(false);
  const [restoringBlockId, setRestoringBlockId] = useState<string | null>(null);
  const [purgingBlockId, setPurgingBlockId] = useState<string | null>(null);

  const blocksRef = useRef<NoteBlock[]>([]);
  const blockLoadGenRef = useRef(0);
  const bootstrapAppliedDocIdRef = useRef<string | null>(null);
  const reconcileDocumentIdRef = useRef<string | null>(null);
  const reconcileLoadGenRef = useRef(0);

  const clearReconcileTimer = useCallback(() => {
    cancelNoteReconcileIdle();
  }, []);

  /** 모든 블록 변경은 canonical store에 먼저 적용하고 React는 그 결과를 투영한다. */
  const setBlocks = useCallback((
    value: NoteBlock[] | ((prev: NoteBlock[]) => NoteBlock[]),
  ) => {
    const store = useNoteBlockStore.getState();
    const next = store.applyBlocks((current) => {
      const raw = typeof value === 'function' ? value(current) : value;
      return dedupeNoteBlocksById(raw);
    });
    blocksRef.current = next;
    _setBlocks(next);
  }, []);

  const handleEngineError = useCallback((error: Error) => {
    setError(error.message);
  }, [setError]);

  const documentEngine = useNoteDocumentEngine({
    documentId: selectedId,
    blocksRef,
    setBlocks,
    triggerSave: () => triggerSaveRef.current(),
    onError: handleEngineError,
  });

  const documentEngineRef = useRef(documentEngine);
  documentEngineRef.current = documentEngine;

  const scheduleIdleReconcile = useCallback((
    documentId: string,
    loadGen: number,
  ) => {
    reconcileDocumentIdRef.current = documentId;
    reconcileLoadGenRef.current = loadGen;
    scheduleNoteReconcileIdle(documentId);
  }, []);

  const handleRealtimeInvalidate = useCallback((documentId: string) => {
    if (selectedId !== documentId) return;
    reconcileDocumentIdRef.current = documentId;
    reconcileLoadGenRef.current = blockLoadGenRef.current;
    scheduleNoteReconcileRemote(documentId);
  }, [selectedId]);

  useNoteBlocksRealtimeInvalidation({
    documentId: selectedId,
    onInvalidate: handleRealtimeInvalidate,
  });

  const runReconcileFetch = useCallback(async (
    documentId: string,
    loadGen: number,
  ) => {
    if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
    if (
      isActiveNoteEditorFocused()
      || documentEngineRef.current.hasPendingContent()
      || documentEngineRef.current.hasPendingPersist()
    ) {
      scheduleIdleReconcile(documentId, loadGen);
      return;
    }
    try {
      await commitNoteDocumentBeforeLeave();
      if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
      if (
      isActiveNoteEditorFocused()
      || documentEngineRef.current.hasPendingContent()
      || documentEngineRef.current.hasPendingPersist()
    ) {
        scheduleIdleReconcile(documentId, loadGen);
        return;
      }
      const res = await fetch(
        `/api/admin/note/blocks/load?documentId=${encodeURIComponent(documentId)}`,
        { credentials: 'include' },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { blocks: NoteBlock[] };
      if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
      const merged = unionReconciledWithLocalBlocks(
        blocksRef.current,
        json.blocks ?? [],
        documentId,
      );
      if (wouldReconcileRegressActiveText(merged)) {
        scheduleIdleReconcile(documentId, loadGen);
        return;
      }
      if (wouldReconcileRegressLocalStructure(blocksRef.current, merged)) {
        scheduleIdleReconcile(documentId, loadGen);
        return;
      }
      if (!noteBlocksServerStateChanged(blocksRef.current, merged)) {
        onAfterIdleReconcile?.();
        return;
      }
      documentEngineRef.current.replaceBlocks(merged);
      rememberNoteDocumentBlocks(documentId, mergeBlocksWithStoreContent(
        merged.filter((block) => block.document_id === documentId),
      ));
      onAfterIdleReconcile?.();
    } catch (e) {
      devLogger.error('[Note] idle reconcile', e);
    }
  }, [onAfterIdleReconcile, scheduleIdleReconcile, selectedId]);

  useEffect(() => {
    registerNoteReconcileIdleHandler((documentId) => {
      if (reconcileDocumentIdRef.current !== documentId) return;
      void runReconcileFetch(documentId, reconcileLoadGenRef.current);
    });
    return () => {
      registerNoteReconcileIdleHandler(null);
      cancelNoteReconcileIdle();
    };
  }, [runReconcileFetch]);

  const persistToggleBodyMigration = useCallback(async (
    normalized: NoteBlock[],
    toggleMigration: ReturnType<typeof prepareLoadedNoteBlocks>['toggleMigration'],
  ) => {
    if (toggleMigration.created.length === 0) return;
    for (const child of toggleMigration.created) {
      const parentBlockId: string | null = child.parent_block_id ?? null;
      await documentEngineRef.current.persistCreateBlock({
        documentId: child.document_id,
        blockType: child.type,
        content: child.content as Record<string, unknown>,
        order_index: child.order_index,
        parent_block_id: parentBlockId,
        id: child.id,
      });
    }
    const togglePatches = toggleMigration.updatedToggleIds.map((id) => {
      const toggle = normalized.find((block) => block.id === id);
      return {
        id,
        content: stripToggleLegacyContentFields(
          (toggle?.content ?? {}) as Record<string, unknown>,
        ),
      };
    });
    if (togglePatches.length > 0) {
      await documentEngineRef.current.persistFieldPatches(togglePatches);
    }
  }, []);

  const installPreparedBlocks = useCallback((
    normalized: NoteBlock[],
    documentId: string,
    toggleMigration: ReturnType<typeof prepareLoadedNoteBlocks>['toggleMigration'],
  ) => {
    documentEngineRef.current.replaceBlocks(normalized);
    rememberNoteDocumentBlocks(documentId, normalized);
    const store = useNoteBlockStore.getState();
    store.setActiveDocumentId(documentId);

    if (toggleMigration.created.length > 0) {
      void persistToggleBodyMigration(normalized, toggleMigration).catch((e) => {
        devLogger.error('[Note] persistToggleBodyMigration', e);
      });
    }
  }, [persistToggleBodyMigration]);

  const replaceBlocks = useCallback((loaded: NoteBlock[], documentId: string) => {
    const { blocks: prepared, toggleMigration } = prepareLoadedNoteBlocks(loaded);
    const normalized = dedupeNoteBlocksById(prepared);
    installPreparedBlocks(normalized, documentId, toggleMigration);
  }, [installPreparedBlocks]);

  const applyFetchedBlocks = useCallback((
    loaded: NoteBlock[],
    documentId: string,
    options?: { mergeWithCurrent?: boolean },
  ) => {
    const { blocks: prepared, toggleMigration } = prepareLoadedNoteBlocks(loaded);
    const normalized = dedupeNoteBlocksById(prepared);

    if (options?.mergeWithCurrent && blocksRef.current.length > 0) {
      const merged = unionReconciledWithLocalBlocks(
        blocksRef.current,
        normalized,
        documentId,
      );
      if (wouldReconcileRegressActiveText(merged)) {
        return;
      }
      if (wouldReconcileRegressLocalStructure(blocksRef.current, merged)) {
        return;
      }
      if (!noteBlocksServerStateChanged(blocksRef.current, merged)) {
        return;
      }
      documentEngineRef.current.replaceBlocks(merged);
      const store = useNoteBlockStore.getState();
      store.setActiveDocumentId(documentId);
      rememberNoteDocumentBlocks(documentId, mergeBlocksWithStoreContent(
        merged.filter((block) => block.document_id === documentId),
      ));
      if (toggleMigration.created.length > 0) {
        void persistToggleBodyMigration(merged, toggleMigration).catch((e) => {
          devLogger.error('[Note] persistToggleBodyMigration', e);
        });
      }
      return;
    }

    installPreparedBlocks(normalized, documentId, toggleMigration);
  }, [installPreparedBlocks, persistToggleBodyMigration]);

  useEffect(() => {
    return () => {
      void commitAndResetNoteDocumentBeforeSwitch();
      clearReconcileTimer();
    };
  }, [selectedId, clearReconcileTimer]);

  useEffect(() => {
    bootstrapAppliedDocIdRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setBlocks([]);
      blocksRef.current = [];
      setLoadingBlocks(false);
      setBlocksSyncing(false);
      return;
    }

    let cancelled = false;
    const documentId = selectedId;

    const run = async () => {
      await commitAndResetNoteDocumentBeforeSwitch();
      if (cancelled) return;

      const loadGen = blockLoadGenRef.current + 1;
      blockLoadGenRef.current = loadGen;

      const finishFromNetwork = (loaded: NoteBlock[], mergeWithCurrent: boolean) => {
        if (cancelled || blockLoadGenRef.current !== loadGen) return;
        applyFetchedBlocks(loaded, documentId, { mergeWithCurrent });
        setLoadingBlocks(false);
        setBlocksSyncing(false);
        setError(null);
        scheduleIdleReconcile(documentId, loadGen);
      };

      if (bootstrapBlocks?.documentId === selectedId) {
        if (bootstrapAppliedDocIdRef.current === selectedId) {
          return;
        }
        bootstrapAppliedDocIdRef.current = selectedId;
        replaceBlocks(bootstrapBlocks.blocks, documentId);
        setLoadingBlocks(false);
        setBlocksSyncing(false);
        setError(null);
        scheduleIdleReconcile(documentId, loadGen);
        return;
      }

      const remembered = readRememberedNoteDocumentBlocks(documentId);
      const hasInstantSnapshot = Boolean(remembered?.length);
      if (hasInstantSnapshot && remembered) {
        replaceBlocks(remembered, documentId);
        setLoadingBlocks(false);
        setBlocksSyncing(true);
      } else {
        setBlocks([]);
        blocksRef.current = [];
        setLoadingBlocks(true);
        setBlocksSyncing(false);
      }

      try {
        const prefetched = await consumePrefetchedNoteBlocks(documentId);
        if (cancelled || blockLoadGenRef.current !== loadGen) return;

        if (prefetched) {
          finishFromNetwork(prefetched, hasInstantSnapshot);
          return;
        }

        const res = await fetch(
          `/api/admin/note/blocks/load?documentId=${encodeURIComponent(documentId)}&skipReconcile=true`,
          { credentials: 'include' },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || '블록 로드 실패');
        }
        const json = (await res.json()) as { blocks: NoteBlock[] };
        finishFromNetwork(json.blocks ?? [], hasInstantSnapshot);
      } catch (e) {
        devLogger.error('[Note] loadBlocks', e);
        if (!cancelled && blockLoadGenRef.current === loadGen) {
          if (!hasInstantSnapshot) {
            setError(e instanceof Error ? e.message : '로드 실패');
          }
          setLoadingBlocks(false);
          setBlocksSyncing(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      const leavingDocId = documentId;
      const snapshot = mergeBlocksWithStoreContent(
        blocksRef.current.filter((block) => block.document_id === leavingDocId),
      );
      if (snapshot.length > 0) {
        rememberNoteDocumentBlocks(leavingDocId, snapshot);
      }
    };
  }, [
    selectedId,
    setError,
    bootstrapBlocks,
    replaceBlocks,
    applyFetchedBlocks,
    setBlocks,
    scheduleIdleReconcile,
    clearReconcileTimer,
  ]);

  useEffect(() => {
    setTrashedBlocks([]);
    setPendingDeleteUndo(null);
    if (!selectedId) {
      resetNoteDocumentEditorState();
    }
  }, [selectedId, setPendingDeleteUndo]);

  useEffect(() => {
    blocksRef.current = blocks;
    if (blocks.length > 0 && selectedId) {
      const docBlocks = blocks.filter((block) => block.document_id === selectedId);
      if (docBlocks.length > 0) {
        rememberNoteDocumentBlocks(selectedId, docBlocks);
      }
    }
  }, [blocks, selectedId]);

  const childrenByParentBlock = useMemo(() => buildChildrenByParentBlock(blocks), [blocks]);
  const rootBlocks = useMemo(() => sortRootBlocks(blocks), [blocks]);
  const allSortableBlockIds = useMemo(() => flattenVisualBlockIds(blocks), [blocks]);

  const loadTrashedBlocks = useCallback(async () => {
    if (!selectedId) {
      setTrashedBlocks([]);
      return;
    }
    try {
      setLoadingTrashedBlocks(true);
      const res = await fetch(`/api/admin/note/blocks/trash?documentId=${encodeURIComponent(selectedId)}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '휴지통 블록 로드 실패');
      }
      const json = (await res.json()) as { blocks: NoteBlock[] };
      setTrashedBlocks(json.blocks ?? []);
    } catch (e) {
      devLogger.error('[Note] loadTrashedBlocks', e);
    } finally {
      setLoadingTrashedBlocks(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (docTab !== 'block-trash') return;
    void loadTrashedBlocks();
  }, [docTab, loadTrashedBlocks]);

  return {
    blocks,
    setBlocks,
    blocksRef,
    loadingBlocks,
    blocksSyncing,
    trashedBlocks,
    setTrashedBlocks,
    loadingTrashedBlocks,
    loadTrashedBlocks,
    restoringBlockId,
    setRestoringBlockId,
    purgingBlockId,
    setPurgingBlockId,
    childrenByParentBlock,
    rootBlocks,
    allSortableBlockIds,
    documentEngine,
  };
}
