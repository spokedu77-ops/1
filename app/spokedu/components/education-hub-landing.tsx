'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../data/home-media';
import { educationHubPage, type EducationHubCaseCard } from '../data/education-hub';
import {
  brandFocusRing,
  homePhotoGrade,
  koreanText,
  marketingButtonPrimary,
  marketingButtonPrimaryOnDark,
  marketingButtonSecondary,
  marketingButtonSecondaryOnDark,
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
      className={
        dark
          ? 'inline-flex min-h-11 items-center text-[15px] font-semibold text-[#afc8ff] underline-offset-4 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
          : `${brandFocusRing} inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold [color:var(--spokedu-marketing-color-blue)] underline-offset-4 hover:underline`
      }
    >
      {children}
      <span aria-hidden>→</span>
    </TrackedLink>
  );
}

export function EducationHubLanding() {
  const reducedMotion = useReducedMotion();
  const { hero, choice, institutional, difference, cases, contact } = educationHubPage;
  const heroMedia = HOME_MEDIA[hero.mediaKey];
  const institutionMedia = HOME_MEDIA[choice.institution.mediaKey];
  const [heroLine1, heroLine2] = hero.lines;
  const [institutionalTitle1, institutionalTitle2] = institutional.titleLines;
  const [differenceTitle1, differenceTitle2] = difference.titleLines;
  const [contactTitle1, contactTitle2] = contact.titleLines;

  return (
    <div
      className={`${styles.page} w-full overflow-x-clip antialiased`}
      data-spokedu-education="service-sales-editorial"
      data-spokedu-education-sections={educationHubPage.sectionOrder.length}
    >
      {/* 01 Hero */}
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
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <p className={styles.eyebrow}>{hero.eyebrow}</p>
              <h1 id="education-hero-heading" className={`${marketingHeroDisplay} ${marketingHeroDisplaySectionScale} mt-3 text-white`}>
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
                <TrackedLink
                  href={hero.secondaryCta.href}
                  trackLabel={hero.secondaryCta.trackLabel}
                  commercialRoute="private"
                  ctaIntentId={hero.secondaryCta.trackLabel}
                  className={`${marketingButtonSecondaryOnDark} ${brandFocusRing}`}
                >
                  {hero.secondaryCta.label}
                </TrackedLink>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 02 Service Choice */}
      <section id={choice.id} className={styles.choice} aria-labelledby="education-choice-heading">
        <div className={styles.shell}>
          <div className={styles.choiceGrid}>
            <div className={styles.choicePrimary}>
              <div className={styles.choicePrimaryInner}>
                <div className={styles.choicePhoto}>
                  <MediaPanel
                    media={institutionMedia}
                    className={`${styles.choicePhotoMedia} border-0 ${homePhotoGrade}`}
                    sizes="(min-width: 1024px) 36vw, 88vw"
                    photoPriority
                    objectFit="cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 id="education-choice-heading" className={`${styles.choiceTitle} ${koreanText}`}>
                    {choice.institution.title}
                  </h2>
                  <p className={`${styles.choiceBody} ${koreanText}`}>{choice.institution.body}</p>
                  <div className={styles.choiceCta}>
                    <TextCta href={choice.institution.href} trackLabel={choice.institution.trackLabel}>
                      {choice.institution.ctaLabel}
                    </TextCta>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.choiceDivider} aria-hidden />
            <div className={styles.choiceSecondary}>
              <h2 className={`${styles.choiceTitle} ${koreanText}`}>{choice.private.title}</h2>
              <p className={`${styles.choiceBody} ${koreanText}`}>{choice.private.body}</p>
              <div className={styles.choiceCta}>
                <TextCta href={choice.private.href} trackLabel={choice.private.trackLabel}>
                  {choice.private.ctaLabel}
                </TextCta>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 Institutional Mechanism */}
      <section
        id={institutional.id}
        className={styles.institutional}
        aria-labelledby="education-institutional-heading"
      >
        <div className={styles.shellWide}>
          <h2 id="education-institutional-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            <span className="block">{institutionalTitle1}</span>
            <span className="block">{institutionalTitle2}</span>
          </h2>
          <p className={`${styles.institutionalLead} ${koreanText}`}>{institutional.lead}</p>

          <div className={styles.mechanism}>
            <div className={styles.mechanismBlock}>
              <p className={styles.mechanismLabel}>기관이 알려주는 조건</p>
              <ul className={styles.mechanismTerms} aria-label="기관이 알려주는 조건">
                {institutional.clientInputs.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            </div>
            <div className={styles.mechanismArrow} aria-hidden>
              ↓
            </div>
            <div className={styles.mechanismBlock}>
              <p className={styles.mechanismLabel}>SPOKEDU가 맞추는 요소</p>
              <ul className={styles.mechanismTerms} aria-label="SPOKEDU가 맞추는 요소">
                {institutional.spokeduOutputs.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.formats}>
            {institutional.operationFormats.map((format) => (
              <div key={format.id} className={styles.formatRow}>
                <span className={styles.formatIndex}>{format.index}</span>
                <div className="min-w-0">
                  <h3 className={`${styles.formatTitle} ${koreanText}`}>{format.title}</h3>
                  <p className={`${styles.formatBody} ${koreanText}`}>{format.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.institutionalCta}>
            <TextCta href={institutional.cta.href} trackLabel={institutional.cta.trackLabel}>
              {institutional.cta.label}
            </TextCta>
          </div>
        </div>
      </section>

      {/* 04 Field-Built Difference */}
      <section
        id={difference.id}
        className={styles.difference}
        aria-labelledby="education-difference-heading"
      >
        <div className={styles.shell}>
          <h2 id="education-difference-heading" className={`${marketingSectionDisplay} ${koreanText}`}>
            <span className="block">{differenceTitle1}</span>
            <span className="block">{differenceTitle2}</span>
          </h2>
          <p className={`${styles.differenceBody} ${koreanText}`}>{difference.body}</p>

          <ol className={styles.flow} aria-label="수업 운영 흐름">
            {difference.steps.map((step) => (
              <li key={step.label} className={styles.flowStep}>
                <h3 className={`${styles.flowStepLabel} ${koreanText}`}>{step.label}</h3>
                <p className={`${styles.flowStepBody} ${koreanText}`}>{step.body}</p>
              </li>
            ))}
          </ol>

          <p className={`${styles.spomoveNote} ${koreanText}`}>{difference.spomoveNote}</p>
        </div>
      </section>

      {/* 05 Field Proof */}
      <section id={cases.id} className={styles.cases} aria-labelledby="education-cases-heading">
        <div className={styles.shellWide}>
          <div className={styles.casesHeader}>
            <div className="min-w-0">
              <h2 id="education-cases-heading" className={marketingSectionDisplay}>
                {cases.title}
              </h2>
              <p className={`${styles.casesLead} ${koreanText}`}>{cases.lead}</p>
            </div>
            <TrackedLink
              href={cases.recordsCta.href}
              trackLabel={cases.recordsCta.trackLabel}
              className={`${marketingButtonSecondary} h-11 shrink-0 px-5 ${brandFocusRing}`}
            >
              {cases.recordsCta.label}
            </TrackedLink>
          </div>
          <ul className={styles.casesGrid}>
            {cases.cards.map((card) => (
              <li
                key={card.slug}
                className={card.role === 'featured' ? styles.caseFeatured : styles.caseCompact}
              >
                <EducationCaseItem card={card} priority={card.role === 'featured'} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 06 Contact */}
      <section id={contact.id} className={styles.contact} aria-labelledby="education-contact-heading">
        <div className={styles.shell}>
          <h2 id="education-contact-heading" className={`${marketingSectionDisplay} max-w-2xl ${koreanText}`}>
            <span className="block">{contactTitle1}</span>
            <span className="block">{contactTitle2}</span>
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
          <div className={`${styles.contactLinks} ${koreanText}`}>
            <TrackedLink href={contact.dispatchLink.href} trackLabel={contact.dispatchLink.trackLabel}>
              {contact.dispatchLink.label} →
            </TrackedLink>
            <TrackedLink href={contact.privateLink.href} trackLabel={contact.privateLink.trackLabel}>
              {contact.privateLink.label} →
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function EducationCaseItem({ card, priority }: { card: EducationHubCaseCard; priority?: boolean }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.caseLink} ${brandFocusRing}`}>
      <article>
        <div className={styles.casePhoto}>
          <ExternalPhoto
            src={card.thumbnailSrc}
            alt={`${card.programLabel} — ${card.venue}`}
            className="absolute inset-0 h-full w-full"
            fit="cover"
            quality={88}
            priority={priority}
            sizes={
              priority
                ? '(max-width: 1023px) 100vw, (max-width: 1439px) 58vw, 760px'
                : '(max-width: 1023px) 100vw, (max-width: 1439px) 28vw, 420px'
            }
            objectPosition={card.objectPosition}
          />
        </div>
        <div className={styles.caseMeta}>
          <h3 className={`${styles.caseVenue} ${koreanText}`}>{card.venue}</h3>
          <p className={`${styles.caseOperation} ${koreanText}`}>{card.operationType}</p>
          <p className={`${styles.caseProgram} ${koreanText}`}>{card.programLabel}</p>
          <p className={styles.caseCta}>{card.ctaLabel} →</p>
        </div>
      </article>
    </TrackedLink>
  );
}
