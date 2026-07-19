'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
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

/** 스포매트 색 순서: 초록 · 빨강 · 파랑 · 노랑 */
const PAD_COLORS = ['#22C55E', '#EF4444', '#3B82F6', '#EAB308'] as const;

/**
 * 좌(사진) · 우(카피) — lg에서 같은 행 높이로 stretch
 * 사진은 absolute fill로 오른쪽 컬럼 높이에 맞춤
 */
export function HomeSpomoveSpotlight() {
  const media = HOME_MEDIA.homeHeroMovement;
  const reducedMotion = useReducedMotion();
  const { title, titleLine2, lead, flowSteps, useCases, primaryCta, secondaryCta } = homePage.spomove;

  return (
    <section
      id={homePage.spomove.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} relative overflow-hidden bg-white`}
      aria-labelledby="home-spomove-heading"
    >
      <div className={`relative ${siteContainer}`}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-10">
          {/* 왼쪽: 그리드 셀 높이를 그대로 채움 */}
          <motion.div
            className="relative min-h-[18rem] overflow-hidden rounded-[1.5rem] shadow-[0_24px_48px_-28px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/70 sm:min-h-[20rem] lg:h-full lg:min-h-full"
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
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 via-black/28 to-transparent p-4 pt-14">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {PAD_COLORS.map((hex) => (
                  <span key={hex} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
                ))}
              </div>
              <SpomatPhoto size="md" bare className="shrink-0" />
            </div>
          </motion.div>

          {/* 오른쪽: 핵심만 — 불필요한 높이 쌓기 최소화 */}
          <motion.div
            className="flex min-w-0 flex-col justify-center"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.04 }}
          >
            <div className="flex h-8 items-center gap-2">
              <SpomatPhoto size="sm" bare />
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#1D4ED8]">SPOMOVE · 스포매트</p>
            </div>

            <h2 id="home-spomove-heading" className={`${homeSectionH2} mt-3 text-[1.55rem] sm:text-[1.85rem] lg:text-[2.05rem]`}>
              {title}
              {titleLine2 ? (
                <span className="mt-1 block text-[0.88em] font-bold leading-snug text-slate-700">{titleLine2}</span>
              ) : null}
            </h2>

            <p className={`${homeBody} mt-2.5 max-w-md text-[15px] leading-relaxed`}>{lead}</p>

            <ol className="mt-4 grid grid-cols-2 gap-1.5" aria-label="수업 흐름">
              {flowSteps.map((step, index) => (
                <li
                  key={step.label}
                  className="rounded-lg border border-slate-200/80 bg-[#F3F7FC] px-2.5 py-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PAD_COLORS[index] ?? PAD_COLORS[0] }}
                      aria-hidden
                    />
                    <span className={`text-[10px] font-semibold leading-none text-slate-500 ${koreanText}`}>
                      {step.hint}
                    </span>
                  </div>
                  <p className={`mt-1 text-[13px] font-bold leading-none text-slate-900 ${koreanText}`}>{step.label}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-3.5 flex flex-wrap items-center gap-1.5" aria-label="적용 형태">
              {useCases.map((item) => (
                <li
                  key={item.title}
                  className="inline-flex h-7 items-center rounded-full bg-slate-900 px-2.5 text-[11px] font-semibold leading-none text-white"
                >
                  {item.title}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
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
      </div>
    </section>
  );
}
