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
import { parseInlineMarkupToHtml, toggleInlineMark, type InlineMark } from '@/app/lib/note/inlineMarkup';
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
  Minus,
  ArrowLeft,
  Search,
  Users,
  Check,
  SortAsc,
  Clock,
  Slash,
  GripVertical,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code2,
  ChevronDown,
  MessageSquareQuote,
} from 'lucide-react';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
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
  type: 'heading' | 'text' | 'todo' | 'divider' | 'image' | 'toggle' | 'callout' | 'page' | string;
  order_index: number;
  content: any;
  created_at: string;
  updated_at: string;
};
type LoadingState = 'idle' | 'loading' | 'saving' | 'saved';
type SortKey = 'recent' | 'title';
type NoteCollaborator = {
  id: string; document_id: string; user_id: string;
  last_active_at: string; last_cursor: any;
};

const BLOCK_TYPES: { type: NoteBlock['type']; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'heading',  label: '제목',      icon: Type,        desc: '큰 제목 블록' },
  { type: 'text',     label: '텍스트',    icon: FileText,    desc: '일반 텍스트' },
  { type: 'todo',     label: '체크리스트', icon: CheckSquare, desc: '할 일 목록' },
  { type: 'page',     label: '문서',      icon: FileText,    desc: '클릭하면 열리는 문서 링크' },
  { type: 'toggle',   label: '토글',      icon: ChevronDown, desc: '접고 펼치는 섹션' },
  { type: 'callout',  label: '콜아웃',    icon: MessageSquareQuote, desc: '강조 메시지' },
  { type: 'divider',  label: '구분선',    icon: Minus,       desc: '가로 구분선' },
  { type: 'image',    label: '이미지',    icon: ImageIcon,   desc: 'URL로 이미지 삽입' },
];

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

