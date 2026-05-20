'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { CaseProofCard } from './case-proof-card';
import { MediaRenderer, MotionPoster } from './visual';
import { cases } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { casesPage } from '../data/records-page';
import { fineHover, landingH1, landingHeroShell, landingPageStack } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const caseCardVariants = ['image', 'glass', 'gradient', 'dark', 'image'] as const;

export function CasesLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[casesPage.heroMediaKey];
  const ctaMedia = HOME_MEDIA[casesPage.ctaMediaKey];

  return (
    <div className={landingPageStack}>
      <LandingSection
        className={`${landingHeroShell} overflow-hidden border-slate-200 bg-gradient-to-b from-white via-lime-50/20 to-white`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.12),transparent_42%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">수업 사례</p>
            <h1 className={`${landingH1} text-slate-950`}>{casesPage.hero.title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">{casesPage.hero.subtitle}</p>
            <div className="lg:hidden">
              <MotionPoster media={heroMedia} variant="compact" />
            </div>
          </div>
          <div className="hidden lg:block">
            <MotionPoster media={heroMedia} variant="hero" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">대표 사례</h2>
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
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-8 text-white shadow-xl ring-1 ring-white/10 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.1}
      >
        <div className="pointer-events-none absolute inset-0 opacity-85" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/82" aria-hidden />
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold sm:text-2xl">{casesPage.cta.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{casesPage.cta.description}</p>
          <div className="mt-5">
            <HeroCtaStack
              variant="dark"
              primary={{
                href: casesPage.cta.primary.href,
                label: casesPage.cta.primary.label,
                track: inferTrackFromHref(casesPage.cta.primary.href),
                trackLabel: casesPage.cta.primary.trackLabel,
              }}
              secondary={[
                {
                  href: casesPage.cta.secondary.href,
                  label: casesPage.cta.secondary.label,
                  track: inferTrackFromHref(casesPage.cta.secondary.href),
                  trackLabel: casesPage.cta.secondary.trackLabel,
                },
              ]}
            />
          </div>
          <Link
            href="/spokedu/programs"
            data-track={inferTrackFromHref('/spokedu/programs')}
            data-track-label="cases-programs-link"
            className={`mt-4 inline-block text-sm text-slate-300 underline-offset-2 ${fineHover}hover:text-white ${fineHover}hover:underline`}
          >
            프로그램 전체 보기 →
          </Link>
        </div>
      </LandingSection>
    </div>
  );
}
