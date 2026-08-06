'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../data/home-media';
import { educationHubPage } from '../data/education-hub';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  homeBandWhite,
  homeBodyLead,
  homeFocusRing,
  homeGateCard,
  homePhotoGrade,
  homeSectionEyebrow,
  homeSectionH2,
  homeSectionPadCompact,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { MediaPanel } from './visual';
import { HomeChevron } from './home/home-chevron';
import { TrackedLink } from './home/tracked-link';

/** 체육교육 허브 — 6섹션 완성형 (dispatch/private 본문 비복제) */
export function EducationHubLanding() {
  const reducedMotion = useReducedMotion();
  const { hero, primaryPaths, formats, principles, cases, finalCta } = educationHubPage;

  return (
    <main
      className="w-full overflow-x-clip"
      data-spokedu-education-sections={educationHubPage.sectionOrder.length}
    >
      <section id={hero.id} className={`${homeSectionPadCompact} bg-white`}>
        <div className={siteContainer}>
          <motion.div
            className="max-w-3xl"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className={homeSectionEyebrow}>{hero.eyebrow}</p>
            <h1 className={`${homeSectionH2} mt-3`}>{hero.title}</h1>
            <p className={`${homeBodyLead} mt-4`}>{hero.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedLink
                href={hero.primaryCta.href}
                trackLabel={hero.primaryCta.trackLabel}
                commercialRoute="dispatch"
                ctaIntentId={hero.primaryCta.trackLabel}
                className={`${siteBtnPrimary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={hero.secondaryCta.href}
                trackLabel={hero.secondaryCta.trackLabel}
                commercialRoute="private"
                ctaIntentId={hero.secondaryCta.trackLabel}
                className={`${siteBtnSecondary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {hero.secondaryCta.label}
              </TrackedLink>
            </div>
          </motion.div>
        </div>
      </section>

      <section
        id={primaryPaths.id}
        className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}
        aria-labelledby="education-primary-heading"
      >
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{primaryPaths.eyebrow}</p>
          <h2 id="education-primary-heading" className={`${homeSectionH2} mt-3`}>
            {primaryPaths.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {primaryPaths.lead}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 min-[800px]:grid-cols-2 min-[800px]:gap-5">
            {primaryPaths.items.map((item, index) => {
              const media = HOME_MEDIA[item.mediaKey];
              return (
                <li key={item.id} className="min-w-0">
                  <TrackedLink
                    href={item.href}
                    trackLabel={item.trackLabel}
                    commercialRoute={item.id === 'dispatch' ? 'dispatch' : 'private'}
                    ctaIntentId={item.trackLabel}
                    className={`${homeGateCard} ${homeFocusRing} block h-full`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <MediaPanel
                        media={media}
                        className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
                        sizes="gateCard"
                        photoPriority={index === 0}
                        objectFit="cover"
                      />
                    </div>
                    <div className="flex min-h-[14rem] flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                      <p className="text-[12px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                        {item.badge}
                      </p>
                      <h3
                        className={`mt-1.5 text-lg font-bold tracking-[-0.02em] sm:text-xl ${koreanText}`}
                        style={{ color: brandInk }}
                      >
                        {item.title}
                      </h3>
                      <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.description}</p>
                      <ul className="mt-3.5 flex flex-wrap gap-1.5" aria-label={`${item.title} 포함`}>
                        {item.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="rounded-full border border-[#D6E3FF] bg-[#EAF1FF] px-2.5 py-1 text-[11px] font-semibold text-[#2C446D]"
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                      <span
                        className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[15px] font-semibold"
                        style={{ color: brandBlue }}
                      >
                        {item.ctaLabel}
                        <HomeChevron />
                      </span>
                    </div>
                  </TrackedLink>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section
        id={formats.id}
        className={`${homeSectionPadCompact} ${homeBandWhite}`}
        aria-labelledby="education-formats-heading"
      >
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{formats.eyebrow}</p>
          <h2 id="education-formats-heading" className={`${homeSectionH2} mt-3`}>
            {formats.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {formats.lead}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
            {formats.items.map((item) => (
              <li key={item.id} className="min-w-0">
                <TrackedLink
                  href={item.href}
                  trackLabel={item.trackLabel}
                  className={`flex h-full flex-col rounded-[1.25rem] border border-[#DCE3EE] bg-[#F5F7FB] px-5 py-5 ${homeFocusRing} sm:px-6 sm:py-6`}
                >
                  <h3 className={`text-lg font-bold tracking-tight ${koreanText}`} style={{ color: brandInk }}>
                    {item.title}
                  </h3>
                  <p className={`mt-2 flex-1 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: brandBlue }}>
                    {item.ctaLabel}
                    <HomeChevron />
                  </span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id={principles.id}
        className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}
        aria-labelledby="education-principles-heading"
      >
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{principles.eyebrow}</p>
          <h2 id="education-principles-heading" className={`${homeSectionH2} mt-3`}>
            {principles.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {principles.lead}
          </p>
          <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {principles.steps.map((step, index) => (
              <li
                key={step.label}
                className="rounded-[1.15rem] border border-[#D6E3FF] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,33,70,0.04)]"
              >
                <span className="text-[11px] font-bold tracking-[0.14em]" style={{ color: brandBlue }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className={`mt-2 text-[15px] font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {step.label}
                </h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 max-w-2xl rounded-[1.25rem] border border-[#D6E3FF] bg-white px-5 py-5 sm:px-6">
            <p className={`text-sm leading-relaxed text-[#536279] ${koreanText}`}>{principles.spomoveNote}</p>
            <TrackedLink
              href={principles.spomoveCta.href}
              trackLabel={principles.spomoveCta.trackLabel}
              className={`mt-3 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#245DFF] ${homeFocusRing}`}
            >
              {principles.spomoveCta.label}
              <HomeChevron />
            </TrackedLink>
          </div>
        </div>
      </section>

      <section
        id={cases.id}
        className={`${homeSectionPadCompact} ${homeBandWhite}`}
        aria-labelledby="education-cases-heading"
      >
        <div className={siteContainer}>
          <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
            <div className="max-w-2xl">
              <p className={homeSectionEyebrow}>{cases.eyebrow}</p>
              <h2 id="education-cases-heading" className={`${homeSectionH2} mt-3`}>
                {cases.title}
              </h2>
              <p className={`mt-3 text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
                {cases.lead}
              </p>
            </div>
            <TrackedLink
              href={cases.recordsCta.href}
              trackLabel={cases.recordsCta.trackLabel}
              className={`${siteBtnSecondary} h-11 shrink-0 px-5 ${homeFocusRing}`}
            >
              {cases.recordsCta.label}
            </TrackedLink>
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-4 min-[800px]:grid-cols-3">
            {cases.cards.map((card) => {
              const media = HOME_MEDIA[card.mediaKey as keyof typeof HOME_MEDIA];
              return (
                <li key={card.slug} className="min-w-0">
                  <TrackedLink
                    href={card.href}
                    trackLabel={card.trackLabel}
                    className={`${homeGateCard} ${homeFocusRing} block h-full`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {card.thumbnailSrc ? (
                        <ExternalPhoto
                          src={card.thumbnailSrc}
                          alt={`${card.programLabel} — ${card.venue}`}
                          className="absolute inset-0 h-full w-full"
                          fit="cover"
                          quality={90}
                          sizes="(max-width: 800px) 100vw, 33vw"
                        />
                      ) : media ? (
                        <MediaPanel
                          media={media}
                          className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
                          sizes="gateCard"
                          objectFit="cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex min-h-[11.5rem] flex-1 flex-col px-5 py-5">
                      <p className="text-[12px] font-semibold" style={{ color: brandBlue }}>
                        {card.operationType} · {card.programLabel}
                      </p>
                      <h3 className={`mt-1.5 text-base font-bold leading-snug sm:text-lg ${koreanText}`} style={{ color: brandInk }}>
                        {card.venue}
                      </h3>
                      <p className={`mt-1 text-sm font-medium text-[#6D7B90] ${koreanText}`}>{card.audience}</p>
                      <p className={`mt-2 line-clamp-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                        {card.description}
                      </p>
                      <span
                        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[15px] font-semibold"
                        style={{ color: brandBlue }}
                      >
                        {card.ctaLabel}
                        <HomeChevron />
                      </span>
                    </div>
                  </TrackedLink>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id={finalCta.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <div className="overflow-hidden rounded-[1.75rem] border border-[#D6E3FF] bg-white px-5 py-8 shadow-[0_18px_50px_rgba(15,33,70,0.07)] sm:px-8 sm:py-10">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>
              {finalCta.eyebrow}
            </p>
            <h2 className={`${homeSectionH2} mt-3 text-[1.65rem] sm:text-[2rem]`}>{finalCta.title}</h2>
            <p className={`mt-3 max-w-xl text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>{finalCta.lead}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedLink
                href={finalCta.primary.href}
                trackLabel={finalCta.primary.trackLabel}
                commercialRoute="dispatch"
                ctaIntentId={finalCta.primary.trackLabel}
                className={`${siteBtnPrimary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {finalCta.primary.label}
              </TrackedLink>
              <TrackedLink
                href={finalCta.secondary.href}
                trackLabel={finalCta.secondary.trackLabel}
                commercialRoute="private"
                ctaIntentId={finalCta.secondary.trackLabel}
                className={`${siteBtnSecondary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {finalCta.secondary.label}
              </TrackedLink>
            </div>
            <TrackedLink
              href={finalCta.contactLink.href}
              trackLabel={finalCta.contactLink.trackLabel}
              className={`mt-5 inline-flex text-[14px] font-semibold text-[#536279] underline-offset-4 hover:text-[#14213A] hover:underline ${homeFocusRing} ${koreanText}`}
            >
              {finalCta.contactLink.label}
            </TrackedLink>
          </div>
        </div>
      </section>
    </main>
  );
}
