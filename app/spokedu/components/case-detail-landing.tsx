'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { MediaPanel } from './visual';
import type { CaseData } from '../data/cases';
import { casesPage } from '../data/cases-page';
import { HOME_MEDIA, type HomeMediaItem } from '../data/home-media';
import { getProgramBySlug } from '../data/programs';
import { HOME_PROGRAM_SYSTEM_HREF, SPOKEDU_BASE_PATH } from '../data/site';
import { fineHover, landingPageStack, landingSectionTitle } from '../lib/ui-classes';
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
  const programHref = relatedProgram?.href ?? HOME_PROGRAM_SYSTEM_HREF;
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
      <div>
        <Link
          href={backHref}
          data-track={inferTrackFromHref(backHref)}
          data-track-label={`case-detail-back-${item.slug}`}
          className={`mb-4 inline-block text-sm font-semibold text-slate-500 ${fineHover}hover:text-indigo-700 ${focusRing}`}
        >
          ← 운영 사례
        </Link>
        <LandingHero
          kicker="기관 협업 운영 사례"
          lines={[item.title]}
          subtitle={item.coreChallenge}
          media={heroMedia}
          priority
        />
      </div>

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

      <LandingFinalCta
        title={casesPage.cta.title}
        description={casesPage.cta.description}
        tone="light"
        backgroundMedia={heroMedia}
        links={[
          {
            label: casesPage.cta.label,
            href: dispatchHref,
            trackLabel: `case-detail-dispatch-${item.slug}`,
            variant: 'primary',
          },
          {
            label: '사례 목록으로',
            href: backHref,
            trackLabel: `case-detail-cta-back-${item.slug}`,
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
