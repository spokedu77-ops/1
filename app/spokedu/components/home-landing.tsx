'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA, HOME_PROOF_FIELDS } from '../data/home-media';
import { homePage } from '../data/home-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  btnPrimary,
  cardInteractive,
  fineHover,
  homeHeroH1,
  homeHeroH1Line,
  homeHeroShell,
  homeSectionEyebrow,
  landingHeroSubtitle,
  homeIntroCluster,
  homePageStack,
  homeSectionInner,
  homeSectionInnerLg,
  homeSkipLink,
  koreanLineBreak,
} from '../lib/ui-classes';
import { HomeFinalCta } from './home-final-cta';
import { HomeSectionRule } from './home-section-rule';
import { HomeHeroEditorial } from './home-hero-editorial';
import { HomePhotoZoom } from './home-photo-zoom';
import { HomeSectionHeading } from './home-section-heading';
import { HomeProgramSystem } from './visual/home-program-system';
import { MediaPanel } from './visual';

const heroMain = HOME_MEDIA.homeHero;
const heroThumbA = HOME_MEDIA.proofLab;
const heroThumbB = HOME_MEDIA.heroThumbMedia;

const gateMedia = [HOME_MEDIA.trackPrivate, HOME_MEDIA.trackDispatch, HOME_MEDIA.gateCurriculum] as const;

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const gateAccent = [
  'border-t-indigo-400/80',
  'border-t-sky-400/80',
  'border-t-violet-400/80',
] as const;

