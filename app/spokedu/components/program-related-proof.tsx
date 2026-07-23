'use client';

import Link from 'next/link';
import {
  getFieldRecordCatalogItem,
  type FieldRecordSlug,
} from '../data/field-records-catalog';
import { SPOKEDU_BASE_PATH } from '../data/site';
import { externalLinkProps, isExternalHref } from '../lib/external-link';
import { fineHover, koreanLineBreak, landingSectionTitle } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { ExternalPhoto } from './external-photo';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const DEFAULT_TRUST_LINE = '공개 운영 사례와 같은 현장 기준으로 프로그램을 설계합니다.';

type ProgramRelatedProofProps = {
  fieldRecordSlugs: readonly FieldRecordSlug[];
  trustLine?: string;
  trackPrefix?: string;
};

/** 프로그램 상세 공통 — 짧은 신뢰 한 줄 + 관련 온사이트/사례 카드 */
export function ProgramRelatedProof({
  fieldRecordSlugs,
  trustLine = DEFAULT_TRUST_LINE,
  trackPrefix = 'program-related',
}: ProgramRelatedProofProps) {
  if (fieldRecordSlugs.length === 0) return null;

  const items = fieldRecordSlugs.map((slug) => getFieldRecordCatalogItem(slug));

  return (
    <section className="space-y-4">
      <p
        className={`rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm font-semibold leading-relaxed text-indigo-950 ${koreanLineBreak}`}
      >
        {trustLine}
      </p>
      <div className="flex items-end justify-between gap-2">
        <h2 className={landingSectionTitle}>관련 운영 사례</h2>
        <Link
          href={`${SPOKEDU_BASE_PATH}/records`}
          data-track={inferTrackFromHref(`${SPOKEDU_BASE_PATH}/records`)}
          data-track-label={`${trackPrefix}-records`}
          className={`shrink-0 text-sm font-semibold text-indigo-700 ${fineHover}hover:text-indigo-900 ${focusRing}`}
        >
          사례 전체 →
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const className = `group flex h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${fineHover}hover:border-indigo-200 ${focusRing}`;
          const body = (
            <>
              {item.thumbnailSrc ? (
                <div className="relative w-[38%] shrink-0 self-stretch bg-slate-100 sm:w-40">
                  <ExternalPhoto
                    src={item.thumbnailSrc}
                    alt={`${item.venue} 수업 사례`}
                    className="absolute inset-0 h-full w-full"
                    sizes="160px"
                  />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-700">
                  {item.operationType}
                  {item.blogHref ? ' · 온사이트 요약' : ''}
                </p>
                <p className={`mt-1 text-sm font-bold leading-snug text-slate-950 ${koreanLineBreak}`}>
                  {item.venue}
                </p>
                <p className={`mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 ${koreanLineBreak}`}>
                  {item.description}
                </p>
                <span className={`mt-2 text-xs font-semibold text-indigo-700 ${fineHover}group-hover:text-indigo-900`}>
                  {item.ctaLabel} →
                </span>
              </div>
            </>
          );

          if (isExternalHref(item.href)) {
            return (
              <li key={item.slug}>
                <a
                  href={item.href}
                  {...externalLinkProps}
                  data-track="external-naver-blog"
                  data-track-label={`${trackPrefix}-${item.slug}`}
                  className={className}
                >
                  {body}
                </a>
              </li>
            );
          }

          return (
            <li key={item.slug}>
              <Link
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={`${trackPrefix}-${item.slug}`}
                className={className}
              >
                {body}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
