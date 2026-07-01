'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../data/home-media';
import { homePage, type HomeCaseCard, type HomeCoreBusinessItem } from '../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { externalLinkProps, isExternalHref } from '../lib/external-link';
import { inferTrackFromHref } from '../lib/tracking';
import {
  brandNavy,
  brandSurface,
  homeBody,
  homeBodyLead,
  homeBodyLeadOnDark,
  homeCaption,
  homeCardTitle,
  homeHeroTitle,
  homePhotoGrade,
  homeSectionEyebrowDark,
  homeSectionEyebrowLight,
  homeSectionH2,
  homeSectionH2OnDark,
  koreanLineBreak,
  siteBtnGhostOnDark,
  siteBtnPrimary,
  siteBtnSecondaryOnDark,
  siteContainer,
  siteSectionPad,
  siteSectionPadCompact,
} from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { MediaPanel } from './visual';

const SPOMOVE_PAD_COLORS = ['bg-red-500', 'bg-yellow-400', 'bg-green-500', 'bg-blue-600'] as const;

const SPOMOVE_FLOW_LINE = '인지 → 선택 → 수행 → 조절';

const BUSINESS_LABELS: Record<HomeCoreBusinessItem['id'], string> = {
  dispatch: '기관 프로그램',
  spomove: '에듀테크 체육',
  private: '맞춤 수업',
  curriculum: '교육 콘텐츠',
};

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
    <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const reducedMotion = useReducedMotion();
  const caseCards = mergeCaseCards(proofCards);

  return (
    <div className="w-full overflow-x-clip bg-white text-[#0B1220]">
      <a
        href="#trust"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg focus:outline focus:outline-2 focus:outline-blue-600"
      >
        본문으로 건너뛰기
      </a>

      <HeroSection reducedMotion={reducedMotion} />
      <TrustSection reducedMotion={reducedMotion} />
      <CoreBusinessSection reducedMotion={reducedMotion} />
      <SpomoveSection reducedMotion={reducedMotion} />
      <CasesSection caseCards={caseCards} reducedMotion={reducedMotion} />
      <OperationSection reducedMotion={reducedMotion} />
      <FinalCtaSection reducedMotion={reducedMotion} />
    </div>
  );
}

function mergeCaseCards(resolved: HomeFieldRecordCardWithThumbnail[]): HomeCaseCard[] {
  const bySlug = new Map(resolved.map((card) => [card.slug, card]));
  return homePage.cases.cards.map((item) => {
    const resolvedCard = bySlug.get(item.slug);
    return resolvedCard ? { ...item, thumbnailSrc: resolvedCard.thumbnailSrc } : item;
  });
}

type CaseCardWithThumb = HomeCaseCard & { thumbnailSrc?: string };

function FadeIn({
  children,
  className = '',
  reducedMotion,
}: {
  children: ReactNode;
  className?: string;
  reducedMotion: boolean | null;
}) {
  if (reducedMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function HeroSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.hero.mediaKey];

  return (
    <section id={homePage.hero.id} className="relative overflow-hidden" style={{ backgroundColor: brandNavy }}>
      <div className={`${siteContainer} grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-12 lg:gap-10 lg:py-24 xl:py-28`}>
        <FadeIn reducedMotion={reducedMotion} className="min-w-0 lg:col-span-7">
          <h1 className={homeHeroTitle}>
            {homePage.hero.lines.map((line, index) => (
              <span key={line} className={`block ${index < 2 ? 'lg:whitespace-nowrap' : ''}`}>
                {line}
              </span>
            ))}
          </h1>
          <p className={`mt-6 max-w-xl text-base leading-[1.75] text-white/85 sm:text-[17px] lg:text-lg ${koreanLineBreak}`}>
            {homePage.hero.support}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink href={homePage.hero.primaryCta.href} trackLabel={homePage.hero.primaryCta.trackLabel} className={siteBtnPrimary}>
              {homePage.hero.primaryCta.label}
              <ArrowIcon />
            </TrackedLink>
            <TrackedLink href={homePage.hero.secondaryCta.href} trackLabel={homePage.hero.secondaryCta.trackLabel} className={siteBtnSecondaryOnDark}>
              {homePage.hero.secondaryCta.label}
            </TrackedLink>
          </div>
          <TrackedLink
            href={homePage.hero.tertiaryLink.href}
            trackLabel={homePage.hero.tertiaryLink.trackLabel}
            className={`${siteBtnGhostOnDark} mt-5`}
          >
            {homePage.hero.tertiaryLink.label}
            <ArrowIcon />
          </TrackedLink>
        </FadeIn>

        <FadeIn reducedMotion={reducedMotion} className="min-w-0 lg:col-span-5">
          <MediaPanel
            media={media}
            className="aspect-[3/2] w-full border-0 rounded-none bg-[#0B1220]"
            sizes="heroEditorialMain"
            photoPriority
            priority
            objectFit="cover"
          />
        </FadeIn>
      </div>
    </section>
  );
}

function TrustSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  return (
    <section id={homePage.trust.id} className={`${siteSectionPadCompact} bg-white`}>
      <div className={`${siteContainer} grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-14`}>
        <FadeIn reducedMotion={reducedMotion} className="lg:col-span-4">
          <p className={homeSectionEyebrowDark}>{homePage.trust.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-4`}>
            {homePage.trust.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
          <p className={`${homeBodyLead} mt-5 text-slate-600`}>{homePage.trust.lead}</p>
        </FadeIn>

        <FadeIn reducedMotion={reducedMotion} className="lg:col-span-8">
          <ul className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            {homePage.trust.items.map((item, index) => {
              const isFullWidth = index === 4;
              return (
                <li
                  key={item.headline}
                  className={`border-t border-slate-200 py-6 sm:py-7 ${
                    isFullWidth
                      ? 'col-span-1 sm:col-span-2'
                      : index % 2 === 0
                        ? 'sm:pr-8'
                        : 'sm:border-l sm:border-slate-200 sm:pl-8'
                  }`}
                >
                  <p className="text-sm font-semibold tabular-nums text-[#1D4ED8]">{String(index + 1).padStart(2, '0')}</p>
                  <p className={`mt-3 text-lg font-bold text-[#0B1220] sm:text-xl ${koreanLineBreak}`}>{item.headline}</p>
                  <p className={`mt-2 text-base leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.support}</p>
                </li>
              );
            })}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}

function CoreBusinessSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const large = homePage.coreBusiness.items.filter((i) => i.size === 'large');
  const compact = homePage.coreBusiness.items.filter((i) => i.size === 'compact');

  return (
    <section id={homePage.coreBusiness.id} className={`${siteSectionPad}`} style={{ backgroundColor: brandSurface }}>
      <div className={siteContainer}>
        <FadeIn reducedMotion={reducedMotion}>
          <p className={homeSectionEyebrowDark}>CORE PROGRAMS</p>
          <h2 className={`${homeSectionH2} mt-3`}>핵심 사업</h2>
          <p className={homeBodyLead}>현장 수업과 SPOMOVE를 중심으로 운영하는 네 가지 사업입니다.</p>
        </FadeIn>

        <div className="mt-12 space-y-14 lg:space-y-16">
          {large.map((item, index) => (
            <FadeIn key={item.id} reducedMotion={reducedMotion}>
              <BusinessFeatureRow item={item} reverse={index % 2 === 1} priority={index === 0} />
            </FadeIn>
          ))}

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            {compact.map((item) => (
              <FadeIn key={item.id} reducedMotion={reducedMotion}>
                <BusinessCompactCard item={item} />
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BusinessFeatureRow({
  item,
  reverse,
  priority,
}: {
  item: HomeCoreBusinessItem;
  reverse?: boolean;
  priority?: boolean;
}) {
  const media = HOME_MEDIA[item.mediaKey];

  return (
    <Link
      href={item.href}
      data-track={inferTrackFromHref(item.href)}
      data-track-label={item.trackLabel}
      className="group grid items-start gap-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] lg:grid-cols-[13fr_11fr] lg:gap-10"
    >
      <div className={`min-w-0 overflow-hidden ${reverse ? 'lg:order-2' : ''}`}>
        <MediaPanel
          media={media}
          className={`aspect-[16/10] w-full border-0 rounded-none transition duration-700 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
          sizes="heroEditorialMain"
          photoPriority={priority}
          priority={priority}
        />
      </div>
      <div className={`flex min-w-0 flex-col justify-center py-1 lg:py-2 ${reverse ? 'lg:order-1' : ''}`}>
        <p className={homeSectionEyebrowDark}>{BUSINESS_LABELS[item.id]}</p>
        <h3 className={`${homeCardTitle} mt-3`}>{item.title}</h3>
        <p className={`${homeBody} mt-4 max-w-lg`}>{item.description}</p>
        <span className="mt-6 text-[15px] font-medium text-[#1D4ED8] sm:text-base [@media(hover:hover)_and_(pointer:fine)]:group-hover:underline">
          {item.cta}
        </span>
      </div>
    </Link>
  );
}

function BusinessCompactCard({ item }: { item: HomeCoreBusinessItem }) {
  const media = HOME_MEDIA[item.mediaKey];

  return (
    <Link
      href={item.href}
      data-track={inferTrackFromHref(item.href)}
      data-track-label={item.trackLabel}
      className="group flex h-full flex-col overflow-hidden border-t border-slate-200/80 bg-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
    >
      <div className="overflow-hidden">
        <MediaPanel
          media={media}
          className={`aspect-[16/10] w-full border-0 rounded-none transition duration-700 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
          sizes="gateCard"
        />
      </div>
      <div className="flex flex-1 flex-col px-6 py-6 sm:px-7 sm:py-7">
        <p className={homeSectionEyebrowDark}>{BUSINESS_LABELS[item.id]}</p>
        <h3 className={`${homeCardTitle} mt-2`}>{item.title}</h3>
        <p className={`${homeBody} mt-3`}>{item.description}</p>
        <span className="mt-5 text-[15px] font-medium text-[#1D4ED8] sm:text-base [@media(hover:hover)_and_(pointer:fine)]:group-hover:underline">
          {item.cta}
        </span>
      </div>
    </Link>
  );
}

function SpomoveSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.spomove.mediaKey];

  return (
    <section id={homePage.spomove.id} className={`${siteSectionPad} relative overflow-hidden`} style={{ backgroundColor: brandNavy }}>
      <div className={`${siteContainer} grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-14`}>
        <FadeIn reducedMotion={reducedMotion}>
          <p className={homeSectionEyebrowLight}>SPOMOVE</p>
          <h2 className={`${homeSectionH2OnDark} mt-4`}>
            <span className="block">{homePage.spomove.title}</span>
            <span className="mt-2 block">{homePage.spomove.titleLine2}</span>
          </h2>
          <p className={homeBodyLeadOnDark}>{homePage.spomove.lead}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink href={homePage.spomove.primaryCta.href} trackLabel={homePage.spomove.primaryCta.trackLabel} className={siteBtnPrimary}>
              {homePage.spomove.primaryCta.label}
              <ArrowIcon />
            </TrackedLink>
            <TrackedLink href={homePage.spomove.secondaryCta.href} trackLabel={homePage.spomove.secondaryCta.trackLabel} className={siteBtnSecondaryOnDark}>
              {homePage.spomove.secondaryCta.label}
            </TrackedLink>
          </div>
        </FadeIn>

        <FadeIn reducedMotion={reducedMotion} className="flex flex-col gap-5">
          <MediaPanel
            media={media}
            className={`aspect-[4/3] w-full border-0 rounded-none ${homePhotoGrade}`}
            sizes="heroEditorialMain"
            photoPriority
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="grid w-[5.5rem] shrink-0 grid-cols-2 gap-1.5" aria-hidden>
              {SPOMOVE_PAD_COLORS.map((color) => (
                <div key={color} className={`aspect-square ${color}`} />
              ))}
            </div>
          </div>
          <p className="text-sm font-medium tracking-wide text-white/65 sm:text-base">{SPOMOVE_FLOW_LINE}</p>
        </FadeIn>
      </div>
    </section>
  );
}

function CasesSection({
  caseCards,
  reducedMotion,
}: {
  caseCards: CaseCardWithThumb[];
  reducedMotion: boolean | null;
}) {
  const [featured, ...rest] = caseCards;

  return (
    <section id={homePage.cases.id} className={`${siteSectionPad} bg-white`}>
      <div className={siteContainer}>
        <FadeIn reducedMotion={reducedMotion}>
          <p className={homeSectionEyebrowDark}>FIELD RECORDS</p>
          <h2 className={`${homeSectionH2} mt-3`}>{homePage.cases.title}</h2>
          <p className={homeBodyLead}>{homePage.cases.lead}</p>
        </FadeIn>

        <div className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-start">
          {featured ? (
            <div className="w-full lg:w-[58%] lg:shrink-0 lg:self-start">
              <FadeIn reducedMotion={reducedMotion}>
                <CaseCard card={featured} priority featured />
              </FadeIn>
            </div>
          ) : null}
          <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-1">
            {rest.map((card, index) => (
              <FadeIn key={card.slug} reducedMotion={reducedMotion}>
                <CaseCard card={card} priority={index === 0} />
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CaseCard({
  card,
  priority,
  featured,
}: {
  card: CaseCardWithThumb;
  priority?: boolean;
  featured?: boolean;
}) {
  const external = isExternalHref(card.href);
  const imageRatio = featured ? 'aspect-[3/2]' : 'aspect-[16/10]';

  const body = (
    <article className="group overflow-hidden bg-white ring-1 ring-slate-200/80">
      <div className={`relative ${imageRatio}`}>
        <CaseMedia card={card} priority={priority} />
      </div>
      <div className={featured ? 'px-6 py-6 sm:px-7 sm:py-6' : 'px-5 py-5'}>
        <p className={homeCaption}>{card.programType}</p>
        <h3 className={`${homeCardTitle} mt-2`}>{card.programName}</h3>
        <p className={`mt-2 text-[15px] text-slate-600 sm:text-base ${koreanLineBreak}`}>{card.audience}</p>
        <p className={`mt-3 text-base leading-relaxed text-slate-600 line-clamp-2 ${koreanLineBreak}`}>
          {card.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-[#1D4ED8] sm:text-base">
          {card.ctaLabel}
          {external ? <span className={`${homeCaption} font-normal`}>외부 링크</span> : null}
          <ArrowIcon />
        </span>
      </div>
    </article>
  );

  return (
    <ProofLink href={card.href} trackLabel={card.trackLabel} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]">
      {body}
    </ProofLink>
  );
}

function CaseMedia({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  if (card.thumbnailSrc) {
    return (
      <ExternalPhoto
        src={card.thumbnailSrc}
        alt={`${card.programName} 운영 사례`}
        className={`absolute inset-0 transition duration-700 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03] ${homePhotoGrade}`}
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

function OperationSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.operation.mediaKey];

  return (
    <section id={homePage.operation.id} className={`${siteSectionPad}`} style={{ backgroundColor: brandSurface }}>
      <FadeIn reducedMotion={reducedMotion}>
        <div className={`${siteContainer} grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-14`}>
          <div className="lg:col-span-5">
            <MediaPanel
              media={media}
              className={`aspect-[16/11] w-full border-0 rounded-none sm:aspect-[3/2] ${homePhotoGrade}`}
              sizes="heroEditorialMain"
              photoPriority
              priority
            />
          </div>

          <div className="lg:col-span-7">
            <p className={homeSectionEyebrowDark}>HOW WE WORK</p>
            <h2 className={`${homeSectionH2} mt-4`}>
              {homePage.operation.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className={homeBodyLead}>{homePage.operation.lead}</p>

            <ol className="mt-10 space-y-0">
              {homePage.operation.steps.map((step, index) => (
                <li key={step.label} className="relative border-t border-slate-300/80 py-8 first:border-t-0 first:pt-0 sm:py-10">
                  <div className="flex gap-5 sm:gap-8">
                    <p className="text-4xl font-bold tabular-nums leading-none text-[#1D4ED8] sm:text-5xl">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xl font-bold text-[#0B1220] sm:text-2xl ${koreanLineBreak}`}>{step.label}</p>
                      <p className={`mt-3 text-base leading-relaxed text-slate-600 sm:text-[17px] ${koreanLineBreak}`}>{step.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function FinalCtaSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.finalCta.mediaKey];

  return (
    <section id={homePage.finalCta.id} className={`${siteSectionPad} bg-white`}>
      <div className={siteContainer}>
        <FadeIn reducedMotion={reducedMotion}>
          <div className="relative overflow-hidden" style={{ backgroundColor: brandNavy }}>
            <div className="absolute inset-0 hidden lg:block">
              <MediaPanel media={media} className="absolute inset-0 h-full w-full border-0 rounded-none" sizes="heroEditorialMain" photoPriority />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/90 via-[#0B1220]/78 to-[#0B1220]/50" aria-hidden />
            </div>

            <div className="relative grid gap-10 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
              <div>
                <p className={homeSectionEyebrowLight}>CONTACT</p>
                <h2 className={`${homeSectionH2OnDark} mt-4`}>
                  {homePage.finalCta.headlineLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </h2>
                <p className={`${homeBodyLeadOnDark} mt-4 text-white/80`}>{homePage.finalCta.lead}</p>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:items-start">
                <TrackedLink href={homePage.finalCta.secondary.href} trackLabel={homePage.finalCta.secondary.trackLabel} className={`${siteBtnPrimary} w-full justify-center sm:w-auto`}>
                  {homePage.finalCta.secondary.label}
                  <ArrowIcon />
                </TrackedLink>
                <TrackedLink href={homePage.finalCta.primary.href} trackLabel={homePage.finalCta.primary.trackLabel} className={`${siteBtnSecondaryOnDark} w-full justify-center sm:w-auto`}>
                  {homePage.finalCta.primary.label}
                </TrackedLink>
                <TrackedLink
                  href={homePage.finalCta.tertiary.href}
                  trackLabel={homePage.finalCta.tertiary.trackLabel}
                  className={`${siteBtnGhostOnDark} min-h-[3rem] w-full justify-center px-3 py-3 sm:w-auto sm:justify-start`}
                >
                  {homePage.finalCta.tertiary.label}
                  <ArrowIcon />
                </TrackedLink>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function TrackedLink({
  href,
  trackLabel,
  children,
  className,
}: {
  href: string;
  trackLabel: string;
  children: ReactNode;
  className?: string;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} data-track-label={trackLabel} className={className} {...externalLinkProps}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} data-track={inferTrackFromHref(href)} data-track-label={trackLabel} className={className}>
      {children}
    </Link>
  );
}

function ProofLink({
  href,
  trackLabel,
  children,
  className,
}: {
  href: string;
  trackLabel: string;
  children: ReactNode;
  className?: string;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} data-track-label={trackLabel} className={className} {...externalLinkProps}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} data-track={inferTrackFromHref(href)} data-track-label={trackLabel} className={className}>
      {children}
    </Link>
  );
}
