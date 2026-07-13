'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { privatePage } from '../data/private-page';
import { audienceLandingStack, koreanLineBreak, landingCardShell } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { HomeSectionRule } from './home-section-rule';
import { LandingFaqList } from './landing-faq-list';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingStepPanel } from './landing-step-grid';
import { PrivateCurriculumSection } from './private-curriculum-section';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { PrivateClassFlowGallery } from './private-class-flow-gallery';
import { PrivateMoveReportSection } from './private-move-report-section';
import { PrivateTrustMetrics } from './private-trust-metrics';
import { MediaPanel } from './visual';

const whoCardShell = `flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5 ${landingCardShell}`;
const locationCardShell = `flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5 ${landingCardShell}`;
const reviewCardShell = `flex h-full flex-col border-l-4 border-l-teal-600 p-4 sm:p-5 ${landingCardShell}`;
const privateHeroNeeds = ['운동 자신감', '기초체력', '종목 준비'] as const;

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
    <div className={audienceLandingStack}>
      <LandingHero
        kicker={privatePage.hero.kicker}
        kickerClassName="text-stone-500"
        leading={
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">For Parents</p>
            <div className="flex flex-wrap gap-2" aria-label="개인수업 상담 주제">
              {privateHeroNeeds.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        }
        lines={privatePage.hero.lines}
        subtitle={privatePage.hero.subtitle}
        media={HOME_MEDIA[privatePage.hero.mediaKey]}
        visualVariant="editorial"
        priority
        primaryCta={privatePage.heroCtas.primary}
        secondaryCta={privatePage.heroCtas.secondary}
      />

      <Section className="border-y border-stone-200 bg-white py-8 sm:py-10">
        <PrivateTrustMetrics />
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={privatePage.whoNeeds.eyebrow} title={privatePage.whoNeeds.title} accent="teal" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
          {privatePage.whoNeeds.items.map((item) => (
            <article key={item.title} className={whoCardShell}>
              <h3 className={`text-[15px] font-semibold text-slate-900 sm:text-base ${koreanLineBreak}`}>
                {item.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.instructors.eyebrow}
          title={privatePage.instructors.title}
          accent="teal"
        />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {privatePage.instructors.items.map((item) => (
            <article key={item.name} className={`relative overflow-hidden pt-1 ${landingCardShell}`}>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-teal-700" aria-hidden />
              <div className="flex flex-col items-center px-5 py-6 text-center sm:px-6 sm:py-7">
                <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-[1.375rem] border border-slate-200 bg-slate-100 sm:h-44 sm:w-44">
                  <ExternalPhoto src={item.photo} alt={item.name} className="absolute inset-0" fit="cover" />
                </div>
                <div className="mt-4 flex min-w-0 flex-1 flex-col items-center">
                  <h3 className="text-lg font-bold text-slate-950 sm:text-xl">{item.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-teal-800">{item.degree}</p>
                  <ul className="mt-3 flex flex-wrap justify-center gap-2">
                    {item.badges.map((badge) => (
                      <li
                        key={badge}
                        className={`rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ${koreanLineBreak}`}
                      >
                        {badge}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.classCompare.eyebrow}
          title={privatePage.classCompare.title}
          accent="teal"
        />
        <div className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {privatePage.classCompare.items.map((item, index) => (
            <article key={item.title} className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white">
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/10] min-h-[150px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col border-t border-slate-100 p-4 sm:p-5">
                <h3 className="text-[15px] font-semibold text-slate-950 sm:text-lg">{item.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <PrivateCurriculumSection />
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.classFlow.eyebrow}
          title={privatePage.classFlow.title}
          lead={privatePage.classFlow.lead}
          accent="teal"
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-5">
          <ol className="space-y-2.5">
            {privatePage.classFlow.steps.map((step) => (
              <li key={step.num} className={`px-4 py-3.5 sm:px-5 sm:py-4 ${landingCardShell}`}>
                <span className="text-[10px] font-bold tracking-[0.1em] text-teal-700">{step.num}</span>
                <h3 className={`mt-1 text-[15px] font-semibold text-slate-950 sm:text-base ${koreanLineBreak}`}>
                  {step.title}
                </h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{step.description}</p>
              </li>
            ))}
          </ol>
          <PrivateClassFlowGallery images={privatePage.classFlow.images} />
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.classFormat.eyebrow}
          title={privatePage.classFormat.title}
          lead={privatePage.classFormat.lead}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
          {privatePage.classFormat.locations.map((loc) => (
            <article key={loc.title} className={locationCardShell}>
              <h3 className="text-[15px] font-semibold text-slate-950 sm:text-base">{loc.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{loc.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.sessionCycles.eyebrow}
          title={privatePage.sessionCycles.title}
          lead={privatePage.sessionCycles.lead}
          accent="teal"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {privatePage.sessionCycles.items.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-teal-100 bg-teal-50/30 px-4 py-3.5 sm:px-5 sm:py-4"
            >
              <h3 className="text-[15px] font-semibold text-teal-900 sm:text-base">{item.label}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <PrivateMoveReportSection />
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.reviews.eyebrow}
          title={privatePage.reviews.title}
          lead={privatePage.reviews.lead}
          accent="teal"
        />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {privatePage.reviews.items.map((item) => (
            <article key={item.who + item.course} className={reviewCardShell}>
              <p className="text-sm text-amber-500" aria-hidden>
                ★★★★★
              </p>
              <p className={`mt-2.5 flex-1 text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}>
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="mt-3.5 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-950">{item.who}</p>
                <p className="mt-0.5 text-xs text-teal-800">{item.course}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <LandingStepPanel steps={privatePage.consultFlow.steps} accent="teal" columns="4">
          <LandingSectionHeading
            eyebrow={privatePage.consultFlow.eyebrow}
            title={privatePage.consultFlow.title}
            accent="teal"
          />
        </LandingStepPanel>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={privatePage.faq.eyebrow} title={privatePage.faq.title} accent="teal" />
        <LandingFaqList items={privatePage.faq.items} accent="teal" />
      </Section>

      <HomeSectionRule />

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
