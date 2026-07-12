'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getChildDocumentIdFromPageContent } from '@/app/lib/note/documentParentSync';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import { useNoteBlockUndo } from '../_hooks/useNoteBlockUndo';
import type { NoteFormatToolbarApi } from '../_components/NoteFormatToolbarHost';
import type { NotePageContextValue } from './NotePageContext';
import { useNoteDocumentData } from './useNoteDocumentData';
import { useNoteBlockData } from './useNoteBlockData';
import { useNoteEditorFocus } from './useNoteEditorFocus';
import { useNoteBlockRenderers } from './useNoteBlockRenderers';
import { useNoteDragDrop } from './useNoteDragDrop';
import { useNoteDocumentActions } from './useNoteDocumentActions';
import { useNoteBlockActions } from './useNoteBlockActions';
import { useNoteBlockSelection } from './useNoteBlockSelection';
import { useNotePageChrome } from './useNotePageChrome';
import type { LoadingState, NoteBlock } from '../_lib/types';
import { enqueueDocumentPatch } from '../_lib/noteDocumentMetaOpQueue';
import {
  applyParentPatchesToDocuments,
  planParentPatchesForDocumentBlocks,
} from '../_lib/noteDocumentParentClient';
import { setNoteToggleBackspaceRuntime } from '../_lib/noteToggleBackspaceRuntime';

