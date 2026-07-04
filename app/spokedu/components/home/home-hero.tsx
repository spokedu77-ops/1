'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeFocusRing,
  homeHeroH1,
  homeHeroImage,
  homeHeroLead,
  homeHeroSection,
  homePhotoGrade,
  homeSectionScrollMt,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeHero() {
  const media = HOME_MEDIA[homePage.hero.mediaKey];
  const [line1, line2] = homePage.hero.lines;

  return (
    <section id={homePage.hero.id} className={`${homeHeroSection} ${homeSectionScrollMt}`} aria-labelledby="home-hero-heading">
      <div className={siteContainer}>
        <div className="grid items-center gap-8 min-[1100px]:grid-cols-[minmax(0,0.52fr)_minmax(0,0.48fr)] min-[1100px]:gap-8 xl:gap-10">
          <div className="order-1 min-w-0 min-[1100px]:max-w-[34rem]">
            <h1 id="home-hero-heading" className={homeHeroH1}>
              {line1}
              <br />
              {line2}
            </h1>
            <p className={homeHeroLead}>{homePage.hero.support}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedLink
                href={homePage.hero.primaryCta.href}
                trackLabel={homePage.hero.primaryCta.trackLabel}
                className={`${siteBtnPrimary} ${homeFocusRing}`}
              >
                {homePage.hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.hero.secondaryCta.href}
                trackLabel={homePage.hero.secondaryCta.trackLabel}
                className={`${siteBtnSecondary} ${homeFocusRing}`}
              >
                {homePage.hero.secondaryCta.label}
              </TrackedLink>
            </div>
          </div>

          <div className={`order-2 min-w-0 ${homeHeroImage}`}>
            <MediaPanel
              media={media}
              className={`aspect-[3/2] w-full border-0 rounded-none ${homePhotoGrade}`}
              sizes="heroEditorialMain"
              photoPriority
              priority
              objectFit="cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
