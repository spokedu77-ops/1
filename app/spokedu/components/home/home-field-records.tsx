'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import {
  fineHover,
  homeCaption,
  homeCaseCard,
  homeCardPanelPad,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
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
  const reducedMotion = useReducedMotion();

  return (
    <section
      id={homePage.cases.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-white`}
    >
      <div className={siteContainer}>
        <motion.div
          className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
        >
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
        </motion.div>

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          {caseCards.map((card, index) => (
            <li key={card.slug} className="min-w-0">
              <CaseCard card={card} priority={index < 2} />
            </li>
          ))}
        </ul>
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

function CaseCard({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`group flex h-full ${homeFocusRing}`}>
      <article className={`${homeCaseCard} h-full`}>
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <CaseMedia card={card} priority={priority} />
        </div>
        <div className={`flex min-h-0 flex-1 flex-col ${homeCardPanelPad}`}>
          <p className={`${homeCaption} font-semibold text-[#1D4ED8]`}>{card.programType}</p>
          <h3 className={`mt-2 text-lg font-bold leading-snug text-[#0B1220] ${koreanText}`}>{card.programName}</h3>
          <p className={`mt-2 text-sm font-semibold text-slate-700 ${koreanText}`}>{card.venue}</p>
          <p className={`mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600 ${koreanText}`}>
            {card.description}
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8]">
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
        alt={`${card.programName} — ${card.venue}`}
        className={`absolute inset-0 transition duration-500 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
        fit="cover"
        priority={priority}
      />
    );
  }

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
