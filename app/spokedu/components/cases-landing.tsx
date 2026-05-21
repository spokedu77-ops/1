'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { CaseProofCard } from './case-proof-card';
import { MediaRenderer, MotionPoster } from './visual';
import { cases } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { casesPage } from '../data/records-page';
import {
  btnPrimary,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const caseCardVariants = ['image', 'glass', 'gradient', 'dark', 'image'] as const;

export function CasesLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[casesPage.heroMediaKey];
  const ctaMedia = HOME_MEDIA[casesPage.ctaMediaKey];

  return (
    <div className={landingPageStack}>
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">수업 사례</p>
            <h1 className={`${landingH1} text-slate-950`}>{casesPage.hero.title}</h1>
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">
              {casesPage.hero.subtitle}
            </p>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className={landingSectionTitle}>대표 사례</h2>
        <div
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-smooth [scrollbar-width:thin] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
          role="list"
        >
          {cases.map((item, index) => (
            <motion.div
              key={item.slug}
              role="listitem"
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.05 * index }}
              className="w-[min(84vw,280px)] shrink-0 snap-start sm:w-auto"
            >
              <CaseProofCard
                item={item}
                trackPrefix="cases"
                variant="compact"
                cardVariant={caseCardVariants[index] ?? 'image'}
              />
            </motion.div>
          ))}
        </div>
      </LandingSection>

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-5 py-8 shadow-xl shadow-indigo-900/10 ring-1 ring-white/60 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.1}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <MediaRenderer media={ctaMedia} photoTone="clear" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{casesPage.cta.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{casesPage.cta.description}</p>
          <div className="mt-5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Link
                href={casesPage.cta.primary.href}
                data-track={inferTrackFromHref(casesPage.cta.primary.href)}
                data-track-label={casesPage.cta.primary.trackLabel}
                className={`${btnPrimary} !w-full`}
              >
                {casesPage.cta.primary.label}
              </Link>
              <Link
                href={casesPage.cta.secondary.href}
                data-track={inferTrackFromHref(casesPage.cta.secondary.href)}
                data-track-label={casesPage.cta.secondary.trackLabel}
                className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-indigo-300 ${fineHover}hover:bg-indigo-50`}
              >
                {casesPage.cta.secondary.label}
              </Link>
            </div>
          </div>
        </div>
      </LandingSection>
    </div>
  );
}
