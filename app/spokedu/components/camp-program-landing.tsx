'use client';

import Link from 'next/link';
import { CaseProofCard } from './case-proof-card';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { ProgramRelatedProof } from './program-related-proof';
import { MediaPanel } from './visual';
import { getCaseBySlug } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { campProgramPage } from '../data/camp-program-page';
import { programDetailBlocks } from '../data/program-details';
import { landingPageStack, landingSectionTitle, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const cardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5';

const blockCardShell =
  'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white';

export default function CampProgramLanding() {
  const relatedCases = campProgramPage.cases.slugs
    .map((slug) => getCaseBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={campProgramPage.hero.kicker}
        kickerClassName="text-amber-800"
        lines={campProgramPage.hero.lines}
        subtitle={campProgramPage.hero.subtitle}
        media={HOME_MEDIA[campProgramPage.hero.mediaKey]}
        priority
        primaryCta={{
          label: campProgramPage.heroCta.label,
          href: campProgramPage.heroCta.href,
          trackLabel: campProgramPage.heroCta.trackLabel,
        }}
      />

      <LandingSection>
        <ProgramRelatedProof
          fieldRecordSlugs={programDetailBlocks.camp.fieldRecordSlugs}
          trustLine={programDetailBlocks.camp.trustLine}
          trackPrefix="program-camp"
        />
      </LandingSection>

      <LandingSection className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/40 px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{campProgramPage.overview.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {campProgramPage.overview.body}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{campProgramPage.programBlocks.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {campProgramPage.programBlocks.items.map((item, index) => (
            <li key={item.title} className={blockCardShell}>
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/9] min-h-[120px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={landingSectionTitle}>{campProgramPage.dailySchedule.title}</h2>
          <p className="text-xs font-medium text-amber-800">{campProgramPage.dailySchedule.note}</p>
        </div>
        <ol className="mt-4 space-y-0 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {campProgramPage.dailySchedule.items.map((item) => (
            <li key={item.time} className="flex gap-4 px-4 py-3 sm:px-5 sm:py-3.5">
              <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-amber-900 sm:w-14">
                {item.time}
              </span>
              <span className="text-sm leading-relaxed text-slate-700 [word-break:keep-all]">{item.label}</span>
            </li>
          ))}
        </ol>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{campProgramPage.compare.title}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <article className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-4 sm:px-5 sm:py-5">
            <h3 className="text-sm font-semibold text-slate-500">{campProgramPage.compare.oneday.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {campProgramPage.compare.oneday.description}
            </p>
          </article>
          <article className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-4 py-4 sm:px-5 sm:py-5">
            <h3 className="text-sm font-semibold text-amber-900">{campProgramPage.compare.camp.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 [word-break:keep-all]">
              {campProgramPage.compare.camp.description}
            </p>
          </article>
        </div>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{campProgramPage.faq.title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-3.5">
          {campProgramPage.faq.items.map((item) => (
            <article key={item.q} className={cardShell}>
              <h3 className="text-sm font-semibold text-slate-950 [word-break:keep-all]">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{item.a}</p>
            </article>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{campProgramPage.institutionFit.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {campProgramPage.institutionFit.body}
        </p>
      </LandingSection>

      {relatedCases.length > 0 ? (
        <LandingSection className="space-y-4 sm:space-y-5">
          <div className="flex items-end justify-between gap-2">
            <h2 className={landingSectionTitle}>{campProgramPage.cases.title}</h2>
            <Link
              href={campProgramPage.cases.recordsHref}
              data-track={inferTrackFromHref(campProgramPage.cases.recordsHref)}
              data-track-label="program-camp-case"
              className={`text-sm ${linkMuted}`}
            >
              사례 보기 →
            </Link>
          </div>
          <div className="grid gap-3 sm:max-w-md">
            {relatedCases.map((item) => (
              <CaseProofCard
                key={item.slug}
                item={item}
                variant="compact"
                cardVariant="image"
                trackPrefix="program-camp"
              />
            ))}
          </div>
        </LandingSection>
      ) : null}

      <LandingFinalCta
        title={campProgramPage.finalCta.title}
        description={campProgramPage.finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[campProgramPage.hero.mediaKey]}
        links={[
          {
            label: campProgramPage.finalCta.label,
            href: campProgramPage.finalCta.href,
            trackLabel: campProgramPage.finalCta.trackLabel,
            variant: 'primary',
          },
          {
            label: '전체 프로그램 보기',
            href: '/spokedu/programs',
            trackLabel: 'program-camp-all',
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
