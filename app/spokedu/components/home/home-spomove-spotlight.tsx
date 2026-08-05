'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
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
import { MediaPanel } from '../visual';
import { SpomatPhoto } from '../spomat-photo';
import { TrackedLink } from './tracked-link';

/** 카탈로그 4색 패드 — 초록 · 빨강 · 파랑 · 노랑 */
const PAD_COLORS = [brandPadGreen, brandPadRed, brandPadBlue, brandPadYellow] as const;

/**
 * SPOMOVE 스포트라이트 — 제품 언어(pad)·운영 신뢰 하이브리드
 */
export function HomeSpomoveSpotlight() {
  const media = HOME_MEDIA[homePage.spomove.mediaKey];
  const reducedMotion = useReducedMotion();
  const { title, titleLine2, lead, flowSteps, proofs, useCases, primaryCta, secondaryCta } =
    homePage.spomove;

  return (
    <section
      id={homePage.spomove.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} relative overflow-hidden ${homeBandWhite}`}
      aria-labelledby="home-spomove-heading"
    >
      <div className={`relative ${siteContainer}`}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-12">
          <motion.div
            className="relative min-h-[18rem] overflow-hidden rounded-[1.5rem] shadow-[0_18px_50px_rgba(15,33,70,0.1)] ring-1 ring-[#DCE3EE] sm:min-h-[20rem] lg:h-full lg:min-h-full sm:rounded-[1.75rem]"
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
              <p
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: brandBlue }}
              >
                SPOMOVE · 스포매트
              </p>
            </div>

            <h2
              id="home-spomove-heading"
              className={`${homeSectionH2} mt-3 text-[1.65rem] sm:text-[2rem] lg:text-[2.25rem]`}
            >
              {title}
              {titleLine2 ? (
                <span className="mt-1.5 block text-[0.88em] font-bold leading-snug text-[#37455C]">
                  {titleLine2}
                </span>
              ) : null}
            </h2>

            <p className={`${homeBody} mt-3 max-w-md text-[15px] leading-relaxed`}>{lead}</p>

            <dl className="mt-5 grid grid-cols-3 gap-2" aria-label="운영 포인트">
              {proofs.map((proof) => (
                <div
                  key={proof.label}
                  className="rounded-[1.05rem] border border-[#D6E3FF] bg-[#EAF1FF] px-2.5 py-3 text-center"
                >
                  <dt className={`text-sm font-bold ${koreanText}`} style={{ color: brandInk }}>
                    {proof.value}
                  </dt>
                  <dd className={`mt-1 text-[11px] leading-snug text-[#6D7B90] ${koreanText}`}>
                    {proof.label}
                  </dd>
                </div>
              ))}
            </dl>

            <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="수업 흐름">
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

            <ul className="mt-4 space-y-1.5" aria-label="적용 형태">
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
                commercialRoute="dispatch"
                ctaIntentId={secondaryCta.trackLabel}
                selectionId="spomove"
                className={`${siteBtnSecondary} h-11 min-h-0 w-full px-5 py-0 text-sm sm:w-auto ${homeFocusRing}`}
              >
                {secondaryCta.label}
              </TrackedLink>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
