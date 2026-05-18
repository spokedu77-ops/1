import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PhilosophyCard,
  ProgramAssetCard,
  ProofCard,
  SectionHeader,
  SiteHero,
  SplitCTA,
  TrackCard,
  WhySpokeduTrustSection,
} from './components/blocks';
import {
  coreTracks,
  homeHeroImage,
  philosophyCards,
  proofItems,
  seoKeywords,
} from './data/content';
import { operationalCaseLinks } from './data/cases';
import { homeHeroTrackCtas, homeInquiryCtas, homeThreeTrackInquiryCtas } from './data/ctas';
import { NAVER_BLOG_URL } from './data/external-channels';
import { consultationPackageGroups, programAssets } from './data/programs';
import { inferTrackFromHref } from './lib/tracking';

export const metadata: Metadata = {
  title: 'SPOKEDU 스포키듀 | 아동·청소년 체육교육 전문 단체',
  description:
    'SPOKEDU는 아이들의 움직임을 교육적으로 설계하고, 그 움직임을 수업·커리큘럼·콘텐츠로 확장하는 아동·청소년 체육교육 전문 단체입니다.',
  keywords: [...seoKeywords.home],
  alternates: {
    canonical: '/spokedu',
  },
};

export default function SpokeduHomePage() {
  const trackInquiryCtas = homeThreeTrackInquiryCtas;

  return (
    <div className="space-y-12 sm:space-y-16">
      <SiteHero
        title={'움직임으로 아이의 성장을 설계합니다.'}
        description={
          '스포키듀는 아동·청소년 체육교육을 운영하는 팀입니다.\n가정에는 개인·소그룹 수업을,\n기관에는 파견형 프로그램을,\n교육 파트너에게는 커리큘럼·콘텐츠를 제안합니다.'
        }
        keywords={['Private Class', 'Dispatch Solution', 'Curriculum & Contents']}
        heroVisual={homeHeroImage}
        highlights={[
          {
            title: 'Private Class',
            description: '개인·소그룹 수업으로 아이의 움직임 자신감과 기본 기능을 설계합니다.',
          },
          {
            title: 'Dispatch Solution',
            description: '기관의 공간·인원·운영 목적에 맞춘 파견형 체육교육을 제안합니다.',
          },
          {
            title: 'Curriculum & Contents',
            description: '현장 수업을 커리큘럼·콘텐츠·강사교육 자산으로 확장합니다.',
          },
        ]}
        ctas={[...homeHeroTrackCtas]}
      />

      <section className="space-y-6 sm:space-y-8">
        <SectionHeader
          eyebrow="Philosophy"
          title="스포키듀는 체육을 움직임 교육으로 설계합니다."
          description="많이 움직이는 것에 그치지 않고, 보고 판단하고 함께 실행하는 과정을 수업 구조 안에서 설계합니다."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {philosophyCards.map((card) => (
            <PhilosophyCard key={card.code} {...card} />
          ))}
        </div>
      </section>

      <section className="space-y-6 sm:space-y-8">
        <SectionHeader eyebrow="Three Tracks" title="우리는 세 가지 방식으로 체육교육을 만듭니다" />
        <div className="grid gap-4 md:grid-cols-3">
          {coreTracks.map((track, idx) => (
            <TrackCard key={track.title} {...track} inquiryCta={trackInquiryCtas[idx]} />
          ))}
        </div>
      </section>

      <section className="space-y-6 sm:space-y-8">
        <SectionHeader
          eyebrow="Consultation Packages"
          title="가격표 대신, 상담형 패키지 구조로 제안합니다"
          description="가격은 고정 노출하지 않고 대상/운영 조건을 먼저 확인한 뒤 상담형으로 제안합니다."
        />
        <div className="space-y-6 sm:space-y-8">
          {consultationPackageGroups.map((group) => (
            <article key={group.track} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:space-y-4 sm:p-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{group.track}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
              </div>
              <div className="grid gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.packages.map((pkg) => (
                  <div key={`${group.track}-${pkg.title}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
                    <h4 className="text-base font-semibold text-slate-900">{pkg.title}</h4>
                    <dl className="mt-3 space-y-2 text-sm text-slate-700">
                      <div>
                        <dt className="font-semibold text-slate-900">대상</dt>
                        <dd className="mt-0.5 leading-6">{pkg.target}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">추천 상황</dt>
                        <dd className="mt-0.5 leading-6">{pkg.recommendedSituation}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">운영 형태</dt>
                        <dd className="mt-0.5 leading-6">{pkg.operationFormat}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs font-medium text-indigo-700">
                      견적: {pkg.quotePolicy}
                    </p>
                    <Link
                      href={pkg.ctaHref}
                      data-track={inferTrackFromHref(pkg.ctaHref)}
                      data-track-label={pkg.ctaLabel}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {pkg.ctaLabel}
                    </Link>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:space-y-6 sm:p-8">
        <SectionHeader
          eyebrow="Choose Your Inquiry"
          title="지금 필요한 문의 유형을 바로 선택하세요"
          description="페이지를 끝까지 보기 전에, 현재 목적에 맞는 문의부터 연결할 수 있습니다."
        />
        <div className="grid gap-2 md:grid-cols-3 md:gap-3">
          {homeInquiryCtas.map((cta, idx) => (
            <Link
              key={cta.label}
              href={cta.href}
              data-track={cta.track ?? inferTrackFromHref(cta.href)}
              data-track-label={cta.label}
              className={`rounded-2xl border p-4 text-sm font-semibold transition hover:border-indigo-300 ${
                idx === 0
                  ? 'border-slate-900 bg-slate-900 text-white md:border-slate-200 md:bg-white md:text-slate-900'
                  : 'border-slate-200 text-slate-900'
              }`}
            >
              {cta.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6 sm:space-y-8">
        <SectionHeader
          eyebrow="Living Proof"
          title="SPOKEDU는 실제 현장에서 아이들을 만나고 있습니다"
          description="가정과 기관 수업에서 쌓인 운영 경험을 기록으로 남기고, 다음 수업 설계에 반영합니다."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proofItems.map((item) => (
            <ProofCard key={item.title} {...item} />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {operationalCaseLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={item.href === '/spokedu/records' ? 'cta-records' : inferTrackFromHref(item.href)}
              data-track-label={item.label}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6 sm:space-y-8">
        <SectionHeader
          eyebrow="Signature Programs"
          title={'프로그램은 상품 목록이 아니라,\n스포키듀의 수업 콘텐츠 자산입니다'}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programAssets.map((asset) => (
            <ProgramAssetCard key={asset.title} {...asset} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Live Channels</p>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
          스포키듀의 실제 수업 기록과 교육 이야기는
          {'\n'}
          월간 스포키듀와 네이버 블로그에서도 확인할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/spokedu/monthly"
            data-track={inferTrackFromHref('/spokedu/monthly')}
            data-track-label="home-live-monthly"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            월간 스포키듀 보기
          </Link>
          <a
            href={NAVER_BLOG_URL}
            target="_blank"
            rel="noreferrer"
            data-track="external-naver-blog"
            data-track-label="home-live-naver-blog"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            네이버 블로그 보기
          </a>
        </div>
      </section>

      <SplitCTA
        title={'아이에게는 수업을,\n기관에는 프로그램을,\n선생님에게는 커리큘럼을.'}
        description="과장된 약속보다 운영 가능한 제안을 드립니다. 목적과 조건을 확인해 맞는 흐름을 설계합니다."
        buttons={[...homeInquiryCtas]}
        mobilePriority
      />

      <WhySpokeduTrustSection />
    </div>
  );
}
