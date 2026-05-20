'use client';

import type { HomeMediaItem } from '../../data/home-media';
import { MediaRenderer } from './media-renderer';

type ProofMediaCardProps = {
  media: HomeMediaItem;
};

export function ProofMediaCard({ media }: ProofMediaCardProps) {
  return (
    <article className="flex w-[132px] shrink-0 flex-col gap-2 sm:w-[148px]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <MediaRenderer media={media} intensity="soft" className="absolute inset-0" sizes="148px" />
      </div>
      <p className="truncate text-center text-[11px] font-semibold text-slate-700 sm:text-xs">{media.label}</p>
    </article>
  );
}
