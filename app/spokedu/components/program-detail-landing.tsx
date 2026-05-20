'use client';

import Link from 'next/link';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { MediaPanel } from './visual';
import { getCaseBySlug } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { programDetailBlocks } from '../data/program-details';
import { getProgramBySlug, type ProgramSlug } from '../data/programs';
import { cardInteractive, fineHover, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type ProgramDetailLandingProps = {
  slug: Extract<ProgramSlug, 'spomove' | 'paps' | 'oneday-event' | 'camp'>;
};

export function ProgramDetailLanding({ slug }: ProgramDetailLandingProps) {
  const program = getProgramBySlug(slug);
  const detail = programDetailBlocks[slug];
  const relatedCases = detail.caseSlugs
    .map((caseSlug) => getCaseBySlug(caseSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!program) return null;

  const heroMedia = HOME_MEDIA[detail.mediaKey];

  return (
    <div className={landingPageStack}>
      <LandingSection className={`${landingHeroShell} border-slate-200 bg-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_42%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{program.category}</p>
            <h1 className={`${landingH1} text-slate-950`}>{program.title}</h1>
            <p className="max-w-xl text-sm leading-6 text-slate-700 sm:text-base">{detail.heroSubtitle}</p>
            <div className="lg:hidden">
              <MediaPanel media={heroMedia} className="aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200/90" />
            </div>
            <HeroCtaStack
              primary={{
                href: detail.primaryCta.href,
                label: detail.primaryCta.label,
                track: inferTrackFromHref(detail.primaryCta.href),
                trackLabel: detail.primaryCta.trackLabel,
              }}
              secondary={[
                {
                  href: detail.secondaryCta.href,
                  label: detail.secondaryCta.label,
                  track: inferTrackFromHref(detail.secondaryCta.href),
                  trackLabel: detail.secondaryCta.trackLabel,
                },
              ]}
            />
          </div>
          <div className="hidden lg:block">
            <MediaPanel media={heroMedia} className="aspect-[5/3] overflow-hidden rounded-2xl border border-slate-200/90" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">이 프로그램이 필요한 이유</h2>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {detail.whyPoints.map((point) => (
            <li key={point} className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
              <p className="text-sm font-medium leading-5 text-slate-800">{point}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">핵심 활동 구성</h2>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {detail.activities.map((item, index) => (
            <li key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
                STEP 0{index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{item.description}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" delay={0.1}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">적용 대상</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.targets.map((target) => (
            <span
              key={target}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 sm:text-sm"
            >
              {target}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 sm:text-sm">연결 축 · {program.connectedTracks.join(' / ')}</p>
      </LandingSection>

      {relatedCases.length > 0 ? (
        <LandingSection className="space-y-3" delay={0.12}>
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-950 sm:text-xl">실제 운영 예시</h2>
            <Link
              href="/spokedu/records"
              data-track={inferTrackFromHref('/spokedu/records')}
              data-track-label="program-records-link"
              className={`text-sm ${linkMuted}`}
            >
              현장기록 →
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {relatedCases.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={`program-case-${slug}-${item.slug}`}
                className={`group rounded-2xl border border-slate-200 bg-white p-4 ${cardInteractive} ${focusRing}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
                  {item.institution}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{item.summary}</p>
                <span className={`mt-2 inline-flex text-xs font-semibold text-slate-900 ${fineHover}group-hover:text-indigo-700`}>
                  사례 보기 →
                </span>
              </Link>
            ))}
          </div>
        </LandingSection>
      ) : null}

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-8 text-white shadow-xl ring-1 ring-white/10 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.15}
      >
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
          <MediaPanel media={heroMedia} className="h-full rounded-none border-0" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/85" aria-hidden />
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold sm:text-2xl">{detail.finalCtaTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{detail.finalCtaSub}</p>
          <div className="mt-5">
            <HeroCtaStack
              variant="dark"
              primary={{
                href: detail.primaryCta.href,
                label: detail.primaryCta.label,
                track: inferTrackFromHref(detail.primaryCta.href),
                trackLabel: detail.primaryCta.trackLabel,
              }}
              secondary={[
                {
                  href: detail.secondaryCta.href,
                  label: detail.secondaryCta.label,
                  track: inferTrackFromHref(detail.secondaryCta.href),
                  trackLabel: detail.secondaryCta.trackLabel,
                },
              ]}
            />
          </div>
          <Link
            href="/spokedu/programs"
            data-track={inferTrackFromHref('/spokedu/programs')}
            data-track-label="program-all-link"
            className={`mt-4 inline-block text-sm text-slate-300 underline-offset-2 ${fineHover}hover:text-white ${fineHover}hover:underline ${focusRing}`}
          >
            전체 프로그램 보기 →
          </Link>
        </div>
      </LandingSection>
    </div>
  );
}
