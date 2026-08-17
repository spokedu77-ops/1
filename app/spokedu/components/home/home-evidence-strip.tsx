'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  homeSectionScrollMt,
  koreanText,
  marketingSectionInner,
} from '../../lib/ui-classes';

/** 검증 가능한 증거 스트립 — 미검증 수치·카운트업 없음 */
export function HomeEvidenceStrip() {
  const { id, eyebrow, items } = homePage.evidenceStrip;
  const reducedMotion = useReducedMotion();

  return (
    <section id={id} className={`${homeSectionScrollMt} ${homeBandSoftBlue}`} aria-label="스포키듀 확인 가능한 기준">
      <div className={marketingSectionInner}>
        <motion.div
          className="flex flex-col gap-6 py-9 sm:py-11 lg:flex-row lg:items-baseline lg:justify-between lg:gap-12"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4 }}
        >
          <p className="shrink-0 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>
            {eyebrow}
          </p>
          <ul className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-6 min-[480px]:grid-cols-2 sm:grid-cols-4">
            {items.map((item) => (
              <li key={item.label} className="min-w-0">
                <p
                  className={`text-[1.05rem] font-black leading-snug tracking-[-0.02em] sm:text-[1.15rem] ${koreanText}`}
                  style={{ color: brandInk }}
                >
                  {item.value}
                </p>
                <p className={`mt-2 text-[13px] leading-snug text-[#6D7B90] ${koreanText}`}>{item.label}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
