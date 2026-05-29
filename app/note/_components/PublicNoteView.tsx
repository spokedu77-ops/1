'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, CheckSquare, ChevronDown, FileText, Image as ImageIcon } from 'lucide-react';
import type { PublicNoteBlock, PublicNoteDocument } from '@/app/lib/server/publicNote';

function blockDepth(content: Record<string, unknown> | null | undefined) {
  return Math.max(0, Math.min(6, Number(content?.depth ?? 0)));
}

function richHtml(content: Record<string, unknown> | null | undefined, field: 'text' | 'body' = 'text') {
  const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
  const html = content?.[htmlKey];
  if (typeof html === 'string' && html.trim()) return html;
  const plain = content?.[field];
  if (typeof plain !== 'string' || !plain.trim()) return '';
  return plain.split('\n').map((line) => `<p>${line || '<br>'}</p>`).join('');
}

function RichText({
  content,
  field = 'text',
  className,
}: {
  content: Record<string, unknown> | null | undefined;
  field?: 'text' | 'body';
  className?: string;
}) {
  const html = useMemo(() => richHtml(content, field), [content, field]);
  if (!html) return null;
  return (
    <div
      className={`public-note-rich ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function PublicBlock({
  block,
  publicPages,
}: {
  block: PublicNoteBlock;
  publicPages: Record<string, string>;
}) {
  const depth = blockDepth(block.content);
  const indentStyle = { marginLeft: `${depth * 20}px` };

  if (block.type === 'divider') {
    return (
      <div className="py-3" style={indentStyle}>
        <div className="border-t border-slate-200" />
      </div>
    );
  }

  if (block.type === 'heading') {
    return (
      <div className="py-3" style={indentStyle}>
        <RichText content={block.content} className="text-2xl font-bold leading-tight text-slate-900" />
      </div>
    );
  }

  if (block.type === 'todo') {
    const checked = !!block.content?.checked;
    return (
      <div className="flex items-start gap-3 py-1.5" style={indentStyle}>
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
            checked ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 bg-white'
          }`}
        >
          {checked ? <Check className="h-3 w-3" /> : null}
        </span>
        <RichText
          content={block.content}
          className={`text-[15px] leading-7 ${checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}
        />
      </div>
    );
  }

  if (block.type === 'callout') {
    const icon = typeof block.content?.icon === 'string' && block.content.icon.trim()
      ? block.content.icon
      : '💡';
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2" style={indentStyle}>
        <div className="mb-1 text-sm">{icon}</div>
        <RichText content={block.content} className="text-[15px] leading-7 text-slate-800" />
      </div>
    );
  }

  if (block.type === 'code') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-950 px-4 py-3" style={indentStyle}>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[13px] leading-6 text-slate-100">{text}</pre>
      </div>
    );
  }

  if (block.type === 'image') {
    const url = typeof block.content?.url === 'string' ? block.content.url.trim() : '';
    if (!url) return null;
    return (
      <div className="py-2" style={indentStyle}>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img src={url} alt="" className="max-h-96 w-full object-contain" />
        </div>
      </div>
    );
  }

  if (block.type === 'page') {
    const pageId = typeof block.content?.page_document_id === 'string' ? block.content.page_document_id : '';
    const title =
      (typeof block.content?.title === 'string' && block.content.title.trim())
        ? block.content.title
        : '문서';
    const shareToken = pageId ? publicPages[pageId] : undefined;
    const inner = (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <FileText className="h-4 w-4 shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {shareToken ? '공개 하위 문서' : '비공개 문서'}
          </p>
        </div>
      </div>
    );
    return (
      <div className="py-1.5" style={indentStyle}>
        {shareToken ? (
          <Link href={`/note/p/${shareToken}`} className="block transition hover:opacity-90">
            {inner}
          </Link>
        ) : inner}
      </div>
    );
  }

  if (block.type === 'toggle') {
    return <PublicToggleBlock block={block} publicPages={publicPages} indentStyle={indentStyle} />;
  }

  return (
    <div className="py-1.5" style={indentStyle}>
      <RichText content={block.content} className="text-[15px] leading-7 text-slate-800" />
    </div>
  );
}

function PublicToggleBlock({
  block,
  publicPages,
  indentStyle,
}: {
  block: PublicNoteBlock;
  publicPages: Record<string, string>;
  indentStyle: React.CSSProperties;
}) {
  const [open, setOpen] = useState(!block.content?.collapsed);
  const title = typeof block.content?.title === 'string'
    ? block.content.title
    : (typeof block.content?.text === 'string' ? block.content.text : '');
  const rawImages = block.content?.images;
  const images = Array.isArray(rawImages)
    ? rawImages.map((url) => (typeof url === 'string' ? url.trim() : '')).filter(Boolean)
    : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2" style={indentStyle}>
      <button
        type="button"
        className="mb-1 flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="text-[15px] font-semibold leading-6 text-slate-800">{title || '토글'}</span>
      </button>
      {open && (
        <>
          <RichText content={block.content} field="body" className="text-[15px] leading-7 text-slate-800" />
          {images.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {images.map((url) => (
                <div key={url} className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-2">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
                    <ImageIcon className="h-3.5 w-3.5" />
                    이미지
                  </div>
                  <img src={url} alt="" className="max-h-56 w-full object-contain" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PublicNoteView({
  document,
  blocks,
  publicPages,
}: {
  document: PublicNoteDocument;
  blocks: PublicNoteBlock[];
  publicPages: Record<string, string>;
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-slate-50/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-8">
          <span className="rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            Shared Note
          </span>
          <span className="text-[11px] text-slate-400">읽기 전용</span>
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <h1 className="mb-8 text-[36px] font-extrabold leading-[1.08] tracking-tight text-slate-950 md:text-[44px]">
          {document.title}
        </h1>
        <div className="space-y-0.5">
          {blocks.map((block) => (
            <PublicBlock key={block.id} block={block} publicPages={publicPages} />
          ))}
        </div>
      </article>
      <style jsx global>{`
        .public-note-rich p {
          margin: 0;
        }
        .public-note-rich a {
          color: rgb(37 99 235);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .public-note-rich code {
          border-radius: 0.375rem;
          background: rgb(241 245 249);
          padding: 0.1rem 0.25rem;
          font-size: 0.92em;
        }
        .public-note-rich h1,
        .public-note-rich h2,
        .public-note-rich h3 {
          margin: 0;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
