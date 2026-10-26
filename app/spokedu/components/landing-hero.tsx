'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMarketingMotionReady } from '../lib/use-marketing-motion-ready';
import type { ReactNode } from 'react';
import type { HomeMediaItem } from '../data/home-media';
import { trackCommercialEvent } from '../lib/commercial-events';
import {
  marketingButtonPrimary,
  marketingButtonSecondary,
  brandFocusRing,
  marketingHeroDisplayLine,
  marketingTypeHeroTitle,
  koreanLineBreak,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroShell,
  landingHeroSubtitle,
  landingHeroVisual,
} from '../lib/ui-classes';
import { MediaPanel, MotionPoster } from './visual';

type LandingHeroCta = {
  label: string;
  href: string;
  trackLabel: string;
};

type LandingHeroProps = {
  kicker?: string;
  kickerClassName?: string;
  leading?: ReactNode;
  lines: readonly string[];
  subtitle?: string;
  media: HomeMediaItem;
  /** @deprecated 무시 — 서브는 항상 split */
  variant?: 'split' | 'cinematic';
  visualVariant?: 'poster' | 'editorial';
  priority?: boolean;
  primaryCta?: LandingHeroCta;
  secondaryCta?: LandingHeroCta;
  /** 기본 `landingHeroShell` — education 등 flat hero용 override */
  shellClassName?: string;
};

function inferCommercialRoute(href: string): 'private' | 'curriculum' | 'dispatch' | null {
  if (href.includes('/private')) return 'private';
  if (href.includes('/curriculum') || href.includes('/spokedu-lab')) return 'curriculum';
  if (href.includes('/dispatch') || href.includes('/education?')) return 'dispatch';
  return null;
}

function emitCtaClick(cta: LandingHeroCta) {
  const route = inferCommercialRoute(cta.href);
  if (!route) return;
  trackCommercialEvent({
    name: 'primary_cta_clicked',
    route,
    ctaIntentId: cta.trackLabel,
  });
}

/** 서브 랜딩 Hero — inset split + 호버 줌. 전 페이지 풀블리드 강제 없음. */
export function LandingHero({
  kicker,
  kickerClassName = '[color:var(--spokedu-marketing-color-blue)]',
  leading,
  lines,
  subtitle,
  media,
  visualVariant = 'editorial',
  priority = false,
  primaryCta,
  secondaryCta,
  shellClassName,
}: LandingHeroProps) {
  const { motionEnabled } = useMarketingMotionReady();

  return (
    <section className={shellClassName ?? landingHeroShell}>
      <div className={landingHeroGrid}>
        <div className={landingHeroCopy}>
          {kicker ? (
            <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${kickerClassName}`}>{kicker}</p>
          ) : null}
          {leading ? <div className={kicker ? 'mt-4' : ''}>{leading}</div> : null}
          <motion.h1
            className={`${marketingTypeHeroTitle} [color:var(--spokedu-marketing-color-ink)] ${kicker || leading ? 'mt-4 sm:mt-5' : 'mt-2 sm:mt-2.5'}`}
            initial={motionEnabled ? { opacity: 0, y: 20 } : false}
            animate={motionEnabled ? { opacity: 1, y: 0 } : undefined}
            transition={motionEnabled ? { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } : undefined}
          >
            {lines.map((line, index) => (
              <motion.span
                key={line}
                initial={motionEnabled ? { opacity: 0, y: 20 } : false}
                animate={motionEnabled ? { opacity: 1, y: 0 } : undefined}
                transition={
                  motionEnabled
                    ? { duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.06 * index }
                    : undefined
                }
                className={marketingHeroDisplayLine}
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
                  className={`${marketingButtonPrimary} min-h-12 !w-full sm:!w-auto ${brandFocusRing}`}
                  onClick={() => emitCtaClick(primaryCta)}
                >
                  {primaryCta.label}
                </Link>
              ) : null}
              {secondaryCta ? (
                <Link
                  href={secondaryCta.href}
                  data-track="cta-contact"
                  data-track-label={secondaryCta.trackLabel}
                  className={`${marketingButtonSecondary} min-h-12 !w-full sm:!w-auto ${brandFocusRing}`}
                  onClick={() => emitCtaClick(secondaryCta)}
                >
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={landingHeroVisual}>
          {visualVariant === 'editorial' ? (
            <div className="group relative aspect-[16/10] w-full min-h-[200px] overflow-hidden rounded-[1.5rem] ring-1 ring-slate-900/10 sm:min-h-[220px] sm:rounded-[1.75rem] lg:max-h-[min(52vh,480px)] lg:rounded-[2rem]">
              <MediaPanel
                media={media}
                className="absolute inset-0 h-full w-full rounded-none border-0 transition duration-700 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04]"
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
