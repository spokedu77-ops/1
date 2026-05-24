'use client';

import Link from 'next/link';
import { homePage } from '../data/home-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  fineHover,
  homeSectionEyebrow,
  koreanLineBreak,
  landingDarkCtaButton,
} from '../lib/ui-classes';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300';

export function HomeFinalCta() {
  const { finalCta } = homePage;

  return (
    <section
      className="relative w-full overflow-hidden rounded-[1.75rem] bg-slate-950 px-5 py-11 text-white sm:rounded-[2rem] sm:px-8 sm:py-14 lg:px-10"
      aria-labelledby="home-final-cta-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-slate-950 to-slate-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(129,140,248,0.35),transparent_55%),radial-gradient(circle_at_85%_100%,rgba(56,189,248,0.15),transparent_50%)]"
        aria-hidden
      />
      <div className="relative w-full max-w-3xl text-left">
        <p className={`${homeSectionEyebrow} text-indigo-300`}>상담</p>
        <h2
          id="home-final-cta-title"
          className={`mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-[2rem] ${koreanLineBreak}`}
        >
          {finalCta.title}
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base ${koreanLineBreak}`}>
          {finalCta.description}
        </p>
        <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {finalCta.links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={item.trackLabel}
              className={`${landingDarkCtaButton} !w-full !min-h-12 ${focusRing}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
