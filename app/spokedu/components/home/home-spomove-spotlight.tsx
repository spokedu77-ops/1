'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homePhotoGrade,
  homeSectionScrollMt,
  marketingBandNavy,
  marketingButtonPrimaryOnDark,
  marketingButtonSecondaryOnDark,
  marketingEyebrowOnDark,
  marketingMediaFrame,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionPad,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { TrackedLink } from './tracked-link';
import styles from './home-canonical.module.css';

export function HomeSpomoveSpotlight() {
  const section = homePage.spomove;
  return (
    <section id={section.id} className={`${homeSectionScrollMt} ${marketingBandNavy} ${marketingSectionPad}`} aria-labelledby="home-spomove-heading">
      <div className={`${marketingSectionInner} grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-16`}>
        <div>
          <p className={marketingEyebrowOnDark}>SPOMOVE</p>
          <h2 id="home-spomove-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} mt-3 text-white`}>
            {section.title}<span className="mt-1 block text-[#AFC8FF]">{section.titleLine2}</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-[1.75] text-[#CFDAEA] sm:text-[17px]">{section.lead}</p>
          <div className={styles.bridgeGrid} aria-label="SPOMOVE 활용 연결">
            {section.useCases.map((item) => (
              <div key={item.title} className={styles.bridgeCard}>
                <strong>{item.title}</strong><span>{item.body}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedLink href={section.primaryCta.href} trackLabel={section.primaryCta.trackLabel} className={marketingButtonPrimaryOnDark}>{section.primaryCta.label}</TrackedLink>
            <TrackedLink href={section.secondaryCta.href} trackLabel={section.secondaryCta.trackLabel} className={marketingButtonSecondaryOnDark}>{section.secondaryCta.label}</TrackedLink>
          </div>
        </div>
        <MediaPanel media={HOME_MEDIA[section.mediaKey]} className={`${marketingMediaFrame} ${styles.fieldMedia} ${homePhotoGrade} aspect-[16/11] min-h-[28rem] w-full border-white/10`} sizes="card1" objectFit="cover" />
      </div>
    </section>
  );
}
