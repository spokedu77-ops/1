'use client';

import { Bookmark, Play } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { MV_CONTENT_TITLE, MV_META } from '../lib/masterUiClasses';

type FavoriteRetrievalCardProps = {
  media: ReactNode;
  contentType: '놀이체육' | 'SPOMOVE';
  title: string;
  supportMeta?: string;
  hasVideo?: boolean;
  openAriaLabel: string;
  removeAriaLabel?: string;
  href?: string;
  onOpen?: () => void;
  onRemove: () => void;
};

export function FavoriteRetrievalCard({
  media,
  contentType,
  title,
  supportMeta,
  hasVideo = false,
  openAriaLabel,
  removeAriaLabel,
  href,
  onOpen,
  onRemove,
}: FavoriteRetrievalCardProps) {
  const interactionClassName =
    'absolute inset-0 z-10 rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--spm-acc)]';

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-slate-200/80 bg-white transition-colors duration-200 hover:border-slate-300">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden border-b border-slate-100 bg-slate-100">
        {media}
        {hasVideo ? (
          <span className="pointer-events-none absolute left-3 top-3 z-[5] grid h-6 w-6 place-items-center rounded-full bg-white/65 text-slate-950/55">
            <Play className="h-3 w-3 fill-current" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <p className={`${MV_META} truncate`}>{contentType}</p>
        <h2 className={`${MV_CONTENT_TITLE} mt-1.5 line-clamp-1 transition-colors duration-200 group-hover:text-slate-700`}>
          {title}
        </h2>
        <p className={`${MV_META} mt-3 min-h-5 truncate text-slate-600`}>{supportMeta || '\u00a0'}</p>
      </div>

      {href ? (
        <Link href={href} className={interactionClassName} aria-label={openAriaLabel} />
      ) : (
        <button type="button" onClick={onOpen} className={interactionClassName} aria-label={openAriaLabel} />
      )}

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
        className="absolute right-1.5 top-1.5 z-20 grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--spm-acc)]"
        aria-label={removeAriaLabel ?? `${title} 즐겨찾기에서 제거`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/75 text-[color:var(--spm-acc)] ring-1 ring-slate-900/5 backdrop-blur-sm transition-colors group-hover:bg-white/90">
          <Bookmark className="h-4 w-4 fill-current" aria-hidden />
        </span>
      </button>
    </article>
  );
}
