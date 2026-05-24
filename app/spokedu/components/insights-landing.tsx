'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { MediaPanel } from './visual';
import { insightArticles, insightFilters, insightMatchesFilter, type InsightArticle, type InsightFilterId } from '../data/insights';
import { insightsPage } from '../data/insights-page';
import { HOME_MEDIA } from '../data/home-media';
import {
  cardInteractive,
  fineHover,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function InsightArticleCard({ article, photoPriority }: { article: InsightArticle; photoPriority?: boolean }) {
  return (
    <Link
      href={article.href}
      data-track={inferTrackFromHref(article.href)}
      data-track-label={article.trackLabel}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04] ${cardInteractive} ${focusRing}`}
    >
      <MediaPanel
        media={HOME_MEDIA[article.mediaKey]}
        className="aspect-[16/10] max-h-[180px] shrink-0 rounded-none border-0 sm:max-h-[200px]"
        sizes="card3"
        photoPriority={photoPriority}
      />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
          {article.topic}
        </span>
        <p className="mt-1.5 text-xs font-medium leading-snug text-indigo-800 [word-break:keep-all]">
          {article.coreQuestion}
        </p>
        <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-slate-950 [word-break:keep-all]">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
          {article.summary}
        </p>
        <p className="mt-2 text-xs font-medium text-slate-500">대상: {article.audience}</p>
        <span
          className={`mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 ${fineHover}group-hover:text-indigo-900`}
        >
          {article.ctaLabel} →
        </span>
      </div>
    </Link>
  );
}

export function InsightsLanding() {
  const reducedMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState<InsightFilterId>('all');

  const filteredArticles = useMemo(
    () => insightArticles.filter((a) => insightMatchesFilter(a, activeFilter)),
    [activeFilter],
  );

  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={insightsPage.hero.kicker}
        lines={insightsPage.hero.lines}
        subtitle={insightsPage.hero.subtitle}
        media={HOME_MEDIA[insightsPage.hero.mediaKey]}
      />

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-slate-50/50 px-5 py-6 sm:px-7 sm:py-7" delay={0.04}>
        <h2 className={landingSectionTitle}>{insightsPage.definition.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
          {insightsPage.definition.body}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4" delay={0.06}>
        <h2 className={landingSectionTitle}>{insightsPage.roleCompare.title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">현장 기록</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {insightsPage.roleCompare.recordsLead}
            </p>
            <Link
              href={insightsPage.roleCompare.recordsHref}
              data-track={inferTrackFromHref(insightsPage.roleCompare.recordsHref)}
              data-track-label="insights-to-records"
              className={`mt-2 inline-flex text-xs font-semibold text-slate-700 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              {insightsPage.roleCompare.recordsLinkLabel} →
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">운영 사례</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {insightsPage.roleCompare.casesLead}
            </p>
            <Link
              href={insightsPage.roleCompare.casesHref}
              data-track={inferTrackFromHref(insightsPage.roleCompare.casesHref)}
              data-track-label="insights-to-cases"
              className={`mt-2 inline-flex text-xs font-semibold text-slate-700 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              {insightsPage.roleCompare.casesLinkLabel} →
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">월간 수업</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {insightsPage.roleCompare.monthlyLead}
            </p>
            <Link
              href={insightsPage.roleCompare.monthlyHref}
              data-track={inferTrackFromHref(insightsPage.roleCompare.monthlyHref)}
              data-track-label="insights-to-monthly"
              className={`mt-2 inline-flex text-xs font-semibold text-slate-700 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              {insightsPage.roleCompare.monthlyLinkLabel} →
            </Link>
          </div>
          <div className="rounded-xl border border-indigo-200/60 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-700">교육 관점</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {insightsPage.roleCompare.insightsLead}
            </p>
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5" delay={0.08}>
        <h2 className={landingSectionTitle}>{insightsPage.articlesSectionTitle}</h2>
        <div
          className="flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin]"
          role="tablist"
          aria-label="교육 관점 분류"
        >
          {insightFilters.map((filter) => {
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
          {filteredArticles.map((article, index) => (
            <motion.div
              key={article.slug}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 * index }}
              className="min-h-0"
            >
              <InsightArticleCard article={article} photoPriority={index === 0} />
            </motion.div>
          ))}
        </div>
      </LandingSection>

      <LandingFinalCta
        title={insightsPage.cta.title}
        description={insightsPage.cta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[insightsPage.cta.mediaKey]}
        links={[
          {
            label: insightsPage.cta.label,
            href: insightsPage.cta.href,
            trackLabel: insightsPage.cta.trackLabel,
            variant: 'primary',
          },
        ]}
      />
    </div>
  );
}
