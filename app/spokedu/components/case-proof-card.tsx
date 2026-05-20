'use client';

import Link from 'next/link';
import type { CaseData } from '../data/cases';
import { getProgramBySlug } from '../data/programs';
import { HOME_MEDIA } from '../data/home-media';
import { cardInteractive, fineHover } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import { MediaPanel } from './visual/media-panel';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type CaseProofCardProps = {
  item: CaseData;
  trackPrefix?: string;
  variant?: 'full' | 'compact';
  cardVariant?: LandingCardVariant;
};

export function CaseProofCard({
  item,
  trackPrefix = 'case',
  variant = 'full',
  cardVariant = 'image',
}: CaseProofCardProps) {
  const related = getProgramBySlug(item.relatedProgram);
  const inquiryHref = related?.inquiryHref ?? '/spokedu/contact?type=dispatch';
  const compact = variant === 'compact';

  const card = (
    <article
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl ${landingCardShell(cardVariant)} ${compact ? '' : cardInteractive}`}
    >
      <MediaPanel
        media={HOME_MEDIA[item.mediaKey]}
        className={`${compact ? 'aspect-[16/9]' : 'aspect-[16/10]'} shrink-0 rounded-none border-0 border-b border-slate-200/80`}
      />
      <div className={`flex flex-1 flex-col ${compact ? 'p-3' : 'p-3.5 sm:p-4'}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">{item.institution}</p>
        <h3 className={`mt-0.5 font-semibold leading-snug text-slate-900 ${compact ? 'text-sm line-clamp-2' : 'text-sm sm:text-base'}`}>
          {item.title}
        </h3>
        {compact ? (
          <>
            <p className="mt-1 text-xs font-medium text-indigo-700">{item.highlight}</p>
            <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">{item.summary}</p>
          </>
        ) : (
          <>
            <dl className="mt-2 space-y-1 text-xs text-slate-600">
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-slate-500">프로그램</dt>
                <dd>{item.program}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-slate-500">핵심</dt>
                <dd className="line-clamp-1">{item.highlight}</dd>
              </div>
            </dl>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{item.summary}</p>
          </>
        )}
        <div className={`mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 ${compact ? 'pt-2.5' : 'pt-3'}`}>
          <Link
            href={item.href}
            data-track={inferTrackFromHref(item.href)}
            data-track-label={`${trackPrefix}-detail-${item.slug}`}
            className={`text-xs font-semibold text-slate-900 sm:text-sm ${fineHover}hover:text-indigo-700 ${focusRing}`}
          >
            사례 보기 →
          </Link>
          {!compact && related ? (
            <Link
              href={related.href}
              data-track={inferTrackFromHref(related.href)}
              data-track-label={`${trackPrefix}-program-${item.slug}`}
              className={`text-xs font-semibold text-indigo-700 sm:text-sm ${focusRing}`}
            >
              {related.title}
            </Link>
          ) : null}
          {!compact ? (
            <Link
              href={inquiryHref}
              data-track={inferTrackFromHref(inquiryHref)}
              data-track-label={`${trackPrefix}-inquiry-${item.slug}`}
              className={`text-xs font-semibold text-slate-600 sm:text-sm ${focusRing}`}
            >
              문의
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (compact) {
    return (
      <Link
        href={item.href}
        data-track={inferTrackFromHref(item.href)}
        data-track-label={`${trackPrefix}-card-${item.slug}`}
        className={`group block h-full ${cardInteractive} ${focusRing}`}
      >
        {card}
      </Link>
    );
  }

  return card;
}
