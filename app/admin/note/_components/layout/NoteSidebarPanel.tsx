'use client';

import { memo } from 'react';
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import {
  Check,
  Clock,
  FileText,
  Home,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  SortAsc,
} from 'lucide-react';
import { BLOCK_TYPES } from '../../_lib/constants';
import type { LoadingState, NoteBlock, NoteDocument, SortKey } from '../../_lib/types';
import type { DocTab, MobileTab, ViewMode } from '../../_page/NotePageContext';
import { DocRootDropZone, WorkspaceTitleDropTarget } from '../sidebar/NoteDocChrome';

type NoteSidebarPanelProps = {
  mobileTab: MobileTab;
  activeDragDocId: string | null;
  handleNavigateToWorkspace: () => void;
  handleCreateDocument: (parentId?: string | null, options?: { navigateToChild?: boolean }) => Promise<void>;
  loadingState: LoadingState;
  handleGoToDashboard: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  docTab: DocTab;
  setDocTab: (tab: DocTab) => void;
  setSelectedId: (id: string | null) => void;
  setBlocks: Dispatch<SetStateAction<NoteBlock[]>>;
  setMobileTab: (tab: MobileTab) => void;
  loadTrashedBlocks: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  showSortMenu: boolean;
  setShowSortMenu: Dispatch<SetStateAction<boolean>>;
  sortMenuRef: RefObject<HTMLDivElement | null>;
  loadingDocuments: boolean;
  filteredDocuments: NoteDocument[];
  pinnedDocuments: NoteDocument[];
  favoriteDocuments: NoteDocument[];
  otherDocuments: NoteDocument[];
  rootDocuments: NoteDocument[];
  renderDocumentTree: (doc: NoteDocument, depth?: number) => ReactNode;
  selectedId: string | null;
  loadingTrashedBlocks: boolean;
  trashedBlocks: NoteBlock[];
  restoringBlockId: string | null;
  purgingBlockId: string | null;
  handleRestoreDocument: (doc: NoteDocument) => Promise<void>;
  handlePurgeDocument: (doc: NoteDocument) => Promise<void>;
  handleRestoreBlockFromTrash: (block: NoteBlock) => Promise<void>;
  handlePurgeBlockFromTrash: (block: NoteBlock) => Promise<void>;
};

