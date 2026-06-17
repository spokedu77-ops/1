'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  buildChildrenByParentBlock,
  flattenVisualBlockIds,
  sortRootBlocks,
} from '@/app/lib/note/noteBlockTree';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from '../_lib/types';
import type { DocTab } from './NotePageContext';

export function useNoteBlockData(options: {
  selectedId: string | null;
  docTab: DocTab;
  setError: (error: string | null) => void;
  setPendingDeleteUndo: (blockId: string | null) => void;
}) {
  const { selectedId, docTab, setError, setPendingDeleteUndo } = options;

  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [trashedBlocks, setTrashedBlocks] = useState<NoteBlock[]>([]);
  const [loadingTrashedBlocks, setLoadingTrashedBlocks] = useState(false);
  const [restoringBlockId, setRestoringBlockId] = useState<string | null>(null);
  const [purgingBlockId, setPurgingBlockId] = useState<string | null>(null);

  const blocksRef = useRef<NoteBlock[]>([]);

  useEffect(() => {
    if (!selectedId) { setBlocks([]); return; }
    let cancelled = false;
    setBlocks([]);
    const load = async () => {
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
        if (!cancelled) setBlocks(json.blocks ?? []);
      } catch (e) {
        devLogger.error('[Note] loadBlocks', e);
        if (!cancelled) setError(e instanceof Error ? e.message : '로드 실패');
      } finally {
        if (!cancelled) setLoadingBlocks(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedId, setError]);

  useEffect(() => {
    setTrashedBlocks([]);
    setPendingDeleteUndo(null);
    useNoteBlockStore.getState().setActiveEditor(null);
    if (!selectedId) {
      useNoteBlockStore.getState().hydrate([]);
    }
  }, [selectedId, setPendingDeleteUndo]);

  useEffect(() => {
    blocksRef.current = blocks;
    if (blocks.length > 0) {
      useNoteBlockStore.getState().hydrate(blocks);
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
