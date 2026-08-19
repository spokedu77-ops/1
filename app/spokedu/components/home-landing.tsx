'use client';

import { SPOKEDU_HOME_BUILD_ID } from '../data/home-build';
import { homePage } from '../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { homePageSurface, homeSkipLink } from '../lib/ui-classes';
import { HomeFieldRecords, mergeHomeCaseCards } from './home/home-field-records';
import { HomeFieldBridge } from './home/home-field-bridge';
import { HomeFinalCta } from './home/home-final-cta';
import { HomeHero } from './home/home-hero';
import { HomeClassSection } from './home/home-services';
import { HomeSpomoveSpotlight } from './home/home-spomove-spotlight';
import { HomeSubscriptionSpotlight } from './home/home-subscription-spotlight';
import styles from './home/home-canonical.module.css';

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

/**
 * 홈 이야기: 현장 → 서비스 → 콘텐츠 → 시스템 → 증거 → 상담
 */
export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const caseCards = mergeHomeCaseCards(proofCards);

  return (
    <div
      className={`w-full overflow-x-clip antialiased ${homePageSurface} ${styles.root}`}
      data-spokedu-home-build={SPOKEDU_HOME_BUILD_ID}
      data-spokedu-home-sections={homePage.sectionOrder.length}
    >
      <a href="#class" className={homeSkipLink}>
        본문으로 건너뛰기
      </a>

      <HomeHero />
      <HomeClassSection />
      <HomeFieldBridge />
      <HomeSpomoveSpotlight />
      <HomeSubscriptionSpotlight />
      <HomeFieldRecords caseCards={caseCards} />
      <HomeFinalCta />
    </div>
  );
}