/** NotePageContext value 조립 — 문서·블록·선택·DnD 훅 wiring */
export function useNotePageOrchestration(): NotePageContextValue {
  const router = useRouter();
  const { closeAll, setDesktopOpen, setMobileOpen } = useAppSidebar();

  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [mobileTab, setMobileTab] = useState<'list' | 'editor'>('list');
  const [docTab, setDocTab] = useState<'active' | 'trash' | 'block-trash'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const chrome = useNotePageChrome();
  const {
    showDocIconPicker,
    setShowDocIconPicker,
    docIconDraft,
    setDocIconDraft,
    docIconInputRef,
    sidebarIconPicker,
    setSidebarIconPicker,
    sidebarIconDraft,
    setSidebarIconDraft,
    sidebarIconInputRef,
    shareLinkCopied,
    setShareLinkCopied,
    togglingPublic,
    setTogglingPublic,
    showPageMenu,
    setShowPageMenu,
    pageMenuRef,
  } = chrome;
  const formatToolbarApiRef = useRef<NoteFormatToolbarApi>({
    show: () => {},
    hide: () => {},
  });
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(() => new Set());
  const [blockMarqueeActive, setBlockMarqueeActive] = useState(false);
  const selectedBlockIdsRef = useRef<Set<string>>(new Set());
  const suppressGripMenuRef = useRef(false);
  const saveTimersRef = useRef<Record<string, number | undefined>>({});
  const docTitleSaveSeqRef = useRef<Record<string, number>>({});
  const savedTimerRef = useRef<number | undefined>(undefined);
  const triggerSaveRef = useRef<() => void>(() => {});
  const noteUndo = useNoteBlockUndo();
  const setPendingDeleteUndo = useCallback((blockId: string | null) => {
    lastDeletedBlockIdRef.current = blockId;
  }, []);
  const lastDeletedBlockIdRef = useRef<string | null>(null);
  const [bootstrapBlocks, setBootstrapBlocks] = useState<{
    documentId: string;
    blocks: NoteBlock[];
  } | null>(null);

  const handleBootstrapBlocks = useCallback(
    (payload: { documentId: string; blocks: NoteBlock[] } | null) => {
      setBootstrapBlocks(payload);
    },
    [],
  );

  const docData = useNoteDocumentData({
    closeAll,
    setMobileTab,
    docTab,
    viewMode,
    setError,
    onBootstrapBlocks: handleBootstrapBlocks,
  });
  const docSelectedId = docData.selectedId;
  const docDocuments = docData.documents;
  const setDocDocuments = docData.setDocuments;
  const reloadDocumentsForReconcile = docData.reloadDocuments;

  useEffect(() => {
    setBootstrapBlocks((prev) => (
      prev && prev.documentId !== docSelectedId ? null : prev
    ));
  }, [docSelectedId]);

  const handleAfterIdleReconcile = useCallback(() => {
    void reloadDocumentsForReconcile();
  }, [reloadDocumentsForReconcile]);

  const syncDocumentParentsFromBlocks = useCallback((
    parentDocumentId: string,
    blocksSnapshot: NoteBlock[],
  ) => {
    const patches = planParentPatchesForDocumentBlocks(
      docDocuments,
      parentDocumentId,
      blocksSnapshot,
    );
    if (patches.length === 0) return;
    setDocDocuments((prev) => applyParentPatchesToDocuments(prev, patches));
    for (const patch of patches) {
      void enqueueDocumentPatch(patch).catch((e) => {
        devLogger.error('[Note] document parent patch', e);
      });
    }
  }, [docDocuments, setDocDocuments]);

  const handleAfterBlocksRemoved = useCallback((
    removed: NoteBlock[],
    nextBlocks: NoteBlock[],
  ) => {
    if (!docSelectedId) return;
    for (const block of removed) {
      if (block.type !== 'page') continue;
      const childId = getChildDocumentIdFromPageContent(
        block.content as Record<string, unknown>,
      );
      if (!childId) continue;
      setDocDocuments((prev) => applyParentPatchesToDocuments(prev, [
        { id: childId, parent_id: null },
      ]));
      void enqueueDocumentPatch({ id: childId, parent_id: null }).catch((e) => {
        devLogger.error('[Note] detach child document', e);
      });
    }
    syncDocumentParentsFromBlocks(docSelectedId, nextBlocks);
  }, [docSelectedId, setDocDocuments, syncDocumentParentsFromBlocks]);

  const blockData = useNoteBlockData({
    selectedId: docData.selectedId,
    docTab,
    setError,
    setPendingDeleteUndo,
    bootstrapBlocks,
    triggerSaveRef,
    onAfterIdleReconcile: handleAfterIdleReconcile,
  });
  const editorFocus = useNoteEditorFocus({
    blocksRef: blockData.blocksRef,
    setBlocks: blockData.setBlocks,
    selectedBlockIdsRef,
    setSelectedBlockIds,
    selectedId: docData.selectedId,
    loadingBlocks: blockData.loadingBlocks,
    activeDocumentTitle: docData.activeDocument?.title,
  });

  const {
    documents,
    setDocuments,
    selectedId,
    setSelectedId,
    loadingDocuments,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    showSortMenu,
    setShowSortMenu,
    sortMenuRef,
    expandedSidebarDocs,
    toggleSidebarDocExpanded,
    collaborators,
    backlinks,
    backlinksExpanded,
    setBacklinksExpanded,
    backlinksLoading,
    activeDocument,
    allDocumentsMap,
    documentBreadcrumb,
    parentDocument,
    resolvePageIcon,
    filteredDocuments,
    boardDocuments,
    pinnedDocuments,
    favoriteDocuments,
    otherDocuments,
    childrenByParent,
    rootDocuments,
    reloadDocuments,
  } = docData;
  const {
    blocks,
    setBlocks,
    blocksRef,
    loadingBlocks,
    blocksSyncing,
    blocksEmptyConfirmed,
    loadSettledDocId,
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
  } = blockData;
  const {
    focusedEditorBlockId,
    setFocusedEditorBlockId,
    focusedEditorPart,
    focusSignal,
    focusTitleSignal,
    focusedToggleId,
    setFocusedToggleId,
    mergeFocusCaretOffset,
    setMergeFocusCaretOffset,
    requestCaretOffset,
    titleInputRef,
    editorScrollRef,
    pendingFocusDocTitleRef,
    focusedEditorBlockIdRef,
    focusedEditorPartRef,
    commitBlockToState,
    trackActiveBlock,
    syncFocusedToggleFromBlock,
    focusBlockEditor,
  } = editorFocus;

  const triggerSave = useCallback(() => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setLoadingState('saved');
    setLastSavedAt(new Date());
    savedTimerRef.current = window.setTimeout(() => setLoadingState('idle'), 3000);
  }, []);

  useEffect(() => {
    triggerSaveRef.current = triggerSave;
  }, [triggerSave]);

  const dragDrop = useNoteDragDrop({
    blocks,
    blocksRef,
    setBlocks,
    documents,
    setDocuments,
    selectedId,
    setError,
    triggerSave,
    noteUndo,
    selectedBlockIdsRef,
    documentEngine: blockData.documentEngine,
  });

  const docActions = useNoteDocumentActions({
    router,
    closeAll,
    setDesktopOpen,
    setMobileOpen,
    documents,
    setDocuments,
    setBlocks,
    blocksRef,
    selectedId,
    setSelectedId,
    setLoadingState,
    setError,
    setMobileTab,
    setViewMode,
    setFocusedToggleId,
    setFocusedEditorBlockId,
    setShowDocIconPicker,
    setSidebarIconPicker,
    setSidebarIconDraft,
    setShareLinkCopied,
    setTogglingPublic,
    titleInputRef,
    pendingFocusDocTitleRef,
    saveTimersRef,
    docTitleSaveSeqRef,
    triggerSave,
    noteUndo,
    documentEngine: blockData.documentEngine,
  });

  const blockActions = useNoteBlockActions({
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
    handleCreateSubPage: docActions.handleCreateSubPage,
    persistBlockReparent: dragDrop.persistBlockReparent,
    documentEngine: blockData.documentEngine,
    onAfterBlocksRemoved: handleAfterBlocksRemoved,
  });

  const selection = useNoteBlockSelection({
    selectedBlockIds,
    setSelectedBlockIds,
    selectedBlockIdsRef,
    blocksRef,
    setBlockMarqueeActive,
    suppressGripMenuRef,
    noteBlockDragActiveRef: dragDrop.noteBlockDragActiveRef,
    handleDeleteBlocks: blockActions.handleDeleteBlocks,
  });

  const {
    sensors,
    activeBlockId,
    activeDragDocId,
    activeBlock,
    activeDragDocument,
    dropTarget,
    multiDragCount,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = dragDrop;

  const {
    handleGoToDashboard,
    handleSelectDocument,
    handleNavigateToWorkspace,
    handleUpdateDocProperties,
    handleSetDocumentCover,
    handleSetDocumentIcon,
    openSidebarIconPicker,
    handleCreateDocumentInGroup,
    handleMoveDocumentToGroup,
    handleRenameBoardGroup,
    handleDeleteBoardGroup,
    handleReorderBoardGroup,
    handleOpenDocumentById,
    handleCreateSubPage,
    handleCreateDocument,
    handleTogglePublic,
    handleCopyPublicLink,
    handleRenameDocument,
    handleTogglePin,
    handleToggleFavorite,
    handleDeleteDocument,
    handleRestoreDocument,
    handlePurgeDocument,
  } = docActions;

  const {
    handleUpdateBlock,
    syncBlockContent,
    handleIndentBlock,
    handleNavigateBlock,
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
    handleDuplicateBlock,
    handleMultilinePaste,
    handleRestoreBlockFromTrash,
    handlePurgeBlockFromTrash,
    recordBlockUndo,
    showFormatToolbar,
    hideFormatToolbar,
    handleCopyBlockLink,
    uploadNoteImage,
  } = blockActions;

  useLayoutEffect(() => {
    setNoteToggleBackspaceRuntime({
      blocksRef,
      focusBlockEditor,
      handleDeleteBlock,
      handleMergeWithPreviousBlock,
    });
    return () => setNoteToggleBackspaceRuntime(null);
  });

  const { marqueeOverlayRef, handleBlockSelect, handleBlockListPointerDown } = selection;

  const { renderDocumentTree, renderSortableBlock } = useNoteBlockRenderers({
    blocks,
    blocksRef,
    childrenByParent,
    childrenByParentBlock,
    selectedId,
    expandedSidebarDocs,
    toggleSidebarDocExpanded,
    handleSelectDocument,
    handleTogglePin,
    handleToggleFavorite,
    handleDeleteDocument,
    handleCreateDocument,
    openSidebarIconPicker,
    focusedEditorBlockId,
    focusedEditorPart,
    focusSignal,
    focusTitleSignal,
    focusedToggleId,
    setFocusedToggleId,
    mergeFocusCaretOffset,
    requestCaretOffset,
    dropTarget,
    resolvePageIcon,
    handleUpdateBlock,
    syncBlockContent,
    handleDeleteBlock,
    handleChangeBlockType,
    handleInsertBlockAfter,
    handleSplitListBlockAfterWithChildren,
    handleInsertBlockInParent,
    handleOpenDocumentById,
    showFormatToolbar,
    hideFormatToolbar,
    handleMergeWithPreviousBlock,
    handleDuplicateBlock,
    handleMultilinePaste,
    handleCopyBlockLink,
    recordBlockUndo,
    handleIndentBlock,
    handleNavigateBlock,
    trackActiveBlock,
    uploadNoteImage,
    focusBlockEditor,
  });

  useEffect(() => {
    noteUndo.clearHistory();
  }, [selectedId, noteUndo]);

  useEffect(() => () => {
    document.body.style.userSelect = '';
    document.body.classList.remove('note-list-cross-active');
  }, []);

  return {
    router,
    closeAll,
    setDesktopOpen,
    setMobileOpen,
    error,
    setError,
    loadingState,
    setLoadingState,
    lastSavedAt,
    mobileTab,
    setMobileTab,
    viewMode,
    setViewMode,
    docTab,
    setDocTab,
    documents,
    setDocuments,
    selectedId,
    setSelectedId,
    loadingDocuments,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    showSortMenu,
    setShowSortMenu,
    sortMenuRef,
    expandedSidebarDocs,
    toggleSidebarDocExpanded,
    collaborators,
    backlinks,
    backlinksExpanded,
    setBacklinksExpanded,
    backlinksLoading,
    activeDocument,
    allDocumentsMap,
    documentBreadcrumb,
    parentDocument,
    resolvePageIcon,
    filteredDocuments,
    boardDocuments,
    pinnedDocuments,
    favoriteDocuments,
    otherDocuments,
    childrenByParent,
    rootDocuments,
    blocks,
    setBlocks,
    blocksRef,
    loadingBlocks,
    blocksSyncing,
    blocksEmptyConfirmed,
    loadSettledDocId,
    trashedBlocks,
    loadingTrashedBlocks,
    loadTrashedBlocks,
    childrenByParentBlock,
    rootBlocks,
    allSortableBlockIds,
    restoringBlockId,
    purgingBlockId,
    focusedEditorBlockId,
    focusedEditorPart,
    focusSignal,
    focusTitleSignal,
    focusedToggleId,
    setFocusedToggleId,
    mergeFocusCaretOffset,
    requestCaretOffset,
    titleInputRef,
    editorScrollRef,
    pendingFocusDocTitleRef,
    commitBlockToState,
    trackActiveBlock,
    focusBlockEditor,
    selectedBlockIds,
    setSelectedBlockIds,
    blockMarqueeActive,
    suppressGripMenuRef,
    marqueeOverlayRef,
    handleBlockSelect,
    handleBlockListPointerDown,
    sensors,
    activeBlockId,
    activeDragDocId,
    activeBlock,
    activeDragDocument,
    dropTarget,
    multiDragCount,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    triggerSave,
    handleGoToDashboard,
    handleSelectDocument,
    handleNavigateToWorkspace,
    handleUpdateDocProperties,
    handleSetDocumentCover,
    handleSetDocumentIcon,
    openSidebarIconPicker,
    handleCreateDocumentInGroup,
    handleMoveDocumentToGroup,
    handleRenameBoardGroup,
    handleDeleteBoardGroup,
    handleReorderBoardGroup,
    handleOpenDocumentById,
    handleCreateSubPage,
    handleCreateDocument,
    handleTogglePublic,
    handleCopyPublicLink,
    handleRenameDocument,
    handleTogglePin,
    handleToggleFavorite,
    handleDeleteDocument,
    handleRestoreDocument,
    handlePurgeDocument,
    reloadDocuments,
    showDocIconPicker,
    setShowDocIconPicker,
    docIconDraft,
    setDocIconDraft,
    docIconInputRef,
    sidebarIconPicker,
    setSidebarIconPicker,
    sidebarIconDraft,
    setSidebarIconDraft,
    sidebarIconInputRef,
    showPageMenu,
    setShowPageMenu,
    pageMenuRef,
    togglingPublic,
    shareLinkCopied,
    formatToolbarApiRef,
    showFormatToolbar,
    hideFormatToolbar,
    handleCopyBlockLink,
    uploadNoteImage,
    handleUpdateBlock,
    syncBlockContent,
    handleIndentBlock,
    handleNavigateBlock,
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
    handleDuplicateBlock,
    handleMultilinePaste,
    handleRestoreBlockFromTrash,
    handlePurgeBlockFromTrash,
    recordBlockUndo,
    renderDocumentTree,
    renderSortableBlock,
  } as NotePageContextValue;
}
