'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { homePage } from '../../data/home-page';
import {
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
  const reducedMotion = useReducedMotion();

  return (
    <section id={homePage.finalCta.id} className={`${homeSectionScrollMt} ${homeFinalCtaPad} bg-[#0B1220]`}>
      <div className={siteContainer}>
        <motion.div
          className="grid gap-10 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] min-[1000px]:items-end"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div className="min-w-0">
            <h2 className={`${homeSectionH2} text-white`}>
              {homePage.finalCta.headlineLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className={`mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-[17px] ${koreanText}`}>
              {homePage.finalCta.lead}
            </p>
            <p className={`mt-3 max-w-xl text-sm leading-relaxed text-white/55 sm:text-[15px] ${koreanText}`}>
              {homePage.finalCta.support}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3">
            {primary ? (
              <TrackedLink
                href={primary.href}
                trackLabel={primary.trackLabel}
                className={`${siteBtnPrimary} w-full bg-white text-[#0B1220] hover:bg-white/90 ${homeFocusRing}`}
              >
                {primary.label}
              </TrackedLink>
            ) : null}
            {secondary ? (
              <TrackedLink
                href={secondary.href}
                trackLabel={secondary.trackLabel}
                className={`${siteBtnSecondary} w-full border-white/30 bg-transparent text-white hover:bg-white/10 ${homeFocusRing}`}
              >
                {secondary.label}
              </TrackedLink>
            ) : null}
            {tertiary ? (
              <TrackedLink
                href={tertiary.href}
                trackLabel={tertiary.trackLabel}
                className={`inline-flex min-h-12 w-full items-center justify-center text-[15px] font-semibold text-white/80 underline-offset-4 transition hover:text-white hover:underline ${homeFocusRing}`}
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
