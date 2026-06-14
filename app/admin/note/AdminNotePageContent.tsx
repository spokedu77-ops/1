'use client';

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { devLogger } from '@/app/lib/logging/devLogger';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { BlockTextPreview } from './_components/blocks/BlockTextPreview';
import { LazyNoteEditor } from './_components/blocks/LazyNoteEditor';
import type { NoteEditorEnterContext } from './_components/NoteEditor';
import { NoteRichEditorStyles } from './_components/NoteRichEditorStyles';
import { NoteImageLightboxProvider, useNoteImageLightbox } from './_components/NoteImageLightbox';
import { useDeferredNoteMeta } from './_hooks/useDeferredNoteMeta';
import { useNoteBlockUndo, type NoteUndoEntry } from './_hooks/useNoteBlockUndo';
import { BubbleToolbar } from './_components/BubbleToolbar';
import { SlashMenuFixed, BlockPickerMenu, BlockHandleMenu } from './_components/SlashMenu';
import type { MarkdownBlockTrigger } from './_components/noteBulletInput';
import {
  buildChildrenByParentBlock,
  collectDescendantBlockIds,
  filterSiblingBlocks,
  buildReparentContentPatch,
  getBlocksInParent,
  planBlockDropAt,
  planBlockTabIndent,
  type BlockDropPosition,
  planMergeWithPreviousBlock,
  planBatchDeleteBlocks,
  planMoveRootBlockGroup,
  planPromoteChildrenOnDelete,
  numberedListIndexAmongSiblings,
  bulletListNestLevelAmongContainers,
  sortRootBlocks,
  type BlockDropPlan,
} from '@/app/lib/note/noteBlockTree';
import { bulletMarkerForLevel, stripMarkdownTriggerForTypeChange } from './_components/noteBulletInput';
import { pendingEditorClickRef } from './_components/noteEditorRegistry';
import { clearAllCrossSelectState } from './_components/noteCrossSelect';
import { noteBlockMarqueeGuard } from './_lib/noteBlockMarqueeGuard';
import { collapseAllNoteEditorSelections } from './_components/noteEditorRegistry';
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
import {
  blockGutterTopPx,
  blockHandleLeftPx,
  NOTE_MARQUEE_ZONE,
  NOTE_PAGE_SHELL,
  toggleMenuAnchorOffset,
} from './_lib/constants';
import { patchNoteBlocks, putNoteBlockOrders } from './_lib/noteBlocksApi';
import {
  isNoteTextSurfaceTarget,
  notePointerTargetElement,
  stopNoteEditorPointerBubble,
} from './_lib/notePointerTarget';

const EMPTY_BLOCK_PLACEHOLDER = "명령어는 '/'를 입력하세요.";

function blockRowBgClass(content: Record<string, unknown> | null | undefined): string {
  switch (content?.blockColor) {
    case 'gray':
      return 'rounded-sm bg-neutral-100/90';
    case 'brown':
      return 'rounded-sm bg-amber-50/90';
    case 'orange':
      return 'rounded-sm bg-orange-50/90';
    default:
      return '';
  }
}

function readBlockColor(content: Record<string, unknown> | null | undefined): string {
  const color = content?.blockColor;
  return typeof color === 'string' && color.length > 0 ? color : 'default';
}

const HoveredBlockContext = createContext<string | null>(null);
const SetHoveredBlockContext = createContext<(id: string | null) => void>(() => {});

function useHoveredBlockId() {
  return useContext(HoveredBlockContext);
}

function useSetHoveredBlockId() {
  return useContext(SetHoveredBlockContext);
}

type BlockDropTarget = { blockId: string; position: BlockDropPosition } | null;

const BlockDropTargetContext = createContext<BlockDropTarget>(null);
const BlockDragActiveContext = createContext(false);

function useBlockDropTarget() {
  return useContext(BlockDropTargetContext);
}

function useBlockDragActive() {
  return useContext(BlockDragActiveContext);
}

const SelectedBlockIdsContext = createContext<Set<string>>(new Set());
const OnBlockSelectContext = createContext<((id: string, e: React.MouseEvent) => void) | null>(null);

function useSelectedBlockIds() { return useContext(SelectedBlockIdsContext); }
function useOnBlockSelect() { return useContext(OnBlockSelectContext); }

/** 같은 부모 안 형제 블록 id 구간 (Shift·거터 드래그 선택용) */
function getSiblingBlockRangeIds(
  blocks: NoteBlock[],
  fromId: string,
  toId: string,
): string[] {
  const from = blocks.find((b) => b.id === fromId);
  const to = blocks.find((b) => b.id === toId);
  if (!from || !to) return toId ? [toId] : fromId ? [fromId] : [];
  if (from.parent_block_id !== to.parent_block_id) return [toId];
  const siblings = getBlocksInParent(blocks, from.parent_block_id ?? null);
  const ids = siblings.map((b) => b.id);
  const startIdx = ids.indexOf(fromId);
  const endIdx = ids.indexOf(toId);
  if (startIdx < 0 || endIdx < 0) return [toId];
  return ids.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
}

const SuppressGripMenuRefContext = createContext<React.RefObject<boolean>>({ current: false });

function useSuppressGripMenuRef() {
  return useContext(SuppressGripMenuRefContext);
}

type MarqueeRect = { left: number; top: number; right: number; bottom: number };

function rowSubstantiallyInMarquee(row: DOMRect, marquee: MarqueeRect): boolean {
  const overlapTop = Math.max(row.top, marquee.top);
  const overlapBottom = Math.min(row.bottom, marquee.bottom);
  const overlapHeight = Math.max(0, overlapBottom - overlapTop);
  if (overlapHeight < row.height * 0.45) return false;
  const cx = (row.left + row.right) / 2;
  const cy = (row.top + row.bottom) / 2;
  return cx >= marquee.left && cx <= marquee.right && cy >= marquee.top && cy <= marquee.bottom;
}

function getMarqueeSelectedBlockIds(marquee: MarqueeRect): string[] {
  const ids: string[] = [];
  document.querySelectorAll<HTMLElement>('[data-note-block-row]').forEach((row) => {
    if (!rowSubstantiallyInMarquee(row.getBoundingClientRect(), marquee)) return;
    const id = row.getAttribute('data-block-id');
    if (id) ids.push(id);
  });
  return ids;
}

function isMarqueeSelectStartBlocked(target: EventTarget | null): boolean {
  const el = notePointerTargetElement(target);
  if (!el) return false;
  return !!el.closest(
    'button, input, textarea, a, .note-block-gutter, [data-note-ignore-whitespace]',
  );
}

/**
 * 포인터 실제 Y 좌표 기준으로 before/after/inside 결정.
 * 토글: 상 25% → before, 하 25% → after, 중간 → inside
 * 일반: 상 50% → before, 하 50% → after
 */
function resolveDropPosition(
  overBlock: NoteBlock,
  over: { rect: { top: number; height: number } },
  pointerY: number,
): BlockDropPosition {
  const py = pointerY;
  const { top, height } = over.rect;
  if (overBlock.type === 'toggle') {
    if (py < top + height * 0.25) return 'before';
    if (py > top + height * 0.75) return 'after';
    return 'inside';
  }
  return py < top + height / 2 ? 'before' : 'after';
}

function resolveBlockDropTarget(
  overId: string,
  blocks: NoteBlock[],
  event: DragOverEvent | DragEndEvent,
  pointerY: number,
): BlockDropTarget {
  if (overId.startsWith('block-inside:')) {
    const blockId = overId.slice('block-inside:'.length);
    const container = blocks.find((block) => block.id === blockId);
    return container && (container.type === 'toggle' || container.type === 'page')
      ? { blockId, position: 'inside' }
      : null;
  }
  const over = event.over;
  const overBlock = blocks.find((b) => b.id === overId);
  if (!overBlock || !over?.rect) return null;
  return { blockId: overId, position: resolveDropPosition(overBlock, over, pointerY) };
}

/**
 * 블록 드래그 충돌 감지.
 * 포인터가 직접 위에 있는 블록 우선, 없으면 가장 가까운 블록.
 */
const noteBlockCollisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) {
    return [...hits].sort((a, b) => {
      const aContainer = args.droppableContainers.find((container) => container.id === a.id);
      const bContainer = args.droppableContainers.find((container) => container.id === b.id);
      const aType = aContainer?.data.current?.type;
      const bType = bContainer?.data.current?.type;
      const priority = (type: unknown) =>
        type === 'block-inside' ? 0
          : type === 'document' || type === 'document-drop-target' ? 1
          : 2;
      const priorityDiff = priority(aType) - priority(bType);
      if (priorityDiff !== 0) return priorityDiff;
      const aRect = aContainer?.rect.current;
      const bRect = bContainer?.rect.current;
      const aArea = aRect ? aRect.width * aRect.height : Number.POSITIVE_INFINITY;
      const bArea = bRect ? bRect.width * bRect.height : Number.POSITIVE_INFINITY;
      return aArea - bArea;
    });
  }
  return closestCenter(args);
};

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
  ListOrdered,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  MoreHorizontal,
} from 'lucide-react';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
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
  { type: 'text',          label: '텍스트',      icon: FileText,           desc: '일반 문단' },
  { type: 'heading',       label: '제목 1',      icon: Type,               desc: '큰 섹션 제목',              shortcut: '#' },
  { type: 'heading2',      label: '제목 2',      icon: Heading2Icon,       desc: '중간 섹션 제목',            shortcut: '##' },
  { type: 'heading3',      label: '제목 3',      icon: Heading3Icon,       desc: '작은 섹션 제목',            shortcut: '###' },
  { type: 'bulletList',    label: '글머리 기호 목록', icon: List,           desc: '점으로 구분된 목록',        shortcut: '-' },
  { type: 'numberedList',  label: '번호 목록',   icon: ListOrdered,        desc: '번호로 구분된 목록',        shortcut: '1.' },
  { type: 'todo',          label: '체크리스트',  icon: CheckSquare,        desc: '완료 상태를 체크하는 할 일', shortcut: '[]' },
  { type: 'toggle',        label: '토글 목록',   icon: ChevronDown,        desc: '접고 펼치는 섹션',          shortcut: '>' },
  { type: 'callout',       label: '콜아웃',      icon: MessageSquareQuote, desc: '강조 메시지',               shortcut: '!!' },
  { type: 'code',          label: '코드',        icon: Type,               desc: '고정폭 코드 블록',          shortcut: '```' },
  { type: 'divider',       label: '구분선',      icon: Minus,              desc: '가로 구분선',               shortcut: '---' },
  { type: 'image',         label: '이미지',      icon: ImageIcon,          desc: '이미지 업로드 또는 URL' },
  { type: 'video',         label: '영상',        icon: Video,              desc: 'YouTube · Vimeo 임베드' },
  { type: 'page',          label: '하위 문서',   icon: FileText,           desc: '클릭하면 열리는 페이지' },
];

