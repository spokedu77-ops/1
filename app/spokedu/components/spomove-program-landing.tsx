'use client';

import Link from 'next/link';
import { CaseProofCard } from './case-proof-card';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { MediaPanel } from './visual';
import { getCaseBySlug } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { spomoveProgramPage } from '../data/spomove-program-page';
import { landingPageStack, landingSectionTitle, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const valueCardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5';

const activityCardShell =
  'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white';

const darkCardShell =
  'flex h-full flex-col rounded-xl border border-white/12 bg-white/[0.06] p-4 text-white sm:p-5';

export default function SpomoveProgramLanding() {
  const relatedCases = spomoveProgramPage.cases.slugs
    .map((slug) => getCaseBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={spomoveProgramPage.hero.kicker}
        kickerClassName="text-violet-700"
        lines={spomoveProgramPage.hero.lines}
        subtitle={spomoveProgramPage.hero.subtitle}
        media={HOME_MEDIA[spomoveProgramPage.hero.mediaKey]}
        priority
        primaryCta={{
          label: spomoveProgramPage.heroCta.label,
          href: spomoveProgramPage.heroCta.href,
          trackLabel: spomoveProgramPage.heroCta.trackLabel,
        }}
      />

      <LandingSection className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/60 via-white to-indigo-50/40 px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{spomoveProgramPage.overview.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {spomoveProgramPage.overview.body}
        </p>
        <ol className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3" aria-label="SPOMOVE 활동 흐름">
          {spomoveProgramPage.overview.flow.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-violet-200 bg-white px-3.5 py-2 text-sm font-semibold text-violet-900">
                {step}
              </span>
              {index < spomoveProgramPage.overview.flow.length - 1 ? (
                <span className="text-slate-400" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </LandingSection>

      <LandingSection className="grid gap-5 rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[0.42fr_0.58fr] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
            {spomoveProgramPage.padSystem.eyebrow}
          </p>
          <h2 className={`${landingSectionTitle} mt-3`}>{spomoveProgramPage.padSystem.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {spomoveProgramPage.padSystem.body}
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {spomoveProgramPage.padSystem.points.map((point, index) => (
            <li key={point.title} className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
              <p className="text-xs font-bold tabular-nums text-violet-700">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-1 text-base font-bold text-slate-950">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{point.body}</p>
            </li>
          ))}
        </ol>
      </LandingSection>

      <LandingSection className="rounded-2xl bg-[#0B1220] px-5 py-7 text-white sm:px-7 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
          {spomoveProgramPage.reactionLevels.eyebrow}
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[0.38fr_0.62fr] lg:items-start lg:gap-8">
          <div className="min-w-0">
            <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl [word-break:keep-all]">
              {spomoveProgramPage.reactionLevels.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-[15px] [word-break:keep-all]">
              {spomoveProgramPage.reactionLevels.lead}
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {spomoveProgramPage.reactionLevels.items.map((item) => (
              <li key={item.title} className={darkCardShell}>
                <p className="text-xs font-bold text-blue-300">{item.level}</p>
                <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70 [word-break:keep-all]">{item.body}</p>
                <p className="mt-4 text-xs font-semibold text-white/55 [word-break:keep-all]">{item.tags.join(' · ')}</p>
              </li>
            ))}
          </ol>
        </div>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
            {spomoveProgramPage.cognitiveTasks.eyebrow}
          </p>
          <h2 className={`${landingSectionTitle} mt-3`}>{spomoveProgramPage.cognitiveTasks.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {spomoveProgramPage.cognitiveTasks.lead}
          </p>
        </div>
        <ul className="grid gap-3 lg:grid-cols-3">
          {spomoveProgramPage.cognitiveTasks.items.map((item) => (
            <li key={item.title} className={valueCardShell}>
              <h3 className="text-base font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{item.body}</p>
              <p className="mt-4 text-xs font-semibold text-violet-700 [word-break:keep-all]">{item.tags.join(' · ')}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="grid gap-5 rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[0.55fr_0.45fr] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
            {spomoveProgramPage.movementExpansion.eyebrow}
          </p>
          <h2 className={`${landingSectionTitle} mt-3`}>{spomoveProgramPage.movementExpansion.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {spomoveProgramPage.movementExpansion.lead}
          </p>
        </div>
        <ul className="grid gap-3">
          {spomoveProgramPage.movementExpansion.items.map((item) => (
            <li key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-bold text-slate-950">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{item.body}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{spomoveProgramPage.educationalValues.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4">
          {spomoveProgramPage.educationalValues.items.map((item) => (
            <li key={item.title} className={valueCardShell}>
              <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{spomoveProgramPage.activities.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {spomoveProgramPage.activities.items.map((item, index) => (
            <li key={item.title} className={activityCardShell}>
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/9] min-h-[120px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{spomoveProgramPage.institutionFit.title}</h2>
        <p className="mt-3 text-base font-semibold text-slate-950 [word-break:keep-all] sm:text-lg">
          {spomoveProgramPage.institutionFit.lead}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {spomoveProgramPage.institutionFit.body}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{spomoveProgramPage.classFlow.title}</h2>
        <ol className="flex gap-2.5 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
          {spomoveProgramPage.classFlow.steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-[10.5rem] shrink-0 flex-col rounded-xl border border-violet-100 bg-violet-50/30 px-3.5 py-3.5 sm:min-w-0"
            >
              <span className="text-[10px] font-semibold tracking-[0.08em] text-violet-700">{index + 1}단계</span>
              <span className="mt-1 text-sm font-semibold text-slate-900 [word-break:keep-all]">{step.label}</span>
              <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600 [word-break:keep-all]">
                {step.detail}
              </span>
            </li>
          ))}
        </ol>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{spomoveProgramPage.audience.title}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">적합한 대상</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {spomoveProgramPage.audience.targets}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">운영 방식</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {spomoveProgramPage.audience.operations}
            </dd>
          </div>
        </dl>
      </LandingSection>

      {relatedCases.length > 0 ? (
        <LandingSection className="space-y-4 sm:space-y-5">
          <div className="flex items-end justify-between gap-2">
            <h2 className={landingSectionTitle}>{spomoveProgramPage.cases.title}</h2>
            <Link
              href={spomoveProgramPage.cases.recordsHref}
              data-track={inferTrackFromHref(spomoveProgramPage.cases.recordsHref)}
              data-track-label="program-spomove-records"
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
                trackPrefix="program-spomove"
              />
            ))}
          </div>
        </LandingSection>
      ) : null}

      <LandingFinalCta
        title={spomoveProgramPage.finalCta.title}
        description={spomoveProgramPage.finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[spomoveProgramPage.hero.mediaKey]}
        links={[
          {
            label: spomoveProgramPage.finalCta.label,
            href: spomoveProgramPage.finalCta.href,
            trackLabel: spomoveProgramPage.finalCta.trackLabel,
            variant: 'primary',
          },
          {
            label: '전체 프로그램 보기',
            href: '/spokedu/programs',
            trackLabel: 'program-spomove-all',
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
