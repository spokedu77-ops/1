'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { programsPage } from '../data/programs-page';
import {
  audienceLandingStack,
  cardInteractive,
  koreanLineBreak,
  landingCardShell,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { HomeSectionRule } from './home-section-rule';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSectionHeading } from './landing-section-heading';
import { MediaPanel } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function ProgramsLanding() {
  const { hero, heroCtas, list, finalCta } = programsPage;

  return (
    <div className={audienceLandingStack}>
      <LandingHero
        kicker={hero.kicker}
        kickerClassName="text-indigo-600"
        lines={[...hero.lines]}
        subtitle={hero.subtitle}
        media={HOME_MEDIA[hero.mediaKey]}
        visualVariant="editorial"
        priority
        primaryCta={heroCtas.primary}
        secondaryCta={heroCtas.secondary}
      />

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={list.eyebrow} title={list.title} lead={list.lead} accent="violet" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={item.trackLabel}
              className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl ${landingCardShell('image')} ${cardInteractive} ${focusRing}`}
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/10] shrink-0 rounded-none border-0 border-b border-slate-200/80"
                photoPriority={index < 2}
              />
              <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                {item.featured ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">대표</p>
                ) : null}
                <h3
                  className={`font-semibold leading-snug text-slate-900 ${item.featured ? 'mt-0.5' : ''} text-sm sm:text-base`}
                >
                  {item.name}
                </h3>
                <p className={`mt-1.5 flex-1 text-xs leading-5 text-slate-600 sm:text-sm ${koreanLineBreak}`}>
                  {item.description}
                </p>
                <span className="mt-3 text-xs font-semibold text-slate-900 transition group-hover:text-indigo-700 sm:text-sm">
                  자세히 보기 →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <LandingFinalCta
        title={finalCta.title}
        description={finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[finalCta.mediaKey]}
        links={[
          {
            label: finalCta.primary.label,
            href: finalCta.primary.href,
            trackLabel: finalCta.primary.trackLabel,
          },
        ]}
      />
    </div>
  );
}
