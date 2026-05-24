'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { HomeMediaItem } from '../data/home-media';
import { MediaPanel } from './visual';

type HomeHeroEditorialProps = {
  main: HomeMediaItem;
  thumbA: HomeMediaItem;
  thumbB: HomeMediaItem;
};

/** Hero — 대표 1컷 + 하단 보조 2컷 (콜라주 3분할 대신 단일 비주얼 언어) */
export function HomeHeroEditorial({ main, thumbA, thumbB }: HomeHeroEditorialProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="flex flex-col gap-2 sm:gap-2.5"
      aria-label="스포키듀 수업 현장"
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="relative aspect-[4/5] min-h-[280px] w-full overflow-hidden rounded-[1.5rem] ring-1 ring-slate-900/10 sm:min-h-[320px] sm:rounded-[1.75rem] lg:aspect-[5/6] lg:max-h-[min(72vh,640px)] lg:rounded-[2rem]">
        <MediaPanel
          media={main}
          className="absolute inset-0 h-full w-full rounded-none border-0"
          sizes="heroEditorialMain"
          photoPriority
          priority
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        <div className="relative aspect-[16/10] min-h-[88px] overflow-hidden rounded-xl ring-1 ring-slate-900/10 sm:rounded-2xl lg:min-h-[100px]">
          <MediaPanel
            media={thumbA}
            className="absolute inset-0 h-full w-full rounded-none border-0"
            sizes="heroEditorialThumb"
          />
        </div>
        <div className="relative aspect-[16/10] min-h-[88px] overflow-hidden rounded-xl ring-1 ring-slate-900/10 sm:rounded-2xl lg:min-h-[100px]">
          <MediaPanel
            media={thumbB}
            className="absolute inset-0 h-full w-full rounded-none border-0"
            sizes="heroEditorialThumb"
          />
        </div>
      </div>
    </motion.div>
  );
}
