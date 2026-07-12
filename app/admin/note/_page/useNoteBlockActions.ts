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
import {
  getBlocksInParent,
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
  pastedBlocksFromPlainLines,
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
} from '../_lib/notePasteInsert';
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
  persistBlockReparent: (command: NoteBlockCommandResult) => Promise<void>;
  documentEngine: NoteDocumentEngineApi;
  onAfterBlocksRemoved?: (removed: NoteBlock[], nextBlocks: NoteBlock[]) => void;
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
    persistBlockReparent,
    documentEngine,
    onAfterBlocksRemoved,
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
    void persistBlockReparent(command);
    syncFocusedToggleFromBlock(moving.id);
    bumpNoteReconcileIdle(selectedId);
  }, [persistBlockReparent, recordBlockCommandUndo, syncFocusedToggleFromBlock, selectedId]);

  const handleIndentBlock = useCallback((block: NoteBlock, direction: 'in' | 'out') => {
    const prevBlocks = blocksRef.current;
    const tabPlan = planBlockTabIndent(prevBlocks, block.id, direction);
    if (tabPlan) {
      applyBlockReparentPlan(block, tabPlan);
      return;
    }

  }, [applyBlockReparentPlan]);
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
    const latestBlock = blocksRef.current.find((b) => b.id === block.id) ?? block;
    const storeSnapshot = useNoteBlockStore.getState().getBlock(block.id);
    const sourceContent = (storeSnapshot?.content ?? latestBlock.content ?? {}) as Record<string, unknown>;
    recordBlockUndo([block.id]);
    let nextContent = buildContentForTypeChange(sourceContent, latestBlock.type, type);
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
      if (wasOnThisBlock) {
        focusBlockEditor(block.id, nextFocusPart, undefined, { preventScroll: true });
      } else {
        focusBlockEditor(block.id, type === 'toggle' ? 'title' : 'editor', undefined, { preventScroll: true });
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
    scheduleBlockContentSave,
    selectedId,
    setBlocks,
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
  }, []);

  const hideFormatToolbar = useCallback(() => {
    formatToolbarApiRef.current.hide();
  }, []);

  const handleMultilinePaste = useCallback(async (block: NoteBlock, specs: PastedBlockSpec[]) => {
    if (!selectedId || specs.length === 0) return;
    const singleSpecialPaste = specs.length === 1 && (
      isStructuralHtmlPasteSpec(specs[0])
      || specs[0].type !== block.type
    );
    if (specs.length > 1 && !canSplitMultilinePasteToBlocks(block.type)) return;
    if (specs.length === 1 && !singleSpecialPaste) return;

    const previousBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    const sourceContent = (block.content ?? {}) as Record<string, unknown>;

    const { lastFocusId, lastFocusPart } = await insertPastedBlockSpecsAfterAnchor(
      {
        blocksRef,
        insertBlockAmongSiblings,
        changeBlockType: handleChangeBlockType,
        syncBlockContent,
      },
      block,
      specs,
      sourceContent,
    );

    const nextBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    recordBlockTransactionUndo(
      previousBlocks,
      nextBlocks,
      collectBlockTransactionIds(previousBlocks, nextBlocks),
    );
    if (specs[0]?.type === 'image' || specs[0]?.type === 'table' || specs[0]?.type === 'divider') {
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
    const sourceContent = (anchor.content ?? {}) as Record<string, unknown>;
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
