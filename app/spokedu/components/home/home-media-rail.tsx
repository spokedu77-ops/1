'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import type { HomeCaseCard } from '../../data/home-page';
import {
  fineHover,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimaryOnHero,
  siteContainer,
} from '../../lib/ui-classes';
import { ExternalPhoto } from '../external-photo';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';

const INTERVAL_MS = 4500;

type CaseCardWithThumb = HomeCaseCard & { thumbnailSrc?: string };

type HomeMediaRailProps = {
  caseCards: CaseCardWithThumb[];
};

/**
 * 수업 사례 자동 갤러리 — 횡스크롤 없음, 고화질 현장 사진
 */
export function HomeMediaRail({ caseCards }: HomeMediaRailProps) {
  const items = caseCards.length > 0 ? caseCards : [];
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const active = items[index] ?? items[0];

  useEffect(() => {
    if (reducedMotion || items.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [items.length, reducedMotion]);

  if (!active) return null;

  return (
    <section
      id="explore"
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-[#07101f] text-white`}
      aria-labelledby="home-media-rail-heading"
      aria-roledescription="carousel"
    >
      <div className={siteContainer}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-sky-300">수업 사례</p>
            <h2 id="home-media-rail-heading" className={`${homeSectionH2} mt-3 text-white`}>
              현장에서 찍은 운영 기록
            </h2>
          </div>
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

        <div className="relative mt-8 overflow-hidden rounded-2xl ring-1 ring-white/10 sm:mt-10">
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">
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
          </div>
        </div>
      </div>
    </section>
  );
}