function Section({
  id,
  children,
  className = '',
  delay = 0,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function resolveFieldProof(card: (typeof homePage.fieldRecords.cards)[number]) {
  const field = HOME_PROOF_FIELDS.find((f) => f.id === card.proofId);
  if (!field) return null;
  return {
    field,
    tagline: card.tagline,
    venue: card.venue,
    sessionLine: card.sessionLine,
    href: card.href,
    trackLabel: card.trackLabel,
  };
}

function FieldProofCaption({
  tagline,
  venue,
  sessionLine,
}: {
  tagline: string;
  venue: string;
  sessionLine: string;
}) {
  return (
    <div className="col-start-1 row-start-1 self-end bg-gradient-to-t from-slate-950/85 via-slate-950/50 to-transparent px-4 pb-4 pt-16 sm:px-5 sm:pb-5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-200 sm:text-xs">
        {tagline}
      </span>
      <h3 className={`mt-1 text-base font-bold leading-snug text-white sm:text-lg ${koreanLineBreak}`}>
        {venue}
      </h3>
      <p className={`mt-1 text-sm leading-snug text-slate-200 ${koreanLineBreak}`}>{sessionLine}</p>
    </div>
  );
}

function FieldProofLink({
  href,
  trackLabel,
  featured,
  children,
}: {
  href: string;
  trackLabel: string;
  featured?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      data-track={inferTrackFromHref(href)}
      data-track-label={trackLabel}
      className={`group grid w-full grid-cols-1 grid-rows-1 overflow-hidden rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/10 transition duration-300 sm:rounded-[1.35rem] ${
        featured
          ? 'min-h-[300px] sm:min-h-[340px] lg:min-h-[520px] lg:max-h-[560px]'
          : 'min-h-[280px] sm:min-h-[300px] lg:min-h-[260px] lg:max-h-[300px]'
      } ${cardInteractive} ${focusRing}`}
    >
      {children}
    </Link>
  );
}

export default function SpokeduHomeLanding() {
  const reducedMotion = useReducedMotion();
  const fieldProofItems = homePage.fieldRecords.cards
    .map((c) => resolveFieldProof(c))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const [featuredField, ...secondaryFields] = fieldProofItems;

  return (
    <div className={homePageStack}>
      <a href={`#${homePage.visitorGate.id}`} className={homeSkipLink}>
        맞춤 선택으로 건너뛰기
      </a>
      <div className={homeIntroCluster}>
        {/* 1. Hero */}
        <section className={homeHeroShell}>
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:items-center lg:gap-10 xl:gap-12">
          <div className="order-1 min-w-0 lg:order-1">
            <p className={homeSectionEyebrow}>{homePage.hero.kicker}</p>
            <motion.h1
              className={`${homeHeroH1} mt-2 sm:mt-2.5`}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <span className={homeHeroH1Line}>{homePage.hero.lines[0]}</span>
              <span className={homeHeroH1Line}>{homePage.hero.lines[1]}</span>
            </motion.h1>
            <div className="mt-5 space-y-4 sm:mt-6">
              <div className="max-w-lg space-y-2.5">
                {homePage.hero.subtitleParagraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 24)}
                    className={`${landingHeroSubtitle} text-slate-600 ${koreanLineBreak}`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-label="스포키듀 운영 축">
                {homePage.hero.supportChips.map((chip) => (
                  <li
                    key={chip}
                    className={`inline-flex rounded-full border border-slate-200/80 bg-slate-50/90 px-3.5 py-2 text-[13px] font-semibold leading-snug text-slate-800 sm:text-sm ${koreanLineBreak}`}
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 sm:mt-7">
              <Link
                href={homePage.heroCtas.primary.href}
                data-track="cta-contact"
                data-track-label={homePage.heroCtas.primary.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {homePage.heroCtas.primary.label}
              </Link>
            </div>
          </div>
          <div className="order-2 lg:order-2">
            <HomeHeroEditorial main={heroMain} thumbA={heroThumbA} thumbB={heroThumbB} />
          </div>
        </div>
        </section>
      </div>

      <HomeSectionRule />

      {/* 2. Visitor Gate */}
      <Section id={homePage.visitorGate.id} className={`scroll-mt-20 ${homeSectionInner}`}>
        <HomeSectionHeading
          eyebrow={homePage.visitorGate.eyebrow}
          title={homePage.visitorGate.title}
          lead={homePage.visitorGate.lead}
        />
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-5">
          {homePage.visitorGate.cards.map((card, index) => (
            <motion.div
              key={card.href}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.08 * index }}
              className="min-h-0"
            >
              <Link
                href={card.href}
                data-track={inferTrackFromHref(card.href)}
                data-track-label={card.trackLabel}
                className={`group relative flex min-h-[340px] flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/90 border-t-4 bg-white sm:min-h-[380px] md:min-h-[440px] ${gateAccent[index] ?? ''} ${cardInteractive} ${focusRing}`}
              >
                <span
                  className="pointer-events-none absolute right-4 top-4 z-10 text-4xl font-black leading-none text-slate-950/10"
                  aria-hidden
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="relative h-[min(48vw,220px)] min-h-[200px] shrink-0 overflow-hidden sm:h-[220px] md:h-[min(26vw,260px)] md:min-h-[240px]">
                  <HomePhotoZoom className="absolute inset-0 h-full w-full">
                    <MediaPanel
                      media={gateMedia[index]}
                      className="absolute inset-0 h-full w-full rounded-none border-0"
                      sizes="gateCard"
                      photoPriority={index === 0}
                    />
                  </HomePhotoZoom>
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent"
                    aria-hidden
                  />
                </div>
                <div className="flex min-h-[160px] flex-1 flex-col justify-between p-4 sm:min-h-[170px] sm:p-5 md:min-h-[180px]">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.audience}</p>
                    <h3
                      className={`mt-0.5 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl ${koreanLineBreak}`}
                    >
                      {card.title}
                    </h3>
                    <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
                      {card.description}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`mt-3 text-sm font-semibold text-indigo-700 ${fineHover}group-hover:text-indigo-800`}
                  >
                    {card.linkLabel} →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      <HomeSectionRule />

      {/* 3. Field Records — 대표 1 + 보조 3 (페이지 최대 비주얼 무게) */}
      <Section className={homeSectionInnerLg}>
        <HomeSectionHeading
          eyebrow={homePage.fieldRecords.eyebrow}
          title={homePage.fieldRecords.title}
          lead={homePage.fieldRecords.lead}
        />
        <div className="flex flex-col gap-4" role="list" aria-label="현장 운영 증거">
          {featuredField ? (
            <motion.div
              role="listitem"
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45 }}
            >
              <FieldProofLink
                href={featuredField.href}
                trackLabel={featuredField.trackLabel}
                featured
              >
                <HomePhotoZoom className="col-start-1 row-start-1 h-full min-h-[300px] w-full lg:min-h-[520px]">
                  <MediaPanel
                    media={featuredField.field.media}
                    className="absolute inset-0 h-full w-full rounded-none border-0"
                    sizes="fieldFeatured"
                    photoPriority
                  />
                </HomePhotoZoom>
                <FieldProofCaption
                  tagline={featuredField.tagline}
                  venue={featuredField.venue}
                  sessionLine={featuredField.sessionLine}
                />
              </FieldProofLink>
            </motion.div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {secondaryFields.map(({ field, tagline, venue, sessionLine, href, trackLabel }, index) => (
              <motion.div
                key={field.id}
                role="listitem"
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: 0.05 * (index + 1) }}
              >
                <FieldProofLink href={href} trackLabel={trackLabel}>
                  <HomePhotoZoom className="col-start-1 row-start-1 h-full min-h-[280px] w-full lg:min-h-[240px]">
                    <MediaPanel
                      media={field.media}
                      className="absolute inset-0 h-full w-full rounded-none border-0"
                      sizes="fieldSecondary"
                    />
                  </HomePhotoZoom>
                  <FieldProofCaption tagline={tagline} venue={venue} sessionLine={sessionLine} />
                </FieldProofLink>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="pt-1 sm:pt-2">
          <Link
            href={homePage.fieldRecords.recordsHref}
            data-track={inferTrackFromHref(homePage.fieldRecords.recordsHref)}
            data-track-label={homePage.fieldRecords.recordsTrackLabel}
            className={`inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 ${fineHover}hover:border-indigo-200 ${fineHover}hover:bg-indigo-50 ${fineHover}hover:text-indigo-900 ${focusRing}`}
          >
            {homePage.fieldRecords.recordsCtaLabel} →
          </Link>
        </p>
      </Section>

      <HomeSectionRule />

      {/* 4. Program System */}
      <Section id="program-system" className={homeSectionInner} delay={0.02}>
        <HomeSectionHeading
          eyebrow={homePage.programSystem.eyebrow}
          title={homePage.programSystem.title}
          lead={homePage.programSystem.lead}
          multilineTitle
        />
        <HomeProgramSystem items={homePage.programSystem.items} />
      </Section>

      <Section delay={0.03}>
        <HomeFinalCta />
      </Section>
    </div>
  );
}
