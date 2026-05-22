'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA, HOME_PROOF_FIELDS } from '../data/home-media';
import { homePage } from '../data/home-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  cardInteractive,
  fineHover,
  landingH1,
  landingHeroSubtitle,
  landingDarkCtaButton,
  landingPageStack,
  landingSectionLead,
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

function SectionHeading({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="text-center lg:text-left">
      <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
      {lead ? <p className={`${landingSectionLead} mx-auto lg:mx-0`}>{lead}</p> : null}
    </div>
  );
}

function resolveFieldProof(card: (typeof homePage.fieldRecords.cards)[number]) {
  const field = HOME_PROOF_FIELDS.find((f) => f.id === card.proofId);
  if (!field) return null;
  return {
    field,
    tagline: card.tagline,
    venue: card.venue,
    sessionLine: card.sessionLine,
    href: card.href,
    trackLabel: card.trackLabel,
  };
}

export default function SpokeduHomeLanding() {
  const reducedMotion = useReducedMotion();
  const fieldProofItems = homePage.fieldRecords.cards
    .map((c) => resolveFieldProof(c))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className={landingPageStack}>
      {/* 1. Hero */}
      <section className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col gap-7 sm:gap-8 lg:grid lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-12">
          <div className="order-1 lg:order-1">
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
            <div className="mt-5 space-y-4 sm:mt-6">
              <p
                className={`${landingHeroSubtitle} max-w-[20.5rem] [word-break:keep-all] sm:max-w-md`}
              >
                {homePage.hero.subtitle}
              </p>
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-label="스포키듀 운영 축">
                {homePage.hero.supportChips.map((chip) => (
                  <li
                    key={chip}
                    className="inline-flex rounded-full border border-slate-200/90 bg-white px-3.5 py-2 text-[13px] font-medium leading-snug text-slate-700 shadow-sm [word-break:keep-all] sm:text-sm"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 sm:mt-7">
              <Link
                href={homePage.heroCtas.primary.href}
                data-track="cta-contact"
                data-track-label={homePage.heroCtas.primary.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {homePage.heroCtas.primary.label}
              </Link>
            </div>
          </div>
          <div className="order-2 lg:order-2">
            <div className="relative">
              <MotionPoster
                media={HOME_MEDIA.homeHero}
                variant="cinematic"
                className="!h-[min(54vw,252px)] sm:!h-[min(48vw,300px)]"
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-indigo-950/25 via-transparent to-sky-500/10"
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
      <Section id={homePage.visitorGate.id} className="scroll-mt-20 space-y-5 sm:space-y-7">
        <SectionHeading title={homePage.visitorGate.title} lead={homePage.visitorGate.lead} />
        <div className="flex flex-col gap-3.5 md:grid md:grid-cols-3 md:gap-4">
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
                className={`group flex min-h-[232px] flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/90 border-t-4 bg-white sm:min-h-[252px] ${gateAccent[index] ?? ''} ${cardInteractive} ${focusRing}`}
              >
                <div className="relative h-[5.25rem] shrink-0 overflow-hidden sm:h-[5.75rem]">
                  <MediaPanel
                    media={gateMedia[index]}
                    className="absolute inset-0 h-full w-full rounded-none border-0"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-white/15"
                    aria-hidden
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.audience}</p>
                    <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                      {card.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                      {card.description}
                    </p>
                  </div>
                  <span
                    className={`mt-3 text-sm font-semibold text-indigo-700 ${fineHover}group-hover:text-indigo-800`}
                  >
                    {card.linkLabel} →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 3. Field Records */}
      <Section className="space-y-4 sm:space-y-5">
        <SectionHeading title={homePage.fieldRecords.title} lead={homePage.fieldRecords.lead} />
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4"
          role="list"
          aria-label="현장 운영 증거"
        >
          {fieldProofItems.map(({ field, tagline, venue, sessionLine, href, trackLabel }, index) => (
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
                className={`group relative block aspect-[5/4] max-h-[240px] overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm transition duration-300 sm:aspect-[4/5] sm:max-h-none sm:min-h-0 lg:min-h-[280px] lg:aspect-auto ${cardInteractive} ${focusRing}`}
              >
                <MediaPanel
                  media={field.media}
                  className="absolute inset-0 h-full w-full rounded-none border-0"
                  photoPriority
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/60 bg-white/95 p-3 sm:inset-x-2.5 sm:bottom-2.5 sm:p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
                    {tagline}
                  </span>
                  <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-slate-950 [word-break:keep-all]">
                    {venue}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-600 [word-break:keep-all]">
                    {sessionLine}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="text-center pt-1">
          <Link
            href={homePage.fieldRecords.recordsHref}
            data-track={inferTrackFromHref(homePage.fieldRecords.recordsHref)}
            data-track-label={homePage.fieldRecords.recordsTrackLabel}
            className={`inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-indigo-200 ${fineHover}hover:bg-indigo-50 ${fineHover}hover:text-indigo-900 ${focusRing}`}
          >
            {homePage.fieldRecords.recordsCtaLabel} →
          </Link>
        </p>
      </Section>

      {/* 4. Program System */}
      <Section className="space-y-4 sm:space-y-6" delay={0.02}>
        <div className="space-y-2 border-l-4 border-indigo-500 pl-4 text-center sm:pl-5 lg:text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">수업 콘텐츠</p>
          <h2 className="whitespace-pre-line text-[1.65rem] font-black leading-[1.08] tracking-tight text-slate-950 sm:text-[2.1rem] lg:text-[2.5rem]">
            {homePage.programSystem.title}
          </h2>
          <p className={`${landingSectionLead} mx-auto lg:mx-0`}>{homePage.programSystem.lead}</p>
        </div>
        <HomeProgramSystem items={homePage.programSystem.items} />
        <p className="text-center lg:text-left">
          <Link
            href={homePage.programSystem.cta.href}
            data-track={inferTrackFromHref(homePage.programSystem.cta.href)}
            data-track-label={homePage.programSystem.cta.trackLabel}
            className={`inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-indigo-200 ${fineHover}hover:bg-indigo-50 ${fineHover}hover:text-indigo-900 ${focusRing}`}
          >
            {homePage.programSystem.cta.label} →
          </Link>
        </p>
      </Section>

      {/* 5. Final CTA — dark emphasis */}
      <Section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-5 py-10 text-white sm:rounded-[2rem] sm:px-8 sm:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
          <MediaRenderer media={HOME_MEDIA.trackDispatch} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/82" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{homePage.finalCta.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300 [word-break:keep-all] sm:text-base">
            {homePage.finalCta.description}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {homePage.finalCta.links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={item.trackLabel}
                className={`${landingDarkCtaButton} !w-full !min-h-12`}
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