function defaultBlockContent(type: NoteBlock['type'], options?: { insideToggle?: boolean }) {
  if (type === 'heading' || type === 'heading2' || type === 'heading3') return { text: '' };
  if (type === 'bulletList' || type === 'numberedList') {
    return {
      text: '',
      depth: 0,
      ...(options?.insideToggle ? { createdInsideToggle: true, placedInToggle: true } : {}),
    };
  }
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

const TEXT_CARRYING_BLOCK_TYPES = new Set<NoteBlock['type']>([
  'text', 'heading', 'heading2', 'heading3', 'bulletList', 'numberedList', 'todo', 'callout', 'code',
]);

/** 블록 타입 변환 시 본문(text/html)을 가능한 한 유지한다. */
function buildContentForTypeChange(
  prevContent: Record<string, unknown> | null | undefined,
  prevType: NoteBlock['type'],
  nextType: NoteBlock['type'],
): Record<string, unknown> {
  const base = defaultBlockContent(nextType);
  if (!TEXT_CARRYING_BLOCK_TYPES.has(prevType) || !TEXT_CARRYING_BLOCK_TYPES.has(nextType)) {
    return base;
  }
  const prev = prevContent ?? {};
  const rawText = typeof prev.text === 'string' ? prev.text : '';
  const text = TEXT_CARRYING_BLOCK_TYPES.has(nextType)
    ? stripMarkdownTriggerForTypeChange(rawText, nextType as MarkdownBlockTrigger)
    : rawText;
  const didStripTrigger = text !== rawText;
  const html = typeof prev.html === 'string' ? prev.html : undefined;
  const bodyHtml = typeof prev.bodyHtml === 'string' ? prev.bodyHtml : undefined;
  return {
    ...base,
    text,
    ...(!didStripTrigger && html !== undefined ? { html } : {}),
    ...(!didStripTrigger && bodyHtml !== undefined ? { bodyHtml } : {}),
    ...(typeof prev.checked === 'boolean' && nextType === 'todo' ? { checked: prev.checked } : {}),
  };
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

function resolveDocCover(properties?: NoteDocument['properties'] | null): string | null {
  const cover = properties?.cover?.trim();
  return cover || null;
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

/** 줄 왼쪽 — 거터·마퀴 시작 여백 (hover·선택 히트) */
const NOTE_BLOCK_HOVER_BRIDGE = 'absolute -left-[120px] top-0 bottom-0 z-[1] w-[120px]';

const DROP_TARGET_ROW =
  'z-[1] rounded-sm bg-blue-100/90 ring-2 ring-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]';

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
  children: ReactNode;
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
  isExpanded = false,
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
        isOver
          ? 'bg-blue-100 text-blue-900 ring-1 ring-inset ring-blue-300'
          : ''
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
        className="min-w-0 flex-1 truncate text-[14px] leading-5 text-neutral-700"
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

function BlockInsideDropSurface({
  blockId,
  disabled,
  children,
  className = '',
  style,
  onMouseDown,
}: {
  blockId: string;
  disabled: boolean;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `block-inside:${blockId}`,
    data: { type: 'block-inside', blockId },
    disabled,
  });

  return (
    <div
      className={`relative rounded-sm transition-colors ${
        isOver ? 'bg-blue-100 ring-1 ring-inset ring-blue-300' : ''
      } ${className}`}
      style={style}
      onMouseDown={onMouseDown}
    >
      {!disabled && (
        <div
          ref={setNodeRef}
          className="pointer-events-none absolute inset-x-0 bottom-[15%] top-[15%] z-[1]"
          aria-hidden
        />
      )}
      {children}
    </div>
  );
}

/* ─── BlockContent ──────────────────────────────────────────────────────── */
function BlockContent({
  block,
  onUpdate,
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
  canMergeWithPrevious,
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
  onRequestCaretOffset,
  toggleNestDepth = 1,
  onFocusBlock,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
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
  canMergeWithPrevious?: () => boolean;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  isDragging?: boolean;
  focusedToggleId?: string | null;
  uploadImage?: (file: File) => Promise<string>;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  isInsideToggle?: boolean;
  toggleNestDepth?: number;
  isDropTarget?: boolean;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onRequestCaretOffset?: (offset: number) => void;
  onFocusBlock?: () => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
}) {
  const isBlockDragActive = useBlockDragActive();
  const imageLightbox = useNoteImageLightbox();
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
  const editorStayMountedRef = useRef(false);

  useEffect(() => {
    editorStayMountedRef.current = false;
  }, [block.id]);

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
  const isBorderlessInlineBlock =
    block.type === 'text'
    || block.type === 'todo'
    || block.type === 'page'
    || block.type === 'bulletList'
    || block.type === 'numberedList';
  const rootBlockShell =
    isInsideToggle || isBorderlessInlineBlock
      ? ''
      : 'rounded-lg border border-slate-200 bg-white px-2 py-2';
  const inlineRowPadding = isInsideToggle ? 'py-0.5' : (isBorderlessInlineBlock ? 'py-0.5' : '');
  const enterCreatesBlockBelow =
    !isInsideToggle
    || block.type === 'text'
    || block.type === 'todo'
    || block.type === 'bulletList'
    || block.type === 'numberedList';

  const renderFormatToolbar = () => null;

  const renderFormattedTextarea = ({
    text,
    placeholder,
    textClassName,
    field = 'text',
    tabBehavior = 'block-indent',
    enterCreatesBlock = false,
    enterSplitOnMidBlock = false,
    onEditorEnter = onEnter,
    onEditorBackspace,
    onEditorBackspaceAtBlockStart,
    onEditorMergeWithPrevious,
    onEditorCanMergeWithPrevious,
    editorMergeFocusCaretOffset,
  }: {
    text: string;
    placeholder: string;
    textClassName: string;
    field?: 'text' | 'body';
    tabBehavior?: 'block-indent' | 'insert-text-indent';
    enterCreatesBlock?: boolean;
    enterSplitOnMidBlock?: boolean;
    onEditorEnter?: (ctx?: NoteEditorEnterContext) => void;
    /** false면 빈 본문 Backspace로 블록 삭제하지 않음 (토글 본문 등) */
    onEditorBackspace?: (() => void) | false;
    onEditorBackspaceAtBlockStart?: () => boolean;
    onEditorMergeWithPrevious?: () => void;
    onEditorCanMergeWithPrevious?: () => boolean;
    editorMergeFocusCaretOffset?: number;
  }) => {
    const resolvedEditorBackspace =
      onEditorBackspace === false ? undefined : (onEditorBackspace ?? onEmptyBackspace);
    const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
    const legacyKey = field === 'body' ? 'legacyBody' : 'legacyText';
    const shouldMountEditor = isFocused || (autoFocusSignal ?? 0) > 0;
    if (shouldMountEditor) editorStayMountedRef.current = true;
    const editorSharedProps = {
      content: block.content,
      field,
      text,
      resetKey: `${block.id}:${block.type}:${field}`,
      editorBlockId: block.id,
      placeholder,
      className: textClassName,
      onEnter: onEditorEnter,
      enterCreatesBlock,
      enterSplitOnMidBlock,
      autoFocusSignal: autoFocusSignal ?? 0,
      onEmptyBackspace: resolvedEditorBackspace,
      onBackspaceAtBlockStart: onEditorBackspaceAtBlockStart ?? handleListItemBackspaceAtStart,
      onMergeWithPrevious: onEditorMergeWithPrevious ?? onMergeWithPrevious,
      canMergeWithPrevious: onEditorCanMergeWithPrevious ?? canMergeWithPrevious,
      onMarkdownBlockTrigger:
        block.type === 'text' || block.type === 'heading' || block.type === 'heading2'
          || block.type === 'heading3' || block.type === 'todo' || block.type === 'callout'
          || block.type === 'code' || block.type === 'bulletList' || block.type === 'numberedList'
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
        data-note-editor-host
        className="relative min-h-[1.75rem] min-w-0 max-w-full cursor-text select-text"
        onPointerDown={stopNoteEditorPointerBubble}
        onMouseDown={(e) => {
          const target = notePointerTargetElement(e.target);
          if (!target) return;
          if (target.closest('button, input, textarea, a, .ProseMirror')) return;
          pendingEditorClickRef.current = {
            blockId: block.id,
            x: e.clientX,
            y: e.clientY,
          };
        }}
        onClick={(e) => {
          const target = notePointerTargetElement(e.target);
          if (!target) return;
          if (target.closest('button, input, textarea, a, .ProseMirror')) return;
          onFocusBlock?.();
        }}
      >
        {shouldMountEditor ? (
          <LazyNoteEditor {...editorSharedProps} />
        ) : (
          <BlockTextPreview
            content={block.content}
            field={field}
            text={text}
            className={textClassName}
            placeholder={placeholder}
            onActivate={() => onFocusBlock?.()}
          />
        )}
      </div>
    );
  };

  const listNestLevel = bulletListNestLevel;

  const handleListItemBackspaceAtStart = (): boolean => {
    if (block.type !== 'bulletList' && block.type !== 'numberedList') return false;
    const itemText = typeof block.content?.text === 'string' ? block.content.text : '';
    if (itemText.length === 0) return false;
    onRequestCaretOffset?.(0);
    onChangeType('text');
    return true;
  };

  const handleListItemEnter = (listType: 'bulletList' | 'numberedList', ctx?: NoteEditorEnterContext) => {
    if (ctx?.split) {
      onAddBelow(listType, {
        text: ctx.split.afterText,
        html: ctx.split.afterHtml,
        depth: 0,
      });
      return;
    }
    const isEmpty = ctx?.isEmpty ?? text.trim().length === 0;
    if (!isEmpty) {
      onAddBelow(listType);
      return;
    }
    if (block.parent_block_id) {
      onIndentChange?.('out');
      return;
    }
    onChangeType('text');
  };

  const renderListChildBlocks = () => {
    if (!childBlocks?.length || !renderChildBlock) return null;
    return (
      <div className="overflow-visible pl-[1.625rem]">
        <SortableContext
          items={childBlocks.map((child) => child.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="note-block-children space-y-0 overflow-visible">
            {childBlocks.map((child) => (
              <Fragment key={child.id}>
                {renderChildBlock(child, toggleNestDepth + 1)}
              </Fragment>
            ))}
          </div>
        </SortableContext>
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
          className={`mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
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
            placeholder: EMPTY_BLOCK_PLACEHOLDER,
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
            placeholder: '제목 1',
            textClassName: 'text-[30px] font-bold leading-tight text-slate-900',
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('text') : onEnter,
          })}
          {renderSlashMenuPortal()}
        </div>
      </div>
    );
  }

  if (block.type === 'heading2') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className={`flex items-start ${isInsideToggle ? 'py-1' : rootBlockShell}`} style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="relative min-w-0 flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '제목 2',
            textClassName: 'text-[24px] font-bold leading-tight text-slate-900',
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('text') : onEnter,
          })}
          {renderSlashMenuPortal()}
        </div>
      </div>
    );
  }

  if (block.type === 'heading3') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className={`flex items-start ${isInsideToggle ? 'py-1' : rootBlockShell}`} style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="relative min-w-0 flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '제목 3',
            textClassName: 'text-[20px] font-semibold leading-tight text-slate-900',
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('text') : onEnter,
          })}
          {renderSlashMenuPortal()}
        </div>
      </div>
    );
  }

  if (block.type === 'bulletList') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    const bulletGlyph = bulletMarkerForLevel(listNestLevel).trim();
    return (
      <div style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className={`flex items-start gap-2 ${inlineRowPadding || rootBlockShell}`}>
          <span
            className={`mt-[2px] min-w-[1.25rem] shrink-0 text-center text-[16px] leading-7 select-none ${
              listNestLevel === 0 ? 'text-neutral-900' : 'text-slate-600'
            }`}
            aria-hidden
          >
            {bulletGlyph}
          </span>
          <div className="relative min-w-0 flex-1" data-note-list-text>
            {renderFormatToolbar()}
            {renderFormattedTextarea({
              text,
              placeholder: '글머리 목록',
              textClassName: 'text-[16px] leading-7 text-slate-800',
              enterCreatesBlock: enterCreatesBlockBelow,
              enterSplitOnMidBlock: enterCreatesBlockBelow,
              onEditorEnter: enterCreatesBlockBelow
                ? (ctx) => handleListItemEnter('bulletList', ctx)
                : onEnter,
            })}
          </div>
        </div>
        {renderListChildBlocks()}
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'numberedList') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    const displayNum = numberedListIndex
      ?? (typeof block.content?.number === 'number' ? block.content.number : 1);
    return (
      <div style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className={`flex items-start gap-2 ${inlineRowPadding || rootBlockShell}`}>
          <span className="mt-[2px] min-w-[1.25rem] shrink-0 text-right text-[16px] leading-7 text-slate-500 select-none" aria-hidden>
            {displayNum}.
          </span>
          <div className="relative min-w-0 flex-1" data-note-list-text>
            {renderFormatToolbar()}
            {renderFormattedTextarea({
              text,
              placeholder: '번호 목록',
              textClassName: 'text-[16px] leading-7 text-slate-800',
              enterCreatesBlock: enterCreatesBlockBelow,
              enterSplitOnMidBlock: enterCreatesBlockBelow,
              onEditorEnter: enterCreatesBlockBelow
                ? (ctx) => handleListItemEnter('numberedList', ctx)
                : onEnter,
            })}
          </div>
        </div>
        {renderListChildBlocks()}
        {renderSlashMenuPortal()}
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
          <img
            src={url}
            alt={caption || ''}
            className="w-full cursor-zoom-in object-contain"
            onClick={(e) => {
              e.stopPropagation();
              imageLightbox?.open(url, caption || undefined);
            }}
          />
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
      <BlockInsideDropSurface
        blockId={block.id}
        disabled={!isBlockDragActive || !!isDragging || !pageId}
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
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
      </BlockInsideDropSurface>
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
    const rawShowToggleBody = childBlocks.length === 0 && body.trim().length > 0;
    if (rawShowToggleBody) editorStayMountedRef.current = true;
    const showToggleBody = rawShowToggleBody || (childBlocks.length === 0 && editorStayMountedRef.current);

    return (
      <div
        className={`relative overflow-visible py-0.5 ${
          isDropTarget
            ? DROP_TARGET_ROW
            : !isInsideToggle && isThisToggleFocused
              ? 'rounded-sm bg-neutral-50/60'
              : ''
        }`}
        style={isInsideToggle ? undefined : { marginLeft: `${contentMarginLeft}px` }}
      >
        <BlockInsideDropSurface
          blockId={block.id}
          disabled={!isBlockDragActive || !!isDragging}
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
                if (collapsed) {
                  onAddBelow('toggle');
                } else {
                  onAddChildBelow?.('text');
                }
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
        </BlockInsideDropSurface>
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
            {childBlocks.length > 0 ? (
              <SortableContext
                items={childBlocks.map((child) => child.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="note-block-children space-y-0 overflow-visible">
                  {childBlocks.map((child) => (
                    <Fragment key={child.id}>
                      {renderChildBlock?.(child, toggleNestDepth + 1)}
                    </Fragment>
                  ))}
                </div>
              </SortableContext>
            ) : !showToggleBody && onAddChildBelow ? (
              <div
                className="min-h-[30px] cursor-text py-0.5"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddChildBelow('text');
                }}
              >
                <span className="text-[16px] leading-[1.7] text-neutral-400">
                  {EMPTY_BLOCK_PLACEHOLDER}
                </span>
              </div>
            ) : null}
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
                        <img
                          src={url.trim()}
                          alt=""
                          className="max-h-56 w-full cursor-zoom-in object-contain"
                          onClick={() => imageLightbox?.open(url.trim())}
                        />
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
        data-note-editor-host
        className="relative min-h-[1.75rem] min-w-0 flex-1 cursor-text select-text"
        onPointerDown={stopNoteEditorPointerBubble}
        onMouseDown={(e) => {
          const target = notePointerTargetElement(e.target);
          if (!target) return;
          if (target.closest('.ProseMirror, button, input, textarea, a')) return;
          pendingEditorClickRef.current = {
            blockId: block.id,
            x: e.clientX,
            y: e.clientY,
          };
        }}
        onClick={(e) => {
          const target = notePointerTargetElement(e.target);
          if (!target) return;
          if (target.closest('.ProseMirror, button, input, textarea, a')) return;
          onFocusBlock?.();
        }}
      >
        {renderFormatToolbar()}
        {renderFormattedTextarea({
          text,
          placeholder: EMPTY_BLOCK_PLACEHOLDER,
          textClassName: 'text-[16px] leading-[1.7] text-slate-800',
          enterCreatesBlock: enterCreatesBlockBelow,
          onEditorEnter: enterCreatesBlockBelow ? onEnter : undefined,
        })}
        {renderSlashMenuPortal()}
      </div>
    </div>
  );
}

/* ─── BlockRowGutter (+ · 드래그 — 줄 호버 시에만) ───────────────────────── */
function BlockRowGutter({
  blockId,
  blockType,
  nestDepth = 1,
  gutterPinned = false,
  onAddBelow,
  onGripClick,
  gripBtnRef,
  dragAttributes,
  dragListeners,
  onPickerOpenChange,
}: {
  blockId: string;
  blockType: NoteBlock['type'];
  nestDepth?: number;
  gutterPinned?: boolean;
  onAddBelow: (type: NoteBlock['type']) => void;
  onGripClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  gripBtnRef: React.RefObject<HTMLButtonElement | null>;
  dragAttributes: DraggableAttributes;
  dragListeners: DraggableSyntheticListeners;
  onPickerOpenChange?: (open: boolean) => void;
}) {
  const hoveredBlockId = useHoveredBlockId();
  const visible = hoveredBlockId === blockId || gutterPinned;
  const gutterTop = blockGutterTopPx(blockType);
  const gutterCentered = gutterTop === 'center';
  const [addPickerAnchor, setAddPickerAnchor] = useState<{ top: number; left: number } | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const setPickerOpen = (open: boolean, anchor: { top: number; left: number } | null = null) => {
    setAddPickerAnchor(anchor);
    onPickerOpenChange?.(open);
  };

  return (
    <>
      <div
        className={`note-block-gutter absolute z-10 flex h-6 items-center gap-0.5 transition-none ${
          gutterCentered ? 'top-1/2 -translate-y-1/2' : ''
        } ${visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{
          left: blockHandleLeftPx(nestDepth),
          ...(gutterCentered ? {} : { top: gutterTop }),
        }}
      >
        <button
          ref={addBtnRef}
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="아래에 블록 추가"
          title="아래에 블록 추가"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (addPickerAnchor) {
              setPickerOpen(false);
              return;
            }
            const rect = addBtnRef.current!.getBoundingClientRect();
            setPickerOpen(true, { top: rect.bottom + 4, left: rect.left });
          }}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          ref={gripBtnRef}
          type="button"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing"
          aria-label="메뉴 · 드래그"
          title="클릭: 복제·변환·삭제 · 드래그: 이동"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onGripClick}
          {...dragAttributes}
          {...dragListeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      {addPickerAnchor && (
        <div className="fixed z-[10000]" style={{ top: addPickerAnchor.top, left: addPickerAnchor.left }}>
          <BlockPickerMenu
            commands={BLOCK_TYPES}
            onSelect={(type) => {
              onAddBelow(type);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </>
  );
}


/** 블록 위/아래에 노션처럼 삽입선을 보여주는 컴포넌트 */
function DropInsertLine({ position }: { position: 'top' | 'bottom' }) {
  const top = position === 'top';
  return (
    <div
      className={`pointer-events-none absolute left-[-2px] right-0 z-30 flex items-center ${
        top ? 'top-0' : 'bottom-0'
      }`}
    >
      <div className="h-[6px] w-[6px] shrink-0 rounded-full border-2 border-blue-500 bg-white" />
      <div className="h-[2px] flex-1 bg-blue-500" />
    </div>
  );
}

/** 토글 안으로 드롭 시 파란 배경 표시 */
const DROP_INSIDE_BLOCK_ROW =
  'rounded bg-blue-50 ring-2 ring-blue-300';

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
  canMergeWithPrevious,
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
  onCopyBlockLink,
  onRecordBlockUndo,
  isFocused = false,
  mergeFocusCaretOffset,
  onRequestCaretOffset,
  onFocusBlock,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
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
  canMergeWithPrevious?: () => boolean;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onDuplicate?: () => void;
  onCopyBlockLink?: () => void;
  onRecordBlockUndo?: () => void;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onRequestCaretOffset?: (offset: number) => void;
  onFocusBlock?: () => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const isListSibling = block.type === 'bulletList' || block.type === 'numberedList';
  const blockTypeLabel = BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type;
  const [handleMenuAnchor, setHandleMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const gripBtnRef = useRef<HTMLButtonElement>(null);
  const gutterPinned = !!handleMenuAnchor || addPickerOpen;
  const hoveredBlockId = useHoveredBlockId();
  const setHoveredBlockId = useSetHoveredBlockId();
  const isRowHovered = hoveredBlockId === block.id || gutterPinned;
  const dropTarget = useBlockDropTarget();
  const dropPos = dropTarget?.blockId === block.id ? dropTarget.position : null;
  const isDragActive = useBlockDragActive();
  const selectedBlockIds = useSelectedBlockIds();
  const onBlockSelect = useOnBlockSelect();
  const suppressGripMenuRef = useSuppressGripMenuRef();
  const isSelected = selectedBlockIds.has(block.id);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : isSelected && isDragActive && selectedBlockIds.size > 1 ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const blockContentNode = (
    <div
      data-note-editor-host
      className="min-w-0 flex-1 cursor-text select-text"
      onPointerDown={stopNoteEditorPointerBubble}
      onMouseDownCapture={() => {
        if (block.type === 'toggle') onFocusToggle?.(block.id);
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
        canMergeWithPrevious={canMergeWithPrevious}
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
        onRequestCaretOffset={onRequestCaretOffset}
        toggleNestDepth={1}
        onFocusBlock={onFocusBlock}
        autoFocusTitleSignal={autoFocusTitleSignal}
        numberedListIndex={numberedListIndex}
        bulletListNestLevel={bulletListNestLevel}
      />
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      data-note-block-row
      data-block-id={block.id}
      data-parent-block-id={block.parent_block_id ?? ''}
      data-list-sibling={isListSibling ? 'true' : undefined}
      data-nest-depth="1"
      style={style}
      className={`relative overflow-visible py-0.5 transition-colors ${blockRowBgClass(block.content)} ${
        isSelected ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-200'
          : dropPos === 'inside' && (block.type === 'toggle' || block.type === 'page') ? DROP_INSIDE_BLOCK_ROW
          : isRowHovered && !block.content?.blockColor ? 'bg-neutral-50/60' : ''
      }`}
      onMouseEnter={() => setHoveredBlockId(block.id)}
    >
      <div
        className={NOTE_BLOCK_HOVER_BRIDGE}
        aria-hidden
        onMouseEnter={() => setHoveredBlockId(block.id)}
      />
      {dropPos === 'before' && <DropInsertLine position="top" />}
      {dropPos === 'after' && <DropInsertLine position="bottom" />}
      <BlockRowGutter
        blockId={block.id}
        blockType={block.type}
        nestDepth={1}
        gutterPinned={gutterPinned}
        onAddBelow={(type) => onAddBelow(type)}
        gripBtnRef={gripBtnRef}
        dragAttributes={attributes}
        dragListeners={listeners}
        onPickerOpenChange={setAddPickerOpen}
        onGripClick={(e) => {
          e.stopPropagation();
          if (isDragActive) return;
          if (suppressGripMenuRef.current) {
            suppressGripMenuRef.current = false;
            return;
          }
          if ((e.ctrlKey || e.metaKey || e.shiftKey) && onBlockSelect) {
            onBlockSelect(block.id, e);
            return;
          }
          if (handleMenuAnchor) { setHandleMenuAnchor(null); return; }
          const rect = gripBtnRef.current!.getBoundingClientRect();
          setHandleMenuAnchor({ top: rect.bottom + 4, left: rect.left });
        }}
      />

      {blockContentNode}

      {handleMenuAnchor && (
        <div
          className="fixed z-[9999]"
          style={{ top: handleMenuAnchor.top, left: handleMenuAnchor.left }}
        >
          <BlockHandleMenu
            blockTypeLabel={blockTypeLabel}
            blockType={block.type}
            commands={BLOCK_TYPES}
            currentBlockColor={readBlockColor(block.content)}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onDelete}
            onTurnInto={(type) => onChangeType(type)}
            onCopyBlockLink={onCopyBlockLink}
            onColorChange={(colorId) => {
              onRecordBlockUndo?.();
              const next = { ...(block.content ?? {}) } as Record<string, unknown>;
              if (colorId === 'default') delete next.blockColor;
              else next.blockColor = colorId;
              onUpdate(next);
            }}
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
  canMergeWithPrevious,
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
  onCopyBlockLink,
  onRecordBlockUndo,
  isFocused = false,
  mergeFocusCaretOffset,
  onRequestCaretOffset,
  nestDepth = 1,
  onFocusBlock,
  onAddChildBelow,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
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
  canMergeWithPrevious?: () => boolean;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onDuplicate?: () => void;
  onCopyBlockLink?: () => void;
  onRecordBlockUndo?: () => void;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onRequestCaretOffset?: (offset: number) => void;
  nestDepth?: number;
  onFocusBlock?: () => void;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
}) {
  const isListSibling = block.type === 'bulletList' || block.type === 'numberedList';
  const blockTypeLabel = BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const isDragActive = useBlockDragActive();
  const selectedBlockIds = useSelectedBlockIds();
  const onBlockSelect = useOnBlockSelect();
  const suppressGripMenuRef = useSuppressGripMenuRef();
  const isSelected = selectedBlockIds.has(block.id);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : isSelected && isDragActive && selectedBlockIds.size > 1 ? 0.4 : 1,
    zIndex: isDragging ? 10 + nestDepth : undefined,
  };

  const menuShiftLeft = toggleMenuAnchorOffset(nestDepth);
  const menuZIndex = 10000 + nestDepth;

  const [inlineHandleMenuAnchor, setInlineHandleMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const inlineGripBtnRef = useRef<HTMLButtonElement>(null);
  const gutterPinned = !!inlineHandleMenuAnchor || addPickerOpen;
  const hoveredBlockId = useHoveredBlockId();
  const setHoveredBlockId = useSetHoveredBlockId();
  const isRowHovered = hoveredBlockId === block.id || gutterPinned;
  const dropTarget = useBlockDropTarget();
  const dropPos = dropTarget?.blockId === block.id ? dropTarget.position : null;

  return (
    <div
      ref={setNodeRef}
      data-note-block-row
      data-block-id={block.id}
      data-parent-block-id={block.parent_block_id ?? ''}
      data-list-sibling={isListSibling ? 'true' : undefined}
      data-nest-depth={String(nestDepth)}
      style={style}
      className={`relative overflow-visible py-0.5 transition-colors ${blockRowBgClass(block.content)} ${
        isSelected ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-200'
          : dropPos === 'inside' && (block.type === 'toggle' || block.type === 'page') ? DROP_INSIDE_BLOCK_ROW
          : isRowHovered && !block.content?.blockColor ? 'bg-neutral-50/60' : ''
      }`}
      onMouseEnter={() => setHoveredBlockId(block.id)}
    >
      <div
        className={NOTE_BLOCK_HOVER_BRIDGE}
        aria-hidden
        onMouseEnter={() => setHoveredBlockId(block.id)}
      />
      {dropPos === 'before' && <DropInsertLine position="top" />}
      {dropPos === 'after' && <DropInsertLine position="bottom" />}
      <BlockRowGutter
        blockId={block.id}
        blockType={block.type}
        nestDepth={nestDepth}
        gutterPinned={gutterPinned}
        onAddBelow={(type) => onAddBelow(type)}
        gripBtnRef={inlineGripBtnRef}
        dragAttributes={attributes}
        dragListeners={listeners}
        onPickerOpenChange={setAddPickerOpen}
        onGripClick={(e) => {
          e.stopPropagation();
          if (isDragActive) return;
          if (suppressGripMenuRef.current) {
            suppressGripMenuRef.current = false;
            return;
          }
          if ((e.ctrlKey || e.metaKey || e.shiftKey) && onBlockSelect) {
            onBlockSelect(block.id, e);
            return;
          }
          if (inlineHandleMenuAnchor) { setInlineHandleMenuAnchor(null); return; }
          const rect = inlineGripBtnRef.current!.getBoundingClientRect();
          setInlineHandleMenuAnchor({
            top: rect.bottom + 8,
            left: rect.left - menuShiftLeft,
          });
        }}
      />
      {inlineHandleMenuAnchor && (
        <div className="fixed" style={{ top: inlineHandleMenuAnchor.top, left: inlineHandleMenuAnchor.left, zIndex: menuZIndex }}>
          <BlockHandleMenu
            blockTypeLabel={blockTypeLabel}
            blockType={block.type}
            commands={BLOCK_TYPES}
            currentBlockColor={readBlockColor(block.content)}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onDelete}
            onTurnInto={(type) => onChangeType(type)}
            onCopyBlockLink={onCopyBlockLink}
            onColorChange={(colorId) => {
              onRecordBlockUndo?.();
              const next = { ...(block.content ?? {}) } as Record<string, unknown>;
              if (colorId === 'default') delete next.blockColor;
              else next.blockColor = colorId;
              onUpdate(next);
            }}
            onClose={() => setInlineHandleMenuAnchor(null)}
          />
        </div>
      )}
      <div
        className="min-w-0 cursor-text select-text"
        onPointerDown={stopNoteEditorPointerBubble}
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
          canMergeWithPrevious={canMergeWithPrevious}
          onIndentChange={onIndentChange}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          isDragging={isDragging}
          focusedToggleId={focusedToggleId}
          uploadImage={uploadImage}
          childBlocks={childBlocks}
          renderChildBlock={
            block.type === 'toggle' || block.type === 'bulletList' || block.type === 'numberedList'
              ? renderChildBlock
              : undefined
          }
          onAddChildBelow={onAddChildBelow}
          onTrackActiveBlock={onTrackActiveBlock}
          isInsideToggle
          isDropTarget={isDropTarget}
          isFocused={isFocused}
          mergeFocusCaretOffset={mergeFocusCaretOffset}
          onRequestCaretOffset={onRequestCaretOffset}
          toggleNestDepth={nestDepth}
          onFocusBlock={onFocusBlock}
          autoFocusTitleSignal={autoFocusTitleSignal}
          numberedListIndex={numberedListIndex}
          bulletListNestLevel={bulletListNestLevel}
        />
      </div>
    </div>
  );
}

/* ─── DragPreview ────────────────────────────────────────────────────────── */
function DragPreview({ block }: { block: NoteBlock }) {
  const text =
    block.type === 'divider' ? '── 구분선 ──'
    : block.type === 'image' ? '🖼 이미지'
    : block.type === 'video' ? '▶ 영상'
    : block.type === 'toggle'
      ? ((block.content?.title as string) || '(토글)')
    : (block.content?.text as string) || '';

  return (
    <div className="flex max-w-[520px] items-center gap-2 rounded-md bg-white/95 px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06]">
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
      <span className="truncate text-[15px] text-neutral-700">{text || '(빈 블록)'}</span>
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
  const [showDocIconPicker, setShowDocIconPicker] = useState(false);
  const [docIconDraft, setDocIconDraft] = useState('');
  const docIconInputRef = useRef<HTMLInputElement>(null);
  const [sidebarIconPicker, setSidebarIconPicker] = useState<{ docId: string; top: number; left: number } | null>(null);
  const [sidebarIconDraft, setSidebarIconDraft] = useState('');
  const sidebarIconInputRef = useRef<HTMLInputElement>(null);
  const [mergeFocusCaretOffset, setMergeFocusCaretOffset] = useState<number | undefined>(undefined);
  const requestCaretOffset = useCallback((offset: number) => {
    setMergeFocusCaretOffset(offset);
    window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
  }, []);
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
  const [expandedSidebarDocs, setExpandedSidebarDocs] = useState<Set<string>>(() => new Set());
  const [dropTarget, setDropTarget] = useState<BlockDropTarget>(null);
  const dropTargetRef = useRef<BlockDropTarget>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
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
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [backlinksExpanded, setBacklinksExpanded] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement>(null);
  const [restoringBlockId, setRestoringBlockId] = useState<string | null>(null);
  const [purgingBlockId, setPurgingBlockId] = useState<string | null>(null);
  const lastDeletedBlockIdRef = useRef<string | null>(null);
  const noteUndo = useNoteBlockUndo();
  const setPendingDeleteUndo = useCallback((blockId: string | null) => {
    lastDeletedBlockIdRef.current = blockId;
  }, []);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(() => new Set());
  const [marqueeBox, setMarqueeBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [multiDragCount, setMultiDragCount] = useState(0);
  const selectedBlockIdsRef = useRef<Set<string>>(new Set());
  const lastClickedBlockIdRef = useRef<string | null>(null);
  const blockMarqueeRef = useRef<{
    additive: boolean;
    shiftAnchor: boolean;
    started: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const blockMarqueeListenersRef = useRef<{
    onMove: (ev: PointerEvent) => void;
    onUp: () => void;
  } | null>(null);
  const multiDragBlockIdsRef = useRef<string[] | null>(null);
  const suppressGripMenuRef = useRef(false);

  const saveTimersRef = useRef<Record<string, number | undefined>>({});
  const savedTimerRef = useRef<number | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const blocksRef = useRef<NoteBlock[]>([]);
  const focusedEditorBlockIdRef = useRef<string | null>(null);
  const focusedEditorPartRef = useRef<'title' | 'editor' | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const noteBlockDragActiveRef = useRef(false);
  const pointerYRef = useRef(0);
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => { pointerYRef.current = e.clientY; };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);
  useEffect(() => { selectedBlockIdsRef.current = selectedBlockIds; }, [selectedBlockIds]);
  const handleDeleteBlockRef = useRef<typeof handleDeleteBlock | null>(null);
  const handleDeleteBlocksRef = useRef<typeof handleDeleteBlocks | null>(null);

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
    caretOffset?: number,
  ) => {
    if (!blockId) return;
    const alreadyFocused =
      focusedEditorBlockIdRef.current === blockId
      && focusedEditorPartRef.current === part;
    if (selectedBlockIdsRef.current.size > 0) {
      setSelectedBlockIds(new Set());
    }
    if (caretOffset !== undefined) {
      setMergeFocusCaretOffset(caretOffset);
      window.setTimeout(() => setMergeFocusCaretOffset(undefined), 0);
    } else if (!alreadyFocused) {
      setMergeFocusCaretOffset(undefined);
    }
    focusedEditorBlockIdRef.current = blockId;
    focusedEditorPartRef.current = part;
    setFocusedEditorBlockId(blockId);
    setFocusedEditorPart(part);
    if (!alreadyFocused) {
      if (part === 'title') {
        setFocusTitleSignal((v) => v + 1);
      } else {
        setFocusSignal((v) => v + 1);
      }
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
  }, [documents, searchQuery, sortKey, docTab]);

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
    let cancelled = false;
    setBlocks([]);
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
        if (!cancelled) setBlocks(json.blocks ?? []);
      } catch (e) {
        devLogger.error('[Note] loadBlocks', e);
        if (!cancelled) setError(e instanceof Error ? e.message : '로드 실패');
      } finally {
        if (!cancelled) setLoadingBlocks(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    setTrashedBlocks([]);
    setPendingDeleteUndo(null);
  }, [selectedId, setPendingDeleteUndo]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const childrenByParentBlock = useMemo(() => buildChildrenByParentBlock(blocks), [blocks]);
  const rootBlocks = useMemo(() => sortRootBlocks(blocks), [blocks]);
  const rootSortableBlockIds = useMemo(() => rootBlocks.map((block) => block.id), [rootBlocks]);

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
      noteBlockDragActiveRef.current = false;
    } else {
      setActiveBlockId(activeId);
      setActiveDragDocId(null);
      noteBlockDragActiveRef.current = true;
      const selected = selectedBlockIdsRef.current;
      if (selected.size > 1 && selected.has(activeId)) {
        const rootIds = sortRootBlocks(blocksRef.current)
          .filter((block) => selected.has(block.id))
          .map((block) => block.id);
        multiDragBlockIdsRef.current = rootIds.length > 1 ? rootIds : null;
        setMultiDragCount(rootIds.length > 1 ? rootIds.length : 0);
      } else {
        multiDragBlockIdsRef.current = null;
        setMultiDragCount(0);
      }
    }
    setDropTarget(null);
    dropTargetRef.current = null;
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
    const fieldUpdates = depthPatches.map((patch) => ({ id: patch.id, content: patch.content }));
    await putNoteBlockOrders(orders, fieldUpdates.length > 0 ? fieldUpdates : undefined);
    triggerSave();
  }, [triggerSave]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDropTarget(null);
      dropTargetRef.current = null;
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
      setDropTarget(null);
      dropTargetRef.current = null;
      return;
    }
    if (activeId === overId) {
      setDropTarget(null);
      dropTargetRef.current = null;
      return;
    }
    const nextTarget = resolveBlockDropTarget(overId, blocksRef.current, event, pointerYRef.current);
    setDropTarget(nextTarget);
    dropTargetRef.current = nextTarget;
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveBlockId(null);
    setActiveDragDocId(null);
    setDropTarget(null);
    dropTargetRef.current = null;
    noteBlockDragActiveRef.current = false;
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
    extraFieldUpdates: Array<{ id: string; content: Record<string, unknown> }> = [],
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

    const fieldUpdates = [
      {
        id: moving.id,
        parent_block_id: plan.targetParentId,
        order_index: plan.targetSiblings.findIndex((block) => block.id === moving.id),
        ...(contentPatch ? { content: contentPatch } : {}),
      },
      ...extraFieldUpdates.map((patch) => ({ id: patch.id, content: patch.content })),
    ];

    await putNoteBlockOrders(orders, fieldUpdates);
    triggerSave();
  }, [triggerSave]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveBlockId(null);
    setActiveDragDocId(null);
    const wasBlockDrag = noteBlockDragActiveRef.current;
    const groupDragIds = multiDragBlockIdsRef.current;
    multiDragBlockIdsRef.current = null;
    setMultiDragCount(0);
    noteBlockDragActiveRef.current = false;
    const { active, over } = event;
    const resolvedTarget = over
      ? resolveBlockDropTarget(String(over.id), blocksRef.current, event, pointerYRef.current)
      : dropTargetRef.current;
    setDropTarget(null);
    dropTargetRef.current = null;
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
        const prevBlocks = blocksRef.current;
        const rootSiblings = sortRootBlocks(prevBlocks);
        const idx = rootSiblings.findIndex((block) => block.id === movingBlock.id);
        if (idx < 0) return;
        const movedRoots = [
          rootSiblings[idx],
          ...rootSiblings.slice(0, idx),
          ...rootSiblings.slice(idx + 1),
        ];
        const { normalized, depthPatches } = normalizeDepthByOrder(movedRoots);
        const normalizedMap = new Map(normalized.map((block) => [block.id, block]));
        const nextBlocks = prevBlocks.map((block) => normalizedMap.get(block.id) ?? block);
        setBlocks(nextBlocks);
        try {
          await persistOrderAndDepth(normalized, depthPatches);
        } catch (e) {
          devLogger.error('[Note] moveBlockToCurrentDoc', e);
          setBlocks(prevBlocks);
          setError(e instanceof Error ? e.message : '블록 순서 저장 실패');
        }
        return;
      }

      // Move the whole subtree across documents so toggle children are not orphaned.
      const descendantIds = collectDescendantBlockIds(movingBlock.id, blocksRef.current);
      const idsToMove = [movingBlock.id, ...Array.from(descendantIds)];
      try {
        for (const blockId of idsToMove) {
          const res = await fetch('/api/admin/note/blocks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              id: blockId,
              document_id: targetDocumentId,
              ...(blockId === movingBlock.id ? { parent_block_id: null } : {}),
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
        devLogger.error('[Note] moveBlockToDoc', e);
        setError(e instanceof Error ? e.message : '블록 이동 실패');
      }
      return;
    }

    const prevBlocks = blocksRef.current;
    const moving = prevBlocks.find((block) => block.id === active.id);
    if (!moving) return;

    const resolvedOverBlockId = overId.startsWith('block-inside:')
      ? overId.slice('block-inside:'.length)
      : overId;
    const overBlock = prevBlocks.find((block) => block.id === resolvedOverBlockId);

    if (groupDragIds && groupDragIds.length > 1) {
      const target = resolvedTarget ?? (overBlock ? { blockId: resolvedOverBlockId, position: 'before' as BlockDropPosition } : null);
      if (target && !groupDragIds.includes(target.blockId) && target.position !== 'inside') {
        const nextRoots = planMoveRootBlockGroup(
          prevBlocks,
          groupDragIds,
          target.blockId,
          target.position,
        );
        if (nextRoots) {
          const { normalized, depthPatches } = normalizeDepthByOrder(nextRoots);
          const normalizedMap = new Map(normalized.map((block) => [block.id, block]));
          const nextBlocks = prevBlocks.map((block) => normalizedMap.get(block.id) ?? block);
          setBlocks(nextBlocks);
          try {
            await persistOrderAndDepth(normalized, depthPatches);
          } catch (e) {
            devLogger.error('[Note] moveBlockGroup', e);
            setBlocks(prevBlocks);
            setError(e instanceof Error ? e.message : '블록 묶음 이동 저장 실패');
          }
          return;
        }
      }
    }

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

    const target = resolvedTarget ?? (overBlock ? { blockId: overId, position: 'before' as BlockDropPosition } : null);
    if (!target) return;
    const plan = planBlockDropAt(
      wasBlockDrag ? blocksRef.current : prevBlocks,
      moving.id,
      target.blockId,
      target.position,
    );
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

    let nextBlocks = prevBlocks.map((block) => {
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

    let depthPatches: Array<{ id: string; content: Record<string, unknown> }> = [];
    if (plan.targetParentId === null) {
      const normalizedResult = normalizeDepthByOrder(sortRootBlocks(nextBlocks));
      depthPatches = normalizedResult.depthPatches;
      const depthMap = new Map(normalizedResult.normalized.map((block) => [block.id, block]));
      nextBlocks = nextBlocks.map((block) => depthMap.get(block.id) ?? block);
    }

    setBlocks(nextBlocks);
    try {
      await persistBlockReparent(moving, plan, prevBlocks, depthPatches);
    } catch (e) {
      devLogger.error('[Note] reparentBlock', e);
      setBlocks(prevBlocks);
      setError(e instanceof Error ? e.message : '블록 이동 저장 실패');
    }
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

  const handleSetDocumentCover = useCallback(async (docId: string, cover: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const base = { ...(doc.properties ?? {}) };
    const trimmed = cover.trim();
    if (trimmed) base.cover = trimmed;
    else delete base.cover;
    const nextProperties = Object.keys(base).length > 0 ? base : null;
    await handleUpdateDocProperties(docId, nextProperties);
  }, [documents, handleUpdateDocProperties]);

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

  useEffect(() => {
    const onHide = () => hideFormatToolbar();
    document.addEventListener('note-hide-format-toolbar', onHide);
    return () => document.removeEventListener('note-hide-format-toolbar', onHide);
  }, [hideFormatToolbar]);

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
        noteUndo.pushUndoCreate(newBlock.id);
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
  }, [selectedId, triggerSave, closeAll, router, noteUndo]);

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
    const timers = saveTimersRef.current;
    if (timers[block.id]) clearTimeout(timers[block.id]);
    timers[block.id] = window.setTimeout(async () => {
      setLoadingState('saving');
      try {
        const latest = blocksRef.current.find((b) => b.id === block.id);
        const contentToSave = latest?.content ?? content;
        await patchNoteBlocks([{ id: block.id, content: contentToSave }]);
        delete timers[block.id];
        if (Object.keys(timers).filter((k) => !k.startsWith('doc_')).length === 0) triggerSave();
      } catch (e) { devLogger.error('[Note] updateBlock', e); setLoadingState('idle'); }
    }, 600);
  }, [triggerSave]);

  const recordBlockUndo = useCallback((blockIds: string[]) => {
    noteUndo.pushRestoreBlocksUndo(blocksRef.current, blockIds);
  }, [noteUndo]);

  const registerCreatedBlockUndo = useCallback((blockId: string) => {
    noteUndo.pushUndoCreate(blockId);
  }, [noteUndo]);

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
        void persistBlockReparent(moving, plan, prevBlocks, depthPatches)
          .catch((e) => devLogger.error('[Note] depth-sync-after-tab-reparent', e));
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

    // 글머리·번호 목록은 부모-자식 구조로만 들여쓰기
    if (block.type === 'bulletList' || block.type === 'numberedList') return;

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
    if (!target) return;
    if (direction === 'previous') {
      const targetText = typeof target.content?.text === 'string' ? target.content.text : '';
      focusBlockEditor(target.id, 'editor', targetText.length);
      return;
    }
    focusBlockEditor(target.id, 'editor', 0);
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
      const baseContent = options?.content ?? defaultBlockContent(type, { insideToggle });
      const baseContentMap = baseContent as Record<string, unknown>;
      const blockContent = (insideToggle && baseContent && !baseContentMap.placedInToggle)
        ? { ...baseContent, placedInToggle: true }
        : baseContent;
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: selectedId,
          type,
          content: blockContent,
          order_index: clampedIndex,
          parent_block_id: parentId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '블록 추가 실패');
      }
      const json = (await res.json()) as { block: NoteBlock };
      let orderPayload: { id: string; order_index: number }[] = [];
      setBlocks((prev) => {
        // split 직후 onChange로 갱신된 본문을 유지 — blocksRef 스냅샷으로 덮어쓰지 않음
        const latestSiblings = prev
          .filter((b) => (b.parent_block_id ?? null) === parentId)
          .sort((a, b) => a.order_index - b.order_index);
        const latestIndex = Math.max(0, Math.min(insertIndex, latestSiblings.length));
        const nextSiblings = [
          ...latestSiblings.slice(0, latestIndex),
          json.block,
          ...latestSiblings.slice(latestIndex),
        ].map((block, index) => ({ ...block, order_index: index }));
        orderPayload = nextSiblings.map((block) => ({ id: block.id, order_index: block.order_index }));
        const siblingIds = new Set(nextSiblings.map((block) => block.id));
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
        body: JSON.stringify({ orders: orderPayload }),
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

  const handleInsertBlockAfter = useCallback(async (
    afterBlock: NoteBlock,
    type: NoteBlock['type'] = 'text',
    content?: Record<string, unknown>,
  ) => {
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
    await insertBlockAmongSiblings(parentId, type, insertIndex, content ? { content } : undefined);
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

  const handleBlockListMouseLeave = useCallback(() => {
    setHoveredBlockId(null);
  }, []);

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
      '[data-note-block-row], [data-note-editor-host], button, input, textarea, a, .ProseMirror, [data-toggle-title], [data-note-ignore-whitespace]',
    )) {
      return;
    }
    clearAllCrossSelectState();
    setSelectedBlockIds(new Set());
    e.preventDefault();
    handleClickEditorWhitespace();
  }, [handleClickEditorWhitespace]);

  const handleChangeBlockType = useCallback(async (block: NoteBlock, type: NoteBlock['type']) => {
    recordBlockUndo([block.id]);
    const nextContent = buildContentForTypeChange(block.content, block.type, type);
    const alreadyFocused = focusedEditorBlockIdRef.current === block.id;
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, type, content: nextContent } : b)));
    if (!alreadyFocused) {
      focusBlockEditor(block.id, type === 'toggle' ? 'title' : 'editor');
    }
    try {
      await patchNoteBlocks([{ id: block.id, type, content: nextContent }]);
      triggerSave();
    } catch (e) { devLogger.error('[Note] changeBlockType', e); }
  }, [focusBlockEditor, recordBlockUndo, triggerSave]);

  const persistDeletePromotionPatches = useCallback(async (
    patches: Array<{
      id: string;
      parent_block_id: string | null;
      order_index: number;
      content?: Record<string, unknown>;
    }>,
  ) => {
    await patchNoteBlocks(
      patches.map((patch) => ({
        id: patch.id,
        parent_block_id: patch.parent_block_id,
        order_index: patch.order_index,
        ...(patch.content ? { content: patch.content } : {}),
      })),
    );
  }, []);

  const softDeleteBlockIds = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const res = await fetch('/api/admin/note/blocks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || '삭제 실패');
    }
  }, []);

  const finalizeBlockDelete = useCallback(async (options?: {
    skipDeleteUndo?: boolean;
    lastDeletedId?: string | null;
  }) => {
    if (!options?.skipDeleteUndo && options?.lastDeletedId) {
      noteUndo.pushUndoDelete(options.lastDeletedId);
      setPendingDeleteUndo(options.lastDeletedId);
    }
    if (docTab === 'block-trash') {
      setMobileTab('list');
      await loadTrashedBlocks();
    }
    triggerSave();
  }, [docTab, loadTrashedBlocks, noteUndo, setPendingDeleteUndo, triggerSave]);

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
        await persistDeletePromotionPatches([...patchMap.values()]);
      }
      await softDeleteBlockIds([block.id]);
      await finalizeBlockDelete({
        skipDeleteUndo,
        lastDeletedId: block.id,
      });
    } catch (e) {
      devLogger.error('[Note] deleteBlock', e);
      setError(e instanceof Error ? e.message : '블록 삭제 실패');
      setBlocks(prevBlocks);
    }
  }, [finalizeBlockDelete, focusBlockEditor, persistDeletePromotionPatches, softDeleteBlockIds]);

  const handleDeleteBlocks = useCallback(async (
    blocksToDelete: NoteBlock[],
    options?: { skipDeleteUndo?: boolean; focusPrevious?: boolean },
  ) => {
    const targets = blocksToDelete.filter((block) =>
      blocksRef.current.some((item) => item.id === block.id),
    );
    if (targets.length === 0) return;

    if (targets.length === 1) {
      await handleDeleteBlock(targets[0], options?.focusPrevious ?? false, options?.skipDeleteUndo ?? false);
      return;
    }

    const prevBlocks = blocksRef.current;
    const plan = planBatchDeleteBlocks(prevBlocks, targets.map((block) => block.id));
    if (!plan || plan.deletedIds.length === 0) return;

    setBlocks(plan.nextBlocks);

    try {
      await persistDeletePromotionPatches(plan.patches);
      await softDeleteBlockIds(plan.deletedIds);
      await finalizeBlockDelete({
        skipDeleteUndo: options?.skipDeleteUndo,
        lastDeletedId: plan.deletedIds[plan.deletedIds.length - 1] ?? null,
      });
    } catch (e) {
      devLogger.error('[Note] deleteBlocks', e);
      setError(e instanceof Error ? e.message : '블록 삭제 실패');
      setBlocks(prevBlocks);
    }
  }, [finalizeBlockDelete, handleDeleteBlock, persistDeletePromotionPatches, softDeleteBlockIds]);

  // selectedBlockIds 키보드 핸들러에서 최신 삭제 핸들러를 쓰기 위한 ref 동기화
  handleDeleteBlockRef.current = handleDeleteBlock;
  handleDeleteBlocksRef.current = handleDeleteBlocks;

  const applyBlockSelectRange = useCallback((
    anchorId: string,
    endId: string,
    options?: { additive?: boolean },
  ) => {
    const range = getSiblingBlockRangeIds(blocksRef.current, anchorId, endId);
    if (range.length === 0) return;
    if (options?.additive) {
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        for (const rid of range) next.add(rid);
        return next;
      });
    } else {
      setSelectedBlockIds(new Set(range));
    }
  }, []);

  const handleBlockSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedBlockIdRef.current) {
      applyBlockSelectRange(lastClickedBlockIdRef.current, id);
      lastClickedBlockIdRef.current = id;
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } else {
      setSelectedBlockIds(new Set([id]));
    }
    lastClickedBlockIdRef.current = id;
  }, [applyBlockSelectRange]);

  const applyMarqueeSelection = useCallback((marquee: MarqueeRect, options: { additive: boolean; shiftAnchor: boolean }) => {
    const ids = getMarqueeSelectedBlockIds(marquee);
    if (ids.length === 0) {
      if (!options.additive && !options.shiftAnchor) setSelectedBlockIds(new Set());
      return;
    }

    let nextIds = ids;
    if (options.shiftAnchor && lastClickedBlockIdRef.current) {
      const anchorId = lastClickedBlockIdRef.current;
      const sorted = [...ids].sort((a, b) => {
        const blockA = blocksRef.current.find((item) => item.id === a);
        const blockB = blocksRef.current.find((item) => item.id === b);
        return (blockA?.order_index ?? 0) - (blockB?.order_index ?? 0);
      });
      const rangeIds = getSiblingBlockRangeIds(
        blocksRef.current,
        anchorId,
        sorted[sorted.length - 1] ?? anchorId,
      );
      nextIds = [...new Set([...rangeIds, ...ids])];
    }

    if (options.additive && !options.shiftAnchor) {
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        for (const id of nextIds) next.add(id);
        return next;
      });
      return;
    }

    setSelectedBlockIds(new Set(nextIds));
    lastClickedBlockIdRef.current = nextIds[nextIds.length - 1] ?? null;
  }, []);

  const handleBlockListPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (noteBlockDragActiveRef.current) return;
    if (isMarqueeSelectStartBlocked(e.target)) return;

    const abortBlockMarquee = () => {
      noteBlockMarqueeGuard.active = false;
      document.body.style.userSelect = '';
      document.body.classList.remove('note-list-cross-active');
      setMarqueeBox(null);
      blockMarqueeRef.current = null;
      const listeners = blockMarqueeListenersRef.current;
      if (listeners) {
        document.removeEventListener('pointermove', listeners.onMove);
        document.removeEventListener('pointerup', listeners.onUp);
        document.removeEventListener('pointercancel', listeners.onUp);
        blockMarqueeListenersRef.current = null;
      }
    };

    // 텍스트 위: 일반 드래그=글자 선택. Shift/Ctrl+드래그=블록 마퀴
    const hasModifier = e.shiftKey || e.ctrlKey || e.metaKey;
    if (isNoteTextSurfaceTarget(e.target) && !hasModifier) {
      clearAllCrossSelectState();
      return;
    }

    clearAllCrossSelectState();

    const target = notePointerTargetElement(e.target);
    if (!target?.closest('[data-note-marquee-zone]')) return;

    abortBlockMarquee();

    blockMarqueeRef.current = {
      additive: e.ctrlKey || e.metaKey,
      shiftAnchor: e.shiftKey,
      started: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    noteBlockMarqueeGuard.active = true;
    // e.preventDefault() 없음 — click 이벤트를 살려야 블록 클릭 포커스가 유지됨
    // userSelect 즉시 차단으로 텍스트 드래그 이미지만 방지
    document.body.style.userSelect = 'none';

    const onMove = (ev: PointerEvent) => {
      const state = blockMarqueeRef.current;
      if (!state) return;

      const dx = Math.abs(ev.clientX - state.startX);
      const dy = Math.abs(ev.clientY - state.startY);
      if (!state.started) {
        if (dx < 4 && dy < 4) return;
        state.started = true;
        suppressGripMenuRef.current = true;
        clearAllCrossSelectState();
        collapseAllNoteEditorSelections();
      }

      const left = Math.min(state.startX, ev.clientX);
      const top = Math.min(state.startY, ev.clientY);
      const width = Math.abs(ev.clientX - state.startX);
      const height = Math.abs(ev.clientY - state.startY);
      setMarqueeBox({ left, top, width, height });

      applyMarqueeSelection(
        { left, top, right: left + width, bottom: top + height },
        { additive: state.additive, shiftAnchor: state.shiftAnchor },
      );
    };

    const onUp = () => {
      const state = blockMarqueeRef.current;
      noteBlockMarqueeGuard.active = false;
      document.body.style.userSelect = '';
      setMarqueeBox(null);
      blockMarqueeRef.current = null;
      blockMarqueeListenersRef.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);

      // 드래그 없이 클릭만 한 경우 → 멀티 선택 해제 (노션: 다른 블록·여백 클릭)
      if (state && !state.started && !state.additive && !state.shiftAnchor) {
        setSelectedBlockIds(new Set());
      }
    };

    blockMarqueeListenersRef.current = { onMove, onUp };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }, [applyMarqueeSelection]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (selectedBlockIdsRef.current.size === 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(
        '[data-note-marquee-zone], [data-note-format-toolbar], button, input, textarea, a',
      )) {
        return;
      }
      setSelectedBlockIds(new Set());
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

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

    focusBlockEditor(plan.previousId, 'editor', plan.caretOffset);

    try {
      await patchNoteBlocks([{ id: plan.previousId, content: plan.mergedContent }]);
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
      if (lastDeletedBlockIdRef.current === block.id) setPendingDeleteUndo(null);
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
  }, [focusBlockEditor, setPendingDeleteUndo, triggerSave]);

  const applyNoteUndoEntry = useCallback(async (entry: NoteUndoEntry | null) => {
    if (!entry) return;
    if (entry.kind === 'restore-blocks') {
      setBlocks((prev) => {
        const map = new Map(entry.snapshots.map((snapshot) => [snapshot.id, snapshot]));
        return prev.map((block) => {
          const snapshot = map.get(block.id);
          if (!snapshot) return block;
          return {
            ...block,
            type: snapshot.type,
            content: snapshot.content,
            parent_block_id: snapshot.parent_block_id,
            order_index: snapshot.order_index,
          };
        });
      });
      try {
        await patchNoteBlocks(entry.snapshots.map((snapshot) => ({
          id: snapshot.id,
          type: snapshot.type,
          content: snapshot.content,
          parent_block_id: snapshot.parent_block_id,
          order_index: snapshot.order_index,
        })));
        triggerSave();
      } catch (e) {
        devLogger.error('[Note] undo restore-blocks', e);
        setError(e instanceof Error ? e.message : '실행 취소 실패');
      }
      return;
    }
    if (entry.kind === 'undo-create') {
      const block = blocksRef.current.find((item) => item.id === entry.blockId);
      if (block) await handleDeleteBlock(block, false, true);
      return;
    }
    if (entry.kind === 'undo-delete') {
      setPendingDeleteUndo(null);
      await handleRestoreBlockFromTrash({ id: entry.blockId } as NoteBlock);
    }
  }, [handleDeleteBlock, handleRestoreBlockFromTrash, setPendingDeleteUndo, triggerSave]);

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
      if (lastDeletedBlockIdRef.current === block.id) setPendingDeleteUndo(null);
      setTrashedBlocks((prev) => prev.filter((b) => b.id !== block.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] purgeBlockFromTrash', e);
      setError(e instanceof Error ? e.message : '블록 영구삭제 실패');
    } finally {
      setPurgingBlockId(null);
    }
  }, [setPendingDeleteUndo, triggerSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
      if (!isUndo) return;
      if (!noteUndo.hasUndo()) return;

      const target = e.target as HTMLElement | null;
      const isEditing = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        !!target.closest(
          '[contenteditable="true"], .ProseMirror, .note-rich-editor, [data-toggle-title], [data-note-list-text]',
        )
      );
      if (isEditing) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      const entry = noteUndo.popUndo();
      void applyNoteUndoEntry(entry);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [applyNoteUndoEntry, noteUndo]);

  // 멀티 블록 선택: Ctrl+A / Escape / Delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isEditing = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        !!target.closest('[contenteditable="true"]')
      );

      if (meta && e.key === 'a' && !isEditing) {
        e.preventDefault();
        setSelectedBlockIds(new Set(blocksRef.current.map((b) => b.id)));
        return;
      }
      if (e.key === 'Escape' && selectedBlockIdsRef.current.size > 0) {
        setSelectedBlockIds(new Set());
        return;
      }
      if (e.key === 'Delete' && selectedBlockIdsRef.current.size > 0 && !isEditing) {
        e.preventDefault();
        const ids = [...selectedBlockIdsRef.current];
        setSelectedBlockIds(new Set());
        const blocks = ids
          .map((id) => blocksRef.current.find((b) => b.id === id))
          .filter((block): block is NoteBlock => !!block);
        void handleDeleteBlocksRef.current?.(blocks, { skipDeleteUndo: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleSidebarDocExpanded = useCallback((docId: string) => {
    setExpandedSidebarDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  /* 선택한 페이지까지 사이드바 트리만 펼침 (나머지는 기본 접힘 유지) */
  useEffect(() => {
    if (!selectedId) return;
    const doc = documents.find((d) => d.id === selectedId);
    if (!doc?.parent_id) return;
    const ancestorIds: string[] = [];
    let parentId: string | null = doc.parent_id;
    const docMap = new Map(documents.map((d) => [d.id, d]));
    while (parentId) {
      ancestorIds.push(parentId);
      parentId = docMap.get(parentId)?.parent_id ?? null;
    }
    if (ancestorIds.length === 0) return;
    setExpandedSidebarDocs((prev) => {
      const next = new Set(prev);
      for (const id of ancestorIds) next.add(id);
      return next;
    });
  }, [selectedId, documents]);

  const renderDocumentTree = (doc: NoteDocument, depth = 0): ReactNode => {
    const children = childrenByParent.get(doc.id) ?? [];
    const isExpanded = expandedSidebarDocs.has(doc.id);
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

  const renderToggleInlineChild = (block: NoteBlock, nestDepth = 1): ReactNode => {
    const childBlocks = childrenByParentBlock.get(block.id) ?? [];
    const siblings = getBlocksInParent(blocks, block.parent_block_id ?? null);
    const numberedListIndex = block.type === 'numberedList'
      ? numberedListIndexAmongSiblings(block, siblings)
      : undefined;
    const bulletListNestLevel = block.type === 'bulletList'
      ? bulletListNestLevelAmongContainers(block, blocks)
      : undefined;
    return (
      <ToggleInlineRow
        key={block.id}
        block={block}
        nestDepth={nestDepth}
        childBlocks={childBlocks}
        numberedListIndex={numberedListIndex}
        bulletListNestLevel={bulletListNestLevel}
        renderChildBlock={renderToggleInlineChild}
        onUpdate={(content) => handleUpdateBlock(block, content)}
        onDelete={() => handleDeleteBlock(block)}
        onChangeType={(type) => handleChangeBlockType(block, type)}
        onEnter={() => handleInsertBlockAfter(block, 'text')}
        onAddBelow={(type, content) => { void handleInsertBlockAfter(block, type ?? block.type, content); }}
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
        canMergeWithPrevious={() => !!planMergeWithPreviousBlock(blocksRef.current, block.id)}
        onDuplicate={() => { void handleDuplicateBlock(block); }}
        onCopyBlockLink={() => handleCopyBlockLink(block)}
        onRecordBlockUndo={() => recordBlockUndo([block.id])}
        onIndentChange={(direction) => handleIndentBlock(block, direction)}
        onNavigatePrevious={() => handleNavigateBlock(block, 'previous')}
        onNavigateNext={() => handleNavigateBlock(block, 'next')}
        focusedToggleId={focusedToggleId}
        onFocusToggle={setFocusedToggleId}
        onTrackActiveBlock={(part) => trackActiveBlock(block.id, part)}
        uploadImage={uploadNoteImage}
        isDropTarget={dropTarget?.blockId === block.id && dropTarget?.position === 'inside'}
        resolvePageIcon={resolvePageIcon}
        isFocused={focusedEditorBlockId === block.id}
        mergeFocusCaretOffset={focusedEditorBlockId === block.id ? mergeFocusCaretOffset : undefined}
        onRequestCaretOffset={requestCaretOffset}
        onFocusBlock={() => focusBlockEditor(block.id)}
        onAddChildBelow={
          block.type === 'toggle'
            ? (type) => { void handleInsertBlockInParent(block.id, type ?? 'text'); }
            : undefined
        }
      />
    );
  };

  const renderSortableBlock = (block: NoteBlock): ReactNode => {
    const childBlocks = childrenByParentBlock.get(block.id) ?? [];
    const siblings = getBlocksInParent(blocks, block.parent_block_id ?? null);
    const numberedListIndex = block.type === 'numberedList'
      ? numberedListIndexAmongSiblings(block, siblings)
      : undefined;
    const bulletListNestLevel = block.type === 'bulletList'
      ? bulletListNestLevelAmongContainers(block, blocks)
      : undefined;
    return (
      <SortableBlockRow
        key={block.id}
        block={block}
        childBlocks={childBlocks}
        numberedListIndex={numberedListIndex}
        bulletListNestLevel={bulletListNestLevel}
        renderChildBlock={renderToggleInlineChild}
        onAddChildBelow={(type) => { void handleInsertBlockInParent(block.id, type ?? 'text'); }}
        onUpdate={(content) => handleUpdateBlock(block, content)}
        onDelete={() => handleDeleteBlock(block)}
        onChangeType={(type) => handleChangeBlockType(block, type)}
        onEnter={() => handleInsertBlockAfter(block, 'text')}
        onAddBelow={(type, content) => { void handleInsertBlockAfter(block, type ?? 'text', content); }}
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
        canMergeWithPrevious={() => !!planMergeWithPreviousBlock(blocksRef.current, block.id)}
        onDuplicate={() => { void handleDuplicateBlock(block); }}
        onCopyBlockLink={() => handleCopyBlockLink(block)}
        onRecordBlockUndo={() => recordBlockUndo([block.id])}
        onIndentChange={(direction) => handleIndentBlock(block, direction)}
        onNavigatePrevious={() => handleNavigateBlock(block, 'previous')}
        onNavigateNext={() => handleNavigateBlock(block, 'next')}
        focusedToggleId={focusedToggleId}
        onFocusToggle={setFocusedToggleId}
        onTrackActiveBlock={(part) => trackActiveBlock(block.id, part)}
        uploadImage={uploadNoteImage}
        isDropTarget={dropTarget?.blockId === block.id && dropTarget?.position === 'inside'}
        resolvePageIcon={resolvePageIcon}
        isFocused={focusedEditorBlockId === block.id}
        mergeFocusCaretOffset={focusedEditorBlockId === block.id ? mergeFocusCaretOffset : undefined}
        onRequestCaretOffset={requestCaretOffset}
        onFocusBlock={() => focusBlockEditor(block.id)}
      />
    );
  };

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

  /* ── render ── */
  return (
    <NoteImageLightboxProvider>
    <div className="flex h-[var(--viewport-height-px,100dvh)] max-w-full flex-col overflow-x-hidden bg-white">
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
      {/* ── 콘텐츠 ── */}
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

          {/* ── 노트 목록 사이드바 */}
          <div className={`flex flex-col border-r border-neutral-200/80 bg-[#f7f7f5] ${
            mobileTab === 'list' ? 'flex w-full' : 'hidden'
          } md:flex md:w-[280px] md:shrink-0`}>

          {/* 워크스페이스 헤더 */}
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
              <div className={`${NOTE_PAGE_SHELL} py-10`}>
                <h1 className="text-[40px] font-bold tracking-tight text-neutral-900">관리자 노트</h1>
                <p className="mt-1 text-[14px] text-neutral-400">최상위 페이지</p>
                <div className="mt-8">
                  {loadingDocuments ? (
                    <div className="flex items-center gap-2 py-8 text-[13px] text-neutral-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      불러오는 중…
                    </div>
                  ) : rootDocuments.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleCreateDocument(null)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[14px] text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                    >
                      <Plus className="h-4 w-4" />
                      새 페이지
                    </button>
                  ) : (
                    <div className="-mx-2">
                      {rootDocuments.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleSelectDocument(doc)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-50"
                        >
                          <DocIconGlyph
                            icon={resolveDocIcon(doc.properties)}
                            fallbackClassName="h-4 w-4 shrink-0 text-neutral-400"
                            emojiClassName="shrink-0 text-[16px] leading-none"
                          />
                          <span className="min-w-0 flex-1 truncate text-[14px] text-neutral-800">{doc.title}</span>
                          <span className="shrink-0 text-[12px] text-neutral-400">{relativeTime(doc.updated_at)}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleCreateDocument(null)}
                        className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[14px] text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                      >
                        <Plus className="h-4 w-4" />
                        새 페이지
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : loadingBlocks ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />불러오는 중…
            </div>
          ) : (
            <div className="min-w-0 flex-1 overflow-y-auto bg-white">
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
                  onMouseDown={() => setSelectedBlockIds(new Set())}
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
                    {collaborators.length}명이 최근 열람 · {relativeTime(activeDocument.updated_at)}
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
                      백링크 {backlinks.length}
                    </button>
                    {backlinksExpanded && (
                      <div className="space-y-0.5 pb-3">
                        {backlinks.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-neutral-50"
                            onClick={() => handleSelectDocument(doc)}
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

                {/* 블록 목록 — 에디터 열 전체 너비에서 마퀴 선택 (사이드바 옆 여백 포함) */}
                <SelectedBlockIdsContext.Provider value={selectedBlockIds}>
                <OnBlockSelectContext.Provider value={handleBlockSelect}>
                <SuppressGripMenuRefContext.Provider value={suppressGripMenuRef}>
                <SetHoveredBlockContext.Provider value={setHoveredBlockId}>
                <HoveredBlockContext.Provider value={hoveredBlockId}>
                  <div
                    data-note-marquee-zone
                    className={NOTE_MARQUEE_ZONE}
                    onPointerDownCapture={handleBlockListPointerDown}
                    onMouseLeave={handleBlockListMouseLeave}
                  >
                    {marqueeBox && (
                      <div
                        className="pointer-events-none fixed z-[60] border border-blue-400 bg-blue-500/20"
                        style={{
                          left: marqueeBox.left,
                          top: marqueeBox.top,
                          width: marqueeBox.width,
                          height: marqueeBox.height,
                        }}
                      />
                    )}
                    <div className={`${NOTE_PAGE_SHELL} overflow-visible pb-32`}>
                      <SortableContext
                        items={rootSortableBlockIds}
                        strategy={verticalListSortingStrategy}
                      >
                        <div
                          data-note-block-list
                          className="relative overflow-visible"
                        >
                          {rootBlocks.map((block) => (
                            <Fragment key={block.id}>
                              {renderSortableBlock(block)}
                            </Fragment>
                          ))}
                        </div>
                      </SortableContext>
                    </div>
                  </div>
                </HoveredBlockContext.Provider>
                </SetHoveredBlockContext.Provider>
                </SuppressGripMenuRefContext.Provider>
                </OnBlockSelectContext.Provider>
                </SelectedBlockIdsContext.Provider>
            </div>
          )}
          </div>
        </div>

        {/* 드래그 중 미리보기 (사이드바 드롭 포함) */}
        <DragOverlay dropAnimation={{ duration: 160, easing: 'ease' }}>
          {activeBlock ? (
            multiDragCount > 1 ? (
              <div className="flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 shadow-lg">
                <GripVertical className="h-4 w-4 text-blue-500" />
                <span className="text-[14px] font-medium text-blue-800">
                  {multiDragCount}개 블록
                </span>
              </div>
            ) : (
              <DragPreview block={activeBlock} />
            )
          ) : activeDragDocument ? (
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-lg">
              <DocIconGlyph icon={resolveDocIcon(activeDragDocument.properties)} />
              <span className="max-w-[200px] truncate text-[14px] font-medium text-neutral-800">
                {activeDragDocument.title}
              </span>
            </div>
          ) : null}
        </DragOverlay>
        </BlockDropTargetContext.Provider>
        </BlockDragActiveContext.Provider>
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
    </NoteImageLightboxProvider>
  );
}
