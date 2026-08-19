'use client';

import { homePage } from '../../data/home-page';
import {
  homeSectionScrollMt,
  marketingBandNavy,
  marketingButtonPrimaryOnDark,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionPadCompact,
} from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';
import styles from './home-canonical.module.css';

export function HomeFinalCta() {
  const section = homePage.finalCta;
  return (
    <section id={section.id} className={`${homeSectionScrollMt} ${marketingBandNavy} ${marketingSectionPadCompact}`} aria-labelledby="home-final-action-heading">
      <div className={`${marketingSectionInner} grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16`}>
        <div className="max-w-3xl">
          <h2 id="home-final-action-heading" className={`${marketingSectionDisplay} ${styles.compactTitle} text-white`}>{section.title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-[1.75] text-[#CFDAEA] sm:text-[17px]">{section.lead}</p>
          <nav className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#AFC8FF]" aria-label="주요 서비스">
            {section.nav.map((item, index) => (
              <span key={item.trackLabel} className="inline-flex items-center gap-3">
                {index > 0 ? <span aria-hidden>·</span> : null}
                <TrackedLink href={item.href} trackLabel={item.trackLabel} className="font-semibold underline-offset-4 hover:text-white hover:underline">{item.label}</TrackedLink>
              </span>
            ))}
          </nav>
        </div>
        <TrackedLink href={section.primaryCta.href} trackLabel={section.primaryCta.trackLabel} className={`${marketingButtonPrimaryOnDark} min-h-14 px-7 text-center`}>
          {section.primaryCta.label}
        </TrackedLink>
      </div>
    </section>
  );
}
