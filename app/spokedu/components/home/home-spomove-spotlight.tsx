'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import {
  brandBlue,
  brandInk,
  brandPadBlue,
  brandPadGreen,
  brandPadRed,
  brandPadYellow,
  homeBandWhite,
  homeBody,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../../lib/ui-classes';
import { ExternalPhoto } from '../external-photo';
import { MediaPanel } from '../visual';
import { SpomatPhoto } from '../spomat-photo';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

const PAD_COLORS = [brandPadGreen, brandPadRed, brandPadBlue, brandPadYellow] as const;

type HomeSpomoveSpotlightProps = {
  featuredCase?: HomeCaseCard;
};

/**
 * SPOMOVE 핵심 + 단일 사례 증거 (갤러리·이중 섹션 확장 금지)
 */
export function HomeSpomoveSpotlight({ featuredCase }: HomeSpomoveSpotlightProps) {
  const media = HOME_MEDIA[homePage.spomove.mediaKey];
  const reducedMotion = useReducedMotion();
  const { title, titleLine2, lead, flowSteps, useCases, primaryCta, secondaryCta, featuredCase: dataCase } =
    homePage.spomove;
  const caseCard = featuredCase ?? dataCase;

  return (
    <section
      id={homePage.spomove.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} relative overflow-hidden ${homeBandWhite}`}
      aria-labelledby="home-spomove-heading"
    >
      <div className={`relative ${siteContainer}`}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
          <motion.div
            className="relative min-h-[18rem] overflow-hidden rounded-[1.5rem] shadow-[0_18px_50px_rgba(15,33,70,0.1)] ring-1 ring-[#DCE3EE] sm:min-h-[20rem] sm:rounded-[1.75rem]"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <MediaPanel
              media={media}
              className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
              sizes="card2"
              objectFit="cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#0B1F46]/75 via-[#0B1F46]/28 to-transparent p-4 pt-14">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {PAD_COLORS.map((hex) => (
                  <span key={hex} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                ))}
              </div>
              <SpomatPhoto size="md" bare className="shrink-0" />
            </div>
          </motion.div>

          <motion.div
            className="flex min-w-0 flex-col justify-center"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.04 }}
          >
            <div className="flex h-8 items-center gap-2">
              <SpomatPhoto size="sm" bare />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>
                SPOMOVE · SPOMAT
              </p>
            </div>

            <h2
              id="home-spomove-heading"
              className={`${homeSectionH2} mt-3 text-[1.65rem] sm:text-[2rem] lg:text-[2.25rem]`}
            >
              {title}
              {titleLine2 ? (
                <span className="mt-1.5 block text-[0.88em] font-bold leading-snug text-[#37455C]">{titleLine2}</span>
              ) : null}
            </h2>

            <p className={`${homeBody} mt-3 max-w-md text-[15px] leading-relaxed`}>{lead}</p>

            <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="수업 흐름">
              {flowSteps.map((step, index) => (
                <li
                  key={step.label}
                  className="rounded-[0.95rem] border border-[#DCE3EE] bg-white px-2.5 py-2.5 shadow-[0_8px_20px_rgba(15,33,70,0.04)]"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: PAD_COLORS[index] ?? PAD_COLORS[0] }}
                      aria-hidden
                    />
                    <span className={`text-[10px] font-semibold leading-none text-[#6D7B90] ${koreanText}`}>
                      {step.hint}
                    </span>
                  </div>
                  <p className={`mt-1.5 text-[13px] font-bold leading-none text-[#14213A] ${koreanText}`}>
                    {step.label}
                  </p>
                </li>
              ))}
            </ol>

            <ul className="mt-4 space-y-1.5" aria-label="활용 관계">
              {useCases.map((item) => (
                <li key={item.title} className={`text-sm leading-snug text-[#536279] ${koreanText}`}>
                  <span className="font-semibold text-[#14213A]">{item.title}</span>
                  <span className="text-[#A0AEC0]"> · </span>
                  {item.body}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
              <TrackedLink
                href={primaryCta.href}
                trackLabel={primaryCta.trackLabel}
                className={`${siteBtnPrimary} h-11 min-h-0 w-full px-5 py-0 text-sm sm:w-auto ${homeFocusRing}`}
              >
                {primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={secondaryCta.href}
                trackLabel={secondaryCta.trackLabel}
                className={`${siteBtnSecondary} h-11 min-h-0 w-full px-5 py-0 text-sm sm:w-auto ${homeFocusRing}`}
              >
                {secondaryCta.label}
              </TrackedLink>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="mt-8"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>
            현장 증거
          </p>
          <TrackedLink
            href={caseCard.href}
            trackLabel={caseCard.trackLabel}
            className={`${homeFocusRing} mt-3 grid overflow-hidden rounded-[1.35rem] border border-[#DCE3EE] bg-[#F5F7FB] shadow-[0_12px_32px_rgba(15,33,70,0.05)] sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]`}
          >
            <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[11rem]">
              {caseCard.thumbnailSrc ? (
                <ExternalPhoto
                  src={caseCard.thumbnailSrc}
                  alt={`${caseCard.programName} — ${caseCard.venue}`}
                  className="absolute inset-0 h-full w-full"
                  fit="cover"
                  quality={90}
                  sizes="(max-width: 640px) 100vw, 280px"
                />
              ) : (
                <MediaPanel
                  media={HOME_MEDIA[caseCard.mediaKey]}
                  className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
                  sizes="gateCard"
                  objectFit="cover"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-center px-5 py-5 sm:px-6 sm:py-6">
              <p className={`text-[12px] font-semibold ${koreanText}`} style={{ color: brandBlue }}>
                {caseCard.programType} · {caseCard.programName}
              </p>
              <h3 className={`mt-1.5 text-lg font-bold tracking-tight sm:text-xl ${koreanText}`} style={{ color: brandInk }}>
                {caseCard.venue}
              </h3>
              <p className={`mt-1 text-sm font-medium text-[#6D7B90] ${koreanText}`}>{caseCard.audience}</p>
              <p className={`mt-2 line-clamp-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                {caseCard.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: brandBlue }}>
                {caseCard.ctaLabel}
                <HomeChevron />
              </span>
            </div>
          </TrackedLink>
        </motion.div>
      </div>
    </section>
  );
}
