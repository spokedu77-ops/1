'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { educationHubPage } from '../data/education-hub';
import { HOME_MEDIA, type HomeMediaKey } from '../data/home-media';
import { SPOKEDU_PATHS } from '../data/site';
import { inferTrackFromHref } from '../lib/tracking';
import {
  brandFocusRing,
  homeSectionScrollMt,
  koreanLineBreak,
  marketingBandSoft,
  marketingBandWhite,
  fineHover,
  marketingButtonPrimary,
  marketingButtonSecondary,
} from '../lib/ui-classes';
import shared from './about-landing.module.css';
import styles from './education-hub.module.css';
import { DispatchProposalForm } from './dispatch-proposal-form';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingFaqList } from './landing-faq-list';
import { TrackedLink } from './home/tracked-link';
import { SpokeduSectionHeading } from './section-heading';
import { MediaPanel } from './visual';
import homeStyles from './home-web/home-canonical.module.css';

const page = educationHubPage;

const anchorItems = [
  { href: '#fit', label: '조건' },
  { href: '#operating', label: '운영' },
  { href: '#comparison', label: '비교' },
  { href: '#cases', label: '사례' },
  { href: '#process', label: '도입' },
  { href: '#contact', label: '문의' },
] as const;

const CLASS_FLOW = [
  {
    n: '01',
    title: '이동운동기술',
    body: '기본 움직임과 신체조절을 바탕으로 안정적인 움직임을 준비합니다.',
    mediaKey: 'homeHeroMovement' as HomeMediaKey,
  },
  {
    n: '02',
    title: 'SPOMOVE · 시지각 움직임',
    body: '화면의 정보를 보고 판단한 뒤 움직임으로 반응합니다.',
    mediaKey: 'homeCaseSpomove' as HomeMediaKey,
  },
  {
    n: '03',
    title: '조작운동기술',
    body: '던지기·받기 등 교구 활동으로 움직임 기술을 확장합니다.',
    mediaKey: 'homeCaseGeneral' as HomeMediaKey,
  },
  {
    n: '04',
    title: '팀 활동',
    body: '협동과 규칙 이해를 바탕으로 팀 게임과 스포츠로 연결합니다.',
    mediaKey: 'homeCaseAdapted' as HomeMediaKey,
  },
] as const;

const PROGRAM_MEDIA: Record<string, HomeMediaKey> = {
  'functional-move': 'homeHeroMovement',
  teambuilding: 'homeCaseAdapted',
  spomove: 'homeCaseSpomove',
  'monthly-sports': 'homeCaseGeneral',
  'mini-olympics': 'homeCaseGeneral',
  'custom-booth': 'homeCaseGeneral',
};

function HubSectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className={shared.sectionHead}>
      <SpokeduSectionHeading eyebrow={eyebrow} title={title} lead={lead} />
    </div>
  );
}

function MarketingCheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--spokedu-marketing-color-blue,#245dff)]"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function HubSectionHeadDark({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className={styles.navySectionHead}>
      <div className={styles.darkAccent} aria-hidden />
      {eyebrow ? <p className={styles.darkEyebrow}>{eyebrow}</p> : null}
      <h2 id="edu-formats-title" className={styles.darkTitle}>
        {title}
      </h2>
      {lead ? <p className={`${styles.darkLead} ${koreanLineBreak}`}>{lead}</p> : null}
    </header>
  );
}

