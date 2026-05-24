'use client';

import Link from 'next/link';
import type { HomeMediaItem } from '../data/home-media';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  btnPrimaryOnDark,
  btnSecondaryOnDark,
  fineHover,
  homeSectionEyebrow,
  koreanLineBreak,
} from '../lib/ui-classes';
import { MediaRenderer } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

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
  const v = link.variant ?? (tone === 'dark' ? (index === 0 ? 'on-dark-primary' : 'on-dark-secondary') : index === 0 ? 'primary' : 'on-light-outline');
  switch (v) {
    case 'primary':
      return `${btnPrimary} min-h-12 !w-full sm:!w-auto`;
    case 'on-dark-primary':
      return `${btnPrimaryOnDark} min-h-12 !w-full sm:!w-auto`;
    case 'on-dark-secondary':
      return `${btnSecondaryOnDark} min-h-12 !w-full sm:!w-auto`;
    case 'on-light-outline':
      return `inline-flex min-h-12 w-full items-center justify-center rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 sm:w-auto ${fineHover}hover:border-indigo-300 ${fineHover}hover:bg-indigo-50`;
    default:
      return `${btnPrimaryOnDark} min-h-12 !w-full sm:!w-auto`;
  }
}

/** 서브 랜딩 하단 CTA — Home FinalCta와 동일 좌측 정렬 */
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
          ? 'relative w-full overflow-hidden rounded-[1.75rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-5 py-10 sm:rounded-[2rem] sm:px-8 sm:py-12'
          : 'relative w-full overflow-hidden rounded-[1.75rem] bg-slate-950 px-5 py-11 text-white sm:rounded-[2rem] sm:px-8 sm:py-14 lg:px-10'
      }
      aria-labelledby="landing-final-cta-title"
    >
      {backgroundMedia && isLight ? (
        <>
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
            <MediaRenderer media={backgroundMedia} intensity="photo" sizes="full" className="h-full w-full" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        </>
      ) : null}
      {backgroundMedia && !isLight ? (
        <>
          <div className="pointer-events-none absolute inset-0 opacity-75" aria-hidden>
            <MediaRenderer media={backgroundMedia} intensity="photo" sizes="full" className="h-full w-full" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-slate-950/82" aria-hidden />
        </>
      ) : null}
      {!backgroundMedia && !isLight ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-slate-950 to-slate-950"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(129,140,248,0.35),transparent_55%)]"
            aria-hidden
          />
        </>
      ) : null}
      <div className="relative w-full max-w-3xl text-left">
        {eyebrow ? (
          <p className={`${homeSectionEyebrow} ${isLight ? '' : 'text-indigo-300'}`}>{eyebrow}</p>
        ) : null}
        <h2
          id="landing-final-cta-title"
          className={`${eyebrow ? 'mt-2' : ''} text-2xl font-black tracking-tight sm:text-3xl ${koreanLineBreak} ${
            isLight ? 'text-slate-950' : 'text-white'
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-3 max-w-2xl text-sm leading-relaxed sm:text-base ${koreanLineBreak} ${
            isLight ? 'text-slate-600' : 'text-slate-300'
          }`}
        >
          {description}
        </p>
        <div
          className={`mt-7 grid gap-2.5 ${
            links.length >= 3 ? 'sm:grid-cols-3' : links.length === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {links.map((link, index) => (
            <Link
              key={`${link.href}-${link.trackLabel}`}
              href={link.href}
              data-track={inferTrackFromHref(link.href)}
              data-track-label={link.trackLabel}
              className={`${resolveLinkClass(link, index, tone)} ${focusRing}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
