'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  brandBlue,
  brandInk,
  homeBandWhite,
  homeFocusRing,
  homeGateCard,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteContainer,
} from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

/** 체육교육 · SPOMOVE · 구독시스템 — 역할 구분 + SPOMOVE 관계 */
export function HomePillars() {
  const { id, eyebrow, title, lead, relationLine, items } = homePage.pillars;
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} ${homeBandWhite}`}
      aria-labelledby="home-pillars-heading"
    >
      <div className={siteContainer}>
        <motion.div
          className="max-w-2xl"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>
            {eyebrow}
          </p>
          <h2 id="home-pillars-heading" className={`${homeSectionH2} mt-3`}>
            {title}
          </h2>
          <p className={`mt-3 max-w-xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {lead}
          </p>
        </motion.div>

        <ul className="mt-8 grid grid-cols-1 gap-4 min-[900px]:mt-10 min-[900px]:grid-cols-3 min-[900px]:gap-5">
          {items.map((item, index) => (
            <motion.li
              key={item.id}
              className="min-w-0"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
            >
              <TrackedLink
                href={item.href}
                trackLabel={item.trackLabel}
                className={`${homeGateCard} ${homeFocusRing} block h-full`}
              >
                <div className="flex h-full min-w-0 flex-col px-5 py-5 sm:px-6 sm:py-6">
                  <p className="text-[12px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                    {item.badge}
                  </p>
                  <h3
                    className={`mt-1.5 text-lg font-bold tracking-[-0.02em] sm:text-xl ${koreanText}`}
                    style={{ color: brandInk }}
                  >
                    {item.title}
                  </h3>
                  {'relationNote' in item && item.relationNote ? (
                    <p
                      className={`mt-2 inline-flex w-fit rounded-full border border-[#D6E3FF] bg-[#EAF1FF] px-2.5 py-1 text-[11px] font-semibold text-[#2C446D] ${koreanText}`}
                    >
                      {item.relationNote}
                    </p>
                  ) : null}
                  <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.role}</p>
                  <ul className="mt-3.5 flex flex-wrap gap-1.5" aria-label={`${item.title} 포함`}>
                    {item.examples.map((example) => (
                      <li
                        key={example}
                        className="rounded-full border border-[#DCE3EE] bg-[#F5F7FB] px-2.5 py-1 text-[11px] font-semibold text-[#2C446D]"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                  <span
                    className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[15px] font-semibold"
                    style={{ color: brandBlue }}
                  >
                    {item.ctaLabel}
                    <HomeChevron />
                  </span>
                </div>
              </TrackedLink>
            </motion.li>
          ))}
        </ul>

        <p className={`mt-6 max-w-2xl text-sm leading-relaxed text-[#6D7B90] sm:text-[15px] ${koreanText}`}>
          {relationLine}
        </p>
      </div>
    </section>
  );
}
