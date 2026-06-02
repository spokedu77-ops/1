'use client';

import {
  Suspense,
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
import { NoteEditor } from './_components/NoteEditor';
import { BubbleToolbar } from './_components/BubbleToolbar';
import { SlashMenu } from './_components/SlashMenu';
import {
  buildChildrenByParentBlock,
  collectDescendantBlockIds,
  filterSiblingBlocks,
  buildReparentContentPatch,
  getBlocksInParent,
  planBlockDrop,
  planPromoteDocumentBlocksToRoot,
  sortRootBlocks,
  TOGGLE_INLINE_CHILD_TYPES,
  type BlockDropPlan,
} from '@/app/lib/note/noteBlockTree';
import {
  planToggleBodyRestores,
  resolveToggleBodyForDisplay,
} from '@/app/lib/note/toggleBody';
import {
  buildVideoBlockContentFromUrl,
  resolveVideoEmbedContent,
  videoProviderLabel,
} from '@/app/lib/note/videoEmbed';
import { VideoEmbedFrame } from './_components/VideoEmbedFrame';
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
  Slash,
  GripVertical,
  ChevronDown,
  MessageSquareQuote,
  Globe,
  Link2,
  Copy,
} from 'lucide-react';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
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

const BLOCK_TYPES: { type: NoteBlock['type']; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'heading',  label: '제목 1',     icon: Type,        desc: '큰 섹션 제목' },
  { type: 'text',     label: '텍스트',      icon: FileText,    desc: '일반 문단' },
  { type: 'todo',     label: '체크리스트',  icon: CheckSquare, desc: '완료 상태를 체크하는 할 일' },
  { type: 'page',     label: '하위 문서',   icon: FileText,    desc: '클릭하면 열리는 페이지 링크' },
  { type: 'toggle',   label: '토글',        icon: ChevronDown, desc: '접고 펼치는 섹션' },
  { type: 'callout',  label: '콜아웃',      icon: MessageSquareQuote, desc: '강조 메시지' },
  { type: 'code',     label: '코드',        icon: Type,        desc: '고정폭 코드 블록' },
  { type: 'divider',  label: '구분선',      icon: Minus,       desc: '가로 구분선' },
  { type: 'image',    label: '이미지',      icon: ImageIcon,   desc: 'URL 또는 붙여넣기 이미지' },
  { type: 'video',    label: '영상',        icon: Video,       desc: 'YouTube · Vimeo 링크 임베드' },
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
      ...(options?.insideToggle ? { createdInsideToggle: true } : {}),
    };
  }
  if (type === 'callout') return { text: '', icon: '💡', depth: 0 };
  if (type === 'divider') return {};
  if (type === 'page') return { page_document_id: '', title: '문서' };
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

