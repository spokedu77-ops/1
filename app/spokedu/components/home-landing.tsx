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
  homeMarketingBtn,
  homeMarketingBtnGhost,
  homeMarketingBtnOutline,
  homeMarketingCard,
  homeMarketingDarkLead,
  homeMarketingDarkSection,
  homeMarketingDarkTitle,
  homeMarketingH1,
  homeMarketingHero,
  homeMarketingImageFrame,
  homeMarketingLabel,
  homeMarketingLead,
  homeMarketingSectionLead,
  homeMarketingSectionTitle,
  homePhotoGrade,
  koreanLineBreak,
  siteContainer,
  siteSectionPad,
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

function HeroMesh() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-[20%] top-[-30%] h-[min(90vw,720px)] w-[min(90vw,720px)] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.22)_0%,transparent_68%)]" />
      <div className="absolute right-[-10%] top-[-10%] h-[min(70vw,560px)] w-[min(70vw,560px)] rounded-full bg-[radial-gradient(circle,rgba(29,78,216,0.16)_0%,transparent_70%)]" />
      <div className="absolute bottom-[-20%] left-[15%] h-[min(60vw,480px)] w-[min(60vw,480px)] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12)_0%,transparent_72%)]" />
    </div>
  );
}

function HeroSection() {
  const media = HOME_MEDIA[homePage.hero.mediaKey];

  return (
    <section id={homePage.hero.id} className={homeMarketingHero}>
      <HeroMesh />
      <div className={`${siteContainer} relative pb-16 sm:pb-20 lg:pb-28`}>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-14 xl:gap-16">
          <div className="min-w-0">
            <h1 className={homeMarketingH1}>
              {homePage.hero.lines.map((line, index) => (
                <span key={line} className={`block ${index < 2 ? 'lg:whitespace-nowrap' : ''}`}>
                  {line}
                </span>
              ))}
            </h1>
            <p className={homeMarketingLead}>{homePage.hero.support}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
              className={`${homeMarketingBtnGhost} mt-5`}
            >
              {homePage.hero.tertiaryLink.label}
              <ChevronRight />
            </TrackedLink>
          </div>

          <div className={`${homeMarketingImageFrame} min-w-0`}>
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
    </section>
  );
}