function EducationComparisonBlock() {
  const { comparison } = page;
  return (
    <>
      <HubSectionHead eyebrow={comparison.badge} title={comparison.title} lead={comparison.lead} />
      <div className="space-y-2.5 lg:hidden">
        {comparison.rows.map((row) => (
          <article key={row.label} className={`${shared.aboutSurface} overflow-hidden`}>
            <div className="border-b border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-paper)] px-4 py-2.5">
              <h3 className="text-sm font-bold text-[var(--spokedu-marketing-color-ink)]">{row.label}</h3>
            </div>
            <div className="flex gap-3 bg-[var(--spokedu-marketing-color-blue-soft)]/50 px-4 py-3">
              <MarketingCheckIcon />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--spokedu-marketing-color-blue)]">
                  {comparison.ours}
                </p>
                <p className={`mt-1 text-sm leading-relaxed text-[var(--spokedu-marketing-color-body)] ${koreanLineBreak}`}>
                  {row.spokedu}
                </p>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--spokedu-marketing-color-muted)]">
                {comparison.theirs}
              </p>
              <p className={`mt-1 text-sm leading-relaxed text-[var(--spokedu-marketing-color-body)] ${koreanLineBreak}`}>
                {row.other}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className={`${shared.aboutSurface} hidden overflow-hidden lg:block`}>
        <div className="grid grid-cols-[minmax(0,0.85fr)_1fr_1fr] border-b border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-paper)]">
          <div className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[var(--spokedu-marketing-color-muted)]">
            {comparison.axisLabel}
          </div>
          <div className="border-l border-[var(--spokedu-marketing-color-border)] px-5 py-3">
            <span className="text-xs font-bold text-[var(--spokedu-marketing-color-blue)]">{comparison.ours}</span>
            <span className="ml-2 rounded-full bg-[var(--spokedu-marketing-color-blue-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--spokedu-marketing-color-blue)]">
              FIELD
            </span>
          </div>
          <div className="border-l border-[var(--spokedu-marketing-color-border)] px-5 py-3 text-xs font-bold text-[var(--spokedu-marketing-color-muted)]">
            {comparison.theirs}
          </div>
        </div>
        {comparison.rows.map((row, index) => (
          <div
            key={row.label}
            className={`grid grid-cols-[minmax(0,0.85fr)_1fr_1fr] border-t border-[var(--spokedu-marketing-color-border)] ${
              index % 2 === 1 ? 'bg-[var(--spokedu-marketing-color-paper)]/50' : 'bg-white'
            }`}
          >
            <div className="px-5 py-3.5 text-sm font-bold text-[var(--spokedu-marketing-color-ink)]">{row.label}</div>
            <div className="flex gap-2.5 border-l border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-blue-soft)]/35 px-5 py-3.5">
              <MarketingCheckIcon />
              <p className={`text-sm leading-relaxed text-[var(--spokedu-marketing-color-body)] ${koreanLineBreak}`}>{row.spokedu}</p>
            </div>
            <div className="border-l border-[var(--spokedu-marketing-color-border)] px-5 py-3.5">
              <p className={`text-sm leading-relaxed text-[var(--spokedu-marketing-color-body)] ${koreanLineBreak}`}>{row.other}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function EducationHubLanding() {
  const { hero, fit, operating, adjustment, cases, proof, reviews, process, faq, contact } = page;
  const [caseHero, ...caseSides] = cases.cards;
  const heroMedia = HOME_MEDIA[hero.mediaKey];

  return (
    <div className={`${styles.educationHub} ${homeStyles.page} w-full overflow-x-clip`}>
      <section id={hero.id} className={`${homeStyles.hero} ${homeSectionScrollMt}`} aria-labelledby="edu-hero-heading">
        <div className={homeStyles.heroGrid}>
          <div className={homeStyles.heroCopyCol}>
            <div className={homeStyles.heroInner}>
              <p className={homeStyles.heroEyebrow}>{hero.eyebrow}</p>
              <h1 id="edu-hero-heading">
                {hero.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h1>
              <p className={homeStyles.heroLead}>
                <span>{hero.lead}</span>
                <span>공간·인원·일정을 확인하고, 목적에 맞는 프로그램을 설계해 현장에서 직접 운영합니다.</span>
              </p>
              <div className={homeStyles.heroActions}>
                <TrackedLink
                  href={hero.primaryCta.href}
                  trackLabel={hero.primaryCta.trackLabel}
                  className={`${homeStyles.primaryButton} ${brandFocusRing}`}
                >
                  {hero.primaryCta.label}
                </TrackedLink>
                <Link href={hero.secondaryCta.href} className={`${homeStyles.lightButton} ${brandFocusRing}`}>
                  {hero.secondaryCta.label}
                </Link>
              </div>
            </div>
          </div>
          {heroMedia.src ? (
            <figure className={homeStyles.heroFigure}>
              {/* Direct delivery preserves the authored marketing asset without transformation quota. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={homeStyles.heroImage}
                src={heroMedia.src}
                alt={heroMedia.alt}
                style={{ objectPosition: heroMedia.objectPosition }}
              />
            </figure>
          ) : null}
        </div>
      </section>

      <LandingAnchorNav items={anchorItems} cta={{ href: '#contact', label: '기관 수업 상담' }} ariaLabel="기관 수업 바로가기" />

      <section id={fit.id} className={`${homeStyles.audience} scroll-mt-24 sm:scroll-mt-28`}>
        <div className={homeStyles.audienceInner}>
          <header className={homeStyles.audienceIntro}>
            <p className={homeStyles.eyebrow}>INSTITUTION FIT</p>
            <h2 id="edu-fit-heading">{fit.title}</h2>
            <p className={`${homeStyles.heroLead} mt-4 max-w-[42rem]`}>
              <span>{fit.lead}</span>
              <span>{fit.statement}</span>
            </p>
          </header>
          <ul className={styles.fitGrid}>
            {fit.items.map((item) => (
              <li key={item.label}>
                <article className={styles.fitCard}>
                  <p className={styles.fitCardLabel}>{item.label}</p>
                  <h3 className={styles.fitCardTitle}>{item.response}</h3>
                  <div className={`${styles.adjustKeys} mt-3`}>
                    {item.condition.map((tag) => (
                      <span key={tag} className={styles.adjustKey}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className={`mt-3 text-sm leading-relaxed text-[var(--spokedu-marketing-color-body)] ${koreanLineBreak}`}>
                    {item.note}
                  </p>
                </article>
              </li>
            ))}
          </ul>
          <div className={styles.fitMeta}>
            <p className={`text-sm leading-relaxed text-[var(--spokedu-marketing-color-body)] ${koreanLineBreak}`}>{fit.smallSpace}</p>
            <div className={styles.institutionCloud}>
              {fit.institutions.map((name) => (
                <span key={name} className={styles.institutionPill}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div id={operating.id} className="scroll-mt-24">
      <section className={`${shared.sectionBand} ${marketingBandWhite}`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <HubSectionHead title={operating.title} lead={operating.lead} />
          <div className={styles.fieldDuet}>
            {operating.fieldMedia.map((shot) => (
              <figure key={shot.mediaKey} className={styles.fieldShot}>
                <MediaPanel media={HOME_MEDIA[shot.mediaKey]} className="absolute inset-0 h-full w-full border-0 rounded-none" sizes="card2" />
                <figcaption>{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.navyBand} aria-labelledby="edu-formats-title">
        <div className={`${shared.rail} relative z-[1] ${shared.aboutSectionInner}`}>
          <HubSectionHeadDark
            eyebrow="OPERATING FORMATS"
            title="목적에 맞는 방식으로 운영합니다"
            lead="정기수업부터 원데이·특수·포용까지 — 기관 일정과 참여 대상에 맞춰 형태를 고릅니다."
          />
          <div className={styles.formatGrid}>
            {operating.formats.map((format, index) => (
              <article key={format.id} className={styles.formatTile}>
                <span className={styles.formatTileIndex}>{String(index + 1).padStart(2, '0')}</span>
                <h3 className={styles.formatTileTitle}>{format.title}</h3>
                <p className={styles.formatTileBody}>{format.body}</p>
                <p className={styles.formatTileExample}>{format.example}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${shared.sectionBand} ${marketingBandSoft}`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <HubSectionHead title={operating.lineupTitle} lead={operating.lineupLead} />
          <div className={styles.programMosaic}>
            {operating.lineup.map((item, index) => {
              const mediaKey = PROGRAM_MEDIA[item.id] ?? 'homeCaseGeneral';
              return (
                <article key={item.id} className={styles.programTile}>
                  <div className={styles.programTileMedia} aria-hidden>
                    <MediaPanel media={HOME_MEDIA[mediaKey]} className="absolute inset-0 h-full w-full border-0 rounded-none" sizes="card2" />
                  </div>
                  <div className={styles.programTileScrim} aria-hidden />
                  <div className={styles.programTileCopy}>
                    <span className={styles.programTileIndex}>{String(index + 1).padStart(2, '0')}</span>
                    <h3 className={styles.programTileName}>{item.name}</h3>
                    <p className={styles.programTileDesc}>{item.description}</p>
                    <div className={styles.programTileTags}>
                      {item.use.map((tag) => (
                        <span key={tag} className={styles.programTileTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <HubSectionHead title="하나의 활동이 아니라 수업의 흐름을 설계합니다" lead="기본 움직임에서 인지·반응, 조작, 협동까지 이어지도록 구성합니다. 대상과 목적에 따라 순서는 달라질 수 있습니다." />
          <div className={styles.flowStrip}>
            {CLASS_FLOW.map((step) => (
              <article key={step.n} className={styles.flowCard}>
                <div className={styles.flowCardCopy}>
                  <span className={styles.flowCardIndex}>{step.n}</span>
                  <h3 className={styles.flowCardTitle}>{step.title}</h3>
                  <p className={`${styles.flowCardBody} ${koreanLineBreak}`}>{step.body}</p>
                </div>
                <div className={styles.flowCardPhoto}>
                  <MediaPanel media={HOME_MEDIA[step.mediaKey]} className="absolute inset-0 h-full w-full border-0 rounded-none" sizes="card2" />
                </div>
              </article>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-[var(--spokedu-marketing-color-muted)]">{operating.spomove.note}</p>

          <div className={styles.spomoveSpotlight}>
            <div className={styles.spomoveSpotlightMedia} aria-hidden>
              <MediaPanel
                media={HOME_MEDIA[operating.spomove.mediaKey]}
                className="absolute inset-0 h-full w-full border-0 rounded-none"
                sizes="hero"
              />
            </div>
            <div className={styles.spomoveSpotlightScrim} aria-hidden />
            <div className={styles.spomoveSpotlightCopy}>
              <p className={styles.darkEyebrow}>{operating.spomove.eyebrow}</p>
              <h3 className={`mt-2 text-xl font-bold sm:text-2xl ${koreanLineBreak}`}>{operating.spomove.title}</h3>
              <p className={`mt-3 text-sm leading-relaxed text-[#cfdaea] ${koreanLineBreak}`}>{operating.spomove.body}</p>
              <Link
                href="/spomove"
                data-track={inferTrackFromHref('/spomove')}
                data-track-label="education-spomove-link"
                className={`mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[var(--spokedu-marketing-color-navy)] ${brandFocusRing}`}
              >
                SPOMOVE 자세히 →
              </Link>
            </div>
          </div>
        </div>
      </section>
      </div>

      <section id={page.comparison.id} className={`${shared.sectionBand} ${marketingBandWhite} scroll-mt-24`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <EducationComparisonBlock />
        </div>
      </section>

      <section id={adjustment.id} className={`${shared.sectionBand} ${marketingBandSoft} scroll-mt-24`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <HubSectionHead title={adjustment.title} lead={adjustment.lead} />
          <div className={styles.adjustGrid}>
            {adjustment.items.map((item) => (
              <article key={item.n} className={styles.adjustCard}>
                <span className={styles.adjustCardIndex}>{item.n}</span>
                <h3 className={styles.adjustCardTitle}>{item.label}</h3>
                <p className={`${styles.adjustCardBody} ${koreanLineBreak}`}>{item.body}</p>
                <div className={styles.adjustKeys}>
                  {item.keys.map((key) => (
                    <span key={key} className={styles.adjustKey}>
                      {key}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id={cases.id} className={`${shared.sectionBand} ${marketingBandWhite} scroll-mt-24`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <HubSectionHead eyebrow="FIELD RECORDS" title={cases.title} lead={cases.lead} />
          <div className={styles.caseBento}>
            <TrackedLink href={caseHero.href} trackLabel={caseHero.trackLabel} className={`${styles.caseBentoHero} ${brandFocusRing} group`}>
              <div className={`${styles.educationCasePhoto} relative aspect-[16/10] overflow-hidden bg-[#e9eef7] lg:aspect-auto lg:min-h-[18rem]`}>
                {/* Direct delivery preserves the authored marketing asset without transformation quota. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={caseHero.thumbnailSrc}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  style={{ objectPosition: caseHero.objectPosition }}
                />
              </div>
              <div className={styles.caseCopy}>
                <p className={styles.caseEyebrow}>{caseHero.context}</p>
                <h3 className={styles.caseTitle}>{caseHero.venue}</h3>
                <p className={`${styles.caseBody} ${koreanLineBreak}`}>{caseHero.description}</p>
                <span className={styles.caseArrow}>사례 보기 ↗</span>
              </div>
            </TrackedLink>
            {caseSides.map((card) => (
              <TrackedLink key={card.slug} href={card.href} trackLabel={card.trackLabel} className={`${styles.caseBentoSide} ${brandFocusRing} group`}>
                <div className={`${styles.educationCasePhoto} relative min-h-[10rem] overflow-hidden bg-[#e9eef7]`}>
                  {/* Direct delivery preserves the authored marketing asset without transformation quota. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.thumbnailSrc}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    style={{ objectPosition: card.objectPosition }}
                  />
                </div>
                <div className={styles.caseCopy}>
                  <p className={styles.caseEyebrow}>{card.context}</p>
                  <h3 className={styles.caseTitle}>{card.venue}</h3>
                  <p className={`${styles.caseBody} ${koreanLineBreak}`}>{card.description}</p>
                </div>
              </TrackedLink>
            ))}
          </div>
          <div className={styles.caseFooter}>
            <p className="text-sm text-[var(--spokedu-marketing-color-muted)]">더 많은 기관·학교 현장이 기록되어 있습니다.</p>
            <Link
              href={SPOKEDU_PATHS.records}
              data-track={inferTrackFromHref(SPOKEDU_PATHS.records)}
              data-track-label="education-all-records"
              className={`text-sm font-semibold text-[var(--spokedu-marketing-color-blue)] ${fineHover}hover:underline ${brandFocusRing}`}
            >
              전체 수업 사례 보기 →
            </Link>
          </div>
        </div>
      </section>

      <section id={reviews.id} className={`${shared.sectionBand} ${marketingBandSoft}`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <HubSectionHead eyebrow={reviews.badge} title={reviews.title} lead={reviews.lead} />
          <div className={styles.proofBanner}>
            {proof.items.map((item) => (
              <div key={item.label}>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--spokedu-marketing-color-blue)]">
                  {proof.regionLabel}
                </p>
                <h3 className={`${styles.proofItemTitle} mt-1`}>{item.label}</h3>
                <p className={`${styles.proofItemBody} ${koreanLineBreak}`}>{item.body}</p>
              </div>
            ))}
          </div>
          <ul className="grid list-none gap-4 p-0 m-0 lg:grid-cols-3">
            {reviews.items.map((item) => (
              <li key={item.headline} className={styles.reviewCard}>
                <h3 className={`${styles.reviewHeadline} ${koreanLineBreak}`}>{item.headline}</h3>
                <p className={`${styles.reviewQuote} mt-3 ${koreanLineBreak}`}>“{item.quote}”</p>
                <p className={styles.reviewMeta}>
                  {item.name} · {item.org}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={process.id} className={`${shared.sectionBand} ${marketingBandWhite} scroll-mt-24`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <HubSectionHead title={process.title} lead={process.lead} />
          <div className={`${shared.aboutSurface} overflow-hidden lg:border-0 lg:bg-transparent lg:shadow-none`}>
          <div className={`${styles.processStepper} lg:rounded-none lg:border-0`}>
            {process.steps.map((step) => (
              <article key={step.n} className={styles.processStep}>
                <span className={styles.processStepNum}>{step.n}</span>
                <h3 className={styles.processStepTitle}>{step.title}</h3>
                <p className={`${styles.processStepBody} ${koreanLineBreak}`}>{step.body}</p>
                <div className={styles.processStepKeys}>
                  {step.keys.map((key) => (
                    <span key={key} className={styles.adjustKey}>
                      {key}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink
              href={contact.primaryCta.href}
              trackLabel={contact.primaryCta.trackLabel}
              className={`${marketingButtonPrimary} inline-flex w-full justify-center sm:w-auto sm:min-w-[12rem] ${brandFocusRing}`}
            >
              {contact.primaryCta.label}
            </TrackedLink>
            <Link
              href="#faq"
              className={`${marketingButtonSecondary} inline-flex w-full justify-center sm:w-auto ${brandFocusRing}`}
            >
              FAQ 먼저 보기
            </Link>
          </div>
        </div>
      </section>

      <section id={faq.id} className={`${shared.sectionBand} ${marketingBandSoft} scroll-mt-24`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <HubSectionHead title={faq.title} />
          <LandingFaqList items={faq.items} accent="sky" />
        </div>
      </section>

      <section className={`${shared.sectionBand} ${marketingBandWhite} scroll-mt-24`}>
        <div className={`${shared.rail} ${shared.aboutSectionInner}`}>
          <div className={`${shared.aboutSurface} ${styles.contactPanel}`}>
            <div className={shared.sectionHead}>
              <SpokeduSectionHeading titleLines={contact.titleLines} lead={contact.lead} />
            </div>
            <TrackedLink
              href={contact.primaryCta.href}
              trackLabel={contact.primaryCta.trackLabel}
              className={`${marketingButtonPrimary} inline-flex w-full justify-center sm:w-auto sm:min-w-[12rem] ${brandFocusRing}`}
            >
              {contact.primaryCta.label}
            </TrackedLink>
          </div>
          <Suspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
            <DispatchProposalForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
