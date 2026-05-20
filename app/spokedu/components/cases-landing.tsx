'use client';

import Link from 'next/link';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { CaseProofCard } from './case-proof-card';
import { cases } from '../data/cases';
import { casesPage } from '../data/records-page';
import { landingH1, landingHeroShell, landingPageStack } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

export function CasesLanding() {
  return (
    <div className={landingPageStack}>
      <LandingSection className={`${landingHeroShell} border-slate-200 bg-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_42%)]" />
        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">수업 사례</p>
          <h1 className={`${landingH1} text-slate-950`}>{casesPage.hero.title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">{casesPage.hero.subtitle}</p>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">대표 사례</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((item) => (
            <li key={item.slug}>
              <CaseProofCard item={item} trackPrefix="cases" />
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-8 text-white shadow-xl ring-1 ring-white/10 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.1}
      >
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
            className="mt-4 inline-block text-sm text-slate-300 underline-offset-2 hover:text-white hover:underline"
          >
            프로그램 전체 보기 →
          </Link>
        </div>
      </LandingSection>
    </div>
  );
}
