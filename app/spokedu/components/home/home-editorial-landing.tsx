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
  marketingButtonPrimaryOnDark,
  marketingButtonSecondaryOnDark,
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
      {children}
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
    <div className={`${styles.page} w-full overflow-x-clip antialiased`} data-spokedu-home-editorial="field-built">
      <a href="#choice" className={homeSkipLink}>
        본문으로 건너뛰기
      </a>

      {/* 01 Hero */}
      <section id={homePage.hero.id} className={styles.hero} aria-labelledby="editorial-hero-heading">
        <div className={styles.heroMedia}>
          <MediaPanel
            media={heroMedia}
            className="absolute inset-0 h-full w-full border-0 rounded-none"
            sizes="100vw"
            photoPriority
            priority
            objectFit="cover"
          />
        </div>
        <div className={styles.heroScrimCopy} aria-hidden />
        <div className={styles.heroScrimDepth} aria-hidden />
        <div className={styles.heroCopy}>
          <div className={styles.contentRail}>
            <h1 id="editorial-hero-heading" className={`${marketingHeroDisplay} text-white`}>
              <span className="block">{heroLine1}</span>
              <span className="mt-1.5 block">{heroLine2}</span>
            </h1>
            <p className={`${styles.heroLead} ${koreanText}`}>{homePage.hero.support}</p>
            <div className={styles.heroActions}>
              <TrackedLink
                href={homePage.hero.primaryCta.href}
                trackLabel={homePage.hero.primaryCta.trackLabel}
                className={marketingButtonPrimaryOnDark}
              >
                {homePage.hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.hero.secondaryCta.href}
                trackLabel={homePage.hero.secondaryCta.trackLabel}
                className={marketingButtonSecondaryOnDark}
              >
                {homePage.hero.secondaryCta.label}
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>

      {/* 02 Commercial Choice */}
      <section id={homePage.choice.id} className={styles.choice} aria-labelledby="editorial-choice-heading">
        <div className={styles.contentRail}>
          <h2 id="editorial-choice-heading" className={`${styles.homeQuietDisplay} ${styles.choiceTitle} ${styles.measure}`}>
            {homePage.choice.title}
          </h2>
          <div className={styles.choiceSplit}>
            <div className={styles.choiceColumn}>
              <p className={styles.choiceLabel}>{homePage.choice.education.headline}</p>
              <p className={`${styles.choiceTagline} ${koreanText}`}>{homePage.choice.education.tagline}</p>
              <p className={`${styles.choiceBody} ${koreanText}`}>{homePage.choice.education.body}</p>
              <div className={styles.choiceCta}>
                <TextCta
                  href={homePage.choice.education.primaryCta.href}
                  trackLabel={homePage.choice.education.primaryCta.trackLabel}
                >
                  {homePage.choice.education.primaryCta.label}
                </TextCta>
              </div>
            </div>
            <div className={styles.choiceDivider} aria-hidden />
            <div className={styles.choiceColumn}>
              <p className={styles.choiceLabel}>{homePage.choice.subscription.headline}</p>
              <p className={`${styles.choiceTagline} ${koreanText}`}>{homePage.choice.subscription.tagline}</p>
              <p className={`${styles.choiceBody} ${koreanText}`}>{homePage.choice.subscription.body}</p>
              <div className={styles.choiceCta}>
                <TextCta
                  href={homePage.choice.subscription.primaryCta.href}
                  trackLabel={homePage.choice.subscription.primaryCta.trackLabel}
                >
                  {homePage.choice.subscription.primaryCta.label}
                </TextCta>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 SPOMOVE */}
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
                <h3 className={`${styles.homeSubhead} ${styles.spomovePrincipleLabel}`}>{step.title}</h3>
                <p className={`${styles.spomovePrincipleBody} ${koreanText}`}>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 04 Subscription — Product Proof */}
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
                priority={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 05 Field Proof */}
      <section id={homePage.cases.id} className={styles.cases} aria-labelledby="editorial-cases-heading">
        <div className={styles.contentRail}>
          <header className={styles.casesHeader}>
            <h2 id="editorial-cases-heading" className={`${styles.homeSectionDisplay} ${styles.casesTitle} ${koreanText}`}>
              {homePage.cases.title}
            </h2>
            <p className={`${styles.homeLead} ${styles.casesLead} ${koreanText}`}>{homePage.cases.lead}</p>
          </header>
        </div>
        <div className={styles.visualRail}>
          <ul className={styles.casesIndex}>
            {caseCards.map((card) => (
              <li key={card.slug} className={styles.caseItem}>
                <CaseEditorialItem card={card} />
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.contentRail}>
          <div className={styles.casesArchive}>
            <TextCta href={homePage.cases.recordsCta.href} trackLabel={homePage.cases.recordsCta.trackLabel}>
              {homePage.cases.recordsCta.label}
            </TextCta>
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
      sizes="(max-width: 959px) 92vw, 32vw"
    />
  );
}

export default HomeEditorialLanding;
