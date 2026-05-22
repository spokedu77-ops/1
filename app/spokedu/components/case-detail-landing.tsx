'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import type { CaseData } from '../data/cases';
import { casesPage } from '../data/cases-page';
import { HOME_MEDIA, type HomeMediaItem } from '../data/home-media';
import { getProgramBySlug } from '../data/programs';
import { SPOKEDU_BASE_PATH } from '../data/site';
import {
  btnPrimary,
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
  const backHref = `${SPOKEDU_BASE_PATH}/cases`;
  const dispatchHref = `${SPOKEDU_BASE_PATH}/contact?type=dispatch`;
  const programHref = relatedProgram?.href ?? `${SPOKEDU_BASE_PATH}/programs`;
  const primaryImage = item.images[0];

  const overviewRows = [
    { label: '기관', value: item.institution },
    { label: '대상', value: item.target },
    { label: '운영 형태', value: item.operationType },
    { label: '프로그램', value: item.program },
    { label: '지역', value: item.location },
  ] as const;

  return (
    <div className={landingPageStack}>
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <Link
              href={backHref}
              data-track={inferTrackFromHref(backHref)}
              data-track-label={`case-detail-back-${item.slug}`}
              className={`text-sm font-semibold text-slate-500 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              ← 운영 사례
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">기관 협업 운영 사례</p>
            <h1 className={`${landingH1} text-slate-950 [word-break:keep-all]`}>{item.title}</h1>
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8 [word-break:keep-all]">
              {item.coreChallenge}
            </p>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" priority sizes="heroSplit" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-4" delay={0.04}>
        <h2 className={landingSectionTitle}>기관 · 대상 · 운영 형태</h2>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overviewRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 [word-break:keep-all]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className={landingSectionTitle}>운영 배경</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
          {item.background}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4" delay={0.06}>
        <h2 className={landingSectionTitle}>수업 구성</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {item.composition.map((point, index) => (
            <motion.li
              key={point}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"
            >
              <p className="text-sm leading-relaxed text-slate-700 [word-break:keep-all]">{point}</p>
            </motion.li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-4" delay={0.07}>
        <h2 className={landingSectionTitle}>현장 운영 장면</h2>
        <div className="grid gap-4 lg:grid-cols-[1.15fr_minmax(0,1fr)]">
          {primaryImage ? (
            <figure className="overflow-hidden rounded-2xl border border-slate-200/80">
              <MediaPanel
                media={imageToMedia(primaryImage.src, primaryImage.alt, primaryImage.title)}
                className="aspect-[4/3] rounded-none border-0 sm:aspect-[16/10]"
                sizes="heroSplit"
                photoPriority
              />
              <figcaption className="border-t border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {primaryImage.caption ?? item.sceneCaption}
              </figcaption>
            </figure>
          ) : null}
          <ul className="flex flex-col gap-2">
            {item.movementGoals.map((goal) => (
              <li
                key={goal}
                className="rounded-xl border border-indigo-100/80 bg-indigo-50/40 px-4 py-3 text-sm text-slate-700 [word-break:keep-all]"
              >
                {goal}
              </li>
            ))}
          </ul>
        </div>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className={landingSectionTitle}>운영 의미</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
          {item.operationalMeaning}
        </p>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.09}>
        <h2 className={landingSectionTitle}>다음 확장 가능성</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
          {item.expansion}
        </p>
      </LandingSection>

      {relatedProgram ? (
        <LandingSection className="space-y-4" delay={0.1}>
          <h2 className={landingSectionTitle}>관련 프로그램</h2>
          <Link
            href={programHref}
            data-track={inferTrackFromHref(programHref)}
            data-track-label={`case-detail-program-${item.slug}`}
            className={`inline-flex text-sm font-semibold text-indigo-700 ${fineHover}hover:text-indigo-900 ${focusRing}`}
          >
            {relatedProgram.title} 프로그램 보기 →
          </Link>
        </LandingSection>
      ) : null}

      <LandingSection
        className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-5 py-8 sm:rounded-3xl sm:px-8 sm:py-10"
        delay={0.12}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <MediaRenderer media={heroMedia} intensity="photo" sizes="full" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl [word-break:keep-all]">
            {casesPage.cta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {casesPage.cta.description}
          </p>
          <div className="mt-6 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href={dispatchHref}
              data-track={inferTrackFromHref(dispatchHref)}
              data-track-label={`case-detail-dispatch-${item.slug}`}
              className={`${btnPrimary} min-h-12 !w-full sm:!min-w-[18rem] sm:!w-auto`}
            >
              {casesPage.cta.label}
            </Link>
            <Link
              href={backHref}
              data-track={inferTrackFromHref(backHref)}
              data-track-label={`case-detail-cta-back-${item.slug}`}
              className={`text-sm font-semibold text-slate-600 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              사례 목록으로
            </Link>
          </div>
        </div>
      </LandingSection>
    </div>
  );
}
