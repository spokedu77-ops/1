'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import { isExternalHref } from '../../lib/external-link';
import {
  brandFocusRing,
  homeSkipLink,
  koreanText,
  marketingButtonPrimary,
  marketingButtonPrimaryOnDark,
  marketingButtonSecondaryOnDark,
  marketingEyebrow,
  marketingHeroDisplay,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';
import styles from './home-editorial.module.css';

type CaseCardWithThumb = HomeCaseCard & { thumbnailSrc?: string };

type HomeEditorialLandingProps = {
  caseCards: CaseCardWithThumb[];
};

function TextCta({
  href,
  trackLabel,
  children,
  tone = 'default',
}: {
  href: string;
  trackLabel: string;
  children: ReactNode;
  tone?: 'default' | 'onBlue';
}) {
  return (
    <TrackedLink
      href={href}
      trackLabel={trackLabel}
      className={`${tone === 'onBlue' ? styles.textCtaOnBlue : styles.textCta} ${brandFocusRing}`}
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
  const featuredCase = caseCards[0];
  const supportingCases = caseCards.slice(1);

  return (
    <div className={`${styles.page} w-full overflow-x-clip antialiased`} data-spokedu-home-editorial="v1-connected">
      <a href="#choice" className={homeSkipLink}>
        본문으로 건너뛰기
      </a>

      {/* 01 Hero */}
      <section id={homePage.hero.id} className={styles.hero} aria-labelledby="editorial-hero-heading">
        <div className={styles.contentRail}>
          <div className={styles.heroCopy}>
            <p className={`${marketingEyebrow} ${styles.heroEyebrow}`}>{homePage.hero.eyebrow}</p>
            <h1
              id="editorial-hero-heading"
              className={`${marketingHeroDisplay} ${styles.heroHeadingLayout}`}
            >
              {homePage.hero.lines.map((line) => (
                <span key={line} className={styles.heroPhrase}>
                  {line}
                </span>
              ))}
            </h1>
            <p className={`${styles.heroLead} ${koreanText}`}>{homePage.hero.support}</p>
            <div className={styles.heroActions}>
              <TrackedLink href={homePage.hero.primaryCta.href} trackLabel={homePage.hero.primaryCta.trackLabel} className={marketingButtonPrimary}>
                {homePage.hero.primaryCta.label}
              </TrackedLink>
              <TextCta href={homePage.hero.secondaryCta.href} trackLabel={homePage.hero.secondaryCta.trackLabel}>
                {homePage.hero.secondaryCta.label}
              </TextCta>
            </div>
          </div>
          <figure className={styles.heroFigure}>
            <div className={styles.heroImageFrame}>
              <Image
                src={heroMedia.src!}
                alt={heroMedia.alt}
                fill
                priority
                sizes="(min-width: 1080px) 88vw, 100vw"
                className={styles.heroImage}
              />
            </div>
          </figure>
        </div>
      </section>

      {/* 02 Choice */}
      <section id={homePage.choice.id} className={styles.choice} aria-labelledby="editorial-choice-heading">
        <div className={styles.contentRail}>
          <h2 id="editorial-choice-heading" className={`${styles.homeSectionDisplay} ${styles.choiceTitle} ${koreanText}`}>
            {homePage.choice.title}
          </h2>
          <div className={styles.serviceGrid}>
            {homePage.serviceChoices.map((service) => (
              <TrackedLink key={service.href} href={service.href} trackLabel={service.trackLabel} className={`${styles.serviceCard} ${brandFocusRing}`}>
                <p className={styles.serviceAudience}>{service.audience}</p>
                <h3 className={koreanText}>{service.label}</h3>
                <p className={`${styles.serviceBody} ${koreanText}`}>{service.description}</p>
                <span className={styles.serviceAction}>{service.action}<span aria-hidden>→</span></span>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      {/* 03 Cases */}
      <section id={homePage.cases.id} className={styles.cases} aria-labelledby="editorial-cases-heading">
        <div className={styles.contentRail}>
          <header className={styles.casesHeader}>
            <div className={styles.casesHeadingBlock}>
              <h2 id="editorial-cases-heading" className={`${styles.homeSectionDisplay} ${styles.casesTitle} ${koreanText}`}>
                {homePage.cases.title}
              </h2>
              <p className={`${styles.homeLead} ${styles.casesLead} ${koreanText}`}>{homePage.cases.lead}</p>
            </div>
            <div className={styles.casesArchive}>
              <TextCta href={homePage.cases.recordsCta.href} trackLabel={homePage.cases.recordsCta.trackLabel}>
                {homePage.cases.recordsCta.label}
              </TextCta>
            </div>
          </header>
          <ul className={styles.casesIndex}>
            {featuredCase ? (
              <li key={featuredCase.slug} className={`${styles.caseItem} ${styles.caseFeatured}`}>
                <CaseEditorialItem card={featuredCase} featured />
              </li>
            ) : null}
            {supportingCases.map((card) => (
              <li key={card.slug} className={`${styles.caseItem} ${styles.caseSupporting}`}>
                <CaseEditorialItem card={card} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 04 SPOMOVE */}
      <section id={homePage.spomove.id} className={styles.spomove} aria-labelledby="editorial-spomove-heading">
        <div className={styles.contentRail}>
          <div className={styles.spomoveCopy}>
            <p className={styles.spomoveLabel}>{homePage.spomove.label}</p>
            <h2 id="editorial-spomove-heading" className={`${styles.homeSectionDisplay} ${styles.spomoveTitle} ${koreanText}`}>
              {homePage.spomove.titleLines.map((line) => (
                <span key={line} className={styles.spomoveTitleLine}>
                  {line}
                </span>
              ))}
            </h2>
            <p className={`${styles.homeLead} ${styles.spomoveDefinition} ${koreanText}`}>{homePage.spomove.definition}</p>
            <p className={`${styles.spomoveExampleNote} ${koreanText}`}>{homePage.spomove.exampleNote}</p>
            <div className={styles.spomoveCta}>
              <TextCta href={homePage.spomove.primaryCta.href} trackLabel={homePage.spomove.primaryCta.trackLabel}>
                {homePage.spomove.primaryCta.label}
              </TextCta>
            </div>
          </div>
          <div className={styles.spomovePair}>
            <figure className={styles.spomoveScreen}>
              <div className={styles.spomoveScreenFrame}>
                <Image
                  src={homePage.spomove.screen.src}
                  alt={homePage.spomove.screen.alt}
                  fill
                  className={styles.spomoveScreenImage}
                  style={{ objectPosition: homePage.spomove.screen.objectPosition }}
                  sizes="(min-width: 1080px) 28vw, 92vw"
                />
              </div>
              <figcaption className={styles.mediaCaption}>실행 화면</figcaption>
            </figure>
            <div className={styles.spomovePhoto}>
              <MediaPanel
                media={spomoveMedia}
                photoPriority
                loading="eager"
                className={`${styles.spomovePhotoMedia} border-0`}
                sizes="(min-width: 1080px) 38vw, 92vw"
                objectFit="cover"
              />
              <p className={styles.mediaCaption}>같은 수업의 현장</p>
            </div>
          </div>
        </div>
      </section>

      {/* 05 Subscription */}
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
            </div>
          </div>
          <figure className={styles.productStage}>
            <div className={styles.productStageFrame}>
              <Image
                src={homePage.subscription.visual.src}
                alt={homePage.subscription.visual.alt}
                fill
                className={`${styles.productImageFocal} ${styles.productImageCover}`}
                sizes="(min-width: 1080px) 75rem, 92vw"
                quality={90}
              />
            </div>
            <figcaption className={styles.productCaption}>{homePage.subscription.visual.caption}</figcaption>
          </figure>
          <ul className={styles.productFeatures}>
            {homePage.subscription.features.map((feature) => (
              <li key={feature.id} className={styles.productFeature}>
                <h3 className={`${styles.homeSubhead} ${koreanText}`}>{feature.title}</h3>
                <p className={`${styles.homeBody} ${koreanText}`}>{feature.body}</p>
              </li>
            ))}
          </ul>
          <div className={styles.subscriptionCta}>
            <TextCta href={homePage.subscription.primaryCta.href} trackLabel={homePage.subscription.primaryCta.trackLabel}>
              {homePage.subscription.primaryCta.label}
            </TextCta>
          </div>
        </div>
      </section>

      {/* 06 Contact */}
      <section id={homePage.contact.id} className={styles.contact} aria-labelledby="editorial-contact-heading">
        <div className={styles.contentRail}>
          <div className={styles.contactCluster}>
            <h2 id="editorial-contact-heading" className={`${styles.homeQuietDisplay} ${styles.contactTitle} ${koreanText}`}>
              {homePage.contact.title}
            </h2>
            <p className={`${styles.homeBody} ${styles.contactBody} ${koreanText}`}>{homePage.contact.lead}</p>
            <div className={styles.contactActions}>
              <TrackedLink
                href={homePage.contact.primaryCta.href}
                trackLabel={homePage.contact.primaryCta.trackLabel}
                className={marketingButtonPrimaryOnDark}
              >
                {homePage.contact.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.contact.secondaryCta.href}
                trackLabel={homePage.contact.secondaryCta.trackLabel}
                className={marketingButtonSecondaryOnDark}
              >
                {homePage.contact.secondaryCta.label}
              </TrackedLink>
            </div>
            <div className={styles.contactSupport}>
              <TextCta href={homePage.contact.supportCta.href} trackLabel={homePage.contact.supportCta.trackLabel} tone="onBlue">
                {homePage.contact.supportCta.label}
              </TextCta>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CaseEditorialItem({ card, featured = false }: { card: CaseCardWithThumb; featured?: boolean }) {
  const external = isExternalHref(card.href);
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.caseLink} ${brandFocusRing}`}>
      <article className={featured ? styles.caseFeaturedArticle : undefined}>
        <div className={styles.casePhoto}>
          <CasePhoto card={card} featured={featured} />
        </div>
        <div className={styles.caseMeta}>
          <h3 className={`${styles.homeSubhead} ${styles.caseVenue} ${koreanText}`}>{card.headline}</h3>
          <p className={`${styles.caseProofLine} ${koreanText}`}>{card.displayMeta}</p>
          <p className={`${styles.homeMeta} ${styles.caseDisplayMeta} ${koreanText}`}>{card.operation}</p>
          <span className={styles.caseAction}>
            {external ? '블로그에서 보기' : '수업 살펴보기'}
            <span aria-hidden>{external ? '↗' : '→'}</span>
          </span>
        </div>
      </article>
    </TrackedLink>
  );
}

function CasePhoto({ card, featured }: { card: CaseCardWithThumb; featured?: boolean }) {
  return (
    <Image
      src={card.editorialSrc}
      alt={`${card.headline} 현장`}
      fill
      className={`${styles.casePhotoImage} ${styles.photoGradeCase}`}
      style={{ objectPosition: card.editorialObjectPosition ?? '50% 50%' }}
      loading={featured ? 'eager' : 'lazy'}
      sizes={featured ? '(max-width: 959px) 92vw, 58vw' : '(max-width: 959px) 92vw, 280px'}
    />
  );
}

export default HomeEditorialLanding;
