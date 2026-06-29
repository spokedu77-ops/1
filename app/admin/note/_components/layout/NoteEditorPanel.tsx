'use client';

import { memo } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  Users,
} from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { NOTE_MARQUEE_ZONE, NOTE_PAGE_SHELL } from '../../_lib/constants';
import {
  DocIconGlyph,
  relativeTime,
  resolveDocCover,
  resolveDocIcon,
} from '../../_lib/noteDocumentUi';
import {
  OnBlockSelectContext,
  SelectedBlockIdsContext,
  SuppressGripMenuRefContext,
} from '../noteContexts';
import { EditorDocDropZone } from '../sidebar/NoteDocChrome';
import { NoteVirtualRootBlocks } from '../NoteVirtualRootBlocks';
import { prefetchNoteDocumentBlocks } from '../../_lib/noteDocumentBlocksPrefetch';
import { useNoteTextDragActive } from '../../_hooks/useNoteTextDragActive';
import type { NotePageContextValue } from '../../_page/NotePageContext';
import { NoteWorkspaceHome } from './NoteWorkspaceHome';
import { NotePageFindBar } from './NotePageFindBar';

type NoteEditorPanelProps = Pick<
  NotePageContextValue,
  | 'viewMode'
  | 'mobileTab'
  | 'activeDocument'
  | 'selectedId'
  | 'loadingDocuments'
  | 'rootDocuments'
  | 'setMobileTab'
  | 'handleNavigateToWorkspace'
  | 'documentBreadcrumb'
  | 'handleSelectDocument'
  | 'handleCreateDocument'
  | 'loadingState'
  | 'lastSavedAt'
  | 'pageMenuRef'
  | 'showPageMenu'
  | 'setShowPageMenu'
  | 'handleCreateSubPage'
  | 'handleSetDocumentCover'
  | 'handleTogglePublic'
  | 'togglingPublic'
  | 'shareLinkCopied'
  | 'handleCopyPublicLink'
  | 'editorScrollRef'
  | 'handleDocumentBodyMouseDown'
  | 'parentDocument'
  | 'collaborators'
  | 'backlinks'
  | 'backlinksExpanded'
  | 'setBacklinksExpanded'
  | 'showDocIconPicker'
  | 'setShowDocIconPicker'
  | 'docIconDraft'
  | 'setDocIconDraft'
  | 'docIconInputRef'
  | 'handleSetDocumentIcon'
  | 'titleInputRef'
  | 'handleRenameDocument'
  | 'setSelectedBlockIds'
  | 'loadingBlocks'
  | 'blocks'
  | 'selectedBlockIds'
  | 'handleBlockSelect'
  | 'suppressGripMenuRef'
  | 'marqueeOverlayRef'
  | 'handleBlockListPointerDown'
  | 'allSortableBlockIds'
  | 'rootBlocks'
  | 'activeBlockId'
  | 'blockMarqueeActive'
  | 'renderSortableBlock'
  | 'focusBlockEditor'
  | 'activeDragDocId'
>;

type NoteBlockCanvasProps = Pick<
  NotePageContextValue,
  | 'loadingBlocks'
  | 'rootBlocks'
  | 'selectedBlockIds'
  | 'handleBlockSelect'
  | 'suppressGripMenuRef'
  | 'marqueeOverlayRef'
  | 'handleBlockListPointerDown'
  | 'allSortableBlockIds'
  | 'activeBlockId'
  | 'blockMarqueeActive'
  | 'renderSortableBlock'
  | 'editorScrollRef'
>;

