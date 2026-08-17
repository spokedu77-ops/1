'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  brandFocusRing,
  homePathNavItem,
  marketingSectionDisplay,
  marketingSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  marketingSectionInner,
} from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

/** 방문자 4경로 — compact 경로 선택 (이미지 카드 반복 방지) */
export function HomeAudienceGates() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.audienceGate.id}
      className={`${homeSectionScrollMt} ${marketingSectionPadCompact} ${homeBandSoftBlue}`}
    >
      <div className={marketingSectionInner}>
        <motion.div
          className="max-w-2xl"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>
            경로 선택
          </p>
          <h2 className={`${marketingSectionDisplay} mt-3`}>{homePage.audienceGate.title}</h2>
          <p className={`mt-3 max-w-xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {homePage.audienceGate.lead}
          </p>
        </motion.div>

        <ul className="mt-6 grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 xl:mt-7 xl:grid-cols-4 xl:gap-3.5">
          {homePage.audienceGate.items.map((item, index) => (
            <motion.li
              key={item.id}
              className="min-w-0"
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
            >
              <TrackedLink
                href={item.href}
                trackLabel={item.trackLabel}
                className={`${homePathNavItem} ${brandFocusRing} block h-full`}
              >
                <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                  {item.badge}
                </p>
                <h3
                  className={`mt-1 text-[1.05rem] font-bold tracking-[-0.02em] ${koreanText}`}
                  style={{ color: brandInk }}
                >
                  {item.title}
                </h3>
                <p className={`mt-1.5 line-clamp-2 text-[13px] leading-snug text-[#536279] ${koreanText}`}>
                  {item.description}
                </p>
                <ul className="mt-2.5 flex flex-wrap gap-1" aria-label="포함 내용">
                  {item.bullets.slice(0, 3).map((bullet) => (
                    <li
                      key={bullet}
                      className="rounded-full bg-[#EAF1FF] px-2 py-0.5 text-[10px] font-semibold text-[#2C446D]"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
                <span
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold"
                  style={{ color: brandBlue }}
                >
                  {item.ctaLabel}
                  <HomeChevron />
                </span>
              </TrackedLink>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
