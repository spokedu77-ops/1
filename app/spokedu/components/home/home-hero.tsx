'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeFocusRing,
  homeHeroH1,
  homeHeroH1Line,
  homeHeroImage,
  homeHeroLead,
  homeHeroSection,
  homePhotoGrade,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { HomeProofStrip } from './home-proof-strip';
import { TrackedLink } from './tracked-link';

export function HomeHero() {
  const media = HOME_MEDIA[homePage.hero.mediaKey];

  return (
    <section id={homePage.hero.id} className={homeHeroSection}>
      <div className={siteContainer}>
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,0.5fr)] lg:gap-10 xl:gap-12">
          <div className="order-1 min-w-0">
            <h1 className={homeHeroH1}>
              <span className={`${homeHeroH1Line} lg:whitespace-nowrap`}>{homePage.hero.lines[0]}</span>
              <span className={homeHeroH1Line}>{homePage.hero.lines[1]}</span>
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

      <HomeProofStrip />
    </section>
  );
}
