'use client';

import Link from 'next/link';
import type { HomeSignatureProgram } from '../../data/home-media';
import { cardInteractive, fineHover } from '../../lib/ui-classes';
import { inferTrackFromHref } from '../../lib/tracking';
import { MediaPanel } from './media-panel';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function TrackBadges({ tracks }: { tracks: HomeSignatureProgram['tracks'] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tracks.map((track) => (
        <span
          key={track}
          className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
        >
          {track}
        </span>
      ))}
    </div>
  );
}

type ProgramShowcaseCardProps = {
  program: HomeSignatureProgram;
  variant: 'featured' | 'compact';
  className?: string;
};

export function ProgramShowcaseCard({ program, variant, className = '' }: ProgramShowcaseCardProps) {
  const featured = variant === 'featured';

  return (
    <Link
      href={program.href}
      data-track={inferTrackFromHref(program.href)}
      data-track-label={program.trackLabel}
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] ${cardInteractive} ${focusRing} ${className}`}
    >
      <MediaPanel
        media={program.media}
        className={
          featured
            ? 'aspect-[16/10] shrink-0 rounded-none border-0 border-b border-slate-200/80 sm:aspect-[5/3]'
            : 'aspect-[16/9] shrink-0 rounded-none border-0 border-b border-slate-200/80'
        }
      />
      <div className={`flex flex-1 flex-col ${featured ? 'p-3.5 sm:p-4' : 'p-3 sm:p-3.5'}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">{program.badge}</p>
        <h3 className={`mt-0.5 font-semibold leading-snug text-slate-900 ${featured ? 'text-base sm:text-lg' : 'text-sm'}`}>
          {program.name}
        </h3>
        <p
          className={`mt-1 text-slate-600 ${featured ? 'line-clamp-2 text-sm leading-5' : 'line-clamp-2 text-xs leading-4 sm:line-clamp-1 sm:text-sm sm:leading-5'}`}
        >
          {program.description}
        </p>
        <div className={`${featured ? 'mt-2.5' : 'mt-2'}`}>
          <TrackBadges tracks={program.tracks} />
        </div>
        <span
          className={`mt-auto inline-flex items-center font-semibold text-slate-900 ${featured ? 'pt-3 text-sm' : 'pt-2 text-xs sm:text-sm'} ${fineHover}group-hover:text-indigo-700`}
        >
          {program.cta}
          <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