/* ─── SlashMenu ──────────────────────────────────────────────────────────── */
function SlashMenu({
  onSelect, onClose,
}: {
  onSelect: (type: NoteBlock['type']) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="border-b border-slate-100 px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">블록 타입 선택</p>
      </div>
      {BLOCK_TYPES.map(({ type, label, icon: Icon, desc }) => (
        <button
          key={type} type="button"
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-blue-50"
          onClick={() => { onSelect(type); onClose(); }}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100">
            <Icon className="h-4 w-4 text-slate-600" />
          </span>
          <span>
            <p className="text-[13px] font-semibold text-slate-800">{label}</p>
            <p className="text-[11px] text-slate-400">{desc}</p>
          </span>
        </button>
      ))}
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
  onOpenDocument,
  onShowFormatToolbar,
  onHideFormatToolbar,
  isDragging,
  focusedToggleId,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onOpenDocument?: (documentId: string) => void;
  onShowFormatToolbar?: (applyMark: (mark: InlineMark) => void) => void;
  onHideFormatToolbar?: () => void;
  isDragging?: boolean;
  focusedToggleId?: string | null;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [showSlash, setShowSlash] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [renderMode, setRenderMode] = useState<'formatted' | 'editing'>('formatted');

  const blockDepth = Math.max(0, Math.min(6, Number(block.content?.depth ?? 0)));
  const supportsFormatting = ['text', 'todo', 'heading', 'callout', 'toggle'].includes(block.type);

  const INDENT = '  '; // 2 spaces

  const applyIndent = (direction: 'in' | 'out') => {
    const el = textRef.current;
    if (!el) return;
    const currentText = typeof block.content?.text === 'string' ? block.content.text : '';
    const rawStart = el.selectionStart ?? 0;
    const rawEnd = el.selectionEnd ?? 0;
    const start = Math.min(rawStart, rawEnd);
    const end = Math.max(rawStart, rawEnd);

    // 선택 영역이 포함된 라인들 기준으로 들여쓰기/내어쓰기
    const lineStart = currentText.lastIndexOf('\n', start - 1) + 1; // -1이면 0
    const lineEndBase = currentText.indexOf('\n', end);
    const lineEnd = lineEndBase === -1 ? currentText.length : lineEndBase;
    const selectedChunk = currentText.slice(lineStart, lineEnd);
    const lines: string[] = selectedChunk.split('\n');

    let deltaStart = 0;
    let deltaEnd = 0;

    const nextLines = lines.map((line: string, idx: number) => {
      if (direction === 'in') {
        if (idx === 0) deltaStart += INDENT.length;
        deltaEnd += INDENT.length;
        return `${INDENT}${line}`;
      }
      // out
      if (line.startsWith(INDENT)) {
        if (idx === 0) deltaStart -= INDENT.length;
        deltaEnd -= INDENT.length;
        return line.slice(INDENT.length);
      }
      if (line.startsWith('\t')) {
        if (idx === 0) deltaStart -= 1;
        deltaEnd -= 1;
        return line.slice(1);
      }
      return line;
    });

    const replaced = nextLines.join('\n');
    const nextText = `${currentText.slice(0, lineStart)}${replaced}${currentText.slice(lineEnd)}`;

    onUpdate({ ...block.content, text: nextText });
    requestAnimationFrame(() => {
      const nextEl = textRef.current;
      if (!nextEl) return;
      const nextSelStart = Math.max(0, start + deltaStart);
      const nextSelEnd = Math.max(nextSelStart, end + deltaEnd);
      nextEl.focus();
      nextEl.setSelectionRange(nextSelStart, nextSelEnd);
    });
  };

  const handleSelectionChange = () => {
    const el = textRef.current;
    const selected = !!el && el.selectionStart !== el.selectionEnd;
    setHasSelection(selected);
    if (!supportsFormatting) return;
    if (selected) onShowFormatToolbar?.(applyMark);
    else onHideFormatToolbar?.();
  };

  const applyMark = useCallback((mark: InlineMark) => {
    if (!textRef.current) return;
    const start = textRef.current.selectionStart ?? 0;
    const end = textRef.current.selectionEnd ?? 0;
    const currentText = typeof block.content?.text === 'string' ? block.content.text : '';
    const result = toggleInlineMark(currentText, mark, start, end);
    setRenderMode('formatted');
    onUpdate({ ...block.content, text: result.text });
    requestAnimationFrame(() => {
      // 서식 적용 후 강제 focus 재진입을 막아 raw 토큰(**, __ 등)이 즉시 보이는 현상을 방지
      setHasSelection(false);
      onHideFormatToolbar?.();
    });
   
  }, [block.content, onHideFormatToolbar, onUpdate]);

  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    // 토글의 body 렌더/확장 직후에도 높이가 즉시 맞춰지도록 다음 프레임에서 재계산
    requestAnimationFrame(() => autoResize());
  }, [block.content?.text, block.content?.body, block.content?.collapsed, autoResize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { setShowSlash(false); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      // Tab은 블록 depth가 아니라, 블록 내부 텍스트 들여쓰기/내어쓰기
      applyIndent(e.shiftKey ? 'out' : 'in');
      return;
    }
    const lower = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && supportsFormatting) {
      if (lower === 'b') { e.preventDefault(); applyMark('bold'); return; }
      if (lower === 'i') { e.preventDefault(); applyMark('italic'); return; }
      if (lower === 'u') { e.preventDefault(); applyMark('underline'); return; }
      if (lower === '`') { e.preventDefault(); applyMark('code'); return; }
      if (e.shiftKey && lower === 'x') { e.preventDefault(); applyMark('strike'); return; }
    }
    if (e.key === 'Enter' && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setShowSlash(false);
      onEnter();
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field = 'text') => {
    const val = e.target.value;
    if (field === 'text') setRenderMode('editing');
    if (field === 'text' && val === '/' && (block.content?.text ?? '') === '') {
      setShowSlash(true);
      return;
    }
    setShowSlash(false);
    onUpdate({ ...block.content, [field]: val });
    autoResize();
  };

  const renderFormatToolbar = () => null;

  const renderFormattedTextarea = ({
    text,
    placeholder,
    textClassName,
    placeholderClassName = 'text-slate-300',
    field = 'text',
  }: {
    text: string;
    placeholder: string;
    textClassName: string;
    placeholderClassName?: string;
    field?: 'text' | 'body';
  }) => {
    const hasText = text.length > 0;
    const formattedMode = true; // 항상 서식 렌더 유지 (WYSIWYG에 가깝게)

    return (
      <div className="relative">
        {/* formatted preview layer (same textarea DOM 유지) */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 whitespace-pre-wrap break-words ${textClassName} ${
            formattedMode ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {hasText ? (
            <span dangerouslySetInnerHTML={{ __html: parseInlineMarkupToHtml(text) }} />
          ) : (
            <span className={placeholderClassName}>{placeholder}</span>
          )}
        </div>
        <textarea
          ref={textRef}
          rows={1}
          className={`relative w-full resize-none overflow-hidden bg-transparent ${textClassName} text-transparent caret-slate-800 selection:bg-blue-200/60 selection:text-transparent outline-none placeholder:transparent`}
          style={{ WebkitTextFillColor: 'transparent' }}
          placeholder={placeholder}
          value={text}
          onChange={(e) => handleChange(e, field)}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onFocus={() => {
            setRenderMode('editing');
            requestAnimationFrame(() => autoResize());
          }}
          onBlur={() => {
            setHasSelection(false);
            onHideFormatToolbar?.();
            setRenderMode('formatted');
          }}
        />
      </div>
    );
  };


  if (block.type === 'divider') {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 border-t border-slate-200" />
        <button type="button"
          className="rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
          onClick={onDelete}
        ><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  if (block.type === 'todo') {
    const checked = !!block.content?.checked;
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className="flex items-start gap-3 py-1" style={{ marginLeft: `${blockDepth * 20}px` }}>
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
            textClassName: `text-[15px] leading-7 ${checked ? 'text-slate-400 line-through' : 'text-slate-800'}`,
          })}
          {showSlash && (
            <SlashMenu
              onSelect={(type) => { onChangeType(type); }}
              onClose={() => setShowSlash(false)}
            />
          )}
        </div>
        <button type="button"
          className="mt-1 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
          onClick={onDelete}
        ><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  if (block.type === 'heading') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className="flex items-start gap-3 py-2" style={{ marginLeft: `${blockDepth * 20}px` }}>
        <div className="relative flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '제목',
            textClassName: 'text-2xl font-bold leading-tight text-slate-900',
          })}
          {showSlash && (
            <SlashMenu
              onSelect={(type) => { onChangeType(type); }}
              onClose={() => setShowSlash(false)}
            />
          )}
        </div>
        <button type="button"
          className="mt-1 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="max-h-80 w-full object-contain" />
          </div>
        )}
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
      <div className="relative rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2" style={{ marginLeft: `${blockDepth * 20}px` }}>
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
          placeholderClassName: 'text-slate-400',
        })}
      </div>
    );
  }

  if (block.type === 'toggle') {
    const title = typeof block.content?.title === 'string'
      ? block.content.title
      : (typeof block.content?.text === 'string' ? block.content.text : '');
    const body = typeof block.content?.body === 'string' ? block.content.body : '';
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
        className={`relative rounded-lg border bg-white px-3 py-2 ${
          isThisToggleFocused ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
        }`}
        style={{ marginLeft: `${blockDepth * 20}px` }}
      >
        <div className="mb-1 flex items-center gap-2">
          <button
            type="button"
            className={`transition-transform ${collapsed ? '-rotate-90' : ''}`}
            onClick={() => patchToggle({ collapsed: !collapsed })}
          >
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
          <input
            value={title}
            onChange={(e) => patchToggle({ title: e.target.value })}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="토글 제목"
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
          <>
            {renderFormatToolbar()}
            {renderFormattedTextarea({
              text: body,
              placeholder: '토글 본문을 입력하세요',
              textClassName: 'text-[15px] leading-7 text-slate-800',
              placeholderClassName: 'text-slate-400',
              field: 'body',
            })}
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url.trim()} alt="" className="max-h-56 w-full object-contain" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // text (default)
  const text = typeof block.content?.text === 'string' ? block.content.text : '';
  return (
    <div className="flex items-start gap-3 py-1" style={{ marginLeft: `${blockDepth * 20}px` }}>
      <div className="relative flex-1">
        {renderFormatToolbar()}
        {renderFormattedTextarea({
          text,
          placeholder: '내용을 입력하세요… (/ 로 블록 타입 변경)',
          textClassName: 'text-[15px] leading-7 text-slate-800',
        })}
        {showSlash && (
          <SlashMenu
            onSelect={(type) => { onChangeType(type); }}
            onClose={() => setShowSlash(false)}
          />
        )}
      </div>
      <button type="button"
        className="mt-1 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
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
  onOpenDocument,
  onShowFormatToolbar,
  onHideFormatToolbar,
  focusedToggleId,
  onFocusToggle,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onOpenDocument?: (documentId: string) => void;
  onShowFormatToolbar?: (applyMark: (mark: InlineMark) => void) => void;
  onHideFormatToolbar?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-start gap-1 rounded-lg px-1 py-0.5 transition-colors ${
        isDragging ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
      }`}
    >
      {/* 드래그 핸들 */}
      <button
        type="button"
        className="mt-1.5 flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-500 active:cursor-grabbing"
        aria-label="드래그하여 순서 변경"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* 블록 콘텐츠 */}
      <div
        className="flex-1 min-w-0"
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
          onOpenDocument={onOpenDocument}
          onShowFormatToolbar={onShowFormatToolbar}
          onHideFormatToolbar={onHideFormatToolbar}
          isDragging={isDragging}
          focusedToggleId={focusedToggleId}
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
export default function AdminNotePage() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  /** 상단 '이미지' 블록 추가 시 토글 안에 넣을 대상 (토글 블록 클릭으로 설정) */
  const [focusedToggleId, setFocusedToggleId] = useState<string | null>(null);
  const [formatToolbar, setFormatToolbar] = useState<{ applyMark: (mark: InlineMark) => void } | null>(null);
  const [docTab, setDocTab] = useState<'active' | 'trash'>('active');

  const saveTimersRef = useRef<Record<string, number | undefined>>({});
  const savedTimerRef = useRef<number | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const blocksRef = useRef<NoteBlock[]>([]);

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
    if (docTab === 'trash') return [];
    const pinned = filteredDocuments.filter((d) => d.is_pinned);
    return [...pinned].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [docTab, filteredDocuments]);
  const favoriteDocuments = useMemo(() => {
    if (docTab === 'trash') return [];
    return filteredDocuments.filter((d) => d.is_favorite && !d.is_pinned);
  }, [docTab, filteredDocuments]);
  const otherDocuments = useMemo(
    () => (docTab === 'trash' ? filteredDocuments : filteredDocuments.filter((d) => !d.is_favorite && !d.is_pinned)),
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
    if (initialId) { setSelectedId(initialId); setMobileTab('editor'); }
  }, [searchParams]);

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
        if (docTab === 'active' && !selectedId && json.documents?.length > 0) {
          const preferred = json.documents.find((d) => d.is_pinned) ?? json.documents[0];
          setSelectedId(preferred.id);
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
        setBlocks(json.blocks ?? []);
      } catch (e) { devLogger.error('[Note] loadBlocks', e); setError(e instanceof Error ? e.message : '로드 실패'); }
      finally { setLoadingBlocks(false); }
    };
    load();
  }, [selectedId]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

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
    setActiveBlockId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveBlockId(null);
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
          const next = [prev[idx], ...prev.slice(0, idx), ...prev.slice(idx + 1)];
          const orders = next.map((b, i) => ({ id: b.id, order_index: i }));
          fetch('/api/admin/note/blocks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ orders }),
          })
            .then(() => triggerSave())
            .catch((e) => devLogger.error('[Note] reorder(top)', e));
          return next.map((b, i) => ({ ...b, order_index: i }));
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

    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      const orders = reordered.map((b, i) => ({ id: b.id, order_index: i }));

      // persist asynchronously
      fetch('/api/admin/note/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orders }),
      })
        .then(() => triggerSave())
        .catch((e) => devLogger.error('[Note] reorder', e));

      return reordered.map((b, i) => ({ ...b, order_index: i }));
    });
  }, [triggerSave]);

  /* handlers */
  const handleSelectDocument = (doc: NoteDocument) => {
    setSelectedId(doc.id);
    setMobileTab('editor');
    router.replace(`/admin/note?id=${encodeURIComponent(doc.id)}`);
  };

  const handleOpenDocumentById = useCallback((documentId: string) => {
    setSelectedId(documentId);
    setMobileTab('editor');
    router.replace(`/admin/note?id=${encodeURIComponent(documentId)}`);
  }, [router]);

  const showFormatToolbar = useCallback((applyMark: (mark: InlineMark) => void) => {
    setFormatToolbar({ applyMark });
  }, []);

  const hideFormatToolbar = useCallback(() => {
    setFormatToolbar(null);
  }, []);

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
      setSelectedId(newDoc.id); setMobileTab('editor');
      router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
    } catch (e) { devLogger.error('[Note] createDoc', e); setError(e instanceof Error ? e.message : '생성 실패'); }
    finally { setLoadingState('idle'); }
  };

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
            parent_id: selectedId, // 현재 문서의 하위 문서로 생성
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
        const res = await fetch('/api/admin/note/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ documentId: selectedId, type: 'page', content: pageBlockContent }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || '문서 블록 추가 실패');
        }
        const json = (await res.json()) as { block: NoteBlock };
        setBlocks((prev) => [json.block, ...prev]);
        triggerSave();
        return;
      }
      const defaultContent =
        type === 'heading' ? { text: '' }
        : type === 'todo' ? { text: '', checked: false }
        : type === 'toggle' ? { title: '', body: '', collapsed: false, depth: 0, images: [] }
        : type === 'callout' ? { text: '', icon: '💡', depth: 0 }
        : type === 'divider' ? {}
        : type === 'page' ? { page_document_id: '', title: '문서' }
        : { text: '', depth: 0 };
      const res = await fetch('/api/admin/note/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ documentId: selectedId, type, content: defaultContent }) });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '블록 추가 실패'); }
      const json = (await res.json()) as { block: NoteBlock };
      setBlocks((prev) => [json.block, ...prev]);
      triggerSave();
    } catch (e) { devLogger.error('[Note] addBlock', e); setError(e instanceof Error ? e.message : '추가 실패'); }
  }, [selectedId, triggerSave, focusedToggleId, blocks, handleUpdateBlock]);

  const handleChangeBlockType = useCallback(async (block: NoteBlock, type: NoteBlock['type']) => {
    const defaultContent =
      type === 'heading' ? { text: '' }
      : type === 'todo' ? { text: '', checked: false }
      : type === 'toggle' ? { title: '', body: '', collapsed: false, depth: 0, images: [] }
      : type === 'callout' ? { text: '', icon: '💡', depth: 0 }
      : type === 'divider' ? {}
      : type === 'page' ? { page_document_id: '', title: '문서' }
      : { text: '', depth: 0 };
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, type, content: defaultContent } : b)));
    try {
      await fetch('/api/admin/note/blocks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: block.id, type, content: defaultContent }) });
      triggerSave();
    } catch (e) { devLogger.error('[Note] changeBlockType', e); }
  }, [triggerSave]);

  const handleDeleteBlock = useCallback(async (block: NoteBlock) => {
    const prev = blocks;
    setBlocks((p) => p.filter((b) => b.id !== block.id));
    try {
      const res = await fetch(`/api/admin/note/blocks?id=${encodeURIComponent(block.id)}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('삭제 실패');
    } catch (e) { devLogger.error('[Note] deleteBlock', e); setBlocks(prev); setError('블록 삭제 실패'); }
  }, [blocks]);

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

  /* ── render ── */
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-white md:h-screen md:overflow-hidden">

      {/* ── 상단 헤더 ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
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

      {/* ── 콘텐츠 ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-h-0 flex-1">

          {/* ── 사이드바 ── */}
          <div className={`flex flex-col border-r border-slate-100 bg-slate-50 ${
            mobileTab === 'list' ? 'flex w-full' : 'hidden'
          } md:flex md:w-[260px] md:shrink-0`}>

          {/* 탭: 전체/휴지통 */}
          <div className="shrink-0 px-3 pt-3">
            <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1">
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
            </div>
            {docTab === 'trash' && (
              <p className="mt-2 px-1 text-[11px] font-medium text-slate-400">
                휴지통 문서는 7일 후 영구삭제할 수 있습니다.
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
                {searchQuery ? '검색 결과 없음' : (docTab === 'trash' ? '휴지통이 비어 있습니다' : '아직 노트가 없습니다')}
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
          <div className={`flex flex-1 flex-col overflow-hidden ${
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
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-2 md:px-16">
                  {formatToolbar ? (
                    <>
                      {([
                        { mark: 'bold' as const, label: '굵게 (Ctrl+B)', icon: Bold },
                        { mark: 'italic' as const, label: '기울임 (Ctrl+I)', icon: Italic },
                        { mark: 'underline' as const, label: '밑줄 (Ctrl+U)', icon: UnderlineIcon },
                        { mark: 'strike' as const, label: '취소선 (Ctrl+Shift+X)', icon: Strikethrough },
                        { mark: 'code' as const, label: '코드 (Ctrl+`)', icon: Code2 },
                      ] as const).map(({ mark, label, icon: Icon }) => (
                        <button
                          key={mark}
                          type="button"
                          title={label}
                          className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => formatToolbar.applyMark(mark)}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                      <span className="ml-2 text-[11px] font-medium text-slate-400">선택 영역 서식</span>
                    </>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">텍스트를 드래그하면 서식 툴바가 여기에 표시됩니다</span>
                  )}
                </div>
                <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-4 pb-2 md:px-16">
                  {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      title={
                        type === 'image' && focusedToggleId
                          ? '선택한 토글 블록 안에 이미지 슬롯을 추가합니다. 토글을 한 번 클릭한 뒤 누르세요.'
                          : undefined
                      }
                      onClick={() => handleAddBlock(type)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 hover:shadow"
                    >
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mx-auto max-w-3xl px-4 py-10 md:px-16">

                {/* 문서 큰 제목 */}
                <textarea
                  ref={titleInputRef}
                  rows={1}
                  className="mb-2 w-full resize-none overflow-hidden bg-transparent text-[32px] font-extrabold leading-tight text-slate-900 outline-none placeholder:text-slate-300 md:text-[40px]"
                  placeholder="제목 없음"
                  value={activeDocument.title === '제목 없음' ? '' : activeDocument.title}
                  onChange={(e) => handleRenameDocument(activeDocument.id, e.target.value || '제목 없음')}
                />
                <div className="mb-8 flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
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
                    <p className="mb-2 text-[12px] font-semibold text-blue-700">백링크 {backlinks.length}</p>
                    <div className="flex flex-wrap gap-2">
                      {backlinks.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 shadow-sm hover:bg-blue-100"
                          onClick={() => handleSelectDocument(doc)}
                        >
                          {doc.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 빈 문서 */}
                {blocks.length === 0 && (
                  <div className="mb-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                    <p className="text-[14px] font-semibold text-slate-400">아직 내용이 없습니다</p>
                    <p className="mt-1 text-[13px] text-slate-400">아래 버튼으로 첫 번째 블록을 추가해 보세요.</p>
                  </div>
                )}

                {/* 블록 목록 (DnD) */}
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0.5">
                    {blocks.map((block) => (
                      <SortableBlockRow
                        key={block.id}
                        block={block}
                        onUpdate={(content) => handleUpdateBlock(block, content)}
                        onDelete={() => handleDeleteBlock(block)}
                        onChangeType={(type) => handleChangeBlockType(block, type)}
                        onEnter={() => handleAddBlock('text')}
                        onOpenDocument={handleOpenDocumentById}
                        onShowFormatToolbar={showFormatToolbar}
                        onHideFormatToolbar={hideFormatToolbar}
                        focusedToggleId={focusedToggleId}
                        onFocusToggle={setFocusedToggleId}
                      />
                    ))}
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
    </div>
  );
}
