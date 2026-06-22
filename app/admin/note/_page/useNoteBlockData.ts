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
  mergeBlocksWithStoreContent,
  mergeReconciledBlocks,
  resetNoteDocumentEditorState,
} from '../_lib/noteBlockStateMerge';
import {
  cancelNoteReconcileIdle,
  registerNoteReconcileIdleHandler,
  scheduleNoteReconcileIdle,
} from '../_lib/noteReconcileIdle';
import { consumePrefetchedNoteBlocks } from '../_lib/noteDocumentBlocksPrefetch';
import {
  readRememberedNoteDocumentBlocks,
  rememberNoteDocumentBlocks,
} from '../_lib/noteDocumentBlocksCache';
import { normalizeLoadedNoteBlocks } from '../_components/noteBulletInput';
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

export function useNoteBlockData(options: {
  selectedId: string | null;
  docTab: DocTab;
  setError: (error: string | null) => void;
  setPendingDeleteUndo: (blockId: string | null) => void;
  bootstrapBlocks?: { documentId: string; blocks: NoteBlock[] } | null;
}) {
  const { selectedId, docTab, setError, setPendingDeleteUndo, bootstrapBlocks } = options;

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

  /** 구조 변경 시 React state가 오래된 content를 쓰지 않도록 스토어와 병합 */
  const setBlocks = useCallback((
    value: NoteBlock[] | ((prev: NoteBlock[]) => NoteBlock[]),
  ) => {
    _setBlocks((reactPrev) => {
      const base = mergeBlocksWithStoreContent(blocksRef.current);
      const raw = typeof value === 'function' ? value(base) : value;
      const next = dedupeNoteBlocksById(raw);
      blocksRef.current = next;
      return next;
    });
  }, []);

  const runReconcileFetch = useCallback(async (
    documentId: string,
    loadGen: number,
  ) => {
    if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
    try {
      await commitNoteDocumentBeforeLeave();
      if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
      const res = await fetch(
        `/api/admin/note/blocks/load?documentId=${encodeURIComponent(documentId)}`,
        { credentials: 'include' },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { blocks: NoteBlock[] };
      if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
      const merged = mergeReconciledBlocks(blocksRef.current, json.blocks ?? []);
      if (!noteBlocksStructureChanged(blocksRef.current, merged)) return;
      setBlocks(merged);
      rememberNoteDocumentBlocks(documentId, merged);
    } catch (e) {
      devLogger.error('[Note] idle reconcile', e);
    }
  }, [selectedId, setBlocks]);

  const scheduleIdleReconcile = useCallback((
    documentId: string,
    loadGen: number,
  ) => {
    reconcileDocumentIdRef.current = documentId;
    reconcileLoadGenRef.current = loadGen;
    scheduleNoteReconcileIdle(documentId);
  }, []);

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

  const replaceBlocks = useCallback((loaded: NoteBlock[], documentId: string) => {
    const normalized = dedupeNoteBlocksById(normalizeLoadedNoteBlocks(loaded));
    blocksRef.current = normalized;
    _setBlocks(normalized);
    rememberNoteDocumentBlocks(documentId, normalized);
    const store = useNoteBlockStore.getState();
    store.setActiveDocumentId(documentId);
    store.hydrate(normalized);
  }, []);

  const applyFetchedBlocks = useCallback((
    loaded: NoteBlock[],
    documentId: string,
    options?: { mergeWithCurrent?: boolean },
  ) => {
    const normalized = dedupeNoteBlocksById(normalizeLoadedNoteBlocks(loaded));
    rememberNoteDocumentBlocks(documentId, normalized);

    if (options?.mergeWithCurrent && blocksRef.current.length > 0) {
      const merged = mergeReconciledBlocks(blocksRef.current, normalized);
      if (!noteBlocksStructureChanged(blocksRef.current, merged)) {
        return;
      }
      setBlocks(merged);
      const store = useNoteBlockStore.getState();
      store.setActiveDocumentId(documentId);
      store.syncBlocksStructure(merged);
      return;
    }

    replaceBlocks(normalized, documentId);
  }, [replaceBlocks, setBlocks]);

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
      useNoteBlockStore.getState().syncBlocksStructure(blocks);
      const docBlocks = mergeBlocksWithStoreContent(
        blocks.filter((block) => block.document_id === selectedId),
      );
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
  };
}
