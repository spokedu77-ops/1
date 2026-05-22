'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { aboutPage } from '../data/about-page';
import { inferTrackFromHref } from '../lib/tracking';
import { cardInteractive, fineHover, landingH1, landingPageStack } from '../lib/ui-classes';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const roleAccent = [
  'border-t-indigo-400/80',
  'border-t-sky-400/80',
  'border-t-violet-400/80',
] as const;

function Section({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
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

export function AboutLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[aboutPage.heroMediaKey];
  const ctaMedia = HOME_MEDIA[aboutPage.ctaMediaKey];

  return (
    <div className={landingPageStack}>
      {/* 1. Hero */}
      <section className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-12">
          <div className="order-2 space-y-6 lg:order-1 lg:space-y-8">
            <h1 className={`${landingH1} text-slate-950`}>
              {aboutPage.hero.lines.map((line, index) => (
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
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">
              {aboutPage.hero.subtitle}
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </section>

      {/* 2. What We Do */}
      <Section className="space-y-8 sm:space-y-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 lg:text-left">우리가 하는 일</p>
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-5">
          {aboutPage.whatWeDo.cards.map((card, index) => (
            <motion.div
              key={card.href}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.08 * index }}
            >
              <Link
                href={card.href}
                data-track={inferTrackFromHref(card.href)}
                data-track-label={card.trackLabel}
                className={`group block overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 ${cardInteractive} ${focusRing}`}
              >
                <MediaPanel
                  media={HOME_MEDIA[card.mediaKey]}
                  className="aspect-[16/10] rounded-none border-0 sm:aspect-[5/3]"
                />
                <div className={`border-t-4 p-4 sm:p-5 ${roleAccent[index] ?? ''}`}>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{card.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{card.description}</p>
                  <span
                    className={`mt-3 inline-block text-xs font-semibold text-slate-700 sm:text-sm ${fineHover}group-hover:text-indigo-700`}
                  >
                    자세히 →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 3. SPOKEDU Method */}
      <Section className="overflow-hidden rounded-[1.75rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-5 py-10 sm:rounded-[2rem] sm:px-8 sm:py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl lg:text-left">
          {aboutPage.method.title}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {aboutPage.method.cards.map((item, index) => (
            <motion.article
              key={item.code}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, delay: 0.06 * index }}
              className="rounded-2xl border border-white/90 bg-white/80 px-4 py-5 shadow-sm sm:px-5 sm:py-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">{item.code}</p>
              <h3 className="mt-2 text-base font-semibold text-slate-900 sm:text-lg">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </Section>

      {/* 4. Field-Based Brand */}
      <Section className="space-y-8 sm:space-y-10">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{aboutPage.fieldBrand.title}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
          {aboutPage.fieldBrand.cards.map((card, index) => (
            <motion.div
              key={card.href}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: 0.06 * index }}
            >
              <Link
                href={card.href}
                data-track={inferTrackFromHref(card.href)}
                data-track-label={card.trackLabel}
                className={`group block overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 ${cardInteractive} ${focusRing}`}
              >
                <MediaPanel
                  media={HOME_MEDIA[card.mediaKey]}
                  className="aspect-[16/10] rounded-none border-0 sm:aspect-[5/3]"
                />
                <div className="p-4 sm:p-5">
                  <h3 className="text-base font-semibold leading-snug text-slate-950 sm:text-lg">{card.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{card.tagline}</p>
                  <span
                    className={`mt-3 inline-block text-xs font-semibold text-slate-800 sm:text-sm ${fineHover}group-hover:text-indigo-700`}
                  >
                    보기 →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 5. Final CTA */}
      <Section className="relative overflow-hidden rounded-[1.75rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-6 py-12 sm:rounded-[2rem] sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="photo" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{aboutPage.finalCta.title}</h2>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
            {aboutPage.finalCta.links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={item.trackLabel}
                className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-indigo-300 ${fineHover}hover:bg-indigo-50 ${focusRing}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
