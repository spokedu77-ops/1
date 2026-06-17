'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import { useNoteBlockUndo } from '../_hooks/useNoteBlockUndo';
import type { NoteFormatToolbarApi } from '../_components/NoteFormatToolbarHost';
import { NotePageContext, type NotePageContextValue } from './NotePageContext';
import { useNoteDocumentData } from './useNoteDocumentData';
import { useNoteBlockData } from './useNoteBlockData';
import { useNoteEditorFocus } from './useNoteEditorFocus';
import { useNoteBlockRenderers } from './useNoteBlockRenderers';
import { useNoteDragDrop } from './useNoteDragDrop';
import { useNoteDocumentActions } from './useNoteDocumentActions';
import { useNoteBlockActions } from './useNoteBlockActions';
import { useNoteBlockSelection } from './useNoteBlockSelection';
import type { LoadingState } from '../_lib/types';

export function NotePageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { closeAll, setDesktopOpen, setMobileOpen } = useAppSidebar();

  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [mobileTab, setMobileTab] = useState<'list' | 'editor'>('list');
  const [docTab, setDocTab] = useState<'active' | 'trash' | 'block-trash'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [showDocIconPicker, setShowDocIconPicker] = useState(false);
  const [docIconDraft, setDocIconDraft] = useState('');
  const docIconInputRef = useRef<HTMLInputElement>(null);
  const [sidebarIconPicker, setSidebarIconPicker] = useState<{ docId: string; top: number; left: number } | null>(null);
  const [sidebarIconDraft, setSidebarIconDraft] = useState('');
  const sidebarIconInputRef = useRef<HTMLInputElement>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement>(null);
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
  const noteUndo = useNoteBlockUndo();
  const setPendingDeleteUndo = useCallback((blockId: string | null) => {
    lastDeletedBlockIdRef.current = blockId;
  }, []);
  const lastDeletedBlockIdRef = useRef<string | null>(null);

  const docData = useNoteDocumentData({
    closeAll,
    setMobileTab,
    docTab,
    viewMode,
    setError,
  });
  const blockData = useNoteBlockData({
    selectedId: docData.selectedId,
    docTab,
    setError,
    setPendingDeleteUndo,
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
    normalizeDepthByOrder: dragDrop.normalizeDepthByOrder,
    persistBlockReparent: dragDrop.persistBlockReparent,
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
    handleInsertBlockInParent,
    handleAddBlock,
    handleClickEditorWhitespace,
    handleDocumentBodyMouseDown,
    handleChangeBlockType,
    handleDeleteBlock,
    handleDeleteBlocks,
    handleMergeWithPreviousBlock,
    handleDuplicateBlock,
    handleRestoreBlockFromTrash,
    handlePurgeBlockFromTrash,
    recordBlockUndo,
    showFormatToolbar,
    hideFormatToolbar,
    handleCopyBlockLink,
    uploadNoteImage,
  } = blockActions;

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
    handleInsertBlockInParent,
    handleOpenDocumentById,
    showFormatToolbar,
    hideFormatToolbar,
    handleMergeWithPreviousBlock,
    handleDuplicateBlock,
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

  useEffect(() => {
    if (!showDocIconPicker) return;
    const t = window.setTimeout(() => {
      docIconInputRef.current?.focus();
      docIconInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [showDocIconPicker]);

  useEffect(() => {
    if (!showPageMenu) return;
    const onDown = (e: MouseEvent) => {
      if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) {
        setShowPageMenu(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showPageMenu]);

  useEffect(() => {
    if (!sidebarIconPicker) return;
    const t = window.setTimeout(() => {
      sidebarIconInputRef.current?.focus();
      sidebarIconInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [sidebarIconPicker]);

  const value = {
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
    handleInsertBlockInParent,
    handleAddBlock,
    handleClickEditorWhitespace,
    handleDocumentBodyMouseDown,
    handleChangeBlockType,
    handleDeleteBlock,
    handleDeleteBlocks,
    handleMergeWithPreviousBlock,
    handleDuplicateBlock,
    handleRestoreBlockFromTrash,
    handlePurgeBlockFromTrash,
    recordBlockUndo,
    renderDocumentTree,
    renderSortableBlock,
  } as NotePageContextValue;

  return (
    <NotePageContext.Provider value={value}>
      {children}
    </NotePageContext.Provider>
  );
}
