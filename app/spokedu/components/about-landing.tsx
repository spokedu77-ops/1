'use client';

import { aboutPage, isAboutHubBranchWithLinks } from '../data/about-page';
import { HOME_MEDIA } from '../data/home-media';
import {
  brandFocusRing,
  homeHeroBrand,
  homeSectionScrollMt,
  marketingBandSoft,
  marketingBandWhite,
  marketingHeroDisplayLine,
  marketingButtonPrimary,
  marketingTypeHeroTitle,
} from '../lib/ui-classes';
import { TrackedLink } from './home/tracked-link';
import { SpokeduSectionHeading } from './section-heading';
import { MediaPanel } from './visual';
import styles from './about-landing.module.css';

function AboutSectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className={styles.sectionHead}>
      <SpokeduSectionHeading eyebrow={eyebrow} title={title} lead={lead} />
    </div>
  );
}

/** About — BRAND · WHAT WE DO · APPROACH · PEOPLE · HISTORY · CLOSING */
export function AboutLanding() {
  const { intro, whatWeDo, approach, history, team, closing } = aboutPage;
  const heroMedia = HOME_MEDIA[intro.mediaKey];

  return (
    <div className="w-full overflow-x-clip bg-[var(--spokedu-marketing-color-white)]" data-spokedu-about-sections={aboutPage.sectionOrder.length}>
      <section id={intro.id} className={`${styles.hero} ${homeSectionScrollMt}`} aria-labelledby="about-hero-title">
        <div className={styles.heroMobilePhoto}>
          <MediaPanel
            media={heroMedia}
            className="absolute inset-0 h-full w-full border-0 rounded-none"
            sizes="hero"
            photoPriority
            priority
            objectFit="cover"
          />
        </div>
        <div className={styles.heroMedia}>
          <MediaPanel
            media={heroMedia}
            className="absolute inset-0 h-full w-full border-0 rounded-none"
            sizes="hero"
            photoPriority
            priority
            objectFit="cover"
          />
        </div>
        <div className={styles.heroScrim} aria-hidden />
        <div className={`${styles.rail} ${styles.heroCopy}`}>
          <p className={homeHeroBrand}>{intro.eyebrow}</p>
          <h1 id="about-hero-title" className={`${marketingTypeHeroTitle} mt-3 text-white`}>
            {intro.titleLines.map((line) => (
              <span key={line} className={marketingHeroDisplayLine}>
                {line}
              </span>
            ))}
          </h1>
          <p className={styles.heroLead}>{intro.lead}</p>
          <p className={styles.heroBody}>{intro.body}</p>
        </div>
      </section>

      <section id={whatWeDo.id} className={`${styles.sectionBand} ${homeSectionScrollMt} ${marketingBandWhite}`}>
        <div className={`${styles.rail} ${styles.aboutSectionInner}`}>
          <AboutSectionHead eyebrow={whatWeDo.eyebrow} title={whatWeDo.title} />
          <div className={`${styles.aboutSurface} ${styles.featureStack}`}>
            {whatWeDo.branches.map((branch, index) =>
              isAboutHubBranchWithLinks(branch) ? (
                <article key={branch.id} className={styles.featureRow}>
                  <span className={styles.aboutIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <div className={styles.featureMain}>
                    <h3 className={styles.featureTitle}>{branch.title}</h3>
                    <p className={styles.featureBody}>{branch.body}</p>
                    <div className={styles.featureLinks}>
                      {branch.links.map((link) => (
                        <TrackedLink
                          key={link.href}
                          href={link.href}
                          trackLabel={link.trackLabel}
                          className={`${styles.featureLink} ${brandFocusRing}`}
                        >
                          {link.label} →
                        </TrackedLink>
                      ))}
                    </div>
                  </div>
                </article>
              ) : (
                <TrackedLink
                  key={branch.id}
                  href={branch.href}
                  trackLabel={branch.trackLabel}
                  className={`${styles.featureRow} ${styles.featureRowLink} ${brandFocusRing}`}
                >
                  <span className={styles.aboutIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <div className={styles.featureMain}>
                    <h3 className={styles.featureTitle}>{branch.title}</h3>
                    <p className={styles.featureBody}>{branch.body}</p>
                    <span className={styles.featureLink} aria-hidden>
                      자세히 →
                    </span>
                  </div>
                </TrackedLink>
              ),
            )}
          </div>
        </div>
      </section>

      <section id={approach.id} className={`${styles.sectionBand} ${homeSectionScrollMt} ${marketingBandSoft}`}>
        <div className={`${styles.rail} ${styles.aboutSectionInner}`}>
          <AboutSectionHead eyebrow={approach.eyebrow} title={approach.title} />
          <ul className={styles.principleGrid}>
            {approach.principles.map((item, index) => (
              <li key={item.title} className={`${styles.aboutSurface} ${styles.principleCard}`}>
                <span className={styles.aboutIndex}>{String(index + 1).padStart(2, '0')}</span>
                <h3 className={styles.aboutItemTitle}>{item.title}</h3>
                <p className={styles.aboutItemBody}>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={team.id} className={`${styles.sectionBand} ${homeSectionScrollMt} ${marketingBandWhite}`}>
        <div className={`${styles.rail} ${styles.aboutSectionInner}`}>
          <AboutSectionHead eyebrow={team.eyebrow} title={team.title} />
          <ul className={styles.teamGrid}>
            {team.members.map((member) => (
              <li key={member.id} className={`${styles.aboutSurface} ${styles.teamCard}`}>
                <figure className={styles.teamPhoto}>
                  {/* Direct delivery is intentional for these authored marketing portraits. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={member.photo} alt={`${member.role} ${member.name}`} style={{ objectPosition: member.photoObjectPosition }} />
                </figure>
                <div className={styles.teamCardCopy}>
                  <p className={styles.teamName}>
                    {member.name}
                    <span className={styles.teamNameSep} aria-hidden>
                      {' '}
                      |{' '}
                    </span>
                    <span className={styles.teamRoleInline}>{member.role}</span>
                  </p>
                  <ul className={styles.teamNotes}>
                    {member.credentials.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={history.id} className={`${styles.sectionBand} ${homeSectionScrollMt} ${marketingBandSoft}`}>
        <div className={`${styles.rail} ${styles.aboutSectionInner}`}>
          <AboutSectionHead eyebrow={history.eyebrow} title={history.title} />
          <div className={`${styles.aboutSurface} ${styles.historyPanel}`}>
          <ol className={styles.historyFeed}>
            {history.yearGroups.map((group) => (
              <li key={group.year} className={styles.historyEntry}>
                <span className={styles.historyEntryYear}>{group.year}</span>
                <article className={styles.historyEntryBody}>
                  <h3 className={styles.historyEntryTheme}>{group.theme}</h3>
                  <ul className={styles.historyEntryItems}>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </section>

      <section
        id={closing.id}
        className={`${styles.sectionBand} ${styles.closingBand} ${homeSectionScrollMt} ${marketingBandWhite}`}
        aria-labelledby="about-closing-title"
      >
        <div className={`${styles.rail} ${styles.closingInner}`}>
          <div className={styles.closingAccent} aria-hidden />
          <h2 id="about-closing-title" className={styles.closingTagline}>
            {closing.taglineLines.map((line) => (
              <span key={line} className={marketingHeroDisplayLine}>
                {line}
              </span>
            ))}
          </h2>
          <p className={styles.closingBrand}>{closing.brandSign}</p>
          <TrackedLink
            href={closing.cta.href}
            trackLabel={closing.cta.trackLabel}
            className={`${marketingButtonPrimary} ${styles.closingButton} ${brandFocusRing}`}
          >
            {closing.cta.label}
          </TrackedLink>
        </div>
      </section>
    </div>
  );
}
