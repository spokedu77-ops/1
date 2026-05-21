import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WhySpokeduTrustSection } from '../../components/blocks';
import { ImagePlaceholder } from '../../components/image-placeholder';
import { cases, getCaseBySlug } from '../../data/cases';
import { getProgramBySlug } from '../../data/programs';
import { buildSpokeduPageMetadata } from '../../data/seo';
import { inferTrackFromHref } from '../../lib/tracking';

type CaseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return cases.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: CaseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getCaseBySlug(slug);

  if (!item) {
    return {
      title: '수업 사례',
      description: '스포키듀 수업 사례',
    };
  }

  const image = item.images[0];

  return buildSpokeduPageMetadata({
    title: `${item.title} | SPOKEDU 수업 사례`,
    description: `${item.institution} ${item.program} 운영 사례. ${item.highlight}`,
    canonical: `/spokedu/cases/${item.slug}`,
    pageKey: 'cases',
    keywords: [item.program, item.institution, '수업 사례', 'SPOMOVE'],
    ogImage: image
      ? { url: image.src, alt: image.alt }
      : undefined,
  });
}

export default async function SpokeduCaseDetailPage({ params }: CaseDetailPageProps) {
  const { slug } = await params;
  const item = getCaseBySlug(slug);

  if (!item) {
    notFound();
  }

  const backHref = '/spokedu/cases';
  const inquiryHref = `/spokedu/contact${item.type === '강사교육' ? '?type=curriculum' : '?type=dispatch'}`;
  const relatedProgram = getProgramBySlug(item.relatedProgram);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Case Detail</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">{item.title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          기관 환경과 대상 특성에 맞춰 실제로 운영한 스포키듀 수업 사례입니다.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ImagePlaceholder
          slot={`case-detail-${item.slug}`}
          alt={item.images[0]?.alt ?? `${item.title} 사례 이미지`}
          src={item.images[0]?.src}
          category="records"
          className="h-64 rounded-2xl border border-slate-200"
        />
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">운영 개요</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-slate-900">기관</dt>
              <dd>{item.institution}</dd>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-slate-900">유형</dt>
              <dd>{item.type}</dd>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-slate-900">프로그램</dt>
              <dd>{item.program}</dd>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-slate-900">대상</dt>
              <dd>{item.target}</dd>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-slate-900">지역</dt>
              <dd>{item.location}</dd>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
              <dt className="font-semibold text-slate-900">운영 시점</dt>
              <dd>{item.date}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">움직임 목표</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {item.movementGoals.map((goal) => (
              <li key={goal}>- {goal}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">교육 포인트</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {item.educationPoints.map((point) => (
              <li key={point}>- {point}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">핵심 운영 포인트</h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">{item.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              #{tag}
            </span>
          ))}
        </div>
      </section>

      {relatedProgram ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">연결 프로그램</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            이 사례는 <span className="font-semibold text-slate-900">{relatedProgram.title}</span> 프로그램을 기반으로 운영되었습니다.
          </p>
          <Link
            href={relatedProgram.expandable ? relatedProgram.href : relatedProgram.inquiryHref}
            data-track={inferTrackFromHref(relatedProgram.expandable ? relatedProgram.href : relatedProgram.inquiryHref)}
            data-track-label={`${item.slug}-related-program`}
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            {relatedProgram.expandable ? '연결 프로그램 상세 보기' : '연결 프로그램 문의하기'}
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">다음 액션</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          비슷한 운영 목적이라면 기관 조건에 맞춘 수업 제안을 바로 받을 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={inquiryHref}
            data-track={inferTrackFromHref(inquiryHref)}
            data-track-label={item.title}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            이 유형으로 문의하기
          </Link>
          <Link
            href={backHref}
            data-track={inferTrackFromHref(backHref)}
            data-track-label={item.title}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            사례 목록으로 돌아가기
          </Link>
          <Link
            href="/spokedu/records"
            data-track="cta-records"
            data-track-label={item.title}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            현장기록 메인 보기
          </Link>
        </div>
      </section>

      <WhySpokeduTrustSection />
    </div>
  );
}
