'use client';

import { useCallback, useEffect, useRef } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteFormatToolbarApi } from '../_components/NoteFormatToolbarHost';
import {
  buildNoteHistoryInverse,
  type NoteHistoryEntry,
  type useNoteBlockUndo,
} from '../_hooks/useNoteBlockUndo';
import {
  filterSiblingBlocks,
  buildReparentContentPatch,
  getBlocksInParent,
  planBlockTabIndent,
  planMergeWithPreviousBlock,
  planBatchDeleteBlocks,
  planPromoteChildrenOnDelete,
  resolveVisualNavigateTarget,
  sortRootBlocks,
  type BlockDropPlan,
} from '@/app/lib/note/noteBlockTree';
import { normalizeListBlockContentRecord } from '../_components/noteBulletInput';
import { contentChangeNeedsReactBlocks } from '../_lib/noteContentPatch';
import { getNoteEditor, getActiveNoteEditor } from '../_components/noteEditorRegistry';
import { registerNoteContentFlush, resolveBlockTextCaretOffset, commitNoteDocumentBeforeLeave, mergeBlocksWithStoreContent, applyRestoreBlockSnapshots } from '../_lib/noteBlockStateMerge';
import { bumpNoteReconcileIdle } from '../_lib/noteReconcileIdle';
import { clearAllNoteTextSelections } from '../_components/noteCrossSelect';
import { preserveEditorScrollPosition } from '../_lib/noteEditorScrollGuard';
import { notePointerTargetElement } from '../_lib/notePointerTarget';
import { defaultBlockContent } from '../_lib/constants';
import { patchNoteBlocks } from '../_lib/noteBlocksApi';
import { buildContentForTypeChange } from '../_lib/noteBlockTypeChange';
import {
  canSplitMultilinePasteToBlocks,
  contentForMultilinePasteLine,
  insertTypeForMultilinePasteFollowUp,
} from '../_lib/noteMultilinePaste';
import type { LoadingState, NoteBlock } from '../_lib/types';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

