'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  buildChildrenByParentBlock,
  dedupeNoteBlocksById,
  flattenVisualBlockIds,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  commitNoteDocumentBeforeLeave,
  isActiveNoteEditorFocused,
  mergeBlocksWithStoreContent,
  resetNoteDocumentEditorState,
} from '../_lib/noteBlockStateMerge';
import {
  cancelNoteReconcileIdle,
  registerNoteReconcileIdleHandler,
  scheduleNoteReconcileIdle,
} from '../_lib/noteReconcileIdle';
import { consumePrefetchedNoteBlocks } from '../_lib/noteDocumentBlocksPrefetch';
import {
  rememberNoteDocumentBlocks,
} from '../_lib/noteDocumentBlocksCache';
import { openNoteDocument, prepareNoteDocumentOpenSync } from '../_lib/noteDocumentOpen';
import { prepareLoadedNoteBlocks } from '../_components/noteBulletInput';
import { stripToggleLegacyContentFields } from '../_lib/noteToggleContent';
import { toNoteSyncUserMessage } from '../_lib/noteSyncErrors';
import { useNoteDocumentEngine } from '../_hooks/useNoteDocumentEngine';
import { useNoteBlocksRealtimeInvalidation } from '../_hooks/useNoteBlocksRealtimeInvalidation';
import type { NoteBlock } from '../_lib/types';
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

  const [blocks, _setBlocks] = useState<NoteBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [blocksSyncing, setBlocksSyncing] = useState(false);
  const [blocksEmptyConfirmed, setBlocksEmptyConfirmed] = useState(false);
  /** 현재 selectedId에 대해 최초 서버 load가 끝난 문서 id — 전환 직후 빈 껍데기 방지 */
  const [loadSettledDocId, setLoadSettledDocId] = useState<string | null>(null);
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

  const clearReconcileTimer = useCallback(() => {
    cancelNoteReconcileIdle();
  }, []);

  const handleEngineError = useCallback((error: Error) => {
    const message = toNoteSyncUserMessage(error);
    if (!message) return;
    setError(message);
  }, [setError]);

  /** pipeline + store → React 투영 (단일 구독) */
  const handleBlocksChanged = useCallback((next: NoteBlock[]) => {
    _setBlocks(next);
  }, []);

  useEffect(() => {
    const projectStore = () => {
      _setBlocks(useNoteBlockStore.getState().getBlocksArray());
    };
    projectStore();
    return useNoteBlockStore.subscribe(projectStore);
  }, []);

  const documentEngine = useNoteDocumentEngine({
    documentId: selectedId,
    onBlocksChanged: handleBlocksChanged,
    triggerSave: () => triggerSaveRef.current(),
    onError: handleEngineError,
  });

  const documentEngineRef = useRef(documentEngine);
  documentEngineRef.current = documentEngine;

  const shouldDeferRemoteSync = useCallback(() => (
    isActiveNoteEditorFocused()
    || documentEngineRef.current.hasPendingContent()
    || documentEngineRef.current.hasPendingPersist()
  ), []);

  const scheduleDeferredOplogPull = useCallback((documentId: string) => {
    reconcileDocumentIdRef.current = documentId;
    scheduleNoteReconcileIdle(documentId);
  }, []);

  const runDeferredOplogPull = useCallback(async (documentId: string) => {
    if (selectedId !== documentId) return;
    if (shouldDeferRemoteSync()) {
      scheduleDeferredOplogPull(documentId);
      return;
    }
    documentEngineRef.current.scheduleOplogPull();
    onAfterIdleReconcile?.();
  }, [onAfterIdleReconcile, scheduleDeferredOplogPull, selectedId, shouldDeferRemoteSync]);

  const handleRealtimeInvalidate = useCallback((documentId: string) => {
    if (selectedId !== documentId) return;
    if (shouldDeferRemoteSync()) {
      scheduleDeferredOplogPull(documentId);
      return;
    }
    documentEngineRef.current.scheduleOplogPull();
  }, [scheduleDeferredOplogPull, selectedId, shouldDeferRemoteSync]);

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
      blocksRef.current = useNoteBlockStore.getState().getBlocksArray();
    };
    syncRef();
    return useNoteBlockStore.subscribe(syncRef);
  }, []);

  /** 구조 변경 — 반드시 pipeline 경유 */
  const setBlocks = useCallback((
    value: NoteBlock[] | ((prev: NoteBlock[]) => NoteBlock[]),
  ) => {
    const current = useNoteBlockStore.getState().getBlocksArray();
    const raw = typeof value === 'function' ? value(current) : value;
    const next = dedupeNoteBlocksById(raw);
    if (documentEngineRef.current) {
      documentEngineRef.current.replaceBlocks(next);
      return;
    }
    useNoteBlockStore.getState().applyBlocks(() => next);
    _setBlocks(next);
  }, []);

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
      previousDocumentIdRef.current = null;
      setBlocks([]);
      setLoadingBlocks(false);
      setBlocksSyncing(false);
      setBlocksEmptyConfirmed(false);
      setLoadSettledDocId(null);
      return;
    }

    const previousId = previousDocumentIdRef.current;
    if (previousId && previousId !== selectedId) {
      const leavingSnapshot = mergeBlocksWithStoreContent(
        blocksRef.current.filter((block) => block.document_id === previousId),
      );
      if (leavingSnapshot.length > 0) {
        rememberNoteDocumentBlocks(previousId, leavingSnapshot);
      }
    }
    previousDocumentIdRef.current = selectedId;

    const documentId = selectedId;
    const prep = prepareNoteDocumentOpenSync(documentId, documentEngineRef.current);
    if (prep.hasCache) {
      setLoadSettledDocId(documentId);
      setLoadingBlocks(false);
      setBlocksEmptyConfirmed(prep.emptyConfirmed);
    } else {
      setBlocksEmptyConfirmed(false);
      setLoadSettledDocId(null);
      setLoadingBlocks(true);
    }
    setBlocksSyncing(false);
  }, [selectedId, setBlocks]);

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
        setLoadSettledDocId(documentId);
        setLoadingBlocks(false);
        setBlocksSyncing(false);
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
        for (let attempt = 0; attempt < 40; attempt += 1) {
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
        });

        if (cancelled || blockLoadGenRef.current !== loadGen) return;

        setBlocksEmptyConfirmed(result.emptyConfirmed);
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
        devLogger.error('[Note] openNoteDocument', e);
        if (!cancelled && blockLoadGenRef.current === loadGen) {
          setError(e instanceof Error ? e.message : '로드 실패');
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
  ]);

  useEffect(() => {
    setTrashedBlocks([]);
    setPendingDeleteUndo(null);
    if (!selectedId) {
      resetNoteDocumentEditorState();
    }
  }, [selectedId, setPendingDeleteUndo]);

  useEffect(() => {
    if (!selectedId || blocksSyncing) return;
    const docBlocks = blocks.filter((block) => block.document_id === selectedId);
    if (docBlocks.length === 0) return;
    rememberNoteDocumentBlocks(selectedId, docBlocks);
  }, [blocks, blocksSyncing, selectedId]);

  const documentBlocks = useMemo(
    () => (selectedId ? blocks.filter((block) => block.document_id === selectedId) : blocks),
    [blocks, selectedId],
  );
  const childrenByParentBlock = useMemo(() => buildChildrenByParentBlock(documentBlocks), [documentBlocks]);
  const rootBlocks = useMemo(() => sortRootBlocks(documentBlocks), [documentBlocks]);
  const allSortableBlockIds = useMemo(() => flattenVisualBlockIds(documentBlocks), [documentBlocks]);

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
