'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  brandFocusRing,
  homeHeroFullBleed,
  homeHeroFullBleedCopy,
  homeHeroFullBleedLead,
  homeHeroFullBleedScrim,
  marketingHeroDisplay,
  homePhotoGrade,
  homeSectionScrollMt,
  koreanText,
  marketingButtonPrimaryOnDark,
  marketingButtonSecondaryOnDark,
  marketingSectionInner,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';
import styles from './home-canonical.module.css';

/** 히어로: 브랜드 정의 · CTA 2개 · 사례 텍스트 링크 */
export function HomeHero() {
  const media = HOME_MEDIA[homePage.hero.mediaKey];
  const [line1, line2] = homePage.hero.lines;
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.hero.id}
      className={`${homeHeroFullBleed} w-full ${homeSectionScrollMt}`}
      aria-labelledby="home-hero-heading"
    >
      <div className="absolute inset-0">
        <MediaPanel
          media={media}
          className={`absolute inset-0 h-full w-full scale-[1.03] border-0 rounded-none ${homePhotoGrade}`}
          sizes="full"
          photoPriority
          priority
          objectFit="cover"
        />
      </div>
      <div className={homeHeroFullBleedScrim} aria-hidden />

      <div className={homeHeroFullBleedCopy}>
        <div className={marketingSectionInner}>
          <motion.div
            className="flex max-w-[52rem] flex-col"
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className={`text-[12px] font-bold uppercase tracking-[0.18em] text-[#9FC0FF] sm:text-[13px] ${koreanText}`}>
              {homePage.hero.brand}
            </p>

            <h1 id="home-hero-heading" className={`${marketingHeroDisplay} ${styles.heroTitle} mt-4 text-white sm:mt-5`}>
              <span className="block">{line1}</span>
              <span className="mt-1.5 block text-[#AFC8FF]">{line2}</span>
            </h1>

            <p className={`${homeHeroFullBleedLead} mt-6 max-w-[39rem] sm:text-lg sm:leading-[1.75]`}>{homePage.hero.support}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <TrackedLink
                href={homePage.hero.primaryCta.href}
                trackLabel={homePage.hero.primaryCta.trackLabel}
                className={marketingButtonPrimaryOnDark}
              >
                {homePage.hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.hero.secondaryCta.href}
                trackLabel={homePage.hero.secondaryCta.trackLabel}
                className={marketingButtonSecondaryOnDark}
              >
                {homePage.hero.secondaryCta.label}
              </TrackedLink>
            </div>

            <TrackedLink
              href={homePage.hero.recordsLink.href}
              trackLabel={homePage.hero.recordsLink.trackLabel}
              className={`mt-4 inline-flex w-fit text-[14px] font-semibold text-[#C5D8FF] underline-offset-4 hover:text-white hover:underline ${brandFocusRing} ${koreanText}`}
            >
              {homePage.hero.recordsLink.label}
            </TrackedLink>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
