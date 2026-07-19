'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeFocusRing,
  homeHeroFullBleed,
  homeHeroFullBleedCopy,
  homeHeroFullBleedLead,
  homeHeroFullBleedScrim,
  homeHeroFullBleedTitle,
  homeHeroH1Line,
  homePhotoGrade,
  homeSectionScrollMt,
  siteBtnPrimaryOnHero,
  siteBtnSecondaryOnHero,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

/**
 * 히어로: 헤드라인 · 설명 · CTA
 */
export function HomeHero() {
  const media = HOME_MEDIA[homePage.hero.mediaKey];
  const [line1, line2] = homePage.hero.lines;
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.hero.id}
      className={`${homeHeroFullBleed} ${homeSectionScrollMt}`}
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
        <div className={siteContainer}>
          <motion.div
            className="flex max-w-[36rem] flex-col"
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 id="home-hero-heading" className={homeHeroFullBleedTitle}>
              <span className={`${homeHeroH1Line} block`}>{line1}</span>
              <span className={`${homeHeroH1Line} mt-1 block`}>{line2}</span>
            </h1>

            <p className={`${homeHeroFullBleedLead} mt-4 max-w-[28rem]`}>{homePage.hero.support}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <TrackedLink
                href={homePage.hero.primaryCta.href}
                trackLabel={homePage.hero.primaryCta.trackLabel}
                className={`${siteBtnPrimaryOnHero} h-12 min-h-12 whitespace-nowrap px-6 ${homeFocusRing}`}
              >
                {homePage.hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.hero.secondaryCta.href}
                trackLabel={homePage.hero.secondaryCta.trackLabel}
                className={`${siteBtnSecondaryOnHero} h-12 min-h-12 whitespace-nowrap px-6 ${homeFocusRing}`}
              >
                {homePage.hero.secondaryCta.label}
              </TrackedLink>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
