'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { HOME_MEDIA } from '../data/home-media';
import { educationHubPage, type EducationHubCaseCard } from '../data/education-hub';
import {
  brandFocusRing,
  homePhotoGrade,
  koreanBody,
  koreanDisplay,
  marketingButtonPrimaryOnDark,
  marketingHeroDisplay,
  marketingHeroDisplaySectionScale,
} from '../lib/ui-classes';
import { MediaPanel } from './visual';
import { TrackedLink } from './home/tracked-link';
import styles from './education-hub.module.css';

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
      className={`${styles.textCta} ${dark ? styles.textCtaDark : ''} ${brandFocusRing} ${koreanDisplay}`}
    >
      <span className={styles.textCtaLabel}>{children}</span>
      <span className={styles.textCtaArrow} aria-hidden>
        →
      </span>
    </TrackedLink>
  );
}

function FieldMedia({ mediaKey, caption }: { mediaKey: keyof typeof HOME_MEDIA; caption: string }) {
  return (
    <figure className={styles.fieldFigure}>
      <div className={styles.fieldPhoto}>
        <MediaPanel
          media={HOME_MEDIA[mediaKey]}
          className={`${styles.mediaFill} border-0 ${homePhotoGrade}`}
          sizes="(min-width: 960px) 44vw, 92vw"
          objectFit="cover"
        />
      </div>
      <figcaption className={koreanBody}>{caption}</figcaption>
    </figure>
  );
}

