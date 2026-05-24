'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { privatePage } from '../data/private-page';
import { landingPageStack, landingSectionTitle } from '../lib/ui-classes';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';

const whoCardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-5 shadow-sm shadow-slate-900/[0.03] sm:px-5 sm:py-6';

const locationCardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5';

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

export default function PrivateLanding() {
  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker="학부모 · 개인수업"
        kickerClassName="text-violet-700"
        lines={privatePage.hero.lines}
        subtitle={privatePage.hero.subtitle}
        media={HOME_MEDIA[privatePage.hero.mediaKey]}
        priority
        primaryCta={privatePage.heroCtas.primary}
      />

      <Section className="space-y-5 sm:space-y-7">
        <h2 className={landingSectionTitle}>{privatePage.whoNeeds.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {privatePage.whoNeeds.items.map((item) => (
            <article key={item.title} className={whoCardShell}>
              <h3 className="text-base font-semibold text-slate-900 [word-break:keep-all]">{item.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-6 sm:space-y-8">
        <h2 className={landingSectionTitle}>{privatePage.classCompare.title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-stretch sm:gap-5">
          {privatePage.classCompare.items.map((item, index) => (
            <article
              key={item.title}
              className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white"
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/10] min-h-[160px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col border-t border-slate-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{item.title}</h3>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-7">
        <div>
          <h2 className={landingSectionTitle}>{privatePage.classFormat.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {privatePage.classFormat.lead}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {privatePage.classFormat.locations.map((loc) => (
            <article key={loc.title} className={locationCardShell}>
              <h3 className="text-base font-semibold text-slate-950">{loc.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{loc.description}</p>
            </article>
          ))}
        </div>
        <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80">
          <MediaPanel
            media={HOME_MEDIA[privatePage.classFormat.mediaKey]}
            className="aspect-[21/9] min-h-[140px] rounded-none border-0 sm:min-h-0"
          />
        </div>
      </Section>

      <Section className="overflow-hidden rounded-[1.75rem] border border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 px-5 py-8 sm:rounded-[2rem] sm:px-8 sm:py-10">
        <h2 className={landingSectionTitle}>{privatePage.consultFlow.title}</h2>
        <ol className="mt-5 flex gap-2.5 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
          {privatePage.consultFlow.steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-[10.5rem] shrink-0 flex-col rounded-xl border border-violet-100 bg-white px-3.5 py-3.5 sm:min-w-0"
            >
              <span className="text-[10px] font-semibold tracking-[0.08em] text-violet-600">
                {index + 1}단계
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-900 [word-break:keep-all]">{step.label}</span>
              <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600 [word-break:keep-all]">
                {step.detail}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <h2 className={landingSectionTitle}>{privatePage.faq.title}</h2>
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-3.5">
          {privatePage.faq.items.map((item) => (
            <article
              key={item.q}
              className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5"
            >
              <h3 className="text-sm font-semibold text-slate-950 [word-break:keep-all]">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{item.a}</p>
            </article>
          ))}
        </div>
      </Section>

      <LandingFinalCta
        title={privatePage.finalCta.title}
        description={privatePage.finalCta.description}
        tone="dark"
        backgroundMedia={HOME_MEDIA[privatePage.finalCta.mediaKey]}
        links={[{ ...privatePage.finalCta.primary, variant: 'on-dark-primary' }]}
      />
    </div>
  );
}