const NoteBlockCanvas = memo(function NoteBlockCanvas({
  loadingBlocks,
  rootBlocks,
  selectedBlockIds,
  handleBlockSelect,
  suppressGripMenuRef,
  marqueeOverlayRef,
  handleBlockListPointerDown,
  allSortableBlockIds,
  activeBlockId,
  blockMarqueeActive,
  renderSortableBlock,
  editorScrollRef,
}: NoteBlockCanvasProps) {
  const textDragActive = useNoteTextDragActive();

  if (loadingBlocks && rootBlocks.length === 0) {
    return (
      <div className="flex items-center gap-2 py-8 text-[13px] text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        블록 불러오는 중…
      </div>
    );
  }

  return (
    <SelectedBlockIdsContext.Provider value={selectedBlockIds}>
      <OnBlockSelectContext.Provider value={handleBlockSelect}>
        <SuppressGripMenuRefContext.Provider value={suppressGripMenuRef}>
          <div
            data-note-marquee-zone
            className={NOTE_MARQUEE_ZONE}
            onPointerDown={handleBlockListPointerDown}
          >
            <div
              ref={marqueeOverlayRef}
              className="pointer-events-none fixed z-[60] hidden border border-blue-400 bg-blue-500/20"
              aria-hidden
            />
            <div className={`${NOTE_PAGE_SHELL} overflow-visible pb-32`}>
              <SortableContext items={allSortableBlockIds} strategy={verticalListSortingStrategy}>
                <div data-note-block-list className="relative overflow-visible">
                  <NoteVirtualRootBlocks
                    rootBlocks={rootBlocks}
                    scrollRootRef={editorScrollRef}
                    forceRenderAll={
                      Boolean(activeBlockId)
                      || selectedBlockIds.size > 0
                      || blockMarqueeActive
                      || textDragActive
                    }
                    renderBlock={renderSortableBlock}
                  />
                </div>
              </SortableContext>
            </div>
          </div>
        </SuppressGripMenuRefContext.Provider>
      </OnBlockSelectContext.Provider>
    </SelectedBlockIdsContext.Provider>
  );
});