export function EducationHubLanding() {
  const { hero, fit, operating, adjustment, cases, reviews, process, faq, contact } = educationHubPage;

  return (
    <main
      className={styles.page}
      data-spokedu-education="institution-sales"
      data-spokedu-education-sections={educationHubPage.sectionOrder.length}
    >
      <section id={hero.id} className={styles.hero} aria-labelledby="education-hero-heading">
        <div className={styles.heroMedia}>
          <MediaPanel
            media={HOME_MEDIA[hero.mediaKey]}
            className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
            sizes="100vw"
            photoPriority
            priority
            objectFit="cover"
          />
        </div>
        <div className={styles.heroScrim} aria-hidden />
        <div className={styles.heroCopy}>
          <div className={styles.contentRail}>
            <p className={`${styles.eyebrow} ${koreanDisplay}`}>{hero.eyebrow}</p>
            <h1
              id="education-hero-heading"
              className={`${marketingHeroDisplay} ${marketingHeroDisplaySectionScale} ${koreanDisplay}`}
            >
              <span>{hero.lines[0]}</span>
              <span>{hero.lines[1]}</span>
            </h1>
            <p className={`${styles.heroLead} ${koreanBody}`}>{hero.lead}</p>
            <div className={styles.heroActions}>
              <TrackedLink
                href={hero.primaryCta.href}
                trackLabel={hero.primaryCta.trackLabel}
                commercialRoute="dispatch"
                ctaIntentId={hero.primaryCta.trackLabel}
                className={`${marketingButtonPrimaryOnDark} ${brandFocusRing} ${koreanDisplay}`}
              >
                {hero.primaryCta.label}
              </TrackedLink>
              <TextCta href={hero.secondaryCta.href} trackLabel={hero.secondaryCta.trackLabel} dark>
                {hero.secondaryCta.label}
              </TextCta>
            </div>
          </div>
        </div>
      </section>

      <section id={fit.id} className={styles.fit} aria-labelledby="education-fit-heading">
        <div className={styles.contentRail}>
          <header className={`${styles.sectionHeader} ${styles.sectionReveal}`}>
            <h2 id="education-fit-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {fit.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{fit.lead}</p>
          </header>
          <ul className={styles.fitGrid}>
            {fit.items.map((item) => (
              <li key={item.label}>
                <p className={`${styles.meta} ${koreanBody}`}>{item.label}</p>
                <h3 className={koreanDisplay}>{item.condition}</h3>
                <p className={koreanBody}>{item.response}</p>
              </li>
            ))}
          </ul>
          <p className={`${styles.institutionLine} ${koreanBody}`}>
            <strong className={koreanDisplay}>적합 기관</strong>
            <span>{fit.institutions}</span>
          </p>
        </div>
      </section>

      <section id={operating.id} className={styles.operating} aria-labelledby="education-operating-heading">
        <div className={styles.contentRail}>
          <header className={`${styles.sectionHeader} ${styles.sectionReveal}`}>
            <h2 id="education-operating-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {operating.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{operating.lead}</p>
          </header>
          <div className={styles.formatGrid}>
            {operating.formats.map((format) => (
              <article key={format.title}>
                <h3 className={koreanDisplay}>{format.title}</h3>
                <p className={koreanBody}>{format.body}</p>
                <small className={koreanBody}>{format.example}</small>
              </article>
            ))}
          </div>
        </div>
        <div className={styles.visualRail}>
          <div className={`${styles.fieldPair} ${styles.sectionReveal}`}>
            {operating.fieldMedia.map((item) => (
              <FieldMedia key={item.mediaKey} {...item} />
            ))}
          </div>
        </div>
        <div className={styles.contentRail}>
          <div className={styles.lineupIntro}>
            <h3 className={koreanDisplay}>기관 목적에 따라 조합하는 운영 콘텐츠</h3>
            <p className={koreanBody}>
              하나를 상품처럼 고르는 목록이 아니라, 대상과 운영 목적에 맞춰 수업 안에 조합하는 범위입니다.
            </p>
          </div>
          <ul className={styles.lineupList}>
            {operating.lineup.map((item) => (
              <li key={item.name}>
                <h4 className={koreanDisplay}>{item.name}</h4>
                <p className={koreanBody}>{item.description}</p>
                <small className={koreanBody}>{item.use}</small>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.visualRail}>
          <div className={styles.spomoveProof}>
            <div className={styles.spomovePhoto}>
              <Image
                src="/images/spokedu/home/field-editorial/home-spomove-field.webp"
                alt="SPOMOVE 화면을 보며 지도자와 아이들이 함께 움직이는 기관수업 현장"
                fill
                className={styles.directPhoto}
                sizes="(min-width: 960px) 58vw, 92vw"
              />
            </div>
            <div>
              <p className={`${styles.meta} ${koreanDisplay}`}>SPOMOVE · 현장 활용</p>
              <h3 className={koreanDisplay}>{operating.spomove.title}</h3>
              <p className={koreanBody}>{operating.spomove.body}</p>
              <small className={koreanBody}>{operating.spomove.note}</small>
            </div>
          </div>
        </div>
      </section>

      <section id={adjustment.id} className={styles.adjustment} aria-labelledby="education-adjustment-heading">
        <div className={styles.contentRail}>
          <header className={`${styles.sectionHeader} ${styles.sectionReveal}`}>
            <h2 id="education-adjustment-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {adjustment.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{adjustment.lead}</p>
          </header>
          <ul className={styles.mechanism}>
            {adjustment.items.map((item) => (
              <li key={item.label}>
                <h3 className={koreanDisplay}>{item.label}</h3>
                <p className={koreanBody}>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={cases.id} className={styles.cases} aria-labelledby="education-cases-heading">
        <div className={styles.contentRail}>
          <header className={`${styles.sectionHeader} ${styles.sectionReveal}`}>
            <h2 id="education-cases-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {cases.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{cases.lead}</p>
          </header>
          <ul className={`${styles.caseGrid} ${styles.sectionReveal}`}>
            {cases.cards.map((card) => (
              <li key={card.slug}>
                <CaseItem card={card} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={reviews.id} className={styles.reviews} aria-labelledby="education-reviews-heading">
        <div className={styles.contentRail}>
          <h2 id="education-reviews-heading" className={`${styles.reviewTitle} ${styles.sectionReveal} ${koreanDisplay}`}>
            {reviews.title}
          </h2>
          <ul>
            {reviews.items.map((item) => (
              <li key={item.meta}>
                <p className={koreanBody}>{item.quote}</p>
                <small className={koreanBody}>{item.meta}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={process.id} className={styles.process} aria-labelledby="education-process-heading">
        <div className={styles.contentRail}>
          <h2 id="education-process-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
            {process.title}
          </h2>
          <ol>
            {process.steps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden>{index < process.steps.length - 1 ? '→' : ''}</span>
                <h3 className={koreanDisplay}>{step.title}</h3>
                <p className={koreanBody}>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className={`${styles.processNote} ${koreanBody}`}>{process.note}</p>
        </div>
      </section>

      <section id={faq.id} className={styles.faq} aria-labelledby="education-faq-heading">
        <div className={styles.contentRail}>
          <h2 id="education-faq-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
            {faq.title}
          </h2>
          <div className={styles.faqList}>
            {faq.items.map((item) => (
              <details key={item.q}>
                <summary className={koreanDisplay}>{item.q}</summary>
                <p className={koreanBody}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id={contact.id} className={styles.contact} aria-labelledby="education-contact-heading">
        <div className={styles.contentRail}>
          <div>
            <h2 id="education-contact-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {contact.title}
            </h2>
            <p className={koreanBody}>{contact.lead}</p>
          </div>
          <TrackedLink
            href={contact.primaryCta.href}
            trackLabel={contact.primaryCta.trackLabel}
            commercialRoute="dispatch"
            ctaIntentId={contact.primaryCta.trackLabel}
            className={`${styles.contactButton} ${brandFocusRing} ${koreanDisplay}`}
          >
            {contact.primaryCta.label}
          </TrackedLink>
        </div>
      </section>
    </main>
  );
}

function CaseItem({ card }: { card: EducationHubCaseCard }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.caseLink} ${brandFocusRing}`}>
      <article>
        <div className={styles.casePhoto}>
          <Image
            src={card.thumbnailSrc}
            alt={`${card.venue} ${card.context} 수업 현장`}
            fill
            className={styles.directPhoto}
            style={{ objectPosition: card.objectPosition }}
            sizes="(min-width: 960px) 30vw, 92vw"
          />
        </div>
        <div className={styles.caseMeta}>
          <h3 className={koreanDisplay}>{card.venue}</h3>
          <p className={koreanBody}>{card.context}</p>
          <small className={koreanBody}>{card.description}</small>
        </div>
      </article>
    </TrackedLink>
  );
}
