'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { curriculumPage } from '../data/curriculum-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  btnPrimaryOnDark,
  btnSecondaryOnDark,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroSubtitle,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const packageShell = [
  'rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-indigo-50/80 p-5',
  'rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-sky-50/60 p-5 ring-1 ring-indigo-100',
  'rounded-2xl border border-slate-200/80 bg-white p-5',
] as const;

function Section({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function CurriculumLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[curriculumPage.hero.mediaKey];
  const ctaMedia = HOME_MEDIA[curriculumPage.finalCta.mediaKey];

  return (
    <div className={landingPageStack}>
      <section className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">강사·기관·파트너</p>
            <h1 className={`${landingH1} text-slate-950`}>
              {curriculumPage.hero.lines.map((line, index) => (
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
            <p className={`max-w-md ${landingHeroSubtitle}`}>{curriculumPage.hero.subtitle}</p>
            <div className="space-y-2.5 pt-1">
              <Link
                href={curriculumPage.heroCtas.primary.href}
                data-track="cta-contact"
                data-track-label={curriculumPage.heroCtas.primary.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {curriculumPage.heroCtas.primary.label}
              </Link>
              <Link
                href={curriculumPage.heroCtas.secondary.href}
                data-track="cta-contact"
                data-track-label={curriculumPage.heroCtas.secondary.trackLabel}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 sm:w-auto ${fineHover}hover:border-teal-400 ${fineHover}hover:bg-teal-50 ${focusRing}`}
              >
                {curriculumPage.heroCtas.secondary.label}
              </Link>
            </div>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </section>

      <Section className="space-y-6 sm:space-y-8">
        <h2 className={landingSectionTitle}>{curriculumPage.contentProducts.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {curriculumPage.contentProducts.items.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white"
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[4/3] min-h-[160px] rounded-none border-0 sm:min-h-0"
                photoPriority
              />
              <div className="border-t border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-6 sm:space-y-8">
        <h2 className={landingSectionTitle}>{curriculumPage.packages.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {curriculumPage.packages.items.map((item, index) => (
            <article key={item.title} className={packageShell[index] ?? packageShell[0]}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                {index === 1 ? '추천 패키지' : '패키지'}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="overflow-hidden rounded-[1.75rem] border border-teal-200/60 bg-gradient-to-br from-teal-50/80 via-white to-indigo-50/50 px-5 py-8 sm:rounded-[2rem] sm:px-8 sm:py-10">
        <h2 className={landingSectionTitle}>{curriculumPage.productionFlow.title}</h2>
        <ol className="mt-5 flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-6 sm:gap-3 sm:overflow-visible">
          {curriculumPage.productionFlow.steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-[6.5rem] shrink-0 flex-col rounded-xl border border-teal-100 bg-white px-3 py-3 sm:min-w-0"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-600">
                {index + 1}
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-900">{step.label}</span>
              <span className="mt-1 text-xs leading-relaxed text-slate-600">{step.detail}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-12 text-white sm:rounded-[2rem] sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/80" aria-hidden />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{curriculumPage.finalCta.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">{curriculumPage.finalCta.description}</p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <Link
              href={curriculumPage.finalCta.primary.href}
              data-track={inferTrackFromHref(curriculumPage.finalCta.primary.href)}
              data-track-label={curriculumPage.finalCta.primary.trackLabel}
              className={`${btnPrimaryOnDark} min-h-12 !w-full`}
            >
              {curriculumPage.finalCta.primary.label}
            </Link>
            <Link
              href={curriculumPage.finalCta.secondary.href}
              data-track={inferTrackFromHref(curriculumPage.finalCta.secondary.href)}
              data-track-label={curriculumPage.finalCta.secondary.trackLabel}
              className={`${btnSecondaryOnDark} min-h-12 !w-full border-slate-500`}
            >
              {curriculumPage.finalCta.secondary.label}
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
