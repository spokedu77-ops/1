'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { HOME_MEDIA } from '../data/home-media';
import { homePage, type HomeCaseCard, type HomeCoreBusinessItem } from '../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { externalLinkProps, isExternalHref } from '../lib/external-link';
import { inferTrackFromHref } from '../lib/tracking';
import {
  homeBody,
  homeCaption,
  homeCardTitle,
  homeMarketingBentoCard,
  homeMarketingBtn,
  homeMarketingBtnGhost,
  homeMarketingBtnOutline,
  homeMarketingCard,
  homeMarketingDarkLead,
  homeMarketingDarkSection,
  homeMarketingDarkTitle,
  homeMarketingFeatureTitle,
  homeMarketingH1,
  homeMarketingHero,
  homeMarketingImageFrame,
  homeMarketingImageFrameGlow,
  homeMarketingLabel,
  homeMarketingLead,
  homeMarketingProofChip,
  homeMarketingSection,
  homeMarketingSectionLead,
  homeMarketingSectionTitle,
  homePhotoGrade,
  koreanLineBreak,
  siteContainer,
} from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { MediaPanel } from './visual';

const SPOMOVE_FLOW = ['인지', '선택', '수행', '조절'] as const;

const BUSINESS_LABELS: Record<HomeCoreBusinessItem['id'], string> = {
  dispatch: '기관 프로그램',
  spomove: '에듀테크 체육',
  private: '맞춤 수업',
  curriculum: '교육 콘텐츠',
};

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
    <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const caseCards = mergeCaseCards(proofCards);

  return (
    <div className="w-full overflow-x-clip bg-white font-sans text-[#0a2540] antialiased">
      <a
        href="#trust"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg focus:outline focus:outline-2 focus:outline-[#635bff]"
      >
        본문으로 건너뛰기
      </a>

      <HeroSection />
      <TrustSection />
      <CoreBusinessSection />
      <SpomoveSection />
      <CasesSection caseCards={caseCards} />
      <OperationSection />
      <FinalCtaSection />
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

function GridPattern({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] ${className}`}
      aria-hidden
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(10,37,64,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(10,37,64,0.05) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />
  );
}

function HeroMesh() {
  return (
    <>
      <GridPattern />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[15%] top-[-35%] h-[min(95vw,780px)] w-[min(95vw,780px)] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.24)_0%,transparent_66%)]" />
        <div className="absolute right-[-8%] top-[-5%] h-[min(72vw,600px)] w-[min(72vw,600px)] rounded-full bg-[radial-gradient(circle,rgba(29,78,216,0.14)_0%,transparent_68%)]" />
        <div className="absolute bottom-[-25%] left-[10%] h-[min(55vw,500px)] w-[min(55vw,500px)] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
      </div>
    </>
  );
}

function SectionHeader({
  label,
  title,
  lead,
  align = 'left',
  dark = false,
}: {
  label: string;
  title: ReactNode;
  lead?: string;
  align?: 'left' | 'center';
  dark?: boolean;
}) {
  const alignClass = align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl';
  return (
    <div className={alignClass}>
      <p className={dark ? 'text-[13px] font-semibold tracking-[0.04em] text-[#adbdff] uppercase' : homeMarketingLabel}>{label}</p>
      <h2 className={`${dark ? homeMarketingDarkTitle : homeMarketingSectionTitle} mt-3`}>{title}</h2>
      {lead ? <p className={`${dark ? homeMarketingDarkLead : homeMarketingSectionLead} ${align === 'center' ? 'mx-auto' : ''}`}>{lead}</p> : null}
    </div>
  );
}

function HeroSection() {
  const media = HOME_MEDIA[homePage.hero.mediaKey];
  const proofChips = homePage.trust.items.slice(0, 3);

  return (
    <section id={homePage.hero.id} className={homeMarketingHero}>
      <HeroMesh />
      <div className={`${siteContainer} relative`}>
        <div className="mx-auto max-w-[52rem] text-center lg:max-w-none lg:text-left">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 xl:gap-20">
            <div className="min-w-0">
              <h1 className={homeMarketingH1}>
                {homePage.hero.lines.map((line, index) => (
                  <span
                    key={line}
                    className={`block ${index < 2 ? 'lg:whitespace-nowrap' : ''} ${index === 2 ? 'bg-gradient-to-r from-[#0a2540] via-[#1e3a5f] to-[#635bff] bg-clip-text text-transparent' : ''}`}
                  >
                    {line}
                  </span>
                ))}
              </h1>
              <p className={`${homeMarketingLead} mx-auto lg:mx-0`}>{homePage.hero.support}</p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
                <TrackedLink href={homePage.hero.primaryCta.href} trackLabel={homePage.hero.primaryCta.trackLabel} className={homeMarketingBtn}>
                  {homePage.hero.primaryCta.label}
                </TrackedLink>
                <TrackedLink href={homePage.hero.secondaryCta.href} trackLabel={homePage.hero.secondaryCta.trackLabel} className={homeMarketingBtnOutline}>
                  {homePage.hero.secondaryCta.label}
                </TrackedLink>
              </div>
              <TrackedLink
                href={homePage.hero.tertiaryLink.href}
                trackLabel={homePage.hero.tertiaryLink.trackLabel}
                className={`${homeMarketingBtnGhost} mt-5 inline-flex justify-center lg:justify-start`}
              >
                {homePage.hero.tertiaryLink.label}
                <ChevronRight />
              </TrackedLink>

              <ul className="mt-10 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {proofChips.map((item) => (
                  <li key={item.headline}>
                    <span className={homeMarketingProofChip}>{item.headline}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${homeMarketingImageFrame} ${homeMarketingImageFrameGlow} min-w-0 lg:translate-y-2`}>
              <MediaPanel
                media={media}
                className={`aspect-[4/3] w-full border-0 rounded-none sm:aspect-[3/2] ${homePhotoGrade}`}
                sizes="heroEditorialMain"
                photoPriority
                priority
                objectFit="cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" aria-hidden />
    </section>
  );
}

