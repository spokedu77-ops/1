'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { MediaPanel } from './visual';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import type { MonthlyRecord } from '../data/monthly';
import { HOME_MEDIA, type HomeMediaItem } from '../data/home-media';
import { SPOKEDU_BASE_PATH } from '../data/site';
import {
  cardInteractive,
  fineHover,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const blockVariants: LandingCardVariant[] = ['glass', 'gradient', 'image'];

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
  const dispatchHref = record.nextInquiryCta.href;
  const heroImage = record.images[0];
  const heroPosterMedia = heroImage
    ? imageToMedia(heroImage.src, heroImage.alt, heroImage.title)
    : heroMedia;

  const relatedLinks = record.relatedCases.filter((link) => link.href !== casesHref);

  return (
    <div className={landingPageStack}>
      <div>
        <Link
          href={backHref}
          data-track={inferTrackFromHref(backHref)}
          data-track-label={`monthly-detail-back-${record.slug}`}
          className={`mb-4 inline-block text-sm font-semibold text-slate-500 ${fineHover}hover:text-indigo-700 ${focusRing}`}
        >
          ← 월간형 체육수업
        </Link>
        <LandingHero
          kicker="월간형 커리큘럼"
          lines={[record.title]}
          subtitle={`${record.month} 기관 정규·방과후 수업의 테마 흐름과 운영 포인트를 정리했습니다.`}
          media={heroPosterMedia}
          priority
        />
      </div>

      {record.images.length > 1 ? (
        <LandingSection className="grid gap-3 sm:grid-cols-2" delay={0.03}>
          {record.images.slice(1).map((image, index) => (
            <MediaPanel
              key={image.src}
              media={imageToMedia(image.src, image.alt, image.title)}
              className="aspect-[16/10] rounded-2xl border border-slate-200/80"
              photoPriority={index === 0}
            />
          ))}
        </LandingSection>
      ) : null}

      <LandingSection className="grid gap-4 sm:grid-cols-2" delay={0.05}>
        <article className={`rounded-2xl p-5 sm:p-6 ${landingCardShell('gradient')}`}>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">이번 달 함께한 기관</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {record.institutions.map((name) => (
              <li
                key={name}
                className="rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700"
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

      <LandingSection className="space-y-4" delay={0.08}>
        <h2 className={landingSectionTitle}>관련 사례</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={casesHref}
            data-track={inferTrackFromHref(casesHref)}
            data-track-label={`monthly-detail-cases-${record.slug}`}
            className={`flex min-h-[120px] flex-col justify-center rounded-2xl p-5 sm:p-6 ${landingCardShell('gradient')} ${cardInteractive} ${focusRing}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">사례 아카이브</p>
            <p className="mt-2 text-lg font-bold text-slate-900">수업 사례 보기</p>
            <span className={`mt-3 text-sm font-semibold text-slate-700 ${fineHover}group-hover:text-indigo-700`}>→</span>
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

      <LandingFinalCta
        title="다음 운영 상담이 필요하신가요?"
        description="수업 사례 확인과 운영 문의로 이어갈 수 있습니다."
        tone="light"
        backgroundMedia={heroMedia}
        links={[
          {
            label: '수업 사례 보기',
            href: casesHref,
            trackLabel: `monthly-detail-cta-cases-${record.slug}`,
            variant: 'primary',
          },
          {
            label: record.nextInquiryCta.label,
            href: dispatchHref,
            trackLabel: `monthly-detail-cta-dispatch-${record.slug}`,
            variant: 'on-light-outline',
          },
          {
            label: '월간 목록으로',
            href: backHref,
            trackLabel: `monthly-detail-cta-back-${record.slug}`,
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
