'use client';

import { homePage } from '../../data/home-page';
import {
  homeFinalCtaPad,
  homeFocusRing,
  homeSectionH2,
  koreanLineBreak,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';

export function HomeFinalCta() {
  const [primary, secondary, tertiary] = homePage.finalCta.items;

  return (
    <section id={homePage.finalCta.id} className={`${homeFinalCtaPad} bg-[#FAFAF8]`}>
      <div className={siteContainer}>
        <div className="w-full rounded-2xl border border-[#1D4ED8]/12 bg-[#EEF3FA] px-6 py-8 sm:px-10 sm:py-10 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:px-12 lg:py-11">
          <div className="min-w-0">
            <h2 className={homeSectionH2}>
              {homePage.finalCta.headlineLines.map((line) => (
                <span key={line} className="block lg:whitespace-nowrap">
                  {line}
                </span>
              ))}
            </h2>
            <p className={`mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-[17px] ${koreanLineBreak}`}>
              {homePage.finalCta.lead}
            </p>
          </div>

          <div className="mt-8 flex w-full flex-col gap-3 lg:mt-0 lg:max-w-sm lg:justify-self-end">
            {primary ? (
              <TrackedLink
                href={primary.href}
                trackLabel={primary.trackLabel}
                className={`${siteBtnPrimary} w-full ${homeFocusRing}`}
              >
                {primary.label}
              </TrackedLink>
            ) : null}
            {secondary ? (
              <TrackedLink
                href={secondary.href}
                trackLabel={secondary.trackLabel}
                className={`${siteBtnSecondary} w-full bg-white ${homeFocusRing}`}
              >
                {secondary.label}
              </TrackedLink>
            ) : null}
            {tertiary ? (
              <TrackedLink
                href={tertiary.href}
                trackLabel={tertiary.trackLabel}
                className={`inline-flex min-h-12 w-full items-center justify-center text-[15px] font-semibold text-[#1D4ED8] underline-offset-4 transition hover:underline ${homeFocusRing}`}
              >
                {tertiary.label}
              </TrackedLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
