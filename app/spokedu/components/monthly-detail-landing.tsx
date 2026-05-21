'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import type { MonthlyRecord } from '../data/monthly';
import { HOME_MEDIA, type HomeMediaItem } from '../data/home-media';
import { SPOKEDU_BASE_PATH } from '../data/site';
import {
  cardInteractive,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const blockVariants: LandingCardVariant[] = ['glass', 'gradient', 'dark', 'image'];

function imageToMedia(src: string, alt: string, label: string): HomeMediaItem {
  return {
    id: 'monthly-detail-photo',
    type: 'image',
    src,
    poster: null,
    alt,
    label,
    fallbackGradient: 'from-violet-500 via-indigo-700 to-slate-950',
    tone: 'violet',
  };
}

type MonthlyDetailLandingProps = {
  record: MonthlyRecord;
};

export function MonthlyDetailLanding({ record }: MonthlyDetailLandingProps) {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA.proofMonthly;
  const backHref = `${SPOKEDU_BASE_PATH}/monthly`;
  const casesHref = `${SPOKEDU_BASE_PATH}/cases`;
  const dispatchHref = `${SPOKEDU_BASE_PATH}/contact?type=dispatch`;
  const heroImage = record.images[0];

  const relatedLinks = record.relatedCases.filter((link) => link.href !== casesHref);

  return (
    <div className={landingPageStack}>
      {/* 1. Hero */}
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <Link
              href={backHref}
              data-track={inferTrackFromHref(backHref)}
              data-track-label={`monthly-detail-back-${record.slug}`}
              className={`text-sm font-semibold text-slate-500 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              ← 월간 스포키듀
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">월간 기록</p>
            <h1 className={`${landingH1} text-slate-950`}>{record.title}</h1>
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">
              {record.month} 운영을 카드로 정리한 아카이브입니다.
            </p>
          </div>
          <div className={landingHeroVisual}>
            {heroImage ? (
              <MotionPoster media={imageToMedia(heroImage.src, heroImage.alt, heroImage.title)} variant="cinematic" />
            ) : (
              <MotionPoster media={heroMedia} variant="cinematic" />
            )}
          </div>
        </div>
      </LandingSection>

      {record.images.length > 1 ? (
        <LandingSection className="grid gap-3 sm:grid-cols-2" delay={0.03}>
          {record.images.slice(1).map((image) => (
            <MediaPanel
              key={image.src}
              media={imageToMedia(image.src, image.alt, image.title)}
              className="aspect-[16/10] rounded-2xl border border-slate-200/80"
            />
          ))}
        </LandingSection>
      ) : null}

      {/* 2–5. 운영 하이라이트 */}
      <LandingSection className="grid gap-4 sm:grid-cols-2" delay={0.05}>
        <article className={`rounded-2xl p-5 sm:p-6 ${landingCardShell('dark')}`}>
          <h2 className="text-lg font-bold text-white sm:text-xl">이번 달 함께한 기관</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {record.institutions.map((name) => (
              <li
                key={name}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-100"
              >
                {name}
              </li>
            ))}
          </ul>
        </article>
        <article className={`rounded-2xl p-5 sm:p-6 ${landingCardShell('gradient')}`}>
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">운영한 프로그램</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {record.programs.map((name) => (
              <li
                key={name}
                className="rounded-full border border-indigo-200/80 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-800"
              >
                {name}
              </li>
            ))}
          </ul>
        </article>
        <article className={`rounded-2xl p-5 sm:p-6 ${landingCardShell('glass')}`}>
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">움직임 키워드</h2>
          <ul className="mt-4 space-y-2">
            {record.movementPoints.map((point) => (
              <li key={point} className="text-sm font-medium leading-snug text-slate-800">
                {point}
              </li>
            ))}
          </ul>
        </article>
        <article className={`rounded-2xl p-5 sm:p-6 ${landingCardShell('image')}`}>
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">교육 포인트</h2>
          <ul className="mt-4 space-y-2">
            {record.educationPoints.map((point) => (
              <li key={point} className="text-sm leading-relaxed text-slate-700">
                {point}
              </li>
            ))}
          </ul>
        </article>
      </LandingSection>

      {/* 6. 관련 사례 */}
      <LandingSection className="space-y-4" delay={0.08}>
        <h2 className={landingSectionTitle}>관련 사례</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={casesHref}
            data-track={inferTrackFromHref(casesHref)}
            data-track-label={`monthly-detail-cases-${record.slug}`}
            className={`flex min-h-[120px] flex-col justify-center rounded-2xl p-5 sm:p-6 ${landingCardShell('dark')} ${cardInteractive} ${focusRing}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300">사례 아카이브</p>
            <p className="mt-2 text-lg font-bold text-white">수업 사례 보기</p>
            <span className={`mt-3 text-sm font-semibold text-slate-200 ${fineHover}group-hover:text-white`}>→</span>
          </Link>
          {relatedLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: 0.04 * index }}
            >
              <Link
                href={link.href}
                data-track={inferTrackFromHref(link.href)}
                data-track-label={`monthly-detail-case-${record.slug}`}
                className={`flex min-h-[120px] flex-col justify-between rounded-2xl p-5 sm:p-6 ${landingCardShell(blockVariants[index % blockVariants.length] ?? 'glass')} ${cardInteractive} ${focusRing}`}
              >
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{link.label}</p>
                <span className={`text-sm font-semibold text-slate-800 ${fineHover}group-hover:text-indigo-700`}>사례 보기 →</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </LandingSection>

      {/* 7. CTA */}
      <LandingSection
        className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-10 text-white sm:rounded-[2rem] sm:px-10 sm:py-14"
        delay={0.1}
      >
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
          <MediaRenderer media={heroMedia} intensity="soft" animateZoom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/78" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">다음 운영을 준비 중이신가요?</h2>
          <div className="mt-6">
            <HeroCtaStack
              variant="dark"
              primary={{
                href: casesHref,
                label: '수업 사례 보기',
                track: inferTrackFromHref(casesHref),
                trackLabel: `monthly-detail-cta-cases-${record.slug}`,
              }}
              secondary={[
                {
                  href: dispatchHref,
                  label: '기관수업 제안',
                  track: inferTrackFromHref(dispatchHref),
                  trackLabel: `monthly-detail-cta-dispatch-${record.slug}`,
                },
              ]}
            />
          </div>
          <Link
            href={backHref}
            data-track={inferTrackFromHref(backHref)}
            data-track-label={`monthly-detail-cta-back-${record.slug}`}
            className={`mt-5 inline-block text-sm font-semibold text-slate-300 underline-offset-4 ${fineHover}hover:text-white ${fineHover}hover:underline ${focusRing}`}
          >
            월간 목록으로 →
          </Link>
        </div>
      </LandingSection>
    </div>
  );
}
