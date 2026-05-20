'use client';

import { HOME_MEDIA } from '../../data/home-media';
import type { RecordsProofSummaryItem } from '../../data/records-page';
import { MediaPanel } from './media-panel';

type ProofSummaryWallProps = {
  items: readonly RecordsProofSummaryItem[];
};

export function ProofSummaryWall({ items }: ProofSummaryWallProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]"
        >
          <MediaPanel
            media={HOME_MEDIA[item.mediaKey]}
            className="aspect-[4/3] rounded-none border-0 border-b border-slate-200/80"
          />
          <p className="px-2.5 py-2 text-[11px] font-semibold leading-4 text-slate-800 sm:px-3 sm:py-2.5 sm:text-xs sm:leading-5">
            {item.label}
          </p>
        </article>
      ))}
    </div>
  );
}