export const NoteSidebarPanel = memo(function NoteSidebarPanel({
  mobileTab,
  activeDragDocId,
  handleNavigateToWorkspace,
  handleCreateDocument,
  loadingState,
  handleGoToDashboard,
  viewMode,
  setViewMode,
  docTab,
  setDocTab,
  setSelectedId,
  setBlocks,
  setMobileTab,
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
  selectedId,
  loadingTrashedBlocks,
  trashedBlocks,
  restoringBlockId,
  purgingBlockId,
  handleRestoreDocument,
  handlePurgeDocument,
  handleRestoreBlockFromTrash,
  handlePurgeBlockFromTrash,
}: NoteSidebarPanelProps) {

  return (
    <div className={`flex flex-col border-r border-neutral-200/80 bg-[#f7f7f5] ${
      mobileTab === 'list' ? 'flex w-full' : 'hidden'
    } md:flex md:w-[280px] md:shrink-0`}
    >
      <div className="shrink-0 px-2 pb-2 pt-3">
        <div className="flex items-center justify-between gap-1 px-1 py-0.5">
          <WorkspaceTitleDropTarget isDraggingDoc={!!activeDragDocId}>
            <button
              type="button"
              onClick={handleNavigateToWorkspace}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-200/50"
              title={activeDragDocId ? '여기에 놓으면 최상위 페이지로 이동' : undefined}
            >
              <span className="shrink-0 text-[18px] leading-none">📋</span>
              <span className="truncate text-[14px] font-medium text-neutral-800">관리자 노트</span>
            </button>
          </WorkspaceTitleDropTarget>
          <button
            type="button"
            onClick={() => handleCreateDocument(null)}
            disabled={loadingState === 'loading'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-200/50 hover:text-neutral-700 disabled:opacity-50"
            title="새 페이지"
          >
            {loadingState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={handleGoToDashboard}
          className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-700"
        >
          <Home className="h-3.5 w-3.5" />
          관리 홈
        </button>
        <div className="mt-2 flex items-center gap-1 rounded-md bg-neutral-200/50 p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-[13px] font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            목록
          </button>
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-[13px] font-medium transition-colors ${
              viewMode === 'board' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            보드
          </button>
        </div>
      </div>

      <div className="shrink-0 border-b border-neutral-200/60 px-3 pb-2">
        <div className="flex items-center gap-1">
          {([
            { key: 'active' as const, label: '전체' },
            { key: 'trash' as const, label: '휴지통' },
            { key: 'block-trash' as const, label: '블록' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
                docTab === key ? 'bg-neutral-200/80 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100'
              }`}
              onClick={() => {
                setDocTab(key);
                if (key !== 'block-trash') {
                  setSelectedId(null);
                  setBlocks([]);
                }
                setMobileTab('list');
                if (key === 'block-trash') void loadTrashedBlocks();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {docTab === 'trash' && (
          <p className="mt-2 px-1 text-[12px] text-neutral-400">7일 후 영구삭제 가능</p>
        )}
        {docTab === 'block-trash' && (
          <p className="mt-2 px-1 text-[12px] text-neutral-400">선택 문서의 블록 휴지통</p>
        )}
      </div>

      <div className="shrink-0 space-y-2 px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="h-9 w-full rounded-md border border-neutral-200/80 bg-white/80 pl-9 pr-3 text-[14px] outline-none placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white"
            placeholder="페이지 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200/50"
            onClick={() => setShowSortMenu((v) => !v)}
          >
            {sortKey === 'recent' ? <Clock className="h-3.5 w-3.5" /> : <SortAsc className="h-3.5 w-3.5" />}
            <span className="flex-1 text-left">{sortKey === 'recent' ? '최근 수정순' : '제목순'}</span>
          </button>
          {showSortMenu && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {([
                { key: 'recent', label: '최근 수정순', icon: Clock },
                { key: 'title', label: '제목순', icon: SortAsc },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-[13px] transition-colors hover:bg-slate-50 ${
                    sortKey === key ? 'font-semibold text-blue-600' : 'text-slate-700'
                  }`}
                  onClick={() => { setSortKey(key); setShowSortMenu(false); }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {sortKey === key && <Check className="ml-auto h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-6">
        <DocRootDropZone isDraggingDoc={!!activeDragDocId} placement="top" />
        {loadingDocuments ? (
          <div className="flex h-32 items-center justify-center gap-2 text-[13px] text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            불러오는 중…
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-[13px] text-slate-400">
            <FileText className="h-10 w-10 text-slate-200" />
            {searchQuery
              ? '검색 결과 없음'
              : (docTab === 'trash'
                ? '휴지통이 비어 있습니다'
                : docTab === 'block-trash'
                  ? '블록 휴지통이 비어 있습니다'
                  : '아직 노트가 없습니다')}
            {!searchQuery && docTab === 'active' && <span className="text-[12px]">&quot;새 노트&quot;로 시작하세요.</span>}
          </div>
        ) : (
          <>
            {pinnedDocuments.length > 0 && (
              <div className="mb-2 mt-1">
                <p className="mb-0.5 px-2 text-[11px] text-neutral-400">고정</p>
                {pinnedDocuments.map((doc) => renderDocumentTree(doc))}
              </div>
            )}
            {favoriteDocuments.length > 0 && (
              <div className="mb-2 mt-3">
                <p className="mb-0.5 px-2 text-[11px] text-neutral-400">즐겨찾기</p>
                {favoriteDocuments.map((doc) => renderDocumentTree(doc))}
              </div>
            )}
            {otherDocuments.length > 0 && (
              <div className="mt-1">
                {(pinnedDocuments.length > 0 || favoriteDocuments.length > 0) && (
                  <p className="mb-0.5 mt-2 px-2 text-[11px] text-neutral-400">개인</p>
                )}
                {docTab === 'trash' ? (
                  <div className="space-y-1">
                    {otherDocuments.map((doc) => {
                      const deletedAt = doc.deleted_at ? new Date(doc.deleted_at).getTime() : null;
                      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                      const eligible = deletedAt ? (Date.now() - deletedAt >= sevenDaysMs) : false;
                      const daysAgo = deletedAt ? Math.floor((Date.now() - deletedAt) / (24 * 60 * 60 * 1000)) : null;
                      return (
                        <div key={doc.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-slate-800">{doc.title}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {daysAgo != null ? `삭제 ${daysAgo}일 전` : '삭제됨'}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => handleRestoreDocument(doc)}
                              >
                                복구
                              </button>
                              <button
                                type="button"
                                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                                  eligible
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                }`}
                                onClick={() => eligible && handlePurgeDocument(doc)}
                                title={eligible ? '영구삭제' : '삭제 후 7일이 지나야 영구삭제할 수 있습니다.'}
                              >
                                영구삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : docTab === 'block-trash' ? (
                  <div className="space-y-1">
                    {!selectedId ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-500">
                        먼저 문서를 선택한 뒤 블록 휴지통을 확인해 주세요.
                      </div>
                    ) : loadingTrashedBlocks ? (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        불러오는 중…
                      </div>
                    ) : trashedBlocks.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-500">
                        선택한 문서의 블록 휴지통이 비어 있습니다.
                      </div>
                    ) : (
                      trashedBlocks.map((block) => (
                        <div key={block.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-semibold text-slate-700">
                                {BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {block.type === 'divider'
                                  ? '구분선'
                                  : block.type === 'image'
                                    ? (block.content?.url || '이미지 블록')
                                    : block.type === 'video'
                                      ? (block.content?.url || '영상 블록')
                                      : (block.content?.text || block.content?.title || '(내용 없음)')}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                disabled={restoringBlockId === block.id}
                                onClick={() => handleRestoreBlockFromTrash(block)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                복구
                              </button>
                              <button
                                type="button"
                                disabled={purgingBlockId === block.id}
                                onClick={() => handlePurgeBlockFromTrash(block)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              >
                                영구삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <>
                    {rootDocuments.map((doc) => renderDocumentTree(doc))}
                    <DocRootDropZone isDraggingDoc={!!activeDragDocId} placement="bottom" />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
