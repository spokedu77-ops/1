'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { CaseProofCard } from './case-proof-card';
import { MotionPoster, MediaRenderer, MediaPanel } from './visual';
import { landingCardShell } from './visual/card-variants';
import { ProofSummaryWall } from './visual/proof-summary-wall';
import { cases, recordsFeaturedCaseSlugs } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { recordsPage } from '../data/records-page';
import {
  cardInteractive,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
  btnPrimary,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

export function RecordsLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[recordsPage.heroMediaKey];
  const ctaMedia = HOME_MEDIA.trackDispatch;

  const featuredCases = recordsFeaturedCaseSlugs
    .map((slug) => cases.find((item) => item.slug === slug))
    .filter((item): item is (typeof cases)[number] => Boolean(item));

  const featuredVariants = ['image', 'glass', 'gradient', 'dark', 'image'] as const;

  return (
    <div className={landingPageStack}>
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">현장기록</p>
            <h1 className={`whitespace-pre-line ${landingH1} text-slate-950`}>{recordsPage.hero.title}</h1>
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">
              {recordsPage.hero.subtitle}
            </p>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className={landingSectionTitle}>운영 증거 한눈에</h2>
        <ProofSummaryWall items={recordsPage.proofSummary} />
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className={landingSectionTitle}>기록 허브</h2>
        <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          {recordsPage.hubCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              data-track={inferTrackFromHref(card.href)}
              data-track-label={card.trackLabel}
              className={`group flex flex-col overflow-hidden rounded-2xl ${landingCardShell(card.cardVariant ?? 'image')} ${cardInteractive} ${focusRing}`}
            >
              <MediaPanel
                media={HOME_MEDIA[card.mediaKey]}
                className="aspect-[16/9] shrink-0 rounded-none border-0 border-b border-slate-200/80"
              />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{card.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{card.description}</p>
                <span
                  className={`mt-auto inline-flex pt-3 text-xs font-semibold text-slate-900 sm:text-sm ${fineHover}group-hover:text-indigo-700`}
                >
                  바로가기 →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.1}>
        <div className="flex items-end justify-between gap-2">
          <h2 className={landingSectionTitle}>대표 운영 사례</h2>
          <Link
            href="/spokedu/cases"
            data-track={inferTrackFromHref('/spokedu/cases')}
            data-track-label="records-all-cases"
            className={`text-sm font-semibold text-indigo-700 ${fineHover}hover:text-indigo-800 ${focusRing}`}
          >
            전체 사례 →
          </Link>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-smooth [scrollbar-width:thin] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
          {featuredCases.map((item, index) => (
            <motion.div
              key={item.slug}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.06 * index }}
              className="w-[min(84vw,300px)] shrink-0 snap-start sm:w-auto"
            >
              <CaseProofCard
                item={item}
                trackPrefix="records-case"
                variant="compact"
                cardVariant={featuredVariants[index] ?? 'image'}
              />
            </motion.div>
          ))}
        </div>
      </LandingSection>

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-5 py-8 shadow-xl shadow-indigo-900/10 ring-1 ring-white/60 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.12}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="photo" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{recordsPage.cta.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{recordsPage.cta.description}</p>
          <div className="mt-5">
            <Link
              href={recordsPage.cta.href}
              data-track={inferTrackFromHref(recordsPage.cta.href)}
              data-track-label={recordsPage.cta.trackLabel}
              className={`${btnPrimary} !w-full sm:!w-auto`}
            >
              {recordsPage.cta.label}
            </Link>
          </div>
        </div>
      </LandingSection>
    </div>
  );
}
