'use client';

import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { ProgramRelatedProof } from './program-related-proof';
import { MediaPanel } from './visual';
import { HOME_MEDIA } from '../data/home-media';
import { papsProgramPage } from '../data/paps-program-page';
import { programDetailBlocks } from '../data/program-details';
import { landingPageStack, landingSectionTitle } from '../lib/ui-classes';

const elementCardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5';

export default function PapsProgramLanding() {
  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={papsProgramPage.hero.kicker}
        kickerClassName="text-lime-800"
        lines={papsProgramPage.hero.lines}
        subtitle={papsProgramPage.hero.subtitle}
        media={HOME_MEDIA[papsProgramPage.hero.mediaKey]}
        priority
        primaryCta={{
          label: papsProgramPage.heroCta.label,
          href: papsProgramPage.heroCta.href,
          trackLabel: papsProgramPage.heroCta.trackLabel,
        }}
      />

      <LandingSection>
        <ProgramRelatedProof
          fieldRecordSlugs={programDetailBlocks.paps.fieldRecordSlugs}
          trustLine={programDetailBlocks.paps.trustLine}
          trackPrefix="program-paps"
        />
      </LandingSection>

      <LandingSection className="rounded-2xl border border-lime-200/70 bg-gradient-to-br from-lime-50/60 via-white to-emerald-50/40 px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{papsProgramPage.overview.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {papsProgramPage.overview.body}
        </p>
        <p className="mt-3 text-sm font-medium text-lime-900 [word-break:keep-all] sm:text-[15px]">
          {papsProgramPage.overview.emphasis}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{papsProgramPage.fitnessElements.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-3">
          {papsProgramPage.fitnessElements.items.map((item) => (
            <li key={item.title} className={elementCardShell}>
              <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{papsProgramPage.classFlow.title}</h2>
        <ol className="flex gap-2.5 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
          {papsProgramPage.classFlow.steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-[10.5rem] shrink-0 flex-col rounded-xl border border-lime-100 bg-lime-50/30 px-3.5 py-3.5 sm:min-w-0"
            >
              <span className="text-[10px] font-semibold tracking-[0.08em] text-lime-800">{index + 1}단계</span>
              <span className="mt-1 text-sm font-semibold text-slate-900 [word-break:keep-all]">{step.label}</span>
              <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600 [word-break:keep-all]">
                {step.detail}
              </span>
            </li>
          ))}
        </ol>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{papsProgramPage.institutionFit.title}</h2>
        <p className="mt-3 text-base font-semibold text-slate-950 [word-break:keep-all] sm:text-lg">
          {papsProgramPage.institutionFit.lead}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {papsProgramPage.institutionFit.body}
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
          <MediaPanel
            media={HOME_MEDIA.programPlay}
            className="aspect-[21/9] min-h-[120px] rounded-none border-0 sm:min-h-0"
          />
        </div>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{papsProgramPage.audience.title}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-lime-800">적합한 대상</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {papsProgramPage.audience.targets}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-lime-800">운영 방식</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {papsProgramPage.audience.operations}
            </dd>
          </div>
        </dl>
      </LandingSection>

      <LandingFinalCta
        title={papsProgramPage.finalCta.title}
        description={papsProgramPage.finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[papsProgramPage.hero.mediaKey]}
        links={[
          {
            label: papsProgramPage.finalCta.label,
            href: papsProgramPage.finalCta.href,
            trackLabel: papsProgramPage.finalCta.trackLabel,
            variant: 'primary',
          },
          {
            label: '전체 프로그램 보기',
            href: '/spokedu/programs',
            trackLabel: 'program-paps-all',
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
