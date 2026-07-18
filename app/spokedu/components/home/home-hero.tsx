'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeFocusRing,
  homeHeroBrand,
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
          className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
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
            className="max-w-[40rem]"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className={homeHeroBrand}>SPOKEDU</p>
            <h1 id="home-hero-heading" className={`${homeHeroFullBleedTitle} mt-3 sm:mt-4`}>
              <span className={homeHeroH1Line}>{line1}</span>
              <span className={`${homeHeroH1Line} mt-1`}>{line2}</span>
            </h1>
            <p className={homeHeroFullBleedLead}>{homePage.hero.support}</p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:flex-wrap">
              <TrackedLink
                href={homePage.hero.primaryCta.href}
                trackLabel={homePage.hero.primaryCta.trackLabel}
                className={`${siteBtnPrimaryOnHero} w-full sm:w-auto ${homeFocusRing}`}
              >
                {homePage.hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.hero.secondaryCta.href}
                trackLabel={homePage.hero.secondaryCta.trackLabel}
                className={`${siteBtnSecondaryOnHero} w-full sm:w-auto ${homeFocusRing}`}
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