function TrustSection() {
  return (
    <section id={homePage.trust.id} className={`${homeMarketingSection} bg-white`}>
      <div className={siteContainer}>
        <SectionHeader
          label={homePage.trust.eyebrow}
          title={homePage.trust.titleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          lead={homePage.trust.lead}
        />

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-6 lg:gap-5">
          {homePage.trust.items.map((item, index) => {
            const isFullWidth = index === 4;
            return (
              <li
                key={item.headline}
                className={`${isFullWidth ? 'lg:col-span-6' : 'lg:col-span-3'} ${homeMarketingBentoCard} group`}
              >
                <div className="mb-4 h-0.5 w-8 rounded-full bg-gradient-to-r from-[#635bff] to-[#1d4ed8]/40 transition-all duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover:w-12" />
                <p className={`text-lg font-semibold text-[#0a2540] sm:text-xl ${koreanLineBreak}`}>{item.headline}</p>
                <p className={`mt-2.5 text-[15px] leading-relaxed text-[#425466] sm:text-base ${koreanLineBreak}`}>{item.support}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function CoreBusinessSection() {
  const large = homePage.coreBusiness.items.filter((i) => i.size === 'large');
  const compact = homePage.coreBusiness.items.filter((i) => i.size === 'compact');

  return (
    <section id={homePage.coreBusiness.id} className={`${homeMarketingSection} relative bg-[#f6f9fc]`}>
      <GridPattern className="opacity-20" />
      <div className={`${siteContainer} relative`}>
        <SectionHeader
          label="Core Programs"
          title="핵심 사업"
          lead="현장 수업과 SPOMOVE를 중심으로 운영하는 네 가지 사업입니다."
        />

        <div className="mt-16 space-y-24 lg:mt-20 lg:space-y-32">
          {large.map((item, index) => (
            <BusinessFeatureRow key={item.id} item={item} reverse={index % 2 === 1} priority={index === 0} />
          ))}
        </div>

        <div className="mt-20 grid gap-5 sm:grid-cols-2 lg:mt-24 lg:gap-6">
          {compact.map((item) => (
            <BusinessCompactCard key={item.id} item={item} />
          ))}
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
      className="group grid items-center gap-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#635bff] lg:grid-cols-2 lg:gap-14 xl:gap-20"
    >
      <div className={`min-w-0 ${reverse ? 'lg:order-2' : ''}`}>
        <div className={`${homeMarketingImageFrame} ${homeMarketingImageFrameGlow}`}>
          <MediaPanel
            media={media}
            className={`aspect-[16/10] w-full border-0 rounded-none transition duration-700 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
            sizes="heroEditorialMain"
            photoPriority={priority}
            priority={priority}
          />
        </div>
      </div>
      <div className={`min-w-0 ${reverse ? 'lg:order-1' : ''}`}>
        <div className="rounded-[1.25rem] bg-white/60 p-6 ring-1 ring-slate-900/[0.04] backdrop-blur-sm sm:p-8 lg:bg-transparent lg:p-0 lg:ring-0 lg:backdrop-blur-none">
          <p className={homeMarketingLabel}>{BUSINESS_LABELS[item.id]}</p>
          <h3 className={`${homeMarketingFeatureTitle} mt-3`}>{item.title}</h3>
          <p className={`${homeMarketingSectionLead} mt-4 max-w-lg`}>{item.description}</p>
          <span className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#635bff] transition-all duration-300 sm:text-base [@media(hover:hover)_and_(pointer:fine)]:group-hover:gap-2.5">
            {item.cta}
            <ChevronRight />
          </span>
        </div>
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
      className={`${homeMarketingCard} group flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#635bff]`}
    >
      <div className="overflow-hidden">
        <MediaPanel
          media={media}
          className={`aspect-[16/10] w-full border-0 rounded-none transition duration-700 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03] ${homePhotoGrade}`}
          sizes="gateCard"
        />
      </div>
      <div className="flex flex-1 flex-col px-6 py-6 sm:px-8 sm:py-8">
        <p className={homeMarketingLabel}>{BUSINESS_LABELS[item.id]}</p>
        <h3 className={`${homeCardTitle} mt-2.5 text-[#0a2540]`}>{item.title}</h3>
        <p className={`${homeBody} mt-3 text-[#425466]`}>{item.description}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[15px] font-semibold text-[#635bff] transition-all duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover:gap-2.5">
          {item.cta}
          <ChevronRight />
        </span>
      </div>
    </Link>
  );
}

function SpomoveSection() {
  const media = HOME_MEDIA[homePage.spomove.mediaKey];

  return (
    <section id={homePage.spomove.id} className={`${homeMarketingDarkSection} ${homeMarketingSection}`}>
      <GridPattern className="opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,black,transparent_85%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-20%,rgba(99,102,241,0.4),transparent)]" aria-hidden />
      <div className={`${siteContainer} relative`}>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 xl:gap-20">
          <div>
            <SectionHeader
              label="SPOMOVE"
              dark
              title={
                <>
                  <span className="block">{homePage.spomove.title}</span>
                  <span className="mt-2 block">{homePage.spomove.titleLine2}</span>
                </>
              }
              lead={homePage.spomove.lead}
            />

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedLink
                href={homePage.spomove.primaryCta.href}
                trackLabel={homePage.spomove.primaryCta.trackLabel}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#0a2540] shadow-lg shadow-black/10 transition hover:bg-white/95 sm:text-base"
              >
                {homePage.spomove.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.spomove.secondaryCta.href}
                trackLabel={homePage.spomove.secondaryCta.trackLabel}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-white/20 bg-white/8 px-7 text-[15px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/12 sm:text-base"
              >
                {homePage.spomove.secondaryCta.label}
              </TrackedLink>
            </div>

            <SpomoveFlowStepper className="mt-10 hidden lg:flex" />
          </div>

          <div className="space-y-6">
            <div className={`${homeMarketingImageFrame} ${homeMarketingImageFrameGlow} lg:translate-y-1`}>
              <MediaPanel
                media={media}
                className={`aspect-[4/3] w-full border-0 rounded-none ${homePhotoGrade}`}
                sizes="heroEditorialMain"
                photoPriority
              />
            </div>
            <SpomoveFlowStepper className="lg:hidden" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SpomoveFlowStepper({ className = '' }: { className?: string }) {
  return (
    <ol className={`flex flex-wrap items-center gap-0 ${className}`} aria-label="SPOMOVE 학습 흐름">
      {SPOMOVE_FLOW.map((step, index) => (
        <li key={step} className="flex items-center">
          <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/92 backdrop-blur-sm">
            {step}
          </span>
          {index < SPOMOVE_FLOW.length - 1 ? (
            <span className="mx-1.5 hidden h-px w-6 bg-gradient-to-r from-white/30 to-white/10 sm:block" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function CasesSection({ caseCards }: { caseCards: CaseCardWithThumb[] }) {
  const [featured, ...rest] = caseCards;

  return (
    <section id={homePage.cases.id} className={`${homeMarketingSection} bg-white`}>
      <div className={siteContainer}>
        <SectionHeader label="Field Records" title={homePage.cases.title} lead={homePage.cases.lead} />

        <div className="mt-14 flex flex-col gap-5 lg:mt-16 lg:flex-row lg:items-stretch lg:gap-6">
          {featured ? (
            <div className="w-full lg:w-[58%] lg:shrink-0">
              <CaseCard card={featured} priority featured />
            </div>
          ) : null}
          <div className="flex w-full min-w-0 flex-col gap-5 lg:flex-1">
            {rest.map((card, index) => (
              <CaseCard key={card.slug} card={card} priority={index === 0} />
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
    <article className={`${homeMarketingCard} group flex h-full flex-col`}>
      <div className={`relative overflow-hidden ${imageRatio}`}>
        <CaseMedia card={card} priority={priority} />
        {featured ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0a2540]/50 to-transparent" aria-hidden />
        ) : null}
      </div>
      <div className={`flex flex-1 flex-col ${featured ? 'px-7 py-7 sm:px-8 sm:py-8' : 'px-6 py-6 sm:px-7 sm:py-7'}`}>
        <p className={`${homeCaption} font-semibold uppercase tracking-wide text-[#635bff]`}>{card.programType}</p>
        <h3 className={`${homeCardTitle} mt-2 text-[#0a2540]`}>{card.programName}</h3>
        <p className={`mt-2 text-[15px] text-[#425466] sm:text-base ${koreanLineBreak}`}>{card.audience}</p>
        <p className={`mt-3 flex-1 text-base leading-relaxed text-[#425466] line-clamp-2 ${koreanLineBreak}`}>{card.description}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#635bff] transition-all duration-300 sm:text-base [@media(hover:hover)_and_(pointer:fine)]:group-hover:gap-2.5">
          {card.ctaLabel}
          {external ? <span className={`${homeCaption} font-normal normal-case`}>외부 링크</span> : null}
          <ChevronRight />
        </span>
      </div>
    </article>
  );

  return (
    <ProofLink href={card.href} trackLabel={card.trackLabel} className="block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#635bff]">
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
        className={`absolute inset-0 transition duration-700 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04] ${homePhotoGrade}`}
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

function OperationSection() {
  const media = HOME_MEDIA[homePage.operation.mediaKey];

  return (
    <section id={homePage.operation.id} className={`${homeMarketingSection} relative bg-[#f6f9fc]`}>
      <GridPattern className="opacity-15" />
      <div className={`${siteContainer} relative`}>
        <div className="grid gap-14 lg:grid-cols-12 lg:items-start lg:gap-16 xl:gap-20">
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className={`${homeMarketingImageFrame} ${homeMarketingImageFrameGlow}`}>
              <MediaPanel
                media={media}
                className={`aspect-[16/11] w-full border-0 rounded-none sm:aspect-[3/2] ${homePhotoGrade}`}
                sizes="heroEditorialMain"
                photoPriority
                priority
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <SectionHeader
              label="How We Work"
              title={homePage.operation.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              lead={homePage.operation.lead}
            />

            <ol className="mt-12 space-y-4 lg:mt-14">
              {homePage.operation.steps.map((step, index) => (
                <li key={step.label} className={`${homeMarketingBentoCard} relative pl-14 sm:pl-16`}>
                  <span className="absolute left-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#635bff]/10 text-sm font-bold text-[#635bff] sm:left-7 sm:top-7 sm:h-9 sm:w-9 sm:text-base">
                    {index + 1}
                  </span>
                  <p className={`text-lg font-semibold text-[#0a2540] sm:text-xl ${koreanLineBreak}`}>{step.label}</p>
                  <p className={`mt-2.5 text-[15px] leading-relaxed text-[#425466] sm:text-base ${koreanLineBreak}`}>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section id={homePage.finalCta.id} className="bg-white pb-20 pt-4 sm:pb-24 lg:pb-28">
      <div className={siteContainer}>
        <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#0a2540] via-[#0c2847] to-[#1a1f4e] p-px shadow-[0_30px_60px_-20px_rgba(10,37,64,0.45)] sm:rounded-[2rem]">
          <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#0a2540] via-[#0d2f52] to-[#151b42] px-7 py-12 sm:rounded-[calc(2rem-1px)] sm:px-10 sm:py-14 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
            <GridPattern className="opacity-[0.08]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_90%_at_100%_0%,rgba(99,102,241,0.38),transparent_55%)]" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(29,78,216,0.2),transparent)]" aria-hidden />

            <div className="relative">
              <p className="text-[13px] font-semibold tracking-[0.04em] text-[#adbdff] uppercase">Contact</p>
              <h2 className={`${homeMarketingDarkTitle} mt-3`}>
                {homePage.finalCta.headlineLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h2>
              <p className={`${homeMarketingDarkLead} mt-4`}>{homePage.finalCta.lead}</p>
            </div>

            <div className="relative mt-9 flex flex-col items-stretch gap-3 sm:items-start lg:mt-0">
              <TrackedLink
                href={homePage.finalCta.secondary.href}
                trackLabel={homePage.finalCta.secondary.trackLabel}
                className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#0a2540] shadow-lg shadow-black/10 transition hover:bg-white/95 sm:w-auto sm:text-base"
              >
                {homePage.finalCta.secondary.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.finalCta.primary.href}
                trackLabel={homePage.finalCta.primary.trackLabel}
                className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-full border border-white/20 bg-white/8 px-7 text-[15px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/12 sm:w-auto sm:text-base"
              >
                {homePage.finalCta.primary.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.finalCta.tertiary.href}
                trackLabel={homePage.finalCta.tertiary.trackLabel}
                className="inline-flex min-h-[3rem] w-full items-center justify-center gap-1.5 text-[15px] font-medium text-white/75 underline-offset-4 transition hover:text-white hover:underline sm:w-auto sm:justify-start sm:text-base"
              >
                {homePage.finalCta.tertiary.label}
                <ChevronRight />
              </TrackedLink>
            </div>
          </div>
        </div>
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
