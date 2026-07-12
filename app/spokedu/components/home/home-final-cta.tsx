'use client';

import { homePage } from '../../data/home-page';
import {
  homeCardPanelPad,
  homeFinalCtaPad,
  homeFocusRing,
  homeSectionH2,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';

export function HomeFinalCta() {
  const [primary, secondary, tertiary] = homePage.finalCta.items;

  return (
    <section id={homePage.finalCta.id} className={`${homeSectionScrollMt} ${homeFinalCtaPad} bg-[#FAFAF8]`}>
      <div className={siteContainer}>
        <div
          className={`w-full min-w-0 rounded-2xl border border-[#1D4ED8]/12 bg-[#EEF3FA] ${homeCardPanelPad} min-[1200px]:grid min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] min-[1200px]:items-start min-[1200px]:gap-10 lg:px-7 lg:py-7`}
        >
          <div className="min-w-0">
            <h2 className={`${homeSectionH2} max-w-[36rem]`}>
              {homePage.finalCta.headlineLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className={`mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-[17px] ${koreanText}`}>
              {homePage.finalCta.lead}
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {homePage.finalCta.notes.map((note) => (
                <li key={note} className={`rounded-lg border border-[#1D4ED8]/15 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 ${koreanText}`}>
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex w-full min-w-0 flex-col gap-3 min-[1200px]:mt-0">
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
