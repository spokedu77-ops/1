'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import type { CaseData } from '../data/cases';
import { HOME_MEDIA, type HomeMediaItem } from '../data/home-media';
import { getProgramBySlug } from '../data/programs';
import { SPOKEDU_BASE_PATH } from '../data/site';
import {
  btnPrimary,
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

const pillVariants: LandingCardVariant[] = ['glass', 'gradient', 'image'];

function imageToMedia(src: string, alt: string, label: string): HomeMediaItem {
  return {
    id: 'case-detail-photo',
    type: 'image',
    src,
    poster: null,
    alt,
    label,
    fallbackGradient: 'from-indigo-600 via-indigo-800 to-slate-900',
    tone: 'violet',
  };
}

type CaseDetailLandingProps = {
  item: CaseData;
};

export function CaseDetailLanding({ item }: CaseDetailLandingProps) {
  const reducedMotion = useReducedMotion();
  const relatedProgram = getProgramBySlug(item.relatedProgram);
  const heroMedia = HOME_MEDIA[item.mediaKey];
  const inquiryHref =
    item.type === '강사교육'
      ? `${SPOKEDU_BASE_PATH}/contact?type=curriculum`
      : item.type === '개인·소그룹'
        ? `${SPOKEDU_BASE_PATH}/contact?type=private`
        : `${SPOKEDU_BASE_PATH}/contact?type=dispatch`;
  const inquiryLabel =
    item.type === '개인·소그룹' ? '개인수업 상담' : item.type === '강사교육' ? '콘텐츠 문의' : '기관수업 제안';
  const programHref = relatedProgram?.href ?? `${SPOKEDU_BASE_PATH}/programs`;
  const backHref = `${SPOKEDU_BASE_PATH}/cases`;

  const overviewRows = [
    { label: '기관', value: item.institution },
    { label: '유형', value: item.type },
    { label: '프로그램', value: item.program },
    { label: '대상', value: item.target },
    { label: '지역', value: item.location },
    { label: '운영', value: item.date },
  ] as const;

  return (
    <div className={landingPageStack}>
      {/* 1. Hero */}
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <Link
              href={backHref}
              data-track={inferTrackFromHref(backHref)}
              data-track-label={`case-detail-back-${item.slug}`}
              className={`text-sm font-semibold text-slate-500 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              ← 수업 사례
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">현장 사례</p>
            <h1 className={`${landingH1} text-slate-950`}>{item.title}</h1>
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">{item.highlight}</p>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" />
          </div>
        </div>
      </LandingSection>

      {/* 2. 수업 개요 */}
      <LandingSection className="space-y-4" delay={0.04}>
        <h2 className={landingSectionTitle}>수업 개요</h2>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
          <article className={`rounded-2xl p-5 sm:p-6 ${landingCardShell('gradient')}`}>
            <dl className="grid gap-3 sm:grid-cols-2">
              {overviewRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-indigo-100/80 pt-4 text-sm leading-relaxed text-slate-600">{item.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-indigo-100 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
          {item.images[0] ? (
            <MediaPanel
              media={imageToMedia(item.images[0].src, item.images[0].alt, item.images[0].title)}
              className="aspect-[4/3] min-h-[220px] rounded-2xl border border-slate-200/80 lg:aspect-auto lg:min-h-full"
            />
          ) : null}
        </div>
      </LandingSection>

      {/* 3. 아이들이 경험한 움직임 */}
      <LandingSection className="space-y-4" delay={0.06}>
        <h2 className={landingSectionTitle}>아이들이 경험한 움직임</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {item.movementGoals.map((goal, index) => (
            <motion.li
              key={goal}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              className={`rounded-2xl p-4 sm:p-5 ${landingCardShell(pillVariants[index % pillVariants.length] ?? 'image')}`}
            >
              <p className="text-sm font-semibold leading-snug text-slate-900">{goal}</p>
            </motion.li>
          ))}
        </ul>
      </LandingSection>

      {/* 4. 교육 포인트 */}
      <LandingSection className="space-y-4" delay={0.08}>
        <h2 className={landingSectionTitle}>교육 포인트</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {item.educationPoints.map((point, index) => (
            <motion.li
              key={point}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              className={`rounded-2xl p-4 sm:p-5 ${landingCardShell(pillVariants[(index + 1) % pillVariants.length] ?? 'gradient')}`}
            >
              <p className="text-sm leading-relaxed text-slate-700">{point}</p>
            </motion.li>
          ))}
        </ul>
      </LandingSection>

      {/* 5. 관련 프로그램 */}
      {relatedProgram ? (
        <LandingSection className="space-y-4" delay={0.1}>
          <h2 className={landingSectionTitle}>관련 프로그램</h2>
          <Link
            href={programHref}
            data-track={inferTrackFromHref(programHref)}
            data-track-label={`case-detail-program-${item.slug}`}
            className={`group grid overflow-hidden rounded-2xl lg:grid-cols-[1fr_1.2fr] ${landingCardShell('image')} ${fineHover}hover:border-indigo-300 ${cardInteractive} ${focusRing}`}
          >
            <div className="flex flex-col justify-center p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">프로그램</p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">{relatedProgram.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{relatedProgram.description}</p>
              <span className={`mt-4 text-sm font-semibold text-slate-900 ${fineHover}group-hover:text-indigo-700`}>
                프로그램 보기 →
              </span>
            </div>
            <MediaPanel
              media={HOME_MEDIA[item.mediaKey]}
              className="aspect-[16/10] rounded-none border-0 border-l border-slate-200/80 lg:aspect-auto lg:min-h-[200px]"
            />
          </Link>
        </LandingSection>
      ) : null}

      {/* 6. CTA */}
      <LandingSection
        className="relative overflow-hidden rounded-[1.75rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-6 py-10 shadow-xl shadow-indigo-900/10 sm:rounded-[2rem] sm:px-10 sm:py-14"
        delay={0.12}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <MediaRenderer media={heroMedia} photoTone="clear" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">비슷한 수업을 계획 중이신가요?</h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">공간·인원·목적을 알려주시면 사례 기반으로 운영안을 제안드립니다.</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <Link
              href={inquiryHref}
              data-track={inferTrackFromHref(inquiryHref)}
              data-track-label={`case-detail-cta-dispatch-${item.slug}`}
              className={`${btnPrimary} !w-full`}
            >
              {inquiryLabel}
            </Link>
            <Link
              href={programHref}
              data-track={inferTrackFromHref(programHref)}
              data-track-label={`case-detail-cta-program-${item.slug}`}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-indigo-300 ${fineHover}hover:bg-indigo-50 ${focusRing}`}
            >
              프로그램 보기
            </Link>
          </div>
          <Link
            href={backHref}
            data-track={inferTrackFromHref(backHref)}
            data-track-label={`case-detail-cta-back-${item.slug}`}
            className={`mt-5 inline-block text-sm font-semibold text-slate-600 underline-offset-4 ${fineHover}hover:text-indigo-700 ${fineHover}hover:underline ${focusRing}`}
          >
            사례 목록으로 →
          </Link>
        </div>
      </LandingSection>
    </div>
  );
}
