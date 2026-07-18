'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  buildChildrenByParentBlock,
  dedupeNoteBlocksById,
  flattenVisualBlockIdsWithOptions,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';
import {
  selectDocumentBlocks,
  useActiveDocumentBlocks,
  useNoteBlockStore,
} from '../_store/noteBlockStore';
import {
  commitNoteDocumentBeforeLeave,
  documentContentAheadOfSnapshot,
  isActiveNoteEditorFocused,
  resetNoteDocumentEditorState,
} from '../_lib/noteBlockStateMerge';
import {
  cancelNoteReconcileIdle,
  isNoteLocalSaveSuppressed,
  registerNoteReconcileIdleHandler,
  scheduleNoteReconcileIdle,
  scheduleNoteReconcileRemote,
} from '../_lib/noteReconcileIdle';
import { consumePrefetchedNoteBlocks } from '../_lib/noteDocumentBlocksPrefetch';
import { readRememberedNoteDocumentBlocks } from '../_lib/noteDocumentBlocksCache';
import { readLocalDocument } from '../_lib/noteLocalDb';
import { openNoteDocument } from '../_lib/noteDocumentOpen';
import type { NoteBlock } from '../_lib/types';
import { prepareLoadedNoteBlocks } from '../_components/noteBulletInput';
import { stripToggleLegacyContentFields } from '../_lib/noteToggleContent';
import { toNoteSyncUserMessage } from '../_lib/noteSyncErrors';
import { useNoteDocumentEngine } from '../_hooks/useNoteDocumentEngine';
import { useNoteBlocksRealtimeInvalidation } from '../_hooks/useNoteBlocksRealtimeInvalidation';
import {
  traceLoadingState,
  traceRealtime,
} from '../_lib/noteFlickerTrace';
import type { DocTab } from './NotePageContext';

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

  const blocks = useActiveDocumentBlocks(selectedId);

  const [loadingBlocks, _setLoadingBlocks] = useState(false);
  const [blocksSyncing, _setBlocksSyncing] = useState(false);
  const [blocksEmptyConfirmed, _setBlocksEmptyConfirmed] = useState(false);
  /** 현재 selectedId에 대해 최초 서버 load가 끝난 문서 id — 전환 직후 빈 껍데기 방지 */
  const [loadSettledDocId, _setLoadSettledDocId] = useState<string | null>(null);
  const [trashedBlocks, setTrashedBlocks] = useState<NoteBlock[]>([]);
  const [loadingTrashedBlocks, setLoadingTrashedBlocks] = useState(false);
  const [restoringBlockId, setRestoringBlockId] = useState<string | null>(null);
  const [purgingBlockId, setPurgingBlockId] = useState<string | null>(null);

  const blocksRef = useRef<NoteBlock[]>([]);
  const blockLoadGenRef = useRef(0);
  const bootstrapAppliedDocIdRef = useRef<string | null>(null);
  const bootstrapBlocksRef = useRef(bootstrapBlocks);
  bootstrapBlocksRef.current = bootstrapBlocks;
  const reconcileDocumentIdRef = useRef<string | null>(null);
  const previousDocumentIdRef = useRef<string | null>(null);
  const openLayoutSyncKeyRef = useRef<string | null>(null);
  const loadSettledGenRef = useRef(0);

  const setLoadingBlocks = useCallback((
    value: boolean | ((prev: boolean) => boolean),
    tag: string,
  ) => {
    _setLoadingBlocks((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (prev === next) return prev;
      traceLoadingState('loadingBlocks', prev, next, tag, selectedId);
      return next;
    });
  }, [selectedId]);

  const setBlocksSyncing = useCallback((
    value: boolean | ((prev: boolean) => boolean),
    tag: string,
  ) => {
    _setBlocksSyncing((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (prev === next) return prev;
      traceLoadingState('blocksSyncing', prev, next, tag, selectedId);
      return next;
    });
  }, [selectedId]);

  const setBlocksEmptyConfirmed = useCallback((
    value: boolean | ((prev: boolean) => boolean),
    tag: string,
  ) => {
    _setBlocksEmptyConfirmed((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (prev === next) return prev;
      traceLoadingState('blocksEmptyConfirmed', prev, next, tag, selectedId);
      return next;
    });
  }, [selectedId]);

  const setLoadSettledDocId = useCallback((
    value: string | null | ((prev: string | null) => string | null),
    tag: string,
  ) => {
    _setLoadSettledDocId((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (prev === next) return prev;
      traceLoadingState('loadSettledDocId', prev, next, tag, selectedId);
      return next;
    });
  }, [selectedId]);

  const clearReconcileTimer = useCallback(() => {
    cancelNoteReconcileIdle();
  }, []);

  const handleEngineError = useCallback((error: Error) => {
    const message = toNoteSyncUserMessage(error);
    if (!message) return;
    setError(message);
  }, [setError]);

  const documentEngine = useNoteDocumentEngine({
    documentId: selectedId,
    triggerSave: () => triggerSaveRef.current(),
    onError: handleEngineError,
  });

  const documentEngineRef = useRef(documentEngine);
  documentEngineRef.current = documentEngine;

  const shouldDeferRemoteSync = useCallback(async () => {
    if (isActiveNoteEditorFocused()) return true;
    const engine = documentEngineRef.current;
    if (engine.hasPendingContent()) return true;
    if (engine.hasPendingPersist()) return true;
    if (engine.hasUnpublishedTopologySync()) return true;
    if (await engine.hasPendingOutbound()) return true;
    const storeForDoc = selectDocumentBlocks(useNoteBlockStore.getState(), selectedId);
    const coordinatorForDoc = engine.getCoordinatorBlocks()
      .filter((block) => block.document_id === selectedId);
    if (documentContentAheadOfSnapshot(storeForDoc, coordinatorForDoc)) return true;
    return false;
  }, [selectedId]);

  const shouldDeferRemoteSyncSync = useCallback(() => (
    isActiveNoteEditorFocused()
    || documentEngineRef.current.hasPendingContent()
    || documentEngineRef.current.hasPendingPersist()
    || documentEngineRef.current.hasUnpublishedTopologySync()
  ), []);

  const scheduleDeferredOplogPull = useCallback((documentId: string) => {
    reconcileDocumentIdRef.current = documentId;
    scheduleNoteReconcileIdle(documentId);
  }, []);

  const runDeferredOplogPull = useCallback(async (documentId: string) => {
    if (selectedId !== documentId) return;
    if (await shouldDeferRemoteSync()) {
      traceRealtime('pull_deferred_again', documentId);
      scheduleDeferredOplogPull(documentId);
      return;
    }
    traceRealtime('pull_executed', documentId);
    documentEngineRef.current.scheduleOplogPull();
    onAfterIdleReconcile?.();
  }, [onAfterIdleReconcile, scheduleDeferredOplogPull, selectedId, shouldDeferRemoteSync]);

  const handleRealtimeInvalidate = useCallback((documentId: string) => {
    traceRealtime('received', documentId);
    if (selectedId !== documentId) {
      traceRealtime('ignored_wrong_doc', documentId);
      return;
    }
    if (isNoteLocalSaveSuppressed(documentId)) {
      traceRealtime('suppressed', documentId);
      return;
    }
    reconcileDocumentIdRef.current = documentId;
    if (shouldDeferRemoteSyncSync()) {
      traceRealtime('deferred', documentId);
      scheduleDeferredOplogPull(documentId);
      return;
    }
    void shouldDeferRemoteSync().then((defer) => {
      if (selectedId !== documentId) return;
      if (defer) {
        traceRealtime('deferred', documentId);
        scheduleDeferredOplogPull(documentId);
        return;
      }
      traceRealtime('remote_scheduled', documentId);
      scheduleNoteReconcileRemote(documentId);
    });
  }, [scheduleDeferredOplogPull, selectedId, shouldDeferRemoteSync, shouldDeferRemoteSyncSync]);

  useNoteBlocksRealtimeInvalidation({
    documentId: selectedId,
    onInvalidate: handleRealtimeInvalidate,
  });

  useEffect(() => {
    registerNoteReconcileIdleHandler((documentId) => {
      if (reconcileDocumentIdRef.current !== documentId) return;
      void runDeferredOplogPull(documentId);
    });
    return () => {
      registerNoteReconcileIdleHandler(null);
      cancelNoteReconcileIdle();
    };
  }, [runDeferredOplogPull]);

  /** blocksRef는 Zustand SSOT의 읽기 전용 미러 — 직접 쓰기 금지 */
  useEffect(() => {
    const syncRef = () => {
      const state = useNoteBlockStore.getState();
      blocksRef.current = selectDocumentBlocks(state, selectedId);
    };
    syncRef();
    return useNoteBlockStore.subscribe(syncRef);
  }, [selectedId]);

  /** 구조 변경 — 반드시 pipeline 경유 */
  const setBlocks = useCallback((
    value: NoteBlock[] | ((prev: NoteBlock[]) => NoteBlock[]),
  ) => {
    const state = useNoteBlockStore.getState();
    const current = selectDocumentBlocks(state, selectedId);
    const raw = typeof value === 'function' ? value(current) : value;
    const next = dedupeNoteBlocksById(raw);
    if (documentEngineRef.current && selectedId) {
      documentEngineRef.current.replaceBlocks(next);
      return;
    }
    useNoteBlockStore.getState().replaceBlocks(next);
  }, [selectedId]);

  const persistToggleBodyMigration = useCallback(async (
    normalized: NoteBlock[],
    toggleMigration: ReturnType<typeof prepareLoadedNoteBlocks>['toggleMigration'],
  ) => {
    if (toggleMigration.created.length === 0 && toggleMigration.updatedChildPatches.length === 0) {
      if (toggleMigration.updatedToggleIds.length === 0) return;
    }
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
    if (toggleMigration.updatedChildPatches.length > 0) {
      await documentEngineRef.current.persistFieldPatches(toggleMigration.updatedChildPatches);
    }
  }, []);

  useEffect(() => {
    return () => {
      void commitNoteDocumentBeforeLeave();
      clearReconcileTimer();
    };
  }, [selectedId, clearReconcileTimer]);

  useEffect(() => {
    bootstrapAppliedDocIdRef.current = null;
  }, [selectedId]);

  useLayoutEffect(() => {
    if (!selectedId) {
      openLayoutSyncKeyRef.current = null;
      previousDocumentIdRef.current = null;
      useNoteBlockStore.getState().setActiveDocumentId(null);
      useNoteBlockStore.getState().replaceBlocks([]);
      setLoadingBlocks(false, 'selectedId:null');
      setBlocksSyncing(false, 'selectedId:null');
      setBlocksEmptyConfirmed(false, 'selectedId:null');
      setLoadSettledDocId(null, 'selectedId:null');
      return;
    }

    if (openLayoutSyncKeyRef.current === selectedId) return;
    openLayoutSyncKeyRef.current = selectedId;
    previousDocumentIdRef.current = selectedId;

    const documentId = selectedId;
    useNoteBlockStore.getState().setActiveDocumentId(documentId);
    const remembered = readRememberedNoteDocumentBlocks(documentId);
    // UI만 비움 — engine.replaceBlocks([])는 coordinator.persistLocal([])로
    // IndexedDB 스냅샷을 지워 미푸시 드래그 순서를 날린다.
    useNoteBlockStore.getState().replaceBlocks(remembered ?? []);
    void readLocalDocument(documentId);

    setLoadSettledDocId(remembered ? documentId : null, 'open:start');
    setLoadingBlocks(!remembered, 'open:start');
    setBlocksEmptyConfirmed(false, 'open:start');
    setBlocksSyncing(!!remembered, 'open:start:remembered');
  }, [selectedId, setBlocksEmptyConfirmed, setLoadSettledDocId, setLoadingBlocks, setBlocksSyncing]);

  useEffect(() => {
    if (!selectedId) return;

    const documentId = selectedId;
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;

      const loadGen = blockLoadGenRef.current + 1;
      blockLoadGenRef.current = loadGen;

      const markLoadSettled = () => {
        if (cancelled || blockLoadGenRef.current !== loadGen) return;
        if (loadSettledGenRef.current === loadGen) return;
        loadSettledGenRef.current = loadGen;
        setLoadSettledDocId(documentId, 'open:loadSettled');
        setLoadingBlocks(false, 'open:loadSettled');
        setBlocksSyncing(false, 'open:loadSettled');
      };

      let bootstrapForOpen: NoteBlock[] | null = null;
      const bootstrapPayload = bootstrapBlocksRef.current;
      if (
        bootstrapPayload?.documentId === documentId
        && bootstrapAppliedDocIdRef.current !== documentId
      ) {
        bootstrapAppliedDocIdRef.current = documentId;
        bootstrapForOpen = bootstrapPayload.blocks;
      } else if (bootstrapAppliedDocIdRef.current !== documentId) {
        for (let attempt = 0; attempt < 24; attempt += 1) {
          if (cancelled || blockLoadGenRef.current !== loadGen) return;
          const lateBootstrap = bootstrapBlocksRef.current;
          if (lateBootstrap?.documentId === documentId) {
            bootstrapAppliedDocIdRef.current = documentId;
            bootstrapForOpen = lateBootstrap.blocks;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      try {
        const prefetched = bootstrapForOpen
          ? null
          : await consumePrefetchedNoteBlocks(documentId);
        if (cancelled || blockLoadGenRef.current !== loadGen) return;

        const result = await openNoteDocument({
          documentId,
          engine: documentEngineRef.current,
          bootstrapBlocks: bootstrapForOpen,
          prefetchedBlocks: prefetched,
          shouldAbort: () => cancelled || blockLoadGenRef.current !== loadGen,
        });

        if (cancelled || blockLoadGenRef.current !== loadGen) return;

        setBlocksEmptyConfirmed(result.emptyConfirmed, 'open:result');
        if (
          result.toggleMigration.created.length > 0
          || result.toggleMigration.updatedChildPatches.length > 0
        ) {
          void persistToggleBodyMigration(
            result.blocks,
            result.toggleMigration,
          ).catch((e) => {
            devLogger.error('[Note] persistToggleBodyMigration', e);
          });
        }
        markLoadSettled();
        setError(null);
      } catch (e) {
        const userMessage = toNoteSyncUserMessage(e);
        if (userMessage) {
          devLogger.error('[Note] openNoteDocument', e);
        }
        if (!cancelled && blockLoadGenRef.current === loadGen) {
          if (userMessage) setError(userMessage);
          markLoadSettled();
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    selectedId,
    setError,
    persistToggleBodyMigration,
    setBlocksEmptyConfirmed,
    setBlocksSyncing,
    setLoadSettledDocId,
    setLoadingBlocks,
  ]);

  useEffect(() => {
    setTrashedBlocks([]);
    setPendingDeleteUndo(null);
    if (!selectedId) {
      resetNoteDocumentEditorState();
    }
  }, [selectedId, setPendingDeleteUndo]);

  const childrenByParentBlock = useMemo(() => buildChildrenByParentBlock(blocks), [blocks]);
  const rootBlocks = useMemo(() => sortRootBlocks(blocks), [blocks]);
  const allSortableBlockIds = useMemo(
    () => flattenVisualBlockIdsWithOptions(blocks, { skipChildrenOfCollapsedToggles: true }),
    [blocks],
  );

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
    blocksEmptyConfirmed,
    loadSettledDocId,
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
