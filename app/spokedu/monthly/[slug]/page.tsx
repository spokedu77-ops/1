import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WhySpokeduTrustSection } from '../../components/blocks';
import { ImagePlaceholder } from '../../components/image-placeholder';
import { getMonthlyRecordBySlug, monthlyRecords } from '../../data/monthly';

type MonthlyDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return monthlyRecords.map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({ params }: MonthlyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const record = getMonthlyRecordBySlug(slug);
  if (!record) {
    return {
      title: '월간 스포키듀',
      description: '월간 운영 기록',
    };
  }

  return {
    title: `${record.title} | 월간 스포키듀`,
    description: `${record.title} 운영 기록: 함께한 기관, 프로그램, 움직임 경험, 교육 포인트를 확인하세요.`,
    alternates: {
      canonical: `/spokedu/monthly/${record.slug}`,
    },
  };
}

export default async function SpokeduMonthlyDetailPage({ params }: MonthlyDetailPageProps) {
  const { slug } = await params;
  const record = getMonthlyRecordBySlug(slug);
  if (!record) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Monthly Archive</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">{record.title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          월별 운영 기록을 같은 형식으로 아카이브해, 다음 달 기획과 실행 품질 개선에 바로 활용합니다.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {record.images.map((image) => (
          <ImagePlaceholder
            key={`${record.slug}-${image.src}`}
            slot={`${record.slug}-${image.title}`}
            alt={image.alt}
            src={image.src}
            title={image.title}
            caption={record.title}
            className="h-56"
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">이번 달 함께한 기관</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {record.institutions.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">운영한 프로그램</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {record.programs.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">아이들이 경험한 움직임</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {record.movementPoints.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">교육 포인트</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {record.educationPoints.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">관련 사례 링크</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {record.relatedCases.map((link) => (
            <Link
              key={`${record.slug}-${link.href}`}
              href={link.href}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">다음 문의 CTA</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          다음 달 운영 목표에 맞춘 수업/프로그램을 빠르게 제안받을 수 있도록 문의를 남겨 주세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={record.nextInquiryCta.href}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {record.nextInquiryCta.label}
          </Link>
          <Link
            href="/spokedu/monthly"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            월간 목록으로 돌아가기
          </Link>
        </div>
      </section>

      <WhySpokeduTrustSection />
    </div>
  );
}
