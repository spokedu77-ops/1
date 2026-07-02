'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  btnPrimaryOnDark,
  homeBodyLeadOnDark,
  homeDarkSection,
  homeFocusRing,
  homeHeroImage,
  homePhotoGrade,
  homeSectionH2OnDark,
  homeSectionPad,
  koreanLineBreak,
  siteBtnSecondaryOnDark,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeSpomoveSpotlight() {
  const media = HOME_MEDIA[homePage.spomove.mediaKey];

  return (
    <section id={homePage.spomove.id} className={`${homeDarkSection} ${homeSectionPad} pb-10 sm:pb-12 lg:pb-14`}>
      <div className={siteContainer}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12 xl:gap-14">
          <div className="min-w-0 lg:max-w-xl">
            <p className="text-sm font-semibold text-[#1D4ED8]">SPOMOVE</p>
            <h2 className={`${homeSectionH2OnDark} mt-3`}>
              <span className="block lg:whitespace-nowrap">{homePage.spomove.title}</span>
              <span className="mt-1 block lg:whitespace-nowrap">{homePage.spomove.titleLine2}</span>
            </h2>
            <p className={homeBodyLeadOnDark}>{homePage.spomove.lead}</p>

            <SpomoveFlow className="mt-8" />

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedLink
                href={homePage.spomove.primaryCta.href}
                trackLabel={homePage.spomove.primaryCta.trackLabel}
                className={`${btnPrimaryOnDark} ${homeFocusRing}`}
              >
                {homePage.spomove.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.spomove.secondaryCta.href}
                trackLabel={homePage.spomove.secondaryCta.trackLabel}
                className={`${siteBtnSecondaryOnDark} ${homeFocusRing}`}
              >
                {homePage.spomove.secondaryCta.label}
              </TrackedLink>
            </div>
          </div>

          <div className={`min-w-0 ${homeHeroImage} border-white/10 bg-slate-800`}>
            <MediaPanel
              media={media}
              className={`aspect-[3/2] w-full border-0 rounded-none ${homePhotoGrade}`}
              sizes="heroEditorialMain"
              photoPriority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SpomoveFlow({ className = '' }: { className?: string }) {
  const steps = homePage.spomove.flowSteps;

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">학습 흐름</p>
      <ol
        className="mt-4 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-white/15 pt-5 sm:grid-cols-4 sm:gap-x-4"
        aria-label="SPOMOVE 학습 흐름"
      >
        {steps.map((step, index) => (
          <li key={step.label} className="min-w-0 border-l border-white/15 pl-4 first:border-l-0 first:pl-0 sm:pl-0 sm:first:border-l-0">
            <p className="text-[11px] font-bold tabular-nums tracking-wider text-[#1D4ED8] sm:text-xs">
              {String(index + 1).padStart(2, '0')}
            </p>
            <p className={`mt-1 text-base font-semibold text-white sm:text-lg ${koreanLineBreak}`}>{step.label}</p>
            <p className={`mt-1 text-sm leading-snug text-white/70 ${koreanLineBreak}`}>{step.hint}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
