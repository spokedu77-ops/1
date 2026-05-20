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
};

export function VisualFrame({
  media,
  className = 'relative h-full min-h-[200px] w-full overflow-hidden rounded-3xl border border-slate-200/80 shadow-lg shadow-indigo-950/10',
  float = false,
  showLabel = true,
  priority = false,
}: VisualFrameProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      animate={float && !reducedMotion ? { y: [-5, 5, -5] } : {}}
      transition={float && !reducedMotion ? { duration: 8, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      <MediaRenderer media={media} showLabel={showLabel} priority={priority} className="absolute inset-0" />
    </motion.div>
  );
}
