'use client';

import Link from 'next/link';
import type { MonthlyRecord } from '../data/monthly';
import { HOME_MEDIA } from '../data/home-media';
import { cardInteractive, fineHover } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import { MediaPanel } from './visual/media-panel';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type MonthlyRecordCardProps = {
  record: MonthlyRecord;
  mediaKey: keyof typeof HOME_MEDIA;
  cardVariant?: LandingCardVariant;
};

export function MonthlyRecordCard({ record, mediaKey, cardVariant = 'image' }: MonthlyRecordCardProps) {
  const detailHref = `/spokedu/monthly/${record.slug}`;
  const relatedHint = record.relatedCases[0];

  return (
    <Link
      href={detailHref}
      data-track={inferTrackFromHref(detailHref)}
      data-track-label={`monthly-card-${record.slug}`}
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl ${landingCardShell(cardVariant)} ${cardInteractive} ${focusRing}`}
    >
      <MediaPanel
        media={HOME_MEDIA[mediaKey]}
        className="aspect-[16/9] shrink-0 rounded-none border-0 border-b border-slate-200/80"
      />
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">{record.month}</p>
        <h3 className="mt-0.5 text-sm font-semibold leading-snug text-slate-900 sm:text-base">{record.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-slate-600">
          <span className="font-medium text-slate-500">기관</span> {record.institutions.slice(0, 2).join(' · ')}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">
          <span className="font-medium text-slate-500">프로그램</span> {record.programs.join(' · ')}
        </p>
        <p className="mt-1.5 line-clamp-1 text-xs font-medium text-indigo-700">
          {record.movementPoints.slice(0, 2).join(' · ')}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{record.educationPoints[0]}</p>
        {relatedHint ? (
          <p className="mt-auto pt-2.5 text-[11px] font-medium text-slate-500 line-clamp-1">
            관련 · {relatedHint.label}
          </p>
        ) : null}
        <span className={`inline-flex pt-2 text-xs font-semibold text-slate-900 sm:text-sm ${fineHover}group-hover:text-indigo-700`}>
          월간 기록 보기 →
        </span>
      </div>
    </Link>
  );
}
