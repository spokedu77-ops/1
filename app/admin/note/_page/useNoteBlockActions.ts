'use client';

import { useCallback, useEffect } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteFormatToolbarApi } from '../_components/NoteFormatToolbarHost';
import { type useNoteBlockUndo } from '../_hooks/useNoteBlockUndo';
import { useNoteBlockContentSave } from '../_hooks/useNoteBlockContentSave';
import { useNoteBlockUndoRecording } from '../_hooks/useNoteBlockUndoRecording';
import { useNoteBlockHistory } from '../_hooks/useNoteBlockHistory';
import { useNoteBlockKeyboard } from '../_hooks/useNoteBlockKeyboard';
import { useNoteBlockInsert } from '../_hooks/useNoteBlockInsert';
import { useNoteBlockDelete } from '../_hooks/useNoteBlockDelete';
import {
  buildReparentContentPatch,
  getBlocksInParent,
  planBlockTabIndent,
  resolveVisualNavigateTarget,
  sortRootBlocks,
  type BlockDropPlan,
} from '@/app/lib/note/noteBlockTree';
import { normalizeListBlockContentRecord } from '../_components/noteBulletInput';
import { applyBlockContentChange } from '../_lib/noteBlockContentPipeline';
import { resolveBlockTextCaretOffset } from '../_lib/noteBlockStateMerge';
import { bumpNoteReconcileIdle } from '../_lib/noteReconcileIdle';
import { clearAllNoteTextSelections } from '../_components/noteCrossSelect';
import { preserveEditorScrollPosition } from '../_lib/noteEditorScrollGuard';
import { notePointerTargetElement } from '../_lib/notePointerTarget';
import { buildContentForTypeChange, getBlockedTypeChangeReason } from '../_lib/noteBlockTypeChange';
import { commitActiveNoteEditorToStore } from '../_lib/noteBlockStateMerge';
import { patchNoteBlocks } from '../_lib/noteBlocksApi';
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

  const { scheduleBlockContentSave, clearPendingContentPatch } = useNoteBlockContentSave({
    blocksRef,
    saveTimersRef,
    triggerSave,
  });

  const {
    recordBlockUndo,
    recordContentUndoBeforeChange,
    registerCreatedBlockUndo,
    clearContentUndoSession,
  } = useNoteBlockUndoRecording({ blocksRef, noteUndo });

  const { bindHistoryHandlers, runNoteUndo, runNoteRedo } = useNoteBlockHistory({
    blocksRef,
    setBlocks,
    noteUndo,
    triggerSave,
    setError,
    setPendingDeleteUndo,
    clearContentUndoSession,
  });

  const syncBlockContent = useCallback((blockId: string, content: unknown) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;
    applyBlockContentChange({
      block,
      content,
      blocksRef,
      setBlocks,
      recordContentUndoBeforeChange,
      scheduleBlockContentSave,
      onAfterChange: () => bumpNoteReconcileIdle(selectedId),
    });
  }, [recordContentUndoBeforeChange, scheduleBlockContentSave, selectedId, setBlocks]);

  const handleUpdateBlock = useCallback((block: NoteBlock, content: any) => {
    applyBlockContentChange({
      block,
      content,
      blocksRef,
      setBlocks,
      recordContentUndoBeforeChange,
      scheduleBlockContentSave,
      onAfterChange: () => bumpNoteReconcileIdle(selectedId),
    });
  }, [recordContentUndoBeforeChange, scheduleBlockContentSave, selectedId, setBlocks]);

  const {
    insertBlockAmongSiblings,
    handleDuplicateBlock,
    handleInsertBlockAfter,
    handleInsertBlockInParent,
    handleAddBlock,
    ensureMinimumRootTextBlock,
  } = useNoteBlockInsert({
    blocks,
    blocksRef,
    setBlocks,
    selectedId,
    focusedToggleId,
    focusedEditorBlockId,
    focusedEditorBlockIdRef,
    setLoadingState,
    setError,
    triggerSave,
    registerCreatedBlockUndo,
    handleUpdateBlock,
    focusBlockEditor,
    handleCreateSubPage,
  });

  const {
    handleDeleteBlock,
    handleDeleteBlocks,
    handleMergeWithPreviousBlock,
    handleRestoreBlockFromTrash,
    handlePurgeBlockFromTrash,
  } = useNoteBlockDelete({
    blocksRef,
    setBlocks,
    setTrashedBlocks,
    selectedId,
    docTab,
    setError,
    setMobileTab,
    setRestoringBlockId,
    setPurgingBlockId,
    setMergeFocusCaretOffset,
    lastDeletedBlockIdRef,
    setPendingDeleteUndo,
    triggerSave,
    noteUndo,
    loadTrashedBlocks,
    focusBlockEditor,
    recordBlockUndo,
    ensureMinimumRootTextBlock,
  });

  useEffect(() => {
    bindHistoryHandlers({
      handleDeleteBlock,
      handleRestoreBlockFromTrash,
    });
  }, [bindHistoryHandlers, handleDeleteBlock, handleRestoreBlockFromTrash]);

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
    const blockedReason = getBlockedTypeChangeReason(block.type, type, block.content);
    if (blockedReason) {
      setError(blockedReason);
      return;
    }

    commitActiveNoteEditorToStore();
    recordBlockUndo([block.id]);
    let nextContent = buildContentForTypeChange(block.content, block.type, type);
    if (type === 'bulletList' || type === 'numberedList') {
      nextContent = normalizeListBlockContentRecord(nextContent);
    }
    clearPendingContentPatch(block.id);
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
  }, [focusBlockEditor, recordBlockUndo, setError, triggerSave]);

  const showFormatToolbar = useCallback((
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
  ) => {
    formatToolbarApiRef.current.show(applyMark, applyTextStyle, applyTextColor, applyHighlight, position, insertTable);
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

  useNoteBlockKeyboard({
    docTab,
    selectedId,
    blocksRef,
    focusedEditorBlockIdRef,
    selectedBlockIdsRef,
    titleInputRef,
    noteUndo,
    runNoteUndo,
    runNoteRedo,
    handleDuplicateBlock,
    handleCopyBlockLink,
  });

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
