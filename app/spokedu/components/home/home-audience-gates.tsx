'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  homeFocusRing,
  homeGateCard,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

/** 경로 선택 — soft-blue 밴드 위 세련된 게이트 카드 */
export function HomeAudienceGates() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.audienceGate.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} ${homeBandSoftBlue}`}
    >
      <div className={siteContainer}>
        <motion.div
          className="max-w-2xl"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
        >
          <p
            className="text-[12px] font-bold uppercase tracking-[0.14em]"
            style={{ color: brandBlue }}
          >
            어디로 갈까요
          </p>
          <h2 className={`${homeSectionH2} mt-3`}>{homePage.audienceGate.title}</h2>
          <p className={`mt-3 max-w-xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {homePage.audienceGate.lead}
          </p>
        </motion.div>

        <ul className="mt-8 grid grid-cols-1 gap-4 min-[900px]:mt-10 min-[900px]:grid-cols-3 min-[900px]:gap-5">
          {homePage.audienceGate.items.map((item, index) => {
            const media = HOME_MEDIA[item.mediaKey];
            return (
              <motion.li
                key={item.id}
                className="min-w-0"
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
              >
                <TrackedLink
                  href={item.href}
                  trackLabel={item.trackLabel}
                  className={`${homeGateCard} ${homeFocusRing} block h-full`}
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <MediaPanel
                      media={media}
                      className={`absolute inset-0 h-full w-full border-0 rounded-none transition duration-500 ${homePhotoGrade} [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04]`}
                      sizes="gateCard"
                      photoPriority={index === 0}
                      objectFit="cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                    <p
                      className="text-[12px] font-bold tracking-[0.08em]"
                      style={{ color: brandBlue }}
                    >
                      {item.badge}
                    </p>
                    <h3
                      className={`mt-1.5 text-lg font-bold tracking-[-0.02em] sm:text-xl ${koreanText}`}
                      style={{ color: brandInk }}
                    >
                      {item.title}
                    </h3>
                    <p className={`mt-2 line-clamp-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                      {item.description}
                    </p>
                    <ul className="mt-3.5 flex flex-wrap gap-1.5" aria-label="포함 내용">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-full border border-[#D6E3FF] bg-[#EAF1FF] px-2.5 py-1 text-[11px] font-semibold text-[#2C446D]"
                        >
                          {bullet}
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
            );
          })}
        </ul>
      </div>
    </section>
  );
}
