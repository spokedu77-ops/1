'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import { landingCardShell } from './visual/card-variants';
import { HOME_MEDIA } from '../data/home-media';
import { insightsCards } from '../data/insights';
import { insightsPage } from '../data/insights-page';
import { cardInteractive, fineHover, landingH1, landingHeroShell, landingPageStack } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

export function InsightsLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[insightsPage.heroMediaKey];
  const ctaMedia = HOME_MEDIA[insightsPage.ctaMediaKey];

  return (
    <div className={landingPageStack}>
      <LandingSection
        className={`${landingHeroShell} overflow-hidden border-slate-200 bg-gradient-to-b from-white via-violet-50/40 to-indigo-50/30`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.1),transparent_42%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Education Insights</p>
            <h1 className={`whitespace-pre-line ${landingH1} text-slate-950`}>{insightsPage.hero.title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">{insightsPage.hero.subtitle}</p>
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
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">카테고리</h2>
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
              <article className={`flex h-full min-h-[168px] flex-col overflow-hidden rounded-2xl ${landingCardShell(cat.cardVariant)}`}>
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
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">인사이트</h2>
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
                className={`group flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl ${landingCardShell(card.cardVariant)} ${cardInteractive} ${focusRing}`}
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
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">추천 연결</h2>
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
              <p className="mt-1 text-sm font-semibold text-slate-900">맞춤 입구로 이동</p>
              <span className={`mt-2 inline-flex text-xs font-semibold text-slate-800 ${fineHover}hover:text-indigo-700`}>
                바로가기 →
              </span>
            </Link>
          ))}
        </div>
      </LandingSection>

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-8 text-white shadow-xl ring-1 ring-white/10 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.12}
      >
        <div className="pointer-events-none absolute inset-0 opacity-85" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/82" aria-hidden />
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold sm:text-2xl">현장과 연결된 인사이트</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">문의·기록·프로그램을 한 번에 이어갑니다.</p>
          <div className="mt-5">
            <HeroCtaStack
              variant="dark"
              primary={{
                href: insightsPage.cta.primary.href,
                label: insightsPage.cta.primary.label,
                track: inferTrackFromHref(insightsPage.cta.primary.href),
                trackLabel: insightsPage.cta.primary.trackLabel,
              }}
              secondary={[
                {
                  href: insightsPage.cta.secondary.href,
                  label: insightsPage.cta.secondary.label,
                  track: inferTrackFromHref(insightsPage.cta.secondary.href),
                  trackLabel: insightsPage.cta.secondary.trackLabel,
                },
              ]}
            />
          </div>
        </div>
      </LandingSection>
    </div>
  );
}
