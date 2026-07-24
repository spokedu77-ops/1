'use client';

import Link from 'next/link';
import type { HomeMediaItem } from '../data/home-media';
import { inferTrackFromHref } from '../lib/tracking';
import {
  homeFocusRing,
  homeSectionH2,
  koreanText,
  siteBtnPrimary,
  siteBtnPrimaryOnHero,
  siteBtnSecondary,
  siteBtnSecondaryOnDark,
} from '../lib/ui-classes';
import { MediaRenderer } from './visual';

export type LandingFinalCtaLink = {
  label: string;
  href: string;
  trackLabel: string;
  /** light 배경: 첫 버튼 primary. dark: on-dark 버튼 */
  variant?: 'primary' | 'on-dark-primary' | 'on-dark-secondary' | 'on-light-outline';
};

type LandingFinalCtaProps = {
  title: string;
  description: string;
  links: readonly LandingFinalCtaLink[];
  tone?: 'dark' | 'light';
  backgroundMedia?: HomeMediaItem;
  eyebrow?: string;
};

function resolveLinkClass(link: LandingFinalCtaLink, index: number, tone: 'dark' | 'light') {
  const v =
    link.variant ??
    (tone === 'dark' ? (index === 0 ? 'on-dark-primary' : 'on-dark-secondary') : index === 0 ? 'primary' : 'on-light-outline');
  switch (v) {
    case 'primary':
      return `${siteBtnPrimary} w-full sm:w-auto`;
    case 'on-dark-primary':
      return `${siteBtnPrimaryOnHero} h-12 w-full sm:w-auto`;
    case 'on-dark-secondary':
      return `${siteBtnSecondaryOnDark} w-full sm:w-auto`;
    case 'on-light-outline':
      return `${siteBtnSecondary} w-full sm:w-auto`;
    default:
      return `${siteBtnPrimaryOnHero} h-12 w-full sm:w-auto`;
  }
}

/** 서브 랜딩 하단 CTA — Home FinalCta와 동일 톤 (인디고/블러 orb 없음) */
export function LandingFinalCta({
  title,
  description,
  links,
  tone = 'dark',
  backgroundMedia,
  eyebrow,
}: LandingFinalCtaProps) {
  const isLight = tone === 'light';

  return (
    <section
      className={
        isLight
          ? 'relative w-full overflow-hidden border border-slate-200/80 bg-white px-5 py-10 sm:px-8 sm:py-12'
          : 'relative w-full overflow-hidden bg-[#07101f] px-5 py-11 text-white sm:px-8 sm:py-14 lg:px-10'
      }
      aria-labelledby="landing-final-cta-title"
    >
      {backgroundMedia ? (
        <>
          <div className={`pointer-events-none absolute inset-0 ${isLight ? 'opacity-30' : 'opacity-55'}`} aria-hidden>
            <MediaRenderer media={backgroundMedia} intensity="photo" sizes="full" className="h-full w-full" />
          </div>
          <div
            className={`pointer-events-none absolute inset-0 ${isLight ? 'bg-white/85' : 'bg-[#07101f]/78'}`}
            aria-hidden
          />
        </>
      ) : null}

      <div className="relative w-full max-w-3xl text-left">
        {eyebrow ? (
          <p
            className={`text-[13px] font-semibold uppercase tracking-[0.18em] ${
              isLight ? 'text-[#1D4ED8]' : 'text-sky-300'
            }`}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          id="landing-final-cta-title"
          className={`${eyebrow ? 'mt-3' : ''} ${homeSectionH2} ${isLight ? 'text-[#0B1220]' : 'text-white'}`}
        >
          {title}
        </h2>
        <p
          className={`mt-4 max-w-2xl text-base leading-relaxed sm:text-[17px] ${koreanText} ${
            isLight ? 'text-slate-600' : 'text-white/75'
          }`}
        >
          {description}
        </p>
        <div
          className={`mt-8 grid gap-3 ${
            links.length >= 3 ? 'sm:grid-cols-3' : links.length === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {links.map((link, index) => (
            <Link
              key={`${link.href}-${link.trackLabel}`}
              href={link.href}
              data-track={inferTrackFromHref(link.href)}
              data-track-label={link.trackLabel}
              className={`${resolveLinkClass(link, index, tone)} ${homeFocusRing}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
