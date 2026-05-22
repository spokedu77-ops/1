'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { CaseProofCard } from './case-proof-card';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import { getCaseBySlug } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { programDetailBlocks, type ProgramDetailSlug } from '../data/program-details';
import { getProgramBySlug } from '../data/programs';
import {
  btnPrimary,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
  linkMuted,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const whyVariants: LandingCardVariant[] = ['glass', 'gradient', 'image'];
const activityVariants: LandingCardVariant[] = ['image', 'gradient', 'glass'];

type ProgramDetailLandingProps = {
  slug: ProgramDetailSlug;
};

export function ProgramDetailLanding({ slug }: ProgramDetailLandingProps) {
  const reducedMotion = useReducedMotion();
  const program = getProgramBySlug(slug);
  const detail = programDetailBlocks[slug];
  const relatedCases = detail.caseSlugs
    .map((caseSlug) => getCaseBySlug(caseSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!program) return null;

  const heroMedia = HOME_MEDIA[detail.mediaKey];

  return (
    <div className={landingPageStack}>
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{program.category}</p>
            <h1 className={`${landingH1} text-slate-950`}>{program.title}</h1>
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">{detail.heroSubtitle}</p>
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
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className={landingSectionTitle}>이 프로그램이 필요한 이유</h2>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {detail.whyPoints.map((point, index) => (
            <li
              key={point}
              className={`rounded-2xl p-3.5 sm:p-4 ${landingCardShell(whyVariants[index] ?? 'image')}`}
            >
              <p className="text-sm font-medium leading-5 text-slate-800">{point}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className={landingSectionTitle}>핵심 활동 구성</h2>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {detail.activities.map((item, index) => {
            const variant = activityVariants[index] ?? 'image';
            return (
              <li
                key={item.title}
                className={`overflow-hidden rounded-2xl ${landingCardShell(variant)}`}
              >
                <MediaPanel
                  media={HOME_MEDIA[item.mediaKey]}
                  className="aspect-[16/8] rounded-none border-0 border-b border-slate-200/80"
                />
                <div className="p-3.5 sm:p-4">
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${variant === 'dark' ? 'text-sky-300' : 'text-indigo-600'}`}
                  >
                    STEP 0{index + 1}
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {item.title}
                  </p>
                  <p
                    className={`mt-1 line-clamp-2 text-xs leading-5 sm:text-sm ${variant === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
                  >
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </LandingSection>

      <LandingSection className={`rounded-2xl p-4 sm:p-5 ${landingCardShell('gradient')}`} delay={0.1}>
        <h2 className={landingSectionTitle}>적용 대상</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.targets.map((target) => (
            <span
              key={target}
              className="rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 sm:text-sm"
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
            <h2 className={landingSectionTitle}>실제 운영 예시</h2>
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
            {relatedCases.map((item, index) => (
              <motion.div
                key={item.slug}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4, delay: 0.05 * index }}
              >
                <CaseProofCard
                  item={item}
                  variant="compact"
                  cardVariant={index % 2 === 0 ? 'image' : 'glass'}
                  trackPrefix={`program-${slug}`}
                />
              </motion.div>
            ))}
          </div>
        </LandingSection>
      ) : null}

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-5 py-8 shadow-xl shadow-indigo-900/10 ring-1 ring-white/60 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.15}
      >
        <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden>
          <MediaRenderer media={heroMedia} intensity="photo" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/80" aria-hidden />
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{detail.finalCtaTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{detail.finalCtaSub}</p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Link
              href={detail.primaryCta.href}
              data-track={inferTrackFromHref(detail.primaryCta.href)}
              data-track-label={detail.primaryCta.trackLabel}
              className={`${btnPrimary} !w-full`}
            >
              {detail.primaryCta.label}
            </Link>
            <Link
              href={detail.secondaryCta.href}
              data-track={inferTrackFromHref(detail.secondaryCta.href)}
              data-track-label={detail.secondaryCta.trackLabel}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-indigo-300 ${fineHover}hover:bg-indigo-50 ${focusRing}`}
            >
              {detail.secondaryCta.label}
            </Link>
          </div>
          <Link
            href="/spokedu/programs"
            data-track={inferTrackFromHref('/spokedu/programs')}
            data-track-label="program-all-link"
            className={`mt-4 inline-block text-sm text-slate-600 underline-offset-2 ${fineHover}hover:text-indigo-700 ${fineHover}hover:underline ${focusRing}`}
          >
            전체 프로그램 보기 →
          </Link>
        </div>
      </LandingSection>
    </div>
  );
}
