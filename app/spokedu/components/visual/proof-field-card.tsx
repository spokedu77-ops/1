'use client';

import Link from 'next/link';
import type { HomeProofField } from '../../data/home-media';
import { cardInteractive, fineHover } from '../../lib/ui-classes';
import { inferTrackFromHref } from '../../lib/tracking';
import {
  landingCardBadgeText,
  landingCardBodyText,
  landingCardShell,
  landingCardTitleText,
  type LandingCardVariant,
} from './card-variants';
import { MediaPanel } from './media-panel';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type ProofFieldCardProps = {
  field: HomeProofField;
  className?: string;
};

export function ProofFieldCard({ field, className = '' }: ProofFieldCardProps) {
  const variant: LandingCardVariant = field.cardVariant ?? 'image';

  return (
    <Link
      href={field.href}
      data-track={inferTrackFromHref(field.href)}
      data-track-label={field.trackLabel}
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl ${landingCardShell(variant)} ${cardInteractive} ${focusRing} ${className}`}
    >
      <MediaPanel
        media={field.media}
        className="aspect-[16/10] shrink-0 rounded-none border-0 border-b border-slate-200/80"
      />
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${landingCardBadgeText(variant)}`}>
          {field.category}
        </p>
        <h3 className={`mt-1 text-sm font-semibold leading-snug sm:text-base ${landingCardTitleText(variant)}`}>
          {field.title}
        </h3>
        <p className={`mt-1 line-clamp-2 text-xs leading-5 sm:text-sm ${landingCardBodyText(variant)}`}>
          {field.description}
        </p>
        <span
          className={`mt-auto inline-flex items-center pt-2.5 text-xs font-semibold sm:pt-3 sm:text-sm ${variant === 'dark' ? 'text-white' : 'text-slate-900'} ${fineHover}group-hover:text-indigo-700`}
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
