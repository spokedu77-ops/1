'use client';

import type { ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronRight, GripVertical, Pin, Plus, Star, Trash2 } from 'lucide-react';
import { DocIconGlyph, resolveDocIcon } from '../../_lib/noteDocumentUi';
import type { NoteDocument } from '../../_lib/types';

/** 노션형 토글 — 검정 채움 삼각형 */
export function ToggleDisclosureButton({
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
export function DocRootDropZone({
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
export function WorkspaceTitleDropTarget({
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
export function EditorDocDropZone({
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
export function DocItem({
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
  onPrefetchHover,
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
  onPrefetchHover?: () => void;
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
        onMouseEnter={onPrefetchHover}
        onMouseDown={onPrefetchHover}
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
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <p
          className="truncate text-[14px] leading-5 text-neutral-700"
          title={doc.title}
        >
          {doc.title}
        </p>
        <div
          className={`absolute inset-y-0 right-0 flex items-center gap-0.5 pl-10 ${
            isActive
              ? 'bg-gradient-to-l from-neutral-200/95 via-neutral-200/75 to-transparent'
              : 'bg-gradient-to-l from-[#f7f7f5] via-[#f7f7f5]/85 to-transparent opacity-0 transition-opacity group-hover:opacity-100'
          }`}
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
    </div>
  );
}

export function BlockInsideDropSurface({
  blockId,
  disabled,
  children,
  className = '',
  style,
  onMouseDown,
  insideInset = 'toggle',
}: {
  blockId: string;
  disabled: boolean;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  /** page: 가운데만 하위 문서로 — 위·아래는 형제 사이 삽입 */
  insideInset?: 'toggle' | 'page';
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
          className={`pointer-events-none absolute inset-x-0 z-[1] ${
            insideInset === 'page' ? 'top-[35%] bottom-[35%]' : 'top-[15%] bottom-[15%]'
          }`}
          aria-hidden
        />
      )}
      {children}
    </div>
  );
}