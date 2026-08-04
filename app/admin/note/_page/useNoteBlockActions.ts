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
  planBlockTabIndent,
  resolveVisualNavigateTarget,
  sortRootBlocks,
  type BlockDropPlan,
} from '@/app/lib/note/noteBlockTree';
import {
  buildMoveBlockCommand,
  collectBlockTransactionIds,
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
import { clearAllNoteTextSelections, getActiveCrossRanges } from '../_components/noteCrossSelect';
import { getActiveNoteEditor } from '../_components/noteEditorRegistry';
import { getActiveListCrossRanges } from '../_components/noteListCrossSelect';
import { resolveBlockIdsForSelectionDelete } from '../_lib/noteBlockSelectionKeyboard';
import { clearTipTapHistory, armStructuralPasteUndo } from '../_lib/noteEditorHistory';
import { preserveEditorScrollPosition } from '../_lib/noteEditorScrollGuard';
import { notePointerTargetElement } from '../_lib/notePointerTarget';
import { noteWhitespaceClickMayCreateBlocks } from '../_lib/noteWhitespaceContract';
import { buildContentForTypeChange, getBlockedTypeChangeReason } from '../_lib/noteBlockTypeChange';
import { canPlaceBlockTypeInParent } from '@/app/lib/note/noteBlockPolicy';
import { getBlocksInParent } from '@/app/lib/note/noteBlockTree';
import {
  canSplitMultilinePasteToBlocks,
  normalizeMultilinePasteSpecsForAnchor,
} from '../_lib/noteMultilinePaste';
import { type PastedBlockSpec } from '../_lib/notePasteBlocks';
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
import {
  resolvePasteInsertMode,
  shouldApplyStructuralPasteSpecs,
} from '../_lib/notePasteContract';
import { plainMultilineToInsertHtml } from '../_lib/notePaste';
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
    void (async () => {
      try {
        const nextBlocks = await documentEngine.applyStructureCommand(command);
        recordBlockCommandUndo(prevBlocks, command);
        setBlocks(nextBlocks);
        onAfterBlocksChanged?.(nextBlocks);
        syncFocusedToggleFromBlock(moving.id);
        bumpNoteReconcileIdle(selectedId);
      } catch (e) {
        devLogger.error('[Note] indentBlock', e);
        setBlocks(prevBlocks);
        setError(e instanceof Error ? e.message : '블록 이동 저장 실패');
      }
    })();
  }, [
    blocksRef,
    documentEngine,
    onAfterBlocksChanged,
    recordBlockCommandUndo,
    selectedId,
    setBlocks,
    setError,
    syncFocusedToggleFromBlock,
  ]);

  const handleIndentBlock = useCallback((block: NoteBlock, direction: 'in' | 'out') => {
    const prevBlocks = blocksRef.current;
    // 노션 계약: todo 중첩도 planBlockTabIndent → parent_block_id (listNestLevel 금지)
    const tabPlan = planBlockTabIndent(prevBlocks, block.id, direction);
    if (tabPlan) {
      applyBlockReparentPlan(block, tabPlan);
    }
  }, [
    applyBlockReparentPlan,
    blocksRef,
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
    // Load 계약: whitespace는 블록 create 금지 (selection clear only)
    if (noteWhitespaceClickMayCreateBlocks()) {
      throw new Error('[Note] whitespace create is contract-forbidden');
    }
    clearAllNoteTextSelections();
    setSelectedBlockIds(new Set());
  }, [setSelectedBlockIds]);

  const handleDocumentBodyMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = notePointerTargetElement(e.target);
    if (!target) return;
    if (target.closest(
      '[data-note-block-row], [data-note-editor-host], button, input, textarea, a, .ProseMirror, [data-toggle-title], [data-note-ignore-whitespace], [data-note-overlay-menu]',
    )) {
      return;
    }
    e.preventDefault();
    handleClickEditorWhitespace();
  }, [handleClickEditorWhitespace]);

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
      documentEngine.updateContent(block.id, options.contentOverride);
    }
    const latestBlock = blocksRef.current.find((b) => b.id === block.id) ?? block;
    const storeSnapshot = useNoteBlockStore.getState().getBlock(block.id);
    const sourceContent = (options?.contentOverride
      ?? storeSnapshot?.content
      ?? latestBlock.content
      ?? {}) as Record<string, unknown>;
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

    const reparentParentId = latestBlock.parent_block_id ?? null;
    const illegalChildren = blocksRef.current.filter((item) => (
      item.parent_block_id === block.id
      && !canPlaceBlockTypeInParent(item.type, type)
    ));
    const parentSiblings = getBlocksInParent(blocksRef.current, reparentParentId);
    const maxParentOrder = parentSiblings.reduce(
      (max, item) => Math.max(max, item.order_index),
      -1,
    );
    const childReparentPatches = illegalChildren.map((child, index) => ({
      id: child.id,
      parent_block_id: reparentParentId,
      order_index: maxParentOrder + 1 + index,
    }));
    const reparentById = new Map(childReparentPatches.map((patch) => [patch.id, patch]));

    try {
      const nextBlocks = await documentEngine.applyStructureCommand({
        nextBlocks: blocksRef.current.map((item) => {
          if (item.id === block.id) {
            return { ...item, type, content: nextContent };
          }
          const reparent = reparentById.get(item.id);
          if (!reparent) return item;
          return {
            ...item,
            parent_block_id: reparent.parent_block_id,
            order_index: reparent.order_index,
          };
        }),
        affectedIds: [block.id, ...illegalChildren.map((child) => child.id)],
        orders: [],
        fieldPatches: [
          {
            id: block.id,
            type,
            content: nextContent,
          },
          ...childReparentPatches,
        ],
        createdBlocks: [],
        removedBlocks: [],
      });
      recordBlockUndo([block.id]);
      setBlocks(nextBlocks);
      onAfterBlocksChanged?.(nextBlocks);
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
    setBlocks,
    setError,
    triggerSave,
    onAfterBlocksChanged,
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

  const applyPastedBlockSpecs = useCallback(async (
    block: NoteBlock,
    specs: PastedBlockSpec[],
    options?: { requireSplitGate?: boolean },
  ) => {
    if (!selectedId || specs.length === 0) return;
    const normalizedSpecs = normalizeMultilinePasteSpecsForAnchor(block.type, specs);
    const requireSplitGate = options?.requireSplitGate !== false;
    if (requireSplitGate) {
      // C6: TipTap claim(shouldClaimStructuralPasteSpecs)과 동일 축
      if (!shouldApplyStructuralPasteSpecs(normalizedSpecs)) return;
      if (normalizedSpecs.length > 1 && !canSplitMultilinePasteToBlocks(block.type)) return;
    }

    const previousBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    const outboundBefore = new Set(await documentEngine.listOutboundClientOpIds());
    const sourceContent = resolvePasteSourceContent(block);
    // C6: 블록 MIME은 절대 현재 칸 wipe 금지. TipTap 멀티라인은 live content로 blank 판정.
    const mode = resolvePasteInsertMode(block, normalizedSpecs, {
      liveContent: sourceContent,
      forceInsertAfter: options?.requireSplitGate === false,
    });
    const pasteCtx = {
      blocksRef,
      insertBlockAmongSiblings,
      changeBlockType: handleChangeBlockType,
      syncBlockContent,
      hydrateEditorContent: (blockId: string, content: Record<string, unknown>) => {
        const editor = getActiveNoteEditor(blockId);
        if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return;
        const html = typeof content.html === 'string' && content.html.trim()
          ? content.html
          : plainMultilineToInsertHtml([String(content.text ?? '')]);
        editor
          .chain()
          .command(({ tr }) => {
            tr.setMeta('addToHistory', false);
            return true;
          })
          .setContent(html, { emitUpdate: false })
          .run();
        clearTipTapHistory(editor);
      },
    };
    let lastFocusId: string;
    let lastFocusPart: 'title' | 'editor';
    try {
      const inserted = mode === 'fill-anchor'
        ? await insertPastedBlockSpecsAfterAnchor(pasteCtx, block, normalizedSpecs, sourceContent)
        : await insertPastedBlockSpecsAfterBlock(pasteCtx, block, normalizedSpecs, sourceContent);
      lastFocusId = inserted.lastFocusId;
      lastFocusPart = inserted.lastFocusPart;
    } catch (error) {
      // C6: 부분 create 실패 시 previousBlocks + paste 구간 outbound 롤백 (C4 Enter와 대칭)
      try {
        await documentEngine.rollbackMutationToBlocks(previousBlocks, outboundBefore);
        setBlocks(previousBlocks);
      } catch (rollbackError) {
        devLogger.error('[Note] applyPastedBlockSpecs rollback', rollbackError);
      }
      devLogger.error('[Note] applyPastedBlockSpecs', error);
      setError(error instanceof Error ? error.message : '붙여넣기 실패');
      return;
    }
    // flush는 저장 신뢰용 — UI 포커스 후 백그라운드로 (붙여넣기 체감 지연 완화)
    if (documentEngine.hasPendingContent()) {
      void documentEngine.flushContentPatches();
    }

    const nextBlocks = mergeBlocksWithStoreContent(blocksRef.current);
    recordBlockTransactionUndo(
      previousBlocks,
      nextBlocks,
      collectBlockTransactionIds(previousBlocks, nextBlocks),
    );
    // C3: 블록 MIME paste도 TipTap depth가 structural undo를 가로채지 않게
    armStructuralPasteUndo();
    const activeEditor = getActiveNoteEditor(block.id) ?? getActiveNoteEditor(lastFocusId);
    if (activeEditor) clearTipTapHistory(activeEditor);
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
    setBlocks,
    setError,
  ]);

  const handleMultilinePaste = useCallback(async (block: NoteBlock, specs: PastedBlockSpec[]) => {
    await applyPastedBlockSpecs(block, specs, { requireSplitGate: true });
  }, [applyPastedBlockSpecs]);

  const handlePasteBlockClipboard = useCallback(async (payloadText: string) => {
    if (!selectedId) return;
    const payload = parseBlockClipboardText(payloadText);
    if (!payload) return;
    const specs = clipboardPayloadToPasteSpecs(payload);
    if (specs.length === 0) return;

    const anchor = (focusedEditorBlockIdRef.current
        ? blocksRef.current.find((item) => item.id === focusedEditorBlockIdRef.current) ?? null
        : null)
      ?? sortRootBlocks(blocksRef.current).at(-1)
      ?? null;
    if (!anchor) return;

    await applyPastedBlockSpecs(anchor, specs, { requireSplitGate: false });
  }, [
    selectedId,
    focusedEditorBlockIdRef,
    blocksRef,
    applyPastedBlockSpecs,
  ]);

  const handleCopySelectedBlocks = useCallback(async (overrideIds?: string[]) => {
    const selected = overrideIds ?? [...selectedBlockIdsRef.current];
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
    const selected = resolveBlockIdsForSelectionDelete({
      selectedBlockIds: selectedBlockIdsRef.current,
      crossBlockIds: [
        ...getActiveCrossRanges().map((range) => range.blockId),
        ...getActiveListCrossRanges().map((range) => range.blockId),
      ],
    });
    if (selected.length === 0) return;
    // 클립보드 실패해도 삭제는 진행 (Cut no-op 방지)
    await handleCopySelectedBlocks(selected);
    clearAllNoteTextSelections();
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
