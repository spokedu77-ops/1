'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA, HOME_PROOF_FIELDS } from '../data/home-media';
import { homePage } from '../data/home-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  btnSecondaryOnDark,
  cardInteractive,
  fineHover,
  landingH1,
  landingPageStack,
} from '../lib/ui-classes';
import { HomeProgramSystem } from './visual/home-program-system';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';

const gateMedia = [HOME_MEDIA.trackPrivate, HOME_MEDIA.trackDispatch, HOME_MEDIA.trackCurriculum] as const;

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const gateAccent = [
  'border-t-indigo-400/80',
  'border-t-sky-400/80',
  'border-t-violet-400/80',
] as const;

function Section({
  id,
  children,
  className = '',
  delay = 0,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      id={id}
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

function resolveFieldProof(card: (typeof homePage.fieldRecords.cards)[number]) {
  const field = HOME_PROOF_FIELDS.find((f) => f.id === card.proofId);
  if (!field) return null;
  return { field, tagline: card.tagline, href: card.href, trackLabel: card.trackLabel };
}

export default function SpokeduHomeLanding() {
  const reducedMotion = useReducedMotion();
  const fieldProofItems = homePage.fieldRecords.cards
    .map((c) => resolveFieldProof(c))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className={landingPageStack}>
      {/* 1. Cinematic Hero */}
      <section className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-12">
          <div className="order-2 space-y-6 lg:order-1 lg:space-y-8">
            <h1 className={`${landingH1} text-slate-950`}>
              {homePage.hero.lines.map((line, index) => (
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
              {homePage.hero.subtitle}
            </p>
            <Link
              href={homePage.heroCtas.primary.href}
              data-track="cta-contact"
              data-track-label={homePage.heroCtas.primary.trackLabel}
              className={`${btnPrimary} !w-full sm:!w-auto`}
            >
              {homePage.heroCtas.primary.label}
            </Link>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative">
              <MotionPoster media={HOME_MEDIA.homeHero} variant="cinematic" />
              <div
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-indigo-950/35 via-transparent to-sky-500/15"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/25"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Visitor Gate */}
      <Section id={homePage.visitorGate.id} className="scroll-mt-20 space-y-7 sm:space-y-9">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-left">
          {homePage.visitorGate.title}
        </h2>
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-5">
          {homePage.visitorGate.cards.map((card, index) => (
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
                className={`group flex min-h-[248px] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/90 border-t-4 bg-white shadow-lg shadow-slate-900/8 sm:min-h-[272px] ${gateAccent[index] ?? ''} ${cardInteractive} ${focusRing}`}
              >
                <div className="relative h-[5.5rem] shrink-0 overflow-hidden sm:h-[6.5rem]">
                  <MediaPanel
                    media={gateMedia[index]}
                    className="absolute inset-0 h-full w-full rounded-none border-0"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-white via-white/55 to-white/10"
                    aria-hidden
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                  <div>
                    {card.audience ? (
                      <p className="text-sm font-medium text-slate-500">{card.audience}</p>
                    ) : null}
                    <h3
                      className={`text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl ${card.audience ? 'mt-1' : ''}`}
                    >
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
                  </div>
                  <span
                    className={`mt-4 text-sm font-semibold text-slate-900 ${fineHover}group-hover:translate-x-0.5 ${fineHover}group-hover:text-indigo-700`}
                    aria-hidden
                  >
                    →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 3. Field Records — proof wall */}
      <Section className="space-y-4 sm:space-y-5">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-left">
          {homePage.fieldRecords.title}
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4" role="list" aria-label="현장 운영 증거">
          {fieldProofItems.map(({ field, tagline, href, trackLabel }, index) => (
            <motion.div
              key={field.id}
              role="listitem"
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: 0.05 * index }}
            >
              <Link
                href={href}
                data-track={inferTrackFromHref(href)}
                data-track-label={trackLabel}
                className={`group relative block aspect-[5/6] overflow-hidden rounded-2xl border border-slate-400/30 shadow-xl shadow-slate-900/18 ring-1 ring-white/20 transition duration-300 sm:aspect-[4/5] lg:min-h-[300px] lg:aspect-auto ${cardInteractive} ${focusRing}`}
              >
                <MediaPanel media={field.media} className="absolute inset-0 h-full w-full rounded-none border-0 scale-105 transition duration-500 group-hover:scale-110" />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-900/25 to-slate-900/5 transition duration-300 group-hover:from-slate-950/96"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300">
                    {tagline}
                  </span>
                  <h3 className="mt-0.5 line-clamp-2 text-xs font-bold leading-snug text-white sm:text-sm">
                    {field.title}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="text-center">
          <Link
            href={homePage.fieldRecords.recordsHref}
            data-track={inferTrackFromHref(homePage.fieldRecords.recordsHref)}
            data-track-label={homePage.fieldRecords.recordsTrackLabel}
            className={`inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white ${fineHover}hover:bg-slate-800 ${focusRing}`}
          >
            현장기록 더 보기 →
          </Link>
        </p>
      </Section>

      {/* 4. Program System */}
      <Section className="space-y-5 sm:space-y-7" delay={0.02}>
        <div className="mx-auto max-w-2xl space-y-2 text-center lg:mx-0 lg:max-w-none lg:text-left">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {homePage.programSystem.title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{homePage.programSystem.subtitle}</p>
        </div>
        <HomeProgramSystem items={homePage.programSystem.items} />
        <p className="text-center lg:text-left">
          <Link
            href={homePage.programSystem.cta.href}
            data-track={inferTrackFromHref(homePage.programSystem.cta.href)}
            data-track-label={homePage.programSystem.cta.trackLabel}
            className={`inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-8 py-3 text-sm font-semibold text-white shadow-md ${fineHover}hover:bg-slate-800 ${focusRing}`}
          >
            {homePage.programSystem.cta.label} →
          </Link>
        </p>
      </Section>

      {/* 5. Final CTA */}
      <Section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-10 text-white sm:rounded-[2rem] sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
          <MediaRenderer media={HOME_MEDIA.trackDispatch} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/78" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{homePage.finalCta.title}</h2>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
            {homePage.finalCta.links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={item.trackLabel}
                className={`${btnSecondaryOnDark} !w-full text-center`}
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
