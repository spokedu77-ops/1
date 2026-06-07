'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { dispatchPage } from '../data/dispatch-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  audienceLandingStack,
  cardInteractive,
  fineHover,
  koreanLineBreak,
  landingCardShell,
} from '../lib/ui-classes';
import { DispatchComparisonSection } from './dispatch-comparison-section';
import { DispatchProgramLineup } from './dispatch-program-lineup';
import { HomeSectionRule } from './home-section-rule';
import { LandingFaqList } from './landing-faq-list';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingStepPanel } from './landing-step-grid';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const institutionCardShell = `flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5 ${landingCardShell}`;

const reviewAccentBorder = {
  violet: 'border-l-violet-400',
  sky: 'border-l-sky-400',
  lime: 'border-l-lime-400',
} as const;

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
  return (
    <div className={audienceLandingStack}>
      <LandingHero
        kicker={dispatchPage.hero.kicker}
        kickerClassName="text-sky-700"
        lines={dispatchPage.hero.lines}
        subtitle={dispatchPage.hero.subtitle}
        media={HOME_MEDIA[dispatchPage.hero.mediaKey]}
        priority
        primaryCta={dispatchPage.heroCtas.primary}
        secondaryCta={dispatchPage.heroCtas.secondary}
      />

      <Section className="overflow-hidden rounded-[1.75rem] border border-sky-200/70 bg-gradient-to-br from-sky-50/80 via-white to-indigo-50/30 px-4 py-5 sm:rounded-[2rem] sm:px-6 sm:py-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">
          {dispatchPage.trustMetrics.eyebrow}
        </p>
        <div className="mt-3 grid grid-cols-3 divide-x divide-sky-100/80">
          {dispatchPage.trustMetrics.items.map((item) => (
            <div key={item.label} className="px-2 py-1 text-center first:pl-0 last:pr-0 sm:px-4 sm:py-2 sm:text-left">
              <p className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">{item.value}</p>
              <p className={`mt-0.5 text-[11px] leading-snug text-slate-600 sm:text-sm ${koreanLineBreak}`}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={dispatchPage.partnerReviews.eyebrow}
          title={dispatchPage.partnerReviews.title}
          accent="sky"
        />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {dispatchPage.partnerReviews.items.map((item) => (
            <article
              key={item.name}
              className={`flex h-full flex-col border-l-4 p-4 sm:p-5 ${landingCardShell} ${reviewAccentBorder[item.accent]}`}
            >
              <p className="text-sm text-amber-500" aria-hidden>
                ★★★★★
              </p>
              <h3 className={`mt-2.5 text-[15px] font-semibold leading-snug text-slate-950 sm:text-base ${koreanLineBreak}`}>
                &ldquo;{item.quote}&rdquo;
              </h3>
              <p className={`mt-2 flex-1 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.body}</p>
              <div className="mt-3.5 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                <p className="mt-0.5 text-xs text-sky-700">{item.org}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <DispatchComparisonSection />
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={dispatchPage.whoFits.eyebrow} title={dispatchPage.whoFits.title} accent="sky" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3">
          {dispatchPage.whoFits.items.map((item) => (
            <article key={item.title} className={institutionCardShell}>
              <h3 className={`text-[15px] font-semibold text-slate-900 sm:text-base ${koreanLineBreak}`}>
                {item.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-[1.75rem] border border-sky-200/70 bg-white px-4 py-5 sm:rounded-[2rem] sm:px-6 sm:py-6">
        <LandingSectionHeading
          eyebrow={dispatchPage.smallSpace.eyebrow}
          title={dispatchPage.smallSpace.title}
          accent="sky"
        />
        <p className={`mt-2 text-[15px] font-semibold text-slate-950 sm:text-lg ${koreanLineBreak}`}>
          {dispatchPage.smallSpace.lead}
        </p>
        <p className={`mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
          {dispatchPage.smallSpace.description}
        </p>
        <ul className="mt-3.5 grid gap-2 sm:grid-cols-3 sm:gap-2.5">
          {dispatchPage.smallSpace.criteria.map((item) => (
            <li
              key={item}
              className={`rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2.5 text-sm leading-snug text-slate-700 sm:px-3.5 sm:py-3 ${koreanLineBreak}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/50 px-4 py-5 sm:px-6 sm:py-6">
        <LandingSectionHeading
          eyebrow={dispatchPage.coreCurriculum.eyebrow}
          title={dispatchPage.coreCurriculum.title}
          accent="sky"
        />
        <div className="mt-3 space-y-2">
          {dispatchPage.coreCurriculum.paragraphs.map((p) => (
            <p key={p} className={`text-sm leading-relaxed text-slate-700 sm:text-[15px] ${koreanLineBreak}`}>
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section>
        <DispatchProgramLineup />
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={dispatchPage.operationTypes.eyebrow}
          title={dispatchPage.operationTypes.title}
          accent="sky"
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:gap-5">
          <div className="grid gap-2.5">
            {dispatchPage.operationTypes.rows.map((row) => (
              <article key={row.label} className={`px-4 py-3.5 sm:px-5 sm:py-4 ${landingCardShell}`}>
                <h3 className="text-[15px] font-semibold text-slate-950 sm:text-base">{row.label}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{row.description}</p>
              </article>
            ))}
          </div>
          <MediaPanel
            media={HOME_MEDIA[dispatchPage.operationTypes.mediaKey]}
            className="aspect-[16/11] min-h-[200px] rounded-[1.25rem] border-slate-200/80 lg:min-h-full"
          />
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <LandingSectionHeading eyebrow={dispatchPage.examples.eyebrow} title={dispatchPage.examples.title} accent="sky" />
          <Link
            href={dispatchPage.examples.href}
            data-track={inferTrackFromHref(dispatchPage.examples.href)}
            data-track-label={dispatchPage.examples.trackLabel}
            className={`shrink-0 text-sm font-semibold text-sky-700 ${fineHover}hover:text-sky-800 ${focusRing}`}
          >
            사례 전체 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3.5">
          {dispatchPage.examples.items.map((item, index) => (
            <Link
              key={item.venue}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={`dispatch-example-${item.venue}`}
              className={`group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm sm:aspect-[4/5] ${cardInteractive} ${focusRing}`}
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="absolute inset-0 h-full w-full rounded-none border-0"
                photoPriority={index === 0}
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/60 bg-white/95 p-3 sm:inset-x-2.5 sm:bottom-2.5">
                <h3 className={`text-sm font-bold leading-snug text-slate-950 ${koreanLineBreak}`}>{item.venue}</h3>
                <p className={`mt-1 text-xs font-medium text-sky-800 ${koreanLineBreak}`}>
                  {item.audience} · {item.operation}
                </p>
                <p className={`mt-1 text-xs leading-snug text-slate-600 ${koreanLineBreak}`}>{item.activity}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <LandingStepPanel steps={dispatchPage.processSteps.steps} accent="sky" columns="5">
          <LandingSectionHeading
            eyebrow={dispatchPage.processSteps.eyebrow}
            title={dispatchPage.processSteps.title}
            lead={dispatchPage.processSteps.lead}
            accent="sky"
          />
        </LandingStepPanel>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={dispatchPage.faq.eyebrow} title={dispatchPage.faq.title} accent="sky" />
        <LandingFaqList items={dispatchPage.faq.items} accent="sky" />
      </Section>

      <HomeSectionRule />

      <LandingFinalCta
        title={dispatchPage.finalCta.title}
        description={dispatchPage.finalCta.description}
        tone="dark"
        backgroundMedia={HOME_MEDIA[dispatchPage.finalCta.mediaKey]}
        links={[{ ...dispatchPage.finalCta.primary, variant: 'on-dark-primary' }]}
      />
    </div>
  );
}
