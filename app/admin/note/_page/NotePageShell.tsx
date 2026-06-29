'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { DndContext } from '@dnd-kit/core';
import { NoteImageLightboxProvider } from '../_components/NoteImageLightbox';
import { NoteRichEditorStyles } from '../_components/NoteRichEditorStyles';
import {
  BlockDragActiveContext,
  BlockDropTargetContext,
} from '../_components/noteContexts';
import { noteBlockCollisionDetection } from '../_lib/noteDropResolver';
import { NOTE_EDITOR_STABILITY } from '../_lib/noteEditorStability';
import { bindNoteCrossSelectCopy, getActiveCrossRanges } from '../_components/noteCrossSelect';
import { bindNoteListCrossTextSelect, getActiveListCrossRanges } from '../_components/noteListCrossSelect';
import { bindCrossSelectClipboardSources } from '../_components/noteListCrossHighlight';
import { useNotePage } from './NotePageContext';
import { NoteMobileHeader } from '../_components/layout/NoteMobileHeader';
import { NoteSidebarPanel } from '../_components/layout/NoteSidebarPanel';
import { NoteEditorPanel } from '../_components/layout/NoteEditorPanel';
import dynamic from 'next/dynamic';

const NoteSingletonEditorHost = dynamic(
  () => import('../_components/NoteSingletonEditorHost').then((mod) => mod.NoteSingletonEditorHost),
  { ssr: false },
);

const NoteFormatToolbarHost = dynamic(
  () => import('../_components/NoteFormatToolbarHost').then((mod) => mod.NoteFormatToolbarHost),
  { ssr: false },
);

const NoteDragOverlayLayer = dynamic(
  () => import('../_components/layout/NoteDragOverlayLayer').then((mod) => mod.NoteDragOverlayLayer),
  { ssr: false },
);

const NoteSidebarIconPicker = dynamic(
  () => import('../_components/layout/NoteSidebarIconPicker').then((mod) => mod.NoteSidebarIconPicker),
  { ssr: false },
);

