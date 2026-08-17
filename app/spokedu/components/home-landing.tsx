'use client';

import { SPOKEDU_HOME_BUILD_ID } from '../data/home-build';
import { homePage } from '../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { homePageSurface, homeSkipLink } from '../lib/ui-classes';
import { HomeFieldRecords, mergeHomeCaseCards } from './home/home-field-records';
import { HomeAudienceGates } from './home/home-audience-gates';
import { HomeFinalCta } from './home/home-final-cta';
import { HomeHero } from './home/home-hero';
import { HomeServices } from './home/home-services';
import { HomeSpomoveSpotlight } from './home/home-spomove-spotlight';
import { HomeSubscriptionSpotlight } from './home/home-subscription-spotlight';
import styles from './home/home-canonical.module.css';

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

/**
 * 홈 흐름 (PR2 · 최상위 7섹션)
 * 히어로 → 4경로 → 진입점 관계 → 순환 → SPOMOVE+사례 → 증거 → 최종 CTA
 */
export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const caseCards = mergeHomeCaseCards(proofCards);

  return (
    <div
      className={`w-full overflow-x-clip antialiased ${homePageSurface} ${styles.root}`}
      data-spokedu-home-build={SPOKEDU_HOME_BUILD_ID}
      data-spokedu-home-sections={homePage.sectionOrder.length}
    >
      <a href="#paths" className={homeSkipLink}>
        본문으로 건너뛰기
      </a>

      <HomeHero />
      <HomeServices />
      <HomeAudienceGates />
      <HomeSpomoveSpotlight />
      <HomeSubscriptionSpotlight />
      <HomeFieldRecords caseCards={caseCards} />
      <HomeFinalCta />
    </div>
  );
}