function TrustSection() {
  return (
    <section id={homePage.trust.id} className="border-t border-slate-200/60 bg-white py-16 sm:py-20 lg:py-24">
      <div className={siteContainer}>
        <div className="max-w-2xl">
          <p className={homeMarketingLabel}>{homePage.trust.eyebrow}</p>
          <h2 className={`${homeMarketingSectionTitle} mt-3`}>
            {homePage.trust.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
          <p className={homeMarketingSectionLead}>{homePage.trust.lead}</p>
        </div>

        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:mt-16 lg:grid-cols-6 lg:gap-x-10 lg:gap-y-10">
          {homePage.trust.items.map((item, index) => {
            const isFullWidth = index === 4;
            return (
              <li
                key={item.headline}
                className={`${isFullWidth ? 'lg:col-span-6' : 'lg:col-span-3'} border-t border-slate-200/80 pt-6`}
              >
                <p className={`text-lg font-semibold text-[#0a2540] sm:text-xl ${koreanLineBreak}`}>{item.headline}</p>
                <p className={`mt-2 text-[15px] leading-relaxed text-[#425466] sm:text-base ${koreanLineBreak}`}>{item.support}</p>
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
    <section id={homePage.coreBusiness.id} className="bg-[#f6f9fc] py-16 sm:py-20 lg:py-24">
      <div className={siteContainer}>
        <div className="max-w-2xl">
          <p className={homeMarketingLabel}>핵심 사업</p>
          <h2 className={`${homeMarketingSectionTitle} mt-3`}>핵심 사업</h2>
          <p className={homeMarketingSectionLead}>현장 수업과 SPOMOVE를 중심으로 운영하는 네 가지 사업입니다.</p>
        </div>

        <div className="mt-14 space-y-20 lg:space-y-28">
          {large.map((item, index) => (
            <BusinessFeatureRow key={item.id} item={item} reverse={index % 2 === 1} priority={index === 0} />
          ))}
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:mt-20 lg:gap-8">
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
      className="group grid items-center gap-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#635bff] lg:grid-cols-2 lg:gap-16"
    >
      <div className={`min-w-0 ${reverse ? 'lg:order-2' : ''}`}>
        <div className={homeMarketingImageFrame}>
          <MediaPanel
            media={media}
            className={`aspect-[16/10] w-full border-0 rounded-none transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.015] ${homePhotoGrade}`}
            sizes="heroEditorialMain"
            photoPriority={priority}
            priority={priority}
          />
        </div>
      </div>
      <div className={`min-w-0 ${reverse ? 'lg:order-1' : ''}`}>
        <p className={homeMarketingLabel}>{BUSINESS_LABELS[item.id]}</p>
        <h3 className={`${homeMarketingSectionTitle} mt-3 text-[1.625rem] sm:text-[2rem] lg:text-[2.25rem]`}>{item.title}</h3>
        <p className={`${homeMarketingSectionLead} mt-4`}>{item.description}</p>
        <span className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium text-[#635bff] sm:text-base [@media(hover:hover)_and_(pointer:fine)]:group-hover:gap-2">
          {item.cta}
          <ChevronRight />
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
      className={`${homeMarketingCard} group flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#635bff]`}
    >
      <div className="overflow-hidden">
        <MediaPanel
          media={media}
          className={`aspect-[16/10] w-full border-0 rounded-none transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
          sizes="gateCard"
        />
      </div>
      <div className="flex flex-1 flex-col px-6 py-6 sm:px-7 sm:py-7">
        <p className={homeMarketingLabel}>{BUSINESS_LABELS[item.id]}</p>
        <h3 className={`${homeCardTitle} mt-2 text-[#0a2540]`}>{item.title}</h3>
        <p className={`${homeBody} mt-3 text-[#425466]`}>{item.description}</p>
        <span className="mt-5 inline-flex items-center gap-1 text-[15px] font-medium text-[#635bff] [@media(hover:hover)_and_(pointer:fine)]:group-hover:gap-2">
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
    <section id={homePage.spomove.id} className={`${homeMarketingDarkSection} py-16 sm:py-20 lg:py-24`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.35),transparent)]" aria-hidden />
      <div className={`${siteContainer} relative grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16`}>
        <div>
          <p className="text-sm font-medium text-[#adbdff]">SPOMOVE</p>
          <h2 className={homeMarketingDarkTitle}>
            <span className="block">{homePage.spomove.title}</span>
            <span className="mt-2 block">{homePage.spomove.titleLine2}</span>
          </h2>
          <p className={homeMarketingDarkLead}>{homePage.spomove.lead}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink
              href={homePage.spomove.primaryCta.href}
              trackLabel={homePage.spomove.primaryCta.trackLabel}
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-white px-6 text-[15px] font-medium text-[#0a2540] transition hover:bg-white/90 sm:min-h-[3rem] sm:px-7 sm:text-base"
            >
              {homePage.spomove.primaryCta.label}
            </TrackedLink>
            <TrackedLink
              href={homePage.spomove.secondaryCta.href}
              trackLabel={homePage.spomove.secondaryCta.trackLabel}
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 text-[15px] font-medium text-white transition hover:bg-white/10 sm:min-h-[3rem] sm:px-7 sm:text-base"
            >
              {homePage.spomove.secondaryCta.label}
            </TrackedLink>
          </div>
        </div>

        <div className="space-y-5">
          <div className={homeMarketingImageFrame}>
            <MediaPanel
              media={media}
              className={`aspect-[4/3] w-full border-0 rounded-none ${homePhotoGrade}`}
              sizes="heroEditorialMain"
              photoPriority
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {SPOMOVE_FLOW.map((step, index) => (
              <span key={step} className="inline-flex items-center gap-2 text-sm text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1.5 font-medium text-white/90">{step}</span>
                {index < SPOMOVE_FLOW.length - 1 ? <span className="text-white/35">→</span> : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CasesSection({ caseCards }: { caseCards: CaseCardWithThumb[] }) {
  const [featured, ...rest] = caseCards;

  return (
    <section id={homePage.cases.id} className="bg-white py-16 sm:py-20 lg:py-24">
      <div className={siteContainer}>
        <div className="max-w-2xl">
          <p className={homeMarketingLabel}>운영 사례</p>
          <h2 className={`${homeMarketingSectionTitle} mt-3`}>{homePage.cases.title}</h2>
          <p className={homeMarketingSectionLead}>{homePage.cases.lead}</p>
        </div>

        <div className="mt-12 flex flex-col gap-6 lg:mt-14 lg:flex-row lg:items-start">
          {featured ? (
            <div className="w-full lg:w-[58%] lg:shrink-0">
              <CaseCard card={featured} priority featured />
            </div>
          ) : null}
          <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-1">
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
    <article className={`${homeMarketingCard} group h-full`}>
      <div className={`relative overflow-hidden ${imageRatio}`}>
        <CaseMedia card={card} priority={priority} />
      </div>
      <div className={featured ? 'px-6 py-6 sm:px-7 sm:py-7' : 'px-5 py-5 sm:px-6 sm:py-6'}>
        <p className={homeCaption}>{card.programType}</p>
        <h3 className={`${homeCardTitle} mt-2 text-[#0a2540]`}>{card.programName}</h3>
        <p className={`mt-2 text-[15px] text-[#425466] sm:text-base ${koreanLineBreak}`}>{card.audience}</p>
        <p className={`mt-3 text-base leading-relaxed text-[#425466] line-clamp-2 ${koreanLineBreak}`}>{card.description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-[15px] font-medium text-[#635bff] sm:text-base [@media(hover:hover)_and_(pointer:fine)]:group-hover:gap-2">
          {card.ctaLabel}
          {external ? <span className={`${homeCaption} font-normal`}>외부 링크</span> : null}
          <ChevronRight />
        </span>
      </div>
    </article>
  );

  return (
    <ProofLink href={card.href} trackLabel={card.trackLabel} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#635bff]">
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
        className={`absolute inset-0 transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03] ${homePhotoGrade}`}
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
    <section id={homePage.operation.id} className="bg-[#f6f9fc] py-16 sm:py-20 lg:py-24">
      <div className={`${siteContainer} grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-16`}>
        <div className="lg:col-span-5">
          <div className={homeMarketingImageFrame}>
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
          <p className={homeMarketingLabel}>운영 방식</p>
          <h2 className={`${homeMarketingSectionTitle} mt-3`}>
            {homePage.operation.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
          <p className={homeMarketingSectionLead}>{homePage.operation.lead}</p>

          <ol className="mt-10 space-y-0">
            {homePage.operation.steps.map((step, index) => (
              <li key={step.label} className="border-t border-slate-200/80 py-7 first:border-t-0 first:pt-0 sm:py-8">
                <div className="flex gap-5 sm:gap-6">
                  <p className="w-8 shrink-0 text-lg font-semibold tabular-nums text-[#635bff] sm:text-xl">{index + 1}</p>
                  <div className="min-w-0 flex-1">
                    <p className={`text-lg font-semibold text-[#0a2540] sm:text-xl ${koreanLineBreak}`}>{step.label}</p>
                    <p className={`mt-2 text-[15px] leading-relaxed text-[#425466] sm:text-base ${koreanLineBreak}`}>{step.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section id={homePage.finalCta.id} className={`${siteSectionPad} bg-white`}>
      <div className={siteContainer}>
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0a2540] via-[#0d2f52] to-[#1a1f4e] px-6 py-12 sm:rounded-[2rem] sm:px-10 sm:py-14 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_100%_0%,rgba(99,102,241,0.35),transparent)]" aria-hidden />
          <div className="relative">
            <p className="text-sm font-medium text-[#adbdff]">문의</p>
            <h2 className={`${homeMarketingDarkTitle} mt-3`}>
              {homePage.finalCta.headlineLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className={`${homeMarketingDarkLead} mt-4`}>{homePage.finalCta.lead}</p>
          </div>

          <div className="relative mt-8 flex flex-col items-stretch gap-3 sm:items-start lg:mt-0">
            <TrackedLink href={homePage.finalCta.secondary.href} trackLabel={homePage.finalCta.secondary.trackLabel} className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-white px-6 text-[15px] font-medium text-[#0a2540] transition hover:bg-white/90 sm:w-auto sm:min-h-[3rem] sm:px-7 sm:text-base">
              {homePage.finalCta.secondary.label}
            </TrackedLink>
            <TrackedLink href={homePage.finalCta.primary.href} trackLabel={homePage.finalCta.primary.trackLabel} className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 text-[15px] font-medium text-white transition hover:bg-white/10 sm:w-auto sm:min-h-[3rem] sm:px-7 sm:text-base">
              {homePage.finalCta.primary.label}
            </TrackedLink>
            <TrackedLink
              href={homePage.finalCta.tertiary.href}
              trackLabel={homePage.finalCta.tertiary.trackLabel}
              className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-1 text-[15px] font-medium text-white/80 underline-offset-4 transition hover:text-white hover:underline sm:w-auto sm:justify-start sm:text-base"
            >
              {homePage.finalCta.tertiary.label}
              <ChevronRight />
            </TrackedLink>
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
