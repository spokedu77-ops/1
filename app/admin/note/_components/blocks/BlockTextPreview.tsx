'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  isRichPreviewEmpty,
  resolveRichPreviewHtml,
  type RichPreviewField,
} from '@/app/lib/note/richTextPreview';
import { stripListItemMarkerFromHtml } from '../noteBulletInput';
import {
  applyBlockPreviewCrossHighlight,
  applyBlockRowCrossHighlight,
  clearBlockPreviewCrossHighlight,
} from '../noteBlockPreviewCrossSelect';
import { clearAllNoteTextSelections, getActiveCrossRanges } from '../noteCrossSelect';
import { getActiveListCrossRanges } from '../noteListCrossSelect';
import { setPendingSelectAllBlock } from '../noteEditorRegistry';
import { useNoteImageLightbox } from '../NoteImageLightbox';
import { parseAdminNoteDocumentIdFromHref } from '../../_lib/notePaste';

type BlockTextPreviewProps = {
  blockId: string;
  content: Record<string, unknown> | null | undefined;
  field?: RichPreviewField;
  text: string;
  className: string;
  placeholder?: string;
  stripListMarkers?: boolean;
  onRecordClick?: (x: number, y: number) => void;
  onActivate?: () => void;
  onOpenDocumentById?: (documentId: string) => void;
};

const DRAG_THRESHOLD = 5;

/** 포커스 전 가벼운 읽기 전용 블록 표시 (TipTap 미마운트) */
export function BlockTextPreview({
  blockId,
  content,
  field = 'text',
  text,
  className,
  placeholder = '',
  stripListMarkers = false,
  onRecordClick,
  onActivate,
  onOpenDocumentById,
}: BlockTextPreviewProps) {
  const html = useMemo(() => {
    const nextHtml = resolveRichPreviewHtml({ content, field, text });
    return stripListMarkers ? stripListItemMarkerFromHtml(nextHtml) : nextHtml;
  }, [content, field, text, stripListMarkers]);
  const empty = isRichPreviewEmpty(html, text);
  const imageLightbox = useNoteImageLightbox();
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const activeRanges = [
      ...getActiveCrossRanges(),
      ...getActiveListCrossRanges(),
    ].filter((range) => range.blockId === blockId);

    if (activeRanges.length > 0) {
      const range = activeRanges[activeRanges.length - 1];
      if (range.surface === 'preview' || range.surface === 'list-preview') {
        if (range.to > range.from) {
          applyBlockPreviewCrossHighlight(blockId, range.from, range.to);
        } else {
          clearBlockPreviewCrossHighlight(blockId);
          applyBlockRowCrossHighlight(blockId);
        }
      }
    } else {
      clearBlockPreviewCrossHighlight(blockId);
    }
  }, [blockId, html]);

  const hasTextSelection = () => {
    const selection = window.getSelection();
    return Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
  };

  return (
    <div
      data-note-preview-text
      className={`note-rich-editor relative min-h-[1.75rem] w-full min-w-0 cursor-text select-text outline-none ${className}`}
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
        clearAllNoteTextSelections();
        onActivate?.();
      }}
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('a, button, img')) return;
        e.preventDefault();
        e.stopPropagation();
        setPendingSelectAllBlock(blockId);
        onActivate?.();
      }}
    >
      {empty ? (
        <p className="is-editor-empty" data-placeholder={placeholder} />
      ) : (
        <div className="min-w-0 w-full" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
