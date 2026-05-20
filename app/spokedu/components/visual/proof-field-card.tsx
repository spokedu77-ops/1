'use client';

import Link from 'next/link';
import type { HomeProofField } from '../../data/home-media';
import { cardInteractive, fineHover } from '../../lib/ui-classes';
import { inferTrackFromHref } from '../../lib/tracking';
import { MediaPanel } from './media-panel';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type ProofFieldCardProps = {
  field: HomeProofField;
  className?: string;
};

export function ProofFieldCard({ field, className = '' }: ProofFieldCardProps) {
  return (
    <Link
      href={field.href}
      data-track={inferTrackFromHref(field.href)}
      data-track-label={field.trackLabel}
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] ${cardInteractive} ${focusRing} ${className}`}
    >
      <MediaPanel
        media={field.media}
        className="aspect-[16/10] shrink-0 rounded-none border-0 border-b border-slate-200/80"
      />
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600 sm:text-[11px]">
          {field.category}
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-snug text-slate-900 sm:text-base">{field.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{field.description}</p>
        <span
          className={`mt-auto inline-flex items-center pt-2.5 text-xs font-semibold text-slate-900 sm:pt-3 sm:text-sm ${fineHover}group-hover:text-indigo-700`}
        >
          {field.cta}
          <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
