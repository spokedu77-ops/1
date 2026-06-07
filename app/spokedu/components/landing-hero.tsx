'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { HomeMediaItem } from '../data/home-media';
import {
  btnPrimary,
  btnSecondary,
  homeHeroH1,
  homeHeroH1Line,
  koreanLineBreak,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroShell,
  landingHeroSubtitle,
  landingHeroVisual,
} from '../lib/ui-classes';
import { MediaPanel, MotionPoster } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type LandingHeroCta = {
  label: string;
  href: string;
  trackLabel: string;
};

type LandingHeroProps = {
  kicker?: string;
  kickerClassName?: string;
  lines: readonly string[];
  subtitle?: string;
  media: HomeMediaItem;
  /** Home Hero 메인 컷과 동일 — 가로 16:10, photoPriority */
  visualVariant?: 'poster' | 'editorial';
  priority?: boolean;
  primaryCta?: LandingHeroCta;
  secondaryCta?: LandingHeroCta;
};

/** 서브 랜딩 Hero — Home과 동일 shell·정렬 (음수 margin 없음) */
export function LandingHero({
  kicker,
  kickerClassName = 'text-indigo-600',
  lines,
  subtitle,
  media,
  visualVariant = 'poster',
  priority = false,
  primaryCta,
  secondaryCta,
}: LandingHeroProps) {
  const reducedMotion = useReducedMotion();

  return (
    <section className={landingHeroShell}>
      <div className={landingHeroGrid}>
        <div className={landingHeroCopy}>
          {kicker ? (
            <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${kickerClassName}`}>{kicker}</p>
          ) : null}
          <motion.h1
            className={`${homeHeroH1} mt-2 sm:mt-2.5`}
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {lines.map((line, index) => (
              <motion.span
                key={line}
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.06 * index }}
                className={homeHeroH1Line}
              >
                {line}
              </motion.span>
            ))}
          </motion.h1>
          {subtitle ? (
            <p className={`${landingHeroSubtitle} mt-4 max-w-lg text-slate-600 ${koreanLineBreak}`}>{subtitle}</p>
          ) : null}
          {primaryCta || secondaryCta ? (
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:flex-row">
              {primaryCta ? (
                <Link
                  href={primaryCta.href}
                  data-track="cta-contact"
                  data-track-label={primaryCta.trackLabel}
                  className={`${btnPrimary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
                >
                  {primaryCta.label}
                </Link>
              ) : null}
              {secondaryCta ? (
                <Link
                  href={secondaryCta.href}
                  data-track="cta-contact"
                  data-track-label={secondaryCta.trackLabel}
                  className={`${btnSecondary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
                >
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={landingHeroVisual}>
          {visualVariant === 'editorial' ? (
            <div className="relative aspect-[16/10] w-full min-h-[200px] overflow-hidden rounded-[1.5rem] ring-1 ring-slate-900/10 sm:min-h-[220px] sm:rounded-[1.75rem] lg:max-h-[min(52vh,480px)] lg:rounded-[2rem]">
              <MediaPanel
                media={media}
                className="absolute inset-0 h-full w-full rounded-none border-0"
                sizes="heroEditorialMain"
                photoPriority
                priority={priority}
              />
            </div>
          ) : (
            <MotionPoster media={media} variant="cinematic" priority={priority} sizes="heroSplit" />
          )}
        </div>
      </div>
    </section>
  );
}
