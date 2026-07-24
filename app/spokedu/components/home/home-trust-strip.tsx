'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  homeSectionScrollMt,
  koreanText,
  siteContainer,
} from '../../lib/ui-classes';

/** Hero 직후 신뢰 스트립 — 숫자로 한눈에 신뢰 신호 */
export function HomeTrustStrip() {
  const { id, eyebrow, items } = homePage.trustStrip;
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={`${homeSectionScrollMt} border-b border-slate-200/70 bg-[#F3F7FC]`}
      aria-label="스포키듀 운영 지표"
    >
      <div className={siteContainer}>
        <motion.div
          className="flex flex-col gap-6 py-8 sm:py-10 lg:flex-row lg:items-baseline lg:justify-between lg:gap-12"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4 }}
        >
          <p className="shrink-0 text-[13px] font-semibold tracking-[0.18em] text-[#1D4ED8]">
            {eyebrow}
          </p>
          <ul className="grid min-w-0 flex-1 grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {items.map((item) => (
              <li key={item.label} className="min-w-0">
                <p className={`text-[1.75rem] font-bold leading-none tracking-tight text-[#0B1220] sm:text-[2rem] ${koreanText}`}>
                  {item.value}
                </p>
                <p className={`mt-2 text-[13px] leading-snug text-slate-500 ${koreanText}`}>
                  {item.label}
                </p>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
