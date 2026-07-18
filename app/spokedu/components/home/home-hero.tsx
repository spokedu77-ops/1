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

const PAD_ACCENTS = ['#EF4444', '#EAB308', '#22C55E', '#3B82F6'] as const;

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
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#1D4ED8]/25 to-transparent"
        aria-hidden
      />

      <div className={homeHeroFullBleedCopy}>
        <div className={siteContainer}>
          <motion.div
            className="max-w-[42rem]"
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex gap-1.5" aria-hidden>
              {PAD_ACCENTS.map((hex) => (
                <span key={hex} className="h-1 w-8 rounded-full sm:w-10" style={{ backgroundColor: hex }} />
              ))}
            </div>
            <p className={homeHeroBrand}>SPOKEDU</p>
            <h1 id="home-hero-heading" className={`${homeHeroFullBleedTitle} mt-3 sm:mt-4`}>
              <span className={homeHeroH1Line}>{line1}</span>
              <span className={`${homeHeroH1Line} mt-1 text-sky-200`}>{line2}</span>
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
