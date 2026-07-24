'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeBandSoftBlue,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeFinalCta() {
  const [primary, secondary, tertiary] = homePage.finalCta.items;
  const reducedMotion = useReducedMotion();
  const media = HOME_MEDIA.finalCta;

  return (
    <section
      id={homePage.finalCta.id}
      className={`${homeSectionScrollMt} relative overflow-hidden ${homeBandSoftBlue} py-12 sm:py-14 lg:py-16`}
    >
      <div className={siteContainer}>
        <motion.div
          className="overflow-hidden rounded-[1.75rem] border border-[#D6E3FF] bg-white shadow-[0_18px_50px_rgba(15,33,70,0.07)]"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.4 }}
        >
          <div className="h-1.5 w-full bg-[#0B1F46]" aria-hidden />

          <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,300px)] lg:items-stretch lg:gap-10 lg:px-10 lg:py-11">
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#245DFF]">상담</p>
              <h2 className={`${homeSectionH2} mt-3 text-[#0B1F46]`}>
                {homePage.finalCta.headlineLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h2>
              <p className={`mt-4 max-w-xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
                {homePage.finalCta.lead}
              </p>
              <p className={`mt-2 max-w-xl text-sm leading-relaxed text-[#6D7B90] ${koreanText}`}>
                {homePage.finalCta.support}
              </p>
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="상담 진행 안내">
                {homePage.finalCta.notes.map((note) => (
                  <li
                    key={note}
                    className={`rounded-full border border-[#D6E3FF] bg-[#EAF1FF] px-3.5 py-1.5 text-xs font-medium text-[#2C446D] ${koreanText}`}
                  >
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-3">
              <div className="relative mb-1 hidden aspect-[16/10] overflow-hidden rounded-[1.15rem] ring-1 ring-[#DCE3EE] lg:block">
                <MediaPanel
                  media={media}
                  className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`}
                  sizes="card2"
                  objectFit="cover"
                />
              </div>
              {primary ? (
                <TrackedLink
                  href={primary.href}
                  trackLabel={primary.trackLabel}
                  className={`${siteBtnPrimary} h-12 w-full ${homeFocusRing}`}
                >
                  {primary.label}
                </TrackedLink>
              ) : null}
              {secondary ? (
                <TrackedLink
                  href={secondary.href}
                  trackLabel={secondary.trackLabel}
                  className={`${siteBtnSecondary} !min-h-11 w-full py-2.5 ${homeFocusRing}`}
                >
                  {secondary.label}
                </TrackedLink>
              ) : null}
              {tertiary ? (
                <TrackedLink
                  href={tertiary.href}
                  trackLabel={tertiary.trackLabel}
                  className={`${siteBtnSecondary} !min-h-11 w-full py-2.5 ${homeFocusRing}`}
                >
                  {tertiary.label}
                </TrackedLink>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
