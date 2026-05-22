'use client';

import type { HomeMediaItem } from '../../data/home-media';
import { MediaRenderer } from './media-renderer';

type MediaPanelProps = {
  media: HomeMediaItem;
  className?: string;
  showLabel?: boolean;
  /** 실사 노출 우선(카드·랜딩) vs 히어로급 톤 보정 */
  photoPriority?: boolean;
};

export function MediaPanel({
  media,
  className = 'aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200/90',
  showLabel = false,
  photoPriority = true,
}: MediaPanelProps) {
  return (
    <div className={`relative ${className}`} role="img" aria-label={media.alt}>
      <MediaRenderer
        media={media}
        intensity={photoPriority ? 'photo' : 'soft'}
        showLabel={showLabel}
        className="absolute inset-0 h-full w-full"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  );
}
