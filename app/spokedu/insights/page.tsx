import Link from 'next/link';
import { HeroCtaStack } from '../components/hero-cta-stack';
import { NAVER_BLOG_URL } from '../data/external-channels';
import { insightsCards, insightsCategories } from '../data/insights';
import { buildSpokeduPageMetadata, seoMetaInsights } from '../data/seo';
import { cardInteractive, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

export const metadata = buildSpokeduPageMetadata({
  ...seoMetaInsights,
  canonical: '/spokedu/insights',
  keywords: ['아동 체육교육', 'SPOMOVE', 'PAPS', '체육 커리큘럼', '학부모 가이드'],
});

export default function SpokeduInsightsPage() {
  return (
    <div className={landingPageStack}>
      <section className={`${landingHeroShell} border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-lime-50`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Education Insights</p>
        <h1 className={`mt-2 sm:mt-3 ${landingH1} text-slate-950`}>교육 인사이트 허브</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
          블로그형 장문이 아닌, 홈페이지 안에서 바로 연결되는 카드형 전문성 허브입니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {insightsCategories.map((category) => (
            <span key={category} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 sm:text-xs">
              {category}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <HeroCtaStack
            primary={{ href: '/spokedu/contact?type=private', label: '학부모 상담', track: 'cta-private' }}
            secondary={[
              { href: '/spokedu/contact?type=dispatch', label: '기관 문의', track: 'cta-dispatch' },
              { href: '/spokedu/records', label: '현장기록', track: 'cta-records' },
            ]}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">인사이트 카드</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {insightsCards.map((card) => (
            <li key={card.slug}>
              <article className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 ${cardInteractive}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{card.category}</span>
                  <span className="text-[11px] text-slate-500">{card.target}</span>
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{card.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{card.summary}</p>
                <Link
                  href={card.href}
                  data-track={inferTrackFromHref(card.href)}
                  data-track-label={card.slug}
                  className={`mt-3 inline-flex text-sm ${linkMuted}`}
                >
                  연결 페이지 →
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {NAVER_BLOG_URL ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">네이버 블로그</h2>
          <p className="mt-1 text-sm text-slate-600">더 긴 후기와 운영 이야기는 블로그에서 이어집니다.</p>
          <a
            href={NAVER_BLOG_URL}
            target="_blank"
            rel="noreferrer"
            data-track="external-naver-blog"
            className={`mt-3 inline-flex text-sm ${linkMuted}`}
          >
            블로그 바로가기 →
          </a>
        </section>
      ) : null}
    </div>
  );
}
