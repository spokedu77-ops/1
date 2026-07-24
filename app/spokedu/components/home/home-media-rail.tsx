'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import { externalLinkProps } from '../../lib/external-link';
import {
  fineHover,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimaryOnHero,
  siteBtnSecondaryOnDark,
  siteContainer,
} from '../../lib/ui-classes';
import { ExternalPhoto } from '../external-photo';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

const INTERVAL_MS = 5000;

type CaseCardWithThumb = HomeCaseCard & { thumbnailSrc?: string };

type HomeMediaRailProps = {
  caseCards: CaseCardWithThumb[];
};

/**
 * 수업 사례 갤러리 — 현장 사진 중심, 수동·자동 전환
 */
export function HomeMediaRail({ caseCards }: HomeMediaRailProps) {
  const items = caseCards.length > 0 ? caseCards : homePage.cases.cards;
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = items[index] ?? items[0];
  const count = items.length;
  const youtubeHref = `https://www.youtube.com/watch?v=${homePage.hero.youtubeVideoId}`;

  useEffect(() => {
    if (reducedMotion || paused || count < 2) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused, reducedMotion]);

  if (!active) return null;

  const goPrev = () => setIndex((prev) => (prev - 1 + count) % count);
  const goNext = () => setIndex((prev) => (prev + 1) % count);

  return (
    <section
      id={homePage.cases.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-[#0B1F46] text-white`}
      aria-labelledby="home-media-rail-heading"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className={siteContainer}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#9FC0FF]">수업 사례</p>
            <h2 id="home-media-rail-heading" className={`${homeSectionH2} mt-3 text-white`}>
              {homePage.cases.title}
            </h2>
            <p className={`mt-3 text-[15px] leading-relaxed text-[#CFDAEA] sm:text-base ${koreanText}`}>
              {homePage.cases.lead}
            </p>
            <a
              href={youtubeHref}
              {...externalLinkProps}
              data-track="external-youtube"
              data-track-label={homePage.hero.youtubeTrackLabel}
              className={`mt-3 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#9FC0FF] underline-offset-4 ${fineHover}hover:text-white ${fineHover}hover:underline ${homeFocusRing} rounded-sm`}
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#9FC0FF]/50"
                aria-hidden
              >
                <span className="ml-0.5 border-y-[4px] border-l-[7px] border-y-transparent border-l-[#EAF1FF]" />
              </span>
              {homePage.hero.youtubeTitle}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <TrackedLink
              href={homePage.cases.recordsCta.href}
              trackLabel={homePage.cases.recordsCta.trackLabel}
              className={`${siteBtnSecondaryOnDark} h-11 min-h-0 px-5 py-0 text-sm ${homeFocusRing}`}
            >
              {homePage.cases.recordsCta.label}
            </TrackedLink>
            <TrackedLink
              href={homePage.cases.consultCta.href}
              trackLabel={homePage.cases.consultCta.trackLabel}
              className={`${siteBtnPrimaryOnHero} h-11 min-h-0 px-5 py-0 text-sm ${homeFocusRing}`}
            >
              {homePage.cases.consultCta.label}
            </TrackedLink>
          </div>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-[1.5rem] ring-1 ring-white/12 shadow-[0_24px_70px_rgba(5,15,40,0.35)] sm:mt-10 sm:rounded-[1.75rem]">
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-[2/1]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.slug}
                className="absolute inset-0"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                {active.thumbnailSrc ? (
                  <ExternalPhoto
                    src={active.thumbnailSrc}
                    alt={`${active.programName} — ${active.venue}`}
                    className="absolute inset-0 h-full w-full"
                    fit="cover"
                    quality={90}
                    sizes="100vw"
                    priority={index === 0}
                    objectPosition="50% 55%"
                  />
                ) : (
                  <MediaPanel
                    media={HOME_MEDIA[active.mediaKey]}
                    className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`}
                    sizes="full"
                    photoPriority
                    priority={index === 0}
                    objectFit="cover"
                  />
                )}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/35 sm:to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:max-w-xl lg:p-10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9FC0FF]">
                    {active.programType}
                  </p>
                  <p className={`mt-2 text-2xl font-bold text-white sm:text-3xl ${koreanText}`}>
                    {active.programName}
                  </p>
                  <p className={`mt-1 text-sm font-semibold text-white/85 ${koreanText}`}>{active.venue}</p>
                  <p className={`mt-2 line-clamp-2 text-sm leading-relaxed text-white/70 sm:text-base ${koreanText}`}>
                    {active.description}
                  </p>
                  <TrackedLink
                    href={active.href}
                    trackLabel={active.trackLabel}
                    className={`${siteBtnPrimaryOnHero} ${homeFocusRing} mt-5 h-11 w-fit px-5 ${fineHover}hover:bg-sky-50`}
                  >
                    {active.ctaLabel}
                  </TrackedLink>
                </div>
              </motion.div>
            </AnimatePresence>

            {count > 1 ? (
              <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 sm:bottom-6 sm:right-6">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="이전 사례"
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm ${fineHover}hover:bg-black/55 ${homeFocusRing}`}
                >
                  <span aria-hidden className="text-lg leading-none">
                    ‹
                  </span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="다음 사례"
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm ${fineHover}hover:bg-black/55 ${homeFocusRing}`}
                >
                  <span aria-hidden className="text-lg leading-none">
                    ›
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {count > 1 ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm text-white/50 ${koreanText}`} aria-live="polite">
              {index + 1} / {count}
            </p>
            <div className="flex items-center gap-2" aria-label="사례 슬라이드 선택">
              {items.map((item, i) => (
                <button
                  key={item.slug}
                  type="button"
                  aria-label={`${item.programName} 보기`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition ${
                    i === index ? 'w-6 bg-white' : 'w-2 bg-white/35 hover:bg-white/55'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
