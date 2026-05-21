'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { programCatalogCards, trackUsageRows, type ProgramTrack } from '../data/programs-catalog';
import { programsPage } from '../data/programs-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  btnSecondaryOnDark,
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

const trackBadgeClass: Record<ProgramTrack, string> = {
  Private: 'border-violet-200 bg-violet-50 text-violet-800',
  Dispatch: 'border-sky-200 bg-sky-50 text-sky-800',
  Curriculum: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const catalogMediaKeys = [
  'programSpomove',
  'programPaps',
  'programPlay',
  'programOneday',
  'programCamp',
  'programCurriculum',
] as const;

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

export default function ProgramsLanding() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={landingPageStack}>
      <section className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">프로그램</p>
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
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">
              {programsPage.hero.subtitle}
            </p>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={HOME_MEDIA.programSpomove} variant="cinematic" />
          </div>
        </div>
      </section>

      <Section className="space-y-5 sm:space-y-6">
        <h2 className={landingSectionTitle}>{programsPage.catalogTitle}</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {programCatalogCards.map((program, index) => (
            <Link
              key={program.slug}
              href={program.ctaHref}
              data-track={program.ctaTrack}
              data-track-label={program.ctaLabel}
              className={`group flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-slate-950 shadow-lg shadow-slate-900/15 ${cardInteractive} ${focusRing}`}
            >
              <MediaPanel
                media={HOME_MEDIA[catalogMediaKeys[index] ?? 'programSpomove']}
                className="aspect-[16/10] rounded-none border-0"
              />
              <div className="flex flex-1 flex-col border-t border-white/10 p-4">
                <h3 className="text-base font-semibold text-white">{program.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-300">{program.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {program.tracks.map((track) => (
                    <span
                      key={track}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${trackBadgeClass[track]}`}
                    >
                      {track}
                    </span>
                  ))}
                </div>
                <span
                  className={`mt-auto inline-flex min-h-11 items-center pt-3 text-sm font-semibold text-white ${fineHover}group-hover:text-sky-200`}
                >
                  {program.ctaLabel} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="overflow-hidden rounded-[1.75rem] bg-slate-950 text-white sm:rounded-[2rem]" delay={0.04}>
        <h2 className="px-5 pt-6 text-xl font-bold sm:px-8 sm:pt-8 sm:text-2xl">{programsPage.tracksTitle}</h2>
        <div className="mt-4 grid gap-px bg-white/10 sm:grid-cols-3">
          {trackUsageRows.map((row, index) => (
            <Link
              key={row.label}
              href={row.href}
              data-track={inferTrackFromHref(row.href)}
              data-track-label={`programs-track-${row.label}`}
              className={`block bg-slate-950/90 p-5 transition ${fineHover}hover:bg-slate-900 ${focusRing}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-300">{row.label}</p>
              <p className="mt-2 text-sm font-semibold text-white">{row.track}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{row.summary}</p>
              <p className="mt-2 text-xs text-slate-500">{row.programs.join(' · ')}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        className="relative overflow-hidden rounded-[1.75rem] border border-indigo-500/30 bg-slate-950 p-5 text-white sm:rounded-[2rem] sm:p-8"
        delay={0.06}
      >
        <MediaRenderer media={HOME_MEDIA.programSpomove} intensity="soft" className="pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-slate-950/75" aria-hidden />
        <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-300">추천</p>
            <h3 className="mt-1 text-xl font-bold sm:text-2xl">{programsPage.featured.title}</h3>
            <p className="mt-2 max-w-lg text-sm text-slate-300">{programsPage.featured.description}</p>
          </div>
          <Link
            href={programsPage.featured.href}
            data-track="cta-program-spomove"
            data-track-label={programsPage.featured.trackLabel}
            className={`${btnPrimary} !w-full shrink-0 !bg-white !text-slate-950 sm:!w-auto`}
          >
            자세히 보기
          </Link>
        </div>
      </Section>

      <Section
        className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-12 text-white sm:rounded-[2rem] sm:px-10 sm:py-14"
        delay={0.08}
      >
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{programsPage.finalCta.title}</h2>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">{programsPage.finalCta.description}</p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <Link
              href={programsPage.finalCta.primary.href}
              data-track={inferTrackFromHref(programsPage.finalCta.primary.href)}
              data-track-label={programsPage.finalCta.primary.trackLabel}
              className={`${btnSecondaryOnDark} !w-full`}
            >
              {programsPage.finalCta.primary.label}
            </Link>
            <Link
              href={programsPage.finalCta.secondary.href}
              data-track={inferTrackFromHref(programsPage.finalCta.secondary.href)}
              data-track-label={programsPage.finalCta.secondary.trackLabel}
              className={`${btnSecondaryOnDark} !w-full border-slate-500`}
            >
              {programsPage.finalCta.secondary.label}
            </Link>
          </div>
          <Link
            href="/spokedu/curriculum"
            data-track="cta-curriculum"
            data-track-label="programs-curriculum-link"
            className={`mt-5 inline-block text-sm text-slate-400 underline-offset-2 ${fineHover}hover:text-white ${fineHover}hover:underline`}
          >
            커리큘럼·콘텐츠 문의 →
          </Link>
        </div>
      </Section>
    </div>
  );
}
