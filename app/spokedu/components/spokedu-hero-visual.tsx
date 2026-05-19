'use client';

import type { ReactNode } from 'react';
import type { SpokeduImageDef } from '../data/images';
import { SpokeduImage } from './spokedu-image';

type SpokeduHeroVisualProps = {
  image: SpokeduImageDef;
  badge?: ReactNode;
  className?: string;
};

export function SpokeduHeroVisual({
  image,
  badge,
  className = 'relative h-[240px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 sm:h-[360px]',
}: SpokeduHeroVisualProps) {
  return (
    <div className={className}>
      <SpokeduImage asset={image} alt={image.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" priority />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-900/10 to-transparent" />
      {badge ? (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
          {badge}
        </div>
      ) : null}
    </div>
  );
}
