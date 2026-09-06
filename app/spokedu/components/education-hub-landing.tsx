'use client';

import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { educationHubPage, type EducationHubCaseCard } from '../data/education-hub';
import {
  brandFocusRing,
  homePhotoGrade,
  koreanText,
  marketingButtonPrimary,
  marketingButtonPrimaryOnDark,
  marketingHeroDisplay,
  marketingHeroDisplaySectionScale,
  marketingSectionDisplay,
} from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
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
      className={`${styles.textCta} ${dark ? styles.textCtaDark : ''} ${brandFocusRing}`}
    >
      <span className={styles.textCtaLabel}>{children}</span>
      <span className={styles.textCtaArrow} aria-hidden>
        →
      </span>
    </TrackedLink>
  );
}

export function EducationHubLanding() {
  const { hero, fit, reviews, comparison, lineup, operating, cases, process, faq, contact, private: privatePath } =
    educationHubPage;
  const heroMedia = HOME_MEDIA[hero.mediaKey];
  const [heroLine1, heroLine2] = hero.lines;

  return (
    <div
      className={`${styles.page} w-full overflow-x-clip antialiased`}
      data-spokedu-education="institution-sales"
      data-spokedu-education-sections={educationHubPage.sectionOrder.length}
    >
      <section id={hero.id} className={styles.hero} aria-labelledby="education-hero-heading">
        <div className={styles.heroMedia}>
          <MediaPanel
            media={heroMedia}
            className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
            sizes="100vw"
            photoPriority
            priority
            objectFit="cover"
          />
        </div>
        <div className={styles.heroScrim} aria-hidden />
        <div className={styles.heroCopy}>
          <div className={styles.shell}>
            <p className={styles.eyebrow}>{hero.eyebrow}</p>
            <h1
              id="education-hero-heading"
              className={`${marketingHeroDisplay} ${marketingHeroDisplaySectionScale} mt-3 text-white`}
            >
              <span className="block">{heroLine1}</span>
              <span className="mt-1 block">{heroLine2}</span>
            </h1>
            <p className={`${styles.heroLead} ${koreanText}`}>{hero.lead}</p>
            <div className={styles.heroActions}>
              <TrackedLink
                href={hero.primaryCta.href}
                trackLabel={hero.primaryCta.trackLabel}
                commercialRoute="dispatch"
                ctaIntentId={hero.primaryCta.trackLabel}
                className={`${marketingButtonPrimaryOnDark} ${brandFocusRing}`}
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
        <div className={styles.shell}>
          <h2 id="education-fit-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            {fit.title}
          </h2>
          <p className={`${styles.sectionLead} ${koreanText}`}>{fit.lead}</p>
          <ul className={styles.fitGrid}>
            {fit.items.map((item) => (
              <li key={item.label} className={styles.fitItem}>
                <p className={styles.fitLabel}>{item.label}</p>
                <p className={`${styles.fitCondition} ${koreanText}`}>{item.condition}</p>
                <p className={`${styles.fitResponse} ${koreanText}`}>{item.response}</p>
              </li>
            ))}
          </ul>
          <div className={styles.whoFits}>
            <h3 className={`${styles.subhead} ${koreanText}`}>{fit.whoFits.title}</h3>
            <ul className={styles.whoList}>
              {fit.whoFits.items.map((item) => (
                <li key={item.title}>
                  <p className={`${styles.whoTitle} ${koreanText}`}>{item.title}</p>
                  <p className={`${styles.whoBody} ${koreanText}`}>{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.spaceNote}>
            <h3 className={`${styles.subhead} ${koreanText}`}>{fit.smallSpace.title}</h3>
            <p className={`${styles.sectionLead} ${koreanText}`}>{fit.smallSpace.lead}</p>
            <p className={`${styles.body} ${koreanText}`}>{fit.smallSpace.description}</p>
            <ul className={styles.plainList}>
              {fit.smallSpace.criteria.map((item) => (
                <li key={item} className={koreanText}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id={reviews.id} className={styles.reviews} aria-labelledby="education-reviews-heading">
        <div className={styles.shell}>
          <h2 id="education-reviews-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            {reviews.title}
          </h2>
          <p className={`${styles.sectionLead} ${koreanText}`}>{reviews.lead}</p>
          <ul className={styles.reviewList}>
            {reviews.items.map((item) => (
              <li key={item.org} className={styles.reviewItem}>
                <p className={`${styles.reviewQuote} ${koreanText}`}>{item.quote}</p>
                <p className={`${styles.body} ${koreanText}`}>{item.body}</p>
                <p className={styles.reviewMeta}>
                  {item.name} · {item.org}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={comparison.id} className={styles.comparison} aria-labelledby="education-comparison-heading">
        <div className={styles.shell}>
          <h2 id="education-comparison-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            {comparison.title}
          </h2>
          <p className={`${styles.sectionLead} ${koreanText}`}>{comparison.lead}</p>
          <ul className={styles.compareList}>
            {comparison.rows.map((row) => (
              <li key={row.label} className={styles.compareRow}>
                <p className={styles.compareLabel}>{row.label}</p>
                <p className={`${styles.compareCheck} ${koreanText}`}>{row.check}</p>
                <p className={`${styles.body} ${koreanText}`}>{row.spokedu}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={lineup.id} className={styles.lineup} aria-labelledby="education-lineup-heading">
        <div className={styles.shell}>
          <h2 id="education-lineup-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            {lineup.title}
          </h2>
          <p className={`${styles.sectionLead} ${koreanText}`}>{lineup.lead}</p>
          <div className={styles.coreBlock}>
            <h3 className={`${styles.subhead} ${koreanText}`}>{lineup.core.title}</h3>
            {lineup.core.paragraphs.map((paragraph) => (
              <p key={paragraph} className={`${styles.body} ${koreanText}`}>
                {paragraph}
              </p>
            ))}
            <p className={`${styles.spomoveNote} ${koreanText}`}>{lineup.spomoveNote}</p>
          </div>
          <ul className={styles.lineupList}>
            {lineup.items.map((item) => {
              const media = HOME_MEDIA[item.mediaKey];
              const showPhoto = media.type === 'visual' && item.mediaRequirement.kind === 'field-photo';
              return (
                <li key={item.id} className={styles.lineupItem}>
                  {showPhoto ? (
                    <div className={styles.lineupPhoto}>
                      <MediaPanel
                        media={media}
                        className={`${styles.lineupPhotoMedia} border-0 ${homePhotoGrade}`}
                        sizes="(min-width: 960px) 28vw, 92vw"
                        objectFit="cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className={styles.lineupAudience}>{item.audience}</p>
                    <h3 className={`${styles.lineupName} ${koreanText}`}>{item.name}</h3>
                    <p className={`${styles.lineupSubtitle} ${koreanText}`}>{item.subtitle}</p>
                    {item.paragraphs.map((paragraph) => (
                      <p key={paragraph} className={`${styles.body} ${koreanText}`}>
                        {paragraph}
                      </p>
                    ))}
                    <p className={styles.lineupExample}>{item.example}</p>
                    {item.href ? (
                      <div className={styles.inlineCta}>
                        <TextCta href={item.href} trackLabel={item.trackLabel ?? `education-lineup-${item.id}`}>
                          {item.name} 자세히 보기
                        </TextCta>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id={operating.id} className={styles.operating} aria-labelledby="education-operating-heading">
        <div className={styles.shell}>
          <h2 id="education-operating-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            {operating.title}
          </h2>
          <p className={`${styles.sectionLead} ${koreanText}`}>{operating.lead}</p>
          <div className={styles.formats}>
            {operating.formats.map((format) => (
              <div key={format.id} className={styles.formatRow}>
                <h3 className={`${styles.formatTitle} ${koreanText}`}>{format.title}</h3>
                <p className={`${styles.formatBody} ${koreanText}`}>{format.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id={cases.id} className={styles.cases} aria-labelledby="education-cases-heading">
        <div className={styles.shell}>
          <header className={styles.casesHeader}>
            <h2 id="education-cases-heading" className={marketingSectionDisplay}>
              {cases.title}
            </h2>
            <p className={`${styles.casesLead} ${koreanText}`}>{cases.lead}</p>
          </header>
          <ul className={styles.casesGrid}>
            {cases.cards.map((card) => (
              <li key={card.slug} className={styles.caseItem}>
                <EducationCaseItem card={card} />
              </li>
            ))}
          </ul>
          <div className={styles.casesArchive}>
            <TextCta href={cases.recordsCta.href} trackLabel={cases.recordsCta.trackLabel}>
              {cases.recordsCta.label}
            </TextCta>
          </div>
        </div>
      </section>

      <section id={process.id} className={styles.process} aria-labelledby="education-process-heading">
        <div className={styles.shell}>
          <h2 id="education-process-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            {process.title}
          </h2>
          <p className={`${styles.sectionLead} ${koreanText}`}>{process.lead}</p>
          <ol className={styles.processFlow}>
            {process.flow.map((step) => (
              <li key={step.label}>
                <h3 className={`${styles.subhead} ${koreanText}`}>{step.label}</h3>
                <p className={`${styles.body} ${koreanText}`}>{step.detail}</p>
              </li>
            ))}
          </ol>
          <div className={styles.processMeta}>
            <div>
              <h3 className={`${styles.subhead} ${koreanText}`}>{process.checklist.title}</h3>
              <ul className={styles.plainList}>
                {process.checklist.items.map((item) => (
                  <li key={item} className={koreanText}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={`${styles.subhead} ${koreanText}`}>{process.formats.title}</h3>
              <ul className={styles.plainList}>
                {process.formats.items.map((item) => (
                  <li key={item} className={koreanText}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id={faq.id} className={styles.faq} aria-labelledby="education-faq-heading">
        <div className={styles.shell}>
          <h2 id="education-faq-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            {faq.title}
          </h2>
          <ul className={styles.faqList}>
            {faq.items.map((item) => (
              <li key={item.q} className={styles.faqItem}>
                <p className={`${styles.faqQ} ${koreanText}`}>{item.q}</p>
                <p className={`${styles.body} ${koreanText}`}>{item.a}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={contact.id} className={styles.contact} aria-labelledby="education-contact-heading">
        <div className={styles.shell}>
          <h2 id="education-contact-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            {contact.title}
          </h2>
          <p className={`${styles.contactLead} ${koreanText}`}>{contact.lead}</p>
          <div className={styles.contactActions}>
            <TrackedLink
              href={contact.primaryCta.href}
              trackLabel={contact.primaryCta.trackLabel}
              className={`${marketingButtonPrimary} ${brandFocusRing}`}
            >
              {contact.primaryCta.label}
            </TrackedLink>
          </div>
        </div>
      </section>

      <section id={privatePath.id} className={styles.privatePath} aria-labelledby="education-private-heading">
        <div className={styles.shell}>
          <h2 id="education-private-heading" className={`${styles.privateTitle} ${koreanText}`}>
            {privatePath.title}
          </h2>
          <p className={`${styles.body} ${koreanText}`}>{privatePath.lead}</p>
          <div className={styles.inlineCta}>
            <TextCta href={privatePath.cta.href} trackLabel={privatePath.cta.trackLabel}>
              {privatePath.cta.label}
            </TextCta>
          </div>
        </div>
      </section>
    </div>
  );
}

function EducationCaseItem({ card }: { card: EducationHubCaseCard }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.caseLink} ${brandFocusRing}`}>
      <article>
        <div className={styles.casePhoto}>
          <ExternalPhoto
            src={card.thumbnailSrc}
            alt={`${card.venue} — ${card.displayMeta}`}
            className="absolute inset-0 h-full w-full"
            fit="cover"
            quality={88}
            sizes="(min-width: 960px) 32vw, 92vw"
            objectPosition={card.objectPosition}
          />
        </div>
        <div className={styles.caseMeta}>
          <h3 className={`${styles.caseVenue} ${koreanText}`}>{card.venue}</h3>
          <p className={`${styles.caseDisplayMeta} ${koreanText}`}>{card.displayMeta}</p>
        </div>
      </article>
    </TrackedLink>
  );
}
