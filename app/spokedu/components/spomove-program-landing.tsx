'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { HOME_MEDIA, type HomeMediaKey } from '../data/home-media';
import { spomoveProgramPage } from '../data/spomove-program-page';
import {
  brandFocusRing,
  koreanText,
  marketingHeroDisplay,
  marketingHeroDisplaySectionScale,
  marketingSectionDisplay,
} from '../lib/ui-classes';
import { HomeChevron } from './home/home-chevron';
import { TrackedLink } from './home/tracked-link';
import styles from './spomove-program.module.css';

/** 구조화 화면 패널 — 현장 사진이 없을 때만 쓰던 레거시 슬롯 호환 */
export const spomoveActivityVisuals: Partial<
  Record<
    HomeMediaKey,
    {
      eyebrow: string;
      title: string;
      cues: readonly string[];
      answer: string;
      tone: string;
    }
  >
> = {};

function Arrow() {
  return (
    <span className={styles.arrow} aria-hidden>
      <HomeChevron />
    </span>
  );
}

function ArrowLink({
  href,
  trackLabel,
  children,
  commercialRoute,
  ctaIntentId,
}: {
  href: string;
  trackLabel: string;
  children: ReactNode;
  commercialRoute?: 'dispatch' | 'curriculum';
  ctaIntentId?: string;
}) {
  return (
    <TrackedLink
      href={href}
      trackLabel={trackLabel}
      commercialRoute={commercialRoute}
      ctaIntentId={ctaIntentId}
      className={`${styles.arrowLink} ${brandFocusRing}`}
    >
      <span>{children}</span>
      <Arrow />
    </TrackedLink>
  );
}

function FieldImage({
  mediaKey,
  sizes,
  priority = false,
  objectPosition,
  objectFit = 'cover',
}: {
  mediaKey: HomeMediaKey;
  sizes: string;
  priority?: boolean;
  objectPosition?: string;
  objectFit?: 'cover' | 'contain';
}) {
  const media = HOME_MEDIA[mediaKey];
  if (!media.src) return null;
  return (
    <Image
      src={media.src}
      alt={media.alt}
      fill
      priority={priority}
      quality={90}
      sizes={sizes}
      style={{
        objectFit,
        objectPosition: objectPosition ?? media.objectPosition ?? '50% 50%',
      }}
    />
  );
}

/**
 * SPOMOVE 정적 랜딩 — 탭/카탈로그 실패와 무관하게 H1·정의·분기·사례 유지
 */
