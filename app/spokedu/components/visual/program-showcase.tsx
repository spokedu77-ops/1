'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_SIGNATURE_PROGRAMS, type HomeSignatureProgram } from '../../data/home-media';
import { ProgramShowcaseCard } from './program-showcase-card';

const featuredProgram = HOME_SIGNATURE_PROGRAMS.find((p) => p.featured) as HomeSignatureProgram;
const compactPrograms = HOME_SIGNATURE_PROGRAMS.filter((p) => !p.featured);

export function ProgramShowcase() {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-smooth [scrollbar-width:thin] lg:hidden"
        role="list"
        aria-label="시그니처 프로그램"
      >
        <motion.div
          role="listitem"
          initial={reducedMotion ? false : { opacity: 0, x: 24 }}
          whileInView={reducedMotion ? {} : { opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-[min(88vw,320px)] shrink-0 snap-start"
        >
          <ProgramShowcaseCard program={featuredProgram} variant="featured" className="min-h-[300px]" />
        </motion.div>
        {compactPrograms.map((program, index) => (
          <motion.div
            key={program.id}
            role="listitem"
            initial={reducedMotion ? false : { opacity: 0, x: 20 }}
            whileInView={reducedMotion ? {} : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 * (index + 1) }}
            className="w-[min(76vw,260px)] shrink-0 snap-start"
          >
            <ProgramShowcaseCard program={program} variant="compact" className="min-h-[248px]" />
          </motion.div>
        ))}
      </div>

      <motion.div
        className="hidden gap-3 lg:grid lg:grid-cols-5"
        role="list"
        aria-label="시그니처 프로그램"
      >
        <motion.div
          role="listitem"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="lg:col-span-2"
        >
          <ProgramShowcaseCard program={featuredProgram} variant="featured" className="h-full min-h-[420px]" />
        </motion.div>
        <div className="grid grid-cols-2 gap-2.5 lg:col-span-3 lg:gap-3" role="presentation">
          {compactPrograms.map((program, index) => (
            <motion.div
              key={program.id}
              role="listitem"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 * index }}
            >
              <ProgramShowcaseCard program={program} variant="compact" className="h-full min-h-[200px]" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
