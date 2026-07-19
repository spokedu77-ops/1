'use client';

import { useCallback, useEffect } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteFormatToolbarApi } from '../_components/NoteFormatToolbarHost';
import { type useNoteBlockUndo } from '../_hooks/useNoteBlockUndo';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import { useNoteBlockContentSave } from '../_hooks/useNoteBlockContentSave';
import { useNoteBlockUndoRecording } from '../_hooks/useNoteBlockUndoRecording';
import { useNoteBlockHistory } from '../_hooks/useNoteBlockHistory';
import { useNoteBlockKeyboard } from '../_hooks/useNoteBlockKeyboard';
import { useNoteBlockInsert } from '../_hooks/useNoteBlockInsert';
import { useNoteBlockDelete } from '../_hooks/useNoteBlockDelete';
import { planTodoListNestTab } from '../_lib/noteTodoNest';
import { normalizeTodoBlockContentRecord } from '../_lib/noteTodoContent';
import {
  planBlockTabIndent,
  resolveVisualNavigateTarget,
  sortRootBlocks,
  type BlockDropPlan,
} from '@/app/lib/note/noteBlockTree';
import {
  buildMoveBlockCommand,
  collectBlockTransactionIds,
  type NoteBlockCommandResult,
} from '../_lib/noteBlockCommands';
import { normalizeListBlockContentRecord } from '../_components/noteBulletInput';
import { applyBlockContentChange } from '../_lib/noteBlockContentPipeline';
import { bumpNoteReconcileIdle } from '../_lib/noteReconcileIdle';
import {
  commitActiveNoteEditorToStore,
  mergeBlocksWithStoreContent,
  resolveBlockTextCaretOffset,
} from '../_lib/noteBlockStateMerge';
import { readToggleTitleText } from '../_lib/noteNotionBlockBehavior';
import { clearAllNoteTextSelections } from '../_components/noteCrossSelect';
import { preserveEditorScrollPosition } from '../_lib/noteEditorScrollGuard';
import { notePointerTargetElement } from '../_lib/notePointerTarget';
import { buildContentForTypeChange, getBlockedTypeChangeReason } from '../_lib/noteBlockTypeChange';
import {
  canSplitMultilinePasteToBlocks,
} from '../_lib/noteMultilinePaste';
import {
  isStructuralHtmlPasteSpec,
  type PastedBlockSpec,
} from '../_lib/notePasteBlocks';
import {
  buildBlockClipboardPayload,
  clipboardPayloadToPasteSpecs,
  parseBlockClipboardText,
  serializeBlockClipboardPayload,
} from '../_lib/noteBlockClipboard';
import {
  insertPastedBlockSpecsAfterAnchor,
  insertPastedBlockSpecsAfterBlock,
  resolvePasteSourceContent,
} from '../_lib/notePasteInsert';
import type { LoadingState, NoteBlock } from '../_lib/types';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

