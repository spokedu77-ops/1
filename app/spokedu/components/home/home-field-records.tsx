'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import {
  fineHover,
  homeCaption,
  homeCaseCard,
  homeCardTitle,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

type CaseCardWithThumb = HomeCaseCard & { thumbnailSrc?: string };

type HomeFieldRecordsProps = {
  caseCards: CaseCardWithThumb[];
};

export function HomeFieldRecords({ caseCards }: HomeFieldRecordsProps) {
  const [featured, ...rest] = caseCards;

  return (
    <section id={homePage.cases.id} className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-white pb-10 sm:pb-12 lg:pb-14`}>
      <div className={siteContainer}>
        <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
          <div>
            <h2 className={homeSectionH2}>{homePage.cases.title}</h2>
            <p className={`mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-[17px] ${koreanText}`}>
              {homePage.cases.lead}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <TrackedLink
              href={homePage.cases.recordsCta.href}
              trackLabel={homePage.cases.recordsCta.trackLabel}
              className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition ${fineHover}hover:border-slate-400 ${fineHover}hover:bg-slate-50 ${homeFocusRing}`}
            >
              {homePage.cases.recordsCta.label}
            </TrackedLink>
            <TrackedLink
              href={homePage.cases.consultCta.href}
              trackLabel={homePage.cases.consultCta.trackLabel}
              className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1D4ED8] px-4 text-sm font-semibold text-white transition ${fineHover}hover:bg-[#1a44c4] ${homeFocusRing}`}
            >
              {homePage.cases.consultCta.label}
            </TrackedLink>
          </div>
        </div>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {homePage.cases.proofStats.map((stat, index) => {
            const accentClass = ['border-[#1D4ED8]', 'border-[#10B981]', 'border-[#F59E0B]'][index] ?? 'border-[#1D4ED8]';
            return (
            <li key={stat.value} className={`min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 ${accentClass} border-l-4`}>
              <p className={`text-base font-extrabold text-[#0B1220] ${koreanText}`}>{stat.value}</p>
              <p className={`mt-1 text-sm leading-snug text-slate-600 ${koreanText}`}>{stat.label}</p>
            </li>
            );
          })}
        </ul>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:gap-5 min-[720px]:mt-10 min-[720px]:grid-cols-2 min-[1180px]:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] min-[1180px]:items-start min-[1180px]:gap-6">
          {featured ? (
            <div className="min-w-0 min-[720px]:col-span-2 min-[1180px]:col-span-1">
              <FeaturedCaseCard card={featured} priority />
            </div>
          ) : null}
          {rest.map((card, index) => (
            <div key={card.slug} className="min-w-0">
              <CompactCaseCard card={card} priority={index === 0} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function mergeHomeCaseCards(resolved: HomeFieldRecordCardWithThumbnail[]): CaseCardWithThumb[] {
  const bySlug = new Map(resolved.map((card) => [card.slug, card]));
  return homePage.cases.cards.map((item) => {
    const resolvedCard = bySlug.get(item.slug);
    return resolvedCard ? { ...item, thumbnailSrc: resolvedCard.thumbnailSrc } : item;
  });
}

function FeaturedCaseCard({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`group block ${homeFocusRing}`}>
      <article className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-slate-200 shadow-sm shadow-slate-900/[0.04]">
        <div className="relative w-full">
          <div className="relative aspect-[16/7] w-full sm:aspect-[16/10] lg:aspect-[4/3]">
            <CaseMedia card={card} priority={priority} />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1220]/55 via-[#0B1220]/5 to-transparent"
              aria-hidden
            />
          </div>
          <div className="border-t border-slate-200/80 bg-white p-4 md:px-6 md:py-[22px] lg:px-7 lg:py-7">
            <p className={`${homeCaption} font-semibold text-[#1D4ED8]`}>{card.programType}</p>
            <h3 className={`${homeCardTitle} mt-2 sm:mt-4`}>{card.programName}</h3>
            <p className={`mt-2 text-sm font-semibold text-slate-700 sm:text-[15px] ${koreanText}`}>{card.venue}</p>
            <p className={`mt-2 line-clamp-1 text-[15px] leading-relaxed text-slate-600 sm:line-clamp-2 ${koreanText}`}>
              {card.description}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8] sm:mt-4 sm:text-base">
              {card.ctaLabel}
              <HomeChevron />
            </span>
          </div>
        </div>
      </article>
    </TrackedLink>
  );
}

function CompactCaseCard({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`group block ${homeFocusRing}`}>
      <article className={`${homeCaseCard} grid grid-cols-[7.25rem_minmax(0,1fr)] sm:flex sm:flex-col`}>
        <div className="relative min-h-[9rem] overflow-hidden sm:aspect-[16/10] sm:min-h-0">
          <CaseMedia card={card} priority={priority} />
        </div>
        <div className="min-w-0 p-4 md:px-6 md:py-[22px] lg:px-7 lg:py-7">
          <p className={`${homeCaption} font-semibold text-[#1D4ED8]`}>{card.programType}</p>
          <h3 className={`mt-2 text-base font-bold leading-snug text-[#0B1220] sm:mt-5 sm:text-[1.35rem] lg:text-2xl ${koreanText}`}>
            {card.programName}
          </h3>
          <p className={`mt-2 text-sm font-semibold text-slate-700 sm:text-[15px] ${koreanText}`}>{card.venue}</p>
          <p className={`mt-2 hidden text-sm text-slate-600 line-clamp-1 sm:block sm:text-[15px] ${koreanText}`}>
            {card.audience}
          </p>
          <p className={`mt-2 hidden text-[15px] leading-relaxed text-slate-600 line-clamp-2 sm:block ${koreanText}`}>
            {card.description}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8] sm:mt-4 sm:text-base">
            {card.ctaLabel}
            <HomeChevron />
          </span>
        </div>
      </article>
    </TrackedLink>
  );
}

function CaseMedia({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  return (
    <MediaPanel
      media={HOME_MEDIA[card.mediaKey]}
      className={`absolute inset-0 h-full w-full border-0 transition duration-500 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
      sizes="gateCard"
      photoPriority={priority}
      priority={priority}
    />
  );
}
