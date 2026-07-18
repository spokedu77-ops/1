'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  btnPrimaryOnDark,
  homeBodyLeadOnDark,
  homeDarkSection,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2OnDark,
  homeSectionPad,
  homeSectionScrollMt,
  koreanText,
  siteBtnSecondaryOnDark,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

export function HomeSpomoveSpotlight() {
  const media = HOME_MEDIA[homePage.spomove.mediaKey];
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.spomove.id}
      className={`${homeSectionScrollMt} ${homeDarkSection} ${homeSectionPad}`}
    >
      <div className={siteContainer}>
        <div className="grid gap-10 min-[1100px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] min-[1100px]:items-center min-[1100px]:gap-14">
          <motion.div
            className="min-w-0 min-[1100px]:max-w-xl"
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-semibold tracking-wide text-[#93C5FD]">SPOMOVE</p>
            <h2 className={`${homeSectionH2OnDark} mt-3`}>
              <span className="block">{homePage.spomove.title}</span>
              <span className="mt-1 block">{homePage.spomove.titleLine2}</span>
            </h2>
            <p className={homeBodyLeadOnDark}>{homePage.spomove.lead}</p>

            <ol
              className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-6 sm:grid-cols-4"
              aria-label="SPOMOVE 학습 흐름"
            >
              {homePage.spomove.flowSteps.map((step, index) => (
                <li key={step.label} className="min-w-0">
                  <p className="text-[11px] font-bold tabular-nums tracking-wider text-[#93C5FD]">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <p className={`mt-1 text-base font-semibold text-white ${koreanText}`}>{step.label}</p>
                  <p className={`mt-1 text-sm text-white/65 ${koreanText}`}>{step.hint}</p>
                </li>
              ))}
            </ol>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
          </motion.div>

          <motion.div
            className="relative min-w-0 overflow-hidden rounded-none sm:rounded-xl"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            <MediaPanel
              media={media}
              className={`aspect-[4/3] w-full border-0 rounded-none sm:aspect-[3/2] ${homePhotoGrade}`}
              sizes="heroEditorialMain"
              photoPriority
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
