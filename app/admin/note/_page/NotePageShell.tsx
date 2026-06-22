'use client';

import { useEffect } from 'react';
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
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    activeBlockId,
    dropTarget,
    viewMode,
    boardDocuments,
    documents,
    handleSelectDocument,
    setViewMode,
    handleCreateDocumentInGroup,
    handleUpdateDocProperties,
    handleRenameBoardGroup,
    handleDeleteBoardGroup,
    handleReorderBoardGroup,
    formatToolbarApiRef,
    sidebarIconPicker,
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

  return (
    <NoteImageLightboxProvider>
      <div className="flex h-[var(--viewport-height-px,100dvh)] max-w-full flex-col overflow-x-hidden bg-white">
        <NoteRichEditorStyles />
        <NoteMobileHeader />
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
                <NoteSidebarPanel />
                {viewMode === 'board' && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f7f5]">
                    <div className="shrink-0 border-b border-neutral-200 bg-white px-6 py-3">
                      <h2 className="text-[20px] font-bold text-neutral-900">보드</h2>
                      <p className="mt-0.5 text-[13px] text-neutral-400">카드를 드래그해 순서·그룹을 바꿀 수 있습니다</p>
                    </div>
                    <BoardView
                      documents={boardDocuments.map((d) => ({
                        id: d.id,
                        title: d.title,
                        properties: d.properties ?? null,
                        updated_at: d.updated_at,
                      }))}
                      onSelectDocument={(doc) => {
                        const found = documents.find((d) => d.id === doc.id);
                        if (found) { handleSelectDocument(found); setViewMode('list'); }
                      }}
                      onCreateDocument={handleCreateDocumentInGroup}
                      onUpdateProperties={handleUpdateDocProperties}
                      onRenameGroup={(oldName, newName) => { void handleRenameBoardGroup(oldName, newName); }}
                      onDeleteGroup={(group) => { void handleDeleteBoardGroup(group); }}
                      onReorderInGroup={(group, orderedIds) => { void handleReorderBoardGroup(group, orderedIds); }}
                    />
                  </div>
                )}
                <NoteEditorPanel />
              </div>
              <NoteDragOverlayLayer />
            </BlockDropTargetContext.Provider>
          </BlockDragActiveContext.Provider>
        </DndContext>
        <NoteFormatToolbarHost apiRef={formatToolbarApiRef} />
        <NoteSingletonEditorHost />
        {sidebarIconPicker ? <NoteSidebarIconPicker /> : null}
      </div>
    </NoteImageLightboxProvider>
  );
}