export function useNoteBlockActions(options: {
  blocks: NoteBlock[];
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  setTrashedBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  selectedId: string | null;
  loadingBlocks: boolean;
  loadSettledDocId: string | null;
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
  persistBlockReparent: (command: NoteBlockCommandResult) => Promise<void>;
  documentEngine: NoteDocumentEngineApi;
  onAfterBlocksRemoved?: (removed: NoteBlock[], nextBlocks: NoteBlock[]) => void;
  onAfterBlocksChanged?: (nextBlocks: NoteBlock[]) => void;
}) {
  const {
    blocks,
    blocksRef,
    setBlocks,
    setTrashedBlocks,
    selectedId,
    loadingBlocks,
    loadSettledDocId,
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
    lastDeletedBlockIdRef,
    setPendingDeleteUndo,
    triggerSave,
    noteUndo,
    loadTrashedBlocks,
    focusBlockEditor,
    syncFocusedToggleFromBlock,
    handleCreateSubPage,
    persistBlockReparent,
    documentEngine,
    onAfterBlocksRemoved,
    onAfterBlocksChanged,
  } = options;

  const { scheduleBlockContentSave, clearPendingContentPatch } = useNoteBlockContentSave({
    documentEngine,
  });

  const {
    recordBlockUndo,
    recordContentUndoBeforeChange,
    recordBlockCommandUndo,
    recordBlockTransactionUndo,
    clearContentUndoSession,
  } = useNoteBlockUndoRecording({ blocksRef, noteUndo });

  const { bindHistoryHandlers, runNoteUndo, runNoteRedo } = useNoteBlockHistory({
    blocksRef,
    documentEngine,
    noteUndo,
    setError,
    setPendingDeleteUndo,
    clearContentUndoSession,
  });

  const syncBlockContent = useCallback((
    blockId: string,
    content: unknown,
    options?: { skipUndo?: boolean },
  ) => {
    let block = useNoteBlockStore.getState().getBlock(blockId);
    if (!block) {
      block = blocksRef.current.find((b) => b.id === blockId);
    }
    if (!block) return;
    applyBlockContentChange({
      block,
      content,
      blocksRef,
      recordContentUndoBeforeChange,
      scheduleBlockContentSave,
      skipUndo: options?.skipUndo,
      onAfterChange: () => bumpNoteReconcileIdle(selectedId),
    });
  }, [blocksRef, recordContentUndoBeforeChange, scheduleBlockContentSave, selectedId]);

  const handleUpdateBlock = useCallback((block: NoteBlock, content: any) => {
    applyBlockContentChange({
      block,
      content,
      blocksRef,
      recordContentUndoBeforeChange,
      scheduleBlockContentSave,
      onAfterChange: () => bumpNoteReconcileIdle(selectedId),
    });
  }, [blocksRef, recordContentUndoBeforeChange, scheduleBlockContentSave, selectedId]);

  const {
    insertBlockAmongSiblings,
    handleDuplicateBlock,
    handleInsertBlockAfter,
    handleSplitListBlockAfterWithChildren,
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
    documentEngine,
    recordBlockCommandUndo,
    recordBlockTransactionUndo,
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
    documentEngine,
    setTrashedBlocks,
    docTab,
    setError,
    setMobileTab,
    setRestoringBlockId,
    setPurgingBlockId,
    setMergeFocusCaretOffset,
    lastDeletedBlockIdRef,
    setPendingDeleteUndo,
    triggerSave,
    loadTrashedBlocks,
    focusBlockEditor,
    recordBlockCommandUndo,
    ensureMinimumRootTextBlock,
    onAfterBlocksRemoved,
  });

  useEffect(() => {
    bindHistoryHandlers({
      handleDeleteBlock,
      handleRestoreBlockFromTrash,
    });
  }, [bindHistoryHandlers, handleDeleteBlock, handleRestoreBlockFromTrash]);

  const applyBlockReparentPlan = useCallback((moving: NoteBlock, plan: BlockDropPlan<NoteBlock>) => {
    const prevBlocks = blocksRef.current;
    const command = buildMoveBlockCommand(prevBlocks, moving.id, plan);
    if (command.affectedIds.length === 0) return;
    recordBlockCommandUndo(prevBlocks, command);
    setBlocks(command.nextBlocks);
    onAfterBlocksChanged?.(command.nextBlocks);
    void persistBlockReparent(command);
    syncFocusedToggleFromBlock(moving.id);
    bumpNoteReconcileIdle(selectedId);
  }, [blocksRef, onAfterBlocksChanged, persistBlockReparent, recordBlockCommandUndo, selectedId, setBlocks, syncFocusedToggleFromBlock]);

  const handleIndentBlock = useCallback((block: NoteBlock, direction: 'in' | 'out') => {
    const prevBlocks = blocksRef.current;
    const todoNest = planTodoListNestTab(prevBlocks, block.id, direction);
    if (todoNest) {
      const base = (block.content ?? {}) as Record<string, unknown>;
      const nextContent = normalizeTodoBlockContentRecord({
        ...base,
        listNestLevel: todoNest.listNestLevel,
      });
      recordContentUndoBeforeChange(block.id);
      syncBlockContent(block.id, nextContent);
      bumpNoteReconcileIdle(selectedId);
      return;
    }

    const tabPlan = planBlockTabIndent(prevBlocks, block.id, direction);
    if (tabPlan) {
      applyBlockReparentPlan(block, tabPlan);
    }
  }, [
    applyBlockReparentPlan,
    blocksRef,
    recordContentUndoBeforeChange,
    selectedId,
    syncBlockContent,
  ]);
  const handleNavigateBlock = useCallback((block: NoteBlock, direction: 'previous' | 'next') => {
    const snapshot = blocksRef.current;
    const target = resolveVisualNavigateTarget(snapshot, block.id, direction);
    if (!target) return;
    if (target.type === 'toggle' && direction === 'previous') {
      const title = readToggleTitleText(target.content as Record<string, unknown>);
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
    if (!selectedId || loadingBlocks || loadSettledDocId !== selectedId) return;
    const roots = sortRootBlocks(blocksRef.current);
    const last = roots[roots.length - 1];
    if (!last) {
      void handleAddBlock('text');
      return;
    }
    const lastContent = (last.content ?? {}) as Record<string, unknown>;
    const lastText = typeof lastContent.text === 'string' ? lastContent.text : '';
    const lastHtml = typeof lastContent.html === 'string'
      ? lastContent.html.replace(/<[^>]*>/g, '').trim()
      : '';
    const lastTitle = typeof lastContent.title === 'string' ? lastContent.title : '';
    if (
      (last.type === 'text' || last.type === 'todo' || last.type === 'callout' || last.type === 'quote')
      && lastText.trim().length === 0
      && lastHtml.length === 0
      && lastTitle.trim().length === 0
    ) {
      focusBlockEditor(last.id, 'editor');
      return;
    }
    void handleInsertBlockAfter(last, 'text');
  }, [
    blocksRef,
    focusBlockEditor,
    handleAddBlock,
    handleInsertBlockAfter,
    loadSettledDocId,
    loadingBlocks,
    selectedId,
  ]);

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
  }, [handleClickEditorWhitespace, setSelectedBlockIds]);

  const handleChangeBlockType = useCallback(async (
    block: NoteBlock,
    type: NoteBlock['type'],
    options?: { contentOverride?: Record<string, unknown> },
  ) => {
    const blockedReason = getBlockedTypeChangeReason(block.type, type, block.content);
    if (blockedReason) {
      setError(blockedReason);
      return;
    }

    // empty-backspace unwrap: TipTap/debounce 잔여 본문이 commit으로 되살아나지 않게 override
    if (!options?.contentOverride) {
      commitActiveNoteEditorToStore();
    } else {
      clearPendingContentPatch(block.id);
      useNoteBlockStore.getState().patchContent(block.id, options.contentOverride);
    }
    const latestBlock = blocksRef.current.find((b) => b.id === block.id) ?? block;
    const storeSnapshot = useNoteBlockStore.getState().getBlock(block.id);
    const sourceContent = (options?.contentOverride
      ?? storeSnapshot?.content
      ?? latestBlock.content
      ?? {}) as Record<string, unknown>;
    recordBlockUndo([block.id]);
    let nextContent = options?.contentOverride
      ? { ...options.contentOverride }
      : buildContentForTypeChange(sourceContent, latestBlock.type, type);
    if (type === 'bulletList' || type === 'numberedList') {
      nextContent = normalizeListBlockContentRecord(nextContent);
    }
    clearPendingContentPatch(block.id);

    const wasOnThisBlock = focusedEditorBlockIdRef.current === block.id;
    const nextFocusPart: 'title' | 'editor' =
      type === 'toggle' ? 'title'
        : block.type === 'toggle' ? 'editor'
          : (focusedEditorPartRef.current ?? 'editor');

    try {
      await documentEngine.persistFieldPatches([{
        id: block.id,
        type,
        content: nextContent,
      }]);
      bumpNoteReconcileIdle(selectedId);
      triggerSave();
      preserveEditorScrollPosition(editorScrollRef.current, () => {});
      const nextFocusOffset = nextFocusPart === 'editor' ? 0 : undefined;
      if (wasOnThisBlock) {
        focusBlockEditor(block.id, nextFocusPart, nextFocusOffset, { preventScroll: true });
      } else {
        const fallbackPart = type === 'toggle' ? 'title' : 'editor';
        focusBlockEditor(block.id, fallbackPart, fallbackPart === 'editor' ? 0 : undefined, { preventScroll: true });
      }
    } catch (e) {
      devLogger.error('[Note] changeBlockType', e);
      setError(e instanceof Error ? e.message : '블록 타입 변경 저장 실패');
    }
  }, [
    blocksRef,
    clearPendingContentPatch,
    documentEngine,
    editorScrollRef,
    focusBlockEditor,
    focusedEditorBlockIdRef,
    focusedEditorPartRef,
    recordBlockUndo,
    selectedId,
    setError,
    triggerSave,
  ]);

  const showFormatToolbar = useCallback((
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
    editLink?: () => void,
  ) => {
    formatToolbarApiRef.current.show(
      applyMark,
      applyTextStyle,
      applyTextColor,
      applyHighlight,
      position,
      insertTable,
      editLink,
    );
  }, [formatToolbarApiRef]);

  const hideFormatToolbar = useCallback(() => {
    formatToolbarApiRef.current.hide();
  }, [formatToolbarApiRef]);

  const handleMultilinePaste = useCallback(async (block: NoteBlock, specs: PastedBlockSpec[]) => {
    if (!selectedId || specs.length === 0) return;
    const normalizedSpecs = specs.length > 1 && specs[0]?.type === 'text' && block.type !== 'text'
      ? [{ ...specs[0], type: block.type }, ...specs.slice(1)]
      : specs;
    const singleSpecialPaste = normalizedSpecs.length === 1 && (
      isStructuralHtmlPasteSpec(normalizedSpecs[0])
      || normalizedSpecs[0].type !== block.type
    );
    if (normalizedSpecs.length > 1 && !canSplitMultilinePasteToBlocks(block.type)) return;
    if (normalizedSpecs.length === 1 && !singleSpecialPaste) return;

    const previousBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    const sourceContent = resolvePasteSourceContent(block);

    const { lastFocusId, lastFocusPart } = await insertPastedBlockSpecsAfterAnchor(
      {
        blocksRef,
        insertBlockAmongSiblings,
        changeBlockType: handleChangeBlockType,
        syncBlockContent,
      },
      block,
      normalizedSpecs,
      sourceContent,
    );
    if (documentEngine.hasPendingContent()) {
      await documentEngine.flushContentPatches();
    }

    const nextBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    recordBlockTransactionUndo(
      previousBlocks,
      nextBlocks,
      collectBlockTransactionIds(previousBlocks, nextBlocks),
    );
    if (normalizedSpecs[0]?.type === 'image' || normalizedSpecs[0]?.type === 'table' || normalizedSpecs[0]?.type === 'divider') {
      return;
    }
    focusBlockEditor(lastFocusId, lastFocusPart);
  }, [
    selectedId,
    syncBlockContent,
    handleChangeBlockType,
    insertBlockAmongSiblings,
    recordBlockTransactionUndo,
    focusBlockEditor,
    blocksRef,
    documentEngine,
  ]);

  const handlePasteBlockClipboard = useCallback(async (payloadText: string) => {
    if (!selectedId) return;
    const payload = parseBlockClipboardText(payloadText);
    if (!payload) return;
    const specs = clipboardPayloadToPasteSpecs(payload);
    if (specs.length === 0) return;

    const anchor = (focusedEditorBlockIdRef.current
        ? blocksRef.current.find((block) => block.id === focusedEditorBlockIdRef.current) ?? null
        : null)
      ?? sortRootBlocks(blocksRef.current).at(-1)
      ?? null;
    if (!anchor) return;

    const previousBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    const sourceContent = resolvePasteSourceContent(anchor);
    const { lastFocusId, lastFocusPart } = await insertPastedBlockSpecsAfterBlock(
      {
        blocksRef,
        insertBlockAmongSiblings,
        changeBlockType: handleChangeBlockType,
        syncBlockContent,
      },
      anchor,
      specs,
      sourceContent,
    );

    const nextBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    recordBlockTransactionUndo(
      previousBlocks,
      nextBlocks,
      collectBlockTransactionIds(previousBlocks, nextBlocks),
    );
    focusBlockEditor(lastFocusId, lastFocusPart);
  }, [
    selectedId,
    focusedEditorBlockIdRef,
    blocksRef,
    insertBlockAmongSiblings,
    handleChangeBlockType,
    syncBlockContent,
    recordBlockTransactionUndo,
    focusBlockEditor,
  ]);

  const handleCopySelectedBlocks = useCallback(async () => {
    const selected = [...selectedBlockIdsRef.current];
    const payload = buildBlockClipboardPayload(blocksRef.current, selected);
    if (!payload) return false;
    const serialized = serializeBlockClipboardPayload(payload);
    try {
      await navigator.clipboard.writeText(serialized);
      return true;
    } catch {
      return false;
    }
  }, [blocksRef, selectedBlockIdsRef]);

  const handleCutSelectedBlocks = useCallback(async () => {
    const selected = [...selectedBlockIdsRef.current];
    if (selected.length === 0) return;
    const copied = await handleCopySelectedBlocks();
    if (!copied) return;
    const blocksToDelete = blocksRef.current.filter((block) => selected.includes(block.id));
    await handleDeleteBlocks(blocksToDelete);
  }, [blocksRef, handleCopySelectedBlocks, handleDeleteBlocks, selectedBlockIdsRef]);

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
    handleCopySelectedBlocks,
    handleCutSelectedBlocks,
    handlePasteBlockClipboard,
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
    handlePasteBlockClipboard,
    handleCopySelectedBlocks,
    handleCutSelectedBlocks,
    handleInsertBlockAfter,
    handleSplitListBlockAfterWithChildren,
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
