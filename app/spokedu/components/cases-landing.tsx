'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { LandingSection } from './landing-section';
import { MediaPanel } from './visual';
import { caseMatchesFilter, cases, type CaseData } from '../data/cases';
import {
  caseFilters,
  casesPage,
  type CaseFilterId,
} from '../data/cases-page';
import { HOME_MEDIA } from '../data/home-media';
import {
  cardInteractive,
  fineHover,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function CaseStudyCard({ item, photoPriority = false }: { item: CaseData; photoPriority?: boolean }) {
  return (
    <Link
      href={item.href}
      data-track={inferTrackFromHref(item.href)}
      data-track-label={`cases-card-${item.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04] ${cardInteractive} ${focusRing}`}
    >
      <MediaPanel
        media={HOME_MEDIA[item.mediaKey]}
        className="aspect-[16/10] max-h-[200px] shrink-0 rounded-none border-0 sm:max-h-none"
        sizes="card3"
        photoPriority={photoPriority}
      />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-950 [word-break:keep-all]">
          {item.title}
        </h3>
        <dl className="mt-2 space-y-1 text-xs text-slate-600">
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-500">대상</dt>
            <dd className="[word-break:keep-all]">{item.target}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-500">운영 형태</dt>
            <dd>{item.operationType}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs font-medium leading-snug text-indigo-800 [word-break:keep-all]">
          핵심 과제: {item.coreChallenge}
        </p>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
          {item.cardSummary}
        </p>
        <span
          className={`mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 ${fineHover}group-hover:text-indigo-900`}
        >
          {item.ctaLabel} →
        </span>
      </div>
    </Link>
  );
}

export function CasesLanding() {
  const reducedMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState<CaseFilterId>('all');

  const filteredCases = useMemo(
    () => cases.filter((item) => caseMatchesFilter(item, activeFilter)),
    [activeFilter],
  );

  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={casesPage.hero.kicker}
        lines={casesPage.hero.lines}
        subtitle={casesPage.hero.subtitle}
        media={HOME_MEDIA[casesPage.hero.mediaKey]}
        priority
      />

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-slate-50/50 px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{casesPage.roleCompare.title}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">현장 기록</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {casesPage.roleCompare.recordsLead}
            </p>
            <Link
              href={casesPage.roleCompare.recordsHref}
              data-track={inferTrackFromHref(casesPage.roleCompare.recordsHref)}
              data-track-label="cases-to-records"
              className={`mt-3 inline-flex text-sm font-semibold text-slate-700 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              {casesPage.roleCompare.recordsLinkLabel} →
            </Link>
          </div>
          <div className="rounded-xl border border-indigo-200/60 bg-white px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-700">운영 사례</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {casesPage.roleCompare.casesLead}
            </p>
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{casesPage.casesSectionTitle}</h2>
        <div
          className="flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin]"
          role="tablist"
          aria-label="사례 분류"
        >
          {caseFilters.map((filter) => {
            const active = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(filter.id)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${focusRing} ${
                  active
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-3">
          {filteredCases.map((item, index) => (
            <motion.div
              key={item.slug}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 * index }}
              className="min-h-0"
            >
              <CaseStudyCard item={item} photoPriority={index === 0} />
            </motion.div>
          ))}
        </div>
      </LandingSection>

      <LandingFinalCta
        title={casesPage.cta.title}
        description={casesPage.cta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA.proofEvent}
        links={[
          {
            label: casesPage.cta.label,
            href: casesPage.cta.href,
            trackLabel: casesPage.cta.trackLabel,
            variant: 'primary',
          },
        ]}
      />
    </div>
  );
}
