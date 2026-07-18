'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeBody,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

const PAD_COLORS = ['#EF4444', '#EAB308', '#22C55E', '#3B82F6'] as const;

/** 시그니처 프로그램 — 히어로와 다른 문법, 현장 임팩트는 유지 */
export function HomeSpomoveSpotlight() {
  const media = HOME_MEDIA.homeHeroMovement;
  const reducedMotion = useReducedMotion();
  const { title, lead, flowSteps, useCases, primaryCta, secondaryCta } = homePage.spomove;

  return (
    <section
      id={homePage.spomove.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} relative overflow-hidden bg-white`}
      aria-labelledby="home-spomove-heading"
    >
      <div
        className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl"
        aria-hidden
      />

      <div className={`relative ${siteContainer}`}>
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14">
          <motion.div
            className="relative overflow-hidden rounded-[1.75rem] shadow-[0_28px_60px_-32px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/70"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
          >
            <MediaPanel
              media={media}
              className={`aspect-[16/11] w-full border-0 rounded-none sm:aspect-[16/10] ${homePhotoGrade}`}
              sizes="full"
            />
            <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-4 pt-10">
              {PAD_COLORS.map((hex) => (
                <span key={hex} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
              ))}
            </div>
          </motion.div>

          <motion.div
            className="min-w-0"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">SPOMOVE</p>
            <h2 id="home-spomove-heading" className={`${homeSectionH2} mt-3`}>
              {title}
            </h2>
            <p className={`${homeBody} mt-4 max-w-md`}>{lead}</p>

            <ol className="mt-6 grid grid-cols-2 gap-2.5" aria-label="수업 흐름">
              {flowSteps.map((step, index) => (
                <li
                  key={step.label}
                  className="rounded-2xl border border-slate-200/80 bg-[#F3F7FC] px-3.5 py-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PAD_COLORS[index] ?? PAD_COLORS[0] }}
                      aria-hidden
                    />
                    <span className="text-[10px] font-bold tracking-[0.14em] text-slate-400">{step.hint}</span>
                  </div>
                  <p className={`mt-1.5 text-[15px] font-bold text-slate-900 ${koreanText}`}>{step.label}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-5 flex flex-wrap gap-2" aria-label="적용 형태">
              {useCases.map((item) => (
                <li
                  key={item.title}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                >
                  {item.title}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <TrackedLink
                href={primaryCta.href}
                trackLabel={primaryCta.trackLabel}
                className={`${siteBtnPrimary} ${homeFocusRing}`}
              >
                {primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={secondaryCta.href}
                trackLabel={secondaryCta.trackLabel}
                className={`${siteBtnSecondary} ${homeFocusRing}`}
              >
                {secondaryCta.label}
              </TrackedLink>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
