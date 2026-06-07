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
import { PrivateHeroTrustBand } from './private-hero-stats';
import { PrivateMoveReportSection } from './private-move-report-section';
import { MediaPanel } from './visual';

const whoCardShell = `flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5 ${landingCardShell}`;
const locationCardShell = `flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5 ${landingCardShell}`;

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
  const [featuredFlowImage, ...flowImages] = privatePage.classFlow.images;

  return (
    <div className={audienceLandingStack}>
      <div className="space-y-4">
        <LandingHero
          kicker={privatePage.hero.kicker}
          kickerClassName="text-violet-700"
          lines={privatePage.hero.lines}
          subtitle={privatePage.hero.subtitle}
          media={HOME_MEDIA[privatePage.hero.mediaKey]}
          priority
          primaryCta={privatePage.heroCtas.primary}
          secondaryCta={privatePage.heroCtas.secondary}
        />
        <PrivateHeroTrustBand trustBadge={privatePage.hero.trustBadge} />
      </div>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={privatePage.whoNeeds.eyebrow} title={privatePage.whoNeeds.title} accent="violet" />
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
          accent="violet"
        />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {privatePage.instructors.items.map((item) => (
            <article key={item.name} className={`overflow-hidden ${landingCardShell}`}>
              <div className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
                <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-20">
                  <ExternalPhoto src={item.photo} alt={item.name} className="absolute inset-0" fit="cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-slate-950 sm:text-base">{item.name}</h3>
                  <p className="mt-0.5 text-sm text-slate-600">{item.degree}</p>
                  <ul className="mt-2 space-y-1">
                    {item.badges.map((badge) => (
                      <li key={badge} className={`text-xs leading-snug text-slate-600 ${koreanLineBreak}`}>
                        · {badge}
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
          accent="violet"
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
          accent="violet"
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-5">
          <ol className="space-y-2.5">
            {privatePage.classFlow.steps.map((step) => (
              <li key={step.num} className={`px-4 py-3.5 sm:px-5 sm:py-4 ${landingCardShell}`}>
                <span className="text-[10px] font-bold tracking-[0.1em] text-violet-600">{step.num}</span>
                <h3 className={`mt-1 text-[15px] font-semibold text-slate-950 sm:text-base ${koreanLineBreak}`}>
                  {step.title}
                </h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {featuredFlowImage ? (
              <div className="relative min-h-[180px] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 sm:col-span-2 sm:min-h-[200px]">
                <ExternalPhoto
                  src={featuredFlowImage.src}
                  alt={featuredFlowImage.alt}
                  className="absolute inset-0"
                  fit="contain"
                  priority
                />
              </div>
            ) : null}
            {flowImages.map((img) => (
              <div
                key={img.alt}
                className="relative min-h-[160px] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 sm:min-h-[180px]"
              >
                <ExternalPhoto src={img.src} alt={img.alt} className="absolute inset-0" fit="contain" />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.classFormat.eyebrow}
          title={privatePage.classFormat.title}
          lead={privatePage.classFormat.lead}
          accent="violet"
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
          accent="violet"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {privatePage.sessionCycles.items.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-3.5 sm:px-5 sm:py-4"
            >
              <h3 className="text-[15px] font-semibold text-violet-900 sm:text-base">{item.label}</h3>
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
          accent="violet"
        />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {privatePage.reviews.items.map((item) => (
            <article key={item.who + item.course} className={`flex h-full flex-col p-4 sm:p-5 ${landingCardShell}`}>
              <p className="text-sm text-amber-500" aria-hidden>
                ★★★★★
              </p>
              <p className={`mt-2.5 flex-1 text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}>
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="mt-3.5 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-950">{item.who}</p>
                <p className="mt-0.5 text-xs text-violet-700">{item.course}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <LandingStepPanel steps={privatePage.consultFlow.steps} accent="violet" columns="4">
          <LandingSectionHeading
            eyebrow={privatePage.consultFlow.eyebrow}
            title={privatePage.consultFlow.title}
            accent="violet"
          />
        </LandingStepPanel>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={privatePage.faq.eyebrow} title={privatePage.faq.title} accent="violet" />
        <LandingFaqList items={privatePage.faq.items} accent="violet" />
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
