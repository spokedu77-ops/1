import type { Metadata } from 'next';
import Link from 'next/link';
import { ImagePlaceholder } from '../components/image-placeholder';
import { SectionHeader, SplitCTA, WhySpokeduTrustSection } from '../components/blocks';
import { cases, recordsFeaturedCaseSlugs, recordsProofSummaryAreas } from '../data/cases';
import { recordsBottomInquiryCtas } from '../data/ctas';
import { recordsHero, seoKeywords, seoMeta } from '../data/content';
import { INSTAGRAM_URL, NAVER_BLOG_URL } from '../data/external-channels';
import { inferTrackFromHref } from '../lib/tracking';
import { monthlyRecords } from '../data/monthly';
import { insightsCards } from '../data/insights';

export const metadata: Metadata = {
  title: seoMeta.records.title,
  description: seoMeta.records.description,
  keywords: [...seoKeywords.records],
  alternates: {
    canonical: '/spokedu/records',
  },
};

export default function SpokeduRecordsPage() {
  const featuredCases = recordsFeaturedCaseSlugs
    .map((slug) => cases.find((item) => item.slug === slug))
    .filter((item): item is (typeof cases)[number] => Boolean(item));
  const latestMonthly = monthlyRecords[0];
  const featuredInsight = insightsCards[0];

  return (
    <div className="space-y-14">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight sm:text-5xl">{recordsHero.title}</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{recordsHero.description}</p>
      </section>

      <section className="space-y-7">
        <SectionHeader
          eyebrow="Proof Summary"
          title="스포키듀가 실제로 운영하는 영역"
          description="스포키듀의 기록은 단순 홍보 자료가 아니라, 수업 운영과 프로그램 개선 과정을 남긴 실행 데이터입니다."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {recordsProofSummaryAreas.map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">{item}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">현장 운영 기준과 결과를 월간 기록/사례/인사이트로 누적합니다.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader
          eyebrow="Featured Cases"
          title="대표 사례"
          description="운영 기관, 대상, 프로그램, 목적이 모두 다른 현장을 실제 실행한 기록입니다."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredCases.map((item) => (
            <article key={item.slug} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <ImagePlaceholder
                slot={`records-featured-${item.slug}`}
                alt={item.images[0]?.alt ?? `${item.title} 사례 이미지`}
                src={item.images[0]?.src}
                title={item.title}
                caption={`${item.institution} · ${item.program} · ${item.date}`}
                className="h-44 rounded-none border-0"
              />
              <div className="p-5">
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {item.type} · 대상 {item.target}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p>
                <Link
                  href={item.href}
                  data-track={inferTrackFromHref(item.href)}
                  data-track-label={item.title}
                  className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-800"
                >
                  사례 상세 보기 →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Monthly SPOKEDU</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">월간 기록은 운영과 커리큘럼 개발의 원천입니다</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            월간 스포키듀는 단순 소식이 아니라, 수업 실행 결과와 개선 포인트를 누적해 다음 달 수업안/강사 교육에 반영하는 운영 문서입니다.
          </p>
          {latestMonthly ? (
            <Link
              href={`/spokedu/monthly/${latestMonthly.slug}`}
              data-track={inferTrackFromHref(`/spokedu/monthly/${latestMonthly.slug}`)}
              data-track-label={latestMonthly.title}
              className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              최신 월간 기록 보기 ({latestMonthly.title}) →
            </Link>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Insight</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">인사이트는 검색용 글이 아니라 교육 관점 아카이브입니다</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            교육 인사이트는 현장에서 반복 검증한 운영 원칙과 수업 철학을 문서화해, 스포키듀의 교육 관점을 축적하는 콘텐츠 허브입니다.
          </p>
          {featuredInsight ? (
            <Link
              href="/spokedu/insights"
              data-track={inferTrackFromHref('/spokedu/insights')}
              data-track-label={featuredInsight.title}
              className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              인사이트 허브 보기 ({featuredInsight.title}) →
            </Link>
          ) : null}
        </article>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">네이버 검색 연결 채널</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          홈페이지 기록은 네이버 블로그·인스타그램 채널과 함께 연결될 때 검색 신뢰도가 높아집니다. 운영 기록 허브를 외부 채널과 함께 관리하세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={NAVER_BLOG_URL}
            target="_blank"
            rel="noreferrer"
            data-track="external-naver-blog"
            data-track-label="records-naver-blog"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            네이버 블로그 연결
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            data-track="external-instagram"
            data-track-label="records-instagram"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            인스타그램 연결
          </a>
          <Link
            href="/spokedu/monthly"
            data-track={inferTrackFromHref('/spokedu/monthly')}
            data-track-label="records-monthly-archive"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            월간 스포키듀 허브 보기
          </Link>
        </div>
      </section>

      <SplitCTA
        title="현장 검증된 수업이 필요하다면, 운영 목적에 맞춰 문의해 주세요."
        description="개인·소그룹 수업, 기관 파견 수업, 커리큘럼·콘텐츠 문의를 목적별로 접수해 실제 운영 조건에 맞춰 제안합니다."
        buttons={[...recordsBottomInquiryCtas]}
        mobilePriority
      />

      <WhySpokeduTrustSection />
    </div>
  );
}
