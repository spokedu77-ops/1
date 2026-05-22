'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { HomeMediaItem } from '../../data/home-media';
import { MediaRenderer } from './media-renderer';

type PhotoTone = 'clear' | 'soft' | 'bold';

type VisualFrameProps = {
  media: HomeMediaItem;
  className?: string;
  float?: boolean;
  showLabel?: boolean;
  priority?: boolean;
  heroZoom?: boolean;
  photoTone?: PhotoTone;
};

function photoToneToIntensity(photoTone: PhotoTone): 'soft' | 'bold' | 'photo' {
  if (photoTone === 'clear') return 'photo';
  return photoTone;
}

export function VisualFrame({
  media,
  className = 'relative h-full min-h-[200px] w-full overflow-hidden rounded-3xl border border-slate-200/80 shadow-lg shadow-indigo-950/10',
  float = false,
  showLabel = true,
  priority = false,
  heroZoom = false,
  photoTone = 'soft',
}: VisualFrameProps) {
  const reducedMotion = useReducedMotion();
  const clearPhoto = photoTone === 'clear';

  return (
    <motion.div
      className={`${className} ${clearPhoto ? 'ring-1 ring-slate-200/90' : 'ring-1 ring-indigo-200/40'}`}
      animate={float && !reducedMotion && !clearPhoto ? { y: [-6, 6, -6] } : {}}
      transition={float && !reducedMotion ? { duration: 7, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      {!clearPhoto ? (
        <div
          className="pointer-events-none absolute -inset-px z-0 rounded-[inherit] bg-gradient-to-br from-indigo-400/25 via-transparent to-lime-300/20 opacity-80 blur-sm"
          aria-hidden
        />
      ) : null}
      <MediaRenderer
        media={media}
        showLabel={showLabel}
        priority={priority}
        intensity={photoToneToIntensity(photoTone)}
        animateZoom={heroZoom && !clearPhoto}
        className="absolute inset-0 z-[1]"
        sizes="(max-width: 1024px) 100vw, 55vw"
      />
    </motion.div>
  );
}
