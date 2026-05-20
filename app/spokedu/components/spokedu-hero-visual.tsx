'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { SpokeduImageDef } from '../data/images';
import { SpokeduImage } from './spokedu-image';

type SpokeduHeroVisualProps = {
  image: SpokeduImageDef;
  badge?: ReactNode;
  className?: string;
  tone?: 'warm' | 'cool' | 'neutral';
};

const toneOverlay = {
  warm: 'from-violet-950/55 via-indigo-900/20 to-amber-500/10',
  cool: 'from-slate-950/60 via-cyan-900/25 to-sky-500/10',
  neutral: 'from-slate-950/55 via-slate-900/15 to-indigo-500/10',
} as const;

export function SpokeduHeroVisual({
  image,
  badge,
  className = 'relative h-[min(52vw,240px)] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-xl shadow-indigo-900/15 sm:h-[360px]',
  tone = 'neutral',
}: SpokeduHeroVisualProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`${className} ring-1 ring-indigo-200/50`}
      animate={reducedMotion ? {} : { y: [-5, 5, -5] }}
      transition={reducedMotion ? {} : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="pointer-events-none absolute -inset-px z-0 rounded-[inherit] bg-gradient-to-br from-indigo-400/30 to-lime-300/20 opacity-70 blur-md" aria-hidden />
      <motion.div
        className="absolute inset-0 z-[1]"
        animate={reducedMotion ? {} : { scale: [1, 1.05, 1] }}
        transition={reducedMotion ? {} : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      >
        <SpokeduImage asset={image} alt={image.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" priority />
      </motion.div>
      <div className={`pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t ${toneOverlay[tone]}`} aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br from-indigo-500/15 via-transparent to-lime-400/10" aria-hidden />
      {badge ? (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
          {badge}
        </div>
      ) : null}
    </motion.div>
  );
}
