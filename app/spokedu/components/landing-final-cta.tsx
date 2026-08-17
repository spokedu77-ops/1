'use client';

import Link from 'next/link';
import type { HomeMediaItem } from '../data/home-media';
import { trackCommercialEvent } from '../lib/commercial-events';
import { inferTrackFromHref } from '../lib/tracking';
import {
  homeBandSoftBlue,
  homeFocusRing,
  homePhotoGrade,
  marketingSectionDisplay,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../lib/ui-classes';
import { MediaRenderer } from './visual';

export type LandingFinalCtaLink = {
  label: string;
  href: string;
  trackLabel: string;
  /** @deprecated 시각 톤은 컴포넌트가 soft-blue 카드로 통일 — 호환용으로만 유지 */
  variant?: 'primary' | 'on-dark-primary' | 'on-dark-secondary' | 'on-light-outline';
};

type LandingFinalCtaProps = {
  title: string;
  description: string;
  links: readonly LandingFinalCtaLink[];
  /** @deprecated soft-blue 카드 톤으로 통일. 호출부 호환용 */
  tone?: 'dark' | 'light';
  backgroundMedia?: HomeMediaItem;
  eyebrow?: string;
};

function resolveLinkClass(link: LandingFinalCtaLink, index: number) {
  const isPrimary =
    link.variant === 'primary' ||
    link.variant === 'on-dark-primary' ||
    (!link.variant && index === 0);
  return isPrimary ? `${siteBtnPrimary} w-full` : `${siteBtnSecondary} w-full`;
}

function inferCommercialRoute(href: string): 'private' | 'curriculum' | 'dispatch' | null {
  if (href.includes('/private')) return 'private';
  if (href.includes('/curriculum') || href.includes('/subscription')) return 'curriculum';
  if (href.includes('/dispatch')) return 'dispatch';
  return null;
}

/**
 * 서브 랜딩 하단 CTA
 * - 남색 풀밴드 대신 soft-blue 밴드 + 화이트 카드
 * - 사진은 배경 고스트가 아니라 카드 안 미디어 패널
 * - 카피 | 버튼 2열
 */
export function LandingFinalCta({
  title,
  description,
  links,
  backgroundMedia,
  eyebrow = '상담',
}: LandingFinalCtaProps) {
  return (
    <section
      className={`relative w-full overflow-hidden ${homeBandSoftBlue} py-10 sm:py-12 lg:py-14`}
      aria-labelledby="landing-final-cta-title"
    >
      <div className={siteContainer}>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[#D6E3FF] bg-white shadow-[0_18px_50px_rgba(15,33,70,0.07)]">
          <div className="h-1.5 w-full bg-[#0B1F46]" aria-hidden />

          <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,280px)] lg:items-stretch lg:gap-10 lg:px-10 lg:py-11">
            <div className="min-w-0 text-left">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#245DFF]">{eyebrow}</p>
              <h2 id="landing-final-cta-title" className={`${marketingSectionDisplay} mt-3 text-[#0B1F46]`}>
                {title}
              </h2>
              <p className={`mt-4 max-w-xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
                {description}
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-3">
              {backgroundMedia ? (
                <div className="relative mb-1 hidden aspect-[16/10] overflow-hidden rounded-[1.15rem] ring-1 ring-[#DCE3EE] lg:block">
                  <MediaRenderer
                    media={backgroundMedia}
                    intensity="photo"
                    sizes="card2"
                    className={`absolute inset-0 h-full w-full ${homePhotoGrade}`}
                  />
                </div>
              ) : null}
              {links.map((link, index) => {
                const route = inferCommercialRoute(link.href);
                return (
                  <Link
                    key={`${link.href}-${link.trackLabel}`}
                    href={link.href}
                    data-track={inferTrackFromHref(link.href)}
                    data-track-label={link.trackLabel}
                    className={`${resolveLinkClass(link, index)} ${homeFocusRing}`}
                    onClick={() => {
                      if (!route) return;
                      trackCommercialEvent({
                        name: 'primary_cta_clicked',
                        route,
                        ctaIntentId: link.trackLabel,
                      });
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
