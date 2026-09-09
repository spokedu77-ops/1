'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import {
  brandFocusRing,
  homeSkipLink,
  koreanText,
  marketingButtonPrimary,
  marketingButtonSecondary,
  marketingHeroDisplay,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';
import styles from './home-editorial.module.css';

type CaseCardWithThumb = HomeCaseCard & { thumbnailSrc?: string };

type HomeEditorialLandingProps = {
  caseCards: CaseCardWithThumb[];
};

function FlowSteps({
  steps,
  className,
  arrowClassName,
}: {
  steps: readonly string[];
  className?: string;
  arrowClassName?: string;
}) {
  return (
    <ol className={`${styles.flowRow} ${className ?? ''}`} aria-label="사용 흐름">
      {steps.map((step, index) => (
        <li key={step}>
          {index > 0 ? <span className={`${styles.flowArrow} ${arrowClassName ?? ''}`} aria-hidden>→</span> : null}
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function TextCta({
  href,
  trackLabel,
  children,
  dark = false,
}: {
  href: string;
  trackLabel: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <TrackedLink
      href={href}
      trackLabel={trackLabel}
      className={`${styles.textCta} ${dark ? styles.textCtaDark : ''} ${brandFocusRing}`}
    >
      <span className={styles.textCtaLabel}>{children}</span>
      <span className={styles.textCtaArrow} aria-hidden>
        →
      </span>
    </TrackedLink>
  );
}

function mergeCaseCards(resolved: HomeFieldRecordCardWithThumbnail[]): CaseCardWithThumb[] {
  const bySlug = new Map(resolved.map((card) => [card.slug, card]));
  return homePage.cases.cards.map((item) => {
    const resolvedCard = bySlug.get(item.slug);
    return resolvedCard ? { ...item, thumbnailSrc: resolvedCard.thumbnailSrc } : item;
  });
}

export function mergeHomeEditorialCaseCards(resolved: HomeFieldRecordCardWithThumbnail[]): CaseCardWithThumb[] {
  return mergeCaseCards(resolved);
}

export function HomeEditorialLanding({ caseCards }: HomeEditorialLandingProps) {
  const heroMedia = HOME_MEDIA[homePage.hero.mediaKey];
  const spomoveMedia = HOME_MEDIA[homePage.spomove.mediaKey];
  const [heroLine1, heroLine2] = homePage.hero.lines;

  return (
    <div className={`${styles.page} w-full overflow-x-clip antialiased`} data-spokedu-home-editorial="v1-connected">
      <a href="#choice" className={homeSkipLink}>
        본문으로 건너뛰기
      </a>

      {/* 01 Hero */}
      <section id={homePage.hero.id} className={styles.hero} aria-labelledby="editorial-hero-heading">
        <div className={`${styles.contentRail} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>아동·청소년 체육교육 · SPOKEDU</p>
            <h1 id="editorial-hero-heading" className={`${marketingHeroDisplay} ${styles.heroHeadingLayout}`}>
              <span>{heroLine1}</span><span>{heroLine2}</span>
            </h1>
            <p className={`${styles.heroLead} ${koreanText}`}>{homePage.hero.support}</p>
            <div className={styles.heroActions}>
              <TrackedLink href={homePage.hero.primaryCta.href} trackLabel={homePage.hero.primaryCta.trackLabel} className={marketingButtonPrimary}>
                {homePage.hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink href={homePage.hero.secondaryCta.href} trackLabel={homePage.hero.secondaryCta.trackLabel} className={marketingButtonSecondary}>
                {homePage.hero.secondaryCta.label}
              </TrackedLink>
            </div>
          </div>
          <figure className={styles.heroFigure}>
            <div className={styles.heroImageFrame}>
              <Image src={heroMedia.src!} alt={heroMedia.alt} fill priority sizes="(min-width: 960px) 52vw, 100vw" className={styles.heroImage} />
            </div>
            <figcaption className={styles.heroCaption}>함께 움직이고, 규칙을 발견하고, 다시 도전하는 수업.</figcaption>
          </figure>
        </div>
      </section>

      {/* 02 Commercial Choice */}
      <section id={homePage.choice.id} className={styles.choice} aria-labelledby="editorial-choice-heading">
        <div className={styles.contentRail}>
          <h2 id="editorial-choice-heading" className={`${styles.homeQuietDisplay} ${styles.choiceTitle} ${styles.measure}`}>
            {homePage.choice.title}
          </h2>
          <div className={styles.serviceGrid}>
            {homePage.serviceChoices.map((service, index) => (
              <TrackedLink key={service.href} href={service.href} trackLabel={service.trackLabel} className={`${styles.serviceCard} ${brandFocusRing}`}>
                <div className={styles.serviceTop}><span className={styles.serviceNumber} aria-hidden>0{index + 1}</span><span>{service.audience}</span></div>
                <h3>{service.label}</h3>
                <p>{service.description}</p>
                <span className={styles.serviceAction}>{service.action}<span aria-hidden>↗</span></span>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      {/* 03 Field Proof */}
      <section id={homePage.cases.id} className={styles.cases} aria-labelledby="editorial-cases-heading">
        <div className={styles.contentRail}>
          <header className={styles.casesHeader}>
            <p className={styles.eyebrow}>수업 사례</p>
            <h2 id="editorial-cases-heading" className={`${styles.homeSectionDisplay} ${styles.casesTitle} ${koreanText}`}>
              {homePage.cases.title}
            </h2>
            <p className={`${styles.homeLead} ${styles.casesLead} ${koreanText}`}>{homePage.cases.lead}</p>
          </header>
          <ul className={styles.casesIndex}>
            {caseCards.map((card) => (
              <li key={card.slug} className={styles.caseItem}>
                <CaseEditorialItem card={card} />
              </li>
            ))}
          </ul>
          <div className={styles.casesArchive}>
            <TextCta href={homePage.cases.recordsCta.href} trackLabel={homePage.cases.recordsCta.trackLabel}>
              {homePage.cases.recordsCta.label}
            </TextCta>
          </div>
        </div>
      </section>

      {/* 04 SPOMOVE */}
      <section id={homePage.spomove.id} className={styles.spomove} aria-labelledby="editorial-spomove-heading">
        <div className={styles.contentRail}>
          <header className={styles.spomoveHeader}>
            <div className={styles.spomoveHeadline}>
              <p className={styles.spomoveLabel}>{homePage.spomove.label}</p>
              <h2 id="editorial-spomove-heading" className={`${styles.homeSignatureDisplay} ${styles.spomoveTitle} ${koreanText}`}>
                {homePage.spomove.title}
              </h2>
            </div>
            <div className={styles.spomoveSupport}>
              <p className={`${styles.homeLead} ${styles.spomoveDefinition} ${koreanText}`}>{homePage.spomove.definition}</p>
              <div className={styles.spomoveCta}>
                <TextCta
                  href={homePage.spomove.primaryCta.href}
                  trackLabel={homePage.spomove.primaryCta.trackLabel}
                  dark
                >
                  {homePage.spomove.primaryCta.label}
                </TextCta>
              </div>
            </div>
          </header>
        </div>
        <div className={styles.visualRail}>
          <div className={styles.spomovePhoto}>
            <MediaPanel
              media={spomoveMedia}
              photoPriority
              loading="eager"
              className={`${styles.spomovePhotoMedia} border-0`}
              sizes="(min-width: 960px) 88vw, 92vw"
              objectFit="cover"
            />
          </div>
        </div>
        <div className={styles.contentRail}>
          <ol className={styles.spomovePrinciples} aria-label="SPOMOVE 핵심 원리">
            {homePage.spomove.flow.map((step) => (
              <li key={step.title} className={styles.spomovePrincipleItem}>
                <h3 className={`${styles.spomovePrincipleLabel} ${koreanText}`}>{step.title}</h3>
                <p className={`${styles.spomovePrincipleBody} ${koreanText}`}>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 05 Subscription — Product Proof */}
      <section id={homePage.subscription.id} className={styles.subscription} aria-labelledby="editorial-subscription-heading">
        <div className={styles.contentRail}>
          <div className={styles.subscriptionIntro}>
            <h2 id="editorial-subscription-heading" className={`${styles.homeSectionDisplay} ${styles.subscriptionTitle} ${koreanText}`}>
              {homePage.subscription.titleLines.map((line) => (
                <span key={line} className={styles.subscriptionTitleLine}>
                  {line}
                </span>
              ))}
            </h2>
            <div className={styles.subscriptionSupport}>
              <p className={`${styles.homeBody} ${styles.subscriptionLead} ${koreanText}`}>{homePage.subscription.lead}</p>
              <FlowSteps steps={homePage.subscription.flow} className={styles.subscriptionFlow} />
              <div className={styles.subscriptionCta}>
                <TextCta
                  href={homePage.subscription.primaryCta.href}
                  trackLabel={homePage.subscription.primaryCta.trackLabel}
                >
                  {homePage.subscription.primaryCta.label}
                </TextCta>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.visualRail}>
          <div className={styles.productStageVisual}>
            <div className={styles.productStageFrame}>
              <Image
                src={homePage.subscription.visual.src}
                alt={homePage.subscription.visual.alt}
                fill
                className={styles.productImageFocal}
                sizes="(min-width: 960px) 88vw, 92vw"
                quality={90}
                priority={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 06 Contact Conversion */}
      <section id={homePage.contact.id} className={styles.contact} aria-labelledby="editorial-contact-heading">
        <div className={styles.contentRail}>
          <div className={styles.contactLayout}>
            <h2 id="editorial-contact-heading" className={styles.homeQuietDisplay}>
              {homePage.contact.title}
            </h2>
            <div>
              <p className={`${styles.homeBody} ${styles.contactBody} ${koreanText}`}>{homePage.contact.lead}</p>
              <div className={styles.contactActions}>
                <TrackedLink
                  href={homePage.contact.primaryCta.href}
                  trackLabel={homePage.contact.primaryCta.trackLabel}
                  className={marketingButtonPrimary}
                >
                  {homePage.contact.primaryCta.label}
                </TrackedLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CaseEditorialItem({ card }: { card: CaseCardWithThumb }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.caseLink} ${brandFocusRing}`}>
      <article>
        <div className={styles.casePhoto}>
          <CasePhoto card={card} />
        </div>
        <div className={styles.caseMeta}>
          <h3 className={`${styles.homeSubhead} ${styles.caseVenue} ${koreanText}`}>{card.venue}</h3>
          <p className={`${styles.homeMeta} ${styles.caseDisplayMeta} ${koreanText}`}>{card.displayMeta}</p>
          <span className={styles.caseAction}>수업 살펴보기 <span aria-hidden>↗</span></span>
        </div>
      </article>
    </TrackedLink>
  );
}

function CasePhoto({ card }: { card: CaseCardWithThumb }) {
  return (
    <Image
      src={card.editorialSrc}
      alt={`${card.venue} — ${card.displayMeta}`}
      fill
      className={`${styles.casePhotoImage} ${styles.photoGradeCase}`}
      style={{ objectPosition: card.editorialObjectPosition ?? '50% 50%' }}
      loading="lazy"
      sizes="(max-width: 959px) 92vw, 360px"
    />
  );
}

export default HomeEditorialLanding;
