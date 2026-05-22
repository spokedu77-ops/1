'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { dispatchPage } from '../data/dispatch-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  btnPrimaryOnDark,
  cardInteractive,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroSubtitle,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const institutionCardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-5 shadow-sm shadow-slate-900/[0.03] sm:px-5 sm:py-6';

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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">기관 담당자 · 기관수업</p>
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
            <p
              className={`${landingHeroSubtitle} max-w-[20.5rem] [word-break:keep-all] sm:max-w-lg`}
            >
              {dispatchPage.hero.subtitle}
            </p>
            <div className="pt-2 sm:pt-3">
              <Link
                href={dispatchPage.heroCtas.primary.href}
                data-track="cta-contact"
                data-track-label={dispatchPage.heroCtas.primary.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {dispatchPage.heroCtas.primary.label}
              </Link>
            </div>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </section>

      <Section className="space-y-5 sm:space-y-7">
        <h2 className={landingSectionTitle}>{dispatchPage.whoFits.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {dispatchPage.whoFits.items.map((item) => (
            <article key={item.title} className={institutionCardShell}>
              <h3 className="text-base font-semibold text-slate-900 [word-break:keep-all]">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-[1.75rem] border border-sky-200/70 bg-white px-5 py-6 sm:rounded-[2rem] sm:px-8 sm:py-8">
        <h2 className={landingSectionTitle}>{dispatchPage.smallSpace.title}</h2>
        <p className="mt-3 text-base font-semibold text-slate-950 [word-break:keep-all] sm:text-lg">
          {dispatchPage.smallSpace.lead}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {dispatchPage.smallSpace.description}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
          {dispatchPage.smallSpace.criteria.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-sky-100 bg-sky-50/50 px-3.5 py-3 text-sm leading-snug text-slate-700 [word-break:keep-all]"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section className="space-y-5 sm:space-y-7">
        <h2 className={landingSectionTitle}>{dispatchPage.operationTypes.title}</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-stretch lg:gap-6">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-1">
            {dispatchPage.operationTypes.rows.map((row) => (
              <article
                key={row.label}
                className="flex h-full min-h-[7.25rem] flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5"
              >
                <h3 className="text-base font-semibold text-slate-950">{row.label}</h3>
                <p className="mt-2 flex-1 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                  {row.description}
                </p>
              </article>
            ))}
          </div>
          <MediaPanel
            media={HOME_MEDIA[dispatchPage.operationTypes.mediaKey]}
            className="aspect-[16/11] min-h-[200px] rounded-[1.25rem] border-slate-200/80 lg:min-h-full"
            photoPriority
          />
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-7">
        <div>
          <h2 className={landingSectionTitle}>{dispatchPage.signaturePrograms.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {dispatchPage.signaturePrograms.lead}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-stretch sm:gap-5">
          {dispatchPage.signaturePrograms.items.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={item.trackLabel}
              className={`flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white ${cardInteractive} ${focusRing}`}
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/10] min-h-[160px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority
              />
              <div className="flex flex-1 flex-col border-t border-slate-100 p-4 sm:p-5">
                <h3 className="text-lg font-semibold text-slate-950">{item.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <h2 className={landingSectionTitle}>{dispatchPage.fit.title}</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {dispatchPage.fit.items.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-5 sm:px-5">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {dispatchPage.examples.items.map((item) => (
            <Link
              key={item.venue}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={`dispatch-example-${item.venue}`}
              className={`group relative block aspect-[5/4] max-h-[260px] overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm sm:aspect-[4/5] sm:max-h-none ${cardInteractive} ${focusRing}`}
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="absolute inset-0 h-full w-full rounded-none border-0"
                photoPriority
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/60 bg-white/95 p-3 sm:inset-x-2.5 sm:bottom-2.5">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-950 [word-break:keep-all]">
                  {item.venue}
                </h3>
                <p className="mt-1 text-xs font-medium text-sky-800 [word-break:keep-all]">
                  {item.audience} · {item.operation}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-600 [word-break:keep-all]">
                  {item.activity}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="overflow-hidden rounded-[1.75rem] border border-sky-200/60 bg-gradient-to-br from-sky-50/80 via-white to-indigo-50/50 px-5 py-8 sm:rounded-[2rem] sm:px-8 sm:py-10">
        <h2 className={landingSectionTitle}>{dispatchPage.inquiryFlow.title}</h2>
        <ol className="mt-5 flex gap-2.5 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
          {dispatchPage.inquiryFlow.steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-[10.5rem] shrink-0 flex-col rounded-xl border border-sky-100 bg-white px-3.5 py-3.5 sm:min-w-0"
            >
              <span className="text-[10px] font-semibold tracking-[0.08em] text-sky-600">{index + 1}단계</span>
              <span className="mt-1 text-sm font-semibold text-slate-900 [word-break:keep-all]">{step.label}</span>
              <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600 [word-break:keep-all]">
                {step.detail}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-12 text-white sm:rounded-[2rem] sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/82" aria-hidden />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl [word-break:keep-all]">
            {dispatchPage.finalCta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-200 [word-break:keep-all] sm:text-base">
            {dispatchPage.finalCta.description}
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href={dispatchPage.finalCta.primary.href}
              data-track={inferTrackFromHref(dispatchPage.finalCta.primary.href)}
              data-track-label={dispatchPage.finalCta.primary.trackLabel}
              className={`${btnPrimaryOnDark} min-h-12 !w-full sm:!min-w-[18rem] sm:!w-auto`}
            >
              {dispatchPage.finalCta.primary.label}
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
