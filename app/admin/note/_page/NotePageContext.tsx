'use client';

import type { ReactNode, RefObject } from 'react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import type { DragEndEvent, DragOverEvent, DragStartEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import type { NoteFormatToolbarApi } from '../_components/NoteFormatToolbarHost';
import type { BlockDropTarget } from '../_components/noteContexts';
import type {
  LoadingState,
  NoteBlock,
  NoteCollaborator,
  NoteDocument,
  SortKey,
} from '../_lib/types';
import type { PastedBlockSpec } from '../_lib/notePasteBlocks';

export type DocTab = 'active' | 'trash' | 'block-trash';
export type MobileTab = 'list' | 'editor';
export type ViewMode = 'list' | 'board';

export interface NotePageContextValue {
  // ── routing / shell ──
  router: ReturnType<typeof import('next/navigation').useRouter>;
  closeAll: () => void;
  setDesktopOpen: (open: boolean) => void;
  setMobileOpen: (open: boolean) => void;

  // ── global UI ──
  error: string | null;
  setError: (error: string | null) => void;
  loadingState: LoadingState;
  setLoadingState: (state: LoadingState) => void;
  lastSavedAt: Date | null;
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  docTab: DocTab;
  setDocTab: (tab: DocTab) => void;

  // ── documents ──
  documents: NoteDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<NoteDocument[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  loadingDocuments: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  showSortMenu: boolean;
  setShowSortMenu: React.Dispatch<React.SetStateAction<boolean>>;
  sortMenuRef: RefObject<HTMLDivElement | null>;
  expandedSidebarDocs: Set<string>;
  toggleSidebarDocExpanded: (docId: string) => void;
  collaborators: NoteCollaborator[];
  backlinks: NoteDocument[];
  backlinksExpanded: boolean;
  setBacklinksExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  backlinksLoading: boolean;
  activeDocument: NoteDocument | null;
  allDocumentsMap: Map<string, NoteDocument>;
  documentBreadcrumb: NoteDocument[];
  parentDocument: NoteDocument | null;
  resolvePageIcon: (documentId: string) => string | undefined;
  filteredDocuments: NoteDocument[];
  boardDocuments: NoteDocument[];
  pinnedDocuments: NoteDocument[];
  favoriteDocuments: NoteDocument[];
  otherDocuments: NoteDocument[];
  childrenByParent: Map<string, NoteDocument[]>;
  rootDocuments: NoteDocument[];

  // ── blocks ──
  blocks: NoteBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  blocksRef: RefObject<NoteBlock[]>;
  loadingBlocks: boolean;
  blocksSyncing: boolean;
  trashedBlocks: NoteBlock[];
  loadingTrashedBlocks: boolean;
  loadTrashedBlocks: () => Promise<void>;
  childrenByParentBlock: Map<string, NoteBlock[]>;
  rootBlocks: NoteBlock[];
  allSortableBlockIds: string[];
  restoringBlockId: string | null;
  purgingBlockId: string | null;

  // ── editor focus ──
  focusedEditorBlockId: string | null;
  focusedEditorPart: 'title' | 'editor' | null;
  focusSignal: number;
  focusTitleSignal: number;
  focusedToggleId: string | null;
  setFocusedToggleId: (id: string | null) => void;
  mergeFocusCaretOffset: number | undefined;
  requestCaretOffset: (offset: number) => void;
  titleInputRef: RefObject<HTMLTextAreaElement | null>;
  editorScrollRef: RefObject<HTMLDivElement | null>;
  pendingFocusDocTitleRef: RefObject<string | null>;
  commitBlockToState: (blockId: string) => void;
  trackActiveBlock: (blockId: string | null, part?: 'title' | 'editor') => void;
  focusBlockEditor: (
    blockId: string | null,
    part?: 'title' | 'editor',
    caretOffset?: number,
    options?: { preventScroll?: boolean },
  ) => void;

  // ── selection / marquee ──
  selectedBlockIds: Set<string>;
  setSelectedBlockIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  blockMarqueeActive: boolean;
  suppressGripMenuRef: RefObject<boolean>;
  marqueeOverlayRef: RefObject<HTMLDivElement | null>;
  handleBlockSelect: (id: string, e: React.MouseEvent) => void;
  handleBlockListPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;

  // ── drag & drop ──
  sensors: SensorDescriptor<SensorOptions>[];
  activeBlockId: string | null;
  activeDragDocId: string | null;
  activeBlock: NoteBlock | null;
  activeDragDocument: NoteDocument | null;
  dropTarget: BlockDropTarget;
  multiDragCount: number;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;

  // ── document actions ──
  triggerSave: () => void;
  handleGoToDashboard: () => void;
  handleSelectDocument: (doc: NoteDocument) => void;
  handleNavigateToWorkspace: () => void;
  handleUpdateDocProperties: (docId: string, properties: NoteDocument['properties']) => Promise<void>;
  handleSetDocumentCover: (docId: string, cover: string) => Promise<void>;
  handleSetDocumentIcon: (docId: string, icon: string) => Promise<void>;
  openSidebarIconPicker: (doc: NoteDocument, e: React.MouseEvent<HTMLButtonElement>) => void;
  handleCreateDocumentInGroup: (group: string) => Promise<void>;
  handleMoveDocumentToGroup: (docId: string, group: string) => Promise<void>;
  handleRenameBoardGroup: (oldName: string, newName: string) => Promise<void>;
  handleDeleteBoardGroup: (group: string) => Promise<void>;
  handleReorderBoardGroup: (group: string, orderedIds: string[]) => Promise<void>;
  handleOpenDocumentById: (documentId: string) => void;
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
  handleCreateDocument: (parentId?: string | null, options?: { navigateToChild?: boolean }) => Promise<void>;
  handleTogglePublic: (doc: NoteDocument) => Promise<void>;
  handleCopyPublicLink: (doc: NoteDocument) => Promise<void>;
  handleRenameDocument: (docId: string, title: string, options?: { immediate?: boolean }) => void;
  handleTogglePin: (e: React.MouseEvent, doc: NoteDocument) => Promise<void>;
  handleToggleFavorite: (e: React.MouseEvent, doc: NoteDocument) => Promise<void>;
  handleDeleteDocument: (e: React.MouseEvent, doc: NoteDocument) => Promise<void>;
  handleRestoreDocument: (doc: NoteDocument) => Promise<void>;
  handlePurgeDocument: (doc: NoteDocument) => Promise<void>;
  reloadDocuments: () => Promise<void>;

  // ── doc chrome UI ──
  showDocIconPicker: boolean;
  setShowDocIconPicker: (show: boolean) => void;
  docIconDraft: string;
  setDocIconDraft: (draft: string) => void;
  docIconInputRef: RefObject<HTMLInputElement | null>;
  sidebarIconPicker: { docId: string; top: number; left: number } | null;
  setSidebarIconPicker: (picker: { docId: string; top: number; left: number } | null) => void;
  sidebarIconDraft: string;
  setSidebarIconDraft: (draft: string) => void;
  sidebarIconInputRef: RefObject<HTMLInputElement | null>;
  showPageMenu: boolean;
  setShowPageMenu: React.Dispatch<React.SetStateAction<boolean>>;
  pageMenuRef: RefObject<HTMLDivElement | null>;
  togglingPublic: boolean;
  shareLinkCopied: boolean;

  // ── block actions ──
  formatToolbarApiRef: RefObject<NoteFormatToolbarApi>;
  showFormatToolbar: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
    editLink?: () => void,
  ) => void;
  hideFormatToolbar: () => void;
  handleMultilinePaste: (block: NoteBlock, specs: PastedBlockSpec[]) => Promise<void>;
  handleCopyBlockLink: (block: NoteBlock) => void;
  uploadNoteImage: (file: File) => Promise<string>;
  handleUpdateBlock: (block: NoteBlock, content: unknown) => void;
  syncBlockContent: (blockId: string, content: unknown) => void;
  handleIndentBlock: (block: NoteBlock, direction: 'in' | 'out') => void;
  handleNavigateBlock: (block: NoteBlock, direction: 'previous' | 'next') => void;
  handleInsertBlockAfter: (afterBlock: NoteBlock, type?: NoteBlock['type'], content?: Record<string, unknown>) => Promise<void>;
  handleSplitListBlockAfterWithChildren: (
    afterBlock: NoteBlock,
    type?: NoteBlock['type'],
    content?: Record<string, unknown>,
  ) => Promise<void>;
  handleInsertBlockInParent: (
    parentBlockId: string,
    type?: NoteBlock['type'],
    content?: Record<string, unknown>,
  ) => Promise<void>;
  handleAddBlock: (type: NoteBlock['type']) => Promise<void>;
  handleClickEditorWhitespace: () => void;
  handleDocumentBodyMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleChangeBlockType: (block: NoteBlock, type: NoteBlock['type']) => Promise<void>;
  handleDeleteBlock: (block: NoteBlock, focusPrevious?: boolean, skipDeleteUndo?: boolean) => Promise<void>;
  handleDeleteBlocks: (
    blocksToDelete: NoteBlock[],
    options?: { skipDeleteUndo?: boolean; focusPrevious?: boolean },
  ) => Promise<void>;
  handleMergeWithPreviousBlock: (block: NoteBlock) => Promise<void>;
  handleDuplicateBlock: (block: NoteBlock) => Promise<void>;
  handleRestoreBlockFromTrash: (block: NoteBlock) => Promise<void>;
  handlePurgeBlockFromTrash: (block: NoteBlock) => Promise<void>;
  recordBlockUndo: (blockIds: string[]) => void;

  // ── block render helpers ──
  renderDocumentTree: (doc: NoteDocument, depth?: number) => ReactNode;
  renderSortableBlock: (block: NoteBlock) => ReactNode;
}

import { createContext, useContext } from 'react';

const NotePageContext = createContext<NotePageContextValue | null>(null);

export function useNotePage(): NotePageContextValue {
  const ctx = useContext(NotePageContext);
  if (!ctx) throw new Error('useNotePage must be used within NotePageProvider');
  return ctx;
}

export { NotePageContext };
