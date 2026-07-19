'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import {
  homeCaption,
  homeCaseCard,
  homeCardPanelPad,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
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
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-[#F3F7FC]`}
    >
      <div className={siteContainer}>
        <motion.div
          className="flex flex-col gap-5 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">현장 기록</p>
            <h2 className={`${homeSectionH2} mt-3`}>{homePage.cases.title}</h2>
            <p className={`mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-[17px] ${koreanText}`}>
              {homePage.cases.lead}
            </p>
            <dl className="mt-5 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
              {homePage.cases.proofStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3"
                >
                  <dt className={`text-sm font-bold text-[#0B1220] ${koreanText}`}>{stat.value}</dt>
                  <dd className={`mt-1 text-xs leading-snug text-slate-500 ${koreanText}`}>{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <TrackedLink
              href={homePage.cases.recordsCta.href}
              trackLabel={homePage.cases.recordsCta.trackLabel}
              className={`${siteBtnSecondary} ${homeFocusRing}`}
            >
              {homePage.cases.recordsCta.label}
            </TrackedLink>
            <TrackedLink
              href={homePage.cases.consultCta.href}
              trackLabel={homePage.cases.consultCta.trackLabel}
              className={`${siteBtnPrimary} ${homeFocusRing}`}
            >
              {homePage.cases.consultCta.label}
            </TrackedLink>
          </div>
        </motion.div>

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          {caseCards.map((card, index) => (
            <motion.li
              key={card.slug}
              className="min-w-0"
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: Math.min(index, 3) * 0.05 }}
            >
              <CaseCard card={card} priority={index < 2} />
            </motion.li>
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
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1220]/25 via-transparent to-transparent opacity-80"
            aria-hidden
          />
        </div>
        <div className={`flex min-h-0 flex-1 flex-col ${homeCardPanelPad}`}>
          <p className={`${homeCaption} font-semibold text-[#1D4ED8]`}>{card.programType}</p>
          <h3 className={`mt-2 text-lg font-bold leading-snug text-[#0B1220] sm:text-xl ${koreanText}`}>
            {card.programName}
          </h3>
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
  const hoverZoom =
    'transition duration-500 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04]';

  if (card.thumbnailSrc) {
    return (
      <ExternalPhoto
        src={card.thumbnailSrc}
        alt={`${card.programName} — ${card.venue}`}
        className={`absolute inset-0 h-full w-full ${hoverZoom}`}
        fit="cover"
        priority={priority}
        sizes="(max-width: 640px) 100vw, 50vw"
      />
    );
  }

  return (
    <MediaPanel
      media={HOME_MEDIA[card.mediaKey]}
      className={`absolute inset-0 h-full w-full border-0 ${hoverZoom} ${homePhotoGrade}`}
      sizes="gateCard"
      photoPriority={priority}
      priority={priority}
    />
  );
}