const BoardView = dynamic(
  () => import('../_components/BoardView').then((mod) => mod.BoardView),
  { ssr: false, loading: () => <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">보드 불러오는 중…</div> },
);

export function NotePageShell() {
  const {
    error,
    setError,
    loadingState,
    mobileTab,
    setMobileTab,
    lastSavedAt,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    activeBlockId,
    activeBlock,
    activeDragDocId,
    activeDragDocument,
    multiDragCount,
    dropTarget,
    viewMode,
    activeDocument,
    boardDocuments,
    documents,
    docTab,
    setDocTab,
    selectedId,
    setSelectedId,
    setBlocks,
    handleNavigateToWorkspace,
    handleGoToDashboard,
    handleSelectDocument,
    setViewMode,
    handleCreateDocument,
    handleCreateDocumentInGroup,
    handleUpdateDocProperties,
    handleRenameBoardGroup,
    handleDeleteBoardGroup,
    handleReorderBoardGroup,
    handleSetDocumentIcon,
    formatToolbarApiRef,
    sidebarIconPicker,
    setSidebarIconPicker,
    sidebarIconDraft,
    setSidebarIconDraft,
    sidebarIconInputRef,
    loadTrashedBlocks,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    showSortMenu,
    setShowSortMenu,
    sortMenuRef,
    loadingDocuments,
    filteredDocuments,
    pinnedDocuments,
    favoriteDocuments,
    otherDocuments,
    rootDocuments,
    renderDocumentTree,
    loadingTrashedBlocks,
    trashedBlocks,
    restoringBlockId,
    purgingBlockId,
    handleRestoreDocument,
    handlePurgeDocument,
    handleRestoreBlockFromTrash,
    handlePurgeBlockFromTrash,
    pageMenuRef,
    showPageMenu,
    setShowPageMenu,
    handleCreateSubPage,
    handleSetDocumentCover,
    handleTogglePublic,
    togglingPublic,
    shareLinkCopied,
    handleCopyPublicLink,
    editorScrollRef,
    handleDocumentBodyMouseDown,
    documentBreadcrumb,
    parentDocument,
    collaborators,
    backlinks,
    backlinksExpanded,
    setBacklinksExpanded,
    showDocIconPicker,
    setShowDocIconPicker,
    docIconDraft,
    setDocIconDraft,
    docIconInputRef,
    titleInputRef,
    handleRenameDocument,
    setSelectedBlockIds,
    loadingBlocks,
    blocks,
    selectedBlockIds,
    handleBlockSelect,
    suppressGripMenuRef,
    marqueeOverlayRef,
    handleBlockListPointerDown,
    allSortableBlockIds,
    rootBlocks,
    blockMarqueeActive,
    renderSortableBlock,
    focusBlockEditor,
  } = useNotePage();

  useEffect(() => {
    if (!NOTE_EDITOR_STABILITY.crossBlockTextSelect) return;
    bindCrossSelectClipboardSources(getActiveCrossRanges, getActiveListCrossRanges);
    const unbindCross = bindNoteCrossSelectCopy();
    const unbindList = bindNoteListCrossTextSelect();
    return () => {
      unbindCross();
      unbindList();
      bindCrossSelectClipboardSources(() => [], () => []);
    };
  }, []);

  const boardViewDocuments = useMemo(() => (
    boardDocuments.map((d) => ({
      id: d.id,
      title: d.title,
      properties: d.properties ?? null,
      updated_at: d.updated_at,
    }))
  ), [boardDocuments]);

  const documentsById = useMemo(
    () => new Map(documents.map((doc) => [doc.id, doc])),
    [documents],
  );

  const handleSelectBoardDocument = useCallback((doc: { id: string }) => {
    const found = documentsById.get(doc.id);
    if (!found) return;
    handleSelectDocument(found);
    setViewMode('list');
  }, [documentsById, handleSelectDocument, setViewMode]);

  const handleRenameBoardGroupSafe = useCallback((oldName: string, newName: string) => {
    void handleRenameBoardGroup(oldName, newName);
  }, [handleRenameBoardGroup]);

  const handleDeleteBoardGroupSafe = useCallback((group: string) => {
    void handleDeleteBoardGroup(group);
  }, [handleDeleteBoardGroup]);

  const handleReorderBoardGroupSafe = useCallback((group: string, orderedIds: string[]) => {
    void handleReorderBoardGroup(group, orderedIds);
  }, [handleReorderBoardGroup]);

  return (
    <NoteImageLightboxProvider>
      <div className="flex h-[var(--viewport-height-px,100dvh)] max-w-full flex-col overflow-x-hidden bg-white">
        <NoteRichEditorStyles />
        <NoteMobileHeader
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
          handleCreateDocument={handleCreateDocument}
          loadingState={loadingState}
        />
        {error && (
          <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-medium text-rose-700">
            {error}
            <button type="button" className="ml-2 underline" onClick={() => setError(null)}>닫기</button>
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={noteBlockCollisionDetection}
          autoScroll
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <BlockDragActiveContext.Provider value={!!activeBlockId}>
            <BlockDropTargetContext.Provider value={dropTarget}>
              <div className="flex min-h-0 min-w-0 flex-1 overflow-x-hidden">
                <NoteSidebarPanel
                  mobileTab={mobileTab}
                  activeDragDocId={activeDragDocId}
                  handleNavigateToWorkspace={handleNavigateToWorkspace}
                  handleCreateDocument={handleCreateDocument}
                  loadingState={loadingState}
                  handleGoToDashboard={handleGoToDashboard}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  docTab={docTab}
                  setDocTab={setDocTab}
                  setSelectedId={setSelectedId}
                  setBlocks={setBlocks}
                  setMobileTab={setMobileTab}
                  loadTrashedBlocks={loadTrashedBlocks}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  sortKey={sortKey}
                  setSortKey={setSortKey}
                  showSortMenu={showSortMenu}
                  setShowSortMenu={setShowSortMenu}
                  sortMenuRef={sortMenuRef}
                  loadingDocuments={loadingDocuments}
                  filteredDocuments={filteredDocuments}
                  pinnedDocuments={pinnedDocuments}
                  favoriteDocuments={favoriteDocuments}
                  otherDocuments={otherDocuments}
                  rootDocuments={rootDocuments}
                  renderDocumentTree={renderDocumentTree}
                  selectedId={selectedId}
                  loadingTrashedBlocks={loadingTrashedBlocks}
                  trashedBlocks={trashedBlocks}
                  restoringBlockId={restoringBlockId}
                  purgingBlockId={purgingBlockId}
                  handleRestoreDocument={handleRestoreDocument}
                  handlePurgeDocument={handlePurgeDocument}
                  handleRestoreBlockFromTrash={handleRestoreBlockFromTrash}
                  handlePurgeBlockFromTrash={handlePurgeBlockFromTrash}
                />
                {viewMode === 'board' && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f7f5]">
                    <div className="shrink-0 border-b border-neutral-200 bg-white px-6 py-3">
                      <h2 className="text-[20px] font-bold text-neutral-900">보드</h2>
                      <p className="mt-0.5 text-[13px] text-neutral-400">카드를 드래그해 순서·그룹을 바꿀 수 있습니다</p>
                    </div>
                    <BoardView
                      documents={boardViewDocuments}
                      onSelectDocument={handleSelectBoardDocument}
                      onCreateDocument={handleCreateDocumentInGroup}
                      onUpdateProperties={handleUpdateDocProperties}
                      onRenameGroup={handleRenameBoardGroupSafe}
                      onDeleteGroup={handleDeleteBoardGroupSafe}
                      onReorderInGroup={handleReorderBoardGroupSafe}
                    />
                  </div>
                )}
                <NoteEditorPanel
                  viewMode={viewMode}
                  mobileTab={mobileTab}
                  activeDocument={activeDocument}
                  selectedId={selectedId}
                  loadingDocuments={loadingDocuments}
                  rootDocuments={rootDocuments}
                  setMobileTab={setMobileTab}
                  handleNavigateToWorkspace={handleNavigateToWorkspace}
                  documentBreadcrumb={documentBreadcrumb}
                  handleSelectDocument={handleSelectDocument}
                  handleCreateDocument={handleCreateDocument}
                  loadingState={loadingState}
                  lastSavedAt={lastSavedAt}
                  pageMenuRef={pageMenuRef}
                  showPageMenu={showPageMenu}
                  setShowPageMenu={setShowPageMenu}
                  handleCreateSubPage={handleCreateSubPage}
                  handleSetDocumentCover={handleSetDocumentCover}
                  handleTogglePublic={handleTogglePublic}
                  togglingPublic={togglingPublic}
                  shareLinkCopied={shareLinkCopied}
                  handleCopyPublicLink={handleCopyPublicLink}
                  editorScrollRef={editorScrollRef}
                  handleDocumentBodyMouseDown={handleDocumentBodyMouseDown}
                  parentDocument={parentDocument}
                  collaborators={collaborators}
                  backlinks={backlinks}
                  backlinksExpanded={backlinksExpanded}
                  setBacklinksExpanded={setBacklinksExpanded}
                  showDocIconPicker={showDocIconPicker}
                  setShowDocIconPicker={setShowDocIconPicker}
                  docIconDraft={docIconDraft}
                  setDocIconDraft={setDocIconDraft}
                  docIconInputRef={docIconInputRef}
                  handleSetDocumentIcon={handleSetDocumentIcon}
                  titleInputRef={titleInputRef}
                  handleRenameDocument={handleRenameDocument}
                  setSelectedBlockIds={setSelectedBlockIds}
                  loadingBlocks={loadingBlocks}
                  blocks={blocks}
                  selectedBlockIds={selectedBlockIds}
                  handleBlockSelect={handleBlockSelect}
                  suppressGripMenuRef={suppressGripMenuRef}
                  marqueeOverlayRef={marqueeOverlayRef}
                  handleBlockListPointerDown={handleBlockListPointerDown}
                  allSortableBlockIds={allSortableBlockIds}
                  rootBlocks={rootBlocks}
                  activeBlockId={activeBlockId}
                  blockMarqueeActive={blockMarqueeActive}
                  renderSortableBlock={renderSortableBlock}
                  focusBlockEditor={focusBlockEditor}
                  activeDragDocId={activeDragDocId}
                />
              </div>
              <NoteDragOverlayLayer
                activeBlock={activeBlock}
                multiDragCount={multiDragCount}
                activeDragDocument={activeDragDocument}
              />
            </BlockDropTargetContext.Provider>
          </BlockDragActiveContext.Provider>
        </DndContext>
        <NoteFormatToolbarHost apiRef={formatToolbarApiRef} />
        <NoteSingletonEditorHost />
        {sidebarIconPicker ? (
          <NoteSidebarIconPicker
            sidebarIconPicker={sidebarIconPicker}
            setSidebarIconPicker={setSidebarIconPicker}
            sidebarIconDraft={sidebarIconDraft}
            setSidebarIconDraft={setSidebarIconDraft}
            sidebarIconInputRef={sidebarIconInputRef}
            handleSetDocumentIcon={handleSetDocumentIcon}
          />
        ) : null}
      </div>
    </NoteImageLightboxProvider>
  );
}
