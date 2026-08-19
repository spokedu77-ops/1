'use client';

import { homePage } from '../../data/home-page';
import {
  homeSectionScrollMt,
  marketingBandWhite,
  marketingButtonPrimary,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionLead,
  marketingSectionPad,
} from '../../lib/ui-classes';
import { ProductVisualFrame } from '../product-visual-frame';
import { TrackedLink } from './tracked-link';
import styles from './home-canonical.module.css';

export function HomeSubscriptionSpotlight() {
  const section = homePage.subscription;
  return (
    <section id={section.id} className={`${homeSectionScrollMt} ${marketingBandWhite} ${marketingSectionPad}`} aria-labelledby="home-subscription-heading">
      <div className={`${marketingSectionInner} grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center lg:gap-16`}>
        <div className={`${styles.productFeature} lg:order-1`}>
          <ProductVisualFrame src={section.visual.src} alt={section.visual.alt} emphasis="feature" aspectClassName="aspect-[16/10] min-h-[20rem]" />
        </div>
        <div className="lg:order-2">
          <h2 id="home-subscription-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} whitespace-pre-line`}>{section.title}</h2>
          <p className={`${marketingSectionLead} mt-5`}>{section.lead}</p>
          <ol className={styles.subscriptionFlow} aria-label="구독시스템 이용 흐름">
            {section.steps.map((step, index) => (
              <li key={step}><span>0{index + 1}</span><strong>{step}</strong></li>
            ))}
          </ol>
          <TrackedLink href={section.primaryCta.href} trackLabel={section.primaryCta.trackLabel} className={`${marketingButtonPrimary} mt-8`}>{section.primaryCta.label}</TrackedLink>
        </div>
      </div>
    </section>
  );
}
