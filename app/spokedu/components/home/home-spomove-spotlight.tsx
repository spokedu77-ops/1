'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homePhotoGrade,
  homeSectionScrollMt,
  marketingBandNavy,
  marketingButtonPrimaryOnDark,
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
          <p className="mt-4 text-sm font-semibold text-[#9FC0FF]">{section.relationLine}</p>
          <div className="mt-8">
            <TrackedLink href={section.primaryCta.href} trackLabel={section.primaryCta.trackLabel} className={marketingButtonPrimaryOnDark}>{section.primaryCta.label}</TrackedLink>
          </div>
        </div>
        <MediaPanel media={HOME_MEDIA[section.mediaKey]} className={`${marketingMediaFrame} ${styles.fieldMedia} ${homePhotoGrade} aspect-[16/10] min-h-[22rem] w-full border-white/10`} sizes="card1" objectFit="cover" />
      </div>
    </section>
  );
}
