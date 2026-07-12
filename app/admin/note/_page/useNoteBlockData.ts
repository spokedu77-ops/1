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
  serverSnapshotRecoversMissingBlocks,
  unionReconciledWithLocalBlocks,
  wouldReconcileRegressLocalStructure,
  wouldReconcileRegressActiveText,
} from '../_lib/noteBlockStateMerge';
import {
  cancelNoteReconcileIdle,
  isNoteLocalSaveSuppressed,
  registerNoteReconcileIdleHandler,
  scheduleNoteReconcileIdle,
  scheduleNoteReconcileRemote,
} from '../_lib/noteReconcileIdle';
import { consumePrefetchedNoteBlocks } from '../_lib/noteDocumentBlocksPrefetch';
import { noteBlocksLoadPath } from '../_lib/noteBlocksLoad';
import { isNoteLegacyReconcileEnabled } from '../_lib/noteLegacyReconcile';
import {
  readRememberedNoteDocumentBlocks,
  rememberNoteDocumentBlocks,
} from '../_lib/noteDocumentBlocksCache';
import { prepareLoadedNoteBlocks } from '../_components/noteBulletInput';
import { stripToggleLegacyContentFields } from '../_lib/noteToggleContent';
import { serverSnapshotHasBlocksMissingFrom } from '../_lib/notePersistOpToBlockOps';
import { isNoteOplogSyncEnabled } from '../_lib/noteOplogSync';
import { toNoteSyncUserMessage } from '../_lib/noteSyncErrors';
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
  const [blocksEmptyConfirmed, setBlocksEmptyConfirmed] = useState(false);
  const [trashedBlocks, setTrashedBlocks] = useState<NoteBlock[]>([]);
  const [loadingTrashedBlocks, setLoadingTrashedBlocks] = useState(false);
  const [restoringBlockId, setRestoringBlockId] = useState<string | null>(null);
  const [purgingBlockId, setPurgingBlockId] = useState<string | null>(null);

  const blocksRef = useRef<NoteBlock[]>([]);
  const blockLoadGenRef = useRef(0);
  const bootstrapAppliedDocIdRef = useRef<string | null>(null);
  const reconcileDocumentIdRef = useRef<string | null>(null);
  const reconcileLoadGenRef = useRef(0);
  const previousDocumentIdRef = useRef<string | null>(null);

  const clearReconcileTimer = useCallback(() => {
    cancelNoteReconcileIdle();
  }, []);

  const handleEngineError = useCallback((error: Error) => {
    const message = toNoteSyncUserMessage(error);
    if (!message) return;
    setError(message);
  }, [setError]);

  /** pipeline → React 투영. blocksRef는 store 구독으로 동기화 */
  const handleBlocksChanged = useCallback((next: NoteBlock[]) => {
    _setBlocks(next);
  }, []);

  const documentEngine = useNoteDocumentEngine({
    documentId: selectedId,
    onBlocksChanged: handleBlocksChanged,
    triggerSave: () => triggerSaveRef.current(),
    onError: handleEngineError,
  });

  const documentEngineRef = useRef(documentEngine);
  documentEngineRef.current = documentEngine;

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
    if (documentEngineRef.current.isOplogSyncEnabled()) {
      // legacy reconcile과 동일: 편집·pending 중이면 idle 뒤로 미룬다.
      if (
        isActiveNoteEditorFocused()
        || documentEngineRef.current.hasPendingContent()
        || documentEngineRef.current.hasPendingPersist()
      ) {
        reconcileDocumentIdRef.current = documentId;
        reconcileLoadGenRef.current = blockLoadGenRef.current;
        scheduleNoteReconcileIdle(documentId);
        return;
      }
      documentEngineRef.current.scheduleOplogPull();
      return;
    }
    if (!isNoteLegacyReconcileEnabled()) return;
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
    if (isNoteOplogSyncEnabled()) {
      if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
      if (
        isActiveNoteEditorFocused()
        || documentEngineRef.current.hasPendingContent()
        || documentEngineRef.current.hasPendingPersist()
      ) {
        scheduleIdleReconcile(documentId, loadGen);
        return;
      }
      documentEngineRef.current.scheduleOplogPull();
      return;
    }
    if (!isNoteLegacyReconcileEnabled()) return;
    if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
    if (isNoteLocalSaveSuppressed(documentId)) return;
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
        noteBlocksLoadPath(documentId),
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
      const recoversMissing = serverSnapshotRecoversMissingBlocks(
        blocksRef.current,
        json.blocks ?? [],
        documentId,
      );
      if (!recoversMissing && wouldReconcileRegressActiveText(merged)) {
        scheduleIdleReconcile(documentId, loadGen);
        return;
      }
      if (!recoversMissing && wouldReconcileRegressLocalStructure(blocksRef.current, merged)) {
        scheduleIdleReconcile(documentId, loadGen);
        return;
      }
      if (!noteBlocksServerStateChanged(blocksRef.current, merged)) {
        onAfterIdleReconcile?.();
        return;
      }
      documentEngineRef.current.dispatch({ type: 'syncSnapshot', blocks: json.blocks ?? [] });
      rememberNoteDocumentBlocks(documentId, mergeBlocksWithStoreContent(
        useNoteBlockStore.getState().getBlocksArray().filter((block) => block.document_id === documentId),
      ), { trustServer: true });
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

  const installPreparedBlocks = useCallback((
    normalized: NoteBlock[],
    documentId: string,
    toggleMigration: ReturnType<typeof prepareLoadedNoteBlocks>['toggleMigration'],
  ) => {
    documentEngineRef.current.replaceBlocks(normalized);
    rememberNoteDocumentBlocks(documentId, normalized, {
      trustServer: true,
      serverConfirmedEmpty: normalized.length === 0,
    });
    const store = useNoteBlockStore.getState();
    store.setActiveDocumentId(documentId);

    if (toggleMigration.created.length > 0 || toggleMigration.updatedChildPatches.length > 0) {
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
      if (!isNoteLegacyReconcileEnabled()) {
        if (documentEngineRef.current.isOplogSyncEnabled()) {
          documentEngineRef.current.dispatch({ type: 'syncSnapshot', blocks: normalized });
          const store = useNoteBlockStore.getState();
          store.setActiveDocumentId(documentId);
          rememberNoteDocumentBlocks(documentId, mergeBlocksWithStoreContent(
            useNoteBlockStore.getState().getBlocksArray().filter((block) => block.document_id === documentId),
          ), { trustServer: true });
        } else {
          installPreparedBlocks(normalized, documentId, toggleMigration);
        }
        if (toggleMigration.created.length > 0 || toggleMigration.updatedChildPatches.length > 0) {
          void persistToggleBodyMigration(normalized, toggleMigration).catch((e) => {
            devLogger.error('[Note] persistToggleBodyMigration', e);
          });
        }
        return;
      }
      const merged = unionReconciledWithLocalBlocks(
        blocksRef.current,
        normalized,
        documentId,
      );
      const recoversMissing = serverSnapshotRecoversMissingBlocks(
        blocksRef.current,
        normalized,
        documentId,
      );
      if (!recoversMissing && wouldReconcileRegressActiveText(merged)) {
        return;
      }
      if (!recoversMissing && wouldReconcileRegressLocalStructure(blocksRef.current, merged)) {
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
      ), { trustServer: true });
      if (toggleMigration.created.length > 0 || toggleMigration.updatedChildPatches.length > 0) {
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
      previousDocumentIdRef.current = null;
      setBlocks([]);
      setLoadingBlocks(false);
      setBlocksSyncing(false);
      setBlocksEmptyConfirmed(false);
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
    setBlocksEmptyConfirmed(false);

    const documentId = selectedId;
    const instantSnapshot = readRememberedNoteDocumentBlocks(documentId);
    if (instantSnapshot !== null) {
      replaceBlocks(instantSnapshot, documentId);
      setLoadingBlocks(false);
      setBlocksSyncing(true);
    } else {
      _setBlocks([]);
      setLoadingBlocks(true);
      setBlocksSyncing(false);
    }

    let cancelled = false;

    const run = async () => {
      await commitAndResetNoteDocumentBeforeSwitch();
      if (cancelled) return;

      const loadGen = blockLoadGenRef.current + 1;
      blockLoadGenRef.current = loadGen;

      const finishOplogPostSync = (serverLoaded: NoteBlock[]) => {
        const { toggleMigration } = prepareLoadedNoteBlocks(serverLoaded);
        const store = useNoteBlockStore.getState();
        store.setActiveDocumentId(documentId);
        const serverForDoc = serverLoaded.filter((block) => block.document_id === documentId);
        const current = documentEngineRef.current.getBlocks().filter(
          (block) => block.document_id === documentId,
        );
        if (
          (current.length === 0 && serverForDoc.length > 0)
          || serverSnapshotHasBlocksMissingFrom(current, serverForDoc)
        ) {
          finishOplogLoadFallback(serverLoaded, false);
          setBlocksEmptyConfirmed(false);
          return;
        }
        rememberNoteDocumentBlocks(
          documentId,
          mergeBlocksWithStoreContent(current),
          {
            trustServer: true,
            serverConfirmedEmpty: current.length === 0 && serverForDoc.length === 0,
          },
        );
        setBlocksEmptyConfirmed(current.length === 0 && serverForDoc.length === 0);
        if (toggleMigration.created.length > 0 || toggleMigration.updatedChildPatches.length > 0) {
          void persistToggleBodyMigration(
            current.length > 0 ? current : serverLoaded,
            toggleMigration,
          ).catch((e) => {
            devLogger.error('[Note] persistToggleBodyMigration', e);
          });
        }
      };

      const finishOplogLoadFallback = (
        loaded: NoteBlock[],
        mergeWithCurrent: boolean,
      ) => {
        const { blocks: prepared, toggleMigration } = prepareLoadedNoteBlocks(loaded);
        let normalized = dedupeNoteBlocksById(prepared);
        const remembered = readRememberedNoteDocumentBlocks(documentId);
        if (remembered && remembered.length > 0) {
          if (normalized.length === 0) {
            const fallback = prepareLoadedNoteBlocks(remembered);
            normalized = dedupeNoteBlocksById(fallback.blocks);
          } else {
            const merged = unionReconciledWithLocalBlocks(
              remembered,
              normalized,
              documentId,
            );
            if (!wouldReconcileRegressActiveText(merged)) {
              normalized = merged;
            }
          }
        }
        const store = useNoteBlockStore.getState();
        store.setActiveDocumentId(documentId);
        if (mergeWithCurrent && blocksRef.current.length > 0) {
          documentEngineRef.current.dispatch({ type: 'syncSnapshot', blocks: normalized });
        } else {
          documentEngineRef.current.replaceBlocks(normalized);
        }
        const current = documentEngineRef.current.getBlocks().filter(
          (block) => block.document_id === documentId,
        );
        const serverForDoc = normalized.filter((block) => block.document_id === documentId);
        rememberNoteDocumentBlocks(
          documentId,
          mergeBlocksWithStoreContent(current),
          {
            trustServer: true,
            serverConfirmedEmpty: current.length === 0 && serverForDoc.length === 0,
          },
        );
        setBlocksEmptyConfirmed(current.length === 0 && serverForDoc.length === 0);
        if (toggleMigration.created.length > 0 || toggleMigration.updatedChildPatches.length > 0) {
          void persistToggleBodyMigration(
            current.length > 0 ? current : normalized,
            toggleMigration,
          ).catch((e) => {
            devLogger.error('[Note] persistToggleBodyMigration', e);
          });
        }
      };

      const finishFromNetwork = async (loaded: NoteBlock[], mergeWithCurrent: boolean) => {
        if (cancelled || blockLoadGenRef.current !== loadGen) return;
        if (documentEngineRef.current.isOplogSyncEnabled()) {
          try {
            await documentEngineRef.current.syncWithServer(loaded);
            finishOplogPostSync(loaded);
          } catch (e) {
            devLogger.error('[Note] oplog syncWithServer', e);
            documentEngineRef.current.dispatch({ type: 'hydrate', blocks: loaded });
            finishOplogLoadFallback(loaded, mergeWithCurrent);
          }
        } else {
          applyFetchedBlocks(loaded, documentId, { mergeWithCurrent });
          if (isNoteLegacyReconcileEnabled()) {
            scheduleIdleReconcile(documentId, loadGen);
          }
        }
        setLoadingBlocks(false);
        setBlocksSyncing(false);
        setError(null);
      };

      if (bootstrapBlocks?.documentId === selectedId) {
        if (bootstrapAppliedDocIdRef.current === selectedId) {
          return;
        }
        bootstrapAppliedDocIdRef.current = selectedId;
        if (documentEngineRef.current.isOplogSyncEnabled()) {
          void documentEngineRef.current.syncWithServer(bootstrapBlocks.blocks).then(() => {
            if (cancelled || blockLoadGenRef.current !== loadGen) return;
            finishOplogPostSync(bootstrapBlocks.blocks);
            setLoadingBlocks(false);
            setBlocksSyncing(false);
            setError(null);
          }).catch((e) => {
            devLogger.error('[Note] oplog bootstrap sync', e);
            documentEngineRef.current.dispatch({ type: 'hydrate', blocks: bootstrapBlocks.blocks });
            finishOplogLoadFallback(bootstrapBlocks.blocks, false);
            setLoadingBlocks(false);
            setBlocksSyncing(false);
            setError(null);
          });
        } else {
          replaceBlocks(bootstrapBlocks.blocks, documentId);
          setLoadingBlocks(false);
          setBlocksSyncing(false);
          setError(null);
          if (isNoteLegacyReconcileEnabled()) {
            scheduleIdleReconcile(documentId, loadGen);
          }
        }
        return;
      }

      const oplogEnabled = isNoteOplogSyncEnabled();
      if (oplogEnabled) {
        try {
          const localBlocks = await documentEngineRef.current.hydrateFromLocal();
          if (cancelled || blockLoadGenRef.current !== loadGen) return;
          if (localBlocks && localBlocks.length > 0) {
            useNoteBlockStore.getState().setActiveDocumentId(documentId);
            setLoadingBlocks(false);
            setBlocksSyncing(true);
          }
        } catch (e) {
          devLogger.error('[Note] oplog hydrateFromLocal', e);
        }
      }

      const remembered = readRememberedNoteDocumentBlocks(documentId);
      const hasInstantSnapshot = remembered !== null;
      const currentDocBlockCount = blocksRef.current.filter(
        (block) => block.document_id === documentId,
      ).length;
      if (hasInstantSnapshot && !oplogEnabled) {
        replaceBlocks(remembered, documentId);
        setLoadingBlocks(false);
        setBlocksSyncing(true);
      } else if (hasInstantSnapshot && oplogEnabled && currentDocBlockCount === 0) {
        replaceBlocks(remembered, documentId);
        setLoadingBlocks(false);
        setBlocksSyncing(true);
      } else if (currentDocBlockCount === 0) {
        setLoadingBlocks(true);
        setBlocksSyncing(false);
      } else {
        setLoadingBlocks(false);
        setBlocksSyncing(true);
      }

      try {
        const prefetched = await consumePrefetchedNoteBlocks(documentId);
        if (cancelled || blockLoadGenRef.current !== loadGen) return;

        if (prefetched && prefetched.length > 0) {
          await finishFromNetwork(prefetched, false);
          return;
        }

        const res = await fetch(
          noteBlocksLoadPath(documentId),
          { credentials: 'include' },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || '블록 로드 실패');
        }
        const json = (await res.json()) as { blocks: NoteBlock[] };
        await finishFromNetwork(
          json.blocks ?? [],
          false,
        );
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
