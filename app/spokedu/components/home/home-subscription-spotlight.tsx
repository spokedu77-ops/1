'use client';

import { curriculumPage } from '../../data/curriculum-page';
import { homePage } from '../../data/home-page';
import {
  homeSectionScrollMt,
  marketingBandWhite,
  marketingButtonPrimary,
  marketingEyebrow,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionLead,
  marketingSectionPad,
} from '../../lib/ui-classes';
import { ProductVisualFrame } from '../product-visual-frame';
import { TrackedLink } from './tracked-link';

export function HomeSubscriptionSpotlight() {
  const source = curriculumPage.subscription;
  const action = homePage.services.subscription;
  return (
    <section id="subscription" className={`${homeSectionScrollMt} ${marketingBandWhite} ${marketingSectionPad}`} aria-labelledby="home-subscription-heading">
      <div className={`${marketingSectionInner} grid gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center lg:gap-16`}>
        <div>
          <p className={marketingEyebrow}>SUBSCRIPTION SYSTEM</p>
          <h2 id="home-subscription-heading" className={`${marketingSectionDisplay} mt-3 whitespace-pre-line`}>{source.how.title}</h2>
          <p className={`${marketingSectionLead} mt-5`}>{source.hero.lead}</p>
          <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="구독시스템 운영 흐름">
            {source.how.pillars.map((pillar, index) => (
              <li key={pillar.title} className="border-t border-[#DCE3EE] pt-3">
                <span className="text-xs font-bold text-[#245DFF]">0{index + 1}</span>
                <strong className="mt-1 block text-sm text-[#14213A]">{pillar.title}</strong>
              </li>
            ))}
          </ol>
          <TrackedLink href={action.href} trackLabel={action.trackLabel} className={`${marketingButtonPrimary} mt-8`}>{action.ctaLabel}</TrackedLink>
        </div>
        <ProductVisualFrame {...source.tools.visual} emphasis="feature" />
      </div>
    </section>
  );
}
