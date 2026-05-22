'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import { HOME_MEDIA } from '../data/home-media';
import { papsProgramPage } from '../data/paps-program-page';
import {
  btnPrimary,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroSubtitle,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const elementCardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5';

export default function PapsProgramLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[papsProgramPage.hero.mediaKey];

  return (
    <div className={landingPageStack}>
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lime-800">
              {papsProgramPage.hero.kicker}
            </p>
            <h1 className={`${landingH1} text-slate-950`}>
              {papsProgramPage.hero.lines.map((line, index) => (
                <motion.span
                  key={line}
                  initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                  animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.07 * index }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
            </h1>
            <p
              className={`${landingHeroSubtitle} max-w-[20.5rem] [word-break:keep-all] sm:max-w-lg`}
            >
              {papsProgramPage.hero.subtitle}
            </p>
            <div className="pt-2 sm:pt-3">
              <Link
                href={papsProgramPage.heroCta.href}
                data-track="cta-contact"
                data-track-label={papsProgramPage.heroCta.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {papsProgramPage.heroCta.label}
              </Link>
            </div>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" priority sizes="heroSplit" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-lime-200/70 bg-gradient-to-br from-lime-50/60 via-white to-emerald-50/40 px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{papsProgramPage.overview.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {papsProgramPage.overview.body}
        </p>
        <p className="mt-3 text-sm font-medium text-lime-900 [word-break:keep-all] sm:text-[15px]">
          {papsProgramPage.overview.emphasis}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{papsProgramPage.fitnessElements.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-3">
          {papsProgramPage.fitnessElements.items.map((item) => (
            <li key={item.title} className={elementCardShell}>
              <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{papsProgramPage.classFlow.title}</h2>
        <ol className="flex gap-2.5 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
          {papsProgramPage.classFlow.steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-[10.5rem] shrink-0 flex-col rounded-xl border border-lime-100 bg-lime-50/30 px-3.5 py-3.5 sm:min-w-0"
            >
              <span className="text-[10px] font-semibold tracking-[0.08em] text-lime-800">{index + 1}단계</span>
              <span className="mt-1 text-sm font-semibold text-slate-900 [word-break:keep-all]">{step.label}</span>
              <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600 [word-break:keep-all]">
                {step.detail}
              </span>
            </li>
          ))}
        </ol>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{papsProgramPage.institutionFit.title}</h2>
        <p className="mt-3 text-base font-semibold text-slate-950 [word-break:keep-all] sm:text-lg">
          {papsProgramPage.institutionFit.lead}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {papsProgramPage.institutionFit.body}
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
          <MediaPanel
            media={HOME_MEDIA.programPlay}
            className="aspect-[21/9] min-h-[120px] rounded-none border-0 sm:min-h-0"
          />
        </div>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{papsProgramPage.audience.title}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-lime-800">적합한 대상</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {papsProgramPage.audience.targets}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-lime-800">운영 방식</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {papsProgramPage.audience.operations}
            </dd>
          </div>
        </dl>
      </LandingSection>

      <LandingSection className="relative overflow-hidden rounded-2xl border border-lime-200/70 bg-gradient-to-br from-lime-50 via-white to-emerald-50/50 px-5 py-8 sm:rounded-3xl sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden>
          <MediaRenderer media={heroMedia} intensity="photo" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/82" aria-hidden />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl [word-break:keep-all]">
            {papsProgramPage.finalCta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {papsProgramPage.finalCta.description}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={papsProgramPage.finalCta.href}
              data-track={inferTrackFromHref(papsProgramPage.finalCta.href)}
              data-track-label={papsProgramPage.finalCta.trackLabel}
              className={`${btnPrimary} min-h-12 !w-full sm:!min-w-[18rem] sm:!w-auto`}
            >
              {papsProgramPage.finalCta.label}
            </Link>
          </div>
          <Link
            href="/spokedu/programs"
            data-track={inferTrackFromHref('/spokedu/programs')}
            data-track-label="program-paps-all"
            className={`mt-4 inline-block text-sm text-slate-600 underline-offset-2 ${fineHover}hover:text-indigo-700 ${fineHover}hover:underline ${focusRing}`}
          >
            전체 프로그램 보기 →
          </Link>
        </div>
      </LandingSection>
    </div>
  );
}
