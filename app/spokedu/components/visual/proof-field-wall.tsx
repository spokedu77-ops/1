'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { HomeProofField } from '../../data/home-media';
import { ProofFieldCard } from './proof-field-card';

type ProofFieldWallProps = {
  fields: readonly HomeProofField[];
};

export function ProofFieldWall({ fields }: ProofFieldWallProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-smooth [scrollbar-width:thin] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 lg:gap-3.5"
      role="list"
      aria-label="운영 현장"
    >
      {fields.map((field, index) => (
        <motion.div
          key={field.id}
          role="listitem"
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.07 * index }}
          className="w-[min(84vw,280px)] shrink-0 snap-start sm:w-auto"
        >
          <ProofFieldCard field={field} className="h-full min-h-[248px] sm:min-h-[260px]" />
        </motion.div>
      ))}
    </div>
  );
}
