'use client';

import {
  isRichPreviewEmpty,
  resolveRichPreviewHtml,
  type RichPreviewField,
} from '@/app/lib/note/richTextPreview';
import { useNoteImageLightbox } from '../NoteImageLightbox';

type BlockTextPreviewProps = {
  content: Record<string, unknown> | null | undefined;
  field?: RichPreviewField;
  text: string;
  className: string;
  placeholder?: string;
  onActivate?: () => void;
};

/** 포커스 전 가벼운 읽기 전용 블록 표시 (TipTap 미마운트) */
export function BlockTextPreview({
  content,
  field = 'text',
  text,
  className,
  placeholder = '',
  onActivate,
}: BlockTextPreviewProps) {
  const html = resolveRichPreviewHtml({ content, field, text });
  const empty = isRichPreviewEmpty(html, text);
  const imageLightbox = useNoteImageLightbox();

  return (
    <div
      className={`note-rich-editor min-h-[1.75rem] w-full cursor-text outline-none ${className}`}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('a, button')) return;

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

        onActivate?.();
        if (empty) e.preventDefault();
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
