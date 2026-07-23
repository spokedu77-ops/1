'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { aboutPage } from '../data/about-page';
import { inferTrackFromHref } from '../lib/tracking';
import { cardInteractive, fineHover, koreanLineBreak, landingPageStack, landingSectionTitle } from '../lib/ui-classes';
import { AboutFounderSection } from './about-founder-section';
import { AboutHistorySection } from './about-history-section';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';
import { homePage } from '../data/home-page';

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

      <Section className="rounded-2xl border border-slate-200/80 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
          {homePage.trustStrip.eyebrow}
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-x-6">
          {homePage.trustStrip.items.map((item) => (
            <li key={item.label} className="min-w-0">
              <p className={`text-xl font-black tracking-tight text-slate-950 sm:text-2xl ${koreanLineBreak}`}>
                {item.value}
              </p>
              <p className={`mt-1 text-xs font-semibold leading-snug text-slate-500 ${koreanLineBreak}`}>
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      </Section>

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
                <div className={`flex flex-1 flex-col border-t-4 p-5 sm:p-6 ${roleAccent[index] ?? ''}`}>
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