export function useNoteBlockActions(options: {
  blocks: NoteBlock[];
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  setTrashedBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  selectedId: string | null;
  docTab: 'active' | 'trash' | 'block-trash';
  setLoadingState: (state: LoadingState) => void;
  setError: (error: string | null) => void;
  setMobileTab: (tab: 'list' | 'editor') => void;
  setSelectedBlockIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setRestoringBlockId: (id: string | null) => void;
  setPurgingBlockId: (id: string | null) => void;
  setMergeFocusCaretOffset: (offset: number | undefined) => void;
  focusedToggleId: string | null;
  focusedEditorBlockId: string | null;
  focusedEditorBlockIdRef: React.MutableRefObject<string | null>;
  focusedEditorPartRef: React.MutableRefObject<'title' | 'editor' | null>;
  selectedBlockIdsRef: React.MutableRefObject<Set<string>>;
  editorScrollRef: React.RefObject<HTMLDivElement | null>;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  formatToolbarApiRef: React.MutableRefObject<NoteFormatToolbarApi>;
  saveTimersRef: React.MutableRefObject<Record<string, number | undefined>>;
  lastDeletedBlockIdRef: React.MutableRefObject<string | null>;
  setPendingDeleteUndo: (blockId: string | null) => void;
  triggerSave: () => void;
  noteUndo: NoteUndo;
  loadTrashedBlocks: () => Promise<void>;
  focusBlockEditor: (
    blockId: string | null,
    part?: 'title' | 'editor',
    caretOffset?: number,
    options?: { preventScroll?: boolean },
  ) => void;
  syncFocusedToggleFromBlock: (blockId: string) => void;
  handleCreateSubPage: (
    parentDocumentId: string,
    options?: {
      insertAfterBlockId?: string;
      insertIndex?: number;
      parentBlockId?: string | null;
      navigateToChild?: boolean;
      title?: string;
    },
  ) => Promise<void>;
  normalizeDepthByOrder: (orderedBlocks: NoteBlock[]) => {
    normalized: NoteBlock[];
    depthPatches: Array<{ id: string; content: Record<string, unknown> }>;
  };
  persistBlockReparent: (
    moving: NoteBlock,
    plan: BlockDropPlan<NoteBlock>,
    prevBlocks: NoteBlock[],
    extraFieldUpdates?: Array<{ id: string; content: Record<string, unknown> }>,
  ) => Promise<void>;
}) {
  const {
    blocks,
    blocksRef,
    setBlocks,
    setTrashedBlocks,
    selectedId,
    docTab,
    setLoadingState,
    setError,
    setMobileTab,
    setSelectedBlockIds,
    setRestoringBlockId,
    setPurgingBlockId,
    setMergeFocusCaretOffset,
    focusedToggleId,
    focusedEditorBlockId,
    focusedEditorBlockIdRef,
    focusedEditorPartRef,
    selectedBlockIdsRef,
    editorScrollRef,
    titleInputRef,
    formatToolbarApiRef,
    saveTimersRef,
    lastDeletedBlockIdRef,
    setPendingDeleteUndo,
    triggerSave,
    noteUndo,
    loadTrashedBlocks,
    focusBlockEditor,
    syncFocusedToggleFromBlock,
    handleCreateSubPage,
    normalizeDepthByOrder,
    persistBlockReparent,
  } = options;

  const pendingContentPatchesRef = useRef<Map<string, unknown>>(new Map());
  const CONTENT_BATCH_TIMER_KEY = '__content_batch__';

  const flushContentPatches = useCallback(async () => {
    const pending = pendingContentPatchesRef.current;
    if (pending.size === 0) return;
    const updates = [...pending.entries()].map(([id, content]) => {
      const block = blocksRef.current.find((b) => b.id === id);
      let record = (content ?? {}) as Record<string, unknown>;
      if (block && (block.type === 'bulletList' || block.type === 'numberedList')) {
        record = normalizeListBlockContentRecord(record);
      }
      return { id, content: record };
    });
    pending.clear();
    try {
      await patchNoteBlocks(updates);
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] batch updateBlock', e);
    }
  }, [triggerSave]);

  const scheduleBlockContentSave = useCallback((blockId: string, content: unknown) => {
    pendingContentPatchesRef.current.set(blockId, content);
    const timers = saveTimersRef.current;
    if (timers[CONTENT_BATCH_TIMER_KEY]) clearTimeout(timers[CONTENT_BATCH_TIMER_KEY]);
    timers[CONTENT_BATCH_TIMER_KEY] = window.setTimeout(() => {
      delete timers[CONTENT_BATCH_TIMER_KEY];
      void flushContentPatches();
    }, 600);
  }, [flushContentPatches]);

  useEffect(() => {
    registerNoteContentFlush(flushContentPatches);
    return () => registerNoteContentFlush(null);
  }, [flushContentPatches]);

  const syncBlockContent = useCallback((blockId: string, content: unknown) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;
    let record = (content ?? {}) as Record<string, unknown>;
    if (block.type === 'bulletList' || block.type === 'numberedList') {
      record = normalizeListBlockContentRecord(record);
    }
    const store = useNoteBlockStore.getState();
    if (!store.getBlock(blockId)) {
      store.upsertBlock(block);
    }
    store.patchContent(blockId, record);
    blocksRef.current = blocksRef.current.map((b) =>
      b.id === blockId ? { ...b, content: record } : b,
    );
    scheduleBlockContentSave(blockId, record);
    bumpNoteReconcileIdle(selectedId);
  }, [scheduleBlockContentSave, selectedId]);

  const handleUpdateBlock = useCallback((block: NoteBlock, content: any) => {
    let nextContent = content;
    if (block.type === 'bulletList' || block.type === 'numberedList') {
      nextContent = normalizeListBlockContentRecord((content ?? {}) as Record<string, unknown>);
    }
    const nextRecord = nextContent as Record<string, unknown>;
    if (!contentChangeNeedsReactBlocks(block.content as Record<string, unknown>, nextRecord)) {
      syncBlockContent(block.id, nextRecord);
      return;
    }
    blocksRef.current = blocksRef.current.map((b) =>
      b.id === block.id ? { ...b, content: nextContent } : b,
    );
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, content: nextContent } : b)));
    useNoteBlockStore.getState().patchContent(block.id, nextRecord);
    scheduleBlockContentSave(block.id, nextContent);
    bumpNoteReconcileIdle(selectedId);
  }, [scheduleBlockContentSave, selectedId, syncBlockContent]);

  const recordBlockUndo = useCallback((blockIds: string[]) => {
    noteUndo.pushRestoreBlocksUndo(mergeBlocksWithStoreContent(blocksRef.current), blockIds);
  }, [noteUndo]);

  const registerCreatedBlockUndo = useCallback((block: NoteBlock) => {
    noteUndo.pushDeleteBlockUndo(block);
  }, [noteUndo]);

  const applyBlockReparentPlan = useCallback((moving: NoteBlock, plan: BlockDropPlan<NoteBlock>) => {
    const prevBlocks = blocksRef.current;
    const targetMap = new Map(plan.targetSiblings.map((item) => [item.id, item]));
    const oldParentId = moving.parent_block_id ?? null;
    const parentChanged = oldParentId !== plan.targetParentId;
    const oldSiblings = parentChanged
      ? getBlocksInParent(prevBlocks, oldParentId)
        .filter((item) => item.id !== moving.id)
        .map((item, index) => ({ ...item, order_index: index }))
      : [];
    const oldMap = new Map(oldSiblings.map((item) => [item.id, item]));
    const movingLatest = prevBlocks.find((item) => item.id === moving.id) ?? moving;
    const contentPatch = buildReparentContentPatch(
      movingLatest.content,
      movingLatest.type,
      plan.placedInToggle,
    );

    setBlocks(() => {
      const prev = blocksRef.current;
      const next = prev.map((item) => {
        if (item.id === moving.id) {
          const latest = prev.find((b) => b.id === moving.id) ?? item;
          return {
            ...latest,
            parent_block_id: plan.targetParentId,
            order_index: plan.targetSiblings.findIndex((sibling) => sibling.id === moving.id),
            content: contentPatch ?? latest.content,
          };
        }
        if (targetMap.has(item.id)) {
          const planned = targetMap.get(item.id)!;
          const latest = prev.find((b) => b.id === item.id);
          return latest ? { ...planned, content: latest.content } : planned;
        }
        if (oldMap.has(item.id)) {
          const planned = oldMap.get(item.id)!;
          const latest = prev.find((b) => b.id === item.id);
          return latest ? { ...planned, content: latest.content } : planned;
        }
        return item;
      });

      if (plan.targetParentId === null) {
        const rootOnly = sortRootBlocks(next);
        const { normalized, depthPatches } = normalizeDepthByOrder(rootOnly);
        const depthMap = new Map(normalized.map((item) => [item.id, item]));
        const withDepth = next.map((item) => depthMap.get(item.id) ?? item);
        void persistBlockReparent(moving, plan, prevBlocks, depthPatches)
          .catch((e) => devLogger.error('[Note] depth-sync-after-tab-reparent', e));
        blocksRef.current = withDepth;
        return withDepth;
      }

      void persistBlockReparent(moving, plan, prevBlocks);
      blocksRef.current = next;
      return next;
    });
    syncFocusedToggleFromBlock(moving.id);
    bumpNoteReconcileIdle(selectedId);
  }, [normalizeDepthByOrder, persistBlockReparent, syncFocusedToggleFromBlock, selectedId]);

  const handleIndentBlock = useCallback((block: NoteBlock, direction: 'in' | 'out') => {
    const prevBlocks = blocksRef.current;
    const tabPlan = planBlockTabIndent(prevBlocks, block.id, direction);
    if (tabPlan) {
      const oldParentId = block.parent_block_id ?? null;
      const undoIds = new Set<string>([block.id]);
      getBlocksInParent(prevBlocks, oldParentId).forEach((item) => undoIds.add(item.id));
      if (tabPlan.targetParentId) {
        getBlocksInParent(prevBlocks, tabPlan.targetParentId).forEach((item) => undoIds.add(item.id));
      } else {
        sortRootBlocks(prevBlocks).forEach((item) => undoIds.add(item.id));
      }
      recordBlockUndo([...undoIds]);
      applyBlockReparentPlan(block, tabPlan);
      return;
    }

    // 글머리·번호 목록은 부모 자식 구조로만 들여쓰기
    if (block.type === 'bulletList' || block.type === 'numberedList') return;

    // 루트 블록만 content.depth 시각 들여쓰기 (탭이 없는 경우 대비)
    if (block.parent_block_id) return;

    const content = (block.content ?? {}) as Record<string, unknown>;
    const currentDepth = Math.max(0, Math.min(6, Number(content.depth ?? 0)));
    const ordered = sortRootBlocks(prevBlocks);
    const idx = ordered.findIndex((item) => item.id === block.id);
    if (idx < 0) return;
    const prevDepth =
      idx > 0
        ? Math.max(0, Math.min(6, Number((ordered[idx - 1]?.content as Record<string, unknown> | undefined)?.depth ?? 0)))
        : 0;
    let nextDepth = currentDepth;
    if (direction === 'in') {
      if (idx === 0) {
        nextDepth = Math.min(6, currentDepth + 1);
      } else {
        nextDepth = Math.min(6, currentDepth + 1, prevDepth + 1);
      }
    } else {
      const oneStepOut = Math.max(0, currentDepth - 1);
      nextDepth = idx === 0 ? 0 : Math.min(oneStepOut, prevDepth + 1);
    }
    if (nextDepth === currentDepth) return;
    handleUpdateBlock(block, { ...content, depth: nextDepth });
  }, [applyBlockReparentPlan, handleUpdateBlock, recordBlockUndo, selectedId]);
  const handleNavigateBlock = useCallback((block: NoteBlock, direction: 'previous' | 'next') => {
    const snapshot = blocksRef.current;
    const target = resolveVisualNavigateTarget(snapshot, block.id, direction);
    if (!target) return;
    if (target.type === 'toggle' && direction === 'previous') {
      const title = typeof target.content?.title === 'string' ? target.content.title : '';
      focusBlockEditor(target.id, 'title', title.length);
      return;
    }
    if (direction === 'previous') {
      focusBlockEditor(target.id, 'editor', resolveBlockTextCaretOffset(target));
      return;
    }
    focusBlockEditor(target.id, 'editor', 0);
  }, [blocksRef, focusBlockEditor]);

  const insertBlockAmongSiblings = useCallback(async (
    parentId: string | null,
    type: NoteBlock['type'],
    insertIndex: number,
    options?: { content?: Record<string, unknown>; focus?: boolean; registerUndo?: boolean },
  ): Promise<NoteBlock | null> => {
    if (!selectedId) return null;
    try {
      setLoadingState('saving');
      const siblings = blocksRef.current
        .filter((b) => (b.parent_block_id ?? null) === parentId)
        .sort((a, b) => a.order_index - b.order_index);
      const clampedIndex = Math.max(0, Math.min(insertIndex, siblings.length));
      const parentBlock = parentId ? blocksRef.current.find((b) => b.id === parentId) : null;
      const insideToggle = parentBlock?.type === 'toggle';
      const baseContent = options?.content ?? defaultBlockContent(type, { insideToggle });
      const baseContentMap = baseContent as Record<string, unknown>;
      const blockContent = (insideToggle && baseContent && !baseContentMap.placedInToggle)
        ? { ...baseContent, placedInToggle: true }
        : baseContent;
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: selectedId,
          type,
          content: blockContent,
          order_index: clampedIndex,
          parent_block_id: parentId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '블록 추가 실패');
      }
      const json = (await res.json()) as { block: NoteBlock };
      let orderPayload: { id: string; order_index: number }[] = [];
      setBlocks((prev) => {
        // split 직후 onChange로 갱신된 본문을 유지 — blocksRef 스냅샷으로 덮어쓰지 않음
        const latestSiblings = prev
          .filter((b) => (b.parent_block_id ?? null) === parentId)
          .sort((a, b) => a.order_index - b.order_index);
        const latestIndex = Math.max(0, Math.min(insertIndex, latestSiblings.length));
        const nextSiblings = [
          ...latestSiblings.slice(0, latestIndex),
          json.block,
          ...latestSiblings.slice(latestIndex),
        ].map((block, index) => ({ ...block, order_index: index }));
        orderPayload = nextSiblings.map((block) => ({ id: block.id, order_index: block.order_index }));
        const siblingIds = new Set(nextSiblings.map((block) => block.id));
        const others = prev.filter((block) => !siblingIds.has(block.id));
        return [...others, ...nextSiblings];
      });
      if (options?.focus !== false) {
        focusBlockEditor(json.block.id, type === 'toggle' ? 'title' : 'editor');
      }
      if (options?.registerUndo !== false) registerCreatedBlockUndo(json.block);
      void fetch('/api/admin/note/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orders: orderPayload }),
      }).then(() => triggerSave()).catch((e) => devLogger.error('[Note] normalizeInsertOrder', e));
      return json.block;
    } catch (e) {
      devLogger.error('[Note] insertBlockAmongSiblings', e);
      setError(e instanceof Error ? e.message : '블록 추가 실패');
      setLoadingState('idle');
      return null;
    }
  }, [selectedId, triggerSave, focusBlockEditor, registerCreatedBlockUndo]);

  const duplicateBlockRecursive = useCallback(async (
    source: NoteBlock,
    parentId: string | null,
    insertIndex: number,
  ): Promise<NoteBlock | null> => {
    const clonedContent = JSON.parse(JSON.stringify(source.content ?? defaultBlockContent(source.type))) as Record<string, unknown>;
    const created = await insertBlockAmongSiblings(parentId, source.type, insertIndex, {
      content: clonedContent,
      focus: false,
      registerUndo: false,
    });
    if (!created) return null;

    const children = getBlocksInParent(blocksRef.current, source.id);
    for (let i = 0; i < children.length; i++) {
      await duplicateBlockRecursive(children[i], created.id, i);
    }
    return created;
  }, [insertBlockAmongSiblings]);

  const handleDuplicateBlock = useCallback(async (block: NoteBlock) => {
    if (!selectedId || block.type === 'page') return;
    const parentId = block.parent_block_id ?? null;
    const siblings = getBlocksInParent(blocksRef.current, parentId);
    const idx = siblings.findIndex((b) => b.id === block.id);
    const insertIndex = idx >= 0 ? idx + 1 : siblings.length;
    const created = await duplicateBlockRecursive(block, parentId, insertIndex);
    if (created) {
      focusBlockEditor(created.id);
      registerCreatedBlockUndo(created);
    }
  }, [selectedId, duplicateBlockRecursive, focusBlockEditor, registerCreatedBlockUndo]);

  const handleInsertBlockAfter = useCallback(async (
    afterBlock: NoteBlock,
    type: NoteBlock['type'] = 'text',
    content?: Record<string, unknown>,
  ) => {
    if (type === 'page') {
      if (!selectedId) return;
      await handleCreateSubPage(selectedId, {
        insertAfterBlockId: afterBlock.id,
        parentBlockId: afterBlock.parent_block_id ?? null,
        navigateToChild: false,
      });
      return;
    }
    const parentId = afterBlock.parent_block_id ?? null;
    const siblings = blocksRef.current
      .filter((b) => (b.parent_block_id ?? null) === parentId)
      .sort((a, b) => a.order_index - b.order_index);
    const afterIndex = siblings.findIndex((b) => b.id === afterBlock.id);
    const insertIndex = afterIndex >= 0 ? afterIndex + 1 : siblings.length;
    await insertBlockAmongSiblings(parentId, type, insertIndex, content ? { content } : undefined);
  }, [insertBlockAmongSiblings, handleCreateSubPage, selectedId]);

  const handleInsertBlockInParent = useCallback(async (parentBlockId: string, type: NoteBlock['type'] = 'text') => {
    if (!selectedId) return;
    if (type === 'page') {
      const siblings = blocksRef.current
        .filter((b) => b.parent_block_id === parentBlockId)
        .sort((a, b) => a.order_index - b.order_index);
      const focusedId = focusedEditorBlockIdRef.current ?? focusedEditorBlockId;
      const focusedChild = focusedId
        ? siblings.find((b) => b.id === focusedId) ?? null
        : null;
      if (focusedChild) {
        await handleCreateSubPage(selectedId, {
          insertAfterBlockId: focusedChild.id,
          parentBlockId,
          navigateToChild: false,
        });
        return;
      }
      if (focusedId === parentBlockId) {
        await handleCreateSubPage(selectedId, {
          parentBlockId,
          insertIndex: 0,
          navigateToChild: false,
        });
        return;
      }
      const lastSibling = siblings[siblings.length - 1];
      if (lastSibling) {
        await handleCreateSubPage(selectedId, {
          insertAfterBlockId: lastSibling.id,
          parentBlockId,
          navigateToChild: false,
        });
      } else {
        await handleCreateSubPage(selectedId, { parentBlockId, navigateToChild: false });
      }
      return;
    }
    const parent = blocksRef.current.find((b) => b.id === parentBlockId);
    if (parent?.type === 'toggle') {
      const content = (parent.content ?? {}) as Record<string, unknown>;
      if (content.collapsed) {
        handleUpdateBlock(parent, { ...content, collapsed: false });
      }
    }
    const siblings = blocksRef.current
      .filter((b) => b.parent_block_id === parentBlockId)
      .sort((a, b) => a.order_index - b.order_index);
    const focusedId = focusedEditorBlockIdRef.current ?? focusedEditorBlockId;

    const focusedChild = focusedId
      ? siblings.find((b) => b.id === focusedId) ?? null
      : null;
    if (focusedChild) {
      await handleInsertBlockAfter(focusedChild, type);
      return;
    }

    if (focusedId === parentBlockId) {
      await insertBlockAmongSiblings(parentBlockId, type, 0);
      return;
    }

    if (siblings.length > 0) {
      await handleInsertBlockAfter(siblings[siblings.length - 1], type);
      return;
    }

    await insertBlockAmongSiblings(parentBlockId, type, 0);
  }, [
    selectedId,
    focusedEditorBlockId,
    handleInsertBlockAfter,
    handleUpdateBlock,
    insertBlockAmongSiblings,
    handleCreateSubPage,
  ]);

  const handleAddBlock = useCallback(async (type: NoteBlock['type']) => {
    if (!selectedId) return;
    try {
      if (type === 'image' && focusedToggleId) {
        const target = blocks.find((b) => b.id === focusedToggleId);
        if (target?.type === 'toggle') {
          const c = (target.content ?? {}) as Record<string, unknown>;
          const rawIm = c.images;
          const imgs = Array.isArray(rawIm) ? rawIm.map((u) => (typeof u === 'string' ? u : '')) : [];
          handleUpdateBlock(target, { ...c, collapsed: false, images: [...imgs, ''] });
          return;
        }
      }
      if (type === 'page') {
        await handleCreateSubPage(selectedId, {
          parentBlockId: focusedToggleId ?? null,
          navigateToChild: false,
        });
        return;
      }

      setLoadingState('saving');
      const parentBlockId = focusedToggleId ?? null;
      if (parentBlockId) {
        await handleInsertBlockInParent(parentBlockId, type);
        return;
      }

      const defaultContent = defaultBlockContent(type);
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: selectedId,
          type,
          content: defaultContent,
          parent_block_id: null,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '블록 추가 실패'); }
      const json = (await res.json()) as { block: NoteBlock };
      setBlocks((prev) => [json.block, ...prev]);
      focusBlockEditor(json.block.id, type === 'toggle' ? 'title' : 'editor');
      registerCreatedBlockUndo(json.block);
      triggerSave();
    } catch (e) { devLogger.error('[Note] addBlock', e); setError(e instanceof Error ? e.message : '추가 실패'); }
  }, [selectedId, triggerSave, focusedToggleId, blocks, handleUpdateBlock, focusBlockEditor, handleInsertBlockInParent, registerCreatedBlockUndo, handleCreateSubPage]);

  const handleClickEditorWhitespace = useCallback(() => {
    const roots = sortRootBlocks(blocksRef.current);
    const last = roots[roots.length - 1];
    if (!last) {
      void handleAddBlock('text');
      return;
    }
    const lastText = typeof last.content?.text === 'string' ? last.content.text : '';
    if (last.type === 'text' && lastText.trim().length === 0) {
      focusBlockEditor(last.id);
      return;
    }
    void handleInsertBlockAfter(last, 'text');
  }, [focusBlockEditor, handleAddBlock, handleInsertBlockAfter]);

  const handleDocumentBodyMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = notePointerTargetElement(e.target);
    if (!target) return;
    if (target.closest(
      '[data-note-block-row], [data-note-editor-host], button, input, textarea, a, .ProseMirror, [data-toggle-title], [data-note-ignore-whitespace], [data-note-overlay-menu]',
    )) {
      return;
    }
    clearAllNoteTextSelections();
    setSelectedBlockIds(new Set());
    e.preventDefault();
    handleClickEditorWhitespace();
  }, [handleClickEditorWhitespace]);

  const handleChangeBlockType = useCallback(async (block: NoteBlock, type: NoteBlock['type']) => {
    recordBlockUndo([block.id]);
    let nextContent = buildContentForTypeChange(block.content, block.type, type);
    if (type === 'bulletList' || type === 'numberedList') {
      nextContent = normalizeListBlockContentRecord(nextContent);
    }
    pendingContentPatchesRef.current.delete(block.id);
    useNoteBlockStore.getState().patchContent(block.id, nextContent);
    blocksRef.current = blocksRef.current.map((b) =>
      b.id === block.id ? { ...b, type, content: nextContent } : b,
    );
    const wasOnThisBlock = focusedEditorBlockIdRef.current === block.id;
    const nextFocusPart: 'title' | 'editor' =
      type === 'toggle' ? 'title'
        : block.type === 'toggle' ? 'editor'
          : (focusedEditorPartRef.current ?? 'editor');

    preserveEditorScrollPosition(editorScrollRef.current, () => {
      setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, type, content: nextContent } : b)));
    });

    if (wasOnThisBlock) {
      focusBlockEditor(block.id, nextFocusPart, undefined, { preventScroll: true });
    } else {
      focusBlockEditor(block.id, type === 'toggle' ? 'title' : 'editor', undefined, { preventScroll: true });
    }

    try {
      await patchNoteBlocks([{ id: block.id, type, content: nextContent }]);
      triggerSave();
      preserveEditorScrollPosition(editorScrollRef.current, () => {});
    } catch (e) { devLogger.error('[Note] changeBlockType', e); }
  }, [focusBlockEditor, recordBlockUndo, triggerSave]);

  const persistDeletePromotionPatches = useCallback(async (
    patches: Array<{
      id: string;
      parent_block_id: string | null;
      order_index: number;
      content?: Record<string, unknown>;
    }>,
  ) => {
    await patchNoteBlocks(
      patches.map((patch) => ({
        id: patch.id,
        parent_block_id: patch.parent_block_id,
        order_index: patch.order_index,
        ...(patch.content ? { content: patch.content } : {}),
      })),
    );
  }, []);

  const softDeleteBlockIds = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const res = await fetch('/api/admin/note/blocks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || '삭제 실패');
    }
  }, []);

  const finalizeBlockDelete = useCallback(async (options?: {
    skipDeleteUndo?: boolean;
    deletedBlock?: NoteBlock | null;
  }) => {
    if (!options?.skipDeleteUndo && options?.deletedBlock) {
      noteUndo.pushCreateBlockUndo(options.deletedBlock);
      setPendingDeleteUndo(options.deletedBlock.id);
    }
    if (docTab === 'block-trash') {
      setMobileTab('list');
      await loadTrashedBlocks();
    }
    triggerSave();
  }, [docTab, loadTrashedBlocks, noteUndo, setPendingDeleteUndo, triggerSave]);

  const handleDeleteBlock = useCallback(async (block: NoteBlock, focusPrevious = false, skipDeleteUndo = false) => {
    const prevBlocks = blocksRef.current;
    const ordered = [...prevBlocks].sort((a, b) => a.order_index - b.order_index);
    const idx = ordered.findIndex((b) => b.id === block.id);
    if (idx < 0) return;

    const promotionPlan = planPromoteChildrenOnDelete(prevBlocks, block.id);
    const patchMap = promotionPlan
      ? new Map(promotionPlan.patches.map((patch) => [patch.id, patch]))
      : null;

    if (focusPrevious) {
      const siblings = filterSiblingBlocks(prevBlocks, block);
      const sibIdx = siblings.findIndex((b) => b.id === block.id);
      const nextFocus = siblings[sibIdx - 1]?.id ?? siblings[sibIdx + 1]?.id ?? null;
      if (nextFocus) focusBlockEditor(nextFocus);
    }

    setBlocks((prev) => {
      const plan = planPromoteChildrenOnDelete(prev, block.id);
      if (!plan) return prev.filter((b) => b.id !== block.id);
      const patches = new Map(plan.patches.map((patch) => [patch.id, patch]));
      return prev
        .filter((b) => b.id !== block.id)
        .map((b) => {
          const patch = patches.get(b.id);
          if (!patch) return b;
          return {
            ...b,
            parent_block_id: patch.parent_block_id,
            order_index: patch.order_index,
            ...(patch.content ? { content: patch.content } : {}),
          };
        });
    });

    try {
      if (patchMap && patchMap.size > 0) {
        await persistDeletePromotionPatches([...patchMap.values()]);
      }
      await softDeleteBlockIds([block.id]);
      await finalizeBlockDelete({
        skipDeleteUndo,
        deletedBlock: prevBlocks.find((b) => b.id === block.id) ?? block,
      });
    } catch (e) {
      devLogger.error('[Note] deleteBlock', e);
      setError(e instanceof Error ? e.message : '블록 삭제 실패');
      setBlocks(prevBlocks);
    }
  }, [finalizeBlockDelete, focusBlockEditor, persistDeletePromotionPatches, softDeleteBlockIds]);

  const handleDeleteBlocks = useCallback(async (
    blocksToDelete: NoteBlock[],
    options?: { skipDeleteUndo?: boolean; focusPrevious?: boolean },
  ) => {
    const targets = blocksToDelete.filter((block) =>
      blocksRef.current.some((item) => item.id === block.id),
    );
    if (targets.length === 0) return;

    if (targets.length === 1) {
      await handleDeleteBlock(targets[0], options?.focusPrevious ?? false, options?.skipDeleteUndo ?? false);
      return;
    }

    const prevBlocks = blocksRef.current;
    const plan = planBatchDeleteBlocks(prevBlocks, targets.map((block) => block.id));
    if (!plan || plan.deletedIds.length === 0) return;

    setBlocks(plan.nextBlocks);

    try {
      await persistDeletePromotionPatches(plan.patches);
      await softDeleteBlockIds(plan.deletedIds);
      await finalizeBlockDelete({
        skipDeleteUndo: options?.skipDeleteUndo,
        deletedBlock: prevBlocks.find((b) => b.id === plan.deletedIds[plan.deletedIds.length - 1])
          ?? targets[targets.length - 1]
          ?? null,
      });
    } catch (e) {
      devLogger.error('[Note] deleteBlocks', e);
      setError(e instanceof Error ? e.message : '블록 삭제 실패');
      setBlocks(prevBlocks);
    }
  }, [finalizeBlockDelete, handleDeleteBlock, persistDeletePromotionPatches, softDeleteBlockIds]);

  const showFormatToolbar = useCallback((
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
  ) => {
    formatToolbarApiRef.current.show(applyMark, applyTextStyle, applyTextColor, applyHighlight, position);
  }, []);

  const hideFormatToolbar = useCallback(() => {
    formatToolbarApiRef.current.hide();
  }, []);

  const handleMultilinePaste = useCallback(async (block: NoteBlock, lines: string[]) => {
    if (!selectedId || lines.length <= 1 || !canSplitMultilinePasteToBlocks(block.type)) return;

    const sourceContent = (block.content ?? {}) as Record<string, unknown>;
    const firstContent = contentForMultilinePasteLine(block.type, lines[0] ?? '', sourceContent);
    syncBlockContent(block.id, firstContent);

    const parentId = block.parent_block_id ?? null;
    const siblings = getBlocksInParent(blocksRef.current, parentId)
      .sort((a, b) => a.order_index - b.order_index);
    let insertIndex = siblings.findIndex((item) => item.id === block.id) + 1;
    const followType = insertTypeForMultilinePasteFollowUp(block.type);
    const touchedIds = [block.id];
    let lastFocusId = block.id;

    for (const line of lines.slice(1)) {
      const content = contentForMultilinePasteLine(followType, line, sourceContent);
      const created = await insertBlockAmongSiblings(parentId, followType, insertIndex, {
        content,
        focus: false,
        registerUndo: false,
      });
      if (!created) break;
      touchedIds.push(created.id);
      lastFocusId = created.id;
      insertIndex += 1;
    }

    recordBlockUndo(touchedIds);
    focusBlockEditor(lastFocusId, 'editor');
  }, [
    selectedId,
    syncBlockContent,
    insertBlockAmongSiblings,
    recordBlockUndo,
    focusBlockEditor,
  ]);

  const handleCopyBlockLink = useCallback((block: NoteBlock) => {
    if (!selectedId) return;
    const url = `${window.location.origin}/admin/note?id=${encodeURIComponent(selectedId)}#block-${block.id}`;
    void navigator.clipboard.writeText(url);
  }, [selectedId]);

  const uploadNoteImage = useCallback(async (file: File) => {
    if (!selectedId) throw new Error('문서를 먼저 선택해야 합니다.');
    const formData = new FormData();
    formData.set('documentId', selectedId);
    formData.set('file', file);
    const res = await fetch('/api/admin/note/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !body.url) {
      throw new Error(body.error ?? '이미지 업로드 실패');
    }
    return body.url;
  }, [selectedId]);

  const handleMergeWithPreviousBlock = useCallback(async (block: NoteBlock) => {
    const prevBlocks = blocksRef.current;
    const plan = planMergeWithPreviousBlock(prevBlocks, block.id);
    if (!plan) return;

    setBlocks((prev) => {
      const livePlan = planMergeWithPreviousBlock(prev, block.id);
      if (!livePlan) return prev;
      return prev
        .filter((b) => b.id !== livePlan.deleteId)
        .map((b) => (b.id === livePlan.previousId ? { ...b, content: livePlan.mergedContent } : b));
    });

    focusBlockEditor(plan.previousId, 'editor', plan.caretOffset);

    try {
      await patchNoteBlocks([{ id: plan.previousId, content: plan.mergedContent }]);
      await fetch(`/api/admin/note/blocks?id=${encodeURIComponent(plan.deleteId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] mergeWithPrevious', e);
      setError(e instanceof Error ? e.message : '블록 병합 실패');
      setBlocks(prevBlocks);
    } finally {
      window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
    }
  }, [focusBlockEditor, triggerSave]);

  const handleRestoreBlockFromTrash = useCallback(async (block: NoteBlock) => {
    try {
      setRestoringBlockId(block.id);
      const res = await fetch('/api/admin/note/blocks/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: block.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '블록 복구 실패');
      }
      const json = (await res.json()) as { block: NoteBlock };
      const restoredBlock = json.block;
      setTrashedBlocks((prev) => prev.filter((b) => b.id !== block.id));
      if (lastDeletedBlockIdRef.current === block.id) setPendingDeleteUndo(null);
      setBlocks((prev) => {
        if (prev.some((b) => b.id === restoredBlock.id)) return prev;
        return [...prev, restoredBlock].sort((a, b) => a.order_index - b.order_index);
      });
      focusBlockEditor(restoredBlock.id);
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] restoreBlockFromTrash', e);
      setError(e instanceof Error ? e.message : '블록 복구 실패');
    } finally {
      setRestoringBlockId(null);
    }
  }, [focusBlockEditor, setPendingDeleteUndo, triggerSave]);

  const applyNoteHistoryEntry = useCallback(async (entry: NoteHistoryEntry | null) => {
    if (!entry) return;
    if (entry.kind === 'restore-blocks') {
      setBlocks(() => {
        const next = applyRestoreBlockSnapshots(blocksRef.current, entry.snapshots);
        blocksRef.current = next;
        return next;
      });
      for (const snapshot of entry.snapshots) {
        useNoteBlockStore.getState().patchContent(snapshot.id, snapshot.content ?? {});
      }
      try {
        await patchNoteBlocks(entry.snapshots.map((snapshot) => ({
          id: snapshot.id,
          type: snapshot.type,
          content: snapshot.content,
          parent_block_id: snapshot.parent_block_id,
          order_index: snapshot.order_index,
        })));
        triggerSave();
      } catch (e) {
        devLogger.error('[Note] history restore-blocks', e);
        setError(e instanceof Error ? e.message : '실행 취소 실패');
      }
      return;
    }
    if (entry.kind === 'delete-block') {
      const live = blocksRef.current.find((b) => b.id === entry.snapshot.id);
      if (live) await handleDeleteBlock(live, false, true);
      return;
    }
    if (entry.kind === 'create-block') {
      setPendingDeleteUndo(null);
      await handleRestoreBlockFromTrash(entry.snapshot);
    }
  }, [handleDeleteBlock, handleRestoreBlockFromTrash, setPendingDeleteUndo, triggerSave]);

  const runNoteUndo = useCallback(async () => {
    await commitNoteDocumentBeforeLeave();
    const entry = noteUndo.popUndo();
    if (!entry) return;
    const inverse = buildNoteHistoryInverse(entry, mergeBlocksWithStoreContent(blocksRef.current));
    await applyNoteHistoryEntry(entry);
    if (inverse) noteUndo.pushRedo(inverse);
  }, [applyNoteHistoryEntry, noteUndo]);

  const runNoteRedo = useCallback(async () => {
    await commitNoteDocumentBeforeLeave();
    const entry = noteUndo.popRedo();
    if (!entry) return;
    const inverse = buildNoteHistoryInverse(entry, mergeBlocksWithStoreContent(blocksRef.current));
    await applyNoteHistoryEntry(entry);
    if (inverse) noteUndo.pushUndoNoClear(inverse);
  }, [applyNoteHistoryEntry, noteUndo]);

  const handlePurgeBlockFromTrash = useCallback(async (block: NoteBlock) => {
    if (!confirm('이 블록을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      setPurgingBlockId(block.id);
      const res = await fetch(`/api/admin/note/blocks/trash/purge?id=${encodeURIComponent(block.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '블록 영구 삭제 실패');
      }
      if (lastDeletedBlockIdRef.current === block.id) setPendingDeleteUndo(null);
      setTrashedBlocks((prev) => prev.filter((b) => b.id !== block.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] purgeBlockFromTrash', e);
      setError(e instanceof Error ? e.message : '블록 영구 삭제 실패');
    } finally {
      setPurgingBlockId(null);
    }
  }, [setPendingDeleteUndo, triggerSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      const isUndo = key === 'z' && !e.shiftKey;
      const isRedo = key === 'z' && e.shiftKey;
      if (!isUndo && !isRedo) return;

      const target = e.target as HTMLElement | null;
      const isEditing = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        !!target.closest(
          '[contenteditable="true"], .ProseMirror, .note-rich-editor, [data-toggle-title], [data-note-list-text]',
        )
      );

      if (isEditing) {
        if (target === titleInputRef.current || target?.closest('[data-note-doc-title]')) {
          return;
        }
        const inRichEditor = !!target?.closest(
          '.ProseMirror, .note-rich-editor, [data-note-list-text]',
        );
        if (inRichEditor) {
          const editor = getActiveNoteEditor(focusedEditorBlockIdRef.current);
          if (editor) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (isRedo) {
              if (editor.can().redo()) editor.chain().focus().redo().run();
            } else if (editor.can().undo()) {
              editor.chain().focus().undo().run();
            }
            return;
          }
        }
        if (target?.closest('[data-toggle-title]')) {
          return;
        }
        const blockId = focusedEditorBlockIdRef.current;
        if (blockId) {
          const editor = getNoteEditor(blockId);
          if (editor && !(editor as { isDestroyed?: boolean }).isDestroyed) {
            if (isRedo && editor.can().redo()) {
              e.preventDefault();
              e.stopImmediatePropagation();
              editor.chain().focus().redo().run();
              return;
            }
            if (isUndo && editor.can().undo()) {
              e.preventDefault();
              e.stopImmediatePropagation();
              editor.chain().focus().undo().run();
              return;
            }
          }
        }
        if (isUndo) {
          if (!noteUndo.hasUndo()) return;
        } else if (!noteUndo.hasRedo()) {
          return;
        }
      } else if (isUndo) {
        if (!noteUndo.hasUndo()) return;
      } else if (!noteUndo.hasRedo()) {
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      if (isUndo) {
        void runNoteUndo();
      } else {
        void runNoteRedo();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [runNoteRedo, runNoteUndo, noteUndo]);

  useEffect(() => {
    const resolveShortcutBlock = (): NoteBlock | null => {
      const selected = selectedBlockIdsRef.current;
      const blockId = selected.size === 1
        ? [...selected][0]
        : (selected.size === 0 ? focusedEditorBlockIdRef.current : null);
      if (!blockId) return null;
      return blocksRef.current.find((b) => b.id === blockId) ?? null;
    };

    const onKey = (e: KeyboardEvent) => {
      if (docTab !== 'active' || !selectedId) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-note-doc-title]')) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && !e.shiftKey && e.key.toLowerCase() === 'd') {
        const block = resolveShortcutBlock();
        if (!block) return;
        e.preventDefault();
        void handleDuplicateBlock(block);
        return;
      }

      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        const block = resolveShortcutBlock();
        if (!block) return;
        e.preventDefault();
        handleCopyBlockLink(block);
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    docTab,
    selectedId,
    blocksRef,
    focusedEditorBlockIdRef,
    selectedBlockIdsRef,
    handleDuplicateBlock,
    handleCopyBlockLink,
  ]);

  return {
    scheduleBlockContentSave,
    syncBlockContent,
    handleUpdateBlock,
    recordBlockUndo,
    applyBlockReparentPlan,
    handleIndentBlock,
    handleNavigateBlock,
    insertBlockAmongSiblings,
    handleDuplicateBlock,
    handleMultilinePaste,
    handleInsertBlockAfter,
    handleInsertBlockInParent,
    handleAddBlock,
    handleClickEditorWhitespace,
    handleDocumentBodyMouseDown,
    handleChangeBlockType,
    handleDeleteBlock,
    handleDeleteBlocks,
    handleMergeWithPreviousBlock,
    handleRestoreBlockFromTrash,
    handlePurgeBlockFromTrash,
    runNoteRedo,
    runNoteUndo,
    showFormatToolbar,
    hideFormatToolbar,
    handleCopyBlockLink,
    uploadNoteImage,
  };
}
