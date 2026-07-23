import Link from 'next/link';
import type { FieldRecordCatalogItem, FieldRecordOnsiteSummary } from '../data/field-records-catalog';
import { SPOKEDU_BASE_PATH } from '../data/site';
import { externalLinkProps } from '../lib/external-link';
import { fineHover, koreanLineBreak } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type RecordsCaseDetailProps = {
  item: FieldRecordCatalogItem & {
    onsite: FieldRecordOnsiteSummary;
    blogHref: string;
  };
};

/** 상위 사례 온사이트 요약 — 목적·대상·구성·결과 + 블로그 원문 링크 */
export function RecordsCaseDetail({ item }: RecordsCaseDetailProps) {
  const { onsite } = item;

  return (
    <article className="flex w-full flex-col gap-8 pb-8 sm:gap-10 sm:pb-10 lg:pb-12">
      <div className="border-b border-slate-200/80 pb-6 sm:pb-7">
        <Link
          href={`${SPOKEDU_BASE_PATH}/records`}
          className={`text-sm font-semibold text-indigo-700 ${fineHover}hover:text-indigo-900 ${focusRing}`}
        >
          ← 수업 사례 목록
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-700">
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
            alt={`${item.venue} 수업 사례`}
            className="absolute inset-0 h-full w-full"
            priority
            sizes="(max-width: 1024px) 100vw, 960px"
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:gap-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-900/[0.03] sm:px-6 sm:py-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700">목적</h2>
          <p className={`mt-3 text-sm leading-relaxed text-slate-700 sm:text-[15px] ${koreanLineBreak}`}>
            {onsite.purpose}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-900/[0.03] sm:px-6 sm:py-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700">대상</h2>
          <p className={`mt-3 text-sm leading-relaxed text-slate-700 sm:text-[15px] ${koreanLineBreak}`}>
            {onsite.audience}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-900/[0.03] sm:px-6 sm:py-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700">구성</h2>
          <ul className="mt-3 space-y-2">
            {onsite.composition.map((line) => (
              <li
                key={line}
                className={`flex gap-2 text-sm leading-relaxed text-slate-700 sm:text-[15px] ${koreanLineBreak}`}
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-900/[0.03] sm:px-6 sm:py-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700">결과</h2>
          <p className={`mt-3 text-sm leading-relaxed text-slate-700 sm:text-[15px] ${koreanLineBreak}`}>
            {onsite.outcome}
          </p>
        </section>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className={`text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
          비슷한 조건의 기관 운영이 필요하시면 상담으로 이어드립니다. 현장 후기 원문은 블로그에서 확인할 수
          있습니다.
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href={`${SPOKEDU_BASE_PATH}/contact?type=dispatch`}
            data-track="nav"
            data-track-label={`records-detail-consult-${item.slug}`}
            className={`inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white ${fineHover}hover:bg-slate-800 ${focusRing}`}
          >
            기관 운영 상담
          </Link>
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
