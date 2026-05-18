import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeader, WhySpokeduTrustSection } from '../components/blocks';
import { NAVER_BLOG_URL } from '../data/external-channels';
import { insightsCards, insightsCategories } from '../data/insights';

export const metadata: Metadata = {
  title: '아동·청소년 체육교육 인사이트 | SPOKEDU 콘텐츠 허브',
  description: '학부모 가이드, 기관 프로그램, SPOMOVE, PAPS, 커리큘럼·강사교육, 수업 사례 인사이트를 모은 검색 유입형 콘텐츠 허브입니다.',
  keywords: [
    '아동 체육교육',
    '청소년 체육교육',
    '학부모 체육 가이드',
    '키움센터 체육 프로그램',
    'SPOMOVE',
    'PAPS 놀이체육',
    '체육 커리큘럼',
    '놀이체육 수업안',
  ],
  alternates: {
    canonical: '/spokedu/insights',
  },
  openGraph: {
    title: '아동·청소년 체육교육 인사이트 | SPOKEDU 콘텐츠 허브',
    description: '학부모 가이드, 기관 프로그램, SPOMOVE, PAPS, 커리큘럼·강사교육, 수업 사례 인사이트를 모은 검색 유입형 콘텐츠 허브입니다.',
    url: '/spokedu/insights',
    locale: 'ko_KR',
    type: 'website',
    siteName: 'SPOKEDU',
  },
};

export default function SpokeduInsightsPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-5xl">아동·청소년 체육교육 인사이트 허브</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          아동·청소년 체육교육 키워드 기반으로 학부모, 기관 담당자, 강사에게 필요한 콘텐츠를 카테고리별로 모았습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {insightsCategories.map((category) => (
            <span key={category} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader title="초기 인사이트 카드" description="상세 글 발행 전에도 키워드 허브 역할을 할 수 있도록 제목·요약·추천 대상·SEO 키워드를 함께 제공합니다." />
        <div className="grid gap-4 md:grid-cols-2">
          {insightsCards.map((card) => (
            <article key={card.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{card.category}</span>
                <span className="text-xs font-medium text-slate-500">{card.target}</span>
              </div>
              <h2 className="mt-3 text-base font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {card.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    #{keyword}
                  </span>
                ))}
              </div>
              <Link
                href={card.href}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                연결 페이지 이동
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">네이버 블로그 연동</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          인사이트 허브와 함께 실제 수업 후기/운영 이야기는 네이버 블로그 채널에서도 이어서 확인할 수 있습니다.
        </p>
        <a
          href={NAVER_BLOG_URL}
          target="_blank"
          rel="noreferrer"
          data-track="external-naver-blog"
          data-track-label="insights-naver-blog"
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
        >
          네이버 블로그 바로가기
        </a>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">다음 단계</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          카드별 상세 글은 추후 발행할 수 있도록 `slug`를 미리 부여했습니다. 상세 페이지가 생기면 연결 경로만 변경하면 됩니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/spokedu/contact?type=private" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
            학부모 상담 문의
          </Link>
          <Link href="/spokedu/contact?type=dispatch" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
            기관 프로그램 문의
          </Link>
          <Link href="/spokedu/contact?type=curriculum" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
            커리큘럼 문의
          </Link>
        </div>
      </section>

      <WhySpokeduTrustSection />
    </div>
  );
}
