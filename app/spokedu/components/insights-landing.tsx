'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import { landingCardShell } from './visual/card-variants';
import { HOME_MEDIA } from '../data/home-media';
import { insightsCards } from '../data/insights';
import { insightsPage } from '../data/insights-page';
import {
  btnPrimary,
  cardInteractive,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

export function InsightsLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[insightsPage.heroMediaKey];
  const ctaMedia = HOME_MEDIA[insightsPage.ctaMediaKey];

  return (
    <div className={landingPageStack}>
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">교육 인사이트</p>
            <h1 className={`whitespace-pre-line ${landingH1} text-slate-950`}>{insightsPage.hero.title}</h1>
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">
              {insightsPage.hero.subtitle}
            </p>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className={landingSectionTitle}>카테고리</h2>
        <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 scroll-smooth [scrollbar-width:thin] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {insightsPage.categoryCards.map((cat, index) => (
            <motion.div
              key={cat.category}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: 0.04 * index }}
              className="w-[min(72vw,200px)] shrink-0 snap-start sm:w-auto"
            >
              <article className={`flex h-full flex-col overflow-hidden rounded-2xl ${landingCardShell(cat.cardVariant)}`}>
                <MediaPanel
                  media={HOME_MEDIA[cat.mediaKey]}
                  className="aspect-[4/3] shrink-0 rounded-none border-0 border-b border-slate-200/80"
                />
                <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                  <p className="text-xs font-semibold text-slate-900">{cat.category}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-600">{cat.description}</p>
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className={landingSectionTitle}>인사이트</h2>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-smooth [scrollbar-width:thin] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {insightsCards.map((card, index) => (
            <motion.div
              key={card.slug}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.05 * index }}
              className="w-[min(84vw,300px)] shrink-0 snap-start sm:w-auto"
            >
              <Link
                href={card.href}
                data-track={inferTrackFromHref(card.href)}
                data-track-label={`insights-card-${card.slug}`}
                className={`group flex h-full flex-col overflow-hidden rounded-2xl ${landingCardShell(card.cardVariant)} ${cardInteractive} ${focusRing}`}
              >
                <MediaPanel
                  media={HOME_MEDIA[card.mediaKey]}
                  className="aspect-[16/9] shrink-0 rounded-none border-0 border-b border-slate-200/80"
                />
                <div className="flex flex-1 flex-col p-3 sm:p-3.5">
                  <span className="w-fit rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {card.category}
                  </span>
                  <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{card.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{card.summary}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{card.target}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {card.keywords.slice(0, 3).map((kw) => (
                      <span key={kw} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <span className={`mt-auto pt-2.5 text-xs font-semibold text-slate-900 sm:text-sm ${fineHover}group-hover:text-indigo-700`}>
                    {card.ctaLabel} →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.1}>
        <h2 className={landingSectionTitle}>추천 연결</h2>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {insightsPage.audienceLinks.map((link, index) => (
            <Link
              key={link.audience}
              href={link.href}
              data-track={inferTrackFromHref(link.href)}
              data-track-label={link.trackLabel}
              className={`rounded-2xl p-4 ${landingCardShell((['gradient', 'image', 'dark'] as const)[index] ?? 'image')} ${cardInteractive} ${focusRing}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">{link.audience}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{link.audience} 안내</p>
              <span className={`mt-2 inline-flex text-xs font-semibold text-slate-800 ${fineHover}hover:text-indigo-700`}>
                바로가기 →
              </span>
            </Link>
          ))}
        </div>
      </LandingSection>

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-5 py-8 shadow-xl shadow-indigo-900/10 ring-1 ring-white/60 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.12}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <MediaRenderer media={ctaMedia} photoTone="clear" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">현장과 연결된 인사이트</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">인사이트를 읽고, 기록과 문의까지 한 흐름으로 이어보세요.</p>
          <div className="mt-5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Link
                href={insightsPage.cta.primary.href}
                data-track={inferTrackFromHref(insightsPage.cta.primary.href)}
                data-track-label={insightsPage.cta.primary.trackLabel}
                className={`${btnPrimary} !w-full`}
              >
                {insightsPage.cta.primary.label}
              </Link>
              <Link
                href={insightsPage.cta.secondary.href}
                data-track={inferTrackFromHref(insightsPage.cta.secondary.href)}
                data-track-label={insightsPage.cta.secondary.trackLabel}
                className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-indigo-300 ${fineHover}hover:bg-indigo-50 ${focusRing}`}
              >
                {insightsPage.cta.secondary.label}
              </Link>
            </div>
          </div>
        </div>
      </LandingSection>
    </div>
  );
}
