'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import {
  homeCaption,
  homeCaseCard,
  homeCardTitle,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  koreanLineBreak,
  siteContainer,
} from '../../lib/ui-classes';
import { ExternalPhoto } from '../external-photo';
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
    <section id={homePage.cases.id} className={`${homeSectionPadCompact} bg-white pb-12 sm:pb-14 lg:pb-16`}>
      <div className={siteContainer}>
        <h2 className={homeSectionH2}>{homePage.cases.title}</h2>
        <p className={`mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-[17px] ${koreanLineBreak}`}>
          {homePage.cases.lead}
        </p>

        <div className="mt-8 flex flex-col gap-5 lg:mt-10 lg:flex-row lg:items-start lg:gap-6">
          {featured ? (
            <div className="w-full lg:w-[58%] lg:shrink-0">
              <FeaturedCaseCard card={featured} priority />
            </div>
          ) : null}
          <div className="flex w-full min-w-0 flex-col gap-5 lg:flex-1">
            {rest.map((card, index) => (
              <CompactCaseCard key={card.slug} card={card} priority={index === 0} />
            ))}
          </div>
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
      <article className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-200">
        <div className="relative aspect-[4/5] w-full sm:aspect-[3/4] lg:aspect-[5/6]">
          <CaseMedia card={card} priority={priority} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1220]/55 via-[#0B1220]/10 to-transparent" aria-hidden />
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/20 bg-white/95 px-5 py-5 backdrop-blur-sm sm:px-6 sm:py-6">
          <p className={`${homeCaption} font-semibold text-[#1D4ED8]`}>{card.programType}</p>
          <h3 className={`${homeCardTitle} mt-1.5`}>{card.programName}</h3>
          <p className={`mt-2 text-[15px] leading-relaxed text-slate-600 line-clamp-2 ${koreanLineBreak}`}>
            {card.description}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8] sm:text-base">
            {card.ctaLabel}
            <HomeChevron />
          </span>
        </div>
      </article>
    </TrackedLink>
  );
}

function CompactCaseCard({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`group block ${homeFocusRing}`}>
      <article className={`${homeCaseCard} flex flex-col`}>
        <div className="relative aspect-[16/10] overflow-hidden">
          <CaseMedia card={card} priority={priority} />
        </div>
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <p className={`${homeCaption} font-semibold text-[#1D4ED8]`}>{card.programType}</p>
          <h3 className={`${homeCardTitle} mt-1.5`}>{card.programName}</h3>
          <p className={`mt-2 text-sm text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
            {card.audience}
          </p>
          <p className={`mt-2 text-[15px] leading-relaxed text-slate-600 line-clamp-2 ${koreanLineBreak}`}>
            {card.description}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8] sm:text-base">
            {card.ctaLabel}
            <HomeChevron />
          </span>
        </div>
      </article>
    </TrackedLink>
  );
}

function CaseMedia({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  if (card.thumbnailSrc) {
    return (
      <ExternalPhoto
        src={card.thumbnailSrc}
        alt={`${card.programName} 운영 사례`}
        className={`absolute inset-0 transition duration-500 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
        fit="cover"
        priority={priority}
      />
    );
  }

  return (
    <MediaPanel
      media={HOME_MEDIA[card.mediaKey]}
      className={`absolute inset-0 h-full w-full border-0 ${homePhotoGrade}`}
      sizes="gateCard"
      photoPriority={priority}
      priority={priority}
    />
  );
}
