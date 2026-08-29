'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import {
  brandFocusRing,
  brandLink,
  homePhotoGrade,
  homeSkipLink,
  koreanText,
  marketingButtonPrimary,
  marketingButtonPrimaryOnDark,
  marketingButtonSecondary,
  marketingButtonSecondaryOnDark,
  marketingHeroDisplay,
  marketingSectionDisplay,
} from '../../lib/ui-classes';
import { ExternalPhoto } from '../external-photo';
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
    <ul className={`${styles.flowRow} ${className ?? ''}`} aria-label="흐름">
      {steps.map((step, index) => (
        <li key={step}>
          {index > 0 ? <span className={`${styles.flowArrow} ${arrowClassName ?? ''}`} aria-hidden>→</span> : null}
          <span>{step}</span>
        </li>
      ))}
    </ul>
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
      className={
        dark
          ? 'inline-flex min-h-11 items-center text-[15px] font-semibold text-[#afc8ff] underline-offset-4 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
          : `${brandLink} inline-flex min-h-11 items-center gap-1 text-[15px] underline-offset-4 hover:underline`
      }
    >
      {children}
      {!dark ? <span aria-hidden>→</span> : null}
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
  const whyMedia = HOME_MEDIA[homePage.why.mediaKey];
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
            className={`absolute inset-0 h-full w-full scale-[1.04] border-0 rounded-none lg:translate-x-[16%] lg:scale-[1.22] ${homePhotoGrade}`}
            sizes="100vw"
            photoPriority
            priority
            objectFit="cover"
          />
        </div>
        <div className={styles.heroScrim} aria-hidden />
        <div className={styles.heroCopy}>
          <div className={styles.shell}>
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
              <TextCta
                href={homePage.hero.tertiaryCta.href}
                trackLabel={homePage.hero.tertiaryCta.trackLabel}
                dark
              >
                {homePage.hero.tertiaryCta.label}
              </TextCta>
            </div>
          </div>
        </div>
      </section>

      {/* 02 Commercial Choice */}
      <section id={homePage.choice.id} className={styles.choice} aria-labelledby="editorial-choice-heading">
        <div className={styles.shell}>
          <h2 id="editorial-choice-heading" className={`${marketingSectionDisplay} ${styles.measure}`}>
            {homePage.choice.title}
          </h2>
          <div className={styles.choiceSplit}>
            <div className={styles.choiceColumn}>
              <p className={styles.choiceLabel}>{homePage.choice.education.headline}</p>
              <p className={`${styles.choiceTagline} ${koreanText}`}>{homePage.choice.education.tagline}</p>
              <p className={`${styles.choiceBody} ${koreanText}`}>{homePage.choice.education.body}</p>
              <div className="mt-7">
                <TextCta
                  href={homePage.choice.education.primaryCta.href}
                  trackLabel={homePage.choice.education.primaryCta.trackLabel}
                >
                  {homePage.choice.education.primaryCta.label}
                </TextCta>
              </div>
              <p className={`${styles.choiceDirect} ${koreanText}`}>
                {homePage.choice.education.links.map((link, index) => (
                  <span key={link.trackLabel}>
                    {index > 0 ? <span aria-hidden> · </span> : null}
                    <TrackedLink href={link.href} trackLabel={link.trackLabel} className={brandLink}>
                      {link.label}
                    </TrackedLink>
                  </span>
                ))}
              </p>
            </div>
            <div className={styles.choiceDivider} aria-hidden />
            <div className={styles.choiceColumn}>
              <p className={styles.choiceLabel}>{homePage.choice.subscription.headline}</p>
              <p className={`${styles.choiceTagline} ${koreanText}`}>{homePage.choice.subscription.tagline}</p>
              <p className={`${styles.choiceBody} ${koreanText}`}>{homePage.choice.subscription.body}</p>
              <div className="mt-7">
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

      {/* 03 Why */}
      <section id={homePage.why.id} className={styles.why} aria-labelledby="editorial-why-heading">
        <div className={styles.shell}>
          <div className={styles.whyGrid}>
            <div className="min-w-0">
              <h2 id="editorial-why-heading" className={`${marketingSectionDisplay} max-w-xl`}>
                {homePage.why.title}
              </h2>
              <p className={`mt-5 max-w-lg text-base leading-[1.72] text-[var(--spokedu-marketing-color-body)] sm:text-[17px] ${koreanText}`}>
                {homePage.why.body}
              </p>
              <div className="mt-7">
                <TextCta href={homePage.why.primaryCta.href} trackLabel={homePage.why.primaryCta.trackLabel}>
                  {homePage.why.primaryCta.label}
                </TextCta>
              </div>
            </div>
            <div className={styles.whyPhoto}>
              <MediaPanel
                media={whyMedia}
                className={`aspect-[4/3] w-full border-0 ${homePhotoGrade}`}
                sizes="(min-width: 1024px) 28vw, 88vw"
                objectFit="cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 04 SPOMOVE */}
      <section id={homePage.spomove.id} className={styles.spomove} aria-labelledby="editorial-spomove-heading">
        <div className={styles.shellWide}>
          <div className={styles.spomoveGrid}>
            <div className="min-w-0">
              <p className={styles.spomoveLabel}>{homePage.spomove.label}</p>
              <h2 id="editorial-spomove-heading" className={`${marketingSectionDisplay} mt-3 text-white`}>
                {homePage.spomove.title}
              </h2>
              <p className={`${styles.spomoveBody} ${koreanText}`}>{homePage.spomove.body}</p>
              <FlowSteps steps={homePage.spomove.flow} className={styles.spomoveFlow} arrowClassName={styles.flowArrow} />
              <div className="mt-8">
                <TrackedLink
                  href={homePage.spomove.primaryCta.href}
                  trackLabel={homePage.spomove.primaryCta.trackLabel}
                  className={marketingButtonPrimaryOnDark}
                >
                  {homePage.spomove.primaryCta.label}
                </TrackedLink>
              </div>
            </div>
            <div className={styles.spomoveVisual}>
              <MediaPanel
                media={spomoveMedia}
                className={`absolute inset-0 h-full w-full border-0 ${homePhotoGrade}`}
                sizes="(min-width: 1024px) 58vw, 92vw"
                objectFit="cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 05 Subscription */}
      <section id={homePage.subscription.id} className={styles.subscription} aria-labelledby="editorial-subscription-heading">
        <div className={styles.shellWide}>
          <div className={styles.subscriptionGrid}>
            <div className="min-w-0 lg:order-1">
              <h2 id="editorial-subscription-heading" className={`${marketingSectionDisplay} max-w-lg`}>
                {homePage.subscription.title}
              </h2>
              <p className={`mt-5 max-w-md text-base leading-[1.72] text-[var(--spokedu-marketing-color-body)] sm:text-[17px] ${koreanText}`}>
                {homePage.subscription.lead}
              </p>
              <FlowSteps steps={homePage.subscription.flow} className={styles.subscriptionFlow} />
              <TrackedLink
                href={homePage.subscription.primaryCta.href}
                trackLabel={homePage.subscription.primaryCta.trackLabel}
                className={`${marketingButtonPrimary} mt-8`}
              >
                {homePage.subscription.primaryCta.label}
              </TrackedLink>
            </div>
            <div className={`${styles.productStage} lg:order-2`}>
              <Image
                src={homePage.subscription.visual.src}
                alt={homePage.subscription.visual.alt}
                width={1600}
                height={1000}
                className={styles.productImage}
                sizes="(min-width: 1024px) 58vw, 92vw"
                priority={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 06 Field Proof */}
      <section id={homePage.cases.id} className={styles.cases} aria-labelledby="editorial-cases-heading">
        <div className={styles.shell}>
          <div className={styles.casesHeader}>
            <div className="min-w-0">
              <h2 id="editorial-cases-heading" className={marketingSectionDisplay}>
                {homePage.cases.title}
              </h2>
              <p className={`mt-3 max-w-xl text-base leading-[1.72] text-[var(--spokedu-marketing-color-body)] sm:text-[17px] ${koreanText}`}>
                {homePage.cases.lead}
              </p>
            </div>
            <TrackedLink
              href={homePage.cases.recordsCta.href}
              trackLabel={homePage.cases.recordsCta.trackLabel}
              className={marketingButtonSecondary}
            >
              {homePage.cases.recordsCta.label}
            </TrackedLink>
          </div>
          <ul className={styles.casesGrid}>
            {caseCards.map((card, index) => (
              <li key={card.slug} className={index === 0 ? styles.caseFeatured : styles.caseCompact}>
                <CaseEditorialItem card={card} priority={index === 0} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 07 Final Action */}
      <section id={homePage.finalCta.id} className={styles.final} aria-labelledby="editorial-final-heading">
        <div className={styles.shell}>
          <h2 id="editorial-final-heading" className={`${marketingSectionDisplay} max-w-2xl`}>
            {homePage.finalCta.title}
          </h2>
          <p className={`${styles.finalBody} ${koreanText}`}>{homePage.finalCta.lead}</p>
          <div className={styles.finalActions}>
            <TrackedLink
              href={homePage.finalCta.primaryCta.href}
              trackLabel={homePage.finalCta.primaryCta.trackLabel}
              className={marketingButtonPrimary}
            >
              {homePage.finalCta.primaryCta.label}
            </TrackedLink>
            <TrackedLink
              href={homePage.finalCta.secondaryCta.href}
              trackLabel={homePage.finalCta.secondaryCta.trackLabel}
              className={marketingButtonSecondary}
            >
              {homePage.finalCta.secondaryCta.label}
            </TrackedLink>
          </div>
          <p className={styles.finalTertiary}>
            <TextCta href={homePage.finalCta.tertiaryCta.href} trackLabel={homePage.finalCta.tertiaryCta.trackLabel}>
              {homePage.finalCta.tertiaryCta.label}
            </TextCta>
          </p>
        </div>
      </section>
    </div>
  );
}

function CaseEditorialItem({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.caseLink} ${brandFocusRing}`}>
      <article>
        <div className={styles.casePhoto}>
          <CasePhoto card={card} priority={priority} />
        </div>
        <div className={styles.caseMeta}>
          <h3 className={`${styles.caseVenue} ${koreanText}`}>{card.venue}</h3>
          <p className={`${styles.caseAudience} ${koreanText}`}>{card.audience}</p>
          <p className={`${styles.caseProgram} ${koreanText}`}>{card.programName}</p>
          <p className={styles.caseCta}>{card.ctaLabel}</p>
        </div>
      </article>
    </TrackedLink>
  );
}

function CasePhoto({ card, priority }: { card: CaseCardWithThumb; priority?: boolean }) {
  if (card.thumbnailSrc) {
    return (
      <ExternalPhoto
        src={card.thumbnailSrc}
        alt={`${card.programName} — ${card.venue}`}
        className="absolute inset-0 h-full w-full"
        fit="cover"
        priority={priority}
        quality={90}
        sizes="(max-width: 1024px) 100vw, 50vw"
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
      objectFit="cover"
    />
  );
}

export default HomeEditorialLanding;