/* ─── DocItem ────────────────────────────────────────────────────────────── */
function DocItem({
  doc, isActive, onSelect, onPin, onFavorite, onDelete, indentLevel = 0, onCreateChild,
}: {
  doc: NoteDocument; isActive: boolean;
  onSelect: () => void;
  onPin: (e: React.MouseEvent) => void;
  onFavorite: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  indentLevel?: number;
  onCreateChild?: (e: React.MouseEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `doc:${doc.id}`,
    data: { type: 'document', documentId: doc.id },
  });

  return (
    <div
      ref={setNodeRef}
      role="button" tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      style={{ marginLeft: `${Math.min(indentLevel, 6) * 14}px` }}
      className={`group relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-white hover:shadow-sm'
      } ${isOver ? 'ring-2 ring-blue-300' : ''}`}
    >
      <FileText className={`h-4 w-4 shrink-0 ${
        isActive ? 'text-blue-200' : doc.is_pinned ? 'text-violet-500' : doc.is_favorite ? 'text-amber-400' : 'text-slate-400'
      }`} />
      <div className="min-w-0 flex-1">
        <p
          className={`w-full truncate text-[13px] font-medium ${
            isActive ? 'text-white' : 'text-slate-800'
          }`}
          title={doc.title}
        >
          {doc.title}
        </p>
        <p className={`text-[11px] ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
          {relativeTime(doc.updated_at)}
        </p>
      </div>
      <div
        className={`flex shrink-0 items-center gap-0.5 ${isActive ? 'visible' : 'invisible group-hover:visible'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" title={doc.is_pinned ? '고정 해제' : '맨 위에 고정'}
          className={`rounded p-1 transition-colors ${
            isActive ? 'text-blue-200 hover:text-violet-200'
            : doc.is_pinned ? 'text-violet-500 hover:text-violet-600'
            : 'text-slate-400 hover:text-violet-500'
          }`}
          onClick={onPin}
        >
          <Pin className={`h-3.5 w-3.5 ${doc.is_pinned ? 'fill-current' : ''}`} />
        </button>
        <button type="button" title={doc.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          className={`rounded p-1 transition-colors ${
            isActive ? 'text-blue-200 hover:text-amber-300'
            : doc.is_favorite ? 'text-amber-400 hover:text-amber-500'
            : 'text-slate-400 hover:text-amber-400'
          }`}
          onClick={onFavorite}
        >
          <Star className={`h-3.5 w-3.5 ${doc.is_favorite ? 'fill-current' : ''}`} />
        </button>
        {onCreateChild && (
          <button
            type="button"
            title="하위 문서 추가"
            className={`rounded p-1 transition-colors ${
              isActive ? 'text-blue-200 hover:text-white' : 'text-slate-400 hover:text-blue-500'
            }`}
            onClick={onCreateChild}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" title="삭제"
          className={`rounded p-1 transition-colors ${
            isActive ? 'text-blue-200 hover:text-rose-300' : 'text-slate-400 hover:text-rose-500'
          }`}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
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
  onShowFormatToolbar,
  onHideFormatToolbar,
  autoFocusSignal,
  onEmptyBackspace,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  isDragging,
  focusedToggleId,
  uploadImage,
  childBlocks = [],
  renderChildBlock,
  onAddChildBelow,
  onEditorFocus,
  isInsideToggle = false,
  isDropTarget = false,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onOpenDocument?: (documentId: string) => void;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    position: { top: number; left: number },
  ) => void;
  onHideFormatToolbar?: () => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  isDragging?: boolean;
  focusedToggleId?: string | null;
  uploadImage?: (file: File) => Promise<string>;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock) => React.ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  onEditorFocus?: () => void;
  isInsideToggle?: boolean;
  isDropTarget?: boolean;
}) {
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');

  const blockDepth = Math.max(0, Math.min(6, Number(block.content?.depth ?? 0)));
  const contentMarginLeft = isInsideToggle ? 0 : blockDepth * 20;
  const isBorderlessInlineBlock = block.type === 'text' || block.type === 'todo';
  const rootBlockShell =
    isInsideToggle || isBorderlessInlineBlock
      ? ''
      : 'rounded-lg border border-slate-200 bg-white px-3 py-2';
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
    onEditorBackspace = onEmptyBackspace,
  }: {
    text: string;
    placeholder: string;
    textClassName: string;
    field?: 'text' | 'body';
    tabBehavior?: 'block-indent' | 'insert-text-indent';
    enterCreatesBlock?: boolean;
    onEditorEnter?: () => void;
    onEditorBackspace?: () => void;
  }) => {
    const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
    const legacyKey = field === 'body' ? 'legacyBody' : 'legacyText';

    return (
      <div className="relative min-w-0 max-w-full">
        <NoteEditor
          content={block.content}
          field={field}
          text={text}
          resetKey={`${block.id}:${block.type}:${field}`}
          placeholder={placeholder}
          className={textClassName}
          onEnter={onEditorEnter}
          enterCreatesBlock={enterCreatesBlock}
          autoFocusSignal={autoFocusSignal ?? 0}
          onEmptyBackspace={onEditorBackspace}
          onIndent={onIndentChange}
          tabBehavior={tabBehavior}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onEditorFocus={onEditorFocus}
          onSlashChange={(nextShow, nextQuery) => {
            setShowSlash(nextShow);
            setSlashQuery(nextQuery);
          }}
          onShowFormatToolbar={onShowFormatToolbar}
          onHideFormatToolbar={onHideFormatToolbar}
          uploadImage={uploadImage}
          onChange={({ text: nextText, html: nextHtml }) => {
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
          }}
        />
      </div>
    );
  };


  if (block.type === 'divider') {
    return (
      <div
        className={`flex items-center gap-3 ${isInsideToggle ? 'py-3' : `${rootBlockShell} py-3`}`}
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <div className="flex-1 border-t border-slate-200" />
        <button type="button"
          className="rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
          onClick={onDelete}
        ><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  if (block.type === 'todo') {
    const checked = !!block.content?.checked;
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div
        className={`flex items-start gap-3 ${isInsideToggle || isBorderlessInlineBlock ? 'py-1.5' : rootBlockShell}`}
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <button type="button"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
            checked ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 bg-white hover:border-blue-400'
          }`}
          onClick={() => onUpdate({ ...block.content, checked: !checked })}
        >
          {checked && <Check className="h-3 w-3" />}
        </button>
        <div className="relative flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '할 일을 입력하세요',
            textClassName: `text-[15px] leading-6 ${checked ? 'text-slate-400 line-through' : 'text-slate-800'}`,
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('todo') : onEnter,
          })}
          {showSlash && (
            <SlashMenu
              commands={BLOCK_TYPES}
              query={slashQuery}
              onSelect={(type) => { onChangeType(type); }}
              onClose={() => { setShowSlash(false); setSlashQuery(''); }}
            />
          )}
        </div>
        <button type="button"
          className="mt-1 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
          onClick={onDelete}
        ><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  if (block.type === 'heading') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className={`flex items-start gap-3 ${isInsideToggle ? 'py-3' : rootBlockShell}`} style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="relative flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '제목',
            textClassName: 'text-2xl font-bold leading-tight text-slate-900',
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('text') : onEnter,
          })}
          {showSlash && (
            <SlashMenu
              commands={BLOCK_TYPES}
              query={slashQuery}
              onSelect={(type) => { onChangeType(type); }}
              onClose={() => { setShowSlash(false); setSlashQuery(''); }}
            />
          )}
        </div>
        <button type="button"
          className="mt-1 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
          onClick={onDelete}
        ><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  if (block.type === 'image') {
    const url = typeof block.content?.url === 'string' ? block.content.url : '';
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-2 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
            placeholder="이미지 URL을 붙여넣으세요"
            value={url}
            onChange={(e) => onUpdate({ ...block.content, url: e.target.value })}
          />
          <button type="button" className="shrink-0 rounded p-1 text-slate-400 hover:text-rose-500" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {url && (
          <div className="overflow-hidden rounded-lg bg-slate-100">
            { }
            <img src={url} alt="" className="max-h-80 w-full object-contain" />
          </div>
        )}
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
          <button type="button" className="shrink-0 rounded p-1 text-slate-400 hover:text-rose-500" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </button>
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
        : '문서';
    return (
      <div
        role="button"
        tabIndex={0}
        className="w-full cursor-pointer select-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={() => { if (pageId) onOpenDocument?.(pageId); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (pageId) onOpenDocument?.(pageId);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-slate-800">{title}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">클릭하여 문서 열기</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-slate-300 hover:text-rose-400"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="블록 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
          <button
            type="button"
            className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {renderFormatToolbar()}
        {renderFormattedTextarea({
          text,
          placeholder: '강조 메시지를 입력하세요',
          textClassName: 'text-[15px] leading-7 text-slate-800',
        })}
      </div>
    );
  }

  if (block.type === 'code') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className="relative rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 shadow-sm" style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Code</span>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-300"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {renderFormattedTextarea({
          text,
          placeholder: '코드를 입력하세요',
          textClassName: 'font-mono text-[13px] leading-6 text-slate-100',
        })}
      </div>
    );
  }

  if (block.type === 'toggle') {
    const title = typeof block.content?.title === 'string'
      ? block.content.title
      : (typeof block.content?.text === 'string' ? block.content.text : '');
    const { text: body } = resolveToggleBodyForDisplay(block.content);
    const collapsed = !!block.content?.collapsed;
    const rawIm = block.content?.images;
    const toggleImages = Array.isArray(rawIm)
      ? rawIm.map((u) => (typeof u === 'string' ? u : ''))
      : [];
    const isThisToggleFocused = focusedToggleId === block.id;
    const patchToggle = (partial: Record<string, unknown>) =>
      onUpdate({ ...block.content, title, body, collapsed, images: toggleImages, ...partial });
    return (
      <div
        className={`relative ${
          isInsideToggle
            ? 'py-0.5'
            : `rounded-lg border bg-white px-3 py-2 ${
                isDropTarget
                  ? 'border-blue-400 ring-2 ring-blue-100'
                  : isThisToggleFocused
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : 'border-slate-200'
              }`
        }`}
        style={isInsideToggle ? undefined : { marginLeft: `${contentMarginLeft}px` }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`relative z-20 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              patchToggle({ collapsed: !collapsed });
            }}
          >
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
          <input
            value={title}
            onChange={(e) => patchToggle({ title: e.target.value })}
            onFocus={() => onEditorFocus?.()}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && onIndentChange) {
                e.preventDefault();
                onIndentChange(e.shiftKey ? 'out' : 'in');
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold leading-6 text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="토글"
          />
          <button
            type="button"
            className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {!collapsed && (
          <div className="overflow-visible pl-6">
            {renderFormatToolbar()}
            {renderFormattedTextarea({
              text: body,
              placeholder: '',
              textClassName: 'text-[15px] leading-7 text-slate-800',
              field: 'body',
              tabBehavior: 'insert-text-indent',
              enterCreatesBlock: false,
              onEditorBackspace: undefined,
            })}
            {childBlocks.length > 0 && (
              <div className="space-y-0">
                {childBlocks.map((child) => renderChildBlock?.(child))}
              </div>
            )}
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
      </div>
    );
  }

  // text (default)
  const text = typeof block.content?.text === 'string' ? block.content.text : '';
  return (
    <div
      className={`flex items-start gap-3 ${isInsideToggle || isBorderlessInlineBlock ? 'py-0.5' : rootBlockShell}`}
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      <div className="relative min-w-0 flex-1">
        {renderFormatToolbar()}
        {renderFormattedTextarea({
          text,
          placeholder: isInsideToggle ? '' : '내용을 입력하세요… (/ 로 블록 타입 변경)',
          textClassName: 'text-[15px] leading-7 text-slate-800',
          enterCreatesBlock: enterCreatesBlockBelow,
          onEditorEnter: enterCreatesBlockBelow ? onEnter : undefined,
        })}
        {showSlash && (
          <SlashMenu
            commands={BLOCK_TYPES}
            query={slashQuery}
            onSelect={(type) => { onChangeType(type); }}
            onClose={() => { setShowSlash(false); setSlashQuery(''); }}
          />
        )}
      </div>
      <button type="button"
        className="mt-1 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
        onClick={onDelete}
      ><Trash2 className="h-3.5 w-3.5" /></button>
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
  onShowFormatToolbar,
  onHideFormatToolbar,
  autoFocusSignal,
  onEmptyBackspace,
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
  onEditorFocus,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onOpenDocument?: (documentId: string) => void;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    position: { top: number; left: number },
  ) => void;
  onHideFormatToolbar?: () => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock) => React.ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  onEditorFocus?: () => void;
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
    zIndex: isDragging ? 10 : undefined,
  };
  const blockDepth = Math.max(0, Math.min(6, Number(block.content?.depth ?? 0)));

  const blockControls = (
    <div className="flex h-7 shrink-0 items-center gap-0.5 rounded-md bg-white/90 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="아래에 새 블록 추가"
        title="아래에 텍스트 블록 추가"
        onClick={() => onAddBelow('text')}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
        aria-label="드래그하여 순서 변경"
        title="드래그해서 이동"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );

  const blockContentNode = (
    <div
      className="min-w-0 flex-1"
      onMouseDownCapture={() => {
        onEditorFocus?.();
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
        onShowFormatToolbar={onShowFormatToolbar}
        onHideFormatToolbar={onHideFormatToolbar}
        autoFocusSignal={autoFocusSignal}
        onEmptyBackspace={onEmptyBackspace}
        onIndentChange={onIndentChange}
        onNavigatePrevious={onNavigatePrevious}
        onNavigateNext={onNavigateNext}
        isDragging={isDragging}
        focusedToggleId={focusedToggleId}
        uploadImage={uploadImage}
        childBlocks={childBlocks}
        renderChildBlock={renderChildBlock}
        onAddChildBelow={onAddChildBelow}
        onEditorFocus={onEditorFocus}
        isInsideToggle={false}
        isDropTarget={isDropTarget}
      />
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-start gap-2 rounded-md px-1 py-0.5 transition-colors ${
        isDragging
          ? 'bg-blue-50 ring-1 ring-blue-200'
          : isDropTarget
            ? 'bg-blue-50/70 ring-1 ring-blue-300'
            : 'hover:bg-slate-50/80'
      }`}
    >
      {isDropTarget && !isDragging && (
        <div className="pointer-events-none absolute left-10 right-1 top-0 h-0.5 rounded-full bg-blue-400/80" />
      )}
      <div className="sticky left-0 mt-1 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
        {blockControls}
      </div>
      {blockDepth > 0 && (
        <div className="pointer-events-none mt-1 flex h-7 shrink-0 items-center gap-1 px-0.5" aria-hidden>
          {Array.from({ length: blockDepth }).map((_, idx) => (
            <span key={`${block.id}-depth-guide-${idx}`} className="h-4 w-px rounded bg-slate-200" />
          ))}
        </div>
      )}

      {blockContentNode}
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
  onShowFormatToolbar,
  onHideFormatToolbar,
  autoFocusSignal,
  onEmptyBackspace,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  focusedToggleId,
  onFocusToggle,
  uploadImage,
  isDropTarget,
  childBlocks,
  renderChildBlock,
  onEditorFocus,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onOpenDocument?: (documentId: string) => void;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    position: { top: number; left: number },
  ) => void;
  onHideFormatToolbar?: () => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock) => React.ReactNode;
  onEditorFocus?: () => void;
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
    zIndex: isDragging ? 10 : undefined,
  };

  const addBelowType: NoteBlock['type'] =
    block.type === 'todo' || block.type === 'toggle' ? block.type : 'text';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative py-0 transition-colors ${
        isDragging ? 'bg-blue-50/60' : isDropTarget ? 'bg-blue-50/40' : ''
      }`}
    >
      {isDropTarget && !isDragging && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-0.5 rounded-full bg-blue-400/80" />
      )}
      <div className="pointer-events-none absolute -left-12 top-0.5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="pointer-events-auto flex h-7 items-center gap-0.5 rounded-md bg-white/95 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="아래에 추가"
            title="아래에 같은 종류 추가"
            onClick={() => onAddBelow(addBelowType)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
            aria-label="드래그하여 순서 변경"
            title="드래그해서 이동"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        className="min-w-0"
        onMouseDownCapture={() => {
          onEditorFocus?.();
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
          onShowFormatToolbar={onShowFormatToolbar}
          onHideFormatToolbar={onHideFormatToolbar}
          autoFocusSignal={autoFocusSignal}
          onEmptyBackspace={onEmptyBackspace}
          onIndentChange={onIndentChange}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          isDragging={isDragging}
          focusedToggleId={focusedToggleId}
          uploadImage={uploadImage}
          childBlocks={childBlocks}
          renderChildBlock={renderChildBlock}
          onEditorFocus={onEditorFocus}
          isInsideToggle
          isDropTarget={isDropTarget}
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
function AdminNotePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState<NoteDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
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
  const [overBlockId, setOverBlockId] = useState<string | null>(null);
  const [focusedEditorBlockId, setFocusedEditorBlockId] = useState<string | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  /** 상단 '이미지' 블록 추가 시 토글 안에 넣을 대상 (토글 블록 클릭으로 설정) */
  const [focusedToggleId, setFocusedToggleId] = useState<string | null>(null);
  const [formatToolbar, setFormatToolbar] = useState<FormatToolbarState | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [docTab, setDocTab] = useState<'active' | 'trash' | 'block-trash'>('active');
  const [trashedBlocks, setTrashedBlocks] = useState<NoteBlock[]>([]);
  const [loadingTrashedBlocks, setLoadingTrashedBlocks] = useState(false);
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
  const focusedEditorBlockIdRef = useRef<string | null>(null);
  const expandedDuringDragRef = useRef<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const activeDocument = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId],
  );

  const activeBlock = useMemo(
    () => (activeBlockId ? blocks.find((b) => b.id === activeBlockId) ?? null : null),
    [activeBlockId, blocks],
  );

  const focusBlockEditor = useCallback((blockId: string | null) => {
    if (!blockId) return;
    focusedEditorBlockIdRef.current = blockId;
    setFocusedEditorBlockId(blockId);
    setFocusSignal((v) => v + 1);
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

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q ? documents.filter((d) => d.title.toLowerCase().includes(q)) : documents;
    if (sortKey === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    if (docTab === 'trash') {
      return [...list].sort((a, b) => new Date(b.deleted_at ?? b.updated_at).getTime() - new Date(a.deleted_at ?? a.updated_at).getTime());
    }
    return [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [documents, searchQuery, sortKey]);

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
    for (const doc of otherDocuments) {
      if (!doc.parent_id) continue;
      const list = map.get(doc.parent_id) ?? [];
      list.push(doc);
      map.set(doc.parent_id, list);
    }
    return map;
  }, [otherDocuments]);
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
        if ((docTab === 'active' || docTab === 'block-trash') && !selectedId && json.documents?.length > 0) {
          const preferred = json.documents.find((d) => d.is_pinned) ?? json.documents[0];
          setSelectedId(preferred.id);
          setMobileTab('editor');
          closeAll();
          router.replace(`/admin/note?id=${encodeURIComponent(preferred.id)}`);
        }
      } catch (e) { devLogger.error('[Note] loadDocs', e); setError(e instanceof Error ? e.message : '로드 실패'); }
      finally { setLoadingDocuments(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docTab]);

  /* load blocks */
  useEffect(() => {
    if (!selectedId) { setBlocks([]); return; }
    const load = async () => {
      try {
        setLoadingBlocks(true); setError(null);
        const res = await fetch(`/api/admin/note/blocks?documentId=${encodeURIComponent(selectedId)}`, { credentials: 'include' });
        if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '블록 로드 실패'); }
        const json = (await res.json()) as { blocks: NoteBlock[] };
        let loadedBlocks = json.blocks ?? [];
        let trashedBlocks: NoteBlock[] = [];
        try {
          const trashRes = await fetch(
            `/api/admin/note/blocks/trash?documentId=${encodeURIComponent(selectedId)}`,
            { credentials: 'include' },
          );
          if (trashRes.ok) {
            const trashJson = (await trashRes.json()) as { blocks?: NoteBlock[] };
            trashedBlocks = trashJson.blocks ?? [];
          }
        } catch (e) {
          devLogger.error('[Note] loadBlocksTrashForRestore', e);
        }
        const restorePlans = planToggleBodyRestores(loadedBlocks, trashedBlocks);
        if (restorePlans.length > 0) {
          for (const plan of restorePlans) {
            await fetch('/api/admin/note/blocks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ id: plan.toggleId, content: plan.restoredContent }),
            });
            if (plan.removeChildBlockId) {
              await fetch(`/api/admin/note/blocks?id=${encodeURIComponent(plan.removeChildBlockId)}`, {
                method: 'DELETE',
                credentials: 'include',
              });
            }
            if (plan.purgeTrashedChildBlockId) {
              await fetch(
                `/api/admin/note/blocks/trash/purge?id=${encodeURIComponent(plan.purgeTrashedChildBlockId)}`,
                { method: 'DELETE', credentials: 'include' },
              );
            }
          }
          loadedBlocks = loadedBlocks
            .map((block) => {
              const plan = restorePlans.find((entry) => entry.toggleId === block.id);
              return plan ? { ...block, content: plan.restoredContent } : block;
            })
            .filter((block) => !restorePlans.some((entry) => entry.removeChildBlockId === block.id));
        }
        const promotePlans = planPromoteDocumentBlocksToRoot(loadedBlocks);
        if (promotePlans.patches.length > 0) {
          for (const patch of promotePlans.patches) {
            await fetch('/api/admin/note/blocks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                id: patch.id,
                parent_block_id: patch.parent_block_id,
                order_index: patch.order_index,
              }),
            });
          }
          loadedBlocks = promotePlans.blocks;
        }
        setBlocks(loadedBlocks);
      } catch (e) { devLogger.error('[Note] loadBlocks', e); setError(e instanceof Error ? e.message : '로드 실패'); }
      finally { setLoadingBlocks(false); }
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

  /* presence: 문서 선택 시 1회만 호출 */
  useEffect(() => {
    const docId = selectedId;
    if (!docId) {
      setCollaborators([]);
      return;
    }

    let alive = true;

    const run = async () => {
      try {
        const res = await fetch('/api/admin/note/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ documentId: docId }),
        });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { collaborators?: NoteCollaborator[] };
        if (!alive) return;
        setCollaborators(json.collaborators ?? []);
      } catch (e) {
        devLogger.error('[Note] presence POST', e);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [selectedId]);

  /* backlinks: 선택 문서 기준으로 지연 조회 */
  useEffect(() => {
    const docId = selectedId;
    if (!docId) {
      setBacklinks([]);
      return;
    }
    let alive = true;
    const run = async () => {
      try {
        const res = await fetch(`/api/admin/note/documents?backlinksFor=${encodeURIComponent(docId)}&limit=50`, {
          credentials: 'include',
        });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { backlinks?: NoteDocument[] };
        if (!alive) return;
        setBacklinks(json.backlinks ?? []);
      } catch (e) {
        devLogger.error('[Note] backlinks', e);
      }
    };
    run();
    return () => { alive = false; };
  }, [selectedId]);

  /* save helper */
  const triggerSave = useCallback(() => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setLoadingState('saved');
    setLastSavedAt(new Date());
    savedTimerRef.current = window.setTimeout(() => setLoadingState('idle'), 3000);
  }, []);

  /* ── DnD handlers ── */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    expandedDuringDragRef.current.clear();
    setActiveBlockId(event.active.id as string);
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
    if (!event.over) {
      setOverBlockId(null);
      return;
    }
    const overId = String(event.over.id);
    setOverBlockId(overId.startsWith('doc:') ? null : overId);

    if (overId.startsWith('doc:')) return;
    const overBlock = blocksRef.current.find((block) => block.id === overId);
    if (overBlock?.type !== 'toggle') return;
    const content = (overBlock.content ?? {}) as Record<string, unknown>;
    if (!content.collapsed || expandedDuringDragRef.current.has(overBlock.id)) return;

    expandedDuringDragRef.current.add(overBlock.id);
    const nextContent = { ...content, collapsed: false };
    setBlocks((prev) => prev.map((block) => (
      block.id === overBlock.id ? { ...block, content: nextContent } : block
    )));
    void fetch('/api/admin/note/blocks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: overBlock.id, content: nextContent }),
    }).catch((e) => devLogger.error('[Note] expandToggleOnDrag', e));
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveBlockId(null);
    setOverBlockId(null);
    expandedDuringDragRef.current.clear();
  }, []);

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
    setOverBlockId(null);
    expandedDuringDragRef.current.clear();
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Drop target is a document (sidebar DocItem)
    const overId = String(over.id);
    if (overId.startsWith('doc:')) {
      const targetDocumentId = overId.slice('doc:'.length);
      const movingBlock = blocksRef.current.find((b) => b.id === String(active.id));
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

    const plan = planBlockDrop(prevBlocks, moving.id, overId);
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
  }, [normalizeDepthByOrder, persistBlockReparent, persistOrderAndDepth, selectedId, triggerSave]);

  /* handlers */
  const handleGoToDashboard = useCallback(() => {
    setDesktopOpen(true);
    setMobileOpen(false);
    router.push('/admin');
  }, [router, setDesktopOpen, setMobileOpen]);

  const handleSelectDocument = (doc: NoteDocument) => {
    setSelectedId(doc.id);
    setMobileTab('editor');
    closeAll();
    router.replace(`/admin/note?id=${encodeURIComponent(doc.id)}`);
  };

  const handleOpenDocumentById = useCallback((documentId: string) => {
    setSelectedId(documentId);
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

  const handleCreateDocument = async (parentId: string | null = null) => {
    try {
      setLoadingState('loading'); setError(null);
      const res = await fetch('/api/admin/note/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '제목 없음', parent_id: parentId }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '문서 생성 실패'); }
      const json = (await res.json()) as { document: NoteDocument };
      const newDoc = json.document;
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedId(newDoc.id);
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

  const handleRenameDocument = (docId: string, title: string) => {
    const safeTitle = title.trim() || '제목 없음';
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, title } : d)));
    setBlocks((prev) =>
      prev.map((b) => (
        b.type === 'page' && b.content?.page_document_id === docId
          ? { ...b, content: { ...b.content, title: safeTitle } }
          : b
      )),
    );
    const timers = saveTimersRef.current;
    if (timers[`doc_${docId}`]) clearTimeout(timers[`doc_${docId}`]);
    timers[`doc_${docId}`] = window.setTimeout(async () => {
      try {
        await fetch('/api/admin/note/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: docId, title: safeTitle }) });
        const linkedPageBlocks = blocksRef.current.filter((b) => b.type === 'page' && b.content?.page_document_id === docId);
        await Promise.all(
          linkedPageBlocks.map((b) =>
            fetch('/api/admin/note/blocks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ id: b.id, content: { ...(b.content ?? {}), title: safeTitle } }),
            }),
          ),
        );
        triggerSave();
      } catch (e) { devLogger.error('[Note] renameDoc', e); }
    }, 600);
  };

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
    if (!window.confirm(`"${doc.title}" 문서를 휴지통으로 이동할까요?`)) return;
    const prev = documents;
    setDocuments((p) => p.filter((d) => d.id !== doc.id));
    if (selectedId === doc.id) { setSelectedId(null); router.replace('/admin/note'); }
    try {
      const res = await fetch(`/api/admin/note/documents?id=${encodeURIComponent(doc.id)}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('삭제 실패');
    } catch (e) { devLogger.error('[Note] deleteDoc', e); setDocuments(prev); setError('문서 삭제 실패'); }
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
        await fetch('/api/admin/note/blocks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: block.id, content }) });
        delete timers[block.id];
        if (Object.keys(timers).filter((k) => !k.startsWith('doc_')).length === 0) triggerSave();
      } catch (e) { devLogger.error('[Note] updateBlock', e); setLoadingState('idle'); }
    }, 600);
  }, [triggerSave]);

  const registerCreatedBlockUndo = useCallback((blockId: string) => {
    undoCreateBlockIdRef.current = blockId;
    setShowCreateUndo(true);
  }, []);

  const handleIndentBlock = useCallback((block: NoteBlock, direction: 'in' | 'out') => {
    const content = (block.content ?? {}) as Record<string, unknown>;
    const currentDepth = Math.max(0, Math.min(6, Number(content.depth ?? 0)));
    const ordered = [...blocksRef.current].sort((a, b) => a.order_index - b.order_index);
    const idx = ordered.findIndex((item) => item.id === block.id);
    if (idx < 0) return;
    const prevDepth =
      idx > 0
        ? Math.max(0, Math.min(6, Number((ordered[idx - 1]?.content as Record<string, unknown> | undefined)?.depth ?? 0)))
        : 0;
    let nextDepth = currentDepth;
    if (direction === 'in') {
      if (idx === 0) {
        // 첫 블록도 최소 1단계 들여쓰기가 가능해야 토글 본문에서 Tab 체감이 난다.
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
  }, [handleUpdateBlock]);

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
  ) => {
    if (!selectedId) return;
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
          content: defaultBlockContent(type, { insideToggle }),
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
      focusBlockEditor(json.block.id);
      registerCreatedBlockUndo(json.block.id);
      void fetch('/api/admin/note/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orders: nextSiblings.map((block) => ({ id: block.id, order_index: block.order_index })) }),
      }).then(() => triggerSave()).catch((e) => devLogger.error('[Note] normalizeInsertOrder', e));
    } catch (e) {
      devLogger.error('[Note] insertBlockAmongSiblings', e);
      setError(e instanceof Error ? e.message : '블록 추가 실패');
      setLoadingState('idle');
    }
  }, [selectedId, triggerSave, focusBlockEditor, registerCreatedBlockUndo]);

  const handleInsertBlockAfter = useCallback(async (afterBlock: NoteBlock, type: NoteBlock['type'] = 'text') => {
    const parentId = afterBlock.parent_block_id ?? null;
    const siblings = blocksRef.current
      .filter((b) => (b.parent_block_id ?? null) === parentId)
      .sort((a, b) => a.order_index - b.order_index);
    const afterIndex = siblings.findIndex((b) => b.id === afterBlock.id);
    const insertIndex = afterIndex >= 0 ? afterIndex + 1 : siblings.length;
    await insertBlockAmongSiblings(parentId, type, insertIndex);
  }, [insertBlockAmongSiblings]);

  const handleInsertBlockInParent = useCallback(async (parentBlockId: string, type: NoteBlock['type'] = 'text') => {
    if (!selectedId) return;
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
      setLoadingState('saving');
      if (type === 'page') {
        const createDocRes = await fetch('/api/admin/note/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: '새 문서',
            parent_id: selectedId,
          }),
        });
        if (!createDocRes.ok) {
          const j = await createDocRes.json().catch(() => null);
          throw new Error(j?.error || '문서 생성 실패');
        }
        const created = (await createDocRes.json()) as { document: NoteDocument };
        const newDoc = created.document;
        setDocuments((prev) => [newDoc, ...prev]);

        const pageBlockContent = { page_document_id: newDoc.id, title: newDoc.title };
        const parentBlockId = focusedToggleId ?? null;
        const res = await fetch('/api/admin/note/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            documentId: selectedId,
            type: 'page',
            content: pageBlockContent,
            parent_block_id: parentBlockId,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || '문서 블록 추가 실패');
        }
        const json = (await res.json()) as { block: NoteBlock };
        setBlocks((prev) => [json.block, ...prev]);
        focusBlockEditor(json.block.id);
        registerCreatedBlockUndo(json.block.id);
        triggerSave();
        return;
      }

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
      focusBlockEditor(json.block.id);
      registerCreatedBlockUndo(json.block.id);
      triggerSave();
    } catch (e) { devLogger.error('[Note] addBlock', e); setError(e instanceof Error ? e.message : '추가 실패'); }
  }, [selectedId, triggerSave, focusedToggleId, blocks, handleUpdateBlock, focusBlockEditor, handleInsertBlockInParent, registerCreatedBlockUndo]);

  const handleChangeBlockType = useCallback(async (block: NoteBlock, type: NoteBlock['type']) => {
    const defaultContent = defaultBlockContent(type);
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, type, content: defaultContent } : b)));
    focusBlockEditor(block.id);
    try {
      await fetch('/api/admin/note/blocks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: block.id, type, content: defaultContent }) });
      triggerSave();
    } catch (e) { devLogger.error('[Note] changeBlockType', e); }
  }, [focusBlockEditor, triggerSave]);

  const handleDeleteBlock = useCallback(async (block: NoteBlock, focusPrevious = false, skipDeleteUndo = false) => {
    const ordered = [...blocksRef.current].sort((a, b) => a.order_index - b.order_index);
    const idx = ordered.findIndex((b) => b.id === block.id);
    if (idx < 0) return;
    if (focusPrevious) {
      const nextFocus = ordered[idx - 1]?.id ?? ordered[idx + 1]?.id ?? null;
      if (nextFocus) focusBlockEditor(nextFocus);
    }

    setBlocks((prev) => {
      const descendants = collectDescendantBlockIds(block.id, prev);
      return prev.filter((b) => b.id !== block.id && !descendants.has(b.id));
    });
    try {
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
      setBlocks((prev) => {
        if (prev.some((b) => b.id === block.id)) return prev;
        return [...prev, block].sort((a, b) => a.order_index - b.order_index);
      });
    }
  }, [docTab, focusBlockEditor, loadTrashedBlocks, triggerSave]);

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

  const renderDocumentTree = (doc: NoteDocument, depth = 0): React.ReactNode => {
    const children = childrenByParent.get(doc.id) ?? [];
    return (
      <div key={doc.id} className="space-y-1">
        <DocItem
          doc={doc}
          isActive={doc.id === selectedId}
          indentLevel={depth}
          onSelect={() => handleSelectDocument(doc)}
          onPin={(e) => handleTogglePin(e, doc)}
          onFavorite={(e) => handleToggleFavorite(e, doc)}
          onDelete={(e) => handleDeleteDocument(e, doc)}
          onCreateChild={(e) => { e.stopPropagation(); handleCreateDocument(doc.id); }}
        />
        {children.length > 0 && (
          <div className="space-y-1">
            {children.map((child) => renderDocumentTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderToggleInlineChild = (block: NoteBlock): React.ReactNode => {
    const childBlocks = childrenByParentBlock.get(block.id) ?? [];
    return (
      <ToggleInlineRow
        key={block.id}
        block={block}
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
        autoFocusSignal={focusedEditorBlockId === block.id ? focusSignal : 0}
        onEmptyBackspace={() => handleDeleteBlock(block, true)}
        onIndentChange={(direction) => handleIndentBlock(block, direction)}
        onNavigatePrevious={() => handleNavigateBlock(block, 'previous')}
        onNavigateNext={() => handleNavigateBlock(block, 'next')}
        focusedToggleId={focusedToggleId}
        onFocusToggle={setFocusedToggleId}
        onEditorFocus={() => focusBlockEditor(block.id)}
        uploadImage={uploadNoteImage}
        isDropTarget={overBlockId === block.id}
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
        autoFocusSignal={focusedEditorBlockId === block.id ? focusSignal : 0}
        onEmptyBackspace={() => handleDeleteBlock(block, true)}
        onIndentChange={(direction) => handleIndentBlock(block, direction)}
        onNavigatePrevious={() => handleNavigateBlock(block, 'previous')}
        onNavigateNext={() => handleNavigateBlock(block, 'next')}
        focusedToggleId={focusedToggleId}
        onFocusToggle={setFocusedToggleId}
        onEditorFocus={() => focusBlockEditor(block.id)}
        uploadImage={uploadNoteImage}
        isDropTarget={overBlockId === block.id}
      />
    );
  };

  /* ── render ── */
  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-full flex-col overflow-x-hidden bg-white md:h-screen md:overflow-hidden">

      {/* ── 상단 헤더 ── */}
      <div className="relative flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        {/* 모바일 탭 */}
        <div className="flex items-center gap-0 md:hidden">
          {(['list', 'editor'] as const).map((tab) => (
            <button
              key={tab} type="button"
              className={`px-4 py-3.5 text-[13px] font-semibold transition-colors ${
                mobileTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
              } disabled:opacity-40`}
              onClick={() => setMobileTab(tab)}
              disabled={tab === 'editor' && !activeDocument}
            >
              {tab === 'list' ? '목록' : '편집'}
            </button>
          ))}
        </div>
        {/* 데스크톱 브랜드 */}
        <div className="hidden items-center gap-3 py-3 md:flex">
          <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white">
            Notes
          </span>
          <span className="text-[13px] font-medium text-slate-500">관리자 공용 노트</span>
        </div>

        <button
          type="button"
          onClick={handleGoToDashboard}
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 md:inline-flex"
        >
          대시보드로
        </button>

        {/* 저장 상태 (데스크톱) */}
        <div className="hidden items-center gap-4 md:flex">
          {loadingState === 'saving' && (
            <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />저장 중…
            </span>
          )}
          {loadingState === 'saved' && lastSavedAt && (
            <span className="flex items-center gap-1.5 text-[12px] text-emerald-500">
              <Check className="h-3.5 w-3.5" />저장됨 · {relativeTime(lastSavedAt.toISOString())}
            </span>
          )}
          {collaborators.length > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-blue-600">
              <Users className="h-3.5 w-3.5" />최근 이 문서를 본 관리자 {collaborators.length}명
            </span>
          )}
          <button
            type="button" onClick={() => handleCreateDocument(null)} disabled={loadingState === 'loading'}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            새 노트
          </button>
        </div>

        {/* 모바일 새 노트 */}
        <button
          type="button" onClick={() => handleCreateDocument(null)} disabled={loadingState === 'loading'}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 md:hidden"
        >
          <Plus className="h-3.5 w-3.5" />새 노트
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
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 min-w-0 flex-1 overflow-x-hidden">

          {/* ── 노트 목록 사이드바 */}
          <div className={`flex flex-col border-r border-slate-100 bg-slate-50 ${
            mobileTab === 'list' ? 'flex w-full' : 'hidden'
          } md:flex md:w-[260px] md:shrink-0`}>

          {/* 탭: 전체/문서 휴지통/블록 휴지통 */}
          <div className="shrink-0 px-3 pt-3">
            <div className="grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  docTab === 'active' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => { setDocTab('active'); setSelectedId(null); setBlocks([]); setMobileTab('list'); }}
              >
                전체
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  docTab === 'trash' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => { setDocTab('trash'); setSelectedId(null); setBlocks([]); setMobileTab('list'); }}
              >
                휴지통
              </button>
              <button
                type="button"
                className={`rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                  docTab === 'block-trash' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => { setDocTab('block-trash'); setMobileTab('list'); void loadTrashedBlocks(); }}
              >
                블록
              </button>
            </div>
            {docTab === 'trash' && (
              <p className="mt-2 px-1 text-[11px] font-medium text-slate-400">
                휴지통 문서는 7일 후 영구삭제할 수 있습니다.
              </p>
            )}
            {docTab === 'block-trash' && (
              <p className="mt-2 px-1 text-[11px] font-medium text-slate-400">
                선택한 문서 기준 블록 휴지통입니다.
              </p>
            )}
          </div>

          {/* 검색 + 정렬 */}
          <div className="shrink-0 space-y-2 px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="제목으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                onClick={() => setShowSortMenu((v) => !v)}
              >
                {sortKey === 'recent' ? <Clock className="h-3.5 w-3.5 text-slate-400" /> : <SortAsc className="h-3.5 w-3.5 text-slate-400" />}
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
          <div className="flex-1 overflow-y-auto px-2 pb-4">
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
                  <div className="mb-3 mt-1">
                    <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-widest text-violet-600">고정 · {pinnedDocuments.length}</p>
                    {pinnedDocuments.map((doc) => (
                      <DocItem key={doc.id} doc={doc} isActive={doc.id === selectedId}
                        onSelect={() => handleSelectDocument(doc)}
                        onPin={(e) => handleTogglePin(e, doc)}
                        onFavorite={(e) => handleToggleFavorite(e, doc)}
                        onDelete={(e) => handleDeleteDocument(e, doc)}
                      />
                    ))}
                  </div>
                )}
                {favoriteDocuments.length > 0 && (
                  <div className="mb-3 mt-1">
                    <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-500">즐겨찾기 · {favoriteDocuments.length}</p>
                    {favoriteDocuments.map((doc) => (
                      <DocItem key={doc.id} doc={doc} isActive={doc.id === selectedId}
                        onSelect={() => handleSelectDocument(doc)}
                        onPin={(e) => handleTogglePin(e, doc)}
                        onFavorite={(e) => handleToggleFavorite(e, doc)}
                        onDelete={(e) => handleDeleteDocument(e, doc)}
                      />
                    ))}
                  </div>
                )}
                {otherDocuments.length > 0 && (
                  <div className="mt-1">
                    {(pinnedDocuments.length > 0 || favoriteDocuments.length > 0) && (
                      <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">전체 · {otherDocuments.length}</p>
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
                      rootDocuments.map((doc) => renderDocumentTree(doc))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          </div>

          {/* ── 에디터 ── */}
          <div className={`min-w-0 flex-1 flex-col overflow-hidden ${
            mobileTab === 'editor' ? 'flex' : 'hidden'
          } md:flex`}>
          {/* 모바일 상단 바 */}
          {activeDocument && (
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 py-2 md:hidden">
              <button type="button"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileTab('list')}
              ><ArrowLeft className="h-4 w-4" /></button>
              <span className="flex-1 truncate text-[13px] font-semibold text-slate-700">{activeDocument.title}</span>
              {loadingState === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              {loadingState === 'saved' && <Check className="h-4 w-4 text-emerald-500" />}
            </div>
          )}

          {/* 에디터 본문 */}
          {!activeDocument ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 text-slate-400">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-[14px] font-semibold text-slate-500">노트를 선택하거나 새로 만드세요</p>
              <button type="button" onClick={() => handleCreateDocument(null)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700"
              ><Plus className="h-4 w-4" />새 노트 만들기</button>
            </div>
          ) : loadingBlocks ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />불러오는 중…
            </div>
          ) : (
            <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-white">
              <div className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur-xl">
                <div className="mx-auto flex max-w-4xl min-w-0 items-center gap-1 overflow-x-hidden px-4 py-2 md:px-10 lg:px-16">
                  <span className="text-[11px] font-medium text-slate-400">문서 안에서 `/` 입력 · 블록 왼쪽 `+`로 바로 추가</span>
                </div>
                <div className="mx-auto flex max-w-4xl min-w-0 flex-wrap gap-1.5 overflow-x-hidden px-4 pb-2 md:px-10 lg:px-16">
                  {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      title={
                        type === 'image' && focusedToggleId
                          ? '선택한 토글 블록 안에 이미지 슬롯을 추가합니다. 토글을 한 번 클릭한 뒤 누르세요.'
                          : type === 'video'
                            ? '문서 본문에 영상 블록을 추가합니다 (YouTube · Vimeo).'
                            : focusedToggleId
                              ? '선택한 토글 안에 블록을 추가합니다. 토글을 한 번 클릭한 뒤 누르세요.'
                              : undefined
                      }
                      onClick={() => handleAddBlock(type)}
                      className="flex items-center gap-1.5 rounded-md border border-transparent bg-slate-50 px-2.5 py-1.5 text-[12px] font-medium text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                    >
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mx-auto max-w-4xl overflow-x-hidden px-4 py-12 md:px-10 lg:px-16">

                {/* 문서 큰 제목 */}
                <textarea
                  ref={titleInputRef}
                  rows={1}
                  className="mb-2 w-full resize-none overflow-hidden bg-transparent text-[36px] font-extrabold leading-[1.08] tracking-tight text-slate-950 outline-none placeholder:text-slate-300 md:text-[48px]"
                  placeholder="제목 없음"
                  value={activeDocument.title === '제목 없음' ? '' : activeDocument.title}
                  onChange={(e) => handleRenameDocument(activeDocument.id, e.target.value || '제목 없음')}
                />
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={togglingPublic}
                    onClick={() => activeDocument && handleTogglePublic(activeDocument)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
                      activeDocument.is_public
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {activeDocument.is_public ? '웹에 공개됨' : '웹에 공개'}
                  </button>
                  {activeDocument.is_public && activeDocument.share_token && (
                    <>
                      <a
                        href={`/note/p/${activeDocument.share_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        공개 페이지 열기
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyPublicLink(activeDocument)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {shareLinkCopied ? '복사됨' : '링크 복사'}
                      </button>
                    </>
                  )}
                </div>
                <div className="mb-10 flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
                  <span>수정 {relativeTime(activeDocument.updated_at)}</span>
                  {collaborators.length > 0 && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <Users className="h-3.5 w-3.5" />최근 함께 본 관리자 {collaborators.length}명
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-300">
                    <Slash className="h-3 w-3" />
                    <span>빈 블록에서 / 입력 · 왼쪽 점을 드래그하여 순서 변경</span>
                  </span>
                </div>
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

                {/* 빈 문서 */}
                {rootBlocks.length === 0 && (
                  <div className="mb-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                    <p className="text-[15px] font-semibold text-slate-600">새 페이지를 시작하세요</p>
                    <p className="mt-1 text-[13px] text-slate-400">텍스트를 바로 쓰거나 `/`로 제목, 체크리스트, 콜아웃을 선택할 수 있습니다.</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800"
                        onClick={() => handleAddBlock('text')}
                      >
                        빈 텍스트로 시작
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                        onClick={() => handleAddBlock('heading')}
                      >
                        제목 블록 추가
                      </button>
                    </div>
                  </div>
                )}

                {/* 블록 목록 (DnD) */}
                <SortableContext
                  items={allSortableBlockIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0.5 pb-24">
                    {rootBlocks.map((block) => renderSortableBlock(block))}
                  </div>
                </SortableContext>

              </div>
            </div>
          )}
          </div>
        </div>

        {/* 드래그 중 미리보기 (사이드바 드롭 포함) */}
        <DragOverlay dropAnimation={{ duration: 160, easing: 'ease' }}>
          {activeBlock ? <DragPreview block={activeBlock} /> : null}
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
    </div>
  );
}

export default function AdminNotePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">불러오는 중…</div>}>
      <AdminNotePageContent />
    </Suspense>
  );
}
