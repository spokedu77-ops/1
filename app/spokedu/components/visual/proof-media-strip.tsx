'use client';

import { useReducedMotion } from 'framer-motion';
import type { HomeMediaItem } from '../../data/home-media';
import { ProofMediaCard } from './proof-media-card';

type ProofMediaStripProps = {
  items: readonly HomeMediaItem[];
};

export function ProofMediaStrip({ items }: ProofMediaStripProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-3 sm:py-4">
      <ul
        className={`flex list-none gap-3 px-3 sm:gap-3.5 sm:px-4 ${reducedMotion ? 'overflow-x-auto pb-1' : 'proof-strip-track min-w-max'}`}
        aria-label="운영 현장"
      >
        {items.map((media) => (
          <li key={media.id}>
            <ProofMediaCard media={media} />
          </li>
        ))}
      </ul>
      {!reducedMotion ? (
        <style jsx>{`
          @keyframes proof-strip-drift {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-12px);
            }
          }
          .proof-strip-track {
            animation: proof-strip-drift 6s ease-in-out infinite alternate;
          }
        `}</style>
      ) : null}
    </div>
  );
}
