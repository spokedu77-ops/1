'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA, HOME_PROOF_FIELDS } from '../data/home-media';
import { homePage } from '../data/home-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  btnSecondary,
  btnSecondaryOnDark,
  cardInteractive,
  fineHover,
  landingH1,
} from '../lib/ui-classes';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const homeStack = 'mx-auto flex w-full max-w-6xl flex-col gap-16 pb-4 sm:gap-24 sm:pb-6 lg:gap-28';

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

function resolveFieldRecord(proofId: string) {
  const field = HOME_PROOF_FIELDS.find((f) => f.id === proofId);
  const card = homePage.fieldRecords.cards.find((c) => c.proofId === proofId);
  if (!field || !card) return null;
  return { field, tagline: card.tagline };
}

export default function SpokeduHomeLanding() {
  const reducedMotion = useReducedMotion();
  const fieldRecordItems = homePage.fieldRecords.cards
    .map((c) => resolveFieldRecord(c.proofId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className={homeStack}>
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
            <p className="text-sm font-medium text-slate-500">{homePage.hero.audienceLine}</p>
            <div className="space-y-3">
              <Link
                href={homePage.heroCtas.primary.href}
                data-track="cta-contact"
                data-track-label={homePage.heroCtas.primary.trackLabel}
                className={`${btnPrimary} !w-full sm:!w-auto`}
              >
                {homePage.heroCtas.primary.label}
              </Link>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                {homePage.heroCtas.secondary.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-track={inferTrackFromHref(item.href)}
                    data-track-label={item.trackLabel}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-800 ${fineHover}hover:border-slate-400 ${fineHover}hover:bg-slate-50 ${focusRing}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <MotionPoster media={HOME_MEDIA.homeHero} variant="cinematic" />
          </div>
        </div>
      </section>

      {/* 2. Visitor Gate */}
      <Section id={homePage.visitorGate.id} className="scroll-mt-20 space-y-8 sm:space-y-10">
        <div className="space-y-2 text-center lg:text-left">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {homePage.visitorGate.title}
          </h2>
          <p className="text-sm text-slate-500 sm:text-base">세 가지 입구 중 하나를 선택하세요</p>
        </div>
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
                className={`group flex min-h-[210px] flex-col justify-between rounded-[1.5rem] border border-slate-200/90 border-t-4 bg-white p-6 shadow-sm sm:min-h-[228px] sm:p-8 ${gateAccent[index] ?? ''} ${cardInteractive} ${focusRing}`}
              >
                <p className="text-sm font-medium text-slate-500">{card.audience}</p>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
                </div>
                <span
                  className={`text-sm font-semibold text-slate-900 ${fineHover}group-hover:translate-x-0.5 ${fineHover}group-hover:text-indigo-700`}
                  aria-hidden
                >
                  →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 3. Field Records */}
      <Section className="space-y-8 sm:space-y-10">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {homePage.fieldRecords.title}
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">
            {homePage.fieldRecords.subtitle}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
          {fieldRecordItems.map(({ field, tagline }, index) => (
            <motion.div
              key={field.id}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: 0.06 * index }}
            >
              <Link
                href={field.href}
                data-track={inferTrackFromHref(field.href)}
                data-track-label={`cta-home-field-${field.id}`}
                className={`group block overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 ${cardInteractive} ${focusRing}`}
              >
                <MediaPanel
                  media={field.media}
                  className="aspect-[16/10] rounded-none border-0 sm:aspect-[5/3]"
                />
                <div className="p-4 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
                    {field.category}
                  </p>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-slate-950 sm:text-lg">
                    {field.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{tagline}</p>
                  <span
                    className={`mt-3 inline-block text-xs font-semibold text-slate-800 sm:text-sm ${fineHover}group-hover:text-indigo-700`}
                  >
                    {field.cta} →
                  </span>
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

      {/* 4. Program Mini Line */}
      <Section className="text-center" delay={0.02}>
        <p className="text-sm text-slate-500">
          운영 프로그램 ·{' '}
          <Link
            href={homePage.programMini.href}
            data-track={inferTrackFromHref(homePage.programMini.href)}
            data-track-label={homePage.programMini.trackLabel}
            className={`font-semibold text-slate-800 underline-offset-2 ${fineHover}hover:text-indigo-700 ${fineHover}hover:underline ${focusRing}`}
          >
            {homePage.programMini.text}
          </Link>
        </p>
      </Section>

      {/* 5. Final CTA */}
      <Section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-12 text-white sm:rounded-[2rem] sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
          <MediaRenderer media={HOME_MEDIA.trackDispatch} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/78" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{homePage.finalCta.title}</h2>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
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
          <Link
            href={homePage.finalCta.contact.href}
            data-track={inferTrackFromHref(homePage.finalCta.contact.href)}
            data-track-label={homePage.finalCta.contact.trackLabel}
            className={`mt-5 inline-block text-sm font-semibold text-slate-300 underline-offset-4 ${fineHover}hover:text-white ${fineHover}hover:underline ${focusRing}`}
          >
            {homePage.finalCta.contact.label} →
          </Link>
        </div>
      </Section>
    </div>
  );
}
