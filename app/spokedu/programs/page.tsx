import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SplitCTA } from '../components/blocks';
import { homeInquiryCtas } from '../data/ctas';
import { seoKeywords, seoMeta } from '../data/content';
import { programCatalogCards, trackUsageRows, type ProgramTrack } from '../data/programs-catalog';

export const metadata: Metadata = {
  title: seoMeta.programs.title,
  description: seoMeta.programs.description,
  keywords: [...seoKeywords.programs],
  alternates: {
    canonical: '/spokedu/programs',
  },
};

const trackBadgeClass: Record<ProgramTrack, string> = {
  Private: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Dispatch: 'border-sky-200 bg-sky-50 text-sky-800',
  Curriculum: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

function TrackBadges({ tracks }: { tracks: ProgramTrack[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tracks.map((track) => (
        <span
          key={track}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-[11px] ${trackBadgeClass[track]}`}
        >
          {track}
        </span>
      ))}
    </div>
  );
}

export default function SpokeduProgramsPage() {
  const featured = programCatalogCards[0];

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* 1. Hero */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-lime-50 p-5 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Program Assets</p>
        <h1 className="mt-3 max-w-3xl whitespace-pre-line text-[1.75rem] font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
          프로그램은 상품 목록이 아니라,{'\n'}스포키듀의 수업 콘텐츠 자산입니다
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
          SPOMOVE, PAPS, 놀이체육, 원데이, 방학캠프, 커리큘럼 콘텐츠는 아이·기관·선생님을 연결하는 스포키듀의 핵심 자산입니다.
        </p>
      </section>

      {/* 2. Program Asset Grid */}
      <section className="space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">콘텐츠 자산 카탈로그</h2>
          <p className="text-xs text-slate-500 sm:text-sm">6개 프로그램 · 연결 축·효과 빠른 비교</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {programCatalogCards.map((program) => (
            <article
              key={program.slug}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md sm:p-4"
            >
              <div className="relative mb-3 h-28 overflow-hidden rounded-xl bg-slate-100 sm:h-32">
                <Image
                  src={program.image}
                  alt={program.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover transition duration-200 group-hover:scale-[1.02]"
                />
              </div>
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{program.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600">{program.description}</p>
              <div className="mt-3">
                <TrackBadges tracks={program.tracks} />
              </div>
              <p className="mt-2.5 text-[11px] leading-5 text-slate-500 sm:text-xs">{program.effects.join(' · ')}</p>
              <Link
                href={program.ctaHref}
                data-track={program.ctaTrack}
                data-track-label={program.ctaLabel}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {program.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* 3. Track별 활용 방식 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Track별 활용 방식</h2>
        <p className="mt-1 text-sm text-slate-600">같은 자산도 운영 목적에 따라 다른 축으로 연결됩니다.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {trackUsageRows.map((row) => (
            <Link
              key={row.label}
              href={row.href}
              data-track={row.label === 'Private' ? 'cta-private' : row.label === 'Dispatch' ? 'cta-dispatch' : 'cta-curriculum'}
              data-track-label={`programs-track-${row.label}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{row.label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{row.track}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{row.summary}</p>
              <p className="mt-3 text-[11px] font-medium text-slate-500">{row.programs.join(' · ')}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Featured Program CTA */}
      <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-300">Featured Asset</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">{featured.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">{featured.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {featured.effects.map((effect) => (
                <span key={effect} className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-200">
                  {effect}
                </span>
              ))}
            </div>
          </div>
          <Link
            href={featured.ctaHref}
            data-track={featured.ctaTrack}
            data-track-label="featured-spomove"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-indigo-50"
          >
            {featured.title} 자세히 보기
          </Link>
        </div>
      </section>

      {/* 5. Final CTA */}
      <SplitCTA
        title="목적에 맞는 프로그램 조합이 필요하신가요?"
        description="아이 수업, 기관 파견, 커리큘럼 도입 중 무엇이 맞는지 빠르게 안내받을 수 있습니다."
        buttons={[...homeInquiryCtas]}
        mobilePriority
      />
    </div>
  );
}
