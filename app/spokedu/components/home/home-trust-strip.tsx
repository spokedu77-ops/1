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
      className={`${homeSectionScrollMt} border-b border-slate-200/80 bg-white`}
      aria-label="스포키듀 운영 지표"
    >
      <div className={siteContainer}>
        <motion.div
          className="flex flex-col gap-5 py-7 sm:py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-9"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4 }}
        >
          <p className="shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">
            {eyebrow}
          </p>
          <ul className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 sm:gap-x-8">
            {items.map((item) => (
              <li key={item.label} className="min-w-0">
                <p className={`text-[1.65rem] font-black leading-none tracking-tight text-[#0B1220] sm:text-[1.85rem] ${koreanText}`}>
                  {item.value}
                </p>
                <p className={`mt-1.5 text-[12px] font-semibold leading-snug text-slate-500 sm:text-[13px] ${koreanText}`}>
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
