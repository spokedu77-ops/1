'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { programsPage } from '../data/programs-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  btnPrimaryOnDark,
  btnSecondary,
  btnSecondaryOnDark,
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
import { MediaPanel, MotionPoster } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const programCardShell =
  'group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04]';

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

function ProgramCard({ program }: { program: (typeof programsPage.groups)[number]['programs'][number] }) {
  return (
    <Link
      href={program.detailHref}
      data-track={program.ctaTrack}
      data-track-label={program.ctaLabel}
      className={`${programCardShell} ${cardInteractive} ${focusRing}`}
    >
      <MediaPanel
        media={HOME_MEDIA[program.mediaKey]}
        className="aspect-[16/10] min-h-[140px] shrink-0 rounded-none border-0 sm:min-h-0"
        photoPriority
      />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{program.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
          {program.description}
        </p>
        <p className="mt-2 text-xs font-medium text-slate-500 [word-break:keep-all]">
          <span className="text-slate-400">적합</span> · {program.fit}
        </p>
        <span
          className={`mt-auto inline-flex min-h-11 items-center pt-3 text-sm font-semibold text-indigo-700 ${fineHover}group-hover:text-indigo-900`}
        >
          {program.ctaLabel} →
        </span>
      </div>
    </Link>
  );
}

export default function ProgramsLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[programsPage.hero.mediaKey];

  return (
    <div className={landingPageStack}>
      <section className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">프로그램 구성</p>
            <h1 className={`${landingH1} text-slate-950`}>
              {programsPage.hero.lines.map((line, index) => (
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
              {programsPage.hero.subtitle}
            </p>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:pt-3">
              <Link
                href={programsPage.heroCtas.primary.href}
                data-track="cta-contact"
                data-track-label={programsPage.heroCtas.primary.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {programsPage.heroCtas.primary.label}
              </Link>
              <Link
                href={programsPage.heroCtas.secondary.href}
                data-track="cta-contact"
                data-track-label={programsPage.heroCtas.secondary.trackLabel}
                className={`${btnSecondary} min-h-12 !w-full sm:!w-auto`}
              >
                {programsPage.heroCtas.secondary.label}
              </Link>
            </div>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" priority sizes="heroSplit" />
          </div>
        </div>
      </section>

      <Section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
          {programsPage.selectionGuide.title}
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-2.5">
          {programsPage.selectionGuide.items.map((item) => (
            <li
              key={item.program}
              className="rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 text-sm leading-snug text-slate-700 [word-break:keep-all]"
            >
              <span className="text-slate-600">{item.need}</span>
              <span className="font-semibold text-indigo-800"> → {item.program}</span>
            </li>
          ))}
        </ul>
      </Section>

      {programsPage.groups.map((group) => (
        <Section key={group.title} className="space-y-4 sm:space-y-5">
          <div>
            <h2 className={landingSectionTitle}>{group.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
              {group.lead}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
            {group.programs.map((program) => (
              <ProgramCard key={program.slug} program={program} />
            ))}
          </div>
        </Section>
      ))}

      <Section
        className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-12 text-white sm:rounded-[2rem] sm:px-10 sm:py-14"
        delay={0.06}
      >
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl [word-break:keep-all]">
            {programsPage.finalCta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-200 [word-break:keep-all] sm:text-base">
            {programsPage.finalCta.description}
          </p>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            <Link
              href={programsPage.finalCta.primary.href}
              data-track={inferTrackFromHref(programsPage.finalCta.primary.href)}
              data-track-label={programsPage.finalCta.primary.trackLabel}
              className={`${btnPrimaryOnDark} min-h-12 !w-full sm:!w-auto`}
            >
              {programsPage.finalCta.primary.label}
            </Link>
            <Link
              href={programsPage.finalCta.secondary.href}
              data-track={inferTrackFromHref(programsPage.finalCta.secondary.href)}
              data-track-label={programsPage.finalCta.secondary.trackLabel}
              className={`${btnSecondaryOnDark} min-h-12 !w-full sm:!w-auto`}
            >
              {programsPage.finalCta.secondary.label}
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
