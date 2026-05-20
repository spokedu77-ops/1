'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { MonthlyRecordCard } from './monthly-record-card';
import { MediaRenderer, MotionPoster } from './visual';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import { HOME_MEDIA } from '../data/home-media';
import type { HomeMediaKey } from '../data/home-media';
import { getMonthlyRecordBySlug, monthlyRecords } from '../data/monthly';
import { monthlyPage } from '../data/monthly-page';
import { cardInteractive, fineHover, landingH1, landingHeroShell, landingPageStack } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const highlightVariants: LandingCardVariant[] = ['glass', 'gradient', 'image', 'dark'];
const archiveMediaKeys: HomeMediaKey[] = ['proofClass', 'proofLounge'];
const archiveVariants: LandingCardVariant[] = ['image', 'gradient'];

export function MonthlyLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[monthlyPage.heroMediaKey];
  const ctaMedia = HOME_MEDIA[monthlyPage.ctaMediaKey];
  const featured = getMonthlyRecordBySlug('2026-05') ?? monthlyRecords[0];
  const archiveRecords = monthlyPage.archiveSlugs
    .map((slug) => getMonthlyRecordBySlug(slug))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className={landingPageStack}>
      <LandingSection
        className={`${landingHeroShell} overflow-hidden border-violet-200/50 bg-gradient-to-b from-indigo-50/60 via-white to-lime-50/30`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.1),transparent_42%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Monthly SPOKEDU</p>
            <h1 className={`whitespace-pre-line ${landingH1} text-slate-950`}>{monthlyPage.hero.title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">{monthlyPage.hero.subtitle}</p>
            <div className="lg:hidden">
              <MotionPoster media={heroMedia} variant="compact" />
            </div>
            {featured ? (
              <HeroCtaStack
                primary={{
                  href: `/spokedu/monthly/${featured.slug}`,
                  label: '이번 달 기록 보기',
                  track: 'cta-records-monthly',
                  trackLabel: 'monthly-hero-featured',
                }}
                secondary={[
                  { href: monthlyPage.cta.primary.href, label: monthlyPage.cta.primary.label, trackLabel: monthlyPage.cta.primary.trackLabel },
                ]}
              />
            ) : null}
          </div>
          <div className="hidden lg:block">
            <MotionPoster media={heroMedia} variant="hero" />
          </div>
        </div>
      </LandingSection>

      {featured ? (
        <LandingSection className="space-y-3" delay={0.05}>
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">이번 달 하이라이트</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl ring-1 ring-white/10">
            <div className="relative aspect-[21/9] max-h-[200px] sm:max-h-[240px]">
              <MediaRenderer media={HOME_MEDIA.proofClass} intensity="soft" className="absolute inset-0" />
              <div className="pointer-events-none absolute inset-0 bg-slate-950/55" />
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300">{featured.month}</p>
                <p className="text-base font-bold sm:text-lg">{featured.title}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:gap-2.5 sm:p-4">
              {monthlyPage.highlightLabels.map((label, index) => {
                const content =
                  label === '함께한 기관'
                    ? featured.institutions.join(' · ')
                    : label === '운영한 프로그램'
                      ? featured.programs.join(' · ')
                      : label === '아이들이 경험한 움직임'
                        ? featured.movementPoints.join(' · ')
                        : featured.educationPoints[0];
                return (
                  <div
                    key={label}
                    className={`rounded-xl p-2.5 sm:p-3 ${landingCardShell(highlightVariants[index] ?? 'glass')}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-indigo-600">{label}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-700">{content}</p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/10 px-3 pb-3 sm:px-4 sm:pb-4">
              <Link
                href={`/spokedu/monthly/${featured.slug}`}
                data-track="cta-records-monthly"
                className={`text-sm font-semibold text-white ${fineHover}hover:text-sky-200`}
              >
                {featured.month} 상세 기록 →
              </Link>
            </div>
          </div>
        </LandingSection>
      ) : null}

      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">월간 기록</h2>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-smooth [scrollbar-width:thin] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0">
          {archiveRecords.map((record, index) => (
            <motion.div
              key={record.slug}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.06 * index }}
              className="w-[min(88vw,340px)] shrink-0 snap-start sm:w-auto"
            >
              <MonthlyRecordCard
                record={record}
                mediaKey={archiveMediaKeys[index] ?? 'trackDispatch'}
                cardVariant={archiveVariants[index] ?? 'image'}
              />
            </motion.div>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.1}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">기록이 커리큘럼이 되는 과정</h2>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {monthlyPage.curriculumFlow.map((step, index) => (
            <motion.article
              key={step.step}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              className={`rounded-2xl p-4 ${landingCardShell((['image', 'gradient', 'dark'] as const)[index] ?? 'image')}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Step {step.step}</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{step.description}</p>
            </motion.article>
          ))}
        </div>
      </LandingSection>

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-8 text-white shadow-xl ring-1 ring-white/10 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.12}
      >
        <div className="pointer-events-none absolute inset-0 opacity-85" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/82" aria-hidden />
        <div className="relative max-w-xl">
          <h2 className="text-xl font-bold sm:text-2xl">다음 달도 함께 운영해 보세요</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">현장 기록을 바탕으로 맞춤 프로그램을 제안합니다.</p>
          <div className="mt-5">
            <HeroCtaStack
              variant="dark"
              primary={{
                href: monthlyPage.cta.primary.href,
                label: monthlyPage.cta.primary.label,
                track: inferTrackFromHref(monthlyPage.cta.primary.href),
                trackLabel: monthlyPage.cta.primary.trackLabel,
              }}
              secondary={[
                {
                  href: monthlyPage.cta.secondary.href,
                  label: monthlyPage.cta.secondary.label,
                  track: inferTrackFromHref(monthlyPage.cta.secondary.href),
                  trackLabel: monthlyPage.cta.secondary.trackLabel,
                },
              ]}
            />
          </div>
        </div>
      </LandingSection>
    </div>
  );
}
