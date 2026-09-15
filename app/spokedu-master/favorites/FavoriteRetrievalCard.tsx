'use client';

import { Heart, Play } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { MV_CONTENT_TITLE, MV_META } from '../lib/masterUiClasses';
import { ContentCardMetaLine } from '../components/content/ContentCardMetaLine';

type FavoriteRetrievalCardProps = {
  media: ReactNode;
  primaryMeta: string;
  secondaryMeta?: string;
  title: string;
  supportMeta?: string;
  playHref?: string;
  playAriaLabel?: string;
  hasVideo?: boolean;
  openAriaLabel: string;
  removeAriaLabel?: string;
  href?: string;
  onOpen?: () => void;
  onRemove: () => void;
};

export function FavoriteRetrievalCard({
  media,
  primaryMeta,
  secondaryMeta,
  title,
  supportMeta,
  playHref,
  playAriaLabel,
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
        <ContentCardMetaLine primary={primaryMeta} secondary={secondaryMeta} />
        <h2 className={`${MV_CONTENT_TITLE} mt-1.5 line-clamp-1 transition-colors duration-200 group-hover:text-slate-700`}>
          {title}
        </h2>
        {supportMeta || playHref ? (
          <div className="mt-1 flex min-h-11 items-center gap-2">
            <p className={`${MV_META} min-w-0 flex-1 truncate text-slate-600`}>{supportMeta || '\u00a0'}</p>
            {playHref ? (
              <Link
                href={playHref}
                className="relative z-20 grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
                aria-label={playAriaLabel ?? `${title} 바로 시작`}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100">
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                </span>
              </Link>
            ) : null}
          </div>
        ) : null}
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
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-white/80 text-amber-500 ring-1 ring-slate-900/5 backdrop-blur-sm transition-colors group-hover:bg-white/95">
          <Heart className="h-4 w-4 fill-current" aria-hidden />
        </span>
      </button>
    </article>
  );
}
