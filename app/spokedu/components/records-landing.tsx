'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { LandingSection } from './landing-section';
import { MediaPanel } from './visual';
import { recordFilters, recordsPage, type RecordFilterId } from '../data/records-page';
import { HOME_MEDIA } from '../data/home-media';
import type { FieldRecordWithThumbnail } from '../lib/resolve-field-records';
import { ExternalPhoto } from './external-photo';
import {
  cardInteractive,
  fineHover,
} from '../lib/ui-classes';
import { externalLinkProps, isExternalHref } from '../lib/external-link';
import { inferTrackFromHref } from '../lib/tracking';
import { LandingFinalCta } from './landing-final-cta';

const recordsPageStack =
  'flex w-full flex-col gap-8 overflow-x-clip pb-8 sm:gap-10 sm:pb-10 lg:pb-12';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function matchesFilter(record: FieldRecordWithThumbnail, filter: RecordFilterId): boolean {
  if (filter === 'all') return true;
  return record.filters.includes(filter);
}

function RecordCard({
  record,
  photoPriority = false,
}: {
  record: FieldRecordWithThumbnail;
  photoPriority?: boolean;
}) {
  const external = isExternalHref(record.href);
  const className = `group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04] ${cardInteractive} ${focusRing}`;
  const inner = (
    <>
      {record.thumbnailSrc ? (
        <div className="aspect-[5/4] max-h-[220px] shrink-0 overflow-hidden bg-slate-200 sm:aspect-[16/10] sm:max-h-none">
          <ExternalPhoto
            src={record.thumbnailSrc}
            alt={`${record.venue} 수업 사례`}
            className="h-full w-full"
            priority={photoPriority}
          />
        </div>
      ) : (
        <MediaPanel
          media={HOME_MEDIA[record.mediaKey]}
          className="aspect-[5/4] max-h-[220px] shrink-0 rounded-none border-0 sm:aspect-[16/10] sm:max-h-none"
          sizes="card3"
          photoPriority={photoPriority}
        />
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
          {record.operationType}
        </span>
        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-slate-950 [word-break:keep-all]">
          {record.venue}
        </h3>
        <p className="mt-1 text-xs font-medium text-slate-500 [word-break:keep-all]">{record.meta}</p>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
          {record.description}
        </p>
        <span
          className={`mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 ${fineHover}group-hover:text-indigo-900`}
        >
          {record.ctaLabel} →
        </span>
      </div>
    </>
  );

  if (external) {
    return (
      <a
        href={record.href}
        {...externalLinkProps}
        data-track="external-naver-blog"
        data-track-label={record.trackLabel}
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={record.href}
      data-track={inferTrackFromHref(record.href)}
      data-track-label={record.trackLabel}
      className={className}
    >
      {inner}
    </Link>
  );
}

/** 목록형 페이지 헤더 — 사진은 카드에만 (히어로·카드 썸네일 중복 방지) */
function RecordsPageHeader() {
  const reducedMotion = useReducedMotion();

  return (
    <header className="border-b border-slate-200/80 pb-6 sm:pb-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">
        {recordsPage.hero.kicker}
      </p>
      <motion.h1
        className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-slate-950 [word-break:keep-all] sm:text-3xl"
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {recordsPage.hero.lines.join(' ')}
      </motion.h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] [word-break:keep-all]">
        {recordsPage.hero.subtitle}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="운영 현장 유형">
        {recordsPage.hero.venueTypes.map((venue) => (
          <li
            key={venue}
            className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {venue}
          </li>
        ))}
      </ul>
    </header>
  );
}

type RecordsLandingProps = {
  fieldRecords: FieldRecordWithThumbnail[];
};

export function RecordsLanding({ fieldRecords }: RecordsLandingProps) {
  const reducedMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState<RecordFilterId>('all');

  const filteredRecords = useMemo(
    () => fieldRecords.filter((r) => matchesFilter(r, activeFilter)),
    [activeFilter, fieldRecords],
  );

  return (
    <div className={recordsPageStack}>
      <RecordsPageHeader />

      <LandingSection className="space-y-4 sm:space-y-5">
        <div
          className="flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin]"
          role="tablist"
          aria-label="수업 사례 분류"
        >
          {recordFilters.map((filter) => {
            const active = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(filter.id)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${focusRing} ${
                  active
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-3">
          {filteredRecords.map((record, index) => (
            <motion.div
              key={record.slug}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 * index }}
              className="min-h-0"
            >
              <RecordCard record={record} photoPriority={index === 0} />
            </motion.div>
          ))}
        </div>
      </LandingSection>

      <LandingFinalCta
        title={recordsPage.cta.title}
        description={recordsPage.cta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA.trackDispatch}
        links={[
          {
            label: recordsPage.cta.label,
            href: recordsPage.cta.href,
            trackLabel: recordsPage.cta.trackLabel,
            variant: 'primary',
          },
        ]}
      />
    </div>
  );
}
