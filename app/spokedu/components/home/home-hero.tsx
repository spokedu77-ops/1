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
  koreanText,
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
            <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="방문 목적별 바로가기">
              <span className={`mr-1 text-sm font-semibold text-slate-500 ${koreanText}`}>바로 찾기</span>
              {homePage.hero.quickLinks.map((link) => (
                <TrackedLink
                  key={link.label}
                  href={link.href}
                  trackLabel={link.trackLabel}
                  className={`rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#1D4ED8]/40 hover:text-[#1D4ED8] ${homeFocusRing}`}
                >
                  {link.label}
                </TrackedLink>
              ))}
            </div>
          </div>

          <div className={`order-2 min-w-0 ${homeHeroImage} relative`}>
            <MediaPanel
              media={media}
              className={`aspect-[3/2] w-full border-0 rounded-none ${homePhotoGrade}`}
              sizes="heroEditorialMain"
              photoPriority
              priority
              objectFit="cover"
            />
            <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/35 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur sm:inset-x-5 sm:bottom-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">
                {homePage.hero.mediaCaption.label}
              </p>
              <p className={`mt-1 text-sm font-bold text-[#0B1220] sm:text-base ${koreanText}`}>
                {homePage.hero.mediaCaption.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
