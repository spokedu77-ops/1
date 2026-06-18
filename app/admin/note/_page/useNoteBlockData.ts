'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  buildChildrenByParentBlock,
  flattenVisualBlockIds,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import {
  commitAndResetNoteDocumentBeforeSwitch,
  mergeBlocksWithStoreContent,
  mergeReconciledBlocks,
  resetNoteDocumentEditorState,
} from '../_lib/noteBlockStateMerge';
import {
  cancelNoteReconcileIdle,
  registerNoteReconcileIdleHandler,
  scheduleNoteReconcileIdle,
} from '../_lib/noteReconcileIdle';
import { normalizeLoadedNoteBlocks } from '../_components/noteBulletInput';
import type { NoteBlock } from '../_lib/types';
import type { DocTab } from './NotePageContext';

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
      const next = typeof value === 'function' ? value(base) : value;
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
      const res = await fetch(
        `/api/admin/note/blocks/load?documentId=${encodeURIComponent(documentId)}`,
        { credentials: 'include' },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { blocks: NoteBlock[] };
      if (blockLoadGenRef.current !== loadGen || selectedId !== documentId) return;
      const merged = mergeReconciledBlocks(blocksRef.current, json.blocks ?? []);
      const structureChanged = (() => {
        if (merged.length !== blocksRef.current.length) return true;
        const prevById = new Map(blocksRef.current.map((b) => [b.id, b]));
        return merged.some((block) => {
          const prev = prevById.get(block.id);
          if (!prev) return true;
          return prev.parent_block_id !== block.parent_block_id
            || prev.order_index !== block.order_index
            || prev.type !== block.type;
        });
      })();
      if (!structureChanged) return;
      setBlocks(merged);
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
    const normalized = normalizeLoadedNoteBlocks(loaded);
    blocksRef.current = normalized;
    _setBlocks(normalized);
    const store = useNoteBlockStore.getState();
    store.setActiveDocumentId(documentId);
    store.hydrate(normalized);
  }, []);

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
      return;
    }

    let cancelled = false;

    const run = async () => {
      await commitAndResetNoteDocumentBeforeSwitch();
      if (cancelled) return;

      const documentId = selectedId;

      const applyLoadedBlocks = (loaded: NoteBlock[]) => {
        blockLoadGenRef.current += 1;
        replaceBlocks(loaded, documentId);
        setLoadingBlocks(false);
        setError(null);
      };

      if (bootstrapBlocks?.documentId === selectedId) {
        if (bootstrapAppliedDocIdRef.current === selectedId) {
          return;
        }
      bootstrapAppliedDocIdRef.current = selectedId;
      applyLoadedBlocks(bootstrapBlocks.blocks);
      scheduleIdleReconcile(selectedId, blockLoadGenRef.current);
      return;
      }

      setBlocks([]);
      blocksRef.current = [];
      const loadGen = blockLoadGenRef.current + 1;
      blockLoadGenRef.current = loadGen;
      try {
        setLoadingBlocks(true);
        setError(null);
        const res = await fetch(
          `/api/admin/note/blocks/load?documentId=${encodeURIComponent(selectedId)}&skipReconcile=true`,
          { credentials: 'include' },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || '블록 로드 실패');
        }
        const json = (await res.json()) as { blocks: NoteBlock[] };
        if (!cancelled && blockLoadGenRef.current === loadGen) {
          applyLoadedBlocks(json.blocks ?? []);
          scheduleIdleReconcile(selectedId, loadGen);
        }
      } catch (e) {
        devLogger.error('[Note] loadBlocks', e);
        if (!cancelled && blockLoadGenRef.current === loadGen) {
          setError(e instanceof Error ? e.message : '로드 실패');
        }
      } finally {
        if (!cancelled && blockLoadGenRef.current === loadGen) {
          setLoadingBlocks(false);
        }
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [selectedId, setError, bootstrapBlocks, replaceBlocks, setBlocks, scheduleIdleReconcile, clearReconcileTimer]);

  useEffect(() => {
    setTrashedBlocks([]);
    setPendingDeleteUndo(null);
    if (!selectedId) {
      resetNoteDocumentEditorState();
    }
  }, [selectedId, setPendingDeleteUndo]);

  useEffect(() => {
    blocksRef.current = blocks;
    if (blocks.length > 0) {
      useNoteBlockStore.getState().syncBlocksStructure(blocks);
    }
  }, [blocks]);

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
