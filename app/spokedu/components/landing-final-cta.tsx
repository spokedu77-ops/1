'use client';

import Link from 'next/link';
import type { HomeMediaItem } from '../data/home-media';
import { trackCommercialEvent } from '../lib/commercial-events';
import { inferTrackFromHref } from '../lib/tracking';
import {
  brandFocusRing,
  homePhotoGrade,
  marketingButtonPrimary,
  marketingButtonSecondary,
  marketingSectionInner,
  marketingTypeEyebrow,
  marketingTypeSectionLead,
  marketingTypeSectionTitle,
} from '../lib/ui-classes';
import { MediaRenderer } from './visual';

export type LandingFinalCtaLink = {
  label: string;
  href: string;
  trackLabel: string;
  /** @deprecated 시각 톤은 단일 패널로 통일 — 호환용으로만 유지 */
  variant?: 'primary' | 'on-dark-primary' | 'on-dark-secondary' | 'on-light-outline';
};

type LandingFinalCtaProps = {
  title: string;
  description: string;
  links: readonly LandingFinalCtaLink[];
  /** @deprecated 호출부 호환용 */
  tone?: 'dark' | 'light';
  backgroundMedia?: HomeMediaItem;
  eyebrow?: string;
};

function resolveLinkClass(link: LandingFinalCtaLink, index: number) {
  const isPrimary =
    link.variant === 'primary' ||
    link.variant === 'on-dark-primary' ||
    (!link.variant && index === 0);
  return isPrimary
    ? `${marketingButtonPrimary} inline-flex w-full justify-center sm:w-auto sm:min-w-[11rem]`
    : `${marketingButtonSecondary} inline-flex w-full justify-center sm:w-auto sm:min-w-[11rem]`;
}

function inferCommercialRoute(href: string): 'private' | 'curriculum' | 'dispatch' | null {
  if (href.includes('/private')) return 'private';
  if (href.includes('/curriculum') || href.includes('/spokedu-lab')) return 'curriculum';
  if (href.includes('/dispatch') || href.includes('/education?')) return 'dispatch';
  return null;
}

/**
 * 서브 랜딩 하단 CTA — rail 안 단일 패널, 카피 → (선택 미디어) → 버튼 세로 흐름
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
      className="w-full border-t border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-white)] py-10 sm:py-12 lg:py-14"
      aria-labelledby="landing-final-cta-title"
    >
      <div className={marketingSectionInner}>
        <div className="overflow-hidden rounded-xl border border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-white)] p-6 sm:p-8 lg:p-10">
          <div
            className="mb-5 h-[3px] w-10 rounded-full bg-[var(--spokedu-marketing-color-blue)]"
            aria-hidden
          />

          <div className="max-w-2xl text-left">
            <p className={marketingTypeEyebrow}>{eyebrow}</p>
            <h2
              id="landing-final-cta-title"
              className={`${marketingTypeSectionTitle} mt-3 max-w-xl [color:var(--spokedu-marketing-color-navy)] [text-wrap:balance] [word-break:keep-all]`}
            >
              {title}
            </h2>
            <p className={`${marketingTypeSectionLead} mt-4 max-w-xl`}>{description}</p>
          </div>

          {backgroundMedia ? (
            <div className="relative mt-8 aspect-[16/10] max-w-2xl overflow-hidden rounded-xl ring-1 ring-[var(--spokedu-marketing-color-border)]">
              <MediaRenderer
                media={backgroundMedia}
                intensity="photo"
                sizes="card2"
                className={`absolute inset-0 h-full w-full ${homePhotoGrade}`}
              />
            </div>
          ) : null}

          <div className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap">
            {links.map((link, index) => {
              const route = inferCommercialRoute(link.href);
              return (
                <Link
                  key={`${link.href}-${link.trackLabel}`}
                  href={link.href}
                  data-track={inferTrackFromHref(link.href)}
                  data-track-label={link.trackLabel}
                  className={`${resolveLinkClass(link, index)} ${brandFocusRing}`}
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
    </section>
  );
}
