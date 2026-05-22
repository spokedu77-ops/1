'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { CaseProofCard } from './case-proof-card';
import { LandingSection } from './landing-section';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import { getCaseBySlug } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { onedayEventProgramPage } from '../data/oneday-event-program-page';
import {
  btnPrimary,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroSubtitle,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
  linkMuted,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const cardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5';

const activityCardShell =
  'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white';

export default function OnedayEventProgramLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[onedayEventProgramPage.hero.mediaKey];
  const relatedCases = onedayEventProgramPage.cases.slugs
    .map((slug) => getCaseBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className={landingPageStack}>
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
              {onedayEventProgramPage.hero.kicker}
            </p>
            <h1 className={`${landingH1} text-slate-950`}>
              {onedayEventProgramPage.hero.lines.map((line, index) => (
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
              {onedayEventProgramPage.hero.subtitle}
            </p>
            <div className="pt-2 sm:pt-3">
              <Link
                href={onedayEventProgramPage.heroCta.href}
                data-track="cta-contact"
                data-track-label={onedayEventProgramPage.heroCta.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {onedayEventProgramPage.heroCta.label}
              </Link>
            </div>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" priority sizes="heroSplit" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/60 via-white to-cyan-50/40 px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.overview.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {onedayEventProgramPage.overview.body}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.situations.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {onedayEventProgramPage.situations.items.map((item) => (
            <li key={item.title} className={cardShell}>
              <h3 className="text-base font-semibold text-slate-950 [word-break:keep-all]">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.activities.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {onedayEventProgramPage.activities.items.map((item) => (
            <li key={item.title} className={activityCardShell}>
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/9] min-h-[120px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority
              />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.operations.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-4">
          {onedayEventProgramPage.operations.items.map((item) => (
            <li key={item.title} className={cardShell}>
              <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.compare.title}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <article className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-4 sm:px-5 sm:py-5">
            <h3 className="text-sm font-semibold text-slate-500">{onedayEventProgramPage.compare.regular.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {onedayEventProgramPage.compare.regular.description}
            </p>
          </article>
          <article className="rounded-xl border border-sky-200/80 bg-sky-50/40 px-4 py-4 sm:px-5 sm:py-5">
            <h3 className="text-sm font-semibold text-sky-900">{onedayEventProgramPage.compare.oneday.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 [word-break:keep-all]">
              {onedayEventProgramPage.compare.oneday.description}
            </p>
          </article>
        </div>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.audience.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {onedayEventProgramPage.audience.body}
        </p>
      </LandingSection>

      {relatedCases.length > 0 ? (
        <LandingSection className="space-y-4 sm:space-y-5">
          <div className="flex items-end justify-between gap-2">
            <h2 className={landingSectionTitle}>{onedayEventProgramPage.cases.title}</h2>
            <Link
              href={onedayEventProgramPage.cases.recordsHref}
              data-track={inferTrackFromHref(onedayEventProgramPage.cases.recordsHref)}
              data-track-label="program-oneday-records"
              className={`text-sm ${linkMuted}`}
            >
              현장기록 →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedCases.map((item, index) => (
              <CaseProofCard
                key={item.slug}
                item={item}
                variant="compact"
                cardVariant={index % 2 === 0 ? 'image' : 'glass'}
                trackPrefix="program-oneday"
              />
            ))}
          </div>
        </LandingSection>
      ) : null}

      <LandingSection className="relative overflow-hidden rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-cyan-50/50 px-5 py-8 sm:rounded-3xl sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden>
          <MediaRenderer media={heroMedia} intensity="photo" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/82" aria-hidden />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl [word-break:keep-all]">
            {onedayEventProgramPage.finalCta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {onedayEventProgramPage.finalCta.description}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={onedayEventProgramPage.finalCta.href}
              data-track={inferTrackFromHref(onedayEventProgramPage.finalCta.href)}
              data-track-label={onedayEventProgramPage.finalCta.trackLabel}
              className={`${btnPrimary} min-h-12 !w-full sm:!min-w-[18rem] sm:!w-auto`}
            >
              {onedayEventProgramPage.finalCta.label}
            </Link>
          </div>
          <Link
            href="/spokedu/programs"
            data-track={inferTrackFromHref('/spokedu/programs')}
            data-track-label="program-oneday-all"
            className={`mt-4 inline-block text-sm text-slate-600 underline-offset-2 ${fineHover}hover:text-indigo-700 ${fineHover}hover:underline ${focusRing}`}
          >
            전체 프로그램 보기 →
          </Link>
        </div>
      </LandingSection>
    </div>
  );
}
