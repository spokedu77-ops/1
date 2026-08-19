'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeClassItem } from '../../data/home-page';
import {
  homePhotoGrade,
  homeSectionScrollMt,
  marketingBandWhite,
  marketingButtonTextAction,
  marketingMediaFrame,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionLead,
  marketingSectionPad,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';
import styles from './home-canonical.module.css';

export function HomeClassSection() {
  const section = homePage.class;
  return (
    <section id={section.id} className={`${homeSectionScrollMt} ${marketingBandWhite} ${marketingSectionPad}`} aria-labelledby="home-class-heading">
      <div className={marketingSectionInner}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)] lg:items-end">
          <h2 id="home-class-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle}`}>{section.title}</h2>
          <p className={`${marketingSectionLead} lg:justify-self-end`}>{section.lead}</p>
        </div>
        <div className={`${styles.classGrid} mt-10`}>
          {section.items.map((item) => <ClassItem key={item.id} item={item} />)}
        </div>
      </div>
    </section>
  );
}
function ClassItem({ item }: { item: HomeClassItem }) {
  return (
    <article className={styles.classItem}>
      <MediaPanel
        media={HOME_MEDIA[item.mediaKey]}
        className={`${marketingMediaFrame} ${styles.classMedia} ${homePhotoGrade} w-full border-0`}
        sizes="gateCard"
        objectFit="cover"
      />
      <div className={styles.classCopy}>
        <span className="text-xs font-bold text-[#245DFF]">{item.number}</span>
        <h3 className="mt-2 text-xl font-extrabold leading-snug text-[#0B1F46] sm:text-2xl">{item.title}</h3>
        <p className="mt-3 text-sm leading-[1.7] text-[#536279] sm:text-[15px]">{item.description}</p>
        <TrackedLink href={item.href} trackLabel={item.trackLabel} className={`${marketingButtonTextAction} mt-4`}>
          {item.ctaLabel}<HomeChevron />
        </TrackedLink>
      </div>
    </article>
  );
}
