'use client';

import Link from 'next/link';
import type { CaseData } from '../data/cases';
import { getProgramBySlug } from '../data/programs';
import { HOME_MEDIA } from '../data/home-media';
import { cardInteractive, fineHover } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { MediaPanel } from './visual/media-panel';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type CaseProofCardProps = {
  item: CaseData;
  trackPrefix?: string;
};

export function CaseProofCard({ item, trackPrefix = 'case' }: CaseProofCardProps) {
  const related = getProgramBySlug(item.relatedProgram);
  const inquiryHref = related?.inquiryHref ?? '/spokedu/contact?type=dispatch';

  return (
    <article className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] ${cardInteractive}`}>
      <MediaPanel
        media={HOME_MEDIA[item.mediaKey]}
        className="aspect-[16/10] shrink-0 rounded-none border-0 border-b border-slate-200/80"
      />
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">{item.institution}</p>
        <h3 className="mt-1 text-sm font-semibold leading-snug text-slate-900 sm:text-base">{item.title}</h3>
        <dl className="mt-2 space-y-1 text-xs text-slate-600">
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-500">프로그램</dt>
            <dd>{item.program}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-500">대상</dt>
            <dd>{item.target}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-500">핵심</dt>
            <dd className="line-clamp-2">{item.highlight}</dd>
          </div>
        </dl>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{item.summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3">
          <Link
            href={item.href}
            data-track={inferTrackFromHref(item.href)}
            data-track-label={`${trackPrefix}-detail-${item.slug}`}
            className={`text-xs font-semibold text-slate-900 sm:text-sm ${fineHover}hover:text-indigo-700 ${focusRing}`}
          >
            자세히 보기
          </Link>
          {related ? (
            <Link
              href={related.href}
              data-track={inferTrackFromHref(related.href)}
              data-track-label={`${trackPrefix}-program-${item.slug}`}
              className={`text-xs font-semibold text-indigo-700 sm:text-sm ${focusRing}`}
            >
              {related.title}
            </Link>
          ) : null}
          <Link
            href={inquiryHref}
            data-track={inferTrackFromHref(inquiryHref)}
            data-track-label={`${trackPrefix}-inquiry-${item.slug}`}
            className={`text-xs font-semibold text-slate-600 sm:text-sm ${focusRing}`}
          >
            문의
          </Link>
        </div>
      </div>
    </article>
  );
}
