'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { dispatchPage } from '../data/dispatch-page';
import { inferTrackFromHref } from '../lib/tracking';
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
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function Section({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
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

export default function DispatchLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[dispatchPage.hero.mediaKey];
  const ctaMedia = HOME_MEDIA[dispatchPage.finalCta.mediaKey];

  return (
    <div className={landingPageStack}>
      <section className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">기관 담당자 · 파견형</p>
            <h1 className={`${landingH1} text-slate-950`}>
              {dispatchPage.hero.lines.map((line, index) => (
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
              {dispatchPage.hero.subtitle}
            </p>
            <div className="space-y-3">
              <Link
                href={dispatchPage.heroCtas.primary.href}
                data-track="cta-contact"
                data-track-label={dispatchPage.heroCtas.primary.trackLabel}
                className={`${btnPrimary} !w-full sm:!w-auto`}
              >
                {dispatchPage.heroCtas.primary.label}
              </Link>
              <Link
                href={dispatchPage.heroCtas.secondary.href}
                data-track="cta-contact"
                data-track-label={dispatchPage.heroCtas.secondary.trackLabel}
                className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 sm:w-auto ${fineHover}hover:border-sky-400 ${fineHover}hover:bg-sky-50 ${focusRing}`}
              >
                {dispatchPage.heroCtas.secondary.label}
              </Link>
            </div>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </section>

      <Section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white sm:rounded-[2rem]">
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="p-5 sm:p-8 lg:p-10">
            <h2 className={landingSectionTitle}>{dispatchPage.operationTypes.title}</h2>
            <div className="mt-5 divide-y divide-slate-100">
              {dispatchPage.operationTypes.rows.map((row) => (
                <div key={row.label} className="py-3 first:pt-0">
                  <p className="text-sm font-semibold text-slate-900 sm:text-base">{row.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{row.note}</p>
                </div>
              ))}
            </div>
          </div>
          <MediaPanel
            media={HOME_MEDIA[dispatchPage.operationTypes.mediaKey]}
            className="aspect-[16/11] min-h-[200px] rounded-none border-0 border-t border-slate-100 lg:aspect-auto lg:min-h-full lg:border-l lg:border-t-0"
          />
        </div>
      </Section>

      <Section className="space-y-6 sm:space-y-8">
        <h2 className={landingSectionTitle}>{dispatchPage.fit.title}</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {dispatchPage.fit.items.map((item, index) => (
            <article
              key={item.title}
              className={
                index === 0
                  ? 'rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-indigo-50/70 p-5'
                  : index === 1
                    ? 'rounded-2xl border border-white/50 bg-white/70 p-5 shadow-lg shadow-sky-900/5 backdrop-blur-md'
                    : 'rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-5'
              }
            >
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-6 sm:space-y-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className={landingSectionTitle}>{dispatchPage.examples.title}</h2>
          <Link
            href={dispatchPage.examples.href}
            data-track={inferTrackFromHref(dispatchPage.examples.href)}
            data-track-label={dispatchPage.examples.trackLabel}
            className={`shrink-0 text-sm font-semibold text-sky-700 ${fineHover}hover:text-sky-800 ${focusRing}`}
          >
            사례 전체 →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {dispatchPage.examples.items.map((item) => (
            <Link
              key={item.title}
              href={dispatchPage.examples.href}
              data-track={inferTrackFromHref(dispatchPage.examples.href)}
              data-track-label={`dispatch-example-${item.title}`}
              className={`block overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-md ${cardInteractive} ${focusRing}`}
            >
              <MediaPanel media={HOME_MEDIA[item.mediaKey]} className="aspect-[16/10] rounded-none border-0" />
              <p className="border-t border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">{item.title}</p>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {dispatchPage.examples.institutions.map((name) => (
            <span
              key={name}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {name}
            </span>
          ))}
        </div>
      </Section>

      <Section className="overflow-hidden rounded-[1.75rem] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-10 sm:rounded-[2rem] sm:px-10 sm:py-12">
        <h2 className={landingSectionTitle}>{dispatchPage.proposalFlow.title}</h2>
        <ol className="mt-5 flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible">
          {dispatchPage.proposalFlow.steps.map((step, index) => (
            <li
              key={step}
              className="flex min-w-[9rem] shrink-0 flex-col rounded-xl border border-white bg-white/80 px-3 py-3 shadow-sm sm:min-w-0"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-600">{index + 1}</span>
              <span className="mt-1 text-sm font-semibold text-slate-800">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="relative overflow-hidden rounded-[1.75rem] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-12 sm:rounded-[2rem] sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <MediaRenderer media={ctaMedia} photoTone="clear" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{dispatchPage.finalCta.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{dispatchPage.finalCta.description}</p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <Link
              href={dispatchPage.finalCta.primary.href}
              data-track={inferTrackFromHref(dispatchPage.finalCta.primary.href)}
              data-track-label={dispatchPage.finalCta.primary.trackLabel}
              className={`${btnPrimary} !w-full`}
            >
              {dispatchPage.finalCta.primary.label}
            </Link>
            <Link
              href={dispatchPage.finalCta.secondary.href}
              data-track={inferTrackFromHref(dispatchPage.finalCta.secondary.href)}
              data-track-label={dispatchPage.finalCta.secondary.trackLabel}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border border-sky-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-sky-300 ${fineHover}hover:bg-sky-50 ${focusRing}`}
            >
              {dispatchPage.finalCta.secondary.label}
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
