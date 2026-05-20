'use client';

import type { HomeMediaItem } from '../../data/home-media';
import { VisualFrame } from './visual-frame';

type MotionPosterProps = {
  media: HomeMediaItem;
  variant?: 'hero' | 'compact';
};

const variantClass: Record<NonNullable<MotionPosterProps['variant']>, string> = {
  hero: 'relative h-[220px] w-full overflow-hidden rounded-2xl border border-slate-200/90 shadow-xl shadow-indigo-900/15 sm:h-[280px] sm:rounded-3xl lg:h-[360px]',
  compact: 'relative h-[200px] w-full overflow-hidden rounded-2xl border border-slate-200/90 shadow-lg sm:h-[220px]',
};

export function MotionPoster({ media, variant = 'hero' }: MotionPosterProps) {
  return <VisualFrame media={media} className={variantClass[variant]} float showLabel priority />;
}
