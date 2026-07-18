'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { curriculumPage } from '../data/curriculum-page';
import {
  audienceLandingStack,
  btnPrimary,
  btnSecondary,
  koreanLineBreak,
  landingCardShell,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { CurriculumInquiryForm } from './curriculum-inquiry-form';
import { HomeSectionRule } from './home-section-rule';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingFinalCta } from './landing-final-cta';
import { LandingFloatingCta } from './landing-floating-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';

const contentCardShell = `flex h-full flex-col overflow-hidden ${landingCardShell}`;
const exampleCardShell = `flex h-full flex-col overflow-hidden ${landingCardShell}`;

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600';

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

export default function CurriculumLanding() {
  const spotlight = curriculumPage.masterSpotlight;

  return (
    <div className={`${audienceLandingStack} pb-24`}>
      <div id="hero">
      <LandingHero
        kicker={curriculumPage.hero.kicker}
        kickerClassName="text-stone-500"
        lines={curriculumPage.hero.lines}
        subtitle={curriculumPage.hero.subtitle}
        media={HOME_MEDIA[curriculumPage.hero.mediaKey]}
        visualVariant="editorial"
        priority
        primaryCta={curriculumPage.heroCtas.primary}
        secondaryCta={curriculumPage.heroCtas.secondary}
      />
      </div>

      <Section className="border-y border-stone-200 bg-white py-8 sm:py-10">
        <span className="inline-flex items-center rounded-full bg-teal-600/10 px-3.5 py-1.5 text-xs font-semibold text-teal-900">
          {curriculumPage.hero.trustBadge}
        </span>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
          {curriculumPage.trustMetrics.eyebrow}
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {curriculumPage.trustMetrics.items.map((item) => (
            <div key={item.label}>
              <dt className="text-2xl font-bold tracking-tight text-stone-950 sm:text-[1.75rem]">{item.value}</dt>
              <dd className={`mt-1 text-sm text-stone-600 ${koreanLineBreak}`}>{item.label}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={curriculumPage.leaderAxes.eyebrow}
          title={curriculumPage.leaderAxes.title}
          lead={curriculumPage.leaderAxes.lead}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {curriculumPage.leaderAxes.items.map((item) => (
            <article key={item.title} className={`px-5 py-5 ${landingCardShell}`}>
              <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={curriculumPage.contentProducts.eyebrow}
          title={curriculumPage.contentProducts.title}
          lead={curriculumPage.contentProducts.lead}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-4">
          {curriculumPage.contentProducts.items.map((item, index) => (
            <article key={item.title} className={contentCardShell}>
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[5/3] min-h-[120px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col border-t border-slate-100 p-5">
                <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className={`mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={curriculumPage.trainingTracks.eyebrow}
          title={curriculumPage.trainingTracks.title}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {curriculumPage.trainingTracks.items.map((item) => (
            <article key={item.title} className={`px-5 py-5 ${landingCardShell}`}>
              <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={curriculumPage.serviceExamples.eyebrow}
          title={curriculumPage.serviceExamples.title}
          lead={curriculumPage.serviceExamples.lead}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4">
          {curriculumPage.serviceExamples.items.map((item) => {
            const inner = (
              <>
                <MediaPanel
                  media={HOME_MEDIA[item.mediaKey]}
                  className="aspect-[16/10] shrink-0 rounded-none border-0"
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                      {item.status}
                    </span>
                    <span className="text-xs text-slate-500">{item.date}</span>
                  </div>
                  <h3 className={`mt-2 text-base font-semibold text-slate-950 sm:text-lg ${koreanLineBreak}`}>
                    {item.title}
                  </h3>
                  <p className={`mt-1 text-sm font-medium text-slate-700 ${koreanLineBreak}`}>{item.venue}</p>
                  <p className={`mt-2 flex-1 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
                    {item.description}
                  </p>
                  {'href' in item && item.href ? (
                    <span className="mt-3 text-sm font-semibold text-teal-800">자세히 보기 →</span>
                  ) : null}
                </div>
              </>
            );

            return 'href' in item && item.href ? (
              <Link
                key={item.title}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={`curriculum-example-${item.title}`}
                className={`${exampleCardShell} transition hover:border-teal-200 hover:shadow-md`}
              >
                {inner}
              </Link>
            ) : (
              <article key={item.title} className={exampleCardShell}>
                {inner}
              </article>
            );
          })}
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="overflow-hidden rounded-[1.75rem] border border-teal-200/60 bg-gradient-to-br from-teal-50/50 via-white to-stone-50/40 px-5 py-8 sm:rounded-[2rem] sm:px-8 sm:py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">{spotlight.eyebrow}</p>
        <h2 className={`mt-3 text-xl font-semibold leading-snug text-stone-950 sm:text-2xl ${koreanLineBreak}`}>
          {spotlight.title}
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          {spotlight.lead}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="SPOKEDU MASTER 주요 기능">
          {spotlight.tags.map((tag) => (
            <li key={tag}>
              <span className="rounded-full border border-teal-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900">
                {tag}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={spotlight.primary.href}
            data-track={inferTrackFromHref(spotlight.primary.href)}
            data-track-label={spotlight.primary.trackLabel}
            className={`${btnPrimary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
          >
            {spotlight.primary.label}
          </Link>
          <Link
            href={spotlight.secondary.href}
            data-track={inferTrackFromHref(spotlight.secondary.href)}
            data-track-label={spotlight.secondary.trackLabel}
            className={`${btnSecondary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
          >
            {spotlight.secondary.label}
          </Link>
        </div>
      </Section>

      <HomeSectionRule />

      <Section>
        <CurriculumInquiryForm />
      </Section>

      <LandingFinalCta
        title={curriculumPage.finalCta.title}
        description={curriculumPage.finalCta.description}
        tone="dark"
        backgroundMedia={HOME_MEDIA[curriculumPage.finalCta.mediaKey]}
        links={[{ ...curriculumPage.finalCta.primary, variant: 'on-dark-primary' }]}
      />

      <LandingFloatingCta
        primaryHref="#inquiry"
        primaryLabel="커리큘럼·교육 문의"
        showAfterId="hero"
      />
    </div>
  );
}
