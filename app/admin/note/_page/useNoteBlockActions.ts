'use client';

import { useCallback, useEffect } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteFormatToolbarApi } from '../_components/NoteFormatToolbarHost';
import type { useNoteBlockUndo, NoteUndoEntry } from '../_hooks/useNoteBlockUndo';
import {
  filterSiblingBlocks,
  buildReparentContentPatch,
  getBlocksInParent,
  planBlockTabIndent,
  planMergeWithPreviousBlock,
  planBatchDeleteBlocks,
  planPromoteChildrenOnDelete,
  sortRootBlocks,
  type BlockDropPlan,
} from '@/app/lib/note/noteBlockTree';
import { getNoteEditor } from '../_components/noteEditorRegistry';
import { clearAllNoteTextSelections } from '../_components/noteCrossSelect';
import { preserveEditorScrollPosition } from '../_lib/noteEditorScrollGuard';
import { notePointerTargetElement } from '../_lib/notePointerTarget';
import { defaultBlockContent } from '../_lib/constants';
import { patchNoteBlocks } from '../_lib/noteBlocksApi';
import { buildContentForTypeChange } from '../_lib/noteBlockTypeChange';
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

  const scheduleBlockContentSave = useCallback((blockId: string, fallbackContent?: unknown) => {
    const timers = saveTimersRef.current;
    if (timers[blockId]) clearTimeout(timers[blockId]);
    timers[blockId] = window.setTimeout(async () => {
      try {
        const latest = blocksRef.current.find((b) => b.id === blockId);
        const contentToSave = latest?.content ?? fallbackContent;
        await patchNoteBlocks([{ id: blockId, content: contentToSave }]);
        delete timers[blockId];
        if (Object.keys(timers).filter((k) => !k.startsWith('doc_')).length === 0) triggerSave();
      } catch (e) { devLogger.error('[Note] updateBlock', e); }
    }, 600);
  }, [triggerSave]);

  const syncBlockContent = useCallback((blockId: string, content: unknown) => {
    const record = (content ?? {}) as Record<string, unknown>;
    useNoteBlockStore.getState().patchContent(blockId, record);
    blocksRef.current = blocksRef.current.map((b) =>
      b.id === blockId ? { ...b, content: record } : b,
    );
    scheduleBlockContentSave(blockId, content);
  }, [scheduleBlockContentSave]);

  const handleUpdateBlock = useCallback((block: NoteBlock, content: any) => {
    blocksRef.current = blocksRef.current.map((b) =>
      b.id === block.id ? { ...b, content } : b,
    );
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, content } : b)));
    scheduleBlockContentSave(block.id, content);
  }, [scheduleBlockContentSave]);

  const recordBlockUndo = useCallback((blockIds: string[]) => {
    noteUndo.pushRestoreBlocksUndo(blocksRef.current, blockIds);
  }, [noteUndo]);

  const registerCreatedBlockUndo = useCallback((blockId: string) => {
    noteUndo.pushUndoCreate(blockId);
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
    const contentPatch = buildReparentContentPatch(moving.content, moving.type, plan.placedInToggle);

    setBlocks((prev) => {
      const next = prev.map((item) => {
        if (item.id === moving.id) {
          return {
            ...item,
            parent_block_id: plan.targetParentId,
            order_index: plan.targetSiblings.findIndex((sibling) => sibling.id === moving.id),
            content: contentPatch ?? item.content,
          };
        }
        if (targetMap.has(item.id)) return targetMap.get(item.id)!;
        if (oldMap.has(item.id)) return oldMap.get(item.id)!;
        return item;
      });

      if (plan.targetParentId === null) {
        const rootOnly = sortRootBlocks(next);
        const { normalized, depthPatches } = normalizeDepthByOrder(rootOnly);
        const depthMap = new Map(normalized.map((item) => [item.id, item]));
        const withDepth = next.map((item) => depthMap.get(item.id) ?? item);
        void persistBlockReparent(moving, plan, prevBlocks, depthPatches)
          .catch((e) => devLogger.error('[Note] depth-sync-after-tab-reparent', e));
        return withDepth;
      }

      void persistBlockReparent(moving, plan, prevBlocks);
      return next;
    });
    syncFocusedToggleFromBlock(moving.id);
  }, [normalizeDepthByOrder, persistBlockReparent, syncFocusedToggleFromBlock]);

  const handleIndentBlock = useCallback((block: NoteBlock, direction: 'in' | 'out') => {
    const prevBlocks = blocksRef.current;
    const tabPlan = planBlockTabIndent(prevBlocks, block.id, direction);
    if (tabPlan) {
      applyBlockReparentPlan(block, tabPlan);
      return;
    }

    // 湲癒몃━쨌踰덊샇 紐⑸줉? 遺紐??먯떇 援ъ“濡쒕쭔 ?ㅼ뿬?곌린
    if (block.type === 'bulletList' || block.type === 'numberedList') return;

    // 猷⑦듃 釉붾줉留?content.depth ?쒓컖 ?ㅼ뿬?곌린 (?좉? ?녿뒗 寃쎌슦 ?대갚)
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
  }, [applyBlockReparentPlan, handleUpdateBlock]); // handleUpdateBlock: visual depth fallback??
  const handleNavigateBlock = useCallback((block: NoteBlock, direction: 'previous' | 'next') => {
    const siblings = filterSiblingBlocks(blocks, block);
    const idx = siblings.findIndex((b) => b.id === block.id);
    if (idx < 0) return;
    const target = direction === 'previous' ? siblings[idx - 1] : siblings[idx + 1];
    if (!target) return;
    if (direction === 'previous') {
      const targetText = typeof target.content?.text === 'string' ? target.content.text : '';
      focusBlockEditor(target.id, 'editor', targetText.length);
      return;
    }
    focusBlockEditor(target.id, 'editor', 0);
  }, [blocks, focusBlockEditor]);

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
        throw new Error(j?.error || '釉붾줉 異붽? ?ㅽ뙣');
      }
      const json = (await res.json()) as { block: NoteBlock };
      let orderPayload: { id: string; order_index: number }[] = [];
      setBlocks((prev) => {
        // split 吏곹썑 onChange濡?媛깆떊??蹂몃Ц???좎? ??blocksRef ?ㅻ깄?룹쑝濡???뼱?곗? ?딆쓬
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
      if (options?.registerUndo !== false) registerCreatedBlockUndo(json.block.id);
      void fetch('/api/admin/note/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orders: orderPayload }),
      }).then(() => triggerSave()).catch((e) => devLogger.error('[Note] normalizeInsertOrder', e));
      return json.block;
    } catch (e) {
      devLogger.error('[Note] insertBlockAmongSiblings', e);
      setError(e instanceof Error ? e.message : '釉붾줉 異붽? ?ㅽ뙣');
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
      registerCreatedBlockUndo(created.id);
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
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '釉붾줉 異붽? ?ㅽ뙣'); }
      const json = (await res.json()) as { block: NoteBlock };
      setBlocks((prev) => [json.block, ...prev]);
      focusBlockEditor(json.block.id, type === 'toggle' ? 'title' : 'editor');
      registerCreatedBlockUndo(json.block.id);
      triggerSave();
    } catch (e) { devLogger.error('[Note] addBlock', e); setError(e instanceof Error ? e.message : '異붽? ?ㅽ뙣'); }
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
    const nextContent = buildContentForTypeChange(block.content, block.type, type);
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
      throw new Error(j?.error || '??젣 ?ㅽ뙣');
    }
  }, []);

  const finalizeBlockDelete = useCallback(async (options?: {
    skipDeleteUndo?: boolean;
    lastDeletedId?: string | null;
  }) => {
    if (!options?.skipDeleteUndo && options?.lastDeletedId) {
      noteUndo.pushUndoDelete(options.lastDeletedId);
      setPendingDeleteUndo(options.lastDeletedId);
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
        lastDeletedId: block.id,
      });
    } catch (e) {
      devLogger.error('[Note] deleteBlock', e);
      setError(e instanceof Error ? e.message : '釉붾줉 ??젣 ?ㅽ뙣');
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
        lastDeletedId: plan.deletedIds[plan.deletedIds.length - 1] ?? null,
      });
    } catch (e) {
      devLogger.error('[Note] deleteBlocks', e);
      setError(e instanceof Error ? e.message : '釉붾줉 ??젣 ?ㅽ뙣');
      setBlocks(prevBlocks);
    }
  }, [finalizeBlockDelete, handleDeleteBlock, persistDeletePromotionPatches, softDeleteBlockIds]);

  const showFormatToolbar = useCallback((
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    position: { top: number; left: number },
  ) => {
    formatToolbarApiRef.current.show(applyMark, applyTextStyle, position);
  }, []);

  const hideFormatToolbar = useCallback(() => {
    formatToolbarApiRef.current.hide();
  }, []);

  const handleCopyBlockLink = useCallback((block: NoteBlock) => {
    if (!selectedId) return;
    const url = `${window.location.origin}/admin/note?id=${encodeURIComponent(selectedId)}#block-${block.id}`;
    void navigator.clipboard.writeText(url);
  }, [selectedId]);

  const uploadNoteImage = useCallback(async (file: File) => {
    if (!selectedId) throw new Error('臾몄꽌瑜?癒쇱? ?좏깮?댁빞 ?⑸땲??');
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
      throw new Error(body.error ?? '?대?吏 ?낅줈???ㅽ뙣');
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
      setError(e instanceof Error ? e.message : '釉붾줉 蹂묓빀 ?ㅽ뙣');
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
        throw new Error(j?.error || '釉붾줉 蹂듦뎄 ?ㅽ뙣');
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
      setError(e instanceof Error ? e.message : '釉붾줉 蹂듦뎄 ?ㅽ뙣');
    } finally {
      setRestoringBlockId(null);
    }
  }, [focusBlockEditor, setPendingDeleteUndo, triggerSave]);

  const applyNoteUndoEntry = useCallback(async (entry: NoteUndoEntry | null) => {
    if (!entry) return;
    if (entry.kind === 'restore-blocks') {
      setBlocks((prev) => {
        const map = new Map(entry.snapshots.map((snapshot) => [snapshot.id, snapshot]));
        return prev.map((block) => {
          const snapshot = map.get(block.id);
          if (!snapshot) return block;
          return {
            ...block,
            type: snapshot.type,
            content: snapshot.content,
            parent_block_id: snapshot.parent_block_id,
            order_index: snapshot.order_index,
          };
        });
      });
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
        devLogger.error('[Note] undo restore-blocks', e);
        setError(e instanceof Error ? e.message : '?ㅽ뻾 痍⑥냼 ?ㅽ뙣');
      }
      return;
    }
    if (entry.kind === 'undo-create') {
      const block = blocksRef.current.find((item) => item.id === entry.blockId);
      if (block) await handleDeleteBlock(block, false, true);
      return;
    }
    if (entry.kind === 'undo-delete') {
      setPendingDeleteUndo(null);
      await handleRestoreBlockFromTrash({ id: entry.blockId } as NoteBlock);
    }
  }, [handleDeleteBlock, handleRestoreBlockFromTrash, setPendingDeleteUndo, triggerSave]);

  const handlePurgeBlockFromTrash = useCallback(async (block: NoteBlock) => {
    if (!confirm('??釉붾줉???곴뎄??젣?좉퉴?? ???묒뾽? ?섎룎由????놁뒿?덈떎.')) return;
    try {
      setPurgingBlockId(block.id);
      const res = await fetch(`/api/admin/note/blocks/trash/purge?id=${encodeURIComponent(block.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '釉붾줉 ?곴뎄??젣 ?ㅽ뙣');
      }
      if (lastDeletedBlockIdRef.current === block.id) setPendingDeleteUndo(null);
      setTrashedBlocks((prev) => prev.filter((b) => b.id !== block.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] purgeBlockFromTrash', e);
      setError(e instanceof Error ? e.message : '釉붾줉 ?곴뎄??젣 ?ㅽ뙣');
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
        if (!isUndo || !noteUndo.hasUndo()) return;
      } else if (!noteUndo.hasUndo()) {
        return;
      }

      if (!isUndo) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      const entry = noteUndo.popUndo();
      void applyNoteUndoEntry(entry);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [applyNoteUndoEntry, noteUndo]);

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
    applyNoteUndoEntry,
    showFormatToolbar,
    hideFormatToolbar,
    handleCopyBlockLink,
    uploadNoteImage,
  };
}