export default function SpomoveProgramLanding() {
  const page = spomoveProgramPage;
  const [activeActivity, setActiveActivity] = useState(0);
  const [activeWho, setActiveWho] = useState(0);
  const activity = page.activities.items[activeActivity] ?? page.activities.items[0];
  const who = page.who.items[activeWho] ?? page.who.items[0];
  const heroMedia = HOME_MEDIA[page.hero.mediaKey];
  const proof = page.cases.cards[0];
  const activityFit = 'fit' in activity && activity.fit === 'contain' ? 'contain' : 'cover';

  return (
    <main className={styles.page} data-spokedu-spomove-sections="response-in-motion">
      <section id={page.hero.id} className={styles.hero} aria-labelledby="spomove-hero-heading">
        <figure className={styles.heroMedia}>
          {heroMedia.src ? (
            <Image
              src={heroMedia.src}
              alt={heroMedia.alt}
              fill
              priority
              quality={90}
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: heroMedia.objectPosition ?? '48% 42%' }}
            />
          ) : null}
        </figure>
        <div className={styles.heroStage}>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>{page.hero.kicker}</p>
            <h1
              id="spomove-hero-heading"
              className={`${marketingHeroDisplay} ${marketingHeroDisplaySectionScale} ${styles.heroHeading}`}
            >
              <span>{page.hero.lines[0]}</span>
              <span>{page.hero.lines[1]}</span>
            </h1>
            <p className={`${styles.heroLead} ${koreanText}`}>{page.hero.subtitle}</p>
            <nav className={styles.heroCtas} aria-label="다음 행동">
              <TrackedLink
                href={page.hero.primaryCta.href}
                trackLabel={page.hero.primaryCta.trackLabel}
                className={`${styles.heroCta} ${brandFocusRing}`}
              >
                <span>{page.hero.primaryCta.label}</span>
                <Arrow />
              </TrackedLink>
              <TrackedLink
                href={page.hero.secondaryCta.href}
                trackLabel={page.hero.secondaryCta.trackLabel}
                className={`${styles.heroCta} ${brandFocusRing}`}
              >
                <span>{page.hero.secondaryCta.label}</span>
                <Arrow />
              </TrackedLink>
            </nav>
          </div>
        </div>
      </section>

      <section id={page.flow.id} className={`${styles.band} ${styles.bandQuiet}`} aria-labelledby="spomove-flow-heading">
        <div className={`${styles.rail} ${styles.split}`}>
          <div>
            <p className={styles.sectionCode}>02 / {page.flow.eyebrow}</p>
            <h2 id="spomove-flow-heading" className={`${marketingSectionDisplay} ${styles.heading}`}>
              <span>{page.flow.titleLines[0]}</span>
              <span>{page.flow.titleLines[1]}</span>
              <span>{page.flow.titleLines[2]}</span>
            </h2>
            <ol className={styles.sequence}>
              {page.flow.steps.map((step) => (
                <li key={step.label} className={styles.sequenceStep}>
                  <p className={styles.sequenceAxis}>{step.axis}</p>
                  <p className={styles.sequenceLabel}>{step.label}</p>
                  <p className={`${styles.sequenceBody} ${koreanText}`}>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className={styles.wideVisual}>
            <FieldImage mediaKey={page.flow.mediaKey} sizes="(min-width: 960px) 70vw, 100vw" objectPosition="50% 42%" />
          </div>
        </div>
      </section>

      <section
        id={page.experience.id}
        className={`${styles.band} ${styles.bandStrong}`}
        aria-labelledby="spomove-experience-heading"
      >
        <div className={styles.explorerGrid}>
          <div>
            <p className={styles.sectionCode}>03 / {page.experience.eyebrow}</p>
            <h2 id="spomove-experience-heading" className={`${marketingSectionDisplay} ${styles.heading}`}>
              <span>{page.experience.titleLines[0]}</span>
              <span>{page.experience.titleLines[1]}</span>
            </h2>
            <div className={styles.selector} role="tablist" aria-label="대표 활동">
              {page.activities.items.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  role="tab"
                  aria-selected={activeActivity === index}
                  aria-controls="selected-activity"
                  className={activeActivity === index ? styles.optionActive : styles.option}
                  onClick={() => setActiveActivity(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong className={koreanText}>{item.title}</strong>
                </button>
              ))}
            </div>
          </div>
          <article id="selected-activity" role="tabpanel" className={styles.stage}>
            <div className={`${styles.stageVisual} ${activityFit === 'contain' ? styles.stageVisualProduct : ''}`}>
              <FieldImage
                mediaKey={activity.mediaKey}
                sizes="(min-width: 960px) 72vw, 100vw"
                objectFit={activityFit}
              />
            </div>
            <div className={styles.stageDetail}>
              <p className={`${styles.stageCaption} ${koreanText}`}>{activity.description}</p>
              <ArrowLink href={page.experience.catalogCta.href} trackLabel={page.experience.catalogCta.trackLabel}>
                {page.experience.catalogCta.label}
              </ArrowLink>
            </div>
          </article>
        </div>
      </section>

      <section
        id={page.variation.id}
        className={`${styles.band} ${styles.bandShort}`}
        aria-labelledby="spomove-variation-heading"
      >
        <div className={styles.rail}>
          <p className={styles.sectionCode}>04 / {page.variation.eyebrow}</p>
          <h2 id="spomove-variation-heading" className={`${marketingSectionDisplay} ${styles.heading}`}>
            <span>{page.variation.titleLines[0]}</span>
            <span>{page.variation.titleLines[1]}</span>
          </h2>
          <ol className={styles.progression}>
            {page.variation.tracks.map((track) => (
              <li key={track.label} className={styles.progressionRow}>
                <p className={styles.progressionLabel}>{track.label}</p>
                <p className={styles.progressionPath} aria-label={`${track.from}에서 ${track.to}`}>
                  <span>{track.from}</span>
                  {'via' in track && track.via ? (
                    <>
                      <span className={styles.progressionRule} aria-hidden />
                      <span>{track.via}</span>
                    </>
                  ) : null}
                  <span className={styles.progressionRule} aria-hidden />
                  <span>{track.to}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id={page.who.id} className={`${styles.band} ${styles.bandMedium}`} aria-labelledby="spomove-who-heading">
        <div className={styles.explorerGrid}>
          <div>
            <p className={styles.sectionCode}>05 / {page.who.eyebrow}</p>
            <h2 id="spomove-who-heading" className={`${marketingSectionDisplay} ${styles.heading}`}>
              <span>{page.who.titleLines[0]}</span>
              <span>{page.who.titleLines[1]}</span>
            </h2>
            <div className={styles.selector} role="tablist" aria-label="활용 대상">
              {page.who.items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={activeWho === index}
                  aria-controls="selected-audience"
                  className={activeWho === index ? styles.optionActive : styles.option}
                  onClick={() => setActiveWho(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong className={koreanText}>{item.label}</strong>
                </button>
              ))}
            </div>
          </div>
          <article id="selected-audience" role="tabpanel" className={styles.stage}>
            <div className={styles.stageVisual}>
              <FieldImage mediaKey={who.mediaKey} sizes="(min-width: 960px) 72vw, 100vw" />
            </div>
            <p className={`${styles.stageCaption} ${koreanText}`}>{who.body}</p>
          </article>
        </div>
      </section>

      <section id={page.cases.id} className={`${styles.band} ${styles.bandProof}`} aria-labelledby="spomove-cases-heading">
        <div className={styles.rail}>
          <p className={styles.sectionCode}>06 / {page.cases.eyebrow}</p>
          <h2 id="spomove-cases-heading" className={`${marketingSectionDisplay} ${styles.heading}`}>
            <span>{page.cases.titleLines[0]}</span>
            <span>{page.cases.titleLines[1]}</span>
          </h2>
        </div>
        {proof ? (
          <div className={styles.breakout}>
            <TrackedLink href={proof.href} trackLabel={proof.trackLabel} className={`${styles.proofLink} ${brandFocusRing}`}>
              <figure className={styles.proofFigure}>
                {proof.thumbnailSrc ? (
                  <Image
                    src={proof.thumbnailSrc}
                    alt={`${proof.venue} 현장`}
                    fill
                    sizes="92vw"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <FieldImage mediaKey={proof.mediaKey} sizes="92vw" />
                )}
                <figcaption className={styles.proofCaption}>
                  <p className={styles.proofMeta}>
                    {proof.venue}
                  </p>
                  <h3 className={koreanText}>{proof.programLabel} {proof.operationType}</h3>
                  <p className={`${styles.proofBody} ${koreanText}`}>{proof.description}</p>
                </figcaption>
              </figure>
            </TrackedLink>
          </div>
        ) : null}
        <div className={styles.rail}>
          <ArrowLink href={page.cases.recordsCta.href} trackLabel={page.cases.recordsCta.trackLabel}>
            {page.cases.recordsCta.label}
          </ArrowLink>
        </div>
      </section>

      <section id={page.spomat.id} className={`${styles.band} ${styles.bandQuiet}`} aria-labelledby="spomove-spomat-heading">
        <div className={`${styles.rail} ${styles.split}`}>
          <div>
            <p className={styles.sectionCode}>07 / {page.spomat.eyebrow}</p>
            <h2 id="spomove-spomat-heading" className={`${marketingSectionDisplay} ${styles.heading}`}>
              <span>{page.spomat.titleLines[0]}</span>
              <span>{page.spomat.titleLines[1]}</span>
            </h2>
            <p className={`${styles.lead} ${koreanText}`}>{page.spomat.body}</p>
            <ArrowLink href={page.spomat.detailHref} trackLabel={page.spomat.detailTrackLabel}>
              {page.spomat.detailLabel}
            </ArrowLink>
          </div>
          <div className={styles.wideVisual}>
            <FieldImage mediaKey={page.spomat.usageMediaKey} sizes="(min-width: 960px) 70vw, 100vw" />
          </div>
        </div>
      </section>

      <section id={page.master.id} className={`${styles.band} ${styles.bandStrong} ${styles.bandMaster}`} aria-labelledby="spomove-master-heading">
        <div className={styles.rail}>
          <p className={styles.sectionCode}>08 / {page.master.eyebrow}</p>
          <h2 id="spomove-master-heading" className={`${marketingSectionDisplay} ${styles.headingWide}`}>
            <span>{page.master.titleLines[0]}</span>
            <span>{page.master.titleLines[1]}</span>
          </h2>
          <p className={`${styles.lead} ${koreanText}`}>{page.master.body}</p>
        </div>
        <div className={styles.breakout}>
          <div className={styles.masterVisual}>
            <Image
              src={page.master.visualSrc}
              alt={page.master.visualAlt}
              fill
              sizes="(min-width: 960px) 92vw, 100vw"
              style={{ objectFit: 'contain', objectPosition: page.master.objectPosition }}
            />
          </div>
        </div>
        <div className={styles.rail}>
          <ArrowLink href={page.master.primaryCta.href} trackLabel={page.master.primaryCta.trackLabel}>
            {page.master.primaryCta.label}
          </ArrowLink>
        </div>
      </section>

      <section id={page.catalogFinal.id} className={styles.final} aria-labelledby="spomove-final-heading">
        <div className={styles.rail}>
          <p className={styles.sectionCode}>09 / {page.catalogFinal.eyebrow}</p>
          <h2 id="spomove-final-heading" className={`${marketingSectionDisplay} ${styles.heading}`}>
            <span>{page.catalogFinal.titleLines[0]}</span>
            <span>{page.catalogFinal.titleLines[1]}</span>
          </h2>
          <nav className={styles.finalCtas} aria-label="이용">
            <ArrowLink
              href={page.catalogFinal.primary.href}
              trackLabel={page.catalogFinal.primary.trackLabel}
              commercialRoute="curriculum"
              ctaIntentId={page.catalogFinal.primary.trackLabel}
            >
              {page.catalogFinal.primary.label}
            </ArrowLink>
            <ArrowLink
              href={page.catalogFinal.secondary.href}
              trackLabel={page.catalogFinal.secondary.trackLabel}
              commercialRoute="dispatch"
              ctaIntentId={page.catalogFinal.secondary.trackLabel}
            >
              {page.catalogFinal.secondary.label}
            </ArrowLink>
          </nav>
        </div>
      </section>
    </main>
  );
}
