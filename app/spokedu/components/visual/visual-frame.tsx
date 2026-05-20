'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { HomeMediaItem } from '../../data/home-media';
import { MediaRenderer } from './media-renderer';

type VisualFrameProps = {
  media: HomeMediaItem;
  className?: string;
  float?: boolean;
  showLabel?: boolean;
  priority?: boolean;
  heroZoom?: boolean;
};

export function VisualFrame({
  media,
  className = 'relative h-full min-h-[200px] w-full overflow-hidden rounded-3xl border border-slate-200/80 shadow-lg shadow-indigo-950/10',
  float = false,
  showLabel = true,
  priority = false,
  heroZoom = false,
}: VisualFrameProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`${className} ring-1 ring-indigo-200/40`}
      animate={float && !reducedMotion ? { y: [-6, 6, -6] } : {}}
      transition={float && !reducedMotion ? { duration: 7, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      <div className="pointer-events-none absolute -inset-px z-0 rounded-[inherit] bg-gradient-to-br from-indigo-400/25 via-transparent to-lime-300/20 opacity-80 blur-sm" aria-hidden />
      <MediaRenderer
        media={media}
        showLabel={showLabel}
        priority={priority}
        animateZoom={heroZoom}
        className="absolute inset-0 z-[1]"
        sizes="(max-width: 1024px) 100vw, 55vw"
      />
    </motion.div>
  );
}
