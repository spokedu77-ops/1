'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { HomeMediaKey } from '../../data/home-media';
import { HOME_MEDIA } from '../../data/home-media';
import { landingCardShell, type LandingCardVariant } from './card-variants';
import { MediaPanel } from './media-panel';

/** 레거시 ProofSummaryWall — records-page proofSummary 제거 후 컴포넌트 전용 타입 */
export type RecordsProofSummaryItem = {
  label: string;
  mediaKey: HomeMediaKey;
  cardVariant?: LandingCardVariant;
};

type ProofSummaryWallProps = {
  items: readonly RecordsProofSummaryItem[];
};

export function ProofSummaryWall({ items }: ProofSummaryWallProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4">
      {items.map((item, index) => {
        const variant: LandingCardVariant = item.cardVariant ?? 'image';
        return (
          <motion.article
            key={item.label}
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 * index }}
            className={`overflow-hidden rounded-xl ${landingCardShell(variant)}`}
          >
            <MediaPanel
              media={HOME_MEDIA[item.mediaKey]}
              className="aspect-[4/3] rounded-none border-0 border-b border-slate-200/80"
              sizes="card4"
            />
            <p
              className={`px-2.5 py-2 text-[11px] font-semibold leading-4 sm:px-3 sm:py-2.5 sm:text-xs sm:leading-5 ${variant === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
            >
              {item.label}
            </p>
          </motion.article>
        );
      })}
    </div>
  );
}
