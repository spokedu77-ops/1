'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  homeBody,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteContainer,
} from '../../lib/ui-classes';

/** “왜 SPOKEDU인가” — 나열 카드 대신 번호·프로세스 중심 */
export function HomeProofStrip() {
  const { title, lead, items, processLabel, processLine } = homePage.proofStrip;
  const processSteps = processLine.split(/\s*→\s*/).filter(Boolean);
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.proofStrip.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-[#0B1220] text-white`}
      aria-labelledby="home-proof-heading"
    >
      <div className={siteContainer}>
        <motion.div
          className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:gap-14"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">왜 스포키듀인가</p>
            <h2 id="home-proof-heading" className={`${homeSectionH2} mt-3 text-white`}>
              {title}
            </h2>
            <p className={`${homeBody} mt-4 text-white/70`}>{lead}</p>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item, index) => (
              <li
                key={item}
                className={`rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-semibold leading-snug text-white/90 sm:px-5 sm:text-[15px] ${koreanText}`}
              >
                <span className="mb-2 block text-[11px] font-bold tracking-[0.16em] text-sky-300/80">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">{processLabel}</p>
          <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-3">
            {processSteps.map((step, index) => (
              <li key={step} className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-[#0B1220] ${koreanText}`}
                >
                  {step}
                </span>
                {index < processSteps.length - 1 ? (
                  <span className="hidden text-white/30 sm:inline" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
