'use client';

import type { HomeMediaItem } from '../../data/home-media';
import { MediaRenderer } from './media-renderer';

type MediaPanelProps = {
  media: HomeMediaItem;
  className?: string;
};

export function MediaPanel({
  media,
  className = 'relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200/90',
}: MediaPanelProps) {
  return (
    <div className={className} role="img" aria-label={media.alt}>
      <MediaRenderer media={media} intensity="soft" showLabel className="absolute inset-0" sizes="(max-width: 768px) 50vw, 33vw" />
    </div>
  );
}
