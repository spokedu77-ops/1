'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  homeSectionScrollMt,
  koreanText,
  marketingMetricDisplay,
  marketingSectionInner,
} from '../../lib/ui-classes';

/** Hero 직후 신뢰 스트립 — soft-blue 밴드, 숫자로 한눈에 신뢰 신호 */
export function HomeTrustStrip() {
  const { id, eyebrow, items } = homePage.trustStrip;
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={`${homeSectionScrollMt} ${homeBandSoftBlue}`}
      aria-label="스포키듀 운영 지표"
    >
      <div className={marketingSectionInner}>
        <motion.div
          className="flex flex-col gap-6 py-9 sm:py-11 lg:flex-row lg:items-baseline lg:justify-between lg:gap-12"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4 }}
        >
          <p
            className="shrink-0 text-[12px] font-bold uppercase tracking-[0.14em]"
            style={{ color: brandBlue }}
          >
            {eyebrow}
          </p>
          <ul className="grid min-w-0 flex-1 grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {items.map((item) => (
              <li key={item.label} className="min-w-0">
                <p
                  className={`${marketingMetricDisplay} !text-[1.85rem] sm:!text-[2.1rem] ${koreanText}`}
                  style={{ color: brandInk }}
                >
                  {item.value}
                </p>
                <p className={`mt-2.5 text-[13px] leading-snug text-[#6D7B90] ${koreanText}`}>
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
