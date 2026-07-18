'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
  homeFinalCtaPad,
  homeFocusRing,
  homeSectionH2,
  homeSectionScrollMt,
  koreanText,
  siteBtnGhostOnDark,
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
      className={`${homeSectionScrollMt} ${homeFinalCtaPad} relative overflow-hidden bg-[#07101f]`}
    >
      <div
        className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#1D4ED8]/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl"
        aria-hidden
      />

      <div className={`relative ${siteContainer}`}>
        <motion.div
          className="grid gap-10 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] min-[1000px]:items-end"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">상담</p>
            <h2 className={`${homeSectionH2} mt-3 text-white`}>
              {homePage.finalCta.headlineLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className={`mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-[17px] ${koreanText}`}>
              {homePage.finalCta.lead}
            </p>
            <p className={`mt-3 max-w-xl text-sm leading-relaxed text-white/50 sm:text-[15px] ${koreanText}`}>
              {homePage.finalCta.support}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3">
            {primary ? (
              <TrackedLink
                href={primary.href}
                trackLabel={primary.trackLabel}
                className={`${siteBtnPrimaryOnHero} w-full ${homeFocusRing}`}
              >
                {primary.label}
              </TrackedLink>
            ) : null}
            {secondary ? (
              <TrackedLink
                href={secondary.href}
                trackLabel={secondary.trackLabel}
                className={`${siteBtnSecondaryOnDark} w-full ${homeFocusRing}`}
              >
                {secondary.label}
              </TrackedLink>
            ) : null}
            {tertiary ? (
              <TrackedLink
                href={tertiary.href}
                trackLabel={tertiary.trackLabel}
                className={`${siteBtnGhostOnDark} w-full text-white ${homeFocusRing}`}
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
