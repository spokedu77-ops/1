'use client';

import Link from 'next/link';
import { CaseProofCard } from './case-proof-card';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { MediaPanel } from './visual';
import { getCaseBySlug } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { onedayEventProgramPage } from '../data/oneday-event-program-page';
import { landingPageStack, landingSectionTitle, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const cardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5';

const activityCardShell =
  'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white';

export default function OnedayEventProgramLanding() {
  const relatedCases = onedayEventProgramPage.cases.slugs
    .map((slug) => getCaseBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={onedayEventProgramPage.hero.kicker}
        kickerClassName="text-sky-800"
        lines={onedayEventProgramPage.hero.lines}
        subtitle={onedayEventProgramPage.hero.subtitle}
        media={HOME_MEDIA[onedayEventProgramPage.hero.mediaKey]}
        priority
        primaryCta={{
          label: onedayEventProgramPage.heroCta.label,
          href: onedayEventProgramPage.heroCta.href,
          trackLabel: onedayEventProgramPage.heroCta.trackLabel,
        }}
      />

      <LandingSection className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/60 via-white to-cyan-50/40 px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.overview.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {onedayEventProgramPage.overview.body}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.situations.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {onedayEventProgramPage.situations.items.map((item) => (
            <li key={item.title} className={cardShell}>
              <h3 className="text-base font-semibold text-slate-950 [word-break:keep-all]">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.activities.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {onedayEventProgramPage.activities.items.map((item, index) => (
            <li key={item.title} className={activityCardShell}>
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

      <LandingSection className="space-y-4 sm:space-y-5">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.operations.title}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-4">
          {onedayEventProgramPage.operations.items.map((item) => (
            <li key={item.title} className={cardShell}>
              <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.compare.title}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <article className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-4 sm:px-5 sm:py-5">
            <h3 className="text-sm font-semibold text-slate-500">{onedayEventProgramPage.compare.regular.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {onedayEventProgramPage.compare.regular.description}
            </p>
          </article>
          <article className="rounded-xl border border-sky-200/80 bg-sky-50/40 px-4 py-4 sm:px-5 sm:py-5">
            <h3 className="text-sm font-semibold text-sky-900">{onedayEventProgramPage.compare.oneday.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 [word-break:keep-all]">
              {onedayEventProgramPage.compare.oneday.description}
            </p>
          </article>
        </div>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{onedayEventProgramPage.audience.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {onedayEventProgramPage.audience.body}
        </p>
      </LandingSection>

      {relatedCases.length > 0 ? (
        <LandingSection className="space-y-4 sm:space-y-5">
          <div className="flex items-end justify-between gap-2">
            <h2 className={landingSectionTitle}>{onedayEventProgramPage.cases.title}</h2>
            <Link
              href={onedayEventProgramPage.cases.recordsHref}
              data-track={inferTrackFromHref(onedayEventProgramPage.cases.recordsHref)}
              data-track-label="program-oneday-records"
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
                trackPrefix="program-oneday"
              />
            ))}
          </div>
        </LandingSection>
      ) : null}

      <LandingFinalCta
        title={onedayEventProgramPage.finalCta.title}
        description={onedayEventProgramPage.finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[onedayEventProgramPage.hero.mediaKey]}
        links={[
          {
            label: onedayEventProgramPage.finalCta.label,
            href: onedayEventProgramPage.finalCta.href,
            trackLabel: onedayEventProgramPage.finalCta.trackLabel,
            variant: 'primary',
          },
          {
            label: '전체 프로그램 보기',
            href: '/spokedu#program-system',
            trackLabel: 'program-oneday-all',
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