export const NoteEditorPanel = memo(function NoteEditorPanel({
  viewMode,
  mobileTab,
  activeDocument,
  selectedId,
  loadingDocuments,
  rootDocuments,
  setMobileTab,
  handleNavigateToWorkspace,
  documentBreadcrumb,
  handleSelectDocument,
  handleCreateDocument,
  loadingState,
  lastSavedAt,
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
  handleSetDocumentIcon,
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
  activeBlockId,
  blockMarqueeActive,
  renderSortableBlock,
  focusBlockEditor,
  activeDragDocId,
}: NoteEditorPanelProps) {
  return (
    <div className={`min-w-0 flex-1 flex-col overflow-hidden bg-white ${
      viewMode === 'board' ? 'hidden' : mobileTab === 'editor' ? 'flex' : 'hidden'
    } md:flex`}
    >
      {selectedId && (
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 bg-white px-3 py-2.5 md:hidden">
          <button
            type="button"
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
            onClick={() => setMobileTab('list')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <nav className="flex items-center gap-1 whitespace-nowrap text-[13px]">
              <button type="button" onClick={handleNavigateToWorkspace} className="text-neutral-400 hover:text-neutral-700">
                노트
              </button>
              {documentBreadcrumb.map((crumb, idx) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-neutral-300" />
                  {idx < documentBreadcrumb.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => handleSelectDocument(crumb)}
                      onMouseEnter={() => prefetchNoteDocumentBlocks(crumb.id)}
                      className="text-neutral-500 hover:text-neutral-800"
                    >
                      {crumb.title}
                    </button>
                  ) : (
                    <span className="font-medium text-neutral-800">{crumb.title}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          {loadingState === 'saving' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />}
          {loadingState === 'saved' && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
        </div>
      )}

      {!selectedId ? (
        <NoteWorkspaceHome
          loadingDocuments={loadingDocuments}
          rootDocuments={rootDocuments}
          handleSelectDocument={handleSelectDocument}
          handleCreateDocument={handleCreateDocument}
        />
      ) : (
        <div ref={editorScrollRef} className="min-w-0 flex-1 overflow-y-auto bg-white">
          <NotePageFindBar
            blocks={blocks}
            focusBlockEditor={focusBlockEditor}
            activeDocument={activeDocument}
          />
          {!activeDocument && loadingDocuments ? (
            <div className={`${NOTE_PAGE_SHELL} flex items-center gap-2 py-10 text-[13px] text-neutral-400`}>
              <Loader2 className="h-4 w-4 animate-spin" />
              문서 불러오는 중…
            </div>
          ) : activeDocument ? (
          <>
          {resolveDocCover(activeDocument.properties) && (
            <div className="group/cover relative h-[30vh] max-h-[280px] min-h-[120px] w-full overflow-hidden bg-neutral-100">
              <img
                src={resolveDocCover(activeDocument.properties)!}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover/cover:opacity-100">
                <button
                  type="button"
                  className="rounded-md bg-white/90 px-2.5 py-1 text-[12px] text-neutral-700 shadow-sm hover:bg-white"
                  onClick={() => {
                    const url = window.prompt('커버 이미지 URL', resolveDocCover(activeDocument.properties) ?? '');
                    if (url !== null) void handleSetDocumentCover(activeDocument.id, url);
                  }}
                >
                  변경
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white/90 px-2.5 py-1 text-[12px] text-neutral-700 shadow-sm hover:bg-white"
                  onClick={() => void handleSetDocumentCover(activeDocument.id, '')}
                >
                  제거
                </button>
              </div>
            </div>
          )}
          <div className="sticky top-0 z-30 flex justify-end px-4 py-2 md:px-8">
            <div className="flex items-center gap-1">
              {loadingState === 'saving' && (
                <span className="flex items-center gap-1 px-2 text-[12px] text-neutral-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </span>
              )}
              {loadingState === 'saved' && lastSavedAt && (
                <span className="hidden items-center gap-1 px-2 text-[12px] text-neutral-400 sm:flex">
                  <Check className="h-3 w-3 text-emerald-500" />
                  {relativeTime(lastSavedAt.toISOString())}
                </span>
              )}
              <div ref={pageMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowPageMenu((v) => !v)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="페이지 메뉴"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {showPageMenu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                      onClick={() => {
                        setShowPageMenu(false);
                        void handleCreateSubPage(activeDocument.id, { navigateToChild: false });
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      하위 페이지
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                      onClick={() => {
                        setShowPageMenu(false);
                        const url = window.prompt('커버 이미지 URL', resolveDocCover(activeDocument.properties) ?? '');
                        if (url !== null) void handleSetDocumentCover(activeDocument.id, url);
                      }}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {resolveDocCover(activeDocument.properties) ? '커버 변경' : '커버 추가'}
                    </button>
                    {resolveDocCover(activeDocument.properties) && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                        onClick={() => {
                          setShowPageMenu(false);
                          void handleSetDocumentCover(activeDocument.id, '');
                        }}
                      >
                        <Minus className="h-3.5 w-3.5" />
                        커버 제거
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={togglingPublic}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                      onClick={() => {
                        setShowPageMenu(false);
                        void handleTogglePublic(activeDocument);
                      }}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {activeDocument.is_public ? '공개 해제' : '웹에 공유'}
                    </button>
                    {activeDocument.is_public && activeDocument.share_token && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                        onClick={() => {
                          setShowPageMenu(false);
                          void handleCopyPublicLink(activeDocument);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {shareLinkCopied ? '복사됨' : '링크 복사'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div
            className={`${NOTE_PAGE_SHELL} cursor-text ${resolveDocCover(activeDocument.properties) ? 'pt-6' : 'pt-10'}`}
            onMouseDown={handleDocumentBodyMouseDown}
          >
            <nav className="mb-4 hidden min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap text-[13px] text-neutral-400 md:flex">
              <button
                type="button"
                onClick={handleNavigateToWorkspace}
                className="shrink-0 rounded px-1 py-0.5 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              >
                관리자 노트
              </button>
              {documentBreadcrumb.map((crumb, idx) => (
                <span key={crumb.id} className="flex shrink-0 items-center gap-1">
                  <span className="text-neutral-300">/</span>
                  {idx < documentBreadcrumb.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => handleSelectDocument(crumb)}
                      onMouseEnter={() => prefetchNoteDocumentBlocks(crumb.id)}
                      className="max-w-[160px] truncate rounded px-1 py-0.5 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      title={crumb.title}
                    >
                      {crumb.title}
                    </button>
                  ) : (
                    <span className="max-w-[200px] truncate text-neutral-500" title={crumb.title}>
                      {crumb.title}
                    </span>
                  )}
                </span>
              ))}
            </nav>
            <EditorDocDropZone
              documentId={activeDocument.id}
              documentTitle={activeDocument.title}
              isDraggingDoc={!!activeDragDocId}
            />
            <div className="mb-2">
              {showDocIconPicker ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={docIconInputRef}
                    type="text"
                    value={docIconDraft}
                    onChange={(e) => setDocIconDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSetDocumentIcon(activeDocument.id, docIconDraft);
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowDocIconPicker(false);
                      }
                    }}
                    onBlur={() => { void handleSetDocumentIcon(activeDocument.id, docIconDraft); }}
                    placeholder="이모지 입력"
                    className="w-16 rounded-md border border-neutral-200 bg-white px-2 py-1 text-center text-[24px] outline-none focus:border-neutral-400"
                    maxLength={4}
                  />
                  <button
                    type="button"
                    className="text-[12px] text-neutral-400 hover:text-neutral-600"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { void handleSetDocumentIcon(activeDocument.id, ''); }}
                  >
                    제거
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="group/icon flex h-12 w-12 items-center justify-center rounded-md transition-colors hover:bg-neutral-100"
                  title="아이콘 변경"
                  onClick={() => {
                    setDocIconDraft(resolveDocIcon(activeDocument.properties) ?? '');
                    setShowDocIconPicker(true);
                  }}
                >
                  <DocIconGlyph
                    icon={resolveDocIcon(activeDocument.properties)}
                    fallbackClassName="h-9 w-9 text-neutral-300 transition-colors group-hover/icon:text-neutral-400"
                    emojiClassName="text-[42px] leading-none"
                  />
                </button>
              )}
            </div>
            <textarea
              ref={titleInputRef}
              key={activeDocument.id}
              data-note-doc-title
              rows={1}
              className="mb-1 w-full resize-none overflow-hidden bg-transparent text-[40px] font-bold leading-[1.2] tracking-tight text-neutral-900 outline-none placeholder:text-neutral-300"
              placeholder="제목 없음"
              defaultValue={
                activeDocument.title === '제목 없음' || activeDocument.title === 'Untitled'
                  ? ''
                  : activeDocument.title
              }
              onMouseDown={() => setSelectedBlockIds(new Set())}
              onChange={(e) => handleRenameDocument(activeDocument.id, e.target.value)}
              onBlur={(e) => handleRenameDocument(activeDocument.id, e.target.value, { immediate: true })}
            />
            {parentDocument && (
              <button
                type="button"
                onClick={() => handleSelectDocument(parentDocument)}
                onMouseEnter={() => prefetchNoteDocumentBlocks(parentDocument.id)}
                className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[14px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
              >
                <DocIconGlyph
                  icon={resolveDocIcon(parentDocument.properties)}
                  emojiClassName="shrink-0 text-[15px] leading-none"
                />
                <span className="truncate underline-offset-2 hover:underline">{parentDocument.title}</span>
              </button>
            )}
            {activeDocument.is_public && activeDocument.share_token && (
              <a
                href={`/note/p/${activeDocument.share_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-neutral-400 transition-colors hover:text-neutral-600"
              >
                <Link2 className="h-3.5 w-3.5" />
                공개 페이지 보기
              </a>
            )}
            {collaborators.length > 0 && (
              <p className="mb-6 text-[12px] text-neutral-400">
                <Users className="mr-1 inline h-3 w-3" />
                {collaborators.length}
                명이 최근 열람 ·
                {relativeTime(activeDocument.updated_at)}
              </p>
            )}
            {backlinks.length > 0 && (
              <div className="mb-4 border-b border-neutral-100">
                <button
                  type="button"
                  onClick={() => setBacklinksExpanded((v) => !v)}
                  className="flex w-full items-center gap-2 py-2 text-[13px] text-neutral-500 transition-colors hover:text-neutral-700"
                >
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${backlinksExpanded ? '' : '-rotate-90'}`} />
                  백링크
                  {' '}
                  {backlinks.length}
                </button>
                {backlinksExpanded && (
                  <div className="space-y-0.5 pb-3">
                    {backlinks.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-neutral-50"
                        onClick={() => handleSelectDocument(doc)}
                        onMouseEnter={() => prefetchNoteDocumentBlocks(doc.id)}
                      >
                        <DocIconGlyph
                          icon={resolveDocIcon(doc.properties)}
                          fallbackClassName="h-3.5 w-3.5 shrink-0 text-neutral-400"
                          emojiClassName="shrink-0 text-[14px] leading-none"
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-700">{doc.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          </>
          ) : (
            <div className={`${NOTE_PAGE_SHELL} py-10 text-[13px] text-neutral-500`}>
              문서를 찾을 수 없습니다. 사이드바에서 다시 선택해 주세요.
            </div>
          )}

          <NoteBlockCanvas
            loadingBlocks={loadingBlocks}
            rootBlocks={rootBlocks}
            selectedBlockIds={selectedBlockIds}
            handleBlockSelect={handleBlockSelect}
            suppressGripMenuRef={suppressGripMenuRef}
            marqueeOverlayRef={marqueeOverlayRef}
            handleBlockListPointerDown={handleBlockListPointerDown}
            allSortableBlockIds={allSortableBlockIds}
            activeBlockId={activeBlockId}
            blockMarqueeActive={blockMarqueeActive}
            renderSortableBlock={renderSortableBlock}
            editorScrollRef={editorScrollRef}
          />
        </div>
      )}
    </div>
  );
});
