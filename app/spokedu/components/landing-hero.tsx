'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { HomeMediaItem } from '../data/home-media';
import {
  btnPrimary,
  btnSecondary,
  koreanLineBreak,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroShell,
  landingHeroSubtitle,
  landingHeroVisual,
  landingH1,
} from '../lib/ui-classes';
import { MotionPoster } from './visual';

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
          <h1 className={`${landingH1} mt-2 text-slate-950 sm:mt-2.5`}>
            {lines.map((line, index) => (
              <motion.span
                key={line}
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.06 * index }}
                className="block"
              >
                {line}
              </motion.span>
            ))}
          </h1>
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
          <MotionPoster media={media} variant="cinematic" priority={priority} sizes="heroSplit" />
        </div>
      </div>
    </section>
  );
}
