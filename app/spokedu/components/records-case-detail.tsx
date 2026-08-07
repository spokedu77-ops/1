'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { getRecordConversionHref } from '../data/commercial-routes';
import {
  hasOnsiteOptionalText,
  type FieldRecordCatalogItem,
  type FieldRecordOnsiteSummary,
} from '../data/field-records-catalog';
import { SPOKEDU_BASE_PATH } from '../data/site';
import { externalLinkProps } from '../lib/external-link';
import { trackCommercialEvent } from '../lib/commercial-events';
import { fineHover, koreanLineBreak } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]';

type RecordsCaseDetailProps = {
  item: FieldRecordCatalogItem & {
    onsite: FieldRecordOnsiteSummary;
    blogHref: string;
  };
};

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-900/[0.03] sm:px-6 sm:py-5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#174BE6]">{title}</h2>
      <div className={`mt-3 text-sm leading-relaxed text-slate-700 sm:text-[15px] ${koreanLineBreak}`}>{children}</div>
    </section>
  );
}

/** 온사이트 사례 상세 — 필수 헤더 + 값이 있는 선택 섹션만 렌더 */
export function RecordsCaseDetail({ item }: RecordsCaseDetailProps) {
  const { onsite } = item;
  const conversionHref = getRecordConversionHref(item.slug);

  const requestText = hasOnsiteOptionalText(onsite.request) ? onsite.request : onsite.purpose;
  const observationText = hasOnsiteOptionalText(onsite.observation) ? onsite.observation : onsite.outcome;
  const showComposition = onsite.composition.length > 0;

  useEffect(() => {
    trackCommercialEvent({
      name: 'evidence_opened',
      route: 'dispatch',
      evidenceSlug: item.slug,
      surface: 'record',
      schema_version: 1,
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }, [item.slug]);

  return (
    <article className="flex w-full flex-col gap-8 pb-8 sm:gap-10 sm:pb-10 lg:pb-12">
      <div className="border-b border-slate-200/80 pb-6 sm:pb-7">
        <Link
          href={`${SPOKEDU_BASE_PATH}/records`}
          className={`text-sm font-semibold text-[#174BE6] ${fineHover}hover:text-[#0B1F46] ${focusRing}`}
        >
          ← 수업 사례 목록
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[#EAF1FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#174BE6]">
            {item.operationType}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            {item.programLabel}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            {item.venueType}
          </span>
        </div>
        <h1 className={`mt-3 max-w-3xl text-2xl font-black tracking-tight text-slate-950 sm:text-3xl ${koreanLineBreak}`}>
          {item.venue}
        </h1>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          {item.meta}
        </p>
      </div>

      {item.thumbnailSrc ? (
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 sm:aspect-[2/1]">
          <ExternalPhoto
            src={item.thumbnailSrc}
            alt={`${item.venue} 수업 현장`}
            className="absolute inset-0 h-full w-full"
            priority
            sizes="(max-width: 1024px) 100vw, 960px"
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:gap-5">
        <DetailSection title="기본 정보">
          <ul className="space-y-1.5">
            <li>기관·프로젝트: {item.venue}</li>
            <li>대상: {onsite.audience}</li>
            <li>운영 형태: {item.operationType}</li>
            <li>적용 프로그램: {item.programLabel}</li>
          </ul>
        </DetailSection>

        {hasOnsiteOptionalText(requestText) ? (
          <DetailSection title="요청">
            <p>{requestText}</p>
          </DetailSection>
        ) : null}

        {hasOnsiteOptionalText(onsite.spaceConditions) ? (
          <DetailSection title="공간·인원 조건">
            <p>{onsite.spaceConditions}</p>
          </DetailSection>
        ) : null}

        {showComposition ? (
          <DetailSection title="적용 프로그램">
            <ul className="space-y-2">
              {onsite.composition.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#245DFF]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        ) : null}

        {hasOnsiteOptionalText(onsite.difficultyAdjustment) ? (
          <DetailSection title="수업 조정">
            <p>{onsite.difficultyAdjustment}</p>
          </DetailSection>
        ) : null}

        {hasOnsiteOptionalText(observationText) ? (
          <DetailSection title="관찰">
            <p>{observationText}</p>
          </DetailSection>
        ) : null}

        {hasOnsiteOptionalText(onsite.feedback) ? (
          <DetailSection title="피드백">
            <p>{onsite.feedback}</p>
          </DetailSection>
        ) : null}

        {hasOnsiteOptionalText(onsite.report) ? (
          <DetailSection title="보고서">
            <p>{onsite.report}</p>
          </DetailSection>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className={`text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
          비슷한 조건의 기관 운영이 필요하시면 상담으로 이어드립니다. 현장 후기 원문은 블로그에서 확인할 수
          있습니다.
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {conversionHref ? (
            <Link
              href={conversionHref}
              data-track="nav"
              data-track-label={`records-detail-consult-${item.slug}`}
              className={`inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white ${fineHover}hover:bg-slate-800 ${focusRing}`}
              onClick={() => {
                trackCommercialEvent({
                  name: 'primary_cta_clicked',
                  route: 'dispatch',
                  ctaIntentId: 'institution_cta',
                  evidenceSlug: item.slug,
                  surface: 'record',
                  audience: 'institution',
                  schema_version: 1,
                });
              }}
            >
              기관 운영 상담
            </Link>
          ) : null}
          <a
            href={item.blogHref}
            {...externalLinkProps}
            data-track="external-naver-blog"
            data-track-label={`records-detail-blog-${item.slug}`}
            className={`inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 ${fineHover}hover:border-slate-500 ${focusRing}`}
          >
            블로그 후기 원문
          </a>
        </div>
      </div>
    </article>
  );
}
