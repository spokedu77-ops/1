'use client';

import type { HomeMediaItem } from '../../data/home-media';
import { IMAGE_SIZES, type ImageSizesPreset } from '../../lib/image-sizes';
import { MediaRenderer } from './media-renderer';

type MediaPanelProps = {
  media: HomeMediaItem;
  className?: string;
  showLabel?: boolean;
  /** 실사 노출 톤(오버레이 강도) — 네트워크 priority 와 무관 */
  photoPriority?: boolean;
  /** LCP용 — 페이지 Hero 1장만 true 권장 */
  priority?: boolean;
  sizes?: string | ImageSizesPreset;
};

function resolveSizes(sizes?: string | ImageSizesPreset): string {
  if (!sizes) return IMAGE_SIZES.card3;
  if (sizes in IMAGE_SIZES) return IMAGE_SIZES[sizes as ImageSizesPreset];
  return sizes;
}

export function MediaPanel({
  media,
  className = 'aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200/90',
  showLabel = false,
  photoPriority = false,
  priority = false,
  sizes = 'card3',
}: MediaPanelProps) {
  return (
    <div className={`relative bg-slate-200 ${className}`} role="img" aria-label={media.alt}>
      <MediaRenderer
        media={media}
        intensity={photoPriority ? 'photo' : 'soft'}
        showLabel={showLabel}
        className="absolute inset-0 h-full w-full"
        sizes={resolveSizes(sizes)}
        priority={priority}
      />
    </div>
  );
}
