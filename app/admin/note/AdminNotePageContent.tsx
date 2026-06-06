'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { devLogger } from '@/app/lib/logging/devLogger';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { BlockTextPreview } from './_components/blocks/BlockTextPreview';
import { LazyNoteEditor } from './_components/blocks/LazyNoteEditor';
import { NoteRichEditorStyles } from './_components/NoteRichEditorStyles';
import { useDeferredNoteMeta } from './_hooks/useDeferredNoteMeta';
import { BubbleToolbar } from './_components/BubbleToolbar';
import { SlashMenuFixed, BlockPickerMenu, BlockHandleMenu } from './_components/SlashMenu';
import type { MarkdownBlockTrigger } from './_components/noteBulletInput';
import {
  buildChildrenByParentBlock,
  collectDescendantBlockIds,
  filterSiblingBlocks,
  buildReparentContentPatch,
  getBlocksInParent,
  planBlockDrop,
  planBlockTabIndent,
  planMergeWithPreviousBlock,
  planPromoteChildrenOnDelete,
  sortRootBlocks,
  TOGGLE_INLINE_CHILD_TYPES,
  type BlockDropPlan,
} from '@/app/lib/note/noteBlockTree';
import {
  findOrphanSubPageDocuments,
  isDocumentDescendantOf,
  planOrphanSubPageBlockInserts,
} from '@/app/lib/note/orphanSubPageBlocks';
import { resolveToggleBodyForDisplay } from '@/app/lib/note/toggleBody';
import {
  buildVideoBlockContentFromUrl,
  resolveVideoEmbedContent,
  videoProviderLabel,
} from '@/app/lib/note/videoEmbed';
import { VideoEmbedFrame } from './_components/VideoEmbedFrame';
import dynamic from 'next/dynamic';
import { BOARD_DEFAULT_GROUP } from './_components/BoardView';

const noteBlockDragActive = { current: false };

const BoardView = dynamic(
  () => import('./_components/BoardView').then((mod) => mod.BoardView),
  { ssr: false, loading: () => <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">보드 불러오는 중…</div> },
);
import {
  Plus,
  FileText,
  Star,
  Pin,
  Loader2,
  Trash2,
  CheckSquare,
  Type,
  Image as ImageIcon,
  Video,
  Minus,
  ArrowLeft,
  Search,
  Users,
  Check,
  SortAsc,
  Clock,
  GripVertical,
  ChevronDown,
  MessageSquareQuote,
  Globe,
  Link2,
  Copy,
  ChevronRight,
  Home,
  LayoutGrid,
  List,
} from 'lucide-react';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ─── types ─────────────────────────────────────────────────────────────── */
type NoteDocument = {
  id: string;
  title: string;
  is_archived: boolean;
  is_favorite: boolean;
  is_pinned: boolean;
  is_public: boolean;
  share_token: string | null;
  parent_id: string | null;
  slug: string | null;
  properties?: {
    group?: string;
    tags?: string[];
    icon?: string;
    cover?: string;
    board_order?: number;
  } | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};
type NoteBlock = {
  id: string;
  document_id: string;
  parent_block_id?: string | null;
  type: 'heading' | 'text' | 'todo' | 'divider' | 'image' | 'video' | 'toggle' | 'callout' | 'page' | string;
  order_index: number;
  content: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
};
type LoadingState = 'idle' | 'loading' | 'saving' | 'saved';
type SortKey = 'recent' | 'title';
type NoteCollaborator = {
  id: string; document_id: string; user_id: string;
  last_active_at: string; last_cursor: any;
};

type FormatToolbarState = {
  applyMark: (mark: InlineMark) => void;
  applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void;
  position: { top: number; left: number };
};

const BLOCK_TYPES: { type: NoteBlock['type']; label: string; icon: React.ElementType; desc: string; shortcut?: string }[] = [
  { type: 'text',     label: '텍스트',      icon: FileText,           desc: '일반 문단' },
  { type: 'heading',  label: '제목 1',      icon: Type,               desc: '큰 섹션 제목',          shortcut: '#' },
  { type: 'todo',     label: '체크리스트',  icon: CheckSquare,        desc: '완료 상태를 체크하는 할 일', shortcut: '[]' },
  { type: 'toggle',   label: '토글 목록',   icon: ChevronDown,        desc: '접고 펼치는 섹션',      shortcut: '>' },
  { type: 'callout',  label: '콜아웃',      icon: MessageSquareQuote, desc: '강조 메시지',           shortcut: '!!' },
  { type: 'code',     label: '코드',        icon: Type,               desc: '고정폭 코드 블록',      shortcut: '```' },
  { type: 'divider',  label: '구분선',      icon: Minus,              desc: '가로 구분선',           shortcut: '---' },
  { type: 'image',    label: '이미지',      icon: ImageIcon,          desc: '이미지 업로드 또는 URL' },
  { type: 'video',    label: '영상',        icon: Video,              desc: 'YouTube · Vimeo 임베드' },
  { type: 'page',     label: '하위 문서',   icon: FileText,           desc: '클릭하면 열리는 페이지' },
];

function defaultBlockContent(type: NoteBlock['type'], options?: { insideToggle?: boolean }) {
  if (type === 'heading') return { text: '' };
  if (type === 'todo') {
    return {
      text: '',
      checked: false,
      ...(options?.insideToggle ? { createdInsideToggle: true } : {}),
    };
  }
  if (type === 'toggle') {
    return {
      title: '',
      body: '',
      collapsed: false,
      depth: 0,
      images: [],
      ...(options?.insideToggle ? { createdInsideToggle: true, placedInToggle: true } : {}),
    };
  }
  if (type === 'callout') return { text: '', icon: '💡', depth: 0 };
  if (type === 'divider') return {};
  if (type === 'page') {
    return {
      page_document_id: '',
      title: '문서',
      ...(options?.insideToggle ? { placedInToggle: true } : {}),
    };
  }
  if (type === 'code') return { text: '', language: 'plain', depth: 0 };
  if (type === 'image') return { url: '' };
  if (type === 'video') return { url: '' };
  if (type === 'text') {
    return {
      text: '',
      depth: 0,
      ...(options?.insideToggle ? { createdInsideToggle: true, placedInToggle: true } : {}),
    };
  }
  return { text: '', depth: 0 };
}

/* ─── helpers ───────────────────────────────────────────────────────────── */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function buildDocumentBreadcrumb(
  doc: NoteDocument | null | undefined,
  allDocs: Map<string, NoteDocument>,
): NoteDocument[] {
  if (!doc) return [];
  const chain: NoteDocument[] = [];
  let current: NoteDocument | undefined = doc;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    chain.unshift(current);
    if (!current.parent_id) break;
    current = allDocs.get(current.parent_id);
  }
  return chain;
}

function resolveDocIcon(properties?: NoteDocument['properties'] | null): string | null {
  const icon = properties?.icon?.trim();
  return icon || null;
}

function DocIconGlyph({
  icon,
  fallbackClassName = 'h-4 w-4 shrink-0 text-neutral-400',
  emojiClassName = 'shrink-0 text-[15px] leading-none',
}: {
  icon: string | null;
  fallbackClassName?: string;
  emojiClassName?: string;
}) {
  if (icon) return <span className={emojiClassName}>{icon}</span>;
  return <FileText className={fallbackClassName} />;
}

const TOGGLE_CHILD_INDENT_REM = 1.625;

/** 호버한 줄만 핸들 표시 (중첩 토글에서 부모 핸들 동시 노출 방지) */
const BLOCK_HANDLE_HOVER =
  'opacity-0 pointer-events-none transition-opacity group-hover/block:opacity-100 group-hover/block:pointer-events-auto group-has-[.group\\/block:hover]/block:opacity-0 group-has-[.group\\/block:hover]/block:pointer-events-none';

/** 토글 안 블록도 루트와 같은 왼쪽 거터에 핸들 정렬 */
function toggleInlineHandleLeft(): string {
  return '-4.25rem';
}

function toggleMenuAnchorOffset(nestDepth: number): number {
  return Math.max(0, nestDepth - 1) * 18;
}

/** 노션형 토글 — 검정 채움 삼각형 */
function ToggleDisclosureButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className="relative z-20 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-neutral-100"
      onClick={onClick}
      aria-label={collapsed ? '펼치기' : '접기'}
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden
        className={`h-[14px] w-[14px] text-neutral-900 transition-transform duration-150 ${
          collapsed ? '' : 'rotate-90'
        }`}
        fill="currentColor"
      >
        <path d="M3.5 2 L10 6 L3.5 10 Z" />
      </svg>
    </button>
  );
}

function applyBlockDropPreview(
  blocks: NoteBlock[],
  movingId: string,
  overId: string,
): NoteBlock[] | null {
  const plan = planBlockDrop(blocks, movingId, overId);
  if (!plan) return null;
  const moving = blocks.find((block) => block.id === movingId);
  if (!moving) return null;
  const contentPatch = buildReparentContentPatch(moving.content, moving.type, plan.placedInToggle);
  const targetMap = new Map(plan.targetSiblings.map((block) => [block.id, block]));
  const oldParentId = moving.parent_block_id ?? null;
  const parentChanged = oldParentId !== plan.targetParentId;
  const oldSiblings = parentChanged
    ? getBlocksInParent(blocks, oldParentId)
      .filter((block) => block.id !== movingId)
      .map((block, index) => ({ ...block, order_index: index }))
    : [];
  const oldMap = new Map(oldSiblings.map((block) => [block.id, block]));
  return blocks.map((block) => {
    if (block.id === movingId) {
      return {
        ...block,
        parent_block_id: plan.targetParentId,
        order_index: plan.targetSiblings.findIndex((item) => item.id === movingId),
        content: contentPatch ?? block.content,
      };
    }
    if (targetMap.has(block.id)) return targetMap.get(block.id)!;
    if (oldMap.has(block.id)) return oldMap.get(block.id)!;
    return block;
  });
}

/* ─── DocRootDropZone (사이드바 최상위 드롭) ─────────────────────────────── */
function DocRootDropZone({
  isDraggingDoc,
  placement = 'top',
}: {
  isDraggingDoc: boolean;
  placement?: 'top' | 'bottom';
}) {
  const dropId = placement === 'top' ? 'doc-root' : 'doc-root-bottom';
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { type: 'document-root' },
  });
  if (!isDraggingDoc) return null;
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border-2 border-dashed px-3 py-2.5 text-[12px] font-medium transition-colors ${
        placement === 'top' ? 'sticky top-0 z-10 mb-2' : 'mt-3'
      } ${
        isOver ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-neutral-200 bg-neutral-50 text-neutral-500'
      }`}
    >
      여기에 놓으면 최상위 페이지로 이동
    </div>
  );
}

/* ─── 워크스페이스 제목 드롭 (최상위 분리) ─────────────────────────────────── */
function WorkspaceTitleDropTarget({
  isDraggingDoc,
  children,
}: {
  isDraggingDoc: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'doc-workspace-root',
    data: { type: 'document-root' },
  });
  if (!isDraggingDoc) return <>{children}</>;
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
      }`}
    >
      {children}
    </div>
  );
}

/* ─── 에디터 하위 페이지 드롭 존 ─────────────────────────────────────────── */
function EditorDocDropZone({
  documentId,
  documentTitle,
  isDraggingDoc,
}: {
  documentId: string;
  documentTitle: string;
  isDraggingDoc: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `doc-drop:${documentId}`,
    data: { type: 'document-drop-target', documentId },
  });
  if (!isDraggingDoc) return null;
  return (
    <div
      ref={setNodeRef}
      className={`mb-4 rounded-lg border-2 border-dashed px-4 py-3 text-[13px] transition-colors ${
        isOver
          ? 'border-blue-400 bg-blue-50 text-blue-700'
          : 'border-neutral-200 bg-neutral-50/80 text-neutral-500'
      }`}
    >
      <span className="font-medium">{documentTitle}</span>의 하위 페이지로 넣기
    </div>
  );
}

