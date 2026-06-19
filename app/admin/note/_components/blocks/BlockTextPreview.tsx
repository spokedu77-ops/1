'use client';

import { useRef } from 'react';
import {
  isRichPreviewEmpty,
  resolveRichPreviewHtml,
  type RichPreviewField,
} from '@/app/lib/note/richTextPreview';
import { useNoteImageLightbox } from '../NoteImageLightbox';
import { parseAdminNoteDocumentIdFromHref } from '../../_lib/notePaste';

type BlockTextPreviewProps = {
  content: Record<string, unknown> | null | undefined;
  field?: RichPreviewField;
  text: string;
  className: string;
  placeholder?: string;
  onRecordClick?: (x: number, y: number) => void;
  onActivate?: () => void;
  onOpenDocumentById?: (documentId: string) => void;
};

const DRAG_THRESHOLD = 5;

/** 포커스 전 가벼운 읽기 전용 블록 표시 (TipTap 미마운트) */
export function BlockTextPreview({
  content,
  field = 'text',
  text,
  className,
  placeholder = '',
  onRecordClick,
  onActivate,
  onOpenDocumentById,
}: BlockTextPreviewProps) {
  const html = resolveRichPreviewHtml({ content, field, text });
  const empty = isRichPreviewEmpty(html, text);
  const imageLightbox = useNoteImageLightbox();
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const hasTextSelection = () => {
    const selection = window.getSelection();
    return Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
  };

  return (
    <div
      data-note-preview-text
      className={`note-rich-editor min-h-[1.75rem] w-full cursor-text select-text outline-none ${className}`}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor) {
          const href = anchor.getAttribute('href');
          if (href) {
            const docId = parseAdminNoteDocumentIdFromHref(href);
            if (docId && onOpenDocumentById) {
              e.preventDefault();
              onOpenDocumentById(docId);
              return;
            }
          }
          return;
        }
        if (target.closest('button')) return;

        const imgEl =
          target.tagName === 'IMG' ? target : target.closest('img');
        if (imgEl instanceof HTMLImageElement) {
          const src = imgEl.currentSrc || imgEl.getAttribute('src');
          if (src && imageLightbox) {
            e.preventDefault();
            imageLightbox.open(src, imgEl.alt || undefined);
            return;
          }
        }

        onRecordClick?.(e.clientX, e.clientY);

        if (empty) {
          e.preventDefault();
          onActivate?.();
          return;
        }
        pointerStartRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = pointerStartRef.current;
        pointerStartRef.current = null;
        if (!start) return;

        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) return;
        if (hasTextSelection()) return;
        if (e.detail > 1) return;
        onActivate?.();
      }}
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('a, button, img')) return;
        e.preventDefault();
        const root = e.currentTarget;
        const body = root.querySelector(':scope > div') ?? root;
        const range = document.createRange();
        range.selectNodeContents(body);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }}
    >
      {empty ? (
        <p className="is-editor-empty" data-placeholder={placeholder} />
      ) : (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
