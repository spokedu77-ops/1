'use client';

import Link from 'next/link';
import { homePage } from '../data/home-page';
import { inferTrackFromHref } from '../lib/tracking';
import { koreanLineBreak, landingDarkCtaButton } from '../lib/ui-classes';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400';

/** @deprecated home-landing FinalCtaSection 사용 — 타입 호환용 유지 */
export function HomeFinalCta() {
  const { finalCta } = homePage;

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0B1220] px-5 py-11 text-white sm:px-8 sm:py-14 lg:px-10"
      aria-labelledby="home-final-cta-title"
    >
      <div className="relative w-full max-w-3xl text-left">
        <h2
          id="home-final-cta-title"
          className={`text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-[2rem] ${koreanLineBreak}`}
        >
          {finalCta.headlineLines.join(' ')}
        </h2>
        <div className="mt-7 grid grid-cols-1 gap-2.5 sm:max-w-xs">
          <Link
            href={finalCta.primary.href}
            data-track={inferTrackFromHref(finalCta.primary.href)}
            data-track-label={finalCta.primary.trackLabel}
            className={`${landingDarkCtaButton} !w-full !min-h-12 ${focusRing}`}
          >
            {finalCta.primary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
