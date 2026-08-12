'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import {
  homeCaption,
  homeFocusRing,
  homePhotoGrade,
  homeSectionScrollMt,
  koreanText,
  marketingBandSoft,
  marketingButtonSecondary,
  marketingCardStatic,
  marketingEyebrow,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionPad,
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
      className={`${homeSectionScrollMt} ${marketingBandSoft} ${marketingSectionPad}`}
      aria-labelledby="home-records-heading"
    >
      <div className={marketingSectionInner}>
        <motion.div
          className="flex flex-col gap-5 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
        >
          <div className="min-w-0 flex-1">
            <p className={marketingEyebrow}>FIELD PROOF</p>
            <h2 id="home-records-heading" className={`${marketingSectionDisplay} mt-3`}>{homePage.cases.title}</h2>
            <p className={`mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-[17px] ${koreanText}`}>
              {homePage.cases.lead}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
            <TrackedLink
              href={homePage.cases.recordsCta.href}
              trackLabel={homePage.cases.recordsCta.trackLabel}
              className={marketingButtonSecondary}
            >
              {homePage.cases.recordsCta.label}
            </TrackedLink>
          </div>
        </motion.div>

        <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
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

        <dl className="mt-10 grid gap-px overflow-hidden rounded-[22px] border border-[#DCE3EE] bg-[#DCE3EE] md:grid-cols-3">
          {homePage.evidenceStrip.items.slice(0, 3).map((item) => (
            <div key={item.value} className="bg-white p-5 sm:p-6">
              <dt className="[font-family:var(--spokedu-marketing-font-display)] text-2xl leading-tight text-[#0B1F46]">{item.value}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-[#6D7B90]">{item.label}</dd>
            </div>
          ))}
        </dl>
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
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`group block h-full ${homeFocusRing}`}>
      <article className={`${marketingCardStatic} grid h-full grid-rows-[11.5rem_1fr] overflow-hidden sm:grid-rows-[13rem_1fr]`}>
        <div className="relative min-h-0 overflow-hidden">
          <CaseMedia card={card} priority={priority} />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1F46]/30 via-transparent to-transparent"
            aria-hidden
          />
        </div>
        <div className="grid grid-rows-[auto_auto_auto_1fr_auto] gap-0 p-5 sm:p-6">
          <p className={`${homeCaption} font-semibold text-[#245DFF]`}>{card.programType}</p>
          <h3 className={`mt-2 line-clamp-1 text-lg font-bold leading-snug text-[#0B1F46] sm:text-xl ${koreanText}`}>
            {card.programName}
          </h3>
          <p className={`mt-1.5 line-clamp-1 text-sm font-semibold text-slate-700 ${koreanText}`}>{card.venue}</p>
          <p className={`mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 ${koreanText}`}>
            {card.description}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#245DFF]">
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
        quality={90}
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
      objectFit="cover"
    />
  );
}
