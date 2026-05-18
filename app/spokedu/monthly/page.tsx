import type { Metadata } from 'next';
import Link from 'next/link';
import { ImagePlaceholder } from '../components/image-placeholder';
import { SectionHeader, WhySpokeduTrustSection } from '../components/blocks';
import { NAVER_BLOG_URL } from '../data/external-channels';
import { monthlyRecords } from '../data/monthly';

export const metadata: Metadata = {
  title: '월간 스포키듀 | SPOKEDU 운영 아카이브',
  description: '월별 운영 기록과 주요 업데이트를 한국어 아카이브 형태로 정리합니다.',
  alternates: {
    canonical: '/spokedu/monthly',
  },
  openGraph: {
    title: '월간 스포키듀 | SPOKEDU 운영 아카이브',
    description: '월별 운영 기록과 주요 업데이트를 한국어 아카이브 형태로 정리합니다.',
    url: '/spokedu/monthly',
    locale: 'ko_KR',
    type: 'website',
    siteName: 'SPOKEDU',
  },
};

export default function SpokeduMonthlyPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-5xl">월간 스포키듀</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          매월 운영 기록을 아카이브로 누적해, 기관/프로그램/교육 포인트를 같은 형식으로 관리합니다.
        </p>
      </section>
      <section className="space-y-6">
        <SectionHeader title="월간 아카이브" description="월별 카드에서 대표 내용을 확인하고 상세 페이지에서 전체 기록을 확인할 수 있습니다." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {monthlyRecords.map((record) => (
            <article key={record.slug} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <ImagePlaceholder
                slot={`monthly-${record.slug}`}
                alt={record.images[0]?.alt ?? `${record.title} 대표 이미지`}
                src={record.images[0]?.src}
                title={record.images[0]?.title ?? '월간 대표 사진'}
                caption={record.title}
                className="h-44"
              />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{record.title}</h2>
              <p className="mt-2 text-sm text-slate-600">함께한 기관 {record.institutions.length}곳 · 운영 프로그램 {record.programs.length}개</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {record.programs.slice(0, 3).map((program) => (
                  <span key={program} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    {program}
                  </span>
                ))}
              </div>
              <Link
                href={`/spokedu/monthly/${record.slug}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                상세 기록 보기
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">네이버 블로그 운영 후기</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          자세한 수업 후기는 네이버 블로그에서 확인할 수 있도록 연결할 예정입니다.
        </p>
        <a
          href={NAVER_BLOG_URL}
          target="_blank"
          rel="noreferrer"
          data-track="external-naver-blog"
          data-track-label="monthly-naver-blog"
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
        >
          네이버 블로그에서 자세히 보기
        </a>
      </section>

      <WhySpokeduTrustSection />
    </div>
  );
}
