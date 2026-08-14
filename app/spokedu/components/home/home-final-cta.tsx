'use client';

import { homePage } from '../../data/home-page';
import {
  homeSectionScrollMt,
  marketingBandNavy,
  marketingButtonPrimaryOnDark,
  marketingButtonSecondaryOnDark,
  marketingButtonTextAction,
  marketingEyebrowOnDark,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionPadCompact,
} from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';
import styles from './home-canonical.module.css';

export function HomeFinalCta() {
  const [education, spomove, subscription, contact] = homePage.finalCta.items;
  return (
    <section id="final-action" className={`${homeSectionScrollMt} ${marketingBandNavy} ${marketingSectionPadCompact} relative overflow-hidden`} aria-labelledby="home-final-action-heading">
      <div className={`${marketingSectionInner} relative grid gap-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)] lg:items-center lg:gap-14`}>
        <div className="max-w-2xl">
          <p className={marketingEyebrowOnDark}>NEXT PATH</p>
          <h2 id="home-final-action-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} mt-4 text-white`}>필요한 경로에서<br />바로 시작하세요.</h2>
          <p className="mt-5 text-base leading-relaxed text-[#BDC9DF] sm:text-lg">직접 운영하는 체육교육부터 SPOMOVE와 구독시스템까지 이어서 살펴볼 수 있습니다.</p>
          <TrackedLink href={contact.href} trackLabel={contact.trackLabel} className={`${marketingButtonTextAction} mt-4 !text-[#AFC8FF]`}>{contact.label} →</TrackedLink>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[education, spomove, subscription].map((item, index) => (
            <TrackedLink key={item.trackLabel} href={item.href} trackLabel={item.trackLabel} className={`${index === 0 ? marketingButtonPrimaryOnDark : marketingButtonSecondaryOnDark} min-h-14 text-center`}>{item.label}</TrackedLink>
          ))}
        </div>
      </div>
    </section>
  );
}
