import Link from 'next/link';
import { ProofMarqueeStrip } from '../components/proof-marquee-strip';
import { RecordPhoto } from '../components/record-photo';
import { SplitCTA } from '../components/blocks';
import { SpokeduRelatedLinks } from '../components/seo-related-links';
import { cases, recordsFeaturedCaseSlugs } from '../data/cases';
import { recordsBottomInquiryCtas } from '../data/ctas';
import { recordsHero } from '../data/content';
import { recordsHubLinks, recordsProofSummaryAreas, recordsProofTiles } from '../data/records-catalog';
import { cardInteractive, fineHover, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { buildSpokeduMetadata } from '../data/seo';
import { insightsCards } from '../data/insights';
import { monthlyRecords } from '../data/monthly';
import { inferTrackFromHref } from '../lib/tracking';

export const metadata = buildSpokeduMetadata('records');

export default function SpokeduRecordsPage() {
  const featuredCases = recordsFeaturedCaseSlugs
    .map((slug) => cases.find((item) => item.slug === slug))
    .filter((item): item is (typeof cases)[number] => Boolean(item));
  const monthlyPreview = monthlyRecords.slice(0, 2);
  const insightsPreview = insightsCards.slice(0, 3);

  return (
    <div className={landingPageStack}>
      {/* 1. Hero */}
      <section className={`${landingHeroShell} border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-lime-50`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Living Proof</p>
        <h1 className={`mt-2 max-w-3xl whitespace-pre-line sm:mt-3 ${landingH1} font-bold text-slate-900 sm:font-semibold sm:text-4xl lg:text-5xl`}>
          {recordsHero.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:mt-4 sm:text-base">
          실제 수업과 기록이 스포키듀의 실체입니다. 사례·월간·인사이트로 운영 증거를 확인하세요.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm sm:hidden">
          {recordsHubLinks.map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-3">
              {index > 0 ? <span className="text-slate-300" aria-hidden>·</span> : null}
              <Link href={link.href} data-track={link.track} className={linkMuted}>
                {link.label}
              </Link>
            </span>
          ))}
        </p>
        <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
          {recordsHubLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-track={link.track}
              data-track-label={link.label}
              className={`rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 ${fineHover}hover:border-indigo-300 ${fineHover}hover:text-indigo-700`}
            >
              {link.label} →
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Proof Summary */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-2xl">실제 현장에서 아이들을 만나고 있습니다</h2>
          <p className="text-xs text-slate-500 sm:text-sm">Proof Wall · 7개 운영 영역</p>
        </div>
        <ProofMarqueeStrip items={recordsProofSummaryAreas} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {recordsProofTiles.map((tile) => (
            <article
              key={tile.label}
              className={`group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:border-slate-300 ${fineHover}hover:shadow-md`}
            >
              <RecordPhoto src={tile.image} alt={tile.alt} category="records" sizes="(max-width: 640px) 50vw, 25vw" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent px-2.5 pb-2.5 pt-8">
                <p className="text-[11px] font-semibold leading-4 text-white sm:text-xs">{tile.label}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. Featured Cases */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-2xl">Featured Cases</h2>
          <Link
            href="/spokedu/cases"
            data-track="cta-records-cases"
            data-track-label="records-all-cases"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
          >
            수업 사례 전체 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {featuredCases.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={item.title}
              className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${cardInteractive} ${fineHover}hover:border-indigo-200`}
            >
              <div className="relative h-36 sm:h-40">
                <RecordPhoto
                  src={item.images[0]?.src}
                  alt={item.images[0]?.alt ?? `${item.title} 현장 사진`}
                  category="records"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {item.institution} · {item.program} · {item.date}
                </p>
                <p className="mt-2 flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {tag}
                    </span>
                  ))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Monthly SPOKEDU */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Monthly SPOKEDU</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">월간 운영 기록</h2>
          </div>
          <Link
            href="/spokedu/monthly"
            data-track="cta-records-monthly"
            data-track-label="records-monthly-hub"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
          >
            월간 스포키듀 →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {monthlyPreview.map((record) => (
            <Link
              key={record.slug}
              href={`/spokedu/monthly/${record.slug}`}
              data-track={inferTrackFromHref(`/spokedu/monthly/${record.slug}`)}
              data-track-label={record.title}
              className={`group overflow-hidden rounded-xl border border-slate-200 ${cardInteractive} ${fineHover}hover:border-indigo-200`}
            >
              <div className="relative h-28">
                <RecordPhoto
                  src={record.images[0]?.src}
                  alt={record.images[0]?.alt ?? record.title}
                  category="monthly"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-slate-900">{record.title}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{record.institutions.join(' · ')}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Education Insights */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Education Insights</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">교육 인사이트</h2>
          </div>
          <Link
            href="/spokedu/insights"
            data-track="cta-records-insights"
            data-track-label="records-insights-hub"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
          >
            인사이트 허브 →
          </Link>
        </div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {insightsPreview.map((card) => (
            <li key={card.slug}>
              <Link
                href="/spokedu/insights"
                data-track="cta-records-insights"
                data-track-label={card.slug}
                className={`block rounded-xl border border-slate-200 bg-white p-3 ${cardInteractive} ${fineHover}hover:border-indigo-200`}
              >
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{card.category}</span>
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{card.title}</h3>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. CTA */}
      <section>
        <SplitCTA
          title="현장 검증된 수업이 필요하신가요?"
          description="개인·기관·커리큘럼 문의를 목적별로 접수합니다."
          buttons={[...recordsBottomInquiryCtas]}
          mobilePriority
        />
      </section>

      <SpokeduRelatedLinks page="records" />
    </div>
  );
}
