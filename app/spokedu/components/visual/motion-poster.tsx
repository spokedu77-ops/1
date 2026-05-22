'use client';

import type { HomeMediaItem } from '../../data/home-media';
import { IMAGE_SIZES, type ImageSizesPreset } from '../../lib/image-sizes';
import { VisualFrame } from './visual-frame';

type MotionPosterProps = {
  media: HomeMediaItem;
  variant?: 'hero' | 'compact' | 'cinematic';
  className?: string;
  /** 해당 페이지 첫 Hero 1장만 true */
  priority?: boolean;
  sizes?: string | ImageSizesPreset;
};

const variantClass: Record<NonNullable<MotionPosterProps['variant']>, string> = {
  cinematic:
    'relative h-[min(58vw,260px)] w-full overflow-hidden rounded-[1.25rem] border border-slate-300/70 shadow-lg shadow-indigo-950/15 sm:h-[min(48vw,300px)] sm:rounded-[1.75rem] sm:shadow-2xl lg:h-[min(68vh,600px)] lg:rounded-[2rem]',
  hero: 'relative h-[min(52vw,240px)] w-full overflow-hidden rounded-2xl border border-slate-200/90 shadow-xl shadow-indigo-900/20 sm:h-[280px] sm:rounded-3xl lg:h-[380px]',
  compact: 'relative h-[min(48vw,220px)] w-full overflow-hidden rounded-2xl border border-slate-200/90 shadow-lg shadow-indigo-900/15 sm:h-[240px]',
};

export function MotionPoster({
  media,
  variant = 'hero',
  className,
  priority = false,
  sizes = 'heroSplit',
}: MotionPosterProps) {
  const cinematic = variant === 'cinematic';
  const resolvedSizes =
    sizes in IMAGE_SIZES ? IMAGE_SIZES[sizes as ImageSizesPreset] : (sizes as string);

  return (
    <VisualFrame
      media={media}
      className={[variantClass[variant], className].filter(Boolean).join(' ')}
      float={!cinematic}
      heroZoom={!cinematic}
      showLabel={!cinematic}
      photoTone={cinematic ? 'clear' : 'soft'}
      priority={priority}
      sizes={resolvedSizes}
    />
  );
}
