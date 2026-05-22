'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { privatePage } from '../data/private-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  btnSecondaryOnDark,
  fineHover,
  btnPrimaryOnDark,
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

const whoCardShell =
  'rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-amber-50/60 px-4 py-5 sm:px-5 sm:py-6';

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

export default function PrivateLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[privatePage.hero.mediaKey];
  const ctaMedia = HOME_MEDIA[privatePage.finalCta.mediaKey];

  return (
    <div className={landingPageStack}>
      <section className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">학부모 · 개인·소그룹</p>
            <h1 className={`${landingH1} text-slate-950`}>
              {privatePage.hero.lines.map((line, index) => (
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
            <p className={`max-w-md ${landingHeroSubtitle}`}>{privatePage.hero.subtitle}</p>
            <div className="space-y-2.5 pt-1">
              <Link
                href={privatePage.heroCtas.primary.href}
                data-track="cta-contact"
                data-track-label={privatePage.heroCtas.primary.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {privatePage.heroCtas.primary.label}
              </Link>
              <Link
                href={privatePage.heroCtas.secondary.href}
                data-track="cta-contact"
                data-track-label={privatePage.heroCtas.secondary.trackLabel}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border border-violet-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 sm:w-auto ${fineHover}hover:border-violet-300 ${fineHover}hover:bg-violet-50 ${focusRing}`}
              >
                {privatePage.heroCtas.secondary.label}
              </Link>
            </div>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </section>

      <Section className="space-y-5 sm:space-y-7">
        <h2 className={landingSectionTitle}>{privatePage.whoNeeds.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {privatePage.whoNeeds.items.map((item) => (
            <article key={item.title} className={whoCardShell}>
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-6 sm:space-y-8">
        <h2 className={landingSectionTitle}>{privatePage.classCompare.title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {privatePage.classCompare.items.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white"
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/10] min-h-[180px] rounded-none border-0 sm:min-h-0"
                photoPriority
              />
              <div className="border-t border-slate-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-6 sm:space-y-8">
        <h2 className={landingSectionTitle}>{privatePage.classFormat.title}</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr] sm:gap-5">
          {privatePage.classFormat.items.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-gradient-to-br from-white to-violet-50/50 shadow-sm"
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/10] min-h-[160px] rounded-none border-0 sm:min-h-0"
                photoPriority
              />
              <div className="border-t border-slate-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            </article>
          ))}
          <div className="flex flex-col justify-center rounded-[1.35rem] border border-violet-200/60 bg-violet-50/50 px-4 py-5 sm:px-6 sm:py-6">
            <p className="text-sm leading-relaxed text-slate-700">{privatePage.classFormat.locationNote}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {privatePage.classFormat.locations.map((loc) => (
                <span
                  key={loc}
                  className="rounded-full border border-violet-200/80 bg-white px-3 py-1 text-xs font-semibold text-violet-900"
                >
                  {loc}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="overflow-hidden rounded-[1.75rem] border border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 px-5 py-8 sm:rounded-[2rem] sm:px-8 sm:py-10">
        <h2 className={landingSectionTitle}>{privatePage.consultFlow.title}</h2>
        <ol className="mt-5 flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible">
          {privatePage.consultFlow.steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-[8.5rem] shrink-0 flex-col rounded-xl border border-violet-100 bg-white px-3 py-3 sm:min-w-0"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-600">
                {index + 1}
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-900">{step.label}</span>
              <span className="mt-1 text-xs leading-relaxed text-slate-600">{step.detail}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <h2 className={landingSectionTitle}>{privatePage.faq.title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-3.5">
          {privatePage.faq.items.map((item) => (
            <article
              key={item.q}
              className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5"
            >
              <h3 className="text-sm font-semibold text-slate-950">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-12 text-white sm:rounded-[2rem] sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/80" aria-hidden />
        <div className="relative mx-auto max-w-xl text-center sm:text-left">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{privatePage.finalCta.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">{privatePage.finalCta.description}</p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <Link
              href={privatePage.finalCta.primary.href}
              data-track={inferTrackFromHref(privatePage.finalCta.primary.href)}
              data-track-label={privatePage.finalCta.primary.trackLabel}
              className={`${btnPrimaryOnDark} min-h-12 !w-full`}
            >
              {privatePage.finalCta.primary.label}
            </Link>
            <Link
              href={privatePage.finalCta.secondary.href}
              data-track={inferTrackFromHref(privatePage.finalCta.secondary.href)}
              data-track-label={privatePage.finalCta.secondary.trackLabel}
              className={`${btnSecondaryOnDark} min-h-12 !w-full border-slate-500`}
            >
              {privatePage.finalCta.secondary.label}
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
