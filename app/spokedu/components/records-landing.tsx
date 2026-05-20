'use client';

import Link from 'next/link';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { CaseProofCard } from './case-proof-card';
import { ProofSummaryWall } from './visual/proof-summary-wall';
import { cases, recordsFeaturedCaseSlugs } from '../data/cases';
import { recordsPage } from '../data/records-page';
import { cardInteractive, fineHover, landingH1, landingHeroShell, landingPageStack } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

export function RecordsLanding() {
  const featuredCases = recordsFeaturedCaseSlugs
    .map((slug) => cases.find((item) => item.slug === slug))
    .filter((item): item is (typeof cases)[number] => Boolean(item));

  return (
    <div className={landingPageStack}>
      <LandingSection className={`${landingHeroShell} border-slate-200 bg-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_42%)]" />
        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">현장기록</p>
          <h1 className={`whitespace-pre-line ${landingH1} text-slate-950`}>{recordsPage.hero.title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">{recordsPage.hero.subtitle}</p>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">운영 증거 한눈에</h2>
        <ProofSummaryWall items={recordsPage.proofSummary} />
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">기록 허브</h2>
        <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          {recordsPage.hubCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              data-track={inferTrackFromHref(card.href)}
              data-track-label={card.trackLabel}
              className={`group rounded-2xl border border-slate-200 bg-white p-4 ${cardInteractive} ${focusRing}`}
            >
              <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{card.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">{card.description}</p>
              <span className={`mt-3 inline-flex text-xs font-semibold text-slate-900 sm:text-sm ${fineHover}group-hover:text-indigo-700`}>
                바로가기 →
              </span>
            </Link>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.1}>
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">대표 운영 사례</h2>
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
          {featuredCases.map((item) => (
            <div key={item.slug} className="w-[min(84vw,320px)] shrink-0 snap-start sm:w-auto">
              <CaseProofCard item={item} trackPrefix="records-case" />
            </div>
          ))}
        </div>
      </LandingSection>

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-8 text-white shadow-xl ring-1 ring-white/10 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.12}
      >
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold sm:text-2xl">{recordsPage.cta.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{recordsPage.cta.description}</p>
          <div className="mt-5">
            <HeroCtaStack
              variant="dark"
              primary={{
                href: recordsPage.cta.href,
                label: recordsPage.cta.label,
                track: inferTrackFromHref(recordsPage.cta.href),
                trackLabel: recordsPage.cta.trackLabel,
              }}
            />
          </div>
        </div>
      </LandingSection>
    </div>
  );
}
