'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { HomeMediaItem } from '../../data/home-media';

type GradientVisualProps = {
  media: HomeMediaItem;
  className?: string;
  showLabel?: boolean;
  intensity?: 'soft' | 'bold' | 'photo';
};

export function GradientVisual({ media, className = '', showLabel = false, intensity = 'bold' }: GradientVisualProps) {
  const reducedMotion = useReducedMotion();
  const soft = intensity === 'soft';

  return (
    <motion.div
      className={`relative h-full w-full overflow-hidden bg-slate-900 ${className}`}
      aria-hidden={!showLabel}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${media.fallbackGradient}`} />
      <motion.div
        className={`pointer-events-none absolute inset-0 ${soft ? 'opacity-[0.06]' : 'opacity-[0.1]'}`}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: soft ? '28px 28px' : '40px 40px',
        }}
      />
      <motion.div
        className={`pointer-events-none absolute -right-8 -top-8 rounded-full blur-3xl ${soft ? 'h-24 w-24 bg-white/25' : 'h-40 w-40 bg-white/20'}`}
        animate={reducedMotion ? {} : { scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={reducedMotion ? {} : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`pointer-events-none absolute -bottom-10 -left-6 rounded-full blur-3xl ${soft ? 'h-20 w-20 bg-lime-300/30' : 'h-32 w-32 bg-lime-300/25'}`}
        animate={reducedMotion ? {} : { scale: [1, 1.12, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={reducedMotion ? {} : { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />
      <motion.div
        className={`pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 rounded-full border border-white/20 ${soft ? 'h-14 w-14' : 'h-20 w-20'}`}
        animate={reducedMotion ? {} : { y: [-6, 6, -6], rotate: [0, 6, 0] }}
        transition={reducedMotion ? {} : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`pointer-events-none absolute bottom-[18%] right-[14%] rounded-2xl bg-white/10 backdrop-blur-sm ${soft ? 'h-8 w-14' : 'h-10 w-16'}`}
        animate={reducedMotion ? {} : { y: [4, -4, 4] }}
        transition={reducedMotion ? {} : { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-900/10 to-transparent" />
      {showLabel && media.label ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {media.label}
        </div>
      ) : null}
    </motion.div>
  );
}
