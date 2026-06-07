'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { aboutPage } from '../data/about-page';
import { inferTrackFromHref } from '../lib/tracking';
import { cardInteractive, fineHover, landingPageStack, landingSectionTitle } from '../lib/ui-classes';
import { AboutFounderSection } from './about-founder-section';
import { AboutHistorySection } from './about-history-section';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const roleAccent = [
  'border-t-indigo-400/80',
  'border-t-sky-400/80',
  'border-t-violet-400/80',
] as const;

function Section({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
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

export function AboutLanding() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={aboutPage.hero.kicker}
        lines={aboutPage.hero.lines}
        subtitle={aboutPage.hero.subtitle}
        media={HOME_MEDIA[aboutPage.hero.mediaKey]}
        visualVariant="editorial"
        priority
      />

      <Section className="rounded-2xl border border-slate-200/80 bg-white px-4 py-6 shadow-sm sm:px-6 sm:py-8 lg:px-8">
        <AboutFounderSection />
        <div className="my-8 border-t border-slate-100 sm:my-10" aria-hidden />
        <AboutHistorySection />
      </Section>

      <Section className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{aboutPage.whatWeDo.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4">
          {aboutPage.whatWeDo.cards.map((card, index) => (
            <motion.div
              key={card.href}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.08 * index }}
              className="flex min-h-0"
            >
              <Link
                href={card.href}
                data-track={inferTrackFromHref(card.href)}
                data-track-label={card.trackLabel}
                className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${cardInteractive} ${focusRing}`}
              >
                <MediaPanel
                  media={HOME_MEDIA[card.mediaKey]}
                  className="aspect-[16/10] shrink-0 rounded-none border-0"
                  sizes="card3"
                  photoPriority={index === 0}
                />
                <div className={`flex flex-1 flex-col border-t-4 p-4 sm:p-5 ${roleAccent[index] ?? ''}`}>
                  <h3 className="text-base font-bold leading-snug text-slate-950 [word-break:keep-all] sm:text-lg">
                    {card.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                    {card.description}
                  </p>
                  <span
                    className={`mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 ${fineHover}group-hover:text-indigo-900`}
                  >
                    {card.linkLabel} →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 px-5 py-6 sm:px-7 sm:py-8">
        <h2 className={landingSectionTitle}>{aboutPage.philosophy.title}</h2>
        <p className="mt-3 text-base font-medium text-slate-800 [word-break:keep-all] sm:text-lg">
          {aboutPage.philosophy.lead}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
          {aboutPage.philosophy.body}
        </p>
      </Section>

      <Section className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{aboutPage.fieldTrust.title}</h2>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_minmax(0,1fr)] lg:items-stretch">
          <div>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
              {aboutPage.fieldTrust.lead}
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {aboutPage.fieldTrust.operations.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 [word-break:keep-all]"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={aboutPage.fieldTrust.recordsHref}
                data-track={inferTrackFromHref(aboutPage.fieldTrust.recordsHref)}
                data-track-label="about-field-records"
                className={`text-sm font-semibold text-indigo-700 ${fineHover}hover:text-indigo-900 ${focusRing}`}
              >
                현장 기록 보기 →
              </Link>
              <Link
                href={aboutPage.fieldTrust.casesHref}
                data-track={inferTrackFromHref(aboutPage.fieldTrust.casesHref)}
                data-track-label="about-field-cases"
                className={`text-sm font-semibold text-indigo-700 ${fineHover}hover:text-indigo-900 ${focusRing}`}
              >
                운영 사례 보기 →
              </Link>
            </div>
          </div>
          <MediaPanel
            media={HOME_MEDIA[aboutPage.fieldTrust.mediaKey]}
            className="aspect-[4/3] min-h-[200px] overflow-hidden rounded-2xl border border-slate-200/80 lg:aspect-auto lg:min-h-full"
            sizes="card2"
          />
        </div>
      </Section>

      <Section className="space-y-4">
        <h2 className={landingSectionTitle}>{aboutPage.team.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4">
          {aboutPage.team.roles.map((role, index) => (
            <motion.article
              key={role.title}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"
            >
              <h3 className="text-base font-bold text-slate-950 [word-break:keep-all]">{role.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {role.description}
              </p>
            </motion.article>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className={landingSectionTitle}>{aboutPage.expansion.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
          {aboutPage.expansion.body}
        </p>
      </Section>

      <LandingFinalCta
        title={aboutPage.finalCta.title}
        description={aboutPage.finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[aboutPage.finalCta.mediaKey]}
        links={aboutPage.finalCta.links.map((item, index) => ({
          ...item,
          variant: index === 0 ? 'primary' : 'on-light-outline',
        }))}
      />
    </div>
  );
}
