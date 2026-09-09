'use client';

import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { HOME_MEDIA } from '../data/home-media';
import { educationHubPage, type EducationHubCaseCard, type EducationProgram } from '../data/education-hub';
import {
  brandFocusRing,
  homePhotoGrade,
  koreanBody,
  koreanDisplay,
  marketingButtonPrimaryOnDark,
  marketingHeroDisplay,
  marketingHeroDisplaySectionScale,
  marketingSectionDisplay,
} from '../lib/ui-classes';
import { MediaPanel } from './visual';
import { TrackedLink } from './home/tracked-link';
import styles from './education-hub.module.css';

type ProgramFamily = EducationProgram;
type ProcessIconId = (typeof educationHubPage.process.steps)[number]['icon'];
type ReviewAccent = 'blue' | 'cyan' | 'teal';

const REVIEW_ACCENTS: readonly ReviewAccent[] = ['blue', 'cyan', 'teal'];

function WrapUnits({ parts, className }: { parts: readonly string[]; className?: string }) {
  return (
    <span className={`${styles.wrapUnits} ${className ?? ''}`}>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className={styles.wrapUnit}>
          {part}
          {index < parts.length - 1 ? ' ·' : ''}
        </span>
      ))}
    </span>
  );
}

function ChipList({ parts }: { parts: readonly string[] }) {
  return (
    <ul className={styles.chipList}>
      {parts.map((part) => (
        <li key={part}>{part}</li>
      ))}
    </ul>
  );
}

function ReviewStars({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className={styles.stars} aria-hidden>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index}>★</span>
      ))}
    </span>
  );
}

function NeutralMark() {
  return (
    <span className={styles.compareDash} aria-hidden>
      –
    </span>
  );
}

