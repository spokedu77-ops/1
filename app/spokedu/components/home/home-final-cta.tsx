'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  homeFocusRing,
  homeSectionH2,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimaryOnHero,
  siteBtnSecondaryOnDark,
  siteContainer,
} from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';

export function HomeFinalCta() {
  const [primary, secondary, tertiary] = homePage.finalCta.items;
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.finalCta.id}
      className={`${homeSectionScrollMt} relative bg-[#07101f] py-12 sm:py-14 lg:py-16`}
    >
      <div className={siteContainer}>
        <motion.div
          className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,280px)] lg:items-start lg:gap-10"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.4 }}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">상담</p>
            <h2 className={`${homeSectionH2} mt-2 text-white`}>
              {homePage.finalCta.headlineLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className={`mt-3 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-base ${koreanText}`}>
              {homePage.finalCta.lead}
            </p>
            <p className={`mt-2 max-w-xl text-sm leading-relaxed text-white/50 ${koreanText}`}>
              {homePage.finalCta.support}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="상담 진행 안내">
              {homePage.finalCta.notes.map((note) => (
                <li
                  key={note}
                  className={`rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 ${koreanText}`}
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2.5 lg:pt-8">
            {primary ? (
              <TrackedLink
                href={primary.href}
                trackLabel={primary.trackLabel}
                className={`${siteBtnPrimaryOnHero} h-11 w-full ${homeFocusRing}`}
              >
                {primary.label}
              </TrackedLink>
            ) : null}
            {secondary ? (
              <TrackedLink
                href={secondary.href}
                trackLabel={secondary.trackLabel}
                className={`${siteBtnSecondaryOnDark} !min-h-11 w-full py-2.5 ${homeFocusRing}`}
              >
                {secondary.label}
              </TrackedLink>
            ) : null}
            {tertiary ? (
              <TrackedLink
                href={tertiary.href}
                trackLabel={tertiary.trackLabel}
                className={`${siteBtnSecondaryOnDark} !min-h-11 w-full py-2.5 ${homeFocusRing}`}
              >
                {tertiary.label}
              </TrackedLink>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