/* ─── DocItem ────────────────────────────────────────────────────────────── */
function DocItem({
  doc,
  isActive,
  onSelect,
  onPin,
  onFavorite,
  onDelete,
  indentLevel = 0,
  onCreateChild,
  onEditIcon,
  hasChildren = false,
  isExpanded = true,
  onToggleExpand,
  isChildDoc = false,
}: {
  doc: NoteDocument;
  isActive: boolean;
  onSelect: () => void;
  onPin: (e: React.MouseEvent) => void;
  onFavorite: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  indentLevel?: number;
  onCreateChild?: (e: React.MouseEvent) => void;
  onEditIcon?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (e: React.MouseEvent) => void;
  isChildDoc?: boolean;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `doc:${doc.id}`,
    data: { type: 'document', documentId: doc.id },
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `doc-drag:${doc.id}`,
    data: { type: 'document-drag', documentId: doc.id },
  });

  return (
    <div
      ref={setDropRef}
      style={{ paddingLeft: `${4 + Math.min(indentLevel, 6) * 14}px` }}
      className={`group relative rounded-md transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
        className={`flex cursor-pointer select-none items-center gap-0.5 rounded-md py-[6px] pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
          isActive ? 'bg-neutral-200/80 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-100'
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-neutral-200/80 hover:text-neutral-700"
            aria-label={isExpanded ? '하위 페이지 접기' : '하위 페이지 펼치기'}
            title={isExpanded ? '접기' : '펼치기'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(e);
            }}
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          ref={setDragRef}
          className={`flex h-5 w-4 shrink-0 cursor-grab items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 active:cursor-grabbing ${
            isChildDoc ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label="드래그하여 이동"
          title="드래그: 다른 페이지 안으로 · 최상위 영역: 빼기"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      <button
        type="button"
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-neutral-200/80"
        title="아이콘 변경"
        onClick={(e) => { e.stopPropagation(); onEditIcon?.(e); }}
      >
        <DocIconGlyph
          icon={resolveDocIcon(doc.properties)}
          fallbackClassName={`h-[15px] w-[15px] shrink-0 ${
            isActive ? 'text-neutral-500' : doc.is_pinned ? 'text-violet-500' : doc.is_favorite ? 'text-amber-500' : 'text-neutral-400'
          }`}
          emojiClassName="shrink-0 text-[14px] leading-none"
        />
      </button>
      <p
        className="min-w-0 flex-1 truncate text-[14px] leading-5"
        title={doc.title}
      >
        {doc.title}
      </p>
      <div
        className={`flex shrink-0 items-center gap-0.5 ${isActive ? 'visible' : 'invisible group-hover:visible'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" title={doc.is_pinned ? '고정 해제' : '맨 위에 고정'}
          className={`rounded p-1 transition-colors ${
            doc.is_pinned ? 'text-violet-500 hover:bg-neutral-200' : 'text-neutral-400 hover:bg-neutral-200 hover:text-violet-500'
          }`}
          onClick={onPin}
        >
          <Pin className={`h-3.5 w-3.5 ${doc.is_pinned ? 'fill-current' : ''}`} />
        </button>
        <button type="button" title={doc.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          className={`rounded p-1 transition-colors ${
            doc.is_favorite ? 'text-amber-500 hover:bg-neutral-200' : 'text-neutral-400 hover:bg-neutral-200 hover:text-amber-500'
          }`}
          onClick={onFavorite}
        >
          <Star className={`h-3.5 w-3.5 ${doc.is_favorite ? 'fill-current' : ''}`} />
        </button>
        {onCreateChild && (
          <button
            type="button"
            title="하위 문서 추가"
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
            onClick={onCreateChild}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" title="삭제"
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-rose-500"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      </div>
    </div>
  );
}

/* ─── BlockContent ──────────────────────────────────────────────────────── */
function BlockContent({
  block,
  onUpdate,
  onDelete,
  onChangeType,
  onEnter,
  onAddBelow,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  autoFocusSignal,
  onEmptyBackspace,
  onMergeWithPrevious,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  isDragging,
  focusedToggleId,
  uploadImage,
  childBlocks = [],
  renderChildBlock,
  onAddChildBelow,
  onTrackActiveBlock,
  isInsideToggle = false,
  isDropTarget = false,
  isFocused = false,
  mergeFocusCaretOffset,
  toggleNestDepth = 1,
  onFocusBlock,
  autoFocusTitleSignal = 0,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    position: { top: number; left: number },
  ) => void;
  onHideFormatToolbar?: () => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onMergeWithPrevious?: () => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  isDragging?: boolean;
  focusedToggleId?: string | null;
  uploadImage?: (file: File) => Promise<string>;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => React.ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  isInsideToggle?: boolean;
  toggleNestDepth?: number;
  isDropTarget?: boolean;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onFocusBlock?: () => void;
  autoFocusTitleSignal?: number;
}) {
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const slashHostRef = useRef<HTMLDivElement>(null);
  const [slashAnchor, setSlashAnchor] = useState<{ top: number; left: number } | null>(null);
  const toggleTitleInputRef = useRef<HTMLInputElement>(null);
  const [toggleTitleSlashAnchor, setToggleTitleSlashAnchor] = useState<{ top: number; left: number } | null>(null);
  const [imgDragOver, setImgDragOver] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const imgFileInputRef = useRef<HTMLInputElement>(null);
  const pageBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (block.type !== 'page' || !isFocused) return;
    pageBtnRef.current?.focus();
  }, [block.type, isFocused, autoFocusSignal]);

  useEffect(() => {
    if (block.type !== 'toggle' || autoFocusTitleSignal <= 0) return;
    requestAnimationFrame(() => {
      toggleTitleInputRef.current?.focus();
      onTrackActiveBlock?.('title');
    });
  }, [block.type, autoFocusTitleSignal, onTrackActiveBlock]);

  const updateSlashAnchor = useCallback(() => {
    if (!slashHostRef.current) return;
    const rect = slashHostRef.current.getBoundingClientRect();
    setSlashAnchor({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    if (!showSlash) {
      setSlashAnchor(null);
      return;
    }
    updateSlashAnchor();
    window.addEventListener('scroll', updateSlashAnchor, true);
    window.addEventListener('resize', updateSlashAnchor);
    return () => {
      window.removeEventListener('scroll', updateSlashAnchor, true);
      window.removeEventListener('resize', updateSlashAnchor);
    };
  }, [showSlash, slashQuery, updateSlashAnchor]);

  const toggleTitleText = block.type === 'toggle'
    ? (typeof block.content?.title === 'string'
      ? block.content.title
      : (typeof block.content?.text === 'string' ? block.content.text : ''))
    : '';
  const toggleTitleSlashActive = block.type === 'toggle' && toggleTitleText.startsWith('/');
  const toggleTitleSlashQuery = toggleTitleSlashActive ? toggleTitleText.slice(1) : '';

  useEffect(() => {
    if (!toggleTitleSlashActive || !toggleTitleInputRef.current) {
      setToggleTitleSlashAnchor(null);
      return;
    }
    const rect = toggleTitleInputRef.current.getBoundingClientRect();
    setToggleTitleSlashAnchor({ top: rect.bottom + 4, left: rect.left });
  }, [toggleTitleSlashActive, toggleTitleSlashQuery]);

  const renderSlashMenuPortal = () => (
    <SlashMenuFixed
      show={showSlash}
      anchor={slashAnchor}
      commands={BLOCK_TYPES}
      query={slashQuery}
      onSelect={(type) => { onChangeType(type); }}
      onClose={() => { setShowSlash(false); setSlashQuery(''); }}
    />
  );

  const blockDepth = Math.max(0, Math.min(6, Number(block.content?.depth ?? 0)));
  const contentMarginLeft = isInsideToggle ? 0 : blockDepth * 20;
  const isBorderlessInlineBlock = block.type === 'text' || block.type === 'todo' || block.type === 'page';
  const rootBlockShell =
    isInsideToggle || isBorderlessInlineBlock
      ? ''
      : 'rounded-lg border border-slate-200 bg-white px-2 py-2';
  const inlineRowPadding = isInsideToggle ? 'py-1.5' : (isBorderlessInlineBlock ? 'py-2' : '');
  const enterCreatesBlockBelow =
    !isInsideToggle || block.type === 'text' || block.type === 'todo';

  const renderFormatToolbar = () => null;

  const renderFormattedTextarea = ({
    text,
    placeholder,
    textClassName,
    field = 'text',
    tabBehavior = 'block-indent',
    enterCreatesBlock = false,
    onEditorEnter = onEnter,
    onEditorBackspace,
    onEditorMergeWithPrevious,
    editorMergeFocusCaretOffset,
  }: {
    text: string;
    placeholder: string;
    textClassName: string;
    field?: 'text' | 'body';
    tabBehavior?: 'block-indent' | 'insert-text-indent';
    enterCreatesBlock?: boolean;
    onEditorEnter?: () => void;
    /** false면 빈 본문 Backspace로 블록 삭제하지 않음 (토글 본문 등) */
    onEditorBackspace?: (() => void) | false;
    onEditorMergeWithPrevious?: () => void;
    editorMergeFocusCaretOffset?: number;
  }) => {
    const resolvedEditorBackspace =
      onEditorBackspace === false ? undefined : (onEditorBackspace ?? onEmptyBackspace);
    const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
    const legacyKey = field === 'body' ? 'legacyBody' : 'legacyText';
    const mountEditor = isFocused || (autoFocusSignal ?? 0) > 0;
    const editorSharedProps = {
      content: block.content,
      field,
      text,
      resetKey: `${block.id}:${block.type}:${field}`,
      placeholder,
      className: textClassName,
      onEnter: onEditorEnter,
      enterCreatesBlock,
      autoFocusSignal: autoFocusSignal ?? 0,
      onEmptyBackspace: resolvedEditorBackspace,
      onMergeWithPrevious: onEditorMergeWithPrevious ?? onMergeWithPrevious,
      onMarkdownBlockTrigger:
        block.type === 'text' || block.type === 'heading' || block.type === 'todo'
          || block.type === 'callout' || block.type === 'code'
          ? (trigger: MarkdownBlockTrigger) => onChangeType(trigger)
          : undefined,
      focusCaretOffset: editorMergeFocusCaretOffset ?? mergeFocusCaretOffset,
      onIndent: onIndentChange,
      tabBehavior,
      onNavigatePrevious,
      onNavigateNext,
      onEditorFocus: () => onTrackActiveBlock?.('editor'),
      onSlashChange: (nextShow: boolean, nextQuery: string) => {
        setShowSlash(nextShow);
        setSlashQuery(nextQuery);
      },
      onShowFormatToolbar,
      onHideFormatToolbar,
      uploadImage,
      onChange: ({ text: nextText, html: nextHtml }: { text: string; html: string }) => {
        const nextContent: Record<string, unknown> = {
          ...block.content,
          [field]: nextText,
          [htmlKey]: nextHtml,
        };
        const original = block.content?.[field];
        if (typeof block.content?.[legacyKey] !== 'string' && typeof original === 'string') {
          nextContent[legacyKey] = original;
        }
        onUpdate(nextContent);
      },
    };

    return (
      <div
        ref={slashHostRef}
        className="relative min-h-[1.75rem] min-w-0 max-w-full cursor-text"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.ProseMirror, button, input, textarea, a')) return;
          onFocusBlock?.();
        }}
      >
        {mountEditor ? (
          <LazyNoteEditor {...editorSharedProps} />
        ) : (
          <BlockTextPreview
            content={block.content}
            field={field}
            text={text}
            className={textClassName}
            placeholder={placeholder}
            onActivate={onFocusBlock}
          />
        )}
      </div>
    );
  };


  if (block.type === 'divider') {
    return (
      <div
        className={`flex items-center ${isInsideToggle ? 'py-2' : `${rootBlockShell} py-3`}`}
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <div className="flex-1 border-t border-slate-200" />
      </div>
    );
  }

  if (block.type === 'todo') {
    const checked = !!block.content?.checked;
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div
        className={`flex items-start gap-2 ${inlineRowPadding || rootBlockShell}`}
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <button type="button"
          className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
            checked ? 'border-blue-500 bg-blue-500 text-white' : 'border-neutral-300 bg-white hover:border-blue-400'
          }`}
          onClick={() => onUpdate({ ...block.content, checked: !checked })}
        >
          {checked && <Check className="h-3 w-3" />}
        </button>
        <div className="relative min-w-0 flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '할 일을 입력하세요',
            textClassName: `text-[16px] leading-7 ${checked ? 'text-slate-400 line-through' : 'text-slate-800'}`,
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('todo') : onEnter,
          })}
        </div>
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'heading') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className={`flex items-start ${isInsideToggle ? 'py-2' : rootBlockShell}`} style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="relative min-w-0 flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '제목',
            textClassName: 'text-2xl font-bold leading-tight text-slate-900',
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('text') : onEnter,
          })}
          {renderSlashMenuPortal()}
        </div>
      </div>
    );
  }

  if (block.type === 'image') {
    const url = typeof block.content?.url === 'string' ? block.content.url : '';
    const caption = typeof block.content?.caption === 'string' ? block.content.caption : '';
    const fileInputRef = imgFileInputRef;

    const handleImageFile = async (file: File) => {
      if (!uploadImage) return;
      if (!file.type.startsWith('image/')) return;
      setImgUploading(true);
      try {
        const uploaded = await uploadImage(file);
        onUpdate({ ...block.content, url: uploaded });
      } finally {
        setImgUploading(false);
      }
    };

    if (!url) {
      return (
        <div
          className={`group relative overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
            imgDragOver ? 'border-blue-400 bg-blue-50' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
          }`}
          style={{ marginLeft: `${contentMarginLeft}px` }}
          onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
          onDragLeave={() => setImgDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setImgDragOver(false);
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
            if (file) await handleImageFile(file);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleImageFile(file);
              e.target.value = '';
            }}
          />

          {imgUploading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-[13px]">업로드 중…</span>
            </div>
          ) : showUrlInput ? (
            <div className="p-4">
              <p className="mb-2 text-[12px] font-medium text-neutral-500">이미지 URL</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-[14px] outline-none focus:border-neutral-400"
                  placeholder="https://..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) onUpdate({ ...block.content, url: val });
                      setShowUrlInput(false);
                    }
                    if (e.key === 'Escape') setShowUrlInput(false);
                  }}
                />
                <button type="button" onClick={() => setShowUrlInput(false)} className="rounded-md px-3 py-2 text-[13px] text-neutral-400 hover:bg-neutral-100">취소</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
                <ImageIcon className="h-5 w-5 text-neutral-500" />
              </div>
              <p className="text-[14px] font-medium text-neutral-600">이미지 추가</p>
              <p className="text-[12px] text-neutral-400">드래그하거나 클릭해서 업로드</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800"
                >
                  파일 선택
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  URL 입력
                </button>
              </div>
            </div>
          )}

        </div>
      );
    }

    return (
      <div
        className="group relative"
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <div
          className="relative overflow-hidden rounded-lg bg-neutral-100"
          onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
          onDragLeave={() => setImgDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setImgDragOver(false);
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
            if (file) await handleImageFile(file);
          }}
        >
          <img src={url} alt={caption || ''} className="w-full object-contain" />
          {imgDragOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-blue-500/20 text-[14px] font-medium text-blue-700">
              이미지 교체
            </div>
          )}
          {imgUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          )}
          {/* hover 오버레이 */}
          <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleImageFile(f); e.target.value = ''; }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-md bg-white/90 px-2.5 py-1.5 text-[12px] font-medium text-neutral-600 shadow-sm hover:bg-white">
              교체
            </button>
          </div>
        </div>
        {/* 캡션 */}
        <input
          value={caption}
          onChange={(e) => onUpdate({ ...block.content, caption: e.target.value })}
          placeholder="캡션 추가"
          className="mt-1.5 w-full bg-transparent text-center text-[13px] text-neutral-400 outline-none placeholder:text-neutral-300 focus:text-neutral-600"
        />
      </div>
    );
  }

  if (block.type === 'video') {
    const url = typeof block.content?.url === 'string' ? block.content.url : '';
    const embed = resolveVideoEmbedContent(block.content);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-2 flex items-center gap-2">
          <Video className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
            placeholder="YouTube 또는 Vimeo URL을 붙여넣으세요"
            value={url}
            onChange={(e) => onUpdate(buildVideoBlockContentFromUrl(e.target.value))}
          />
        </div>
        {embed ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-400">
              {videoProviderLabel(embed.provider)} 임베드
            </p>
            <VideoEmbedFrame embedUrl={embed.embedUrl} title={`${videoProviderLabel(embed.provider)} 영상`} />
          </div>
        ) : url.trim() ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            YouTube 또는 Vimeo 링크만 지원합니다.
          </p>
        ) : null}
      </div>
    );
  }

  if (block.type === 'page') {
    const pageId = typeof block.content?.page_document_id === 'string' ? block.content.page_document_id : '';
    const title =
      (typeof block.content?.title === 'string' && block.content.title.trim())
        ? block.content.title
        : '제목 없음';
    const pageIcon = pageId && resolvePageIcon ? resolvePageIcon(pageId) : null;
    const openPage = () => { if (pageId) onOpenDocument?.(pageId); };
    return (
      <div style={{ marginLeft: `${contentMarginLeft}px` }}>
        <button
          ref={pageBtnRef}
          type="button"
          tabIndex={0}
          title="클릭하여 페이지 열기"
          className={`flex w-full min-w-0 items-center gap-2 rounded-sm py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 ${
            isInsideToggle
              ? 'text-[16px] text-neutral-800 hover:bg-neutral-50/90'
              : 'text-[16px] text-neutral-800 hover:bg-neutral-50'
          }`}
          onClick={(e) => {
            e.preventDefault();
            openPage();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              openPage();
              return;
            }
            if (e.key === ' ' && isFocused) {
              e.preventDefault();
              openPage();
            }
          }}
        >
          <DocIconGlyph
            icon={pageIcon}
            fallbackClassName="h-[18px] w-[18px] shrink-0 text-neutral-400"
            emojiClassName="shrink-0 text-[17px] leading-none"
          />
          <span className="min-w-0 truncate underline-offset-2 hover:underline">{title}</span>
        </button>
      </div>
    );
  }

  if (block.type === 'callout') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    const icon = typeof block.content?.icon === 'string' && block.content.icon.trim() ? block.content.icon : '💡';
    return (
      <div className="relative rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2" style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="mb-1 flex items-center gap-2">
          <input
            value={icon}
            onChange={(e) => onUpdate({ ...block.content, icon: e.target.value.slice(0, 2) })}
            className="w-10 rounded border border-amber-200 bg-white px-1 text-center text-sm"
          />
          <span className="flex-1 text-xs font-semibold text-amber-700">콜아웃</span>
        </div>
        {renderFormatToolbar()}
        {renderFormattedTextarea({
          text,
          placeholder: '강조 메시지를 입력하세요 (/ 로 블록 변환)',
          textClassName: 'text-[15px] leading-7 text-slate-800',
        })}
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'code') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className="relative rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 shadow-sm" style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="mb-2 flex items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Code</span>
        </div>
        {renderFormattedTextarea({
          text,
          placeholder: '코드를 입력하세요 (/ 로 블록 변환)',
          textClassName: 'font-mono text-[13px] leading-6 text-slate-100',
          tabBehavior: 'block-indent',
        })}
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'toggle') {
    const title = typeof block.content?.title === 'string'
      ? block.content.title
      : (typeof block.content?.text === 'string' ? block.content.text : '');
    const { text: body } = resolveToggleBodyForDisplay(block.content);
    const collapsed = !!block.content?.collapsed;
    const showToggleContent = !collapsed && !isDragging;
    const rawIm = block.content?.images;
    const toggleImages = Array.isArray(rawIm)
      ? rawIm.map((u) => (typeof u === 'string' ? u : ''))
      : [];
    const isThisToggleFocused = focusedToggleId === block.id;
    const patchToggle = (partial: Record<string, unknown>) =>
      onUpdate({ ...block.content, ...partial });
    const showToggleBody = body.trim().length > 0 || childBlocks.length === 0;

    return (
      <div
        className={`relative overflow-visible py-0.5 ${
          !isInsideToggle && isDropTarget
            ? 'rounded-sm bg-blue-50/40 ring-1 ring-blue-200/80'
            : !isInsideToggle && isThisToggleFocused
              ? 'rounded-sm bg-neutral-50/60'
              : ''
        }`}
        style={isInsideToggle ? undefined : { marginLeft: `${contentMarginLeft}px` }}
      >
        <div
          className="flex min-h-[30px] w-full cursor-text items-center gap-1"
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button')) return;
            if (target.tagName !== 'INPUT') {
              e.preventDefault();
              toggleTitleInputRef.current?.focus();
              onTrackActiveBlock?.('title');
            }
          }}
        >
          <ToggleDisclosureButton
            collapsed={collapsed}
            onClick={(e) => {
              e.stopPropagation();
              patchToggle({ collapsed: !collapsed });
            }}
          />
          <input
            ref={toggleTitleInputRef}
            data-toggle-title
            value={title}
            onChange={(e) => patchToggle({ title: e.target.value })}
            onFocus={() => onTrackActiveBlock?.('title')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onAddBelow('toggle');
                return;
              }
              if (e.key === 'Tab' && onIndentChange) {
                e.preventDefault();
                onIndentChange(e.shiftKey ? 'out' : 'in');
              }
              if (e.key === 'Escape' && toggleTitleSlashActive) {
                e.preventDefault();
                patchToggle({ title: '' });
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-7 text-neutral-800 outline-none placeholder:text-neutral-400"
            placeholder="토글 (/ 로 변환)"
          />
        </div>
        {showToggleContent && (
          <div className="overflow-visible pl-[1.625rem]">
            {showToggleBody && (
              <>
                {renderFormatToolbar()}
                {renderFormattedTextarea({
                  text: body,
                  placeholder: '',
                  textClassName: 'text-[16px] leading-[1.7] text-slate-800',
                  field: 'body',
                  tabBehavior: 'insert-text-indent',
                  enterCreatesBlock: false,
                  onEditorBackspace: false,
                })}
              </>
            )}
            {childBlocks.length > 0 && (
              <div className="space-y-0 overflow-visible">
                {childBlocks.map((child) => renderChildBlock?.(child, toggleNestDepth + 1))}
              </div>
            )}
            <div
              className="min-h-[28px] cursor-text"
              onMouseDown={(e) => {
                if (e.target !== e.currentTarget) return;
                e.preventDefault();
                onAddChildBelow?.('text');
              }}
            />
            {renderSlashMenuPortal()}
            {toggleImages.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">토글 안 이미지</p>
                {toggleImages.map((url, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                    <div className="mb-1 flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <input
                        className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-700 outline-none focus:border-blue-400"
                        placeholder="이미지 URL"
                        value={url}
                        onChange={(e) => {
                          const next = [...toggleImages];
                          next[idx] = e.target.value;
                          patchToggle({ images: next });
                        }}
                      />
                      <button
                        type="button"
                        className="shrink-0 rounded p-1 text-slate-400 hover:text-rose-500"
                        title="이미지 제거"
                        onClick={() => patchToggle({ images: toggleImages.filter((_, j) => j !== idx) })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {url.trim() ? (
                      <div className="overflow-hidden rounded-md bg-white">
                        { }
                        <img src={url.trim()} alt="" className="max-h-56 w-full object-contain" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <SlashMenuFixed
          show={toggleTitleSlashActive}
          anchor={toggleTitleSlashAnchor}
          commands={BLOCK_TYPES}
          query={toggleTitleSlashQuery}
          title="토글 제목"
          onSelect={(type) => { onChangeType(type); }}
          onClose={() => { patchToggle({ title: '' }); }}
        />
      </div>
    );
  }

  // text (default)
  const text = typeof block.content?.text === 'string' ? block.content.text : '';
  return (
    <div
      className={`flex min-h-[30px] items-start ${inlineRowPadding || rootBlockShell}`}
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      <div
        className="relative min-h-[1.75rem] min-w-0 flex-1 cursor-text"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.ProseMirror, button, input, textarea, a')) return;
          onFocusBlock?.();
        }}
      >
        {renderFormatToolbar()}
        {renderFormattedTextarea({
          text,
          placeholder: isInsideToggle ? '' : '내용을 입력하세요… (/ 로 블록 타입 변경)',
          textClassName: 'text-[16px] leading-[1.7] text-slate-800',
          enterCreatesBlock: enterCreatesBlockBelow,
          onEditorEnter: enterCreatesBlockBelow ? onEnter : undefined,
        })}
        {renderSlashMenuPortal()}
      </div>
    </div>
  );
}

/* ─── SortableBlockRow ───────────────────────────────────────────────────── */
function SortableBlockRow({
  block,
  onUpdate,
  onDelete,
  onChangeType,
  onEnter,
  onAddBelow,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  autoFocusSignal,
  onEmptyBackspace,
  onMergeWithPrevious,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  focusedToggleId,
  onFocusToggle,
  uploadImage,
  isDropTarget,
  childBlocks,
  renderChildBlock,
  onAddChildBelow,
  onTrackActiveBlock,
  onDuplicate,
  isFocused = false,
  mergeFocusCaretOffset,
  onFocusBlock,
  autoFocusTitleSignal = 0,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    position: { top: number; left: number },
  ) => void;
  onHideFormatToolbar?: () => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onMergeWithPrevious?: () => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => React.ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onDuplicate?: () => void;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onFocusBlock?: () => void;
  autoFocusTitleSignal?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number } | null>(null);
  const [handleMenuAnchor, setHandleMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const gripBtnRef = useRef<HTMLButtonElement>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const isToggleBlock = block.type === 'toggle';
  const blockControls = (
    <div className="pointer-events-auto flex h-7 items-center gap-0.5 text-neutral-400">
      <button
        ref={addBtnRef}
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-100 hover:text-neutral-600"
        aria-label="아래에 새 블록 추가"
        title="블록 추가"
        onClick={(e) => {
          e.stopPropagation();
          if (pickerAnchor) { setPickerAnchor(null); return; }
          const rect = addBtnRef.current!.getBoundingClientRect();
          setPickerAnchor({ top: rect.bottom + 4, left: rect.left });
        }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        ref={gripBtnRef}
        type="button"
        className="flex h-6 w-5 cursor-grab items-center justify-center rounded hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing"
        aria-label="메뉴 · 드래그"
        title="클릭: 복제·변환·삭제 · 드래그: 이동"
        onClick={(e) => {
          e.stopPropagation();
          if (noteBlockDragActive.current) return;
          if (handleMenuAnchor) { setHandleMenuAnchor(null); return; }
          setPickerAnchor(null);
          const rect = gripBtnRef.current!.getBoundingClientRect();
          setHandleMenuAnchor({ top: rect.bottom + 4, left: rect.left });
        }}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const blockContentNode = (
    <div
      className="min-h-[30px] min-w-0 flex-1 cursor-text"
      onMouseDownCapture={() => {
        onFocusToggle?.(block.type === 'toggle' ? block.id : null);
      }}
    >
      <BlockContent
        block={block}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onChangeType={onChangeType}
        onEnter={onEnter}
        onAddBelow={onAddBelow}
        onOpenDocument={onOpenDocument}
        resolvePageIcon={resolvePageIcon}
        onShowFormatToolbar={onShowFormatToolbar}
        onHideFormatToolbar={onHideFormatToolbar}
        autoFocusSignal={autoFocusSignal}
        onEmptyBackspace={onEmptyBackspace}
        onMergeWithPrevious={onMergeWithPrevious}
        onIndentChange={onIndentChange}
        onNavigatePrevious={onNavigatePrevious}
        onNavigateNext={onNavigateNext}
        isDragging={isDragging}
        focusedToggleId={focusedToggleId}
        uploadImage={uploadImage}
        childBlocks={childBlocks}
        renderChildBlock={renderChildBlock}
        onAddChildBelow={onAddChildBelow}
        onTrackActiveBlock={onTrackActiveBlock}
        isInsideToggle={false}
        isDropTarget={isDropTarget}
        isFocused={isFocused}
        mergeFocusCaretOffset={mergeFocusCaretOffset}
        toggleNestDepth={1}
        onFocusBlock={onFocusBlock}
        autoFocusTitleSignal={autoFocusTitleSignal}
      />
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      data-note-block-row
      style={style}
      className={`group/block relative overflow-visible py-1 transition-colors ${
        isDragging
          ? 'bg-blue-50/50'
          : isDropTarget
            ? 'bg-blue-50/40'
            : isFocused
              ? 'bg-neutral-50/80'
              : 'hover:bg-neutral-50/70'
      }`}
    >
      {isDropTarget && !isDragging && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-0.5 rounded-full bg-blue-400/80" />
      )}
      <div className={`absolute -left-[4.25rem] top-0 z-10 flex h-7 items-center ${BLOCK_HANDLE_HOVER}`}>
        {blockControls}
      </div>

      {blockContentNode}

      {/* + 버튼 블록 피커 — fixed 포지셔닝 (overflow 클리핑 방지) */}
      {pickerAnchor && (
        <div
          className="fixed z-[10000]"
          style={{ top: pickerAnchor.top, left: pickerAnchor.left }}
        >
          <BlockPickerMenu
            commands={BLOCK_TYPES}
            onSelect={(type) => { onAddBelow(type); setPickerAnchor(null); }}
            onClose={() => setPickerAnchor(null)}
          />
        </div>
      )}
      {handleMenuAnchor && (
        <div
          className="fixed z-[9999]"
          style={{ top: handleMenuAnchor.top, left: handleMenuAnchor.left }}
        >
          <BlockHandleMenu
            commands={BLOCK_TYPES}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onDelete}
            onTurnInto={(type) => onChangeType(type)}
            onClose={() => setHandleMenuAnchor(null)}
          />
        </div>
      )}
    </div>
  );
}

/* ─── ToggleInlineRow (토글 안 — 블록 UI 없이 인라인) ─────────────────────── */
function ToggleInlineRow({
  block,
  onUpdate,
  onDelete,
  onChangeType,
  onEnter,
  onAddBelow,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  autoFocusSignal,
  onEmptyBackspace,
  onMergeWithPrevious,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  focusedToggleId,
  onFocusToggle,
  uploadImage,
  isDropTarget,
  childBlocks,
  renderChildBlock,
  onTrackActiveBlock,
  onDuplicate,
  isFocused = false,
  mergeFocusCaretOffset,
  nestDepth = 1,
  onFocusBlock,
  onAddChildBelow,
  autoFocusTitleSignal = 0,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    position: { top: number; left: number },
  ) => void;
  onHideFormatToolbar?: () => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onMergeWithPrevious?: () => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth: number) => React.ReactNode;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onDuplicate?: () => void;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  nestDepth?: number;
  onFocusBlock?: () => void;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  autoFocusTitleSignal?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 + nestDepth : undefined,
  };

  const handleLeft = toggleInlineHandleLeft();
  const menuShiftLeft = toggleMenuAnchorOffset(nestDepth);
  const menuZIndex = 10000 + nestDepth;

  const [inlinePickerAnchor, setInlinePickerAnchor] = useState<{ top: number; left: number } | null>(null);
  const [inlineHandleMenuAnchor, setInlineHandleMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const inlineAddBtnRef = useRef<HTMLButtonElement>(null);
  const inlineGripBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      ref={setNodeRef}
      data-note-block-row
      style={style}
      className={`group/block relative overflow-visible py-0.5 transition-colors ${
        isDragging ? 'bg-blue-50/40' : isDropTarget ? 'bg-blue-50/30' : isFocused ? 'bg-neutral-50/60' : 'hover:bg-neutral-50/50'
      }`}
    >
      {isDropTarget && !isDragging && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-0.5 rounded-full bg-blue-400/80" />
      )}
      <div
        className={`absolute top-0 flex h-7 items-center ${BLOCK_HANDLE_HOVER}`}
        style={{ left: handleLeft, zIndex: 12 + nestDepth }}
      >
        <div className="pointer-events-auto flex h-7 items-center gap-0.5 text-neutral-400">
          <button
            ref={inlineAddBtnRef}
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="아래에 추가"
            title="블록 추가"
            onClick={(e) => {
              e.stopPropagation();
              if (inlinePickerAnchor) { setInlinePickerAnchor(null); return; }
              const rect = inlineAddBtnRef.current!.getBoundingClientRect();
              setInlinePickerAnchor({
                top: rect.bottom + 8,
                left: rect.left - menuShiftLeft,
              });
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            ref={inlineGripBtnRef}
            type="button"
            className="flex h-6 w-5 cursor-grab items-center justify-center rounded hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing"
            aria-label="메뉴 · 드래그"
            title="클릭: 복제·변환·삭제 · 드래그: 이동"
            onClick={(e) => {
              e.stopPropagation();
              if (noteBlockDragActive.current) return;
              if (inlineHandleMenuAnchor) { setInlineHandleMenuAnchor(null); return; }
              setInlinePickerAnchor(null);
              const rect = inlineGripBtnRef.current!.getBoundingClientRect();
              setInlineHandleMenuAnchor({
                top: rect.bottom + 8,
                left: rect.left - menuShiftLeft,
              });
            }}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {inlinePickerAnchor && (
        <div className="fixed" style={{ top: inlinePickerAnchor.top, left: inlinePickerAnchor.left, zIndex: menuZIndex }}>
          <BlockPickerMenu
            commands={BLOCK_TYPES}
            onSelect={(type) => { onAddBelow(type); setInlinePickerAnchor(null); }}
            onClose={() => setInlinePickerAnchor(null)}
          />
        </div>
      )}
      {inlineHandleMenuAnchor && (
        <div className="fixed" style={{ top: inlineHandleMenuAnchor.top, left: inlineHandleMenuAnchor.left, zIndex: menuZIndex }}>
          <BlockHandleMenu
            commands={BLOCK_TYPES}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onDelete}
            onTurnInto={(type) => onChangeType(type)}
            onClose={() => setInlineHandleMenuAnchor(null)}
          />
        </div>
      )}
      <div
        className="min-h-[30px] min-w-0 cursor-text"
        onMouseDownCapture={() => {
          if (block.type === 'toggle') {
            onFocusToggle?.(block.id);
          }
        }}
      >
        <BlockContent
          block={block}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onChangeType={onChangeType}
          onEnter={onEnter}
          onAddBelow={onAddBelow}
          onOpenDocument={onOpenDocument}
          resolvePageIcon={resolvePageIcon}
          onShowFormatToolbar={onShowFormatToolbar}
          onHideFormatToolbar={onHideFormatToolbar}
          autoFocusSignal={autoFocusSignal}
          onEmptyBackspace={onEmptyBackspace}
          onMergeWithPrevious={onMergeWithPrevious}
          onIndentChange={onIndentChange}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          isDragging={isDragging}
          focusedToggleId={focusedToggleId}
          uploadImage={uploadImage}
          childBlocks={childBlocks}
          renderChildBlock={block.type === 'toggle' ? renderChildBlock : undefined}
          onAddChildBelow={onAddChildBelow}
          onTrackActiveBlock={onTrackActiveBlock}
          isInsideToggle
          isDropTarget={isDropTarget}
          isFocused={isFocused}
          mergeFocusCaretOffset={mergeFocusCaretOffset}
          toggleNestDepth={nestDepth}
          onFocusBlock={onFocusBlock}
          autoFocusTitleSignal={autoFocusTitleSignal}
        />
      </div>
    </div>
  );
}

/* ─── DragPreview ────────────────────────────────────────────────────────── */
function DragPreview({ block }: { block: NoteBlock }) {
  const text =
    block.type === 'divider' ? '── 구분선 ──'
    : block.type === 'image' ? `🖼 ${block.content?.url || '이미지'}`
    : block.type === 'video' ? `▶ ${block.content?.url || '영상'}`
    : block.type === 'toggle'
      ? ((block.content?.title as string) || (block.content?.text as string) || '(토글)')
    : (block.content?.text as string) || '(빈 블록)';

  const typeLabel = BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type;
  const TypeIcon = BLOCK_TYPES.find((t) => t.type === block.type)?.icon ?? FileText;

  return (
    <div className="flex w-80 items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-2xl ring-1 ring-blue-100">
      <GripVertical className="h-4 w-4 shrink-0 text-blue-400" />
      <TypeIcon className="h-4 w-4 shrink-0 text-blue-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-700">{text}</p>
        <p className="text-[11px] text-slate-400">{typeLabel}</p>
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────────────────── */
export default function AdminNotePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState<NoteDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [emptyPagePickerOpen, setEmptyPagePickerOpen] = useState(false);
  const [emptyPagePickerAnchor, setEmptyPagePickerAnchor] = useState<{ top: number; left: number } | null>(null);
  const [showDocIconPicker, setShowDocIconPicker] = useState(false);
  const [docIconDraft, setDocIconDraft] = useState('');
  const docIconInputRef = useRef<HTMLInputElement>(null);
  const [sidebarIconPicker, setSidebarIconPicker] = useState<{ docId: string; top: number; left: number } | null>(null);
  const [sidebarIconDraft, setSidebarIconDraft] = useState('');
  const sidebarIconInputRef = useRef<HTMLInputElement>(null);
  const [mergeFocusCaretOffset, setMergeFocusCaretOffset] = useState<number | undefined>(undefined);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<NoteCollaborator[]>([]);
  const [backlinks, setBacklinks] = useState<NoteDocument[]>([]);
  const [mobileTab, setMobileTab] = useState<'list' | 'editor'>('list');
  const { closeAll, setDesktopOpen, setMobileOpen } = useAppSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeDragDocId, setActiveDragDocId] = useState<string | null>(null);
  const [collapsedSidebarDocs, setCollapsedSidebarDocs] = useState<Set<string>>(() => new Set());
  const [overBlockId, setOverBlockId] = useState<string | null>(null);
  const [focusedEditorBlockId, setFocusedEditorBlockId] = useState<string | null>(null);
  const [focusedEditorPart, setFocusedEditorPart] = useState<'title' | 'editor' | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const [focusTitleSignal, setFocusTitleSignal] = useState(0);
  /** 상단 '이미지' 블록 추가 시 토글 안에 넣을 대상 (토글 블록 클릭으로 설정) */
  const [focusedToggleId, setFocusedToggleId] = useState<string | null>(null);
  const [formatToolbar, setFormatToolbar] = useState<FormatToolbarState | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [docTab, setDocTab] = useState<'active' | 'trash' | 'block-trash'>('active');
  const [trashedBlocks, setTrashedBlocks] = useState<NoteBlock[]>([]);
  const [loadingTrashedBlocks, setLoadingTrashedBlocks] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [restoringBlockId, setRestoringBlockId] = useState<string | null>(null);
  const [purgingBlockId, setPurgingBlockId] = useState<string | null>(null);
  const [lastDeletedBlockId, setLastDeletedBlockId] = useState<string | null>(null);
  const undoCreateBlockIdRef = useRef<string | null>(null);
  const [showCreateUndo, setShowCreateUndo] = useState(false);

  const saveTimersRef = useRef<Record<string, number | undefined>>({});
  const savedTimerRef = useRef<number | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const blocksRef = useRef<NoteBlock[]>([]);
  const dragStartBlocksRef = useRef<NoteBlock[]>([]);
  const focusedEditorBlockIdRef = useRef<string | null>(null);
  const focusedEditorPartRef = useRef<'title' | 'editor' | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const activeDocument = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId],
  );
  const allDocumentsMap = useMemo(
    () => new Map(documents.map((doc) => [doc.id, doc])),
    [documents],
  );
  const documentBreadcrumb = useMemo(
    () => buildDocumentBreadcrumb(activeDocument, allDocumentsMap),
    [activeDocument, allDocumentsMap],
  );
  const parentDocument = useMemo(() => {
    if (!activeDocument?.parent_id) return null;
    return allDocumentsMap.get(activeDocument.parent_id) ?? null;
  }, [activeDocument, allDocumentsMap]);
  const resolvePageIcon = useCallback(
    (documentId: string) => resolveDocIcon(allDocumentsMap.get(documentId)?.properties),
    [allDocumentsMap],
  );

  const activeBlock = useMemo(
    () => (activeBlockId ? blocks.find((b) => b.id === activeBlockId) ?? null : null),
    [activeBlockId, blocks],
  );
  const activeDragDocument = useMemo(
    () => (activeDragDocId ? documents.find((d) => d.id === activeDragDocId) ?? null : null),
    [activeDragDocId, documents],
  );

  const syncFocusedToggleFromBlock = useCallback((blockId: string) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;
    if (block.type === 'toggle') {
      setFocusedToggleId(block.id);
      return;
    }
    const parentId = block.parent_block_id ?? null;
    if (!parentId) return;
    const parent = blocksRef.current.find((b) => b.id === parentId);
    if (parent?.type === 'toggle') {
      setFocusedToggleId(parent.id);
    }
  }, []);

  const trackActiveBlock = useCallback((blockId: string | null, part: 'title' | 'editor' = 'editor') => {
    if (!blockId) return;
    focusedEditorBlockIdRef.current = blockId;
    focusedEditorPartRef.current = part;
    setFocusedEditorBlockId(blockId);
    setFocusedEditorPart(part);
    syncFocusedToggleFromBlock(blockId);
  }, [syncFocusedToggleFromBlock]);

  const focusBlockEditor = useCallback((
    blockId: string | null,
    part: 'title' | 'editor' = 'editor',
  ) => {
    if (!blockId) return;
    focusedEditorBlockIdRef.current = blockId;
    focusedEditorPartRef.current = part;
    setFocusedEditorBlockId(blockId);
    setFocusedEditorPart(part);
    if (part === 'title') {
      setFocusTitleSignal((v) => v + 1);
    } else {
      setFocusSignal((v) => v + 1);
    }
    syncFocusedToggleFromBlock(blockId);
  }, [syncFocusedToggleFromBlock]);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q ? documents.filter((d) => d.title.toLowerCase().includes(q)) : documents;
    if (sortKey === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    if (docTab === 'trash') {
      return [...list].sort((a, b) => new Date(b.deleted_at ?? b.updated_at).getTime() - new Date(a.deleted_at ?? a.updated_at).getTime());
    }
    return [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [documents, searchQuery, sortKey]);

  const boardDocuments = useMemo(
    () => filteredDocuments.filter((d) => !d.deleted_at),
    [filteredDocuments],
  );

  const pinnedDocuments = useMemo(() => {
    if (docTab !== 'active') return [];
    const pinned = filteredDocuments.filter((d) => d.is_pinned);
    return [...pinned].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [docTab, filteredDocuments]);
  const favoriteDocuments = useMemo(() => {
    if (docTab !== 'active') return [];
    return filteredDocuments.filter((d) => d.is_favorite && !d.is_pinned);
  }, [docTab, filteredDocuments]);
  const otherDocuments = useMemo(
    () => (docTab === 'active' ? filteredDocuments.filter((d) => !d.is_favorite && !d.is_pinned) : filteredDocuments),
    [docTab, filteredDocuments],
  );
  const docMap = useMemo(() => new Map(filteredDocuments.map((d) => [d.id, d])), [filteredDocuments]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, NoteDocument[]>();
    // filteredDocuments 전체(고정·즐겨찾기 포함)를 기준으로 트리 구성
    for (const doc of filteredDocuments) {
      if (!doc.parent_id) continue;
      const list = map.get(doc.parent_id) ?? [];
      list.push(doc);
      map.set(doc.parent_id, list);
    }
    for (const [key, list] of map.entries()) {
      map.set(
        key,
        [...list].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        ),
      );
    }
    return map;
  }, [filteredDocuments]);
  const rootDocuments = useMemo(
    () => otherDocuments.filter((d) => !d.parent_id || !docMap.has(d.parent_id)),
    [otherDocuments, docMap],
  );

  /* close sort menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* auto-resize title textarea */
  useEffect(() => {
    const el = titleInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [activeDocument?.title]);

  /* init from URL */
  useEffect(() => {
    const initialId = searchParams.get('id');
    if (initialId) {
      setSelectedId(initialId);
      setMobileTab('editor');
      closeAll();
    }
  }, [searchParams, closeAll]);

  /* load documents */
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingDocuments(true); setError(null);
        const res = await fetch(
          docTab === 'trash' ? '/api/admin/note/trash' : '/api/admin/note/documents',
          { credentials: 'include' },
        );
        if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '문서 목록을 불러오지 못했습니다.'); }
        const json = (await res.json()) as { documents: NoteDocument[] };
        setDocuments(json.documents ?? []);
        const urlDocId = searchParams.get('id');
        if (urlDocId && json.documents?.some((d) => d.id === urlDocId)) {
          setSelectedId(urlDocId);
          setMobileTab('editor');
        }
      } catch (e) { devLogger.error('[Note] loadDocs', e); setError(e instanceof Error ? e.message : '로드 실패'); }
      finally { setLoadingDocuments(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docTab]);

  /* load blocks — 서버 1회 (복구·승격·고아 page 보정 포함) */
  useEffect(() => {
    if (!selectedId) { setBlocks([]); return; }
    const load = async () => {
      try {
        setLoadingBlocks(true); setError(null);
        const res = await fetch(
          `/api/admin/note/blocks/load?documentId=${encodeURIComponent(selectedId)}`,
          { credentials: 'include' },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || '블록 로드 실패');
        }
        const json = (await res.json()) as { blocks: NoteBlock[] };
        setBlocks(json.blocks ?? []);
      } catch (e) {
        devLogger.error('[Note] loadBlocks', e);
        setError(e instanceof Error ? e.message : '로드 실패');
      } finally {
        setLoadingBlocks(false);
      }
    };
    load();
  }, [selectedId]);

  useEffect(() => {
    setTrashedBlocks([]);
    setLastDeletedBlockId(null);
  }, [selectedId]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const childrenByParentBlock = useMemo(() => buildChildrenByParentBlock(blocks), [blocks]);
  const rootBlocks = useMemo(() => sortRootBlocks(blocks), [blocks]);
  const allSortableBlockIds = useMemo(() => blocks.map((block) => block.id), [blocks]);

  const loadTrashedBlocks = useCallback(async () => {
    if (!selectedId) {
      setTrashedBlocks([]);
      return;
    }
    try {
      setLoadingTrashedBlocks(true);
      const res = await fetch(`/api/admin/note/blocks/trash?documentId=${encodeURIComponent(selectedId)}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '휴지통 블록 로드 실패');
      }
      const json = (await res.json()) as { blocks: NoteBlock[] };
      setTrashedBlocks(json.blocks ?? []);
    } catch (e) {
      devLogger.error('[Note] loadTrashedBlocks', e);
    } finally {
      setLoadingTrashedBlocks(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (docTab !== 'block-trash') return;
    void loadTrashedBlocks();
  }, [docTab, loadTrashedBlocks]);

  useDeferredNoteMeta(selectedId, setCollaborators, setBacklinks);

  /* save helper */
  const triggerSave = useCallback(() => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setLoadingState('saved');
    setLastSavedAt(new Date());
    savedTimerRef.current = window.setTimeout(() => setLoadingState('idle'), 3000);
  }, []);

  /* ── DnD handlers ── */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith('doc-drag:')) {
      setActiveDragDocId(activeId.slice('doc-drag:'.length));
      setActiveBlockId(null);
      noteBlockDragActive.current = false;
    } else {
      setActiveBlockId(activeId);
      setActiveDragDocId(null);
      noteBlockDragActive.current = true;
      dragStartBlocksRef.current = blocksRef.current;
    }
    setOverBlockId(null);
  }, []);

  const normalizeDepthByOrder = useCallback((orderedBlocks: NoteBlock[]) => {
    let prevDepth = 0;
    const depthPatches: Array<{ id: string; content: Record<string, unknown> }> = [];
    const normalized = orderedBlocks.map((block, index) => {
      const content =
        block.content && typeof block.content === 'object'
          ? (block.content as Record<string, unknown>)
          : null;
      const rawDepth = Number(content?.depth ?? 0);
      const safeDepth = Number.isFinite(rawDepth) ? Math.max(0, Math.min(6, Math.round(rawDepth))) : 0;
      const maxDepth = index === 0 ? 0 : Math.min(6, prevDepth + 1);
      const nextDepth = Math.min(safeDepth, maxDepth);
      prevDepth = nextDepth;
      if (content && safeDepth !== nextDepth) {
        const nextContent = { ...content, depth: nextDepth };
        depthPatches.push({ id: block.id, content: nextContent });
        return { ...block, content: nextContent, order_index: index };
      }
      return { ...block, order_index: index };
    });
    return { normalized, depthPatches };
  }, []);

  const persistOrderAndDepth = useCallback(async (
    orderedBlocks: NoteBlock[],
    depthPatches: Array<{ id: string; content: Record<string, unknown> }>,
  ) => {
    const orders = orderedBlocks.map((block) => ({ id: block.id, order_index: block.order_index }));
    try {
      await fetch('/api/admin/note/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orders }),
      });
      if (depthPatches.length > 0) {
        await Promise.all(
          depthPatches.map((patch) =>
            fetch('/api/admin/note/blocks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ id: patch.id, content: patch.content }),
            }),
          ),
        );
      }
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] reorder/depth-sync', e);
    }
  }, [triggerSave]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setOverBlockId(null);
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    if (
      activeId.startsWith('doc-drag:') ||
      overId.startsWith('doc:') ||
      overId.startsWith('doc-drop:') ||
      overId === 'doc-root' ||
      overId === 'doc-root-bottom' ||
      overId === 'doc-workspace-root'
    ) {
      setOverBlockId(null);
      return;
    }
    if (activeId === overId) return;
    setOverBlockId(overId);
    setBlocks((prev) => {
      const next = applyBlockDropPreview(prev, activeId, overId);
      return next ?? prev;
    });
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    if (noteBlockDragActive.current) {
      setBlocks(dragStartBlocksRef.current);
    }
    setActiveBlockId(null);
    setActiveDragDocId(null);
    setOverBlockId(null);
    noteBlockDragActive.current = false;
  }, []);

  const handleReparentDocument = useCallback(async (movingDocId: string, newParentId: string | null) => {
    const movingDoc = documents.find((d) => d.id === movingDocId);
    if (!movingDoc || movingDoc.parent_id === newParentId) return;

    const oldParentId = movingDoc.parent_id;
    const prevDocuments = documents;

    setDocuments((prev) =>
      prev.map((d) => (d.id === movingDocId ? { ...d, parent_id: newParentId } : d)),
    );

    try {
      const res = await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: movingDocId, parent_id: newParentId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '문서 이동 실패');
      }

      if (newParentId === null) {
        setBlocks((prev) =>
          prev.filter((b) => !(b.type === 'page' && b.content?.page_document_id === movingDocId)),
        );
      }

      if (oldParentId) {
        const oldBlocksRes = await fetch(
          `/api/admin/note/blocks?documentId=${encodeURIComponent(oldParentId)}`,
          { credentials: 'include' },
        );
        if (oldBlocksRes.ok) {
          const oldJson = (await oldBlocksRes.json()) as { blocks?: NoteBlock[] };
          const linked = (oldJson.blocks ?? []).filter(
            (b) => b.type === 'page' && b.content?.page_document_id === movingDocId,
          );
          await Promise.all(
            linked.map((b) =>
              fetch(`/api/admin/note/blocks?id=${encodeURIComponent(b.id)}`, {
                method: 'DELETE',
                credentials: 'include',
              }),
            ),
          );
          if (selectedId === oldParentId) {
            setBlocks((prev) =>
              prev.filter((b) => !(b.type === 'page' && b.content?.page_document_id === movingDocId)),
            );
          }
        }
      }

      if (newParentId) {
        let parentBlocks: NoteBlock[] = [];
        if (newParentId === selectedId) {
          parentBlocks = blocksRef.current;
        } else {
          const newBlocksRes = await fetch(
            `/api/admin/note/blocks?documentId=${encodeURIComponent(newParentId)}`,
            { credentials: 'include' },
          );
          if (newBlocksRes.ok) {
            const newJson = (await newBlocksRes.json()) as { blocks?: NoteBlock[] };
            parentBlocks = newJson.blocks ?? [];
          }
        }
        const orphans = findOrphanSubPageDocuments(
          [{ id: movingDocId, title: movingDoc.title }],
          parentBlocks,
        );
        const insertPlans = planOrphanSubPageBlockInserts(orphans, parentBlocks);
        for (const plan of insertPlans) {
          const createRes = await fetch('/api/admin/note/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              documentId: newParentId,
              type: 'page',
              content: plan.content,
              order_index: plan.order_index,
              parent_block_id: null,
            }),
          });
          if (createRes.ok && newParentId === selectedId) {
            const created = (await createRes.json()) as { block: NoteBlock };
            setBlocks((prev) => [...prev, created.block]);
          }
        }
      }

      triggerSave();
    } catch (e) {
      devLogger.error('[Note] reparentDocument', e);
      setDocuments(prevDocuments);
      setError(e instanceof Error ? e.message : '문서 이동 실패');
    }
  }, [documents, selectedId, triggerSave]);

  const persistBlockReparent = useCallback(async (
    moving: NoteBlock,
    plan: BlockDropPlan<NoteBlock>,
    prevBlocks: NoteBlock[],
  ) => {
    if (!plan) return;
    const oldParentId = moving.parent_block_id ?? null;
    const parentChanged = oldParentId !== plan.targetParentId;
    const contentPatch = buildReparentContentPatch(moving.content, moving.type, plan.placedInToggle);
    const oldSiblings = parentChanged
      ? getBlocksInParent(prevBlocks, oldParentId)
        .filter((block) => block.id !== moving.id)
        .map((block, index) => ({ ...block, order_index: index }))
      : [];

    const orders = [
      ...plan.targetSiblings.map((block, index) => ({ id: block.id, order_index: index })),
      ...oldSiblings.map((block) => ({ id: block.id, order_index: block.order_index })),
    ];

    try {
      await fetch('/api/admin/note/blocks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: moving.id,
          parent_block_id: plan.targetParentId,
          order_index: plan.targetSiblings.findIndex((block) => block.id === moving.id),
          ...(contentPatch ? { content: contentPatch } : {}),
        }),
      });
      await fetch('/api/admin/note/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orders }),
      });
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] reparentBlock', e);
    }
  }, [triggerSave]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveBlockId(null);
    setActiveDragDocId(null);
    setOverBlockId(null);
    const wasBlockDrag = noteBlockDragActive.current;
    noteBlockDragActive.current = false;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // 사이드바 문서 드래그 → 부모 변경
    if (activeId.startsWith('doc-drag:')) {
      const movingDocId = activeId.slice('doc-drag:'.length);
      if (overId === 'doc-root' || overId === 'doc-root-bottom' || overId === 'doc-workspace-root') {
        await handleReparentDocument(movingDocId, null);
        return;
      }
      if (overId.startsWith('doc-drop:')) {
        const targetDocumentId = overId.slice('doc-drop:'.length);
        if (movingDocId === targetDocumentId) return;
        const docMap = new Map(documents.map((d) => [d.id, d]));
        if (isDocumentDescendantOf(targetDocumentId, movingDocId, docMap)) {
          setError('하위 페이지 안으로는 이동할 수 없습니다.');
          return;
        }
        await handleReparentDocument(movingDocId, targetDocumentId);
        return;
      }
      if (overId.startsWith('doc:')) {
        const targetDocumentId = overId.slice('doc:'.length);
        if (movingDocId === targetDocumentId) return;
        const docMap = new Map(documents.map((d) => [d.id, d]));
        if (isDocumentDescendantOf(targetDocumentId, movingDocId, docMap)) {
          setError('하위 페이지 안으로는 이동할 수 없습니다.');
          return;
        }
        await handleReparentDocument(movingDocId, targetDocumentId);
      }
      return;
    }

    // Drop target is a document (sidebar DocItem) — 블록 이동
    if (overId.startsWith('doc:')) {
      const targetDocumentId = overId.slice('doc:'.length);
      const movingBlock = blocksRef.current.find((b) => b.id === activeId);
      if (!movingBlock) return;

      // If dropping onto current document: move block to top of this document
      if (targetDocumentId === selectedId) {
        setBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === movingBlock.id);
          if (idx < 0) return prev;
          const moved = [prev[idx], ...prev.slice(0, idx), ...prev.slice(idx + 1)];
          const { normalized, depthPatches } = normalizeDepthByOrder(moved);
          void persistOrderAndDepth(normalized, depthPatches);
          return normalized;
        });
        return;
      }

      // Move across documents (server will compute target min-1 order_index)
      try {
        const res = await fetch('/api/admin/note/blocks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: movingBlock.id, document_id: targetDocumentId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || '블록 이동 실패');
        }
        // Remove from current document view
        setBlocks((prev) => prev.filter((b) => b.id !== movingBlock.id));
        triggerSave();
      } catch (e) {
        devLogger.error('[Note] moveBlockToDoc', e);
        setError(e instanceof Error ? e.message : '블록 이동 실패');
      }
      return;
    }

    const prevBlocks = blocksRef.current;
    const moving = prevBlocks.find((block) => block.id === active.id);
    if (!moving) return;

    const overBlock = prevBlocks.find((block) => block.id === overId);
    if (overBlock?.type === 'page') {
      const targetDocId =
        typeof overBlock.content?.page_document_id === 'string'
          ? overBlock.content.page_document_id.trim()
          : '';
      if (targetDocId && targetDocId !== selectedId) {
        const descendantIds = collectDescendantBlockIds(moving.id, prevBlocks);
        const idsToMove = [moving.id, ...Array.from(descendantIds)];
        try {
          for (const blockId of idsToMove) {
            const res = await fetch('/api/admin/note/blocks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                id: blockId,
                document_id: targetDocId,
                ...(blockId === moving.id ? { parent_block_id: null } : {}),
              }),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => null);
              throw new Error(j?.error || '블록 이동 실패');
            }
          }
          setBlocks((prev) => prev.filter((block) => !idsToMove.includes(block.id)));
          triggerSave();
        } catch (e) {
          devLogger.error('[Note] moveBlockToSubPage', e);
          setError(e instanceof Error ? e.message : '하위 페이지로 블록 이동 실패');
        }
        return;
      }
    }

    const plan = wasBlockDrag
      ? planBlockDrop(blocksRef.current, moving.id, overId)
      : planBlockDrop(prevBlocks, moving.id, overId);
    if (!plan) return;

    const targetMap = new Map(plan.targetSiblings.map((block) => [block.id, block]));
    const oldParentId = moving.parent_block_id ?? null;
    const parentChanged = oldParentId !== plan.targetParentId;
    const oldSiblings = parentChanged
      ? getBlocksInParent(prevBlocks, oldParentId)
        .filter((block) => block.id !== moving.id)
        .map((block, index) => ({ ...block, order_index: index }))
      : [];
    const oldMap = new Map(oldSiblings.map((block) => [block.id, block]));
    const contentPatch = buildReparentContentPatch(moving.content, moving.type, plan.placedInToggle);

    setBlocks((prev) => {
      const next = prev.map((block) => {
        if (block.id === moving.id) {
          return {
            ...block,
            parent_block_id: plan.targetParentId,
            order_index: plan.targetSiblings.findIndex((item) => item.id === moving.id),
            content: contentPatch ?? block.content,
          };
        }
        if (targetMap.has(block.id)) return targetMap.get(block.id)!;
        if (oldMap.has(block.id)) return oldMap.get(block.id)!;
        return block;
      });

      if (plan.targetParentId === null) {
        const rootOnly = sortRootBlocks(next);
        const { normalized, depthPatches } = normalizeDepthByOrder(rootOnly);
        const depthMap = new Map(normalized.map((block) => [block.id, block]));
        const withDepth = next.map((block) => depthMap.get(block.id) ?? block);
        void persistBlockReparent(moving, plan, prevBlocks);
        if (depthPatches.length > 0) {
          void Promise.all(
            depthPatches.map((patch) =>
              fetch('/api/admin/note/blocks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: patch.id, content: patch.content }),
              }),
            ),
          ).catch((e) => devLogger.error('[Note] depth-sync-after-reparent', e));
        }
        return withDepth;
      }

      void persistBlockReparent(moving, plan, prevBlocks);
      return next;
    });
  }, [normalizeDepthByOrder, persistBlockReparent, persistOrderAndDepth, selectedId, triggerSave, handleReparentDocument, documents]);

  /* handlers */
  const handleGoToDashboard = useCallback(() => {
    setDesktopOpen(true);
    setMobileOpen(false);
    router.push('/admin');
  }, [router, setDesktopOpen, setMobileOpen]);

  const handleSelectDocument = (doc: NoteDocument) => {
    setSelectedId(doc.id);
    setFocusedToggleId(null);
    setFocusedEditorBlockId(null);
    setEmptyPagePickerOpen(false);
    setShowDocIconPicker(false);
    setSidebarIconPicker(null);
    setMobileTab('editor');
    closeAll();
    router.replace(`/admin/note?id=${encodeURIComponent(doc.id)}`);
  };

  const handleNavigateToWorkspace = useCallback(() => {
    setSelectedId(null);
    setBlocks([]);
    setMobileTab('editor');
    closeAll();
    router.replace('/admin/note');
  }, [closeAll, router]);

  const handleUpdateDocProperties = useCallback(async (
    docId: string,
    properties: NoteDocument['properties'],
  ) => {
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, properties } : d)));
    try {
      await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: docId, properties }),
      });
      triggerSave();
    } catch (e) { devLogger.error('[Note] updateDocProperties', e); }
  }, [triggerSave]);

  const handleSetDocumentIcon = useCallback(async (docId: string, icon: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const trimmed = icon.trim().slice(0, 4);
    const base = { ...(doc.properties ?? {}) };
    if (trimmed) {
      base.icon = trimmed;
    } else {
      delete base.icon;
    }
    const nextProperties = Object.keys(base).length > 0 ? base : null;
    await handleUpdateDocProperties(docId, nextProperties);
    setShowDocIconPicker(false);
    setSidebarIconPicker(null);
  }, [documents, handleUpdateDocProperties]);

  const openSidebarIconPicker = useCallback((doc: NoteDocument, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSidebarIconPicker({ docId: doc.id, top: rect.bottom + 4, left: rect.left });
    setSidebarIconDraft(resolveDocIcon(doc.properties) ?? '');
  }, []);

  const handleCreateDocumentInGroup = useCallback(async (group: string) => {
    const trimmedGroup = group.trim();
    const properties = trimmedGroup ? { group: trimmedGroup } : null;
    try {
      setLoadingState('loading');
      const res = await fetch('/api/admin/note/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '제목 없음' }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '생성 실패'); }
      const json = (await res.json()) as { document: NoteDocument };
      const newDoc = { ...json.document, properties };
      if (properties) {
        await fetch('/api/admin/note/documents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: newDoc.id, properties }),
        });
      }
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedId(newDoc.id);
      setMobileTab('editor');
      setViewMode('list');
      closeAll();
      router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
    } catch (e) {
      devLogger.error('[Note] createDocInGroup', e);
      setError(e instanceof Error ? e.message : '생성 실패');
    } finally { setLoadingState('idle'); }
  }, [closeAll, router]);

  const handleMoveDocumentToGroup = useCallback(async (docId: string, group: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const base = { ...(doc.properties ?? {}) };
    if (group === BOARD_DEFAULT_GROUP) {
      delete base.group;
    } else {
      base.group = group;
    }
    const nextProperties = Object.keys(base).length > 0 ? base : null;
    await handleUpdateDocProperties(docId, nextProperties);
  }, [documents, handleUpdateDocProperties]);

  const handleRenameBoardGroup = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed || oldName === BOARD_DEFAULT_GROUP) return;
    const targets = documents.filter((d) => (d.properties?.group ?? BOARD_DEFAULT_GROUP) === oldName);
    for (const doc of targets) {
      await handleUpdateDocProperties(doc.id, { ...(doc.properties ?? {}), group: trimmed });
    }
  }, [documents, handleUpdateDocProperties]);

  const handleDeleteBoardGroup = useCallback(async (group: string) => {
    if (group === BOARD_DEFAULT_GROUP) return;
    const targets = documents.filter((d) => d.properties?.group === group);
    for (const doc of targets) {
      await handleMoveDocumentToGroup(doc.id, BOARD_DEFAULT_GROUP);
    }
  }, [documents, handleMoveDocumentToGroup]);

  const handleReorderBoardGroup = useCallback(async (group: string, orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const doc = documents.find((d) => d.id === orderedIds[i]);
      if (!doc) continue;
      const base = { ...(doc.properties ?? {}) };
      if (group === BOARD_DEFAULT_GROUP) {
        delete base.group;
      } else {
        base.group = group;
      }
      base.board_order = i;
      await handleUpdateDocProperties(orderedIds[i], base);
    }
  }, [documents, handleUpdateDocProperties]);

  const handleOpenDocumentById = useCallback((documentId: string) => {
    setSelectedId(documentId);
    setFocusedToggleId(null);
    setFocusedEditorBlockId(null);
    setEmptyPagePickerOpen(false);
    setShowDocIconPicker(false);
    setSidebarIconPicker(null);
    setMobileTab('editor');
    closeAll();
    router.replace(`/admin/note?id=${encodeURIComponent(documentId)}`);
  }, [router, closeAll]);

  const showFormatToolbar = useCallback((
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    position: { top: number; left: number },
  ) => {
    setFormatToolbar({ applyMark, applyTextStyle, position });
  }, []);

  const hideFormatToolbar = useCallback(() => {
    setFormatToolbar(null);
  }, []);

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

  /** 노션 방식: 문서(parent_id) + 부모 본문 page 블록을 항상 함께 생성 */
  const handleCreateSubPage = useCallback(async (
    parentDocumentId: string,
    options?: {
      insertAfterBlockId?: string;
      insertIndex?: number;
      parentBlockId?: string | null;
      navigateToChild?: boolean;
      title?: string;
    },
  ) => {
    const {
      insertAfterBlockId,
      insertIndex: explicitInsertIndex,
      parentBlockId = null,
      navigateToChild = false,
      title = '제목 없음',
    } = options ?? {};

    try {
      setLoadingState('saving');
      setError(null);

      const createDocRes = await fetch('/api/admin/note/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, parent_id: parentDocumentId }),
      });
      if (!createDocRes.ok) {
        const j = await createDocRes.json().catch(() => null);
        throw new Error(j?.error || '하위 페이지 생성 실패');
      }
      const created = (await createDocRes.json()) as { document: NoteDocument };
      const newDoc = created.document;
      setDocuments((prev) => [newDoc, ...prev]);

      let siblingBlocks: NoteBlock[];
      if (parentDocumentId === selectedId) {
        siblingBlocks = blocksRef.current
          .filter((b) => (b.parent_block_id ?? null) === parentBlockId)
          .sort((a, b) => a.order_index - b.order_index);
      } else {
        const blocksRes = await fetch(
          `/api/admin/note/blocks?documentId=${encodeURIComponent(parentDocumentId)}`,
          { credentials: 'include' },
        );
        if (!blocksRes.ok) throw new Error('부모 문서 블록 조회 실패');
        const blocksJson = (await blocksRes.json()) as { blocks?: NoteBlock[] };
        siblingBlocks = (blocksJson.blocks ?? [])
          .filter((b) => (b.parent_block_id ?? null) === parentBlockId)
          .sort((a, b) => a.order_index - b.order_index);
      }

      let insertIndex = siblingBlocks.length;
      if (typeof explicitInsertIndex === 'number') {
        insertIndex = Math.max(0, Math.min(explicitInsertIndex, siblingBlocks.length));
      } else if (insertAfterBlockId) {
        const afterIdx = siblingBlocks.findIndex((b) => b.id === insertAfterBlockId);
        insertIndex = afterIdx >= 0 ? afterIdx + 1 : siblingBlocks.length;
      }

      const pageBlockContent = { page_document_id: newDoc.id, title: newDoc.title };
      const blockRes = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: parentDocumentId,
          type: 'page',
          content: pageBlockContent,
          order_index: insertIndex,
          parent_block_id: parentBlockId,
        }),
      });
      if (!blockRes.ok) {
        const j = await blockRes.json().catch(() => null);
        throw new Error(j?.error || '하위 페이지 블록 추가 실패');
      }
      const blockJson = (await blockRes.json()) as { block: NoteBlock };
      const newBlock = blockJson.block;

      if (parentDocumentId === selectedId) {
        const nextSiblings = [
          ...siblingBlocks.slice(0, insertIndex),
          newBlock,
          ...siblingBlocks.slice(insertIndex),
        ].map((block, index) => ({ ...block, order_index: index }));
        const siblingIds = new Set(nextSiblings.map((b) => b.id));
        setBlocks((prev) => {
          const others = prev.filter((b) => !siblingIds.has(b.id));
          return [...others, ...nextSiblings];
        });
        undoCreateBlockIdRef.current = newBlock.id;
        setShowCreateUndo(true);
        void fetch('/api/admin/note/blocks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            orders: nextSiblings.map((b) => ({ id: b.id, order_index: b.order_index })),
          }),
        }).then(() => triggerSave()).catch((e) => devLogger.error('[Note] subPageBlockOrder', e));
      } else {
        triggerSave();
      }

      if (navigateToChild) {
        setSelectedId(newDoc.id);
        setFocusedToggleId(null);
        setFocusedEditorBlockId(null);
        setEmptyPagePickerOpen(false);
        setEmptyPagePickerAnchor(null);
        setMobileTab('editor');
        closeAll();
        router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
      }
    } catch (e) {
      devLogger.error('[Note] createSubPage', e);
      setError(e instanceof Error ? e.message : '하위 페이지 생성 실패');
    } finally {
      setLoadingState('idle');
    }
  }, [selectedId, triggerSave, closeAll, router]);

  const handleCreateDocument = async (
    parentId: string | null = null,
    options?: { navigateToChild?: boolean },
  ) => {
    if (parentId) {
      await handleCreateSubPage(parentId, {
        navigateToChild: options?.navigateToChild ?? true,
      });
      return;
    }
    try {
      setLoadingState('loading'); setError(null);
      const res = await fetch('/api/admin/note/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '제목 없음', parent_id: null }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '문서 생성 실패'); }
      const json = (await res.json()) as { document: NoteDocument };
      const newDoc = json.document;
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedId(newDoc.id);
      setFocusedToggleId(null);
      setFocusedEditorBlockId(null);
      setMobileTab('editor');
      closeAll();
      router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
    } catch (e) { devLogger.error('[Note] createDoc', e); setError(e instanceof Error ? e.message : '생성 실패'); }
    finally { setLoadingState('idle'); }
  };

  const handleTogglePublic = useCallback(async (doc: NoteDocument) => {
    const next = !doc.is_public;
    setTogglingPublic(true);
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_public: next } : d)));
    try {
      const res = await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: doc.id, is_public: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '공개 설정 변경 실패');
      }
      const json = (await res.json()) as { document: NoteDocument };
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? json.document : d)));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] togglePublic', e);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_public: doc.is_public } : d)));
      setError(e instanceof Error ? e.message : '공개 설정 변경 실패');
    } finally {
      setTogglingPublic(false);
    }
  }, [triggerSave]);

  const handleCopyPublicLink = useCallback(async (doc: NoteDocument) => {
    if (!doc.share_token) return;
    const url = `${window.location.origin}/note/p/${doc.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareLinkCopied(true);
      window.setTimeout(() => setShareLinkCopied(false), 2000);
    } catch {
      setError('링크 복사에 실패했습니다.');
    }
  }, []);

  const persistDocumentTitle = useCallback(async (docId: string, safeTitle: string) => {
    try {
      const res = await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: docId, title: safeTitle }),
      });
      if (res.ok) {
        const json = (await res.json()) as { document?: NoteDocument };
        if (json.document?.title) {
          setDocuments((prev) =>
            prev.map((d) => (d.id === docId ? { ...d, title: json.document!.title } : d)),
          );
        }
      }
      const linkedPageBlocks = blocksRef.current.filter(
        (b) => b.type === 'page' && b.content?.page_document_id === docId,
      );
      if (linkedPageBlocks.length > 0) {
        setBlocks((prev) =>
          prev.map((b) => (
            b.type === 'page' && b.content?.page_document_id === docId
              ? { ...b, content: { ...b.content, title: safeTitle } }
              : b
          )),
        );
      }
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] renameDoc', e);
    }
  }, [triggerSave]);

  const handleRenameDocument = useCallback((docId: string, title: string, options?: { immediate?: boolean }) => {
    // 입력 중에는 trim 하지 않음 — 띄어쓰기가 즉시 사라지는 버그 방지
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, title } : d)));
    const timers = saveTimersRef.current;
    const timerKey = `doc_${docId}`;
    if (timers[timerKey]) clearTimeout(timers[timerKey]);
    const runSave = () => {
      const latestRaw = titleInputRef.current?.value ?? title;
      const normalized = latestRaw.trim() || '제목 없음';
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, title: normalized } : d)),
      );
      void persistDocumentTitle(docId, normalized);
    };
    if (options?.immediate) {
      runSave();
      return;
    }
    timers[timerKey] = window.setTimeout(runSave, 600);
  }, [persistDocumentTitle]);

  const reloadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/note/documents', { credentials: 'include' });
      if (!res.ok) return;
      const json = (await res.json()) as { documents?: NoteDocument[] };
      setDocuments(json.documents ?? []);
    } catch (e) {
      devLogger.error('[Note] reloadDocuments', e);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'board') void reloadDocuments();
  }, [viewMode, reloadDocuments]);

  const handleTogglePin = async (e: React.MouseEvent, doc: NoteDocument) => {
    e.stopPropagation();
    const next = !doc.is_pinned;
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_pinned: next } : d)));
    try {
      await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: doc.id, is_pinned: next }),
      });
    } catch (err) { devLogger.error('[Note] togglePin', err); }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, doc: NoteDocument) => {
    e.stopPropagation();
    const next = !doc.is_favorite;
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_favorite: next } : d)));
    try { await fetch('/api/admin/note/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: doc.id, is_favorite: next }) }); }
    catch (err) { devLogger.error('[Note] toggleFavorite', err); }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, doc: NoteDocument) => {
    e.stopPropagation();
    if (!window.confirm(`"${doc.title}" 문서를 휴지통으로 이동할까요?\n부모 페이지의 링크도 함께 제거됩니다.`)) return;
    const prevDocs = documents;
    const prevBlocks = blocksRef.current;
    setDocuments((p) => p.filter((d) => d.id !== doc.id));
    setBlocks((p) => p.filter((b) => !(b.type === 'page' && b.content?.page_document_id === doc.id)));
    if (selectedId === doc.id) { setSelectedId(null); router.replace('/admin/note'); }
    try {
      if (doc.parent_id) {
        const parentBlocksRes = await fetch(
          `/api/admin/note/blocks?documentId=${encodeURIComponent(doc.parent_id)}`,
          { credentials: 'include' },
        );
        if (parentBlocksRes.ok) {
          const parentJson = (await parentBlocksRes.json()) as { blocks?: NoteBlock[] };
          const linkedBlocks = (parentJson.blocks ?? []).filter(
            (b) => b.type === 'page' && b.content?.page_document_id === doc.id,
          );
          await Promise.all(
            linkedBlocks.map((b) =>
              fetch(`/api/admin/note/blocks?id=${encodeURIComponent(b.id)}`, {
                method: 'DELETE',
                credentials: 'include',
              }),
            ),
          );
        }
      }
      const res = await fetch(`/api/admin/note/documents?id=${encodeURIComponent(doc.id)}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('삭제 실패');
    } catch (err) {
      devLogger.error('[Note] deleteDoc', err);
      setDocuments(prevDocs);
      setBlocks(prevBlocks);
      setError('문서 삭제 실패');
    }
  };

  const handleRestoreDocument = useCallback(async (doc: NoteDocument) => {
    try {
      setLoadingState('saving');
      const res = await fetch('/api/admin/note/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: doc.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '복구 실패');
      }
      // 휴지통 목록에서 제거
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] restoreDoc', e);
      setError(e instanceof Error ? e.message : '복구 실패');
    } finally {
      setLoadingState('idle');
    }
  }, [triggerSave]);

  const handlePurgeDocument = useCallback(async (doc: NoteDocument) => {
    const deletedAt = doc.deleted_at ? new Date(doc.deleted_at).getTime() : null;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const eligible = deletedAt ? (Date.now() - deletedAt >= sevenDaysMs) : false;
    if (!eligible) {
      setError('삭제 후 7일이 지난 문서만 영구삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm(`"${doc.title}" 문서를 영구삭제할까요? (복구 불가)`)) return;
    try {
      setLoadingState('saving');
      const res = await fetch(`/api/admin/note/trash/purge?id=${encodeURIComponent(doc.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '영구삭제 실패');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] purgeDoc', e);
      setError(e instanceof Error ? e.message : '영구삭제 실패');
    } finally {
      setLoadingState('idle');
    }
  }, [triggerSave]);

  const handleUpdateBlock = useCallback((block: NoteBlock, content: any) => {
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, content } : b)));
    setLoadingState('saving');
    const timers = saveTimersRef.current;
    if (timers[block.id]) clearTimeout(timers[block.id]);
    timers[block.id] = window.setTimeout(async () => {
      try {
        const latest = blocksRef.current.find((b) => b.id === block.id);
        const contentToSave = latest?.content ?? content;
        await fetch('/api/admin/note/blocks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: block.id, content: contentToSave }),
        });
        delete timers[block.id];
        if (Object.keys(timers).filter((k) => !k.startsWith('doc_')).length === 0) triggerSave();
      } catch (e) { devLogger.error('[Note] updateBlock', e); setLoadingState('idle'); }
    }, 600);
  }, [triggerSave]);

  const registerCreatedBlockUndo = useCallback((blockId: string) => {
    undoCreateBlockIdRef.current = blockId;
    setShowCreateUndo(true);
  }, []);

  const applyBlockReparentPlan = useCallback((moving: NoteBlock, plan: BlockDropPlan<NoteBlock>) => {
    const prevBlocks = blocksRef.current;
    const targetMap = new Map(plan.targetSiblings.map((item) => [item.id, item]));
    const oldParentId = moving.parent_block_id ?? null;
    const parentChanged = oldParentId !== plan.targetParentId;
    const oldSiblings = parentChanged
      ? getBlocksInParent(prevBlocks, oldParentId)
        .filter((item) => item.id !== moving.id)
        .map((item, index) => ({ ...item, order_index: index }))
      : [];
    const oldMap = new Map(oldSiblings.map((item) => [item.id, item]));
    const contentPatch = buildReparentContentPatch(moving.content, moving.type, plan.placedInToggle);

    setBlocks((prev) => {
      const next = prev.map((item) => {
        if (item.id === moving.id) {
          return {
            ...item,
            parent_block_id: plan.targetParentId,
            order_index: plan.targetSiblings.findIndex((sibling) => sibling.id === moving.id),
            content: contentPatch ?? item.content,
          };
        }
        if (targetMap.has(item.id)) return targetMap.get(item.id)!;
        if (oldMap.has(item.id)) return oldMap.get(item.id)!;
        return item;
      });

      if (plan.targetParentId === null) {
        const rootOnly = sortRootBlocks(next);
        const { normalized, depthPatches } = normalizeDepthByOrder(rootOnly);
        const depthMap = new Map(normalized.map((item) => [item.id, item]));
        const withDepth = next.map((item) => depthMap.get(item.id) ?? item);
        void persistBlockReparent(moving, plan, prevBlocks);
        if (depthPatches.length > 0) {
          void Promise.all(
            depthPatches.map((patch) =>
              fetch('/api/admin/note/blocks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: patch.id, content: patch.content }),
              }),
            ),
          ).catch((e) => devLogger.error('[Note] depth-sync-after-tab-reparent', e));
        }
        return withDepth;
      }

      void persistBlockReparent(moving, plan, prevBlocks);
      return next;
    });
    syncFocusedToggleFromBlock(moving.id);
  }, [normalizeDepthByOrder, persistBlockReparent, syncFocusedToggleFromBlock]);

  const handleIndentBlock = useCallback((block: NoteBlock, direction: 'in' | 'out') => {
    const prevBlocks = blocksRef.current;
    const tabPlan = planBlockTabIndent(prevBlocks, block.id, direction);
    if (tabPlan) {
      applyBlockReparentPlan(block, tabPlan);
      return;
    }

    // 루트 블록만 content.depth 시각 들여쓰기 (토글 없는 경우 폴백)
    if (block.parent_block_id) return;

    const content = (block.content ?? {}) as Record<string, unknown>;
    const currentDepth = Math.max(0, Math.min(6, Number(content.depth ?? 0)));
    const ordered = sortRootBlocks(prevBlocks);
    const idx = ordered.findIndex((item) => item.id === block.id);
    if (idx < 0) return;
    const prevDepth =
      idx > 0
        ? Math.max(0, Math.min(6, Number((ordered[idx - 1]?.content as Record<string, unknown> | undefined)?.depth ?? 0)))
        : 0;
    let nextDepth = currentDepth;
    if (direction === 'in') {
      if (idx === 0) {
        nextDepth = Math.min(6, currentDepth + 1);
      } else {
        nextDepth = Math.min(6, currentDepth + 1, prevDepth + 1);
      }
    } else {
      const oneStepOut = Math.max(0, currentDepth - 1);
      nextDepth = idx === 0 ? 0 : Math.min(oneStepOut, prevDepth + 1);
    }
    if (nextDepth === currentDepth) return;
    handleUpdateBlock(block, { ...content, depth: nextDepth });
  }, [applyBlockReparentPlan, handleUpdateBlock]); // handleUpdateBlock: visual depth fallback용

  const handleNavigateBlock = useCallback((block: NoteBlock, direction: 'previous' | 'next') => {
    const siblings = filterSiblingBlocks(blocks, block);
    const idx = siblings.findIndex((b) => b.id === block.id);
    if (idx < 0) return;
    const target = direction === 'previous' ? siblings[idx - 1] : siblings[idx + 1];
    if (target) focusBlockEditor(target.id);
  }, [blocks, focusBlockEditor]);

  const insertBlockAmongSiblings = useCallback(async (
    parentId: string | null,
    type: NoteBlock['type'],
    insertIndex: number,
    options?: { content?: Record<string, unknown>; focus?: boolean; registerUndo?: boolean },
  ): Promise<NoteBlock | null> => {
    if (!selectedId) return null;
    try {
      setLoadingState('saving');
      const siblings = blocksRef.current
        .filter((b) => (b.parent_block_id ?? null) === parentId)
        .sort((a, b) => a.order_index - b.order_index);
      const clampedIndex = Math.max(0, Math.min(insertIndex, siblings.length));
      const parentBlock = parentId ? blocksRef.current.find((b) => b.id === parentId) : null;
      const insideToggle = parentBlock?.type === 'toggle';
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: selectedId,
          type,
          content: options?.content ?? defaultBlockContent(type, { insideToggle }),
          order_index: clampedIndex,
          parent_block_id: parentId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '블록 추가 실패');
      }
      const json = (await res.json()) as { block: NoteBlock };
      const nextSiblings = [...siblings.slice(0, clampedIndex), json.block, ...siblings.slice(clampedIndex)]
        .map((block, index) => ({ ...block, order_index: index }));
      const siblingIds = new Set(nextSiblings.map((block) => block.id));
      setBlocks((prev) => {
        const others = prev.filter((block) => !siblingIds.has(block.id));
        return [...others, ...nextSiblings];
      });
      if (options?.focus !== false) {
        focusBlockEditor(json.block.id, type === 'toggle' ? 'title' : 'editor');
      }
      if (options?.registerUndo !== false) registerCreatedBlockUndo(json.block.id);
      void fetch('/api/admin/note/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orders: nextSiblings.map((block) => ({ id: block.id, order_index: block.order_index })) }),
      }).then(() => triggerSave()).catch((e) => devLogger.error('[Note] normalizeInsertOrder', e));
      return json.block;
    } catch (e) {
      devLogger.error('[Note] insertBlockAmongSiblings', e);
      setError(e instanceof Error ? e.message : '블록 추가 실패');
      setLoadingState('idle');
      return null;
    }
  }, [selectedId, triggerSave, focusBlockEditor, registerCreatedBlockUndo]);

  const duplicateBlockRecursive = useCallback(async (
    source: NoteBlock,
    parentId: string | null,
    insertIndex: number,
  ): Promise<NoteBlock | null> => {
    const clonedContent = JSON.parse(JSON.stringify(source.content ?? defaultBlockContent(source.type))) as Record<string, unknown>;
    const created = await insertBlockAmongSiblings(parentId, source.type, insertIndex, {
      content: clonedContent,
      focus: false,
      registerUndo: false,
    });
    if (!created) return null;

    const children = getBlocksInParent(blocksRef.current, source.id);
    for (let i = 0; i < children.length; i++) {
      await duplicateBlockRecursive(children[i], created.id, i);
    }
    return created;
  }, [insertBlockAmongSiblings]);

  const handleDuplicateBlock = useCallback(async (block: NoteBlock) => {
    if (!selectedId || block.type === 'page') return;
    const parentId = block.parent_block_id ?? null;
    const siblings = getBlocksInParent(blocksRef.current, parentId);
    const idx = siblings.findIndex((b) => b.id === block.id);
    const insertIndex = idx >= 0 ? idx + 1 : siblings.length;
    const created = await duplicateBlockRecursive(block, parentId, insertIndex);
    if (created) {
      focusBlockEditor(created.id);
      registerCreatedBlockUndo(created.id);
    }
  }, [selectedId, duplicateBlockRecursive, focusBlockEditor, registerCreatedBlockUndo]);

  const handleInsertBlockAfter = useCallback(async (afterBlock: NoteBlock, type: NoteBlock['type'] = 'text') => {
    if (type === 'page') {
      if (!selectedId) return;
      await handleCreateSubPage(selectedId, {
        insertAfterBlockId: afterBlock.id,
        parentBlockId: afterBlock.parent_block_id ?? null,
        navigateToChild: false,
      });
      return;
    }
    const parentId = afterBlock.parent_block_id ?? null;
    const siblings = blocksRef.current
      .filter((b) => (b.parent_block_id ?? null) === parentId)
      .sort((a, b) => a.order_index - b.order_index);
    const afterIndex = siblings.findIndex((b) => b.id === afterBlock.id);
    const insertIndex = afterIndex >= 0 ? afterIndex + 1 : siblings.length;
    await insertBlockAmongSiblings(parentId, type, insertIndex);
  }, [insertBlockAmongSiblings, handleCreateSubPage, selectedId]);

  const handleInsertBlockInParent = useCallback(async (parentBlockId: string, type: NoteBlock['type'] = 'text') => {
    if (!selectedId) return;
    if (type === 'page') {
      const siblings = blocksRef.current
        .filter((b) => b.parent_block_id === parentBlockId)
        .sort((a, b) => a.order_index - b.order_index);
      const focusedId = focusedEditorBlockIdRef.current ?? focusedEditorBlockId;
      const focusedChild = focusedId
        ? siblings.find((b) => b.id === focusedId) ?? null
        : null;
      if (focusedChild) {
        await handleCreateSubPage(selectedId, {
          insertAfterBlockId: focusedChild.id,
          parentBlockId,
          navigateToChild: false,
        });
        return;
      }
      if (focusedId === parentBlockId) {
        await handleCreateSubPage(selectedId, {
          parentBlockId,
          insertIndex: 0,
          navigateToChild: false,
        });
        return;
      }
      const lastSibling = siblings[siblings.length - 1];
      if (lastSibling) {
        await handleCreateSubPage(selectedId, {
          insertAfterBlockId: lastSibling.id,
          parentBlockId,
          navigateToChild: false,
        });
      } else {
        await handleCreateSubPage(selectedId, { parentBlockId, navigateToChild: false });
      }
      return;
    }
    const parent = blocksRef.current.find((b) => b.id === parentBlockId);
    if (parent?.type === 'toggle') {
      const content = (parent.content ?? {}) as Record<string, unknown>;
      if (content.collapsed) {
        handleUpdateBlock(parent, { ...content, collapsed: false });
      }
    }
    const siblings = blocksRef.current
      .filter((b) => b.parent_block_id === parentBlockId)
      .sort((a, b) => a.order_index - b.order_index);
    const focusedId = focusedEditorBlockIdRef.current ?? focusedEditorBlockId;

    const focusedChild = focusedId
      ? siblings.find((b) => b.id === focusedId) ?? null
      : null;
    if (focusedChild) {
      await handleInsertBlockAfter(focusedChild, type);
      return;
    }

    if (focusedId === parentBlockId) {
      await insertBlockAmongSiblings(parentBlockId, type, 0);
      return;
    }

    if (siblings.length > 0) {
      await handleInsertBlockAfter(siblings[siblings.length - 1], type);
      return;
    }

    await insertBlockAmongSiblings(parentBlockId, type, 0);
  }, [
    selectedId,
    focusedEditorBlockId,
    handleInsertBlockAfter,
    handleUpdateBlock,
    insertBlockAmongSiblings,
    handleCreateSubPage,
  ]);

  const handleAddBlock = useCallback(async (type: NoteBlock['type']) => {
    if (!selectedId) return;
    try {
      if (type === 'image' && focusedToggleId) {
        const target = blocks.find((b) => b.id === focusedToggleId);
        if (target?.type === 'toggle') {
          const c = (target.content ?? {}) as Record<string, unknown>;
          const rawIm = c.images;
          const imgs = Array.isArray(rawIm) ? rawIm.map((u) => (typeof u === 'string' ? u : '')) : [];
          handleUpdateBlock(target, { ...c, collapsed: false, images: [...imgs, ''] });
          return;
        }
      }
      if (type === 'page') {
        await handleCreateSubPage(selectedId, {
          parentBlockId: focusedToggleId ?? null,
          navigateToChild: false,
        });
        return;
      }

      setLoadingState('saving');
      const parentBlockId = focusedToggleId ?? null;
      if (parentBlockId) {
        await handleInsertBlockInParent(parentBlockId, type);
        return;
      }

      const defaultContent = defaultBlockContent(type);
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: selectedId,
          type,
          content: defaultContent,
          parent_block_id: null,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '블록 추가 실패'); }
      const json = (await res.json()) as { block: NoteBlock };
      setBlocks((prev) => [json.block, ...prev]);
      focusBlockEditor(json.block.id, type === 'toggle' ? 'title' : 'editor');
      registerCreatedBlockUndo(json.block.id);
      triggerSave();
    } catch (e) { devLogger.error('[Note] addBlock', e); setError(e instanceof Error ? e.message : '추가 실패'); }
  }, [selectedId, triggerSave, focusedToggleId, blocks, handleUpdateBlock, focusBlockEditor, handleInsertBlockInParent, registerCreatedBlockUndo, handleCreateSubPage]);

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
    const target = e.target as HTMLElement;
    if (target.closest(
      '[data-note-block-row], button, input, textarea, a, .ProseMirror, [data-toggle-title], [data-note-ignore-whitespace]',
    )) {
      return;
    }
    e.preventDefault();
    handleClickEditorWhitespace();
  }, [handleClickEditorWhitespace]);

  const handleChangeBlockType = useCallback(async (block: NoteBlock, type: NoteBlock['type']) => {
    const defaultContent = defaultBlockContent(type);
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, type, content: defaultContent } : b)));
    focusBlockEditor(block.id, type === 'toggle' ? 'title' : 'editor');
    try {
      await fetch('/api/admin/note/blocks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: block.id, type, content: defaultContent }) });
      triggerSave();
    } catch (e) { devLogger.error('[Note] changeBlockType', e); }
  }, [focusBlockEditor, triggerSave]);

  const handleDeleteBlock = useCallback(async (block: NoteBlock, focusPrevious = false, skipDeleteUndo = false) => {
    const prevBlocks = blocksRef.current;
    const ordered = [...prevBlocks].sort((a, b) => a.order_index - b.order_index);
    const idx = ordered.findIndex((b) => b.id === block.id);
    if (idx < 0) return;

    const promotionPlan = planPromoteChildrenOnDelete(prevBlocks, block.id);
    const patchMap = promotionPlan
      ? new Map(promotionPlan.patches.map((patch) => [patch.id, patch]))
      : null;

    if (focusPrevious) {
      const siblings = filterSiblingBlocks(prevBlocks, block);
      const sibIdx = siblings.findIndex((b) => b.id === block.id);
      const nextFocus = siblings[sibIdx - 1]?.id ?? siblings[sibIdx + 1]?.id ?? null;
      if (nextFocus) focusBlockEditor(nextFocus);
    }

    setBlocks((prev) => {
      const plan = planPromoteChildrenOnDelete(prev, block.id);
      if (!plan) return prev.filter((b) => b.id !== block.id);
      const patches = new Map(plan.patches.map((patch) => [patch.id, patch]));
      return prev
        .filter((b) => b.id !== block.id)
        .map((b) => {
          const patch = patches.get(b.id);
          if (!patch) return b;
          return {
            ...b,
            parent_block_id: patch.parent_block_id,
            order_index: patch.order_index,
            ...(patch.content ? { content: patch.content } : {}),
          };
        });
    });

    try {
      if (patchMap && patchMap.size > 0) {
        await Promise.all(
          [...patchMap.values()].map((patch) =>
            fetch('/api/admin/note/blocks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                id: patch.id,
                parent_block_id: patch.parent_block_id,
                order_index: patch.order_index,
                ...(patch.content ? { content: patch.content } : {}),
              }),
            }),
          ),
        );
      }
      const res = await fetch(`/api/admin/note/blocks?id=${encodeURIComponent(block.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '삭제 실패');
      }
      if (!skipDeleteUndo) {
        setLastDeletedBlockId(block.id);
      }
      if (docTab === 'block-trash') {
        setMobileTab('list');
      }
      await loadTrashedBlocks();
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] deleteBlock', e);
      setError(e instanceof Error ? e.message : '블록 삭제 실패');
      setBlocks(prevBlocks);
    }
  }, [docTab, focusBlockEditor, loadTrashedBlocks, triggerSave]);

  const handleMergeWithPreviousBlock = useCallback(async (block: NoteBlock) => {
    const prevBlocks = blocksRef.current;
    const plan = planMergeWithPreviousBlock(prevBlocks, block.id);
    if (!plan) return;

    setBlocks((prev) => {
      const livePlan = planMergeWithPreviousBlock(prev, block.id);
      if (!livePlan) return prev;
      return prev
        .filter((b) => b.id !== livePlan.deleteId)
        .map((b) => (b.id === livePlan.previousId ? { ...b, content: livePlan.mergedContent } : b));
    });

    setMergeFocusCaretOffset(plan.caretOffset);
    focusBlockEditor(plan.previousId);

    try {
      await fetch('/api/admin/note/blocks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: plan.previousId, content: plan.mergedContent }),
      });
      await fetch(`/api/admin/note/blocks?id=${encodeURIComponent(plan.deleteId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] mergeWithPrevious', e);
      setError(e instanceof Error ? e.message : '블록 병합 실패');
      setBlocks(prevBlocks);
    } finally {
      window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
    }
  }, [focusBlockEditor, triggerSave]);

  const handleRestoreBlockFromTrash = useCallback(async (block: NoteBlock) => {
    try {
      setRestoringBlockId(block.id);
      const res = await fetch('/api/admin/note/blocks/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: block.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '블록 복구 실패');
      }
      const json = (await res.json()) as { block: NoteBlock };
      const restoredBlock = json.block;
      setTrashedBlocks((prev) => prev.filter((b) => b.id !== block.id));
      if (lastDeletedBlockId === block.id) setLastDeletedBlockId(null);
      setBlocks((prev) => {
        if (prev.some((b) => b.id === restoredBlock.id)) return prev;
        return [...prev, restoredBlock].sort((a, b) => a.order_index - b.order_index);
      });
      focusBlockEditor(restoredBlock.id);
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] restoreBlockFromTrash', e);
      setError(e instanceof Error ? e.message : '블록 복구 실패');
    } finally {
      setRestoringBlockId(null);
    }
  }, [focusBlockEditor, lastDeletedBlockId, triggerSave]);

  const handlePurgeBlockFromTrash = useCallback(async (block: NoteBlock) => {
    if (!confirm('이 블록을 영구삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      setPurgingBlockId(block.id);
      const res = await fetch(`/api/admin/note/blocks/trash/purge?id=${encodeURIComponent(block.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '블록 영구삭제 실패');
      }
      if (lastDeletedBlockId === block.id) setLastDeletedBlockId(null);
      setTrashedBlocks((prev) => prev.filter((b) => b.id !== block.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] purgeBlockFromTrash', e);
      setError(e instanceof Error ? e.message : '블록 영구삭제 실패');
    } finally {
      setPurgingBlockId(null);
    }
  }, [lastDeletedBlockId, triggerSave]);

  const handleUndoDeleteBlock = useCallback(async () => {
    const candidate = trashedBlocks.find((b) => b.id === lastDeletedBlockId) ?? trashedBlocks[0];
    if (!candidate) return;
    await handleRestoreBlockFromTrash(candidate);
  }, [handleRestoreBlockFromTrash, lastDeletedBlockId, trashedBlocks]);

  const handleUndoCreateBlock = useCallback(async () => {
    const blockId = undoCreateBlockIdRef.current;
    if (!blockId) return;
    undoCreateBlockIdRef.current = null;
    setShowCreateUndo(false);
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;
    await handleDeleteBlock(block, false, true);
  }, [handleDeleteBlock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
      if (!isUndo) return;
      const target = e.target as HTMLElement | null;
      const isEditingTarget = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        !!target.closest('[contenteditable="true"]')
      );
      if (isEditingTarget) return;
      if (!undoCreateBlockIdRef.current && !lastDeletedBlockId) return;
      e.preventDefault();
      if (undoCreateBlockIdRef.current) {
        void handleUndoCreateBlock();
        return;
      }
      void handleUndoDeleteBlock();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndoCreateBlock, handleUndoDeleteBlock, lastDeletedBlockId]);

  const toggleSidebarDocExpanded = useCallback((docId: string) => {
    setCollapsedSidebarDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const renderDocumentTree = (doc: NoteDocument, depth = 0): React.ReactNode => {
    const children = childrenByParent.get(doc.id) ?? [];
    const isExpanded = !collapsedSidebarDocs.has(doc.id);
    return (
      <div key={doc.id} className="space-y-0.5">
        <DocItem
          doc={doc}
          isActive={doc.id === selectedId}
          indentLevel={depth}
          hasChildren={children.length > 0}
          isExpanded={isExpanded}
          isChildDoc={depth > 0}
          onToggleExpand={() => toggleSidebarDocExpanded(doc.id)}
          onSelect={() => handleSelectDocument(doc)}
          onPin={(e) => handleTogglePin(e, doc)}
          onFavorite={(e) => handleToggleFavorite(e, doc)}
          onDelete={(e) => handleDeleteDocument(e, doc)}
          onCreateChild={(e) => { e.stopPropagation(); handleCreateDocument(doc.id); }}
          onEditIcon={(e) => openSidebarIconPicker(doc, e)}
        />
        {children.length > 0 && isExpanded && (
          <div className="space-y-0.5">
            {children.map((child) => renderDocumentTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderToggleInlineChild = (block: NoteBlock, nestDepth = 1): React.ReactNode => {
    const childBlocks = childrenByParentBlock.get(block.id) ?? [];
    return (
      <ToggleInlineRow
        key={block.id}
        block={block}
        nestDepth={nestDepth}
        childBlocks={childBlocks}
        renderChildBlock={renderToggleInlineChild}
        onUpdate={(content) => handleUpdateBlock(block, content)}
        onDelete={() => handleDeleteBlock(block)}
        onChangeType={(type) => handleChangeBlockType(block, type)}
        onEnter={() => handleInsertBlockAfter(block, 'text')}
        onAddBelow={(type) => { void handleInsertBlockAfter(block, type ?? block.type); }}
        onOpenDocument={handleOpenDocumentById}
        onShowFormatToolbar={showFormatToolbar}
        onHideFormatToolbar={hideFormatToolbar}
        autoFocusSignal={
          focusedEditorBlockId === block.id && focusedEditorPart !== 'title' ? focusSignal : 0
        }
        autoFocusTitleSignal={
          focusedEditorBlockId === block.id && focusedEditorPart === 'title' ? focusTitleSignal : 0
        }
        onEmptyBackspace={() => handleDeleteBlock(block, true)}
        onMergeWithPrevious={() => { void handleMergeWithPreviousBlock(block); }}
        onDuplicate={() => { void handleDuplicateBlock(block); }}
        onIndentChange={(direction) => handleIndentBlock(block, direction)}
        onNavigatePrevious={() => handleNavigateBlock(block, 'previous')}
        onNavigateNext={() => handleNavigateBlock(block, 'next')}
        focusedToggleId={focusedToggleId}
        onFocusToggle={setFocusedToggleId}
        onTrackActiveBlock={(part) => trackActiveBlock(block.id, part)}
        uploadImage={uploadNoteImage}
        isDropTarget={overBlockId === block.id}
        resolvePageIcon={resolvePageIcon}
        isFocused={focusedEditorBlockId === block.id}
        mergeFocusCaretOffset={focusedEditorBlockId === block.id ? mergeFocusCaretOffset : undefined}
        onFocusBlock={() => focusBlockEditor(block.id)}
        onAddChildBelow={
          block.type === 'toggle'
            ? (type) => { void handleInsertBlockInParent(block.id, type ?? 'text'); }
            : undefined
        }
      />
    );
  };

  const renderSortableBlock = (block: NoteBlock): React.ReactNode => {
    const childBlocks = childrenByParentBlock.get(block.id) ?? [];
    return (
      <SortableBlockRow
        key={block.id}
        block={block}
        childBlocks={childBlocks}
        renderChildBlock={renderToggleInlineChild}
        onAddChildBelow={(type) => { void handleInsertBlockInParent(block.id, type ?? 'text'); }}
        onUpdate={(content) => handleUpdateBlock(block, content)}
        onDelete={() => handleDeleteBlock(block)}
        onChangeType={(type) => handleChangeBlockType(block, type)}
        onEnter={() => handleInsertBlockAfter(block, 'text')}
        onAddBelow={(type) => handleInsertBlockAfter(block, type ?? 'text')}
        onOpenDocument={handleOpenDocumentById}
        onShowFormatToolbar={showFormatToolbar}
        onHideFormatToolbar={hideFormatToolbar}
        autoFocusSignal={
          focusedEditorBlockId === block.id && focusedEditorPart !== 'title' ? focusSignal : 0
        }
        autoFocusTitleSignal={
          focusedEditorBlockId === block.id && focusedEditorPart === 'title' ? focusTitleSignal : 0
        }
        onEmptyBackspace={() => handleDeleteBlock(block, true)}
        onMergeWithPrevious={() => { void handleMergeWithPreviousBlock(block); }}
        onDuplicate={() => { void handleDuplicateBlock(block); }}
        onIndentChange={(direction) => handleIndentBlock(block, direction)}
        onNavigatePrevious={() => handleNavigateBlock(block, 'previous')}
        onNavigateNext={() => handleNavigateBlock(block, 'next')}
        focusedToggleId={focusedToggleId}
        onFocusToggle={setFocusedToggleId}
        onTrackActiveBlock={(part) => trackActiveBlock(block.id, part)}
        uploadImage={uploadNoteImage}
        isDropTarget={overBlockId === block.id}
        resolvePageIcon={resolvePageIcon}
        isFocused={focusedEditorBlockId === block.id}
        mergeFocusCaretOffset={focusedEditorBlockId === block.id ? mergeFocusCaretOffset : undefined}
        onFocusBlock={() => focusBlockEditor(block.id)}
      />
    );
  };

  useEffect(() => {
    if (!showDocIconPicker) return;
    const t = window.setTimeout(() => {
      docIconInputRef.current?.focus();
      docIconInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [showDocIconPicker]);

  useEffect(() => {
    if (!sidebarIconPicker) return;
    const t = window.setTimeout(() => {
      sidebarIconInputRef.current?.focus();
      sidebarIconInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [sidebarIconPicker]);

  /* ── render ── */
  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-full flex-col overflow-x-hidden bg-white md:h-screen md:overflow-hidden">
      <NoteRichEditorStyles />

      {/* 모바일 상단 탭 */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3 md:hidden">
        <div className="flex items-center gap-0">
          {(['list', 'editor'] as const).map((tab) => (
            <button
              key={tab} type="button"
              className={`px-3 py-3 text-[14px] font-medium transition-colors ${
                mobileTab === tab ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-500'
              } disabled:opacity-40`}
              onClick={() => setMobileTab(tab)}
              disabled={false}
            >
              {tab === 'list' ? '목록' : '편집'}
            </button>
          ))}
        </div>
        <button
          type="button" onClick={() => handleCreateDocument(null)} disabled={loadingState === 'loading'}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />새 페이지
        </button>
      </div>

      {/* error */}
      {error && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-medium text-rose-700">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>닫기</button>
        </div>
      )}
      {showCreateUndo && (
        <div className="shrink-0 border-b border-sky-200 bg-sky-50 px-4 py-2 text-[12px] font-medium text-sky-700">
          블록을 추가했습니다.
          <button type="button" className="ml-2 underline" onClick={() => void handleUndoCreateBlock()}>
            실행 취소
          </button>
          <span className="ml-2 text-[11px] text-sky-600">
            (<kbd className="rounded border border-sky-300 bg-white px-1 py-0.5 text-[10px]">Ctrl/Cmd+Z</kbd>)
          </span>
        </div>
      )}
      {lastDeletedBlockId && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-medium text-amber-700">
          블록을 휴지통으로 이동했습니다.
          <button type="button" className="ml-2 underline" onClick={() => void handleUndoDeleteBlock()}>
            실행 취소
          </button>
          <span className="ml-2 text-[11px] text-amber-600">
            (<kbd className="rounded border border-amber-300 bg-white px-1 py-0.5 text-[10px]">Ctrl/Cmd+Z</kbd>)
          </span>
        </div>
      )}
      {/* ── 콘텐츠 ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 min-w-0 flex-1 overflow-x-hidden">

          {/* ── 노트 목록 사이드바 */}
          <div className={`flex flex-col border-r border-neutral-200/80 bg-[#f7f7f5] ${
            mobileTab === 'list' ? 'flex w-full' : 'hidden'
          } md:flex md:w-[280px] md:shrink-0`}>

          {/* 워크스페이스 헤더 */}
          <div className="shrink-0 px-3 pb-2 pt-3">
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <WorkspaceTitleDropTarget isDraggingDoc={!!activeDragDocId}>
                <button
                  type="button"
                  onClick={handleNavigateToWorkspace}
                  className="flex min-w-0 w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-neutral-200/60"
                  title={activeDragDocId ? '여기에 놓으면 최상위 페이지로 이동' : undefined}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-[11px] font-bold text-white">
                    N
                  </span>
                  <span className="truncate text-[14px] font-semibold text-neutral-800">관리자 노트</span>
                </button>
              </WorkspaceTitleDropTarget>
              <button
                type="button"
                onClick={() => handleCreateDocument(null)}
                disabled={loadingState === 'loading'}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-800 disabled:opacity-50"
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
              대시보드로
            </button>
            {/* 뷰 전환 */}
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

          {/* 탭: 전체/문서 휴지통/블록 휴지통 */}
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
              <p className="mt-2 px-1 text-[12px] text-neutral-400">
                7일 후 영구삭제 가능
              </p>
            )}
            {docTab === 'block-trash' && (
              <p className="mt-2 px-1 text-[12px] text-neutral-400">
                선택 문서의 블록 휴지통
              </p>
            )}
          </div>

          {/* 검색 + 정렬 */}
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
                    <button key={key} type="button"
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-[13px] transition-colors hover:bg-slate-50 ${
                        sortKey === key ? 'font-semibold text-blue-600' : 'text-slate-700'
                      }`}
                      onClick={() => { setSortKey(key); setShowSortMenu(false); }}
                    >
                      <Icon className="h-3.5 w-3.5" />{label}
                      {sortKey === key && <Check className="ml-auto h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto px-2 pb-6">
            <DocRootDropZone isDraggingDoc={!!activeDragDocId} placement="top" />
            {loadingDocuments ? (
              <div className="flex h-32 items-center justify-center gap-2 text-[13px] text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />불러오는 중…
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
                    <p className="mb-1 px-2 text-[12px] font-medium text-neutral-400">고정</p>
                    {pinnedDocuments.map((doc) => renderDocumentTree(doc))}
                  </div>
                )}
                {favoriteDocuments.length > 0 && (
                  <div className="mb-2 mt-3">
                    <p className="mb-1 px-2 text-[12px] font-medium text-neutral-400">즐겨찾기</p>
                    {favoriteDocuments.map((doc) => renderDocumentTree(doc))}
                  </div>
                )}
                {otherDocuments.length > 0 && (
                  <div className="mt-1">
                    {(pinnedDocuments.length > 0 || favoriteDocuments.length > 0) && (
                      <p className="mb-1 mt-3 px-2 text-[12px] font-medium text-neutral-400">페이지</p>
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
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />불러오는 중…
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

          {/* ── 보드 뷰 ── */}
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
                onMoveToGroup={(docId, group) => { void handleMoveDocumentToGroup(docId, group); }}
                onRenameGroup={(oldName, newName) => { void handleRenameBoardGroup(oldName, newName); }}
                onDeleteGroup={(group) => { void handleDeleteBoardGroup(group); }}
                onReorderInGroup={(group, orderedIds) => { void handleReorderBoardGroup(group, orderedIds); }}
              />
            </div>
          )}

          {/* ── 에디터 ── */}
          <div className={`min-w-0 flex-1 flex-col overflow-hidden bg-white ${
            viewMode === 'board' ? 'hidden' : mobileTab === 'editor' ? 'flex' : 'hidden'
          } md:flex`}>
          {/* 모바일 상단 바 */}
          {activeDocument && (
            <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 bg-white px-3 py-2.5 md:hidden">
              <button type="button"
                className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
                onClick={() => setMobileTab('list')}
              ><ArrowLeft className="h-4 w-4" /></button>
              <div className="min-w-0 flex-1 overflow-x-auto">
                <nav className="flex items-center gap-1 whitespace-nowrap text-[13px]">
                  <button type="button" onClick={handleNavigateToWorkspace} className="text-neutral-400 hover:text-neutral-700">
                    노트
                  </button>
                  {documentBreadcrumb.map((crumb, idx) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-neutral-300" />
                      {idx < documentBreadcrumb.length - 1 ? (
                        <button type="button" onClick={() => handleSelectDocument(crumb)} className="text-neutral-500 hover:text-neutral-800">
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

          {/* 에디터 본문 */}
          {!activeDocument ? (
            <div className="min-w-0 flex-1 overflow-y-auto bg-white">
              <div className="mx-auto max-w-[1080px] px-5 py-10 md:px-10 lg:px-14">
                <div className="mb-8 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-[18px] font-bold text-white">
                    N
                  </span>
                  <div>
                    <h1 className="text-[32px] font-bold tracking-tight text-neutral-900">관리자 노트</h1>
                    <p className="mt-1 text-[14px] text-neutral-500">최상위 페이지를 선택하거나 새로 만드세요</p>
                  </div>
                </div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-400">페이지</h2>
                  <button
                    type="button"
                    onClick={() => handleCreateDocument(null)}
                    className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <Plus className="h-4 w-4" />
                    새 페이지
                  </button>
                </div>
                {loadingDocuments ? (
                  <div className="flex items-center gap-2 py-12 text-[13px] text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    불러오는 중…
                  </div>
                ) : rootDocuments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-6 py-12 text-center">
                    <FileText className="mx-auto h-10 w-10 text-neutral-300" />
                    <p className="mt-3 text-[15px] font-medium text-neutral-600">아직 최상위 페이지가 없습니다</p>
                    <button
                      type="button"
                      onClick={() => handleCreateDocument(null)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-[14px] font-medium text-white hover:bg-neutral-800"
                    >
                      <Plus className="h-4 w-4" />
                      첫 페이지 만들기
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {rootDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleSelectDocument(doc)}
                        className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                      >
                        <DocIconGlyph
                          icon={resolveDocIcon(doc.properties)}
                          fallbackClassName="mt-0.5 h-5 w-5 shrink-0 text-neutral-400"
                          emojiClassName="mt-0.5 shrink-0 text-[20px] leading-none"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-neutral-900">{doc.title}</p>
                          <p className="mt-0.5 text-[12px] text-neutral-400">{relativeTime(doc.updated_at)}</p>
                          {(childrenByParent.get(doc.id)?.length ?? 0) > 0 && (
                            <p className="mt-1 text-[11px] text-neutral-400">
                              하위 {(childrenByParent.get(doc.id)?.length ?? 0)}개
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : loadingBlocks ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />불러오는 중…
            </div>
          ) : (
            <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-white">
              <div className="sticky top-0 z-40 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-[1080px] min-w-0 items-center justify-between gap-4 px-5 py-2.5 md:px-10 lg:px-14">
                  <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-[14px] md:flex">
                    <button
                      type="button"
                      onClick={handleNavigateToWorkspace}
                      className="shrink-0 rounded px-1.5 py-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      관리자 노트
                    </button>
                    {documentBreadcrumb.map((crumb, idx) => (
                      <span key={crumb.id} className="flex shrink-0 items-center gap-1">
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />
                        {idx < documentBreadcrumb.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => handleSelectDocument(crumb)}
                            className="max-w-[180px] truncate rounded px-1.5 py-0.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                            title={crumb.title}
                          >
                            {crumb.title}
                          </button>
                        ) : (
                          <span className="max-w-[220px] truncate font-medium text-neutral-800" title={crumb.title}>
                            {crumb.title}
                          </span>
                        )}
                      </span>
                    ))}
                  </nav>
                  <div className="flex shrink-0 items-center gap-2">
                    {loadingState === 'saving' && (
                      <span className="hidden items-center gap-1 text-[13px] text-neutral-400 sm:flex">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />저장 중
                      </span>
                    )}
                    {loadingState === 'saved' && lastSavedAt && (
                      <span className="hidden items-center gap-1 text-[13px] text-neutral-400 sm:flex">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        {relativeTime(lastSavedAt.toISOString())}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => activeDocument && handleTogglePublic(activeDocument)}
                      disabled={togglingPublic}
                      className={`hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50 sm:flex ${
                        activeDocument?.is_public
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-neutral-500 hover:bg-neutral-100'
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {activeDocument?.is_public ? '공개됨' : '공유'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeDocument) {
                          void handleCreateSubPage(activeDocument.id, { navigateToChild: false });
                        }
                      }}
                      disabled={loadingState === 'loading'}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50"
                      title="하위 페이지 추가 (본문에 링크 생성)"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden lg:inline">하위 페이지</span>
                    </button>
                  </div>
                </div>
              </div>
              <div
                className="mx-auto max-w-[1080px] flex-1 cursor-text overflow-x-hidden px-5 pb-32 pt-8 md:px-10 md:pt-10 lg:px-14"
                onMouseDown={handleDocumentBodyMouseDown}
              >
                <EditorDocDropZone
                  documentId={activeDocument.id}
                  documentTitle={activeDocument.title}
                  isDraggingDoc={!!activeDragDocId}
                />

                {/* 페이지 아이콘 */}
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
                {/* 문서 큰 제목 */}
                <textarea
                  ref={titleInputRef}
                  rows={1}
                  className="mb-1 w-full resize-none overflow-hidden bg-transparent text-[40px] font-bold leading-[1.2] tracking-tight text-neutral-900 outline-none placeholder:text-neutral-300"
                  placeholder="제목 없음"
                  value={
                    activeDocument.title === '제목 없음' || activeDocument.title === 'Untitled'
                      ? ''
                      : activeDocument.title
                  }
                  onChange={(e) => handleRenameDocument(activeDocument.id, e.target.value)}
                  onBlur={(e) => handleRenameDocument(activeDocument.id, e.target.value, { immediate: true })}
                />
                {parentDocument && (
                  <button
                    type="button"
                    onClick={() => handleSelectDocument(parentDocument)}
                    className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[14px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                  >
                    <DocIconGlyph
                      icon={resolveDocIcon(parentDocument.properties)}
                      emojiClassName="shrink-0 text-[15px] leading-none"
                    />
                    <span className="truncate underline-offset-2 hover:underline">
                      {parentDocument.title}
                    </span>
                  </button>
                )}
                {activeDocument.is_public && activeDocument.share_token && (
                  <div className="mb-6 flex flex-wrap items-center gap-2">
                    <a
                      href={`/note/p/${activeDocument.share_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      공개 페이지
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyPublicLink(activeDocument)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {shareLinkCopied ? '복사됨' : '링크 복사'}
                    </button>
                  </div>
                )}
                {(collaborators.length > 0) && (
                  <div className="mb-8 flex items-center gap-2 text-[13px] text-neutral-400">
                    <Users className="h-3.5 w-3.5" />
                    최근 함께 본 관리자 {collaborators.length}명 · 수정 {relativeTime(activeDocument.updated_at)}
                  </div>
                )}
                {backlinks.length > 0 && (
                  <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                    <p className="text-[12px] font-semibold text-blue-700">이 문서를 언급한 곳</p>
                    <p className="mb-3 mt-0.5 text-[11px] text-blue-500">총 {backlinks.length}개 문서에서 현재 문서를 참조합니다.</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {backlinks.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          className="rounded-lg bg-white px-3 py-2 text-left shadow-sm transition hover:bg-blue-100"
                          onClick={() => handleSelectDocument(doc)}
                        >
                          <span className="block truncate text-[13px] font-semibold text-blue-800">{doc.title}</span>
                          <span className="mt-0.5 block text-[11px] text-blue-400">{relativeTime(doc.updated_at)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}


                {/* 블록 목록 (DnD) */}
                <SortableContext
                  items={allSortableBlockIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0.5 pl-10 md:pl-12">
                    {rootBlocks.map((block) => renderSortableBlock(block))}
                  </div>
                </SortableContext>

                {/* 본문 하단 여백 — 클릭 시 텍스트 블록 포커스/추가 */}
                {rootBlocks.length > 0 && !loadingBlocks && (
                  <div
                    className="min-h-[45vh] pl-10 pt-2 md:pl-12"
                    onMouseDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      e.preventDefault();
                      handleClickEditorWhitespace();
                    }}
                  />
                )}

                {/* 빈 문서 — 노션 스타일 (항상 + 표시) */}
                {rootBlocks.length === 0 && !loadingBlocks && (
                  <div className="group flex items-start gap-2 py-1 pl-10 md:pl-12" data-note-ignore-whitespace>
                    <div className="mt-1 flex h-7 shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        title="블록 추가"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (emptyPagePickerOpen) { setEmptyPagePickerOpen(false); return; }
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          setEmptyPagePickerAnchor({ top: rect.bottom + 4, left: rect.left });
                          setEmptyPagePickerOpen(true);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-neutral-300 opacity-100 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddBlock('text')}
                      className="min-w-0 flex-1 cursor-text py-1.5 text-left text-[16px] text-neutral-300 transition-colors hover:text-neutral-400"
                    >
                      글을 쓰거나 &apos;/&apos; 를 입력해 블록을 추가하세요.
                    </button>
                    {emptyPagePickerOpen && emptyPagePickerAnchor && (
                      <div className="fixed z-[9999]" style={{ top: emptyPagePickerAnchor.top, left: emptyPagePickerAnchor.left }}>
                        <BlockPickerMenu
                          commands={BLOCK_TYPES}
                          onSelect={(type) => { void handleAddBlock(type); setEmptyPagePickerOpen(false); setEmptyPagePickerAnchor(null); }}
                          onClose={() => { setEmptyPagePickerOpen(false); setEmptyPagePickerAnchor(null); }}
                        />
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
          </div>
        </div>

        {/* 드래그 중 미리보기 (사이드바 드롭 포함) */}
        <DragOverlay dropAnimation={{ duration: 160, easing: 'ease' }}>
          {activeBlock ? (
            <DragPreview block={activeBlock} />
          ) : activeDragDocument ? (
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-lg">
              <DocIconGlyph icon={resolveDocIcon(activeDragDocument.properties)} />
              <span className="max-w-[200px] truncate text-[14px] font-medium text-neutral-800">
                {activeDragDocument.title}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {formatToolbar && (
        <div
          className="fixed z-[90] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur"
          style={{ left: formatToolbar.position.left, top: formatToolbar.position.top }}
        >
          <BubbleToolbar applyMark={formatToolbar.applyMark} applyTextStyle={formatToolbar.applyTextStyle} />
        </div>
      )}

      {sidebarIconPicker && (
        <div
          className="fixed z-[200] flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
          style={{ top: sidebarIconPicker.top, left: sidebarIconPicker.left }}
        >
          <input
            ref={sidebarIconInputRef}
            type="text"
            value={sidebarIconDraft}
            onChange={(e) => setSidebarIconDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSetDocumentIcon(sidebarIconPicker.docId, sidebarIconDraft);
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setSidebarIconPicker(null);
              }
            }}
            onBlur={() => { void handleSetDocumentIcon(sidebarIconPicker.docId, sidebarIconDraft); }}
            placeholder="이모지"
            className="w-14 rounded-md border border-neutral-200 bg-white px-2 py-1 text-center text-[20px] outline-none focus:border-neutral-400"
            maxLength={4}
          />
          <button
            type="button"
            className="text-[12px] text-neutral-400 hover:text-neutral-600"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { void handleSetDocumentIcon(sidebarIconPicker.docId, ''); }}
          >
            제거
          </button>
        </div>
      )}
    </div>
  );
}