function CheckMark() {
  return (
    <svg className={styles.compareCheck} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M4.2 10.4 8 14.1 15.8 5.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProcessIcon({ icon }: { icon: ProcessIconId }) {
  return (
    <span className={styles.processIcon} aria-hidden>
      <svg viewBox="0 0 24 24" aria-hidden>
        {icon === 'checklist' ? (
          <>
            <path d="M8 4.5h8.5A2.5 2.5 0 0 1 19 7v12.5A2.5 2.5 0 0 1 16.5 22h-9A2.5 2.5 0 0 1 5 19.5V7A2.5 2.5 0 0 1 7.5 4.5H8" />
            <path d="M9 4.5V3.8A1.8 1.8 0 0 1 10.8 2h2.4A1.8 1.8 0 0 1 15 3.8v.7" />
            <path d="m8.5 12 1.8 1.8 4.4-4.4" />
            <path d="M8.5 17.5H15" />
          </>
        ) : null}
        {icon === 'plan' ? (
          <>
            <path d="M5 7.5h14v12H5z" />
            <path d="M8 4.5v3M16 4.5v3M5 11h14" />
            <path d="M8.5 14.5h3M8.5 17.5h7" />
          </>
        ) : null}
        {icon === 'field' ? (
          <>
            <circle cx="12" cy="6.2" r="2" />
            <path d="M8.2 21.2 10.4 13l-2.6-2.4 4.2-1.4 2.3 3.6 2.7-1.4" />
            <path d="M10.4 13 8 21.2M13.2 14.8 15.6 21" />
          </>
        ) : null}
      </svg>
    </span>
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
      className={`${styles.textCta} ${dark ? styles.textCtaDark : ''} ${brandFocusRing} ${koreanDisplay}`}
    >
      <span className={styles.textCtaLabel}>{children}</span>
      <span className={styles.textCtaArrow} aria-hidden>
        →
      </span>
    </TrackedLink>
  );
}

function FieldMedia({
  mediaKey,
  caption,
  variant,
}: {
  mediaKey: keyof typeof HOME_MEDIA;
  caption: string;
  variant: 'primary' | 'secondary';
}) {
  return (
    <figure className={`${styles.fieldFigure} ${variant === 'primary' ? styles.fieldFigurePrimary : styles.fieldFigureSecondary}`}>
      <div className={styles.fieldPhoto}>
        <MediaPanel
          media={HOME_MEDIA[mediaKey]}
          className={`${styles.mediaFill} border-0 ${homePhotoGrade}`}
          sizes={variant === 'primary' ? '(min-width: 960px) 58vw, 92vw' : '(min-width: 960px) 38vw, 92vw'}
          objectFit="cover"
        />
      </div>
      <figcaption className={koreanBody}>{caption}</figcaption>
    </figure>
  );
}

export function EducationHubLanding() {
  const { hero, fit, operating, comparison, adjustment, cases, proof, reviews, process, faq, contact } =
    educationHubPage;
  const [selectedProgram, setSelectedProgram] = useState<ProgramFamily | null>(null);
  const closeProgramDetail = useCallback(() => setSelectedProgram(null), []);

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
          <div className={styles.fitLayout}>
            <header className={styles.fitIntro}>
              <h2 id="education-fit-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} ${koreanDisplay}`}>
                {fit.title}
              </h2>
              <p className={`${styles.sectionLead} ${koreanBody}`}>{fit.lead}</p>
              <p className={`${styles.fitStatementBody} ${koreanBody}`}>{fit.statement}</p>
            </header>
            <ul className={styles.fitGrid}>
              {fit.items.map((item) => (
                <li key={item.label}>
                  <p className={`${styles.fitLabel} ${koreanDisplay}`}>{item.label}</p>
                  <h3 className={koreanDisplay}>
                    <WrapUnits parts={item.condition} />
                  </h3>
                  <p className={koreanBody}>{item.response}</p>
                  <p className={`${styles.fitItemNote} ${koreanBody}`}>{item.note}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className={`${styles.institutionLine} ${koreanBody}`}>
            <strong className={koreanDisplay}>적합 기관</strong>
            <WrapUnits parts={fit.institutions} />
          </p>
          <p className={`${styles.fitNote} ${koreanBody}`}>{fit.smallSpace}</p>
        </div>
      </section>

      <section id={operating.id} className={styles.operating} aria-labelledby="education-operating-heading">
        <div className={styles.contentRail}>
          <div className={styles.operatingChapter}>
            <div className={styles.operatingCopy}>
              <header className={styles.sectionHeader}>
                <h2 id="education-operating-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} ${koreanDisplay}`}>
                  {operating.title}
                </h2>
                <p className={`${styles.sectionLead} ${koreanBody}`}>{operating.lead}</p>
              </header>
              <div className={styles.formatList}>
                {operating.formats.map((format) => (
                  <article key={format.id}>
                    <h3 className={koreanDisplay}>{format.title}</h3>
                    <p className={koreanBody}>{format.body}</p>
                    <p className={`${styles.formatExample} ${koreanBody}`}>{format.example}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className={styles.fieldStage} id="field-stage">
              {operating.fieldMedia.map((item, index) => (
                <FieldMedia
                  key={item.mediaKey}
                  {...item}
                  variant={index === 0 ? 'primary' : 'secondary'}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="programs" className={styles.programs} aria-labelledby="education-programs-heading">
        <div className={styles.contentRail}>
          <header className={styles.lineupIntro}>
            <h2 id="education-programs-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} ${koreanDisplay}`}>
              {operating.lineupTitle}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{operating.lineupLead}</p>
          </header>
          <ul className={styles.programGrid}>
            {operating.lineup.map((program) => (
              <li key={program.id}>
                <ProgramCard program={program} onSelect={setSelectedProgram} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={comparison.id} className={styles.comparison} aria-labelledby="education-comparison-heading">
        <div className={styles.contentRail}>
          <p className={`${styles.darkBadge} ${koreanDisplay}`}>{comparison.badge}</p>
          <h2 id="education-comparison-heading" className={`${styles.darkTitle} ${koreanDisplay}`}>
            {comparison.title}
          </h2>
          <p className={`${styles.darkLead} ${koreanBody}`}>{comparison.lead}</p>
          <table className={styles.compareTable} aria-labelledby="education-comparison-heading">
            <thead>
              <tr>
                <th scope="col" className={`${styles.compareAxisHead} ${koreanDisplay}`}>
                  {comparison.axisLabel}
                </th>
                <th scope="col" className={`${styles.compareOursHead} ${koreanDisplay}`}>
                  {comparison.ours}
                </th>
                <th scope="col" className={`${styles.compareTheirsHead} ${koreanDisplay}`}>
                  {comparison.theirs}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className={`${styles.compareLabel} ${koreanDisplay}`}>
                    {row.label}
                  </th>
                  <td className={`${styles.compareOursCell} ${koreanBody}`}>
                    <span className={`${styles.compareCellKicker} ${koreanDisplay}`} aria-hidden>
                      {comparison.ours}
                    </span>
                    <span className={styles.compareOursValue}>
                      <CheckMark />
                      <span>{row.spokedu}</span>
                    </span>
                  </td>
                  <td className={`${styles.compareOtherCell} ${koreanBody}`}>
                    <span className={`${styles.compareCellKicker} ${koreanDisplay}`} aria-hidden>
                      {comparison.theirs}
                    </span>
                    <span className={styles.compareOtherValue}>
                      <NeutralMark />
                      <span>{row.other}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="spomove" className={styles.spomoveFeature} aria-labelledby="education-spomove-heading">
        <div className={styles.visualRail}>
          <div className={styles.spomoveProof}>
            <div className={styles.spomovePhoto}>
              <MediaPanel
                media={HOME_MEDIA[operating.spomove.mediaKey]}
                className={`${styles.mediaFill} border-0 ${homePhotoGrade}`}
                sizes="(min-width: 1100px) 58vw, 100vw"
                objectFit="cover"
              />
            </div>
            <div className={styles.spomoveCopy}>
              <p className={`${styles.meta} ${koreanDisplay}`}>{operating.spomove.eyebrow}</p>
              <h2 id="education-spomove-heading" className={`${styles.spomoveTitle} ${koreanDisplay}`}>
                {operating.spomove.title}
              </h2>
              <p className={koreanBody}>{operating.spomove.body}</p>
              <p className={`${styles.spomoveNote} ${koreanBody}`}>{operating.spomove.note}</p>
            </div>
          </div>
        </div>
      </section>

      <section id={adjustment.id} className={styles.adjustment} aria-labelledby="education-adjustment-heading">
        <div className={styles.contentRail}>
          <header className={styles.sectionHeader}>
            <h2 id="education-adjustment-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} ${koreanDisplay}`}>
              {adjustment.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{adjustment.lead}</p>
          </header>
          <ol className={styles.mechanism}>
            {adjustment.items.map((item) => (
              <li key={item.label}>
                <span className={styles.mechanismIndex} aria-hidden>
                  {item.n}
                </span>
                <h3 className={koreanDisplay}>{item.label}</h3>
                <p className={`${styles.mechanismKeys} ${koreanBody}`}>
                  <WrapUnits parts={item.keys} />
                </p>
                <p className={koreanBody}>{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id={cases.id} className={styles.cases} aria-labelledby="education-cases-heading">
        <div className={styles.contentRail}>
          <header className={styles.sectionHeader}>
            <h2 id="education-cases-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} ${koreanDisplay}`}>
              {cases.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{cases.lead}</p>
          </header>
          <ul className={styles.caseGrid}>
            {cases.cards.map((card) => (
              <li key={card.slug}>
                <CaseItem card={card} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={proof.id} className={styles.proof} aria-label={proof.regionLabel}>
        <div className={styles.contentRail}>
          <ul className={styles.proofStrip}>
            {proof.items.map((item) => (
              <li key={item.label}>
                <p className={`${styles.proofLabel} ${koreanDisplay}`}>{item.label}</p>
                <p className={`${styles.proofBody} ${koreanBody}`}>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={reviews.id} className={styles.reviews} aria-labelledby="education-reviews-heading">
        <div className={styles.contentRail}>
          <p className={`${styles.darkBadge} ${koreanDisplay}`}>{reviews.badge}</p>
          <h2 id="education-reviews-heading" className={`${styles.darkTitle} ${koreanDisplay}`}>
            {reviews.title}
          </h2>
          <p className={`${styles.darkLead} ${koreanBody}`}>{reviews.lead}</p>
          <ul className={styles.reviewGrid}>
            {reviews.items.map((item, index) => (
              <li key={item.org} data-accent={REVIEW_ACCENTS[index] ?? 'blue'}>
                <blockquote>
                  <ReviewStars visible={item.showStars} />
                  <p className={`${styles.reviewHeadline} ${koreanDisplay}`}>{item.headline}</p>
                  <p className={`${styles.reviewQuote} ${koreanBody}`}>{item.quote}</p>
                  <footer className={styles.reviewIdentity}>
                    <cite className={`${styles.reviewName} ${koreanDisplay}`}>{item.name}</cite>
                    <span className={`${styles.reviewOrg} ${koreanBody}`}>{item.org}</span>
                  </footer>
                </blockquote>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className={styles.closingPaper}>
      <section id={process.id} className={styles.process} aria-labelledby="education-process-heading">
        <div className={styles.contentRail}>
          <header className={styles.sectionHeader}>
            <h2 id="education-process-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} ${koreanDisplay}`}>
              {process.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{process.lead}</p>
          </header>
          <div className={styles.processTrack}>
            {process.steps.map((step, index) => (
              <Fragment key={step.n}>
                {index > 0 ? (
                  <div className={styles.processConnector} aria-hidden>
                    <span className={styles.processConnectorLine} />
                    <span className={styles.processConnectorArrow} />
                  </div>
                ) : null}
                <article className={styles.processCard}>
                  <div className={styles.processHead}>
                    <span className={styles.processIndex}>{step.n}</span>
                    <ProcessIcon icon={step.icon} />
                  </div>
                  <h3 className={koreanDisplay}>{step.title}</h3>
                  <p className={koreanBody}>{step.body}</p>
                  <ChipList parts={step.keys} />
                </article>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      <section id={faq.id} className={styles.faq} aria-labelledby="education-faq-heading">
        <div className={styles.contentRail}>
          <h2 id="education-faq-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} ${koreanDisplay}`}>
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
      </div>

      <section id={contact.id} className={styles.contact} aria-labelledby="education-contact-heading">
        <div className={styles.contentRail}>
          <div>
            <h2 id="education-contact-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} ${koreanDisplay}`}>
              <span>{contact.titleLines[0]}</span>
              <span>{contact.titleLines[1]}</span>
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
      {selectedProgram ? (
        <ProgramDetailModal program={selectedProgram} onClose={closeProgramDetail} />
      ) : null}
    </main>
  );
}

function ProgramCard({
  program,
  onSelect,
}: {
  program: ProgramFamily;
  onSelect: (program: ProgramFamily) => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.programCard} ${brandFocusRing}`}
      onClick={() => onSelect(program)}
    >
      <span className={`${styles.programCardTitle} ${koreanDisplay}`}>{program.name}</span>
      <span className={`${styles.programCardDescription} ${koreanBody}`}>{program.description}</span>
      <span className={`${styles.programCardMeta} ${koreanBody}`}>
        <WrapUnits parts={program.use} />
      </span>
      <span className={`${styles.programCardAction} ${koreanDisplay}`}>
        <span className={styles.programCardActionLabel}>활동 내용 보기</span>
        <span className={styles.programCardActionArrow} aria-hidden>
          →
        </span>
      </span>
    </button>
  );
}

function ProgramDetailModal({
  program,
  onClose,
}: {
  program: ProgramFamily;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.programModalBackdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.programModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className={`${styles.programModalClose} ${brandFocusRing}`}
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <div className={styles.programModalBody}>
          <h3 id={titleId} className={`${styles.programModalTitle} ${koreanDisplay}`}>
            {program.name}
          </h3>
          <p className={`${styles.programModalIntro} ${koreanBody}`}>{program.details.intro}</p>
          {'mediaKey' in program.details ? (
            <div className={styles.programModalPhoto}>
              <MediaPanel
                media={HOME_MEDIA[program.details.mediaKey]}
                className={`${styles.mediaFill} border-0 ${homePhotoGrade}`}
                sizes="(min-width: 640px) 620px, 92vw"
                objectFit="cover"
              />
            </div>
          ) : null}
          <div className={styles.programModalSection}>
            <h4 className={`${styles.programModalHeading} ${koreanDisplay}`}>이런 기관에 적합</h4>
            <ul className={koreanBody}>
              {program.details.recommendedFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.programModalSection}>
            <h4 className={`${styles.programModalHeading} ${koreanDisplay}`}>활용 예시</h4>
            <ul className={koreanBody}>
              {program.details.activities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.programModalSection}>
            <h4 className={`${styles.programModalHeading} ${koreanDisplay}`}>운영 흐름</h4>
            <ul className={koreanBody}>
              {program.details.formats.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
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
